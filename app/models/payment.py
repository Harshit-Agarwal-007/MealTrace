# app/models/payment.py
"""Payment and plan schemas."""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ── Plan ──

class PlanInfo(BaseModel):
    """Meal plan definition."""
    id: str
    name: str
    meals_per_day: int  # 1, 2, or 3
    meal_count: int  # Total credits in the plan (e.g. 30)
    duration_days: int = 30  # Plan validity in days
    price: int  # in INR (₹)
    description: Optional[str] = None


class ActivePlanResponse(BaseModel):
    """Currently active plan for a resident."""
    plan_id: Optional[str] = None
    plan_name: Optional[str] = None
    meals_remaining: int
    purchased_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


# ── Payment ──

class CreateOrderRequest(BaseModel):
    """Create Razorpay order for plan or guest pass purchase."""
    plan_id: Optional[str] = None
    selected_meals: Optional[List[str]] = None  # e.g. ["BREAKFAST", "DINNER"]
    guest_pass: bool = False
    amount: Optional[int] = None  # Override amount (for guest pass)


class CreateOrderResponse(BaseModel):
    """Razorpay order details returned to client for checkout."""
    order_id: str
    amount: int  # in paise
    currency: str = "INR"
    razorpay_key_id: str
    resident_id: str


class RazorpayWebhookPayload(BaseModel):
    """Incoming Razorpay webhook event (simplified)."""
    event: str
    payload: dict  # Contains payment.entity with order_id, payment_id, etc.


class PaymentRecord(BaseModel):
    """Payment transaction record."""
    id: str
    resident_id: str
    plan_id: Optional[str] = None
    razorpay_order_id: str
    razorpay_payment_id: Optional[str] = None
    amount: int
    status: str  # SUCCESS, PENDING, FAILED
    timestamp: datetime


# ── Credit Override (Admin) ──

class CreditOverrideRequest(BaseModel):
    """Admin manually adds/deducts credits."""
    resident_id: str
    amount: int  # positive = add, negative = deduct
    reason: str


class CreditOverrideResponse(BaseModel):
    """Result of credit override."""
    resident_id: str
    previous_balance: int
    new_balance: int
    amount_changed: int
    reason: str
    admin_id: str
    timestamp: datetime


# ── Guest Pass ──

class GuestPassPurchaseRequest(BaseModel):
    """Purchase a single-use guest QR pass (₹100 for one out-of-plan meal)."""
    site_id: str
    meal_type: Optional[str] = None  # If specific meal, else any


class GuestPassResponse(BaseModel):
    """Issued guest pass with QR."""
    id: str
    resident_id: str
    qr_payload: str
    qr_base64: str
    status: str  # UNUSED, USED
    expiry_at: datetime
    created_at: datetime
