# app/models/resident.py
"""Resident-related request/response schemas."""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

from app.models.payment import PlanInfo


# ── Responses ──

class ResidentProfile(BaseModel):
    """Full resident profile."""
    id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    room_number: str
    site_id: str
    site_name: Optional[str] = None
    balance: int
    status: str  # ACTIVE, INACTIVE, SUSPENDED
    # Subscription / plan fields
    plan_id: Optional[str] = None
    plan_name: Optional[str] = None
    allowed_meals: List[str] = []  # e.g. ["BREAKFAST", "DINNER"]
    plan_started_at: Optional[datetime] = None
    plan_expiry: Optional[datetime] = None
    dietary_preference: str = "VEG"
    created_at: Optional[datetime] = None
    push_notifications_enabled: bool = True


class ResidentBalance(BaseModel):
    """Current credit balance + plan info."""
    resident_id: str
    balance: int
    active_plan: Optional[str] = None
    plan_expiry: Optional[datetime] = None


class SubscriptionInfo(BaseModel):
    """Current subscription details for a resident."""
    resident_id: str
    plan_id: Optional[str] = None
    plan_name: Optional[str] = None
    meals_per_day: Optional[int] = None
    allowed_meals: List[str] = []
    balance: int = 0
    plan_started_at: Optional[datetime] = None
    plan_expiry: Optional[datetime] = None
    status: str = "NONE"  # NONE, ACTIVE, EXPIRED


class ResidentGuestPassCatalog(BaseModel):
    """Guest pass offer for the authenticated resident's site."""

    enabled: bool
    price_inr: int


class ResidentCatalogResponse(BaseModel):
    """Filtered plans + guest pass flags for the resident app."""

    plans_purchase_enabled: bool
    plans: List[PlanInfo]
    guest_pass: ResidentGuestPassCatalog


class TransactionRecord(BaseModel):
    """Single transaction/scan log entry."""
    id: str
    meal_type: Optional[str] = None  # BREAKFAST, LUNCH, DINNER — null for pre-meal-window blocks
    site_id: str
    site_name: Optional[str] = None
    status: str  # SUCCESS, BLOCKED
    block_reason: Optional[str] = None
    is_guest_pass: bool = False
    is_manual: bool = False
    description: Optional[str] = None
    timestamp: datetime


class TransactionListResponse(BaseModel):
    """Paginated transaction history."""
    transactions: List[TransactionRecord]
    total: int
    page: int
    page_size: int
    has_more: bool


class QRCodeResponse(BaseModel):
    """QR code image data."""
    resident_id: str
    qr_base64: str  # Base64-encoded PNG image
    payload_signature: str
    generated_at: datetime


# ── Requests (Admin-facing) ──

class CreateResidentRequest(BaseModel):
    """Add a new resident (admin-created, sends password setup email)."""
    name: str
    email: EmailStr
    phone: Optional[str] = None
    room_number: str
    site_id: str
    dietary_preference: str = "VEG"
    password: Optional[str] = None  # If None, admin invite flow sends setup email


class UpdateResidentRequest(BaseModel):
    """Edit resident profile (partial update)."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    room_number: Optional[str] = None
    site_id: Optional[str] = None
    status: Optional[str] = None
    dietary_preference: Optional[str] = None


class UpdateSelfProfileRequest(BaseModel):
    """Resident self-edit (limited fields — no role/status changes)."""
    name: Optional[str] = None
    phone: Optional[str] = None
    room_number: Optional[str] = None
    dietary_preference: Optional[str] = None
    push_notifications_enabled: Optional[bool] = None


class SubscribeRequest(BaseModel):
    """Subscribe to a meal plan with selected meals."""
    plan_id: str
    selected_meals: List[str]  # e.g. ["BREAKFAST", "DINNER"]


class GuestPassInfo(BaseModel):
    """Guest pass entry for resident's pass list."""
    id: str
    site_id: str
    meal_type: Optional[str] = None
    status: str  # UNUSED, USED
    expiry_at: datetime
    created_at: datetime
    used_at: Optional[datetime] = None
    qr_base64: Optional[str] = None  # PNG base64; omitted for legacy docs until regenerated


class ResidentListResponse(BaseModel):
    """Paginated resident list for admin."""
    residents: List[ResidentProfile]
    total: int
    page: int
    page_size: int
    has_more: bool


class ResidentNotificationItem(BaseModel):
    """Single in-app notification for the resident feed."""
    id: str
    title: str
    message: str
    type: str
    read: bool
    created_at: datetime


class ResidentNotificationListResponse(BaseModel):
    notifications: List[ResidentNotificationItem]
