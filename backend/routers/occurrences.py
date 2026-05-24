import base64
import io
import logging
from datetime import datetime, timezone
from typing import List, Optional

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Request, Response

import db as _db
from auth.dependencies import get_current_user, require_header_auth
from config import limiter
from models.auth import User
from models.occurrences import (
    Occurrence,
    OccurrenceCreate,
    OccurrenceUpdate,
    PersonCreate,
    PersonInOccurrence,
    _MAX_PHOTOS,
    _MAX_PHOTO_CHARS,
)
from security import crypto

router = APIRouter()


def _strip_exif(photo_b64: str) -> str:
    """Remove EXIF/metadata from an image to prevent leaking GPS or device info.

    Uses Pillow when available. On any failure returns the original bytes
    unchanged so the upload never fails due to metadata stripping.
    """
    try:
        from PIL import Image  # lazy — Pillow may not be installed in tests

        raw = base64.b64decode(photo_b64)
        img = Image.open(io.BytesIO(raw))
        fmt = (img.format or "JPEG").upper()
        out = io.BytesIO()
        if fmt == "JPEG":
            img.save(out, format="JPEG", quality=92, exif=b"")
        else:
            img.save(out, format=fmt)
        return base64.b64encode(out.getvalue()).decode("ascii")
    except Exception as exc:
        logger.warning("EXIF strip failed — saving original: %s", exc)
        return photo_b64


def _decrypt_occurrence(occ: dict) -> dict:
    """Transparently decrypt PII in person arrays before returning.

    Pure pass-through when PII encryption is disabled. Tolerates legacy
    plaintext values.
    """
    if not occ:
        return occ
    for array_name in ("suspects", "witnesses", "victims"):
        people = occ.get(array_name)
        if people:
            occ[array_name] = [crypto.decrypt_person(p) for p in people]
    return occ


@router.post("/occurrences/reset")
@limiter.limit("2/minute")
async def reset_all_occurrences(request: Request, user: User = Depends(require_header_auth)):
    result = await _db.db.occurrences.delete_many({"user_id": user.user_id})
    return {"message": f"Reset: deleted {result.deleted_count} occurrences"}


