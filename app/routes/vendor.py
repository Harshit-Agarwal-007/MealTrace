# app/routes/vendor.py
"""
Vendor-facing endpoints (for the scanner app).

GET  /vendor/profile         — Vendor's own profile
GET  /vendor/assigned-sites  — Sites assigned to this vendor (for site picker)
"""

from fastapi import APIRouter, Depends, HTTPException

from app.models.vendor import VendorProfile
from app.middleware.auth import require_vendor
from app.services.vendor_service import (
    get_vendor_self_profile,
    get_vendor_assigned_sites,
    vendor_search_residents,
)

router = APIRouter(prefix="/vendor", tags=["Vendor"])


@router.get("/profile", response_model=VendorProfile)
async def vendor_profile(current_user: dict = Depends(require_vendor)):
    """
    Get the currently authenticated vendor's profile.
    Used by the scanner app to display vendor info and assigned sites.
    """
    user_id = current_user["sub"]
    profile = get_vendor_self_profile(user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Vendor profile not found")
    return profile


@router.get("/assigned-sites")
async def vendor_assigned_sites(current_user: dict = Depends(require_vendor)):
    """
    Get the sites assigned to this vendor.
    Returns full site info including meal windows for the scanner app's site picker.
    """
    user_id = current_user["sub"]
    sites = get_vendor_assigned_sites(user_id)
    return {"sites": sites, "count": len(sites)}


@router.get("/search-user")
async def vendor_search_user(
    query: str,
    current_user: dict = Depends(require_vendor),
):
    """
    Search for a resident by name, phone, or room number.
    Returns basic info (Name, Room, Dietary Pref) to allow the vendor
    to grab the resident's ID and perform a manual log if they forgot their phone.
    """
    if len(query) < 3:
        raise HTTPException(status_code=400, detail="Search query must be at least 3 characters")
        
    user_id = current_user["sub"]
    results = vendor_search_residents(user_id, query)
    return {"results": results, "count": len(results)}
