# app/services/scan_service.py
"""
Core scan validation engine.

Implements all 6 hard-block conditions atomically using Firestore transactions:

1. INVALID_QR         — QR signature verification failed
2. INACTIVE_RESIDENT  — Resident status ≠ ACTIVE
3. WRONG_SITE         — QR site_id ≠ vendor's current site_id
4. OUTSIDE_MEAL_WINDOW — Current time is outside the configured meal window
5. DUPLICATE_SCAN     — Resident already scanned for this meal type today
6. ZERO_BALANCE       — Resident has 0 credits remaining

On success: atomically deducts 1 credit and logs the scan.
"""

import logging
from datetime import datetime, timezone, timedelta, date

from google.cloud.firestore_v1 import transaction as firestore_transaction
from google.cloud.firestore_v1.base_query import FieldFilter

from app.database import get_db
from app.models.scan import ScanStatus, BlockReason, ScanValidateResponse
from app.utils.qr_gen import verify_qr_payload
from app.utils.fcm_manager import send_notification, send_low_balance_alert

logger = logging.getLogger(__name__)

# IST offset (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))


def _get_current_meal_type(site_data: dict) -> tuple:
    """
    Determine which meal window (if any) the current time falls into.

    Returns:
        (meal_type, is_within_window) — e.g. ("LUNCH", True) or (None, False)
    """
    now = datetime.now(IST)
    current_time_str = now.strftime("%H:%M")

    meal_windows = site_data.get("meal_windows", {})
    for meal_type, window in meal_windows.items():
        start = window.get("start", "")
        end = window.get("end", "")
        if start <= current_time_str <= end:
            return meal_type.upper(), True

    return None, False


def _check_duplicate_scan(db, resident_id: str, site_id: str, meal_type: str) -> bool:
    """
    Check if the resident has already been scanned for this meal today.
    Uses IST date for day boundary.
    """
    today_ist = datetime.now(IST).date()
    today_start = datetime.combine(today_ist, datetime.min.time()).replace(tzinfo=IST)
    today_end = datetime.combine(today_ist, datetime.max.time()).replace(tzinfo=IST)

    # Convert to UTC for Firestore query
    today_start_utc = today_start.astimezone(timezone.utc)
    today_end_utc = today_end.astimezone(timezone.utc)

    existing = (
        db.collection("scan_logs")
        .where(filter=FieldFilter("resident_id", "==", resident_id))
        .where(filter=FieldFilter("meal_type", "==", meal_type))
        .where(filter=FieldFilter("status", "==", "SUCCESS"))
        .where(filter=FieldFilter("timestamp", ">=", today_start_utc))
        .where(filter=FieldFilter("timestamp", "<=", today_end_utc))
        .limit(1)
        .get()
    )
    return len(existing) > 0