@router.get("/occurrences", response_model=List[dict])
async def get_occurrences(
    response: Response,
    status: Optional[str] = None,
    classification: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    user: User = Depends(get_current_user),
):
    page = max(1, page)
    limit = min(max(1, limit), 100)
    skip = (page - 1) * limit

    query: dict = {"user_id": user.user_id}
    if status:
        query["status"] = status
    if classification:
        query["classification"] = classification

    total = await _db.db.occurrences.count_documents(query)
    occurrences = (
        await _db.db.occurrences.find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )

    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Limit"] = str(limit)
    response.headers["X-Total-Pages"] = str((total + limit - 1) // limit)

    return [_decrypt_occurrence(o) for o in occurrences]


@router.get("/occurrences/{occurrence_id}")
async def get_occurrence(occurrence_id: str, user: User = Depends(get_current_user)):
    occurrence = await _db.db.occurrences.find_one(
        {"id": occurrence_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not occurrence:
        raise HTTPException(status_code=404, detail="Occurrence not found")
    return _decrypt_occurrence(occurrence)


@router.post("/occurrences", response_model=dict)
async def create_occurrence(occ_data: OccurrenceCreate, user: User = Depends(get_current_user)):
    occurrence = Occurrence(
        user_id=user.user_id,
        date=occ_data.date,
        time=occ_data.time,
        location=occ_data.location,
        description=occ_data.description,
        classification=occ_data.classification,
        status=occ_data.status or "rascunho",
        photos=occ_data.photos or [],
    )
    await _db.db.occurrences.insert_one(occurrence.model_dump())
    return occurrence.model_dump()


@router.put("/occurrences/{occurrence_id}", response_model=dict)
async def update_occurrence(occurrence_id: str, occ_data: OccurrenceUpdate, user: User = Depends(get_current_user)):
    existing = await _db.db.occurrences.find_one({"id": occurrence_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Occurrence not found")
    update_data = {k: v for k, v in occ_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    if update_data:
        await _db.db.occurrences.update_one(
            {"id": occurrence_id, "user_id": user.user_id}, {"$set": update_data}
        )
    updated = await _db.db.occurrences.find_one(
        {"id": occurrence_id, "user_id": user.user_id}, {"_id": 0}
    )
    return updated


@router.delete("/occurrences/{occurrence_id}")
async def delete_occurrence(occurrence_id: str, user: User = Depends(get_current_user)):
    result = await _db.db.occurrences.delete_one({"id": occurrence_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Occurrence not found")
    return {"message": "Occurrence deleted successfully"}


@router.post("/occurrences/{occurrence_id}/persons", response_model=dict)
async def add_person_to_occurrence(
    occurrence_id: str, person_data: PersonCreate, user: User = Depends(get_current_user)
):
    existing = await _db.db.occurrences.find_one({"id": occurrence_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Occurrence not found")
    person = PersonInOccurrence(
        role=person_data.role,
        full_name=person_data.full_name,
        address=person_data.address,
        phone=person_data.phone,
        email=person_data.email,
        tax_id=person_data.tax_id,
        document_type=person_data.document_type,
        document_number=person_data.document_number,
        document_issue_date=person_data.document_issue_date,
        document_expiry_date=person_data.document_expiry_date,
        photos=person_data.photos or [],
        notes=person_data.notes,
    )
    role_map = {"suspeito": "suspects", "testemunha": "witnesses", "lesado": "victims"}
    array_name = role_map.get(person_data.role, "suspects")
    await _db.db.occurrences.update_one(
        {"id": occurrence_id, "user_id": user.user_id},
        {"$push": {array_name: crypto.encrypt_person(person.model_dump())}, "$set": {"updated_at": datetime.now(timezone.utc)}},
    )
    updated = await _db.db.occurrences.find_one({"id": occurrence_id, "user_id": user.user_id}, {"_id": 0})
    return _decrypt_occurrence(updated)


@router.delete("/occurrences/{occurrence_id}/persons/{person_id}")
async def remove_person_from_occurrence(
    occurrence_id: str, person_id: str, user: User = Depends(get_current_user)
):
    existing = await _db.db.occurrences.find_one({"id": occurrence_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Occurrence not found")
    await _db.db.occurrences.update_one(
        {"id": occurrence_id, "user_id": user.user_id},
        {
            "$pull": {
                "suspects": {"id": person_id},
                "witnesses": {"id": person_id},
                "victims": {"id": person_id},
            },
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )
    return {"message": "Person removed successfully"}


@router.post("/occurrences/{occurrence_id}/photos")
async def add_photo_to_occurrence(
    occurrence_id: str, photo_data: dict, user: User = Depends(get_current_user)
):
    existing = await _db.db.occurrences.find_one({"id": occurrence_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Occurrence not found")
    photo_base64 = photo_data.get("photo")
    if not photo_base64:
        raise HTTPException(status_code=400, detail="Photo data required")

    # Validate base64 content is a real image (check magic bytes)
    try:
        decoded = base64.b64decode(photo_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Base64 inválido")
    if len(decoded) < 12:
        raise HTTPException(status_code=400, detail="Dados de imagem inválidos")
    magic = decoded[:8]
    is_valid_image = any([
        magic.startswith(b'\xff\xd8\xff'),           # JPEG
        decoded[:8] == b'\x89PNG\r\n\x1a\n',          # PNG
        magic.startswith(b'GIF87a') or magic.startswith(b'GIF89a'),  # GIF
        decoded[:4] == b'RIFF' and decoded[8:12] == b'WEBP',          # WebP
    ])
    if not is_valid_image:
        raise HTTPException(status_code=400, detail="Formato de imagem inválido. Use JPEG, PNG, GIF ou WebP")

    # Validate photo size
    if len(photo_base64) > _MAX_PHOTO_CHARS:
        raise HTTPException(status_code=400, detail="Cada foto não pode exceder 2 MB")

    # Validate photo count
    current_photo_count = len(existing.get("photos", []))
    if current_photo_count >= _MAX_PHOTOS:
        raise HTTPException(status_code=400, detail=f"Máximo de {_MAX_PHOTOS} fotos permitidas")

    clean_photo = _strip_exif(photo_base64)

    await _db.db.occurrences.update_one(
        {"id": occurrence_id, "user_id": user.user_id},
        {"$push": {"photos": clean_photo}, "$set": {"updated_at": datetime.now(timezone.utc)}},
    )
    return {"message": "Photo added successfully"}