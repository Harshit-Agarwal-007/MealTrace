# app/models/site.py
"""Site and meal window schemas."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


class MealWindow(BaseModel):
    """Time range for a single meal type."""
    start: str  # "HH:MM" 24h format
    end: str    # "HH:MM" 24h format


class SiteInfo(BaseModel):
    """PG site definition."""
    id: str
    name: str
    meal_windows: Dict[str, MealWindow]  # {"breakfast": {...}, "lunch": {...}, "dinner": {...}}
    vendor_staff_ids: List[str] = []
    is_active: bool = True
    created_at: Optional[datetime] = None
    # Resident storefront (per site; combined with app_config/consumer for globals)
    resident_plans_enabled: bool = True
    resident_guest_pass_enabled: bool = True
    guest_pass_price_inr: Optional[int] = None  # None → use global default_guest_pass_price_inr
    hidden_plan_ids: List[str] = Field(default_factory=list)


class CreateSiteRequest(BaseModel):
    """Create a new PG site."""
    name: str
    meal_windows: Dict[str, MealWindow]
    vendor_staff_ids: List[str] = []


class UpdateSiteRequest(BaseModel):
    """Update site config (partial)."""
    name: Optional[str] = None
    meal_windows: Optional[Dict[str, MealWindow]] = None
    vendor_staff_ids: Optional[List[str]] = None
    is_active: Optional[bool] = None
    resident_plans_enabled: Optional[bool] = None
    resident_guest_pass_enabled: Optional[bool] = None
    guest_pass_price_inr: Optional[int] = None
    hidden_plan_ids: Optional[List[str]] = None


class SiteListResponse(BaseModel):
    """List of all sites."""
    sites: List[SiteInfo]
    total: int
