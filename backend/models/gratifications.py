from datetime import datetime, timezone
from typing import Optional
import uuid

from pydantic import BaseModel, Field, field_validator

from config import DATE_RE


class Gratification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    gratification_type: str
    value: float
    note: Optional[str] = None
    shift_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GratificationCreate(BaseModel):
    date: str
    gratification_type: str
    value: float = Field(ge=0, le=999_999.99)
    note: Optional[str] = None
    shift_id: Optional[str] = None

    @field_validator('date')
    @classmethod
    def validate_date(cls, v):
        if not DATE_RE.match(v):
            raise ValueError(f"Formato de data inválido: {v}. Use YYYY-MM-DD")
        return v


class GratificationUpdate(BaseModel):
    date: Optional[str] = None
    gratification_type: Optional[str] = None
    value: Optional[float] = None
    note: Optional[str] = None


class GratifiedCalendarEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    name: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    value: Optional[float] = None
    subtotal: Optional[float] = None
    discount_percent: Optional[float] = None
    is_holiday_or_weekend: Optional[bool] = None
    note: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class GratifiedCalendarEntryCreate(BaseModel):
    date: str
    name: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    value: Optional[float] = Field(default=None, ge=0, le=999_999.99)
    subtotal: Optional[float] = Field(default=None, ge=0, le=999_999.99)
    discount_percent: Optional[float] = Field(default=None, ge=0, le=100)
    is_holiday_or_weekend: Optional[bool] = None
    note: Optional[str] = None

    @field_validator('date')
    @classmethod
    def validate_date(cls, v):
        if not DATE_RE.match(v):
            raise ValueError(f"Formato de data inválido: {v}. Use YYYY-MM-DD")
        return v
