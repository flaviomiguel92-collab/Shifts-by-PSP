from typing import List

from fastapi import APIRouter, Depends, HTTPException

import db as _db
from auth.dependencies import get_current_user
from models.auth import User
from models.shift_types import CustomShiftType, CustomShiftTypeCreate, CustomShiftTypeUpdate

router = APIRouter()


@router.get("/shift-types", response_model=List[dict])
async def get_shift_types(current_user: User = Depends(get_current_user)):
    cursor = _db.db.shift_types.find({"user_id": current_user.user_id}, {"_id": 0})
    result = await cursor.to_list(length=500)
    for doc in result:
        if "created_at" in doc and hasattr(doc["created_at"], "isoformat"):
            doc["created_at"] = doc["created_at"].isoformat()
    return result


@router.post("/shift-types", response_model=dict)
async def create_shift_type(data: CustomShiftTypeCreate, current_user: User = Depends(get_current_user)):
    short_name = data.short_name or data.name[:3].upper()
    shift_type = CustomShiftType(
        user_id=current_user.user_id,
        name=data.name,
        short_name=short_name,
        color=data.color,
        start_time=data.start_time,
        end_time=data.end_time,
        is_working=data.is_working,
        order=data.order,
    )
    doc = shift_type.model_dump()
    await _db.db.shift_types.insert_one(doc)
    doc.pop("_id", None)
    doc["created_at"] = doc["created_at"].isoformat()
    return doc


@router.put("/shift-types/{shift_type_id}", response_model=dict)
async def update_shift_type(
    shift_type_id: str, data: CustomShiftTypeUpdate, current_user: User = Depends(get_current_user)
):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar.")
    result = await _db.db.shift_types.find_one_and_update(
        {"id": shift_type_id, "user_id": current_user.user_id},
        {"$set": update_data},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Tipo de turno não encontrado.")
    if "created_at" in result and hasattr(result["created_at"], "isoformat"):
        result["created_at"] = result["created_at"].isoformat()
    return result


@router.delete("/shift-types/{shift_type_id}")
async def delete_shift_type(shift_type_id: str, current_user: User = Depends(get_current_user)):
    result = await _db.db.shift_types.delete_one({"id": shift_type_id, "user_id": current_user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tipo de turno não encontrado.")
    return {"message": "Tipo de turno eliminado."}
