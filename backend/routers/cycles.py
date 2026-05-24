from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request

import db as _db
from auth.dependencies import get_current_user, require_header_auth
from config import limiter
from models.auth import User
from models.cycles import CustomCycle, CustomCycleCreate, CustomCycleUpdate

router = APIRouter()


@router.get("/cycles", response_model=List[dict])
async def get_cycles(user: User = Depends(get_current_user)):
    cycles = await _db.db.cycles.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return cycles


@router.post("/cycles", response_model=dict)
async def create_cycle(cycle_data: CustomCycleCreate, user: User = Depends(get_current_user)):
    cycle = CustomCycle(user_id=user.user_id, name=cycle_data.name, pattern=cycle_data.pattern)
    await _db.db.cycles.insert_one(cycle.model_dump())
    return cycle.model_dump()


@router.post("/cycles/reset")
@limiter.limit("2/minute")
async def reset_all_cycles(request: Request, user: User = Depends(require_header_auth)):
    result = await _db.db.cycles.delete_many({"user_id": user.user_id})
    return {"message": f"Reset: deleted {result.deleted_count} cycles"}


@router.put("/cycles/{cycle_id}", response_model=dict)
async def update_cycle(cycle_id: str, data: CustomCycleUpdate, user: User = Depends(get_current_user)):
    existing = await _db.db.cycles.find_one({"id": cycle_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Cycle not found")
    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_fields:
        await _db.db.cycles.update_one({"id": cycle_id, "user_id": user.user_id}, {"$set": update_fields})
    updated = await _db.db.cycles.find_one({"id": cycle_id, "user_id": user.user_id}, {"_id": 0})
    return updated


@router.delete("/cycles/{cycle_id}")
async def delete_cycle(cycle_id: str, user: User = Depends(get_current_user)):
    result = await _db.db.cycles.delete_one({"id": cycle_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cycle not found")
    return {"message": "Cycle deleted"}
