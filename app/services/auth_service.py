# app/services/auth_service.py
"""
Authentication service.

Handles:
  - Firebase ID token verification
  - User role lookup from Firestore
  - JWT token pair generation
  - Token refresh logic
"""

import logging
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
    1. admin_users collection (SUPER_ADMIN)
    2. sites → vendor_staff_ids (VENDOR)
    3. residents collection (RESIDENT)

    Returns (user_doc_id, role).
    """
    db = get_db()

    # Check admin_users
    admin_query = db.collection("admin_users").where("email", "==", email).limit(1).get()
    for doc in admin_query:
        data = doc.to_dict()
        return doc.id, UserRole(data.get("role", "SUPER_ADMIN"))

    # Check if the user is a vendor (listed in any site's vendor_staff_ids)
    # We store vendor users with their email in admin_users with role=VENDOR
    # or check a vendors collection if we add one

    # Check residents
    resident_query = db.collection("residents").where("email", "==", email).limit(1).get()
    for doc in resident_query:
        return doc.id, UserRole.RESIDENT

    # Default: if user exists in Firebase Auth but not in our DB, return None
    return uid, None


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

    # Update FCM token if present (for push notifications)
    # This would be passed from the client

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
