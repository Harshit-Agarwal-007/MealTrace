# app/routes/resident.py
"""
Resident-facing endpoints.

GET   /resident/profile        — Current resident's profile
PATCH /resident/profile        — Self-edit profile (name, phone, room)
GET   /resident/qr-code        — Generate/retrieve signed QR code
GET   /resident/balance        — Current credit balance
GET   /resident/transactions   — Paginated scan history
GET   /resident/subscription   — Current plan subscription details
POST  /resident/subscribe      — Subscribe to a meal plan with selected meals
GET   /resident/guest-passes   — List of all guest passes (active + used)
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.resident import (
    ResidentProfile,
    ResidentBalance,
    SubscriptionInfo,
    SubscribeRequest,
    UpdateSelfProfileRequest,
    GuestPassInfo,
    QRCodeResponse,
    TransactionListResponse,
)
from app.middleware.auth import require_resident, require_resident_or_admin
from app.services.resident_service import (
    get_profile,
    get_balance,
    get_qr_code,
    get_transactions,
    get_subscription,
    subscribe_to_plan,
    update_self_profile,
    get_guest_passes,
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


@router.get("/subscription", response_model=SubscriptionInfo)
async def resident_subscription(current_user: dict = Depends(require_resident)):
    """
    Get the resident's current subscription details.

    Returns plan info, allowed meals, remaining credits, and status.
    The mobile app uses this to show/lock meal options in the UI.
    """
    user_id = current_user["sub"]
    sub = get_subscription(user_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Resident not found")
    return sub


@router.post("/subscribe", response_model=SubscriptionInfo)
async def resident_subscribe(
    request: SubscribeRequest,
    current_user: dict = Depends(require_resident),
):
    """
    Subscribe to a meal plan with selected meal types.

    Example: Plan "1 Meal/Day", selected_meals: ["BREAKFAST"]
    → Resident can only scan for breakfast. Lunch/dinner require a ₹100 guest pass.

    The number of selected meals must match the plan's meals_per_day.
    """
    user_id = current_user["sub"]
    try:
        return subscribe_to_plan(user_id, request.plan_id, request.selected_meals)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/profile", response_model=ResidentProfile)
async def resident_self_edit(
    request: UpdateSelfProfileRequest,
    current_user: dict = Depends(require_resident),
):
    """
    Self-edit profile — residents can update their name, phone, room number.
    Cannot change email, site, status, or plan.
    """
    user_id = current_user["sub"]
    result = update_self_profile(user_id, request.model_dump())
    if result is None:
        raise HTTPException(status_code=404, detail="Resident not found")
    return result


@router.get("/guest-passes", response_model=list[GuestPassInfo])
async def resident_guest_passes(
    current_user: dict = Depends(require_resident),
):
    """
    List all guest passes for the resident (active + used).
    Ordered by most recent first.
    """
    user_id = current_user["sub"]
    return get_guest_passes(user_id)
