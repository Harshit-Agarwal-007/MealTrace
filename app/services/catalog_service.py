"""
Resident-facing catalog: plans and guest pass rules per site + global config.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from app.database import get_db
from app.models.payment import PlanInfo
from app.models.resident import ResidentCatalogResponse, ResidentGuestPassCatalog


def _consumer_defaults() -> Dict[str, Any]:
    return {
        "plans_globally_enabled": True,
        "guest_pass_globally_enabled": True,
        "default_guest_pass_price_inr": 100,
    }


def get_consumer_config() -> Dict[str, Any]:
    """Load global storefront toggles from Firestore (defaults if missing)."""
    db = get_db()
    doc = db.collection("app_config").document("consumer").get()
    base = _consumer_defaults()
    if not doc.exists:
        return base
    merged = {**base, **(doc.to_dict() or {})}
    return merged


def update_consumer_config(updates: Dict[str, Any]) -> Dict[str, Any]:
    """Merge updates into app_config/consumer."""
    db = get_db()
    ref = db.collection("app_config").document("consumer")
    clean = {k: v for k, v in updates.items() if v is not None}
    if not clean:
        return get_consumer_config()
    snap = ref.get()
    if snap.exists:
        ref.update(clean)
    else:
        ref.set({**_consumer_defaults(), **clean})
    return get_consumer_config()


def _plan_from_doc(plan_id: str, data: dict) -> PlanInfo:
    return PlanInfo(
        id=plan_id,
        name=data.get("name", ""),
        meals_per_day=data.get("meals_per_day", 1),
        meal_count=data.get("meal_count", 0),
        duration_days=data.get("duration_days", 30),
        price=data.get("price", 0),
        description=data.get("description"),
        is_active=data.get("is_active", True),
        excluded_site_ids=list(data.get("excluded_site_ids") or []),
    )


def _site_commerce(site_data: Optional[dict]) -> Tuple[bool, bool, Optional[int], List[str]]:
    """Returns (plans_enabled, guest_pass_enabled, guest_price_override_inr, hidden_plan_ids)."""
    if not site_data:
        return True, True, None, []
    return (
        site_data.get("resident_plans_enabled", True),
        site_data.get("resident_guest_pass_enabled", True),
        site_data.get("guest_pass_price_inr"),
        list(site_data.get("hidden_plan_ids") or []),
    )


def resident_catalog(resident_id: str) -> Optional[ResidentCatalogResponse]:
    """
    Plans visible to this resident and guest-pass availability/price.
    """
    db = get_db()
    consumer = get_consumer_config()
    res_doc = db.collection("residents").document(resident_id).get()
    if not res_doc.exists:
        return None

    res = res_doc.to_dict() or {}
    site_id = res.get("site_id") or ""

    site_doc = db.collection("sites").document(site_id).get() if site_id else None
    site_data = site_doc.to_dict() if site_doc and site_doc.exists else None

    plans_globally = bool(consumer.get("plans_globally_enabled", True))
    guest_globally = bool(consumer.get("guest_pass_globally_enabled", True))
    default_guest_inr = int(consumer.get("default_guest_pass_price_inr") or 100)

    site_plans_on, site_guest_on, guest_price_override, hidden_ids = _site_commerce(site_data)
    hidden = set(hidden_ids)

    plans_out: List[PlanInfo] = []
    plans_purchase_enabled = plans_globally and site_plans_on

    if plans_purchase_enabled:
        for doc in db.collection("plans").get():
            data = doc.to_dict() or {}
            if not data.get("is_active", True):
                continue
            if doc.id in hidden:
                continue
            excl = list(data.get("excluded_site_ids") or [])
            if site_id and site_id in excl:
                continue
            plans_out.append(_plan_from_doc(doc.id, data))

    guest_site_ok = site_guest_on if site_data else True
    guest_enabled = bool(guest_globally and guest_site_ok)
    price_inr = max(1, int(default_guest_inr))
    if guest_price_override is not None:
        try:
            price_inr = max(1, int(guest_price_override))
        except (TypeError, ValueError):
            price_inr = max(1, int(default_guest_inr))

    return ResidentCatalogResponse(
        plans_purchase_enabled=plans_purchase_enabled,
        plans=plans_out,
        guest_pass=ResidentGuestPassCatalog(enabled=guest_enabled, price_inr=price_inr),
    )


def assert_plan_purchasable(resident_id: str, plan_id: str) -> None:
    """Raise ValueError if this resident cannot buy the plan."""
    cat = resident_catalog(resident_id)
    if cat is None:
        raise ValueError("Resident not found")
    if not cat.plans_purchase_enabled:
        raise ValueError("Plan purchases are not available for your site right now")
    allowed = {p.id for p in cat.plans}
    if plan_id not in allowed:
        raise ValueError("This plan is not available for your site")


def guest_pass_price_inr_for_resident(resident_id: str) -> int:
    cat = resident_catalog(resident_id)
    if cat is None:
        raise ValueError("Resident not found")
    return int(cat.guest_pass.price_inr)


def assert_guest_pass_purchasable(resident_id: str) -> None:
    cat = resident_catalog(resident_id)
    if cat is None:
        raise ValueError("Resident not found")
    if not cat.guest_pass.enabled:
        raise ValueError("Guest passes are not available for your site right now")
