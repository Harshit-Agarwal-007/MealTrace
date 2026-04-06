# app/models/resident.py
"""Resident-related request/response schemas."""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


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
    created_at: Optional[datetime] = None


class ResidentBalance(BaseModel):
    """Current credit balance + plan info."""
    resident_id: str
    balance: int
    active_plan: Optional[str] = None
    plan_expiry: Optional[datetime] = None


class TransactionRecord(BaseModel):
    """Single transaction/scan log entry."""
    id: str
    meal_type: str  # BREAKFAST, LUNCH, DINNER
    site_id: str
    site_name: Optional[str] = None
    status: str  # SUCCESS, BLOCKED
    block_reason: Optional[str] = None
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
    """Add a new resident."""
    name: str
    email: EmailStr
    phone: Optional[str] = None
    room_number: str
    site_id: str


class UpdateResidentRequest(BaseModel):
    """Edit resident profile (partial update)."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    room_number: Optional[str] = None
    site_id: Optional[str] = None
    status: Optional[str] = None


class ResidentListResponse(BaseModel):
    """Paginated resident list for admin."""
    residents: List[ResidentProfile]
    total: int
    page: int
    page_size: int
    has_more: bool
