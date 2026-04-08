# app/models/scan.py
"""Scan validation request/response schemas."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class ScanStatus(str, Enum):
    SUCCESS = "SUCCESS"
    BLOCKED = "BLOCKED"


class BlockReason(str, Enum):
    """The 7 hard-block conditions."""
    NONE = ""
    DUPLICATE_SCAN = "DUPLICATE_SCAN"           # Already scanned for this meal today
    ZERO_BALANCE = "ZERO_BALANCE"               # No credits remaining
    WRONG_SITE = "WRONG_SITE"                   # QR site_id ≠ vendor's active site
    OUTSIDE_MEAL_WINDOW = "OUTSIDE_MEAL_WINDOW" # Current time outside meal window
    INACTIVE_RESIDENT = "INACTIVE_RESIDENT"     # Resident status ≠ ACTIVE
    INVALID_QR = "INVALID_QR"                   # QR signature verification failed
    NOT_IN_PLAN = "NOT_IN_PLAN"                 # Meal type not in resident's allowed_meals


# ── Request ──

class ScanValidateRequest(BaseModel):
    """Vendor submits a scanned QR payload for validation."""
    qr_payload: str     # The signed QR payload string from the resident's QR code
    site_id: str        # The vendor's currently selected site
    vendor_id: str      # The vendor performing the scan


# ── Response ──

class ScanValidateResponse(BaseModel):
    """Result returned to vendor scanner after POST /scan/validate."""
    status: ScanStatus
    resident_name: Optional[str] = None
    resident_id: Optional[str] = None
    meal_type: Optional[str] = None
    balance_after: Optional[int] = None
    block_reason: Optional[str] = None
    is_guest_pass: bool = False
    timestamp: datetime
