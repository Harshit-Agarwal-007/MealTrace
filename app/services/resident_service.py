# app/services/resident_service.py
"""
Resident service — profile management, QR generation, transaction history,
subscription management, and admin operations.
"""

import logging
import io
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from app.database import get_db
from app.models.resident import (
    ResidentProfile,
    ResidentBalance,
    SubscriptionInfo,
    TransactionRecord,
    TransactionListResponse,
    QRCodeResponse,
    ResidentListResponse,
)
from app.utils.qr_gen import generate_qr_payload, generate_qr_image_base64
from app.services.auth_service import create_firebase_user_for_invite

logger = logging.getLogger(__name__)


def _build_resident_profile(doc_id: str, data: dict, db=None) -> ResidentProfile:
    """Build a ResidentProfile from Firestore document data."""
    site_name = None
    site_id = data.get("site_id")
    if site_id and db:
        site_doc = db.collection("sites").document(site_id).get()
        if site_doc.exists:
            site_name = site_doc.to_dict().get("name")

    return ResidentProfile(
        id=doc_id,
        name=data.get("name", ""),
        email=data.get("email", ""),
        phone=data.get("phone"),
        room_number=data.get("room_number", ""),
        site_id=site_id or "",
        site_name=site_name,
        balance=data.get("balance", 0),
        status=data.get("status", "ACTIVE"),
        plan_id=data.get("plan_id"),
        plan_name=data.get("plan_name"),
        allowed_meals=data.get("allowed_meals", []),
        plan_started_at=data.get("plan_started_at"),
        plan_expiry=data.get("plan_expiry"),
        created_at=data.get("created_at"),
    )


def get_profile(resident_id: str) -> Optional[ResidentProfile]:
    """Get a resident's full profile."""
    db = get_db()
    doc = db.collection("residents").document(resident_id).get()
    if not doc.exists:
        return None
    return _build_resident_profile(doc.id, doc.to_dict(), db)


def get_balance(resident_id: str) -> Optional[ResidentBalance]:
    """Get current credit balance and active plan info."""
    db = get_db()
    doc = db.collection("residents").document(resident_id).get()
    if not doc.exists:
        return None

    data = doc.to_dict()
    return ResidentBalance(
        resident_id=resident_id,
        balance=data.get("balance", 0),
        active_plan=data.get("plan_id"),
        plan_expiry=data.get("plan_expiry"),
    )


def get_qr_code(resident_id: str) -> Optional[QRCodeResponse]:
    """
    Generate (or regenerate) a cryptographically signed QR code for the resident.
    The QR embeds the resident UUID + site_id binding.
    """
    db = get_db()
    doc = db.collection("residents").document(resident_id).get()
    if not doc.exists:
        return None

    data = doc.to_dict()
    site_id = data.get("site_id", "")

    # Generate signed payload
    payload = generate_qr_payload(resident_id, site_id)
    qr_base64 = generate_qr_image_base64(payload)

    # Store the current payload in Firestore for reference
    db.collection("residents").document(resident_id).update({
        "qr_signed_payload": payload,
        "qr_generated_at": datetime.now(timezone.utc),
    })

    return QRCodeResponse(
        resident_id=resident_id,
        qr_base64=qr_base64,
        payload_signature=payload[:32] + "...",  # Truncated for display
        generated_at=datetime.now(timezone.utc),
    )


def get_subscription(resident_id: str) -> Optional[SubscriptionInfo]:
    """Get a resident's current subscription details."""
    db = get_db()
    doc = db.collection("residents").document(resident_id).get()
    if not doc.exists:
        return None

    data = doc.to_dict()
    plan_id = data.get("plan_id")
    plan_expiry = data.get("plan_expiry")

    # Determine status
    if not plan_id:
        status = "NONE"
    elif plan_expiry and plan_expiry < datetime.now(timezone.utc):
        status = "EXPIRED"
    else:
        status = "ACTIVE"

    # Fetch plan details
    plan_name = data.get("plan_name")
    meals_per_day = None
    if plan_id:
        plan_doc = db.collection("plans").document(plan_id).get()
        if plan_doc.exists:
            plan_data = plan_doc.to_dict()
            plan_name = plan_data.get("name", plan_name)
            meals_per_day = plan_data.get("meals_per_day")

    return SubscriptionInfo(
        resident_id=resident_id,
        plan_id=plan_id,
        plan_name=plan_name,
        meals_per_day=meals_per_day,
        allowed_meals=data.get("allowed_meals", []),
        balance=data.get("balance", 0),
        plan_started_at=data.get("plan_started_at"),
        plan_expiry=plan_expiry,
        status=status,
    )


