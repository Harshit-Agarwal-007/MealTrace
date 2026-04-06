# app/main.py
"""
MealTrace Digital — FastAPI Application Entry Point

Registers all route modules, configures CORS, and sets up error handling.
Run with: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
from contextlib import asynccontextmanager

import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routes import auth, resident, scan, payment, site, admin, dev


# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("mealtrace")


# ── Lifespan (startup/shutdown) ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("🚀 MealTrace Digital backend starting up...")
    # Initialize Firebase on startup (eager load)
    from app.database import get_db
    get_db()
    logger.info("✅ Firebase Firestore connected")
    yield
    logger.info("🛑 MealTrace Digital backend shutting down...")


# ── FastAPI App ──
settings = get_settings()

app = FastAPI(
    title="MealTrace Digital API",
    description=(
        "Backend API for MealTrace Digital — a QR-based meal tracking system "
        "for PG/catering operations. Supports resident management, QR scanning, "
        "payment integration, and admin reporting."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global Error Handlers ──

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400,
        content={"status": "error", "message": str(exc)},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Internal server error",
            "detail": str(exc) if settings.APP_DEBUG else None,
        },
    )


# ── Register Routers ──
app.include_router(auth.router)
app.include_router(resident.router)
app.include_router(scan.router)
app.include_router(payment.router)
app.include_router(site.router)
app.include_router(admin.router)

# Dev routes (only in development)
if settings.APP_ENV != "production":
    app.include_router(dev.router)
    logger.info("⚡ Dev routes enabled (POST /dev/login, GET /dev/users)")


# ── Health Check ──

@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {
        "service": "MealTrace Digital API",
        "version": "1.0.0",
        "status": "healthy",
        "environment": settings.APP_ENV,
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check with Firebase connectivity."""
    try:
        from app.database import get_db
        db = get_db()
        # Quick Firestore connectivity test
        db.collection("_health").document("ping").set({"ts": "ok"})
        firestore_ok = True
    except Exception as e:
        firestore_ok = False
        logger.error(f"Health check — Firestore failed: {e}")

    return {
        "status": "healthy" if firestore_ok else "degraded",
        "firestore": "connected" if firestore_ok else "disconnected",
        "environment": settings.APP_ENV,
    }


# ── Static Files (Web UI) — must be LAST (catch-all) ──
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
if os.path.isdir(static_dir):
    app.mount("/ui", StaticFiles(directory=static_dir, html=True), name="static")
    logger.info(f"📁 Static UI served at /ui")
