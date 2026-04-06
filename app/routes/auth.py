# app/routes/auth.py
"""
Authentication endpoints.

POST /auth/login          — Login with Firebase ID token, receive JWT pair
POST /auth/refresh-token  — Refresh access token
POST /auth/logout         — Logout (client-side token discard)
POST /auth/fcm-token      — Update FCM device token
"""

from fastapi import APIRouter, HTTPException

from app.models.auth import (
    LoginRequest,
    RefreshTokenRequest,
    TokenResponse,
    AuthStatusResponse,
)
from app.models.common import APIResponse
from app.services.auth_service import (
    login_with_firebase_token,
    refresh_access_token,
    update_fcm_token,
)
from app.middleware.auth import get_current_user
from fastapi import Depends
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """
    Authenticate using Firebase ID token.

    The client obtains the Firebase ID token via Firebase Auth SDK
    (OTP or email/password), then sends it here to get our JWT pair.
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
