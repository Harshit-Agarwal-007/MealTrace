# app/models/site.py
"""Site and meal window schemas."""

from pydantic import BaseModel
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


class SiteListResponse(BaseModel):
    """List of all sites."""
    sites: List[SiteInfo]
    total: int
