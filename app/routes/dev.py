# app/routes/dev.py
"""
Development-only endpoints for testing without Firebase Auth.
These endpoints allow direct JWT token generation by selecting a test user.

⚠️ MUST be disabled in production.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.auth import UserRole, TokenResponse
from app.middleware.auth import create_access_token, create_refresh_token
from app.config import get_settings
from app.utils.qr_gen import generate_qr_payload, generate_qr_image_base64

router = APIRouter(prefix="/dev", tags=["Development"])


class DevLoginRequest(BaseModel):
    """Pick a test user by ID or role."""
    user_id: Optional[str] = None
    role: Optional[str] = None  # RESIDENT, VENDOR, SUPER_ADMIN


@router.post("/login", response_model=TokenResponse)
async def dev_login(request: DevLoginRequest):
    """
    Dev-only login — bypasses Firebase Auth entirely.
    Provide either a user_id or a role to get a JWT.
    """
    settings = get_settings()
    if settings.APP_ENV == "production":
        raise HTTPException(status_code=403, detail="Dev login disabled in production")

    db = get_db()

    if request.user_id:
        # Try to find in residents
        doc = db.collection("residents").document(request.user_id).get()
        if doc.exists:
            data = doc.to_dict()
            user_id = doc.id
            role = UserRole.RESIDENT
            email = data.get("email", "")
        else:
            # Try admin_users
            doc = db.collection("admin_users").document(request.user_id).get()
            if doc.exists:
                data = doc.to_dict()
                user_id = doc.id
                role = UserRole(data.get("role", "SUPER_ADMIN"))
                email = data.get("email", "")
            else:
                raise HTTPException(status_code=404, detail=f"User {request.user_id} not found")
    elif request.role:
        # Pick a default user for the role
        target_role = request.role.upper()
        if target_role == "RESIDENT":
            docs = db.collection("residents").limit(1).get()
            if not docs:
                raise HTTPException(status_code=404, detail="No residents found")
            d = docs[0]
            user_id = d.id
            role = UserRole.RESIDENT
            email = d.to_dict().get("email", "")
        elif target_role in ("VENDOR", "SUPER_ADMIN"):
            docs = (
                db.collection("admin_users")
                .where("role", "==", target_role)
                .limit(1)
                .get()
            )
            if not docs:
                raise HTTPException(status_code=404, detail=f"No {target_role} users found")
            d = docs[0]
            user_id = d.id
            role = UserRole(target_role)
            email = d.to_dict().get("email", "")
        else:
            raise HTTPException(status_code=400, detail=f"Invalid role: {target_role}")
    else:
        raise HTTPException(status_code=400, detail="Provide user_id or role")

    access_token = create_access_token(user_id, role, email)
    refresh_token = create_refresh_token(user_id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        role=role,
        user_id=user_id,
    )


@router.get("/users")
async def dev_list_users():
    """List all test users available for dev login."""
    settings = get_settings()
    if settings.APP_ENV == "production":
        raise HTTPException(status_code=403, detail="Disabled in production")

    db = get_db()
    users = []

    # Residents
    for doc in db.collection("residents").get():
        data = doc.to_dict()
        users.append({
            "id": doc.id,
            "name": data.get("name", ""),
            "email": data.get("email", ""),
            "role": "RESIDENT",
            "site_id": data.get("site_id", ""),
            "balance": data.get("balance", 0),
            "status": data.get("status", ""),
        })

    # Admin/Vendor users
    for doc in db.collection("admin_users").get():
        data = doc.to_dict()
        users.append({
            "id": doc.id,
            "name": data.get("name", ""),
            "email": data.get("email", ""),
            "role": data.get("role", ""),
            "site_id": data.get("site_id", ""),
        })

    return {"users": users}


@router.get("/generate-qr/{resident_id}")
async def dev_generate_qr(resident_id: str):
    """Generate a fresh QR code for a resident (for testing scan flow)."""
    settings = get_settings()
    if settings.APP_ENV == "production":
        raise HTTPException(status_code=403, detail="Disabled in production")

    db = get_db()
    doc = db.collection("residents").document(resident_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Resident not found")

    data = doc.to_dict()
    site_id = data.get("site_id", "")

    payload = generate_qr_payload(resident_id, site_id)
    qr_base64 = generate_qr_image_base64(payload)

    # Save payload to resident doc
    db.collection("residents").document(resident_id).update({
        "qr_signed_payload": payload,
    })

    return {
        "resident_id": resident_id,
        "site_id": site_id,
        "qr_payload": payload,
        "qr_base64": qr_base64,
    }


@router.get("/sites")
async def dev_list_sites():
    """List all sites for dev UI dropdowns."""
    settings = get_settings()
    if settings.APP_ENV == "production":
        raise HTTPException(status_code=403, detail="Disabled in production")

    db = get_db()
    sites = []
    for doc in db.collection("sites").get():
        data = doc.to_dict()
        sites.append({
            "id": doc.id,
            "name": data.get("name", ""),
            "meal_windows": data.get("meal_windows", {}),
            "is_active": data.get("is_active", True),
        })
    return {"sites": sites}
