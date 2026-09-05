"""
main.py
FastAPI application entrypoint for the Pakistan Flood Monitoring Portal.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import districts, rivers, flood, weather, gee

app = FastAPI(
    title="Pakistan Flood Monitoring Portal — API",
    description=(
        "Real-time geospatial API powering the Pakistan Flood Monitoring "
        "& Early Warning dashboard. Serves GEE-derived flood extents, "
        "river gauge telemetry, rainfall trends, and district-level "
        "population/infrastructure exposure statistics."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(districts.router, prefix="/api/districts", tags=["Districts"])
app.include_router(rivers.router,    prefix="/api/rivers",    tags=["Rivers"])
app.include_router(flood.router,     prefix="/api/flood",     tags=["Flood"])
app.include_router(weather.router,   prefix="/api/weather",   tags=["Weather"])
app.include_router(gee.router,       prefix="/api/gee",       tags=["GEE Statistics"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "service": "Pakistan Flood Monitoring Portal API",
        "version": "1.0.0",
        "docs": "/api/docs",
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "message": "Flood Monitoring API is running."}
