# app/routes/site.py
"""
Site endpoints.

GET        /sites            — List all sites with meal window config
POST       /sites            — Create new site (admin)
PATCH      /sites/:id        — Update site config (admin)
"""

from fastapi import APIRouter, Depends, HTTPException

from app.models.site import (
    SiteInfo,
    SiteListResponse,
    CreateSiteRequest,
    UpdateSiteRequest,
)
from app.middleware.auth import require_admin, require_vendor_or_admin
from app.services.site_service import (
    list_sites,
    get_site,
    create_site,
    update_site,
)

router = APIRouter(prefix="/sites", tags=["Sites"])


@router.get("", response_model=SiteListResponse)
async def get_sites(current_user: dict = Depends(require_vendor_or_admin)):
    """List all PG sites with meal window config."""
    return list_sites()


@router.get("/{site_id}", response_model=SiteInfo)
async def get_site_by_id(
    site_id: str,
    current_user: dict = Depends(require_vendor_or_admin),
):
    """Get a specific site's details."""
    site = get_site(site_id)
    if site is None:
        raise HTTPException(status_code=404, detail=f"Site {site_id} not found")
    return site


@router.post("", response_model=SiteInfo, status_code=201)
async def create_new_site(
    request: CreateSiteRequest,
    current_user: dict = Depends(require_admin),
):
    """Create a new PG site with meal window configuration."""
    return create_site(
        name=request.name,
        meal_windows=request.meal_windows,
        vendor_staff_ids=request.vendor_staff_ids,
    )


@router.patch("/{site_id}", response_model=SiteInfo)
async def update_existing_site(
    site_id: str,
    request: UpdateSiteRequest,
    current_user: dict = Depends(require_admin),
):
    """Update site configuration (name, meal windows, vendor staff, active status)."""
    result = update_site(site_id, request.model_dump())
    if result is None:
        raise HTTPException(status_code=404, detail=f"Site {site_id} not found")
    return result
