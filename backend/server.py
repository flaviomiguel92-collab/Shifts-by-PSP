"""FastAPI application entry point."""
import logging
import os
import time
import uuid

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS, RateLimitExceeded, _IS_PRODUCTION, _rate_limit_exceeded_handler, limiter
from db import lifespan
from routers import auth, cycles, events, gratifications, misc, occurrences, shift_types, shifts, stats

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Interactive API docs leak the full schema/attack surface — disable in production.
_docs = {"docs_url": None, "redoc_url": None, "openapi_url": None} if _IS_PRODUCTION else {}
app = FastAPI(lifespan=lifespan, **_docs)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Optional Sentry integration — only activated when SENTRY_DSN env var is set.
# sentry-sdk is NOT a required dependency; missing package is handled gracefully.
_sentry_dsn = os.environ.get("SENTRY_DSN")
if _sentry_dsn:
    try:
        import sentry_sdk
        sentry_sdk.init(dsn=_sentry_dsn, traces_sample_rate=0.0, send_default_pii=False)
    except Exception:  # sentry-sdk not installed or init failed — never block startup
        logging.getLogger(__name__).warning("SENTRY_DSN set but sentry init failed; continuing without Sentry")


@app.middleware("http")
async def _security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "DENY"
    # The API only ever returns JSON or file downloads, never executable HTML.
    # Skip docs paths so the local-dev Swagger UI keeps working.
    path = request.url.path
    if not (path.startswith("/docs") or path.startswith("/redoc") or path.startswith("/openapi")):
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    return response


# _request_context is defined AFTER _security_headers so it is added last by
# Starlette and therefore runs OUTERMOST — it times the entire middleware stack
# including _security_headers and sets X-Request-ID on every response.
_request_logger = logging.getLogger("api.request")


@app.middleware("http")
async def _request_context(request, call_next):
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
    ip = (
        request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or (request.client.host if request.client else "-")
    )
    start = time.monotonic()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.monotonic() - start) * 1000
        _request_logger.exception(
            "Unhandled error rid=%s ip=%s %s %s after %.1fms",
            request_id, ip, request.method, request.url.path, duration_ms,
        )
        raise
    duration_ms = (time.monotonic() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    _request_logger.info(
        "%s %s %s %.1fms rid=%s ip=%s",
        request.method, request.url.path, response.status_code, duration_ms, request_id, ip,
    )
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin"],
)

for _router in (auth, shifts, cycles, events, gratifications, stats, occurrences, shift_types, misc):
    app.include_router(_router.router, prefix="/api")