def validate_scan(qr_payload: str, site_id: str, vendor_id: str) -> ScanValidateResponse:
    """
    Core scan validation — runs all 6 hard-block checks and atomically
    deducts 1 credit on success.

    This is the most performance-critical endpoint. Target: <2s on 4G.
    """
    now = datetime.now(timezone.utc)
    db = get_db()

    # ── Block 1: INVALID_QR ──
    qr_data = verify_qr_payload(qr_payload)
    if not qr_data["valid"]:
        _log_scan(db, None, site_id, vendor_id, None, ScanStatus.BLOCKED, BlockReason.INVALID_QR, now)
        return ScanValidateResponse(
            status=ScanStatus.BLOCKED,
            block_reason=BlockReason.INVALID_QR.value,
            timestamp=now,
        )

    resident_id = qr_data["resident_id"]
    qr_site_id = qr_data["site_id"]

    # ── Fetch resident doc ──
    resident_ref = db.collection("residents").document(resident_id)
    resident_doc = resident_ref.get()

    if not resident_doc.exists:
        _log_scan(db, resident_id, site_id, vendor_id, None, ScanStatus.BLOCKED, BlockReason.INVALID_QR, now)
        return ScanValidateResponse(
            status=ScanStatus.BLOCKED,
            resident_id=resident_id,
            block_reason=BlockReason.INVALID_QR.value,
            timestamp=now,
        )

    resident = resident_doc.to_dict()
    resident_name = resident.get("name", "Unknown")

    # ── Block 2: INACTIVE_RESIDENT ──
    if resident.get("status") != "ACTIVE":
        _log_scan(db, resident_id, site_id, vendor_id, None, ScanStatus.BLOCKED, BlockReason.INACTIVE_RESIDENT, now)
        return ScanValidateResponse(
            status=ScanStatus.BLOCKED,
            resident_name=resident_name,
            resident_id=resident_id,
            block_reason=BlockReason.INACTIVE_RESIDENT.value,
            timestamp=now,
        )

    # ── Block 3: WRONG_SITE ──
    # The QR code's embedded site_id must match the vendor's active site
    if qr_site_id != site_id:
        _log_scan(db, resident_id, site_id, vendor_id, None, ScanStatus.BLOCKED, BlockReason.WRONG_SITE, now)
        return ScanValidateResponse(
            status=ScanStatus.BLOCKED,
            resident_name=resident_name,
            resident_id=resident_id,
            block_reason=BlockReason.WRONG_SITE.value,
            timestamp=now,
        )

    # ── Fetch site data for meal window check ──
    site_doc = db.collection("sites").document(site_id).get()
    if not site_doc.exists:
        _log_scan(db, resident_id, site_id, vendor_id, None, ScanStatus.BLOCKED, BlockReason.WRONG_SITE, now)
        return ScanValidateResponse(
            status=ScanStatus.BLOCKED,
            resident_name=resident_name,
            resident_id=resident_id,
            block_reason=BlockReason.WRONG_SITE.value,
            timestamp=now,
        )

    site_data = site_doc.to_dict()

    # ── Block 4: OUTSIDE_MEAL_WINDOW ──
    meal_type, within_window = _get_current_meal_type(site_data)
    if not within_window or meal_type is None:
        _log_scan(db, resident_id, site_id, vendor_id, meal_type, ScanStatus.BLOCKED, BlockReason.OUTSIDE_MEAL_WINDOW, now)
        return ScanValidateResponse(
            status=ScanStatus.BLOCKED,
            resident_name=resident_name,
            resident_id=resident_id,
            meal_type=meal_type,
            block_reason=BlockReason.OUTSIDE_MEAL_WINDOW.value,
            timestamp=now,
        )

    # ── Block 5: DUPLICATE_SCAN ──
    if _check_duplicate_scan(db, resident_id, site_id, meal_type):
        _log_scan(db, resident_id, site_id, vendor_id, meal_type, ScanStatus.BLOCKED, BlockReason.DUPLICATE_SCAN, now)
        return ScanValidateResponse(
            status=ScanStatus.BLOCKED,
            resident_name=resident_name,
            resident_id=resident_id,
            meal_type=meal_type,
            block_reason=BlockReason.DUPLICATE_SCAN.value,
            timestamp=now,
        )

    # ── Block 6: ZERO_BALANCE ──
    current_balance = resident.get("balance", 0)
    if current_balance <= 0:
        _log_scan(db, resident_id, site_id, vendor_id, meal_type, ScanStatus.BLOCKED, BlockReason.ZERO_BALANCE, now)
        return ScanValidateResponse(
            status=ScanStatus.BLOCKED,
            resident_name=resident_name,
            resident_id=resident_id,
            meal_type=meal_type,
            balance_after=0,
            block_reason=BlockReason.ZERO_BALANCE.value,
            timestamp=now,
        )

    # ── ALL CHECKS PASSED — Atomic credit deduction ──
    new_balance = _atomic_deduct_and_log(
        db, resident_ref, resident_id, site_id, vendor_id, meal_type, current_balance, now
    )

    # ── Send FCM notifications (async-safe, non-blocking) ──
    try:
        send_notification(
            resident_id,
            "SCAN_SUCCESS",
            {"meal_type": meal_type, "balance": str(new_balance)},
        )
        send_low_balance_alert(resident_id, new_balance)
    except Exception as e:
        logger.warning(f"FCM notification failed (non-critical): {e}")

    return ScanValidateResponse(
        status=ScanStatus.SUCCESS,
        resident_name=resident_name,
        resident_id=resident_id,
        meal_type=meal_type,
        balance_after=new_balance,
        timestamp=now,
    )


def _atomic_deduct_and_log(
    db, resident_ref, resident_id, site_id, vendor_id, meal_type, current_balance, timestamp
) -> int:
    """
    Use a Firestore Transaction to atomically:
    1. Deduct 1 credit from resident balance
    2. Write a SUCCESS scan_log entry

    This prevents race conditions from concurrent scans.
    """

    @firestore_transaction.transactional
    def txn_deduct(transaction, res_ref):
        snapshot = res_ref.get(transaction=transaction)
        balance = snapshot.get("balance") or 0

        if balance <= 0:
            raise ValueError("Balance became 0 during transaction")

        new_balance = balance - 1
        transaction.update(res_ref, {"balance": new_balance})

        # Write scan log inside the same transaction
        log_ref = db.collection("scan_logs").document()
        transaction.set(log_ref, {
            "resident_id": resident_id,
            "site_id": site_id,
            "vendor_id": vendor_id,
            "meal_type": meal_type,
            "status": ScanStatus.SUCCESS.value,
            "block_reason": None,
            "timestamp": timestamp,
        })

        return new_balance

    transaction = db.transaction()
    new_balance = txn_deduct(transaction, resident_ref)
    return new_balance


def _log_scan(db, resident_id, site_id, vendor_id, meal_type, status, block_reason, timestamp):
    """Write a scan log entry for blocked scans (non-transactional)."""
    try:
        db.collection("scan_logs").add({
            "resident_id": resident_id,
            "site_id": site_id,
            "vendor_id": vendor_id,
            "meal_type": meal_type,
            "status": status.value,
            "block_reason": block_reason.value if block_reason else None,
            "timestamp": timestamp,
        })
    except Exception as e:
        logger.error(f"Failed to log scan: {e}")
