from datetime import datetime, timezone
from typing import List, Optional
import uuid

from pydantic import BaseModel, Field


class CustomCycle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    pattern: List[str]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CustomCycleCreate(BaseModel):
    name: str
    pattern: List[str]


class CustomCycleUpdate(BaseModel):
    name: Optional[str] = None
    pattern: Optional[List[str]] = None