def subscribe_to_plan(
    resident_id: str,
    plan_id: str,
    selected_meals: List[str],
) -> SubscriptionInfo:
    """
    Subscribe a resident to a meal plan with selected meal types.

    Validates:
    - Plan exists
    - Number of selected meals matches plan's meals_per_day
    - Selected meals are valid (BREAKFAST, LUNCH, DINNER)

    Updates the resident's profile with plan info and credits.
    """
    db = get_db()
    now = datetime.now(timezone.utc)

    # Validate plan
    plan_doc = db.collection("plans").document(plan_id).get()
    if not plan_doc.exists:
        raise ValueError(f"Plan {plan_id} not found")

    plan = plan_doc.to_dict()
    meals_per_day = plan.get("meals_per_day", 1)
    duration_days = plan.get("duration_days", 30)

    # Validate selected meals
    valid_meals = {"BREAKFAST", "LUNCH", "DINNER"}
    selected_upper = [m.upper() for m in selected_meals]
    invalid = set(selected_upper) - valid_meals
    if invalid:
        raise ValueError(f"Invalid meal types: {invalid}. Must be BREAKFAST, LUNCH, or DINNER")

    if len(selected_upper) != meals_per_day:
        raise ValueError(
            f"Plan '{plan.get('name')}' requires exactly {meals_per_day} meal(s) selected, "
            f"but {len(selected_upper)} were provided"
        )

    # Check if resident exists
    resident_ref = db.collection("residents").document(resident_id)
    resident_doc = resident_ref.get()
    if not resident_doc.exists:
        raise ValueError(f"Resident {resident_id} not found")

    # Calculate credits and expiry
    credits = plan.get("meal_count", meals_per_day * duration_days)
    expiry = now + timedelta(days=duration_days)
    current_balance = resident_doc.to_dict().get("balance", 0)

    # Update resident with subscription
    resident_ref.update({
        "plan_id": plan_id,
        "plan_name": plan.get("name"),
        "allowed_meals": selected_upper,
        "plan_started_at": now,
        "plan_expiry": expiry,
        "balance": current_balance + credits,
    })

    logger.info(
        f"Resident {resident_id} subscribed to plan {plan_id}: "
        f"{selected_upper}, +{credits} credits"
    )

    return get_subscription(resident_id)


def update_self_profile(resident_id: str, updates: dict) -> Optional[ResidentProfile]:
    """
    Resident self-edit — only allows safe fields (name, phone, room_number).
    Cannot change email, status, site, or plan.
    """
    db = get_db()
    doc_ref = db.collection("residents").document(resident_id)
    doc = doc_ref.get()

    if not doc.exists:
        return None

    # Only allow safe fields
    safe_fields = {"name", "phone", "room_number"}
    clean_updates = {k: v for k, v in updates.items() if v is not None and k in safe_fields}

    if clean_updates:
        doc_ref.update(clean_updates)

    return get_profile(resident_id)


def get_guest_passes(resident_id: str) -> list:
    """Get all guest passes for a resident (active + used)."""
    db = get_db()
    from app.models.resident import GuestPassInfo

    docs = (
        db.collection("guest_passes")
        .where("resident_id", "==", resident_id)
        .get()
    )

    # Sort client-side by created_at (newest first)
    sorted_docs = sorted(
        docs,
        key=lambda d: d.to_dict().get("created_at", datetime.min.replace(tzinfo=timezone.utc)),
        reverse=True,
    )

    passes = []
    for doc in sorted_docs:
        data = doc.to_dict()
        passes.append(GuestPassInfo(
            id=doc.id,
            site_id=data.get("site_id", ""),
            meal_type=data.get("meal_type"),
            status=data.get("status", "UNUSED"),
            expiry_at=data.get("expiry_at", datetime.now(timezone.utc)),
            created_at=data.get("created_at", datetime.now(timezone.utc)),
            used_at=data.get("used_at"),
        ))

    return passes


def get_transactions(
    resident_id: str,
    page: int = 1,
    page_size: int = 20,
) -> TransactionListResponse:
    """Get paginated scan/transaction history for a resident."""
    db = get_db()

    # Fetch all logs for this resident (no order_by to avoid composite index requirement)
    all_logs_raw = (
        db.collection("scan_logs")
        .where("resident_id", "==", resident_id)
        .get()
    )

    # Sort client-side by timestamp descending
    all_logs = sorted(
        all_logs_raw,
        key=lambda d: d.to_dict().get("timestamp", datetime.min.replace(tzinfo=timezone.utc)),
        reverse=True,
    )
    total = len(all_logs)

    # Paginate
    offset = (page - 1) * page_size
    page_logs = all_logs[offset: offset + page_size]

    # Cache site names to avoid repeated lookups
    site_cache = {}
    transactions = []
    for doc in page_logs:
        data = doc.to_dict()

        sid = data.get("site_id")
        site_name = None
        if sid:
            if sid not in site_cache:
                site_doc = db.collection("sites").document(sid).get()
                site_cache[sid] = site_doc.to_dict().get("name") if site_doc.exists else None
            site_name = site_cache[sid]

        transactions.append(TransactionRecord(
            id=doc.id,
            meal_type=data.get("meal_type", ""),
            site_id=sid or "",
            site_name=site_name,
            status=data.get("status", ""),
            block_reason=data.get("block_reason"),
            is_guest_pass=data.get("is_guest_pass", False),
            timestamp=data.get("timestamp", datetime.now(timezone.utc)),
        ))

    return TransactionListResponse(
        transactions=transactions,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + page_size) < total,
    )


