# app/routes/payment.py
"""
Payment endpoints.

POST /payments/create-order   — Create Razorpay order for plan/guest pass
POST /payments/webhook        — Razorpay webhook (signature validated)
GET  /plans                   — Get available meal plans (with meals_per_day)
POST /guest-pass/purchase     — Issue a single-use guest QR pass (₹100)
"""

from fastapi import APIRouter, Depends, HTTPException, Request

from app.models.payment import (
    CreateOrderRequest,
    CreateOrderResponse,
    CreditOverrideRequest,
    CreditOverrideResponse,
    GuestPassPurchaseRequest,
    GuestPassResponse,
    PlanInfo,
    ActivePlanResponse,
)
from app.models.common import APIResponse
from app.middleware.auth import require_resident, require_resident_or_admin, get_current_user
from app.services.payment_service import (
    create_payment_order,
    process_webhook,
    purchase_guest_pass,
)
from app.database import get_db

router = APIRouter(tags=["Payments"])


@router.post("/payments/create-order", response_model=CreateOrderResponse)
async def create_order(
    request: CreateOrderRequest,
    current_user: dict = Depends(require_resident),
):
    """
    Create a Razorpay order for plan purchase or guest pass.

    Returns order details to be used with Razorpay checkout on the client.
    """
    user_id = current_user["sub"]
    try:
        return create_payment_order(
            resident_id=user_id,
            plan_id=request.plan_id,
            guest_pass=request.guest_pass,
            amount_override=request.amount,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/payments/webhook")
async def razorpay_webhook(request: Request):
    """
    Razorpay webhook endpoint — called by Razorpay on payment events.

    CRITICAL SECURITY:
    - Validates X-Razorpay-Signature using HMAC-SHA256
    - On valid `payment.captured` event: atomically credits balance
    - On invalid signature: rejects with 400

    This endpoint has NO auth requirement (it's called by Razorpay servers).
    """
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if not signature:
        raise HTTPException(status_code=400, detail="Missing signature header")

    event_data = await request.json()

    success = process_webhook(body, signature, event_data)
    if not success:
        raise HTTPException(status_code=400, detail="Webhook processing failed")

    return {"status": "ok"}


@router.get("/plans", response_model=list[PlanInfo])
async def list_plans():
    """
    List all available meal plans.

    Each plan has:
    - meals_per_day: how many meals included (1, 2, or 3)
    - meal_count: total credits in the plan
    - duration_days: validity period
    - price: price in INR
    """
    db = get_db()
    docs = db.collection("plans").get()

    plans = []
    for doc in docs:
        data = doc.to_dict()
        plans.append(PlanInfo(
            id=doc.id,
            name=data.get("name", ""),
            meals_per_day=data.get("meals_per_day", 1),
            meal_count=data.get("meal_count", 0),
            duration_days=data.get("duration_days", 30),
            price=data.get("price", 0),
            description=data.get("description"),
        ))

    return plans


# Keep the old /plans/active route for backward compatibility
@router.get("/plans/active", response_model=list[PlanInfo], include_in_schema=False)
async def list_plans_active():
    """Alias for /plans (backward compatibility)."""
    return await list_plans()


@router.post("/guest-pass/purchase", response_model=GuestPassResponse)
async def buy_guest_pass(
    request: GuestPassPurchaseRequest,
    current_user: dict = Depends(require_resident_or_admin),
):
    """
    Purchase a single-use guest QR pass for ₹100.

    Used when a resident wants a meal outside their plan
    (e.g., they have breakfast+dinner but need lunch today).
    Valid for 24 hours. Can be used for one meal scan.
    """
    user_id = current_user["sub"]
    return purchase_guest_pass(
        resident_id=user_id,
        site_id=request.site_id,
        meal_type=request.meal_type,
    )
