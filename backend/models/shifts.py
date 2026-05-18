from datetime import datetime, timezone
from typing import List, Optional
import uuid

from pydantic import BaseModel, Field, validator

from config import DATE_RE


class Shift(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    shift_type: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ShiftCreate(BaseModel):
    date: str
    shift_type: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    note: Optional[str] = None

    @validator('date')
    def validate_date(cls, v):
        if not DATE_RE.match(v):
            raise ValueError(f"Formato de data inválido: {v}. Use YYYY-MM-DD")
        return v


class ShiftUpdate(BaseModel):
    shift_type: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    note: Optional[str] = None


class BulkShiftItem(BaseModel):
    date: str
    shift_type: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None

    @validator('date')
    def validate_date(cls, v):
        if not DATE_RE.match(v):
            raise ValueError(f"Formato de data inválido: {v}. Use YYYY-MM-DD")
        return v


class BulkShiftsRequest(BaseModel):
    shifts: List[BulkShiftItem]
