# app/models/auth.py
"""Authentication request/response schemas."""

from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum


class UserRole(str, Enum):
    RESIDENT = "RESIDENT"
    VENDOR = "VENDOR"
    SUPER_ADMIN = "SUPER_ADMIN"


# ── Requests ──

class LoginRequest(BaseModel):
    """Login via email + OTP or email + password."""
    email: EmailStr
    otp: Optional[str] = None
    firebase_id_token: str  # Firebase Auth ID token from client-side auth


class RefreshTokenRequest(BaseModel):
    """Refresh an access token."""
    refresh_token: str


# ── Responses ──

class TokenResponse(BaseModel):
    """JWT token pair returned on successful auth."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    role: UserRole
    user_id: str


class AuthStatusResponse(BaseModel):
    """Generic auth status."""
    status: str
    message: str
