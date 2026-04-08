# app/routes/auth.py
"""
Authentication endpoints.

POST /auth/register        — Self-registration (email/password + profile)
POST /auth/login           — Login with Firebase ID token, receive JWT pair
POST /auth/refresh-token   — Refresh access token
POST /auth/logout          — Logout (client-side token discard)
POST /auth/forgot-password — Trigger Firebase password reset email
POST /auth/fcm-token       — Update FCM device token
"""

from fastapi import APIRouter, HTTPException

from app.models.auth import (
    LoginRequest,
    RegisterRequest,
    ForgotPasswordRequest,
    ChangePasswordRequest,
    RefreshTokenRequest,
    TokenResponse,
    AuthStatusResponse,
)
from app.models.common import APIResponse
from app.services.auth_service import (
    login_with_firebase_token,
    refresh_access_token,
    update_fcm_token,
    register_resident,
    send_password_reset,
    change_password,
)
from app.middleware.auth import get_current_user
from fastapi import Depends
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(request: RegisterRequest):
    """
    Self-registration for residents.

    Creates a Firebase Auth account + Firestore resident profile.
    Returns JWT pair so the user is immediately logged in after registration.
    """
    try:
        return register_resident(
            email=request.email,
            password=request.password,
            name=request.name,
            phone=request.phone,
            room_number=request.room_number,
            site_id=request.site_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """
    Authenticate using Firebase ID token.

    The client obtains the Firebase ID token via Firebase Auth SDK
    (email/password or OTP), then sends it here to get our JWT pair.
    """
    result = login_with_firebase_token(request.firebase_id_token)
    if result is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication failed. Invalid token or user not registered.",
        )
    return result


@router.post("/refresh-token", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    """Exchange a valid refresh token for a new access + refresh token pair."""
    result = refresh_access_token(request.refresh_token)
    if result is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired refresh token.",
        )
    return result


@router.post("/forgot-password", response_model=AuthStatusResponse)
async def forgot_password(request: ForgotPasswordRequest):
    """
    Trigger a Firebase password reset email.

    Always returns success (to prevent email enumeration) but
    only actually sends if the email is registered.
    """
    send_password_reset(request.email)
    # Always return success to prevent email enumeration
    return AuthStatusResponse(
        status="success",
        message="If this email is registered, a password reset link has been sent.",
    )


@router.post("/logout", response_model=AuthStatusResponse)
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout — server-side this is a no-op for stateless JWTs.
    The client should discard both tokens.
    """
    return AuthStatusResponse(
        status="success",
        message="Logged out successfully. Please discard your tokens.",
    )


class FCMTokenRequest(BaseModel):
    fcm_token: str


@router.post("/fcm-token", response_model=APIResponse)
async def update_fcm(
    request: FCMTokenRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Update the FCM device token for push notifications.
    Called after login or when the FCM token refreshes.
    """
    user_id = current_user["sub"]
    success = update_fcm_token(user_id, request.fcm_token)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")

    return APIResponse(status="success", message="FCM token updated")


@router.post("/change-password", response_model=AuthStatusResponse)
async def change_pwd(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Change password for the currently authenticated user.
    Requires the current password and a new password (min 6 chars).
    """
    user_id = current_user["sub"]
    email = current_user.get("email", "")
    try:
        change_password(user_id, email, request.current_password, request.new_password)
        return AuthStatusResponse(
            status="success",
            message="Password changed successfully.",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
