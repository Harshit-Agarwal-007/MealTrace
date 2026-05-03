# app/services/site_service.py
"""
Site service — PG site management and meal window configuration.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List

from app.database import get_db
from app.models.site import SiteInfo, SiteListResponse

logger = logging.getLogger(__name__)


def _site_info_from_doc(doc_id: str, data: dict) -> SiteInfo:
    meal_windows = {}
    for meal_type, window in (data.get("meal_windows") or {}).items():
        meal_windows[meal_type] = {
            "start": window.get("start", ""),
            "end": window.get("end", ""),
        }
    gp = data.get("guest_pass_price_inr")
    if gp is not None:
        try:
            gp = int(gp)
        except (TypeError, ValueError):
            gp = None
    gvh = data.get("guest_pass_validity_hours")
    if gvh is not None:
        try:
            gvh = int(gvh)
        except (TypeError, ValueError):
            gvh = None
    return SiteInfo(
        id=doc_id,
        name=data.get("name", ""),
        meal_windows=meal_windows,
        vendor_staff_ids=data.get("vendor_staff_ids", []),
        is_active=data.get("is_active", True),
        created_at=data.get("created_at"),
        resident_plans_enabled=data.get("resident_plans_enabled", True),
        resident_guest_pass_enabled=data.get("resident_guest_pass_enabled", True),
        guest_pass_price_inr=gp,
        guest_pass_validity_hours=gvh,
        hidden_plan_ids=list(data.get("hidden_plan_ids") or []),
    )


def list_sites() -> SiteListResponse:
    """List all sites with meal window config."""
    db = get_db()
    docs = db.collection("sites").get()

    sites = []
    for doc in docs:
        data = doc.to_dict() or {}
        sites.append(_site_info_from_doc(doc.id, data))

    return SiteListResponse(sites=sites, total=len(sites))


def get_site(site_id: str) -> Optional[SiteInfo]:
    """Get a single site by ID."""
    db = get_db()
    doc = db.collection("sites").document(site_id).get()
    if not doc.exists:
        return None

    data = doc.to_dict() or {}
    return _site_info_from_doc(doc.id, data)


def create_site(name: str, meal_windows: dict, vendor_staff_ids: list = None) -> SiteInfo:
    """Create a new PG site."""
    db = get_db()
    import uuid
    site_id = f"site_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc)

    # Convert Pydantic MealWindow objects to plain dicts for Firestore
    windows_dict = {}
    for meal_type, window in meal_windows.items():
        if hasattr(window, "dict"):
            windows_dict[meal_type] = window.dict()
        elif isinstance(window, dict):
            windows_dict[meal_type] = window
        else:
            windows_dict[meal_type] = {"start": str(window.start), "end": str(window.end)}

    doc_data = {
        "name": name,
        "meal_windows": windows_dict,
        "vendor_staff_ids": vendor_staff_ids or [],
        "is_active": True,
        "created_at": now,
        "resident_plans_enabled": True,
        "resident_guest_pass_enabled": True,
        "guest_pass_price_inr": None,
        "hidden_plan_ids": [],
    }

    db.collection("sites").document(site_id).set(doc_data)

    return get_site(site_id)


def update_site(site_id: str, updates: dict) -> Optional[SiteInfo]:
    """Update site config (partial update)."""
    db = get_db()
    doc_ref = db.collection("sites").document(site_id)
    doc = doc_ref.get()

    if not doc.exists:
        return None

    # Convert meal_windows if present
    if "meal_windows" in updates and updates["meal_windows"] is not None:
        windows_dict = {}
        for meal_type, window in updates["meal_windows"].items():
            if hasattr(window, "dict"):
                windows_dict[meal_type] = window.dict()
            elif isinstance(window, dict):
                windows_dict[meal_type] = window
            else:
                windows_dict[meal_type] = {"start": str(window.start), "end": str(window.end)}
        updates["meal_windows"] = windows_dict

    clean_updates = {k: v for k, v in updates.items() if v is not None}
    if clean_updates:
        doc_ref.update(clean_updates)

    return get_site(site_id)
