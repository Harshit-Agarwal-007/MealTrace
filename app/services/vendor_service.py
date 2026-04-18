# app/services/vendor_service.py
"""
Vendor management service — CRUD operations for vendor users.

Vendors are stored in the `admin_users` collection with role=VENDOR.
Each vendor has a Firebase Auth account for login.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, List

from app.database import get_db
from app.models.vendor import VendorProfile, VendorListResponse
from app.services.auth_service import create_firebase_user_for_invite

logger = logging.getLogger(__name__)


def _build_vendor_profile(doc_id: str, data: dict, db=None) -> VendorProfile:
    """Build a VendorProfile from Firestore document data."""
    assigned_site_ids = data.get("assigned_site_ids", [])
    assigned_site_names = []

    if db and assigned_site_ids:
        for sid in assigned_site_ids:
            site_doc = db.collection("sites").document(sid).get()
            if site_doc.exists:
                assigned_site_names.append(site_doc.to_dict().get("name", sid))
            else:
                assigned_site_names.append(sid)

    return VendorProfile(
        id=doc_id,
        name=data.get("name", ""),
        email=data.get("email", ""),
        phone=data.get("phone"),
        role="VENDOR",
        assigned_site_ids=assigned_site_ids,
        assigned_site_names=assigned_site_names,
        status=data.get("status", "ACTIVE"),
        created_at=data.get("created_at"),
    )


def create_vendor(
    name: str,
    email: str,
    password: str,
    phone: Optional[str] = None,
    assigned_site_ids: List[str] = None,
) -> VendorProfile:
    """
    Create a new vendor:
    1. Create Firebase Auth account
    2. Create admin_users doc with role=VENDOR
    3. Optionally assign to sites
    """
    db = get_db()
    now = datetime.now(timezone.utc)

    # Check if email already exists
    existing = db.collection("admin_users").where("email", "==", email).limit(1).get()
    if len(list(existing)) > 0:
        raise ValueError("A vendor with this email already exists")

    existing_res = db.collection("residents").where("email", "==", email).limit(1).get()
    if len(list(existing_res)) > 0:
        raise ValueError("This email is registered as a resident")

    # Create Firebase Auth user
    firebase_uid = create_firebase_user_for_invite(email, name, password)

    # Create vendor doc in admin_users
    doc_id = f"vendor_{uuid.uuid4().hex[:8]}"
    doc_ref = db.collection("admin_users").document(doc_id)
    doc_data = {
        "name": name,
        "email": email,
        "phone": phone,
        "role": "VENDOR",
        "firebase_uid": firebase_uid,
        "assigned_site_ids": assigned_site_ids or [],
        "status": "ACTIVE",
        "created_at": now,
    }
    doc_ref.set(doc_data)

    # Also add vendor to each assigned site's vendor_staff_ids
    if assigned_site_ids:
        for site_id in assigned_site_ids:
            site_ref = db.collection("sites").document(site_id)
            site_doc = site_ref.get()
            if site_doc.exists:
                current_ids = site_doc.to_dict().get("vendor_staff_ids", [])
                if doc_id not in current_ids:
                    current_ids.append(doc_id)
                    site_ref.update({"vendor_staff_ids": current_ids})

    logger.info(f"Vendor created: {doc_id} ({email})")
    return _build_vendor_profile(doc_id, doc_data, db)


def list_vendors(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    site_id: Optional[str] = None,
) -> VendorListResponse:
    """List vendors with optional search and site filter."""
    db = get_db()

    # Get all vendor docs from admin_users
    all_docs = list(
        db.collection("admin_users")
        .where("role", "==", "VENDOR")
        .get()
    )

    # Client-side search
    if search:
        search_lower = search.lower()
        all_docs = [
            d for d in all_docs
            if search_lower in d.to_dict().get("name", "").lower()
            or search_lower in d.to_dict().get("email", "").lower()
        ]

    # Filter by assigned site
    if site_id:
        all_docs = [
            d for d in all_docs
            if site_id in d.to_dict().get("assigned_site_ids", [])
        ]

    total = len(all_docs)
    offset = (page - 1) * page_size
    page_docs = all_docs[offset: offset + page_size]

    vendors = [_build_vendor_profile(doc.id, doc.to_dict(), db) for doc in page_docs]

    return VendorListResponse(
        vendors=vendors,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(offset + page_size) < total,
    )


def get_vendor(vendor_id: str) -> Optional[VendorProfile]:
    """Get a single vendor by ID."""
    db = get_db()
    doc = db.collection("admin_users").document(vendor_id).get()
    if not doc.exists:
        return None

    data = doc.to_dict()
    if data.get("role") != "VENDOR":
        return None

    return _build_vendor_profile(doc.id, data, db)


def update_vendor(vendor_id: str, updates: dict) -> Optional[VendorProfile]:
    """Update a vendor's profile (partial update)."""
    db = get_db()
    doc_ref = db.collection("admin_users").document(vendor_id)
    doc = doc_ref.get()

    if not doc.exists or doc.to_dict().get("role") != "VENDOR":
        return None

    old_data = doc.to_dict()
    clean_updates = {k: v for k, v in updates.items() if v is not None}

    # Handle site assignment changes
    if "assigned_site_ids" in clean_updates:
        old_sites = set(old_data.get("assigned_site_ids", []))
        new_sites = set(clean_updates["assigned_site_ids"])

        # Remove from old sites
        for sid in old_sites - new_sites:
            site_ref = db.collection("sites").document(sid)
            site_doc = site_ref.get()
            if site_doc.exists:
                current_ids = site_doc.to_dict().get("vendor_staff_ids", [])
                if vendor_id in current_ids:
                    current_ids.remove(vendor_id)
                    site_ref.update({"vendor_staff_ids": current_ids})

        # Add to new sites
        for sid in new_sites - old_sites:
            site_ref = db.collection("sites").document(sid)
            site_doc = site_ref.get()
            if site_doc.exists:
                current_ids = site_doc.to_dict().get("vendor_staff_ids", [])
                if vendor_id not in current_ids:
                    current_ids.append(vendor_id)
                    site_ref.update({"vendor_staff_ids": current_ids})

    if clean_updates:
        doc_ref.update(clean_updates)

    return get_vendor(vendor_id)


