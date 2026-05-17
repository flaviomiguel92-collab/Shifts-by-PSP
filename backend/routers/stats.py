from datetime import datetime, timedelta

from fastapi import APIRouter, Depends

import db as _db
from auth.dependencies import get_current_user
from config import validate_month_format, validate_year_format
from models.auth import User

router = APIRouter()


@router.get("/stats/monthly/{month}")
async def get_monthly_stats(month: str, user: User = Depends(get_current_user)):
    validate_month_format(month)
    gratifications = await _db.db.gratifications.find(
        {"user_id": user.user_id, "date": {"$regex": f"^{month}"}}, {"_id": 0}
    ).to_list(1000)
    total = sum(g["value"] for g in gratifications)
    count = len(gratifications)
    by_type: dict = {}
    for g in gratifications:
        gtype = g["gratification_type"]
        if gtype not in by_type:
            by_type[gtype] = {"total": 0, "count": 0}
        by_type[gtype]["total"] += g["value"]
        by_type[gtype]["count"] += 1
    shifts = await _db.db.shifts.find(
        {"user_id": user.user_id, "date": {"$regex": f"^{month}"}}, {"_id": 0}
    ).to_list(1000)
    shifts_by_type: dict = {}
    for s in shifts:
        stype = s["shift_type"]
        if stype not in shifts_by_type:
            shifts_by_type[stype] = 0
        shifts_by_type[stype] += 1
    return {
        "month": month,
        "total_gratifications": total,
        "gratification_count": count,
        "by_type": by_type,
        "shifts_count": len(shifts),
        "shifts_by_type": shifts_by_type,
    }


@router.get("/stats/yearly/{year}")
async def get_yearly_stats(year: str, user: User = Depends(get_current_user)):
    validate_year_format(year)
    gratifications = await _db.db.gratifications.find(
        {"user_id": user.user_id, "date": {"$regex": f"^{year}"}}, {"_id": 0}
    ).to_list(1000)
    total = sum(g["value"] for g in gratifications)
    count = len(gratifications)
    by_month: dict = {}
    for g in gratifications:
        m = g["date"][:7]
        if m not in by_month:
            by_month[m] = {"total": 0, "count": 0}
        by_month[m]["total"] += g["value"]
        by_month[m]["count"] += 1
    by_type: dict = {}
    for g in gratifications:
        gtype = g["gratification_type"]
        if gtype not in by_type:
            by_type[gtype] = {"total": 0, "count": 0}
        by_type[gtype]["total"] += g["value"]
        by_type[gtype]["count"] += 1
    return {
        "year": year,
        "total_gratifications": total,
        "gratification_count": count,
        "by_month": by_month,
        "by_type": by_type,
    }


@router.get("/stats/comparison")
async def get_comparison_stats(user: User = Depends(get_current_user)):
    today = datetime.now()
    months_data = []
    for i in range(6):
        month_date = today - timedelta(days=30 * i)
        month_str = month_date.strftime("%Y-%m")
        gratifications = await _db.db.gratifications.find(
            {"user_id": user.user_id, "date": {"$regex": f"^{month_str}"}}, {"_id": 0}
        ).to_list(1000)
        total = sum(g["value"] for g in gratifications)
        months_data.append({"month": month_str, "total": total, "count": len(gratifications)})
    return {"months": list(reversed(months_data))}


@router.get("/stats/dashboard")
async def get_dashboard_stats(user: User = Depends(get_current_user)):
    current_year = str(datetime.now().year)
    current_month = datetime.now().strftime("%Y-%m")
    monthly_grats = await _db.db.gratifications.find(
        {"user_id": user.user_id, "date": {"$regex": f"^{current_month}"}}, {"_id": 0}
    ).to_list(1000)
    monthly_total = sum(g["value"] for g in monthly_grats)
    yearly_grats = await _db.db.gratifications.find(
        {"user_id": user.user_id, "date": {"$regex": f"^{current_year}"}}, {"_id": 0}
    ).to_list(1000)
    yearly_total = sum(g["value"] for g in yearly_grats)
    return {
        "monthly_total": monthly_total,
        "yearly_total": yearly_total,
        "current_month": current_month,
        "current_year": current_year,
    }
