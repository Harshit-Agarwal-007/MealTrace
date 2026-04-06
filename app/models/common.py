# app/models/common.py
"""Shared response models."""

from pydantic import BaseModel
from typing import Optional


class APIResponse(BaseModel):
    """Standard API response wrapper."""
    status: str  # "success" or "error"
    message: str
    data: Optional[dict] = None


class ErrorResponse(BaseModel):
    """Standard error response."""
    status: str = "error"
    message: str
    error_code: Optional[str] = None
    detail: Optional[str] = None