def delete_vendor(vendor_id: str) -> bool:
    """
    Soft-delete a vendor — sets status to INACTIVE.
    Removes from all assigned sites.
    """
    db = get_db()
    doc_ref = db.collection("admin_users").document(vendor_id)
    doc = doc_ref.get()

    if not doc.exists or doc.to_dict().get("role") != "VENDOR":
        return False

    data = doc.to_dict()

    # Remove from all sites
    for sid in data.get("assigned_site_ids", []):
        site_ref = db.collection("sites").document(sid)
        site_doc = site_ref.get()
        if site_doc.exists:
            current_ids = site_doc.to_dict().get("vendor_staff_ids", [])
            if vendor_id in current_ids:
                current_ids.remove(vendor_id)
                site_ref.update({"vendor_staff_ids": current_ids})

    doc_ref.update({
        "status": "INACTIVE",
        "assigned_site_ids": [],
        "deactivated_at": datetime.now(timezone.utc),
    })

    logger.info(f"Vendor deactivated: {vendor_id}")
    return True


def get_vendor_self_profile(vendor_id: str) -> Optional[VendorProfile]:
    """Get the vendor's own profile using their JWT user_id."""
    return get_vendor(vendor_id)


def get_vendor_assigned_sites(vendor_id: str) -> list:
    """
    Get the sites assigned to a vendor (for scanner app site picker).
    Returns full site info including meal windows.
    """
    db = get_db()
    doc = db.collection("admin_users").document(vendor_id).get()
    if not doc.exists or doc.to_dict().get("role") != "VENDOR":
        return []

    assigned_ids = doc.to_dict().get("assigned_site_ids", [])
    sites = []
    for sid in assigned_ids:
        site_doc = db.collection("sites").document(sid).get()
        if site_doc.exists:
            sdata = site_doc.to_dict()
            sites.append({
                "id": sid,
                "name": sdata.get("name", ""),
                "meal_windows": sdata.get("meal_windows", {}),
                "is_active": sdata.get("is_active", True),
            })

    return sites


def vendor_search_residents(vendor_id: str, query: str) -> list:
    """
    Search for a resident by name or phone/room_number for manual entry.
    Returns basic info (id, name, dietary preference) so vendor can log manual scan.
    """
    db = get_db()
    
    vendor_doc = db.collection("admin_users").document(vendor_id).get()
    if not vendor_doc.exists:
        return []
    assigned_site_ids = vendor_doc.to_dict().get("assigned_site_ids", [])
    if not assigned_site_ids:
        return []

    # Firestore lacks OR/substring search; do client-side text filter
    # on active residents scoped to vendor-assigned sites.
    docs = db.collection("residents").where("status", "==", "ACTIVE").get()
    
    q_lower = query.lower()
    results = []
    
    for doc in docs:
        data = doc.to_dict()
        n = data.get("name", "").lower()
        r = data.get("room_number", "").lower()
        p = data.get("phone", "")
        
        if data.get("site_id") not in assigned_site_ids:
            continue

        if q_lower in n or q_lower in r or q_lower in p:
            results.append({
                "id": doc.id,
                "name": data.get("name"),
                "room_number": data.get("room_number"),
                "dietary_preference": data.get("dietary_preference", "VEG"),
                "site_id": data.get("site_id"),
                "plan_name": data.get("plan_name"),
            })
            
    # Return at most 10 results
    return results[:10]
