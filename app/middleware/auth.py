# app/middleware/auth.py
"""
JWT-based authentication and role-based access control middleware.

Flow:
1. Client sends Firebase ID token → POST /auth/login
2. Backend verifies with Firebase Auth, looks up user role in Firestore
3. Backend issues its own JWT (access + refresh tokens)
4. Subsequent requests use the JWT access token in Authorization header
5. Middleware extracts and validates JWT, injects user context into request
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, List

import jwt
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import get_settings
from app.models.auth import UserRole

security = HTTPBearer()


# ── Token Creation ──

def create_access_token(user_id: str, role: UserRole, email: str) -> str:
    """Create a short-lived access token."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": user_id,
        "role": role.value,
        "email": email,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Create a long-lived refresh token."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


# ── Token Verification ──

def decode_token(token: str) -> dict:
    """Decode and validate a JWT. Raises HTTPException on failure."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── Dependency: Get Current User ──

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    FastAPI dependency that extracts and validates the JWT from the
    Authorization: Bearer <token> header.

    Returns the decoded token payload with keys: sub, role, email, type.
    """
    token = credentials.credentials
    payload = decode_token(token)

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    return payload


# ── Role Guards ──

def require_role(allowed_roles: List[UserRole]):
    """
    Returns a FastAPI dependency that checks if the current user
    has one of the allowed roles.

    Usage:
        @router.get("/admin/...", dependencies=[Depends(require_role([UserRole.SUPER_ADMIN]))])
    """

    async def role_checker(
        current_user: dict = Depends(get_current_user),
    ) -> dict:
        user_role = current_user.get("role")
        if user_role not in [r.value for r in allowed_roles]:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required role(s): {[r.value for r in allowed_roles]}",
            )
        return current_user

    return role_checker


# ── Convenience Dependencies ──

async def require_resident(current_user: dict = Depends(get_current_user)) -> dict:
    """Require RESIDENT role."""
    if current_user.get("role") != UserRole.RESIDENT.value:
        raise HTTPException(status_code=403, detail="Resident access required")
    return current_user


async def require_vendor(current_user: dict = Depends(get_current_user)) -> dict:
    """Require VENDOR role."""
    if current_user.get("role") != UserRole.VENDOR.value:
        raise HTTPException(status_code=403, detail="Vendor access required")
    return current_user


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Require SUPER_ADMIN role."""
    if current_user.get("role") != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def require_vendor_or_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Require VENDOR or SUPER_ADMIN role."""
    if current_user.get("role") not in [UserRole.VENDOR.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Vendor or Admin access required")
    return current_user


async def require_resident_or_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Require RESIDENT or SUPER_ADMIN role."""
    if current_user.get("role") not in [UserRole.RESIDENT.value, UserRole.SUPER_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Resident or Admin access required")
    return current_user
