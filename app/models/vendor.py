# app/models/vendor.py
"""Vendor management schemas."""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class VendorProfile(BaseModel):
    """Vendor user profile."""
    id: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    role: str = "VENDOR"
    assigned_site_ids: List[str] = []
    assigned_site_names: List[str] = []
    status: str = "ACTIVE"
    created_at: Optional[datetime] = None


class CreateVendorRequest(BaseModel):
    """Create a new vendor (admin action)."""
    name: str
    email: EmailStr
    password: str  # Initial password (vendor can change later)
    phone: Optional[str] = None
    assigned_site_ids: List[str] = []


class UpdateVendorRequest(BaseModel):
    """Update vendor profile (partial)."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    assigned_site_ids: Optional[List[str]] = None
    status: Optional[str] = None


class VendorListResponse(BaseModel):
    """Paginated vendor list."""
    vendors: List[VendorProfile]
    total: int
    page: int
    page_size: int
    has_more: bool
