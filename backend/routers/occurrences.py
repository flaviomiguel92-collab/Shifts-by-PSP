import base64
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request

import db as _db
from auth.dependencies import get_current_user, require_header_auth
from config import limiter
from models.auth import User
from models.occurrences import Occurrence, OccurrenceCreate, OccurrenceUpdate, PersonCreate, PersonInOccurrence

router = APIRouter()


@router.post("/occurrences/reset")
@limiter.limit("2/minute")
async def reset_all_occurrences(request: Request, user: User = Depends(require_header_auth)):
    result = await _db.db.occurrences.delete_many({"user_id": user.user_id})
    return {"message": f"Reset: deleted {result.deleted_count} occurrences"}


@router.get("/occurrences", response_model=List[dict])
async def get_occurrences(
    status: Optional[str] = None,
    classification: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    query = {"user_id": user.user_id}
    if status:
        query["status"] = status
    if classification:
        query["classification"] = classification
    occurrences = await _db.db.occurrences.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return occurrences


@router.get("/occurrences/{occurrence_id}")
async def get_occurrence(occurrence_id: str, user: User = Depends(get_current_user)):
    occurrence = await _db.db.occurrences.find_one(
        {"id": occurrence_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not occurrence:
        raise HTTPException(status_code=404, detail="Occurrence not found")
    return occurrence


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
        {"$push": {array_name: person.model_dump()}, "$set": {"updated_at": datetime.now(timezone.utc)}},
    )
    updated = await _db.db.occurrences.find_one({"id": occurrence_id, "user_id": user.user_id}, {"_id": 0})
    return updated


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
        decoded[:4] == b'RIFF' and decoded[4:8] == b'WEB',          # WebP
    ])
    if not is_valid_image:
        raise HTTPException(status_code=400, detail="Formato de imagem inválido. Use JPEG, PNG, GIF ou WebP")

    await _db.db.occurrences.update_one(
        {"id": occurrence_id, "user_id": user.user_id},
        {"$push": {"photos": photo_base64}, "$set": {"updated_at": datetime.now(timezone.utc)}},
    )
    return {"message": "Photo added successfully"}