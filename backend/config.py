"""Application-wide constants, rate-limit config, and input validation helpers."""
import os
import re

from fastapi import HTTPException
from slowapi import Limiter, _rate_limit_exceeded_handler  # noqa: F401
from slowapi.errors import RateLimitExceeded  # noqa: F401
from slowapi.util import get_remote_address

# ── Rate limiting ──────────────────────────────────────────────────────────────
_TESTING = os.environ.get('TESTING', '') == 'true'
_AUTH_RATE = "9999/minute" if _TESTING else "5/minute"
_REPORT_RATE = "9999/minute" if _TESTING else "3/minute"

limiter = Limiter(key_func=get_remote_address)

# ── Environment ────────────────────────────────────────────────────────────────
_IS_PRODUCTION = os.environ.get('ENVIRONMENT', '').lower() == 'production'

CORS_ORIGINS = os.environ.get(
    'CORS_ORIGINS',
    'https://shifts-by-psp.vercel.app,http://localhost:3000,http://localhost:8000'
).split(',')

# ── Date/format regexes (anti-NoSQL-injection) ────────────────────────────────
MONTH_RE = re.compile(r'^\d{4}-(?:0[1-9]|1[0-2])$')
YEAR_RE = re.compile(r'^\d{4}$')
DATE_RE = re.compile(r'^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$')


def validate_month_format(month: str) -> None:
    if not MONTH_RE.match(month):
        raise HTTPException(status_code=400, detail=f"Formato de mês inválido: {month}. Use YYYY-MM")


def validate_year_format(year: str) -> None:
    if not YEAR_RE.match(year):
        raise HTTPException(status_code=400, detail=f"Formato de ano inválido: {year}. Use YYYY")


def validate_date_format(date: str) -> None:
    if not DATE_RE.match(date):
        raise HTTPException(status_code=400, detail=f"Formato de data inválido: {date}. Use YYYY-MM-DD")
