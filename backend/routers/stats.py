import asyncio
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

    # ── Gratifications: group by gratification_type ──────────────────────────
    grat_pipeline = [
        {"$match": {"user_id": user.user_id, "date": {"$gte": f"{month}-01", "$lte": f"{month}-31"}}},
        {"$group": {
            "_id": "$gratification_type",
            "total": {"$sum": "$value"},
            "count": {"$sum": 1},
        }},
    ]
    grat_rows = await _db.db.gratifications.aggregate(grat_pipeline).to_list(None)

    by_type: dict = {}
    total = 0.0
    count = 0
    for row in grat_rows:
        gtype = row["_id"]
        row_total = float(row["total"])
        row_count = int(row["count"])
        by_type[gtype] = {"total": row_total, "count": row_count}
        total += row_total
        count += row_count

    # ── Shifts: group by shift_type ───────────────────────────────────────────
    shift_pipeline = [
        {"$match": {"user_id": user.user_id, "date": {"$gte": f"{month}-01", "$lte": f"{month}-31"}}},
        {"$group": {
            "_id": "$shift_type",
            "count": {"$sum": 1},
        }},
    ]
    shift_rows = await _db.db.shifts.aggregate(shift_pipeline).to_list(None)

    shifts_by_type: dict = {}
    shifts_count = 0
    for row in shift_rows:
        stype = row["_id"]
        row_count = int(row["count"])
        shifts_by_type[stype] = row_count
        shifts_count += row_count

    return {
        "month": month,
        "total_gratifications": total,
        "gratification_count": count,
        "by_type": by_type,
        "shifts_count": shifts_count,
        "shifts_by_type": shifts_by_type,
    }


@router.get("/stats/yearly/{year}")
async def get_yearly_stats(year: str, user: User = Depends(get_current_user)):
    validate_year_format(year)

    # ── Gratifications: two dimensions — by month AND by type ─────────────────
    # Run both pipelines concurrently.
    by_month_pipeline = [
        {"$match": {"user_id": user.user_id, "date": {"$gte": f"{year}-01-01", "$lte": f"{year}-12-31"}}},
        {"$group": {
            "_id": {"$substr": ["$date", 0, 7]},
            "total": {"$sum": "$value"},
            "count": {"$sum": 1},
        }},
    ]
    by_type_pipeline = [
        {"$match": {"user_id": user.user_id, "date": {"$gte": f"{year}-01-01", "$lte": f"{year}-12-31"}}},
        {"$group": {
            "_id": "$gratification_type",
            "total": {"$sum": "$value"},
            "count": {"$sum": 1},
        }},
    ]

    by_month_rows, by_type_rows = await asyncio.gather(
        _db.db.gratifications.aggregate(by_month_pipeline).to_list(None),
        _db.db.gratifications.aggregate(by_type_pipeline).to_list(None),
    )

    by_month: dict = {}
    for row in by_month_rows:
        by_month[row["_id"]] = {"total": float(row["total"]), "count": int(row["count"])}

    by_type: dict = {}
    total = 0.0
    count = 0
    for row in by_type_rows:
        gtype = row["_id"]
        row_total = float(row["total"])
        row_count = int(row["count"])
        by_type[gtype] = {"total": row_total, "count": row_count}
        total += row_total
        count += row_count

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

    # Build the 6 month strings exactly as before (newest-first, i=0..5).
    month_strs = []
    for i in range(6):
        month_date = today - timedelta(days=30 * i)
        month_strs.append(month_date.strftime("%Y-%m"))

    # One aggregation over all 6 months, grouped by the YYYY-MM prefix.
    # The $match uses the widest date window; the group key isolates each month.
    oldest_month = month_strs[-1]
    newest_month = month_strs[0]

    pipeline = [
        {"$match": {
            "user_id": user.user_id,
            "date": {"$gte": f"{oldest_month}-01", "$lte": f"{newest_month}-31"},
        }},
        {"$group": {
            "_id": {"$substr": ["$date", 0, 7]},
            "total": {"$sum": "$value"},
            "count": {"$sum": 1},
        }},
    ]
    rows = await _db.db.gratifications.aggregate(pipeline).to_list(None)
    agg_map = {row["_id"]: (float(row["total"]), int(row["count"])) for row in rows}

    # Build months_data newest-first (i=0 is newest), then reverse to oldest-first.
    months_data = []
    for month_str in month_strs:
        agg_total, agg_count = agg_map.get(month_str, (0.0, 0))
        months_data.append({"month": month_str, "total": agg_total, "count": agg_count})

    return {"months": list(reversed(months_data))}


@router.get("/stats/dashboard")
async def get_dashboard_stats(user: User = Depends(get_current_user)):
    current_year = str(datetime.now().year)
    current_month = datetime.now().strftime("%Y-%m")

    monthly_pipeline = [
        {"$match": {"user_id": user.user_id, "date": {"$gte": f"{current_month}-01", "$lte": f"{current_month}-31"}}},
        {"$group": {"_id": None, "total": {"$sum": "$value"}}},
    ]
    yearly_pipeline = [
        {"$match": {"user_id": user.user_id, "date": {"$gte": f"{current_year}-01-01", "$lte": f"{current_year}-12-31"}}},
        {"$group": {"_id": None, "total": {"$sum": "$value"}}},
    ]

    monthly_rows, yearly_rows = await asyncio.gather(
        _db.db.gratifications.aggregate(monthly_pipeline).to_list(None),
        _db.db.gratifications.aggregate(yearly_pipeline).to_list(None),
    )

    monthly_total = float(monthly_rows[0]["total"]) if monthly_rows else 0.0
    yearly_total = float(yearly_rows[0]["total"]) if yearly_rows else 0.0

    return {
        "monthly_total": monthly_total,
        "yearly_total": yearly_total,
        "current_month": current_month,
        "current_year": current_year,
    }
