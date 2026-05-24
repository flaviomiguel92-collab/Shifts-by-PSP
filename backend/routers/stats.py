from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Request

import db as _db
from auth.dependencies import get_current_user
from config import _GET_RATE, limiter, month_last_day, validate_month_format, validate_year_format
from models.auth import User

router = APIRouter()


@router.get("/stats/monthly/{month}")
@limiter.limit(_GET_RATE)
async def get_monthly_stats(request: Request, month: str, user: User = Depends(get_current_user)):
    validate_month_format(month)
    date_gte = f"{month}-01"
    date_lte = month_last_day(month)

    grat_rows = await _db.db.gratifications.aggregate([
        {"$match": {"user_id": user.user_id, "date": {"$gte": date_gte, "$lte": date_lte}}},
        {"$group": {"_id": "$gratification_type", "total": {"$sum": "$value"}, "count": {"$sum": 1}}},
    ]).to_list(None)

    shift_rows = await _db.db.shifts.aggregate([
        {"$match": {"user_id": user.user_id, "date": {"$gte": date_gte, "$lte": date_lte}}},
        {"$group": {"_id": "$shift_type", "count": {"$sum": 1}}},
    ]).to_list(None)

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
@limiter.limit(_GET_RATE)
async def get_yearly_stats(request: Request, year: str, user: User = Depends(get_current_user)):
    validate_year_format(year)

    # Single $facet pass: by_month and by_type in one query.
    result = await _db.db.gratifications.aggregate([
        {"$match": {"user_id": user.user_id, "date": {"$gte": f"{year}-01-01", "$lte": f"{year}-12-31"}}},
        {"$facet": {
            "by_month": [
                {"$group": {
                    "_id": {"$substr": ["$date", 0, 7]},
                    "total": {"$sum": "$value"},
                    "count": {"$sum": 1},
                }},
            ],
            "by_type": [
                {"$group": {
                    "_id": "$gratification_type",
                    "total": {"$sum": "$value"},
                    "count": {"$sum": 1},
                }},
            ],
        }},
    ]).to_list(1)

    facet = result[0] if result else {"by_month": [], "by_type": []}

    by_month: dict = {}
    for row in facet["by_month"]:
        by_month[row["_id"]] = {"total": float(row["total"]), "count": int(row["count"])}

    by_type: dict = {}
    total = 0.0
    count = 0
    for row in facet["by_type"]:
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
@limiter.limit(_GET_RATE)
async def get_comparison_stats(request: Request, user: User = Depends(get_current_user)):
    today = datetime.now()

    month_strs = []
    for i in range(6):
        month_date = today - timedelta(days=30 * i)
        month_strs.append(month_date.strftime("%Y-%m"))

    oldest_month = month_strs[-1]
    newest_month = month_strs[0]

    pipeline = [
        {"$match": {
            "user_id": user.user_id,
            "date": {"$gte": f"{oldest_month}-01", "$lte": month_last_day(newest_month)},
        }},
        {"$group": {
            "_id": {"$substr": ["$date", 0, 7]},
            "total": {"$sum": "$value"},
            "count": {"$sum": 1},
        }},
    ]
    rows = await _db.db.gratifications.aggregate(pipeline).to_list(None)
    agg_map = {row["_id"]: (float(row["total"]), int(row["count"])) for row in rows}

    months_data = []
    for month_str in month_strs:
        agg_total, agg_count = agg_map.get(month_str, (0.0, 0))
        months_data.append({"month": month_str, "total": agg_total, "count": agg_count})

    return {"months": list(reversed(months_data))}


@router.get("/stats/dashboard")
@limiter.limit(_GET_RATE)
async def get_dashboard_stats(request: Request, user: User = Depends(get_current_user)):
    current_year = str(datetime.now().year)
    current_month = datetime.now().strftime("%Y-%m")

    result = await _db.db.gratifications.aggregate([
        {"$match": {"user_id": user.user_id, "date": {"$gte": f"{current_year}-01-01", "$lte": f"{current_year}-12-31"}}},
        {"$facet": {
            "monthly": [
                {"$match": {"date": {"$gte": f"{current_month}-01", "$lte": month_last_day(current_month)}}},
                {"$group": {"_id": None, "total": {"$sum": "$value"}}},
            ],
            "yearly": [
                {"$group": {"_id": None, "total": {"$sum": "$value"}}},
            ],
        }},
    ]).to_list(1)

    facet = result[0] if result else {"monthly": [], "yearly": []}
    monthly_total = float(facet["monthly"][0]["total"]) if facet["monthly"] else 0.0
    yearly_total = float(facet["yearly"][0]["total"]) if facet["yearly"] else 0.0

    return {
        "monthly_total": monthly_total,
        "yearly_total": yearly_total,
        "current_month": current_month,
        "current_year": current_year,
    }
