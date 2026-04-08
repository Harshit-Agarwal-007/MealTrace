# app/routes/scan.py
"""
Scan validation endpoint.

POST /scan/validate — Core scan engine with all 6 hard-block checks.
"""

from fastapi import APIRouter, Depends

from app.models.scan import ScanValidateRequest, ScanValidateResponse, ManualScanRequest
from app.middleware.auth import require_vendor_or_admin
from app.services.scan_service import validate_scan, manual_scan

router = APIRouter(prefix="/scan", tags=["Scanner"])


@router.post("/validate", response_model=ScanValidateResponse)
async def scan_validate(
    request: ScanValidateRequest,
    current_user: dict = Depends(require_vendor_or_admin),
):
    """
    Validate a scanned QR code.

    Runs all 6 hard-block conditions atomically:
    1. INVALID_QR — Signature verification failed
    2. INACTIVE_RESIDENT — Resident not active
    3. WRONG_SITE — QR site ≠ vendor's site
    4. OUTSIDE_MEAL_WINDOW — Not during meal time
    5. DUPLICATE_SCAN — Already scanned for this meal today
    6. ZERO_BALANCE — No credits remaining

    On success: deducts 1 credit atomically and returns SUCCESS.

    Response JSON:
    ```json
    {
        "status": "SUCCESS" | "BLOCKED",
        "resident_name": "...",
        "meal_type": "LUNCH",
        "balance_after": 29,
        "block_reason": null | "DUPLICATE_SCAN"
    }
    ```

    Latency target: <2s on 4G.
    """
    return validate_scan(
        qr_payload=request.qr_payload,
        site_id=request.site_id,
        vendor_id=request.vendor_id,
    )


@router.post("/manual", response_model=ScanValidateResponse)
async def scan_manual(
    request: ManualScanRequest,
    current_user: dict = Depends(require_vendor_or_admin),
):
    """
    Manually log a scan without a physical QR code.
    Used by vendors when resident forgets their phone.
    Requires resident_id, site_id, and an optional description.
    """
    return manual_scan(
        resident_id=request.resident_id,
        site_id=request.site_id,
        vendor_id=request.vendor_id,
        description=request.description,
    )
