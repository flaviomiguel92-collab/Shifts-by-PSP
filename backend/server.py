"""FastAPI application entry point."""
import logging

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS, RateLimitExceeded, _rate_limit_exceeded_handler, limiter
from db import lifespan
from routers import auth, cycles, gratifications, misc, occurrences, reports, shift_types, shifts, stats

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for _router in (auth, shifts, cycles, gratifications, stats, occurrences, shift_types, reports, misc):
    app.include_router(_router.router, prefix="/api")