# ── Admin Operations ──

def list_residents(
    page: int = 1,
    page_size: int = 20,
    status_filter: Optional[str] = None,
    site_filter: Optional[str] = None,
    search: Optional[str] = None,
) -> ResidentListResponse:
    """List all residents with optional filters (admin view)."""
    db = get_db()

    query = db.collection("residents")

    if status_filter:
        query = query.where("status", "==", status_filter)

    if site_filter:
        query = query.where("site_id", "==", site_filter)

    all_docs = query.get()

    # Client-side search filter (Firestore doesn't support LIKE queries)
    if search:
        search_lower = search.lower()
        all_docs = [
            d for d in all_docs
            if search_lower in d.to_dict().get("name", "").lower()
            or search_lower in d.to_dict().get("email", "").lower()
        ]

    total = len(all_docs)
    offset = (page - 1) * page_size
    page_docs = all_docs[offset: offset + page_size]

    residents = [_build_resident_profile(doc.id, doc.to_dict(), db) for doc in page_docs]

    return ResidentListResponse(
        residents=residents,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + page_size) < total,
    )


def get_residents_by_site(site_id: str) -> List[ResidentProfile]:
    """Get all residents assigned to a specific site."""
    db = get_db()
    docs = db.collection("residents").where("site_id", "==", site_id).get()
    return [_build_resident_profile(doc.id, doc.to_dict(), db) for doc in docs]


def create_resident(
    name: str,
    email: str,
    phone: Optional[str],
    room_number: str,
    site_id: str,
    password: Optional[str] = None,
) -> ResidentProfile:
    """
    Add a new resident (admin action).
    Creates Firebase Auth account so user can login.
    """
    db = get_db()
    now = datetime.now(timezone.utc)

    # Create Firebase user
    try:
        firebase_uid = create_firebase_user_for_invite(email, name, password)
    except ValueError as e:
        logger.warning(f"Could not create Firebase user for {email}: {e}")
        firebase_uid = None

    doc_id = f"res_{uuid.uuid4().hex[:12]}"
    doc_ref = db.collection("residents").document(doc_id)

    doc_data = {
        "name": name,
        "email": email,
        "phone": phone,
        "room_number": room_number,
        "site_id": site_id,
        "balance": 0,
        "status": "ACTIVE",
        "firebase_uid": firebase_uid,
        "allowed_meals": [],
        "plan_id": None,
        "created_at": now,
    }
    doc_ref.set(doc_data)

    return _build_resident_profile(doc_id, doc_data, db)


def update_resident(resident_id: str, updates: dict) -> Optional[ResidentProfile]:
    """Update a resident's profile (partial update)."""
    db = get_db()
    doc_ref = db.collection("residents").document(resident_id)
    doc = doc_ref.get()

    if not doc.exists:
        return None

    # Filter out None values
    clean_updates = {k: v for k, v in updates.items() if v is not None}
    if clean_updates:
        doc_ref.update(clean_updates)

    return get_profile(resident_id)


def delete_resident(resident_id: str) -> bool:
    """
    Soft-delete a resident — sets status to INACTIVE and invalidates QR.
    Does NOT actually delete the document (for audit trail).
    """
    db = get_db()
    doc_ref = db.collection("residents").document(resident_id)
    doc = doc_ref.get()

    if not doc.exists:
        return False

    doc_ref.update({
        "status": "INACTIVE",
        "qr_signed_payload": None,
        "deactivated_at": datetime.now(timezone.utc),
    })
    return True


def bulk_import_residents(residents_data: list) -> dict:
    """
    Bulk import residents from a list of dicts (parsed from CSV/Excel).

    Returns: {"created": int, "errors": list}
    """
    db = get_db()
    batch = db.batch()
    created = 0
    errors = []
    now = datetime.now(timezone.utc)

    for i, row in enumerate(residents_data):
        try:
            doc_id = f"res_{uuid.uuid4().hex[:12]}"
            doc_ref = db.collection("residents").document(doc_id)

            # Try to create Firebase user for each
            firebase_uid = None
            try:
                firebase_uid = create_firebase_user_for_invite(
                    row.get("email", ""),
                    row.get("name", ""),
                )
            except Exception:
                pass

            batch.set(doc_ref, {
                "name": row.get("name", ""),
                "email": row.get("email", ""),
                "phone": row.get("phone", ""),
                "room_number": row.get("room_number", ""),
                "site_id": row.get("site_id", ""),
                "balance": 0,
                "status": "ACTIVE",
                "firebase_uid": firebase_uid,
                "allowed_meals": [],
                "plan_id": None,
                "created_at": now,
            })
            created += 1
        except Exception as e:
            errors.append({"row": i + 1, "error": str(e)})

    if created > 0:
        batch.commit()

    return {"created": created, "errors": errors}
