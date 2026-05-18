"""FastAPI application entry point."""
import logging

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS, RateLimitExceeded, _IS_PRODUCTION, _rate_limit_exceeded_handler, limiter
from db import lifespan
from routers import auth, cycles, gratifications, misc, occurrences, reports, shift_types, shifts, stats

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Interactive API docs leak the full schema/attack surface — disable in production.
_docs = {"docs_url": None, "redoc_url": None, "openapi_url": None} if _IS_PRODUCTION else {}
app = FastAPI(lifespan=lifespan, **_docs)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin"],
)

for _router in (auth, shifts, cycles, gratifications, stats, occurrences, shift_types, reports, misc):
    app.include_router(_router.router, prefix="/api")
