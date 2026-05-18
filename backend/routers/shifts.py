from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request

import db as _db
from auth.dependencies import get_current_user, require_header_auth
from config import validate_month_format, limiter
from models.auth import User
from models.shifts import BulkShiftsRequest, Shift, ShiftCreate, ShiftUpdate

router = APIRouter()


@router.get("/shifts", response_model=List[dict])
async def get_shifts(
    month: Optional[str] = None,
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
    skip = (page - 1) * per_page if page > 0 else 0
    shifts = await _db.db.shifts.find(query, {"_id": 0}).sort("date", 1).skip(skip).limit(per_page).to_list(length=None)
    return shifts


@router.post("/shifts", response_model=dict)
async def create_shift(shift_data: ShiftCreate, user: User = Depends(get_current_user)):
    existing = await _db.db.shifts.find_one({"user_id": user.user_id, "date": shift_data.date})
    if existing:
        raise HTTPException(status_code=400, detail="Shift already exists for this date")
    shift = Shift(
        user_id=user.user_id,
        date=shift_data.date,
        shift_type=shift_data.shift_type,
        start_time=shift_data.start_time,
        end_time=shift_data.end_time,
        note=shift_data.note,
    )
    await _db.db.shifts.insert_one(shift.model_dump())
    return shift.model_dump()


@router.post("/shifts/reset")
@limiter.limit("2/minute")
async def reset_all_shifts(request: Request, user: User = Depends(require_header_auth)):
    result = await _db.db.shifts.delete_many({"user_id": user.user_id})
    return {"message": f"Reset: deleted {result.deleted_count} shifts"}


@router.post("/shifts/bulk", response_model=dict)
async def create_or_update_shifts_bulk(bulk_data: BulkShiftsRequest, user: User = Depends(get_current_user)):
    from pymongo import UpdateOne, InsertOne

    operations = []
    for shift_item in bulk_data.shifts:
        existing = await _db.db.shifts.find_one({"user_id": user.user_id, "date": shift_item.date})
        if existing:
            update_fields: dict = {"shift_type": shift_item.shift_type}
            if shift_item.start_time is not None:
                update_fields["start_time"] = shift_item.start_time
            if shift_item.end_time is not None:
                update_fields["end_time"] = shift_item.end_time
            operations.append(
                UpdateOne(
                    {"_id": existing["_id"], "user_id": user.user_id},
                    {"$set": update_fields},
                )
            )
        else:
            shift = Shift(
                user_id=user.user_id,
                date=shift_item.date,
                shift_type=shift_item.shift_type,
                start_time=shift_item.start_time,
                end_time=shift_item.end_time,
            )
            operations.append(InsertOne(shift.model_dump()))

    if operations:
        result = await _db.db.shifts.bulk_write(operations)
        return {
            "message": "Bulk operation completed",
            "created": result.inserted_count,
            "updated": result.modified_count,
            "total": result.inserted_count + result.modified_count,
        }
    return {"message": "No operations to perform", "created": 0, "updated": 0, "total": 0}


@router.get("/shifts/{date}")
async def get_shift_by_date(date: str, user: User = Depends(get_current_user)):
    shift = await _db.db.shifts.find_one({"user_id": user.user_id, "date": date}, {"_id": 0})
    return shift


@router.put("/shifts/{shift_id}", response_model=dict)
async def update_shift(shift_id: str, shift_data: ShiftUpdate, user: User = Depends(get_current_user)):
    existing = await _db.db.shifts.find_one({"id": shift_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Shift not found")
    update_data = {k: v for k, v in shift_data.model_dump().items() if v is not None}
    if update_data:
        await _db.db.shifts.update_one({"id": shift_id, "user_id": user.user_id}, {"$set": update_data})
    updated = await _db.db.shifts.find_one({"id": shift_id}, {"_id": 0})
    return updated


@router.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: str, user: User = Depends(get_current_user)):
    result = await _db.db.shifts.delete_one({"id": shift_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Shift not found")
    return {"message": "Shift deleted successfully"}