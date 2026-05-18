from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request

import db as _db
from auth.dependencies import get_current_user, require_header_auth
from config import validate_date_format, validate_month_format, validate_year_format, limiter
from models.auth import User
from models.gratifications import (
    Gratification,
    GratificationCreate,
    GratificationUpdate,
    GratifiedCalendarEntry,
    GratifiedCalendarEntryCreate,
)

router = APIRouter()


@router.get("/gratifications", response_model=List[dict])
async def get_gratifications(
    month: Optional[str] = None,
    year: Optional[str] = None,
    page: int = 1,
    per_page: int = 100,
    user: User = Depends(get_current_user),
):
    per_page = max(1, min(per_page, 500))
    page = max(1, page)
    query = {"user_id": user.user_id}
    if month:
        validate_month_format(month)
        query["date"] = {"$gte": f"{month}-01", "$lte": f"{month}-31"}
    elif year:
        validate_year_format(year)
        query["date"] = {"$gte": f"{year}-01-01", "$lte": f"{year}-12-31"}
    skip = (page - 1) * per_page if page > 0 else 0
    gratifications = await _db.db.gratifications.find(query, {"_id": 0}).sort("date", -1).skip(skip).limit(per_page).to_list(length=None)
    return gratifications


@router.post("/gratifications", response_model=dict)
async def create_gratification(grat_data: GratificationCreate, user: User = Depends(get_current_user)):
    gratification = Gratification(
        user_id=user.user_id,
        date=grat_data.date,
        gratification_type=grat_data.gratification_type,
        value=grat_data.value,
        note=grat_data.note,
        shift_id=grat_data.shift_id,
    )
    await _db.db.gratifications.insert_one(gratification.model_dump())
    return gratification.model_dump()


@router.put("/gratifications/{grat_id}", response_model=dict)
async def update_gratification(grat_id: str, grat_data: GratificationUpdate, user: User = Depends(get_current_user)):
    existing = await _db.db.gratifications.find_one({"id": grat_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Gratification not found")
    update_data = {k: v for k, v in grat_data.model_dump().items() if v is not None}
    if update_data:
        await _db.db.gratifications.update_one({"id": grat_id, "user_id": user.user_id}, {"$set": update_data})
    updated = await _db.db.gratifications.find_one({"id": grat_id}, {"_id": 0})
    return updated


@router.delete("/gratifications/{grat_id}")
async def delete_gratification(grat_id: str, user: User = Depends(get_current_user)):
    result = await _db.db.gratifications.delete_one({"id": grat_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gratification not found")
    return {"message": "Gratification deleted successfully"}


@router.get("/gratified-entries", response_model=List[dict])
async def get_gratified_entries(
    month: Optional[str] = None,
    page: int = 1,
    per_page: int = 100,
    user: User = Depends(get_current_user),
):
    per_page = max(1, min(per_page, 500))
    page = max(1, page)
    query: dict = {"user_id": user.user_id}
    if month:
        validate_month_format(month)
        query["date"] = {"$gte": f"{month}-01", "$lte": f"{month}-31"}
    skip = (page - 1) * per_page if page > 0 else 0
    entries = await _db.db.gratified_entries.find(query, {"_id": 0}).sort("date", -1).skip(skip).limit(per_page).to_list(length=None)
    return entries


@router.post("/gratified-entries", response_model=dict)
async def create_gratified_entry(entry_data: GratifiedCalendarEntryCreate, user: User = Depends(get_current_user)):
    validate_date_format(entry_data.date)
    entry = GratifiedCalendarEntry(user_id=user.user_id, **entry_data.model_dump())
    await _db.db.gratified_entries.insert_one(entry.model_dump())
    return entry.model_dump()


@router.delete("/gratified-entries/{entry_id}")
async def delete_gratified_entry(entry_id: str, user: User = Depends(get_current_user)):
    result = await _db.db.gratified_entries.delete_one({"id": entry_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry deleted"}


@router.post("/gratified-entries/reset")
@limiter.limit("2/minute")
async def reset_all_gratified_entries(request: Request, user: User = Depends(require_header_auth)):
    result = await _db.db.gratified_entries.delete_many({"user_id": user.user_id})
    return {"message": f"Reset: deleted {result.deleted_count} gratified entries"}