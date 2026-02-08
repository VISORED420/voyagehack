"""
TBO GroupBook API
Main FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .api import (
    events_router,
    bookings_router,
    guests_router,
    inventory_router,
    payments_router,
    dashboard_router,
    validation_router,
    audit_router,
    tbo_router
)
from .services.cache import cache_service
from .services.tbo_client import tbo_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print(f"[*] Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # Initialize Redis connection
    if settings.REDIS_ENABLED:
        redis_connected = await cache_service.connect()
        if redis_connected:
            print(f"[OK] Redis connected at {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        else:
            print("[WARN] Redis not available - caching disabled")
    else:
        print("[INFO] Redis caching is disabled in configuration")

    # Check TBO configuration
    if settings.TBO_USERNAME and settings.TBO_PASSWORD:
        print(f"[OK] TBO API configured")
    else:
        print("[WARN] TBO API credentials not configured - set TBO_USERNAME and TBO_PASSWORD")

    print(f"[READY] Dashboard API ready at http://localhost:8000/docs")
    yield

    # Shutdown
    print("[SHUTDOWN] Shutting down...")
    await cache_service.disconnect()
    await tbo_client.close()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    TBO GroupBook API - Group Booking Centralization System

    This API provides endpoints for managing:
    - Events (weddings, conferences, etc.)
    - Guest lists and RSVP tracking
    - Room inventory management
    - Bookings and rooming lists
    - Payment tracking
    - Real-time dashboard statistics
    - TBO Hotels API integration (search, availability, booking)
    """,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(events_router, prefix="/api")
app.include_router(bookings_router, prefix="/api")
app.include_router(guests_router, prefix="/api")
app.include_router(inventory_router, prefix="/api")
app.include_router(payments_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(validation_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(tbo_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "redis": {
            "enabled": settings.REDIS_ENABLED,
            "connected": cache_service.is_connected
        }
    }


@app.get("/api")
async def api_info():
    """API information"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "endpoints": {
            "events": "/api/events",
            "bookings": "/api/bookings",
            "guests": "/api/guests",
            "inventory": "/api/inventory",
            "payments": "/api/payments",
            "dashboard": "/api/dashboard",
            "audit": "/api/audit",
            "tbo": "/api/tbo"
        }
    }
