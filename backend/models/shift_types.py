from datetime import datetime, timezone
from typing import Optional
import uuid

from pydantic import BaseModel, Field


class CustomShiftType(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    short_name: str
    color: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_working: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CustomShiftTypeCreate(BaseModel):
    name: str
    short_name: Optional[str] = None
    color: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_working: bool = True
    order: int = 0


class CustomShiftTypeUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    color: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_working: Optional[bool] = None
    order: Optional[int] = None
