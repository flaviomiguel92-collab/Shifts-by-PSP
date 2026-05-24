from datetime import datetime, timezone
from typing import List, Optional
import uuid

from pydantic import BaseModel, Field, field_validator

_MAX_PHOTOS = 5
_MAX_PHOTO_CHARS = 3_000_000  # ~2 MB raw before base64 encoding


class PersonInOccurrence(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: str
    full_name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    tax_id: Optional[str] = None
    document_type: str
    document_number: Optional[str] = None
    document_issue_date: Optional[str] = None
    document_expiry_date: Optional[str] = None
    photos: List[str] = []
    notes: Optional[str] = None


class Occurrence(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    time: Optional[str] = None
    location: str
    description: str
    classification: str
    status: str = "rascunho"
    photos: List[str] = []
    suspects: List[PersonInOccurrence] = []
    witnesses: List[PersonInOccurrence] = []
    victims: List[PersonInOccurrence] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OccurrenceCreate(BaseModel):
    date: str
    time: Optional[str] = Field(default=None, max_length=10)
    location: str = Field(max_length=300)
    description: str = Field(max_length=5000)
    classification: str = Field(max_length=100)
    status: Optional[str] = Field(default="rascunho", max_length=50)
    photos: Optional[List[str]] = []

    @field_validator('photos')
    @classmethod
    def validate_photos(cls, v):
        if v and len(v) > _MAX_PHOTOS:
            raise ValueError(f"Máximo de {_MAX_PHOTOS} fotos permitidas")
        if v:
            for photo in v:
                if len(photo) > _MAX_PHOTO_CHARS:
                    raise ValueError("Cada foto não pode exceder 2 MB")
        return v


class OccurrenceUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    classification: Optional[str] = None
    status: Optional[str] = None
    photos: Optional[List[str]] = None


class PersonCreate(BaseModel):
    role: str = Field(max_length=50)
    full_name: str = Field(max_length=200)
    address: Optional[str] = Field(default=None, max_length=400)
    phone: Optional[str] = Field(default=None, max_length=30)
    email: Optional[str] = Field(default=None, max_length=200)
    tax_id: Optional[str] = Field(default=None, max_length=30)
    document_type: str = Field(max_length=50)
    document_number: Optional[str] = Field(default=None, max_length=50)
    document_issue_date: Optional[str] = Field(default=None, max_length=10)
    document_expiry_date: Optional[str] = Field(default=None, max_length=10)
    photos: Optional[List[str]] = []
    notes: Optional[str] = Field(default=None, max_length=1000)

    @field_validator('photos')
    @classmethod
    def validate_photos(cls, v):
        if v and len(v) > _MAX_PHOTOS:
            raise ValueError(f"Máximo de {_MAX_PHOTOS} fotos permitidas")
        if v:
            for photo in v:
                if len(photo) > _MAX_PHOTO_CHARS:
                    raise ValueError("Cada foto não pode exceder 2 MB")
        return v
