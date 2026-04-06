# app/services/resident_service.py
"""
Resident service — profile management, QR generation, transaction history.
"""

import logging
import io
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from app.database import get_db
from app.models.resident import (
    ResidentProfile,
    ResidentBalance,
    TransactionRecord,
    TransactionListResponse,
    QRCodeResponse,
    ResidentListResponse,
)
from app.utils.qr_gen import generate_qr_payload, generate_qr_image_base64

logger = logging.getLogger(__name__)


def get_profile(resident_id: str) -> Optional[ResidentProfile]:
    """Get a resident's full profile."""
    db = get_db()
    doc = db.collection("residents").document(resident_id).get()
    if not doc.exists:
        return None

    data = doc.to_dict()

    # Optionally fetch site name
    site_name = None
    site_id = data.get("site_id")
    if site_id:
        site_doc = db.collection("sites").document(site_id).get()
        if site_doc.exists:
            site_name = site_doc.to_dict().get("name")

    return ResidentProfile(
        id=doc.id,
        name=data.get("name", ""),
        email=data.get("email", ""),
        phone=data.get("phone"),
        room_number=data.get("room_number", ""),
        site_id=site_id or "",
        site_name=site_name,
        balance=data.get("balance", 0),
        status=data.get("status", "ACTIVE"),
        created_at=data.get("created_at"),
    )


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
        active_plan=data.get("active_plan"),
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

    residents = []
    for doc in page_docs:
        data = doc.to_dict()
        residents.append(ResidentProfile(
            id=doc.id,
            name=data.get("name", ""),
            email=data.get("email", ""),
            phone=data.get("phone"),
            room_number=data.get("room_number", ""),
            site_id=data.get("site_id", ""),
            balance=data.get("balance", 0),
            status=data.get("status", "ACTIVE"),
            created_at=data.get("created_at"),
        ))

    return ResidentListResponse(
        residents=residents,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + page_size) < total,
    )


def create_resident(
    name: str,
    email: str,
    phone: Optional[str],
    room_number: str,
    site_id: str,
) -> ResidentProfile:
    """Add a new resident."""
    db = get_db()
    now = datetime.now(timezone.utc)

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
        "created_at": now,
    }
    doc_ref.set(doc_data)

    return ResidentProfile(id=doc_id, **doc_data)


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
            batch.set(doc_ref, {
                "name": row.get("name", ""),
                "email": row.get("email", ""),
                "phone": row.get("phone", ""),
                "room_number": row.get("room_number", ""),
                "site_id": row.get("site_id", ""),
                "balance": 0,
                "status": "ACTIVE",
                "created_at": now,
            })
            created += 1
        except Exception as e:
            errors.append({"row": i + 1, "error": str(e)})

    if created > 0:
        batch.commit()

    return {"created": created, "errors": errors}
