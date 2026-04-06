# app/routes/resident.py
"""
Resident-facing endpoints.

GET  /resident/profile        — Current resident's profile
GET  /resident/qr-code        — Generate/retrieve signed QR code
GET  /resident/balance        — Current credit balance
GET  /resident/transactions   — Paginated scan history
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.resident import (
    ResidentProfile,
    ResidentBalance,
    QRCodeResponse,
    TransactionListResponse,
)
from app.middleware.auth import require_resident, require_resident_or_admin
from app.services.resident_service import (
    get_profile,
    get_balance,
    get_qr_code,
    get_transactions,
)

router = APIRouter(prefix="/resident", tags=["Resident"])


@router.get("/profile", response_model=ResidentProfile)
async def resident_profile(current_user: dict = Depends(require_resident)):
    """Get the currently authenticated resident's profile."""
    user_id = current_user["sub"]
    profile = get_profile(user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Resident profile not found")
    return profile


@router.get("/qr-code", response_model=QRCodeResponse)
async def resident_qr_code(current_user: dict = Depends(require_resident)):
    """
    Generate a cryptographically signed QR code for the resident.

    Returns base64-encoded PNG image. The QR payload contains:
    - resident_uuid
    - site_id binding
    - timestamp
    - HMAC-SHA256 signature
    """
    user_id = current_user["sub"]
    qr = get_qr_code(user_id)
    if qr is None:
        raise HTTPException(status_code=404, detail="Resident not found")
    return qr


@router.get("/balance", response_model=ResidentBalance)
async def resident_balance(current_user: dict = Depends(require_resident)):
    """Get current credit count and active plan info."""
    user_id = current_user["sub"]
    balance = get_balance(user_id)
    if balance is None:
        raise HTTPException(status_code=404, detail="Resident not found")
    return balance


@router.get("/transactions", response_model=TransactionListResponse)
async def resident_transactions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(require_resident),
):
    """Get paginated scan/transaction history."""
    user_id = current_user["sub"]
    return get_transactions(user_id, page=page, page_size=page_size)
