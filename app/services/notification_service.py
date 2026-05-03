"""
In-app notifications stored in Firestore (top-level `notifications` collection).

Each document: resident_id, title, message, type, read, created_at.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from app.database import get_db

logger = logging.getLogger(__name__)

NOTIFICATIONS_COLLECTION = "notifications"
_BATCH_SIZE = 400


def _as_utc_datetime(val) -> datetime:
    if val is None:
        return datetime.now(timezone.utc)
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val
    if hasattr(val, "timestamp"):
        return datetime.fromtimestamp(val.timestamp(), tz=timezone.utc)
    return datetime.now(timezone.utc)


def create_notification(
    resident_id: str,
    title: str,
    message: str,
    notification_type: str,
) -> str:
    """Insert one notification row for a resident. Returns new document id."""
    db = get_db()
    now = datetime.now(timezone.utc)
    doc_ref = db.collection(NOTIFICATIONS_COLLECTION).document()
    doc_ref.set({
        "resident_id": resident_id,
        "title": title,
        "message": message,
        "type": notification_type,
        "read": False,
        "created_at": now,
    })
    return doc_ref.id


def list_resident_notifications(
    resident_id: str,
    limit: int = 50,
) -> List[dict]:
    """
    Return notifications for a resident, newest first.
    Uses client-side sort to avoid composite index on resident_id + created_at.
    """
    db = get_db()
    docs = (
        db.collection(NOTIFICATIONS_COLLECTION)
        .where("resident_id", "==", resident_id)
        .limit(max(limit * 3, 100))
        .get()
    )
    rows = []
    for d in docs:
        data = d.to_dict()
        rows.append({
            "id": d.id,
            "title": data.get("title", ""),
            "message": data.get("message", ""),
            "type": data.get("type", "GENERIC"),
            "read": bool(data.get("read", False)),
            "created_at": _as_utc_datetime(data.get("created_at")),
        })
    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return rows[:limit]


def mark_resident_notification_read(resident_id: str, notification_id: str) -> bool:
    """Set read=true if the notification belongs to this resident."""
    db = get_db()
    ref = db.collection(NOTIFICATIONS_COLLECTION).document(notification_id)
    doc = ref.get()
    if not doc.exists:
        return False
    data = doc.to_dict()
    if data.get("resident_id") != resident_id:
        return False
    ref.update({"read": True})
    return True


def broadcast_in_app_notifications(
    resident_ids: List[str],
    title: str,
    message: str,
    notification_type: str = "ADMIN_BROADCAST",
) -> int:
    """
    Batch-write the same notification for many residents.
    Returns count of documents written.
    """
    if not resident_ids:
        return 0
    db = get_db()
    now = datetime.now(timezone.utc)
    written = 0
    batch = db.batch()
    n_in_batch = 0

    for rid in resident_ids:
        doc_ref = db.collection(NOTIFICATIONS_COLLECTION).document()
        batch.set(doc_ref, {
            "resident_id": rid,
            "title": title,
            "message": message,
            "type": notification_type,
            "read": False,
            "created_at": now,
        })
        n_in_batch += 1
        written += 1
        if n_in_batch >= _BATCH_SIZE:
            batch.commit()
            batch = db.batch()
            n_in_batch = 0

    if n_in_batch > 0:
        batch.commit()

    return written
