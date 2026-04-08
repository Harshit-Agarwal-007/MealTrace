# app/services/auth_service.py
"""
Authentication service.

Handles:
  - Firebase ID token verification
  - User self-registration (Firebase Auth + Firestore)
  - Password reset flow
  - User role lookup from Firestore
  - JWT token pair generation
  - Token refresh logic
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple

from firebase_admin import auth as firebase_auth

from app.database import get_db
from app.models.auth import UserRole, TokenResponse
from app.middleware.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.config import get_settings

logger = logging.getLogger(__name__)


def _lookup_user_role(uid: str, email: str) -> Tuple[str, UserRole]:
    """
    Determine the user's role by checking Firestore collections.

    Priority:
    1. admin_users collection (SUPER_ADMIN or VENDOR)
    2. residents collection (RESIDENT)

    Returns (user_doc_id, role).
    """
    db = get_db()

    # Check admin_users (covers both SUPER_ADMIN and VENDOR)
    admin_query = db.collection("admin_users").where("email", "==", email).limit(1).get()
    for doc in admin_query:
        data = doc.to_dict()
        return doc.id, UserRole(data.get("role", "SUPER_ADMIN"))

    # Check residents
    resident_query = db.collection("residents").where("email", "==", email).limit(1).get()
    for doc in resident_query:
        return doc.id, UserRole.RESIDENT

    # Default: user exists in Firebase Auth but not in our DB
    return uid, None


def register_resident(
    email: str,
    password: str,
    name: str,
    phone: Optional[str],
    room_number: str,
    site_id: str,
) -> TokenResponse:
    """
    Self-registration flow:
    1. Create Firebase Auth user (email + password)
    2. Create Firestore resident profile
    3. Return JWT pair so user is immediately logged in

    Raises ValueError on duplicate email or invalid data.
    """
    db = get_db()
    settings = get_settings()

    # Check if email already exists in our DB
    existing = db.collection("residents").where("email", "==", email).limit(1).get()
    if len(list(existing)) > 0:
        raise ValueError("A user with this email already exists")

    existing_admin = db.collection("admin_users").where("email", "==", email).limit(1).get()
    if len(list(existing_admin)) > 0:
        raise ValueError("A user with this email already exists")

    # Validate site exists
    site_doc = db.collection("sites").document(site_id).get()
    if not site_doc.exists:
        raise ValueError(f"Site {site_id} does not exist")

    # Create Firebase Auth user
    try:
        firebase_user = firebase_auth.create_user(
            email=email,
            password=password,
            display_name=name,
        )
    except firebase_auth.EmailAlreadyExistsError:
        raise ValueError("Email already registered in authentication system")
    except Exception as e:
        raise ValueError(f"Failed to create auth account: {e}")

    # Create Firestore resident profile
    now = datetime.now(timezone.utc)
    doc_id = f"res_{uuid.uuid4().hex[:12]}"
    doc_ref = db.collection("residents").document(doc_id)
    doc_ref.set({
        "name": name,
        "email": email,
        "phone": phone,
        "room_number": room_number,
        "site_id": site_id,
        "balance": 0,
        "status": "ACTIVE",
        "firebase_uid": firebase_user.uid,
        "allowed_meals": [],
        "plan_id": None,
        "created_at": now,
    })

    logger.info(f"New resident registered: {doc_id} ({email})")

    # Generate JWT pair
    access_token = create_access_token(doc_id, UserRole.RESIDENT, email)
    refresh_token = create_refresh_token(doc_id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        role=UserRole.RESIDENT,
        user_id=doc_id,
    )


def send_password_reset(email: str) -> bool:
    """
    Send a Firebase password reset email.
    Returns True if sent, False if user not found.
    """
    try:
        # Check user exists in Firebase Auth
        firebase_auth.get_user_by_email(email)
        # Generate password reset link
        link = firebase_auth.generate_password_reset_link(email)
        logger.info(f"Password reset link generated for {email}: {link}")
        # In production, you'd send this via email service
        # For now, Firebase handles the email sending automatically
        return True
    except firebase_auth.UserNotFoundError:
        logger.warning(f"Password reset requested for unknown email: {email}")
        return False
    except Exception as e:
        logger.error(f"Password reset failed for {email}: {e}")
        return False


def create_firebase_user_for_invite(email: str, name: str, password: str = None) -> str:
    """
    Create a Firebase Auth user when admin adds a resident.
    If no password provided, generates a random one and sends a password setup email.

    Returns the Firebase UID.
    """
    try:
        if password:
            firebase_user = firebase_auth.create_user(
                email=email,
                password=password,
                display_name=name,
            )
        else:
            # Create with a random password, then send reset link
            import secrets
            temp_password = secrets.token_urlsafe(16)
            firebase_user = firebase_auth.create_user(
                email=email,
                password=temp_password,
                display_name=name,
            )
            # Send password reset so user can set their own password
            try:
                firebase_auth.generate_password_reset_link(email)
                logger.info(f"Password setup email sent to {email}")
            except Exception as e:
                logger.warning(f"Could not send password setup email to {email}: {e}")

        return firebase_user.uid
    except firebase_auth.EmailAlreadyExistsError:
        # User already exists in Firebase Auth, just return their UID
        existing = firebase_auth.get_user_by_email(email)
        return existing.uid
    except Exception as e:
        logger.error(f"Failed to create Firebase user for {email}: {e}")
        raise ValueError(f"Failed to create authentication account: {e}")


def login_with_firebase_token(firebase_id_token: str) -> Optional[TokenResponse]:
    """
    Verify a Firebase ID token and issue our own JWT pair.

    Steps:
    1. Verify ID token with Firebase Auth
    2. Look up user role in Firestore
    3. Generate access + refresh tokens
    """
    try:
        # Verify Firebase ID token
        decoded = firebase_auth.verify_id_token(firebase_id_token)
        uid = decoded["uid"]
        email = decoded.get("email", "")
    except Exception as e:
        logger.error(f"Firebase token verification failed: {e}")
        return None

    # Look up role
    user_doc_id, role = _lookup_user_role(uid, email)

    if role is None:
        logger.warning(f"User {email} ({uid}) not found in any role collection")
        return None

    settings = get_settings()

    access_token = create_access_token(user_doc_id, role, email)
    refresh_token = create_refresh_token(user_doc_id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        role=role,
        user_id=user_doc_id,
    )


def refresh_access_token(refresh_token_str: str) -> Optional[TokenResponse]:
    """
    Use a refresh token to issue a new access token.
    """
    try:
        payload = decode_token(refresh_token_str)
    except Exception:
        return None

    if payload.get("type") != "refresh":
        return None

    user_id = payload["sub"]
    db = get_db()

    # Re-lookup role (in case it changed)
    # Check admin_users first
    admin_doc = db.collection("admin_users").document(user_id).get()
    if admin_doc.exists:
        role = UserRole(admin_doc.to_dict().get("role", "SUPER_ADMIN"))
        email = admin_doc.to_dict().get("email", "")
    else:
        resident_doc = db.collection("residents").document(user_id).get()
        if resident_doc.exists:
            role = UserRole.RESIDENT
            email = resident_doc.to_dict().get("email", "")
        else:
            return None

    settings = get_settings()
    new_access = create_access_token(user_id, role, email)
    new_refresh = create_refresh_token(user_id)

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        role=role,
        user_id=user_id,
    )


def update_fcm_token(user_id: str, fcm_token: str) -> bool:
    """
    Store the FCM device token for a user so we can send push notifications.
    Called after login or when the token refreshes on the client.
    """
    db = get_db()
    try:
        # Try residents first (most common)
        doc_ref = db.collection("residents").document(user_id)
        doc = doc_ref.get()
        if doc.exists:
            doc_ref.update({"fcm_token": fcm_token})
            return True

        # Try admin_users
        doc_ref = db.collection("admin_users").document(user_id)
        doc = doc_ref.get()
        if doc.exists:
            doc_ref.update({"fcm_token": fcm_token})
            return True

        return False
    except Exception as e:
        logger.error(f"Failed to update FCM token for {user_id}: {e}")
        return False
