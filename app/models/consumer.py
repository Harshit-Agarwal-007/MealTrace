"""Global resident storefront configuration (all sites)."""

from typing import Optional

from pydantic import BaseModel, Field


class ConsumerConfigResponse(BaseModel):
    """Document app_config/consumer — controls defaults for every site."""

    plans_globally_enabled: bool = True
    guest_pass_globally_enabled: bool = True
    default_guest_pass_price_inr: int = 100


class ConsumerConfigUpdateRequest(BaseModel):
    plans_globally_enabled: Optional[bool] = None
    guest_pass_globally_enabled: Optional[bool] = None
    default_guest_pass_price_inr: Optional[int] = Field(default=None, ge=1, le=50000)
