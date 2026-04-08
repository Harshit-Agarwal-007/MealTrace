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
    """Login via Firebase ID token (obtained after email/password or OTP auth)."""
    firebase_id_token: str  # Firebase Auth ID token from client-side auth


class RegisterRequest(BaseModel):
    """Self-registration: creates Firebase Auth user + Firestore resident profile."""
    email: EmailStr
    password: str  # Min 6 chars (Firebase requirement)
    name: str
    phone: Optional[str] = None
    room_number: str
    site_id: str


class ForgotPasswordRequest(BaseModel):
    """Trigger a Firebase password reset email."""
    email: EmailStr


class ChangePasswordRequest(BaseModel):
    """Change password for the currently authenticated user."""
    current_password: str
    new_password: str  # Min 6 chars (Firebase requirement)


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
