"""
gee.py
FastAPI router for Google Earth Engine live zonal statistics.
Exposes endpoints for:
  - Population at risk (WorldPop masked by flood extent)
  - CHIRPS cumulative rainfall by district
  - Flood Hazard Index (DEM + slope + JRC historical occurrence)
"""
import os
import logging
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import Optional
from datetime import date, timedelta
from functools import lru_cache
import threading

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Module-level GEE init (lazy, once on first request) ──────────────────────
_gee_initialized = False
_gee_lock = threading.Lock()


def _ensure_gee():
    global _gee_initialized
    with _gee_lock:
        if _gee_initialized:
            return
        try:
            from app.config import settings
            from app.gee.statistics import initialize_gee
            initialize_gee(
                service_account=settings.GEE_SERVICE_ACCOUNT_EMAIL,
                key_path=settings.GEE_PRIVATE_KEY_PATH,
                project_id=settings.GEE_PROJECT_ID or None,
            )
            _gee_initialized = True
        except Exception as e:
            logger.error("GEE initialization failed: %s", e)
            raise RuntimeError(f"GEE initialization failed: {e}")


# ── Simple in-memory cache (TTL-based) ───────────────────────────────────────
_cache: dict = {}
CACHE_TTL_SECONDS = 3600  # 1 hour (GEE computations are expensive)

from datetime import datetime


def _cache_get(key: str):
    entry = _cache.get(key)
    if entry and (datetime.utcnow() - entry["ts"]).seconds < CACHE_TTL_SECONDS:
        return entry["data"]
    return None


def _cache_set(key: str, data):
    _cache[key] = {"data": data, "ts": datetime.utcnow()}


# ─────────────────────────────────────────────────────────────────────────────


@router.get("/summary", summary="GEE: Live national flood impact summary")
async def get_gee_summary():
    """
    Returns live, satellite-derived national summary statistics:
    - Estimated population currently in flooded zones (WorldPop × SAR mask)
    - National mean rainfall for the current monsoon month (CHIRPS)
    - Districts classified at Severe / High hazard level (DEM + JRC)
    """
    cached = _cache_get("gee_summary")
    if cached:
        return cached

    try:
        _ensure_gee()
        from app.gee.statistics import compute_flood_hazard_index
        import ee

        # ── Flood Hazard Index (district breakdown) ───────────────────────
        hazard_result = compute_flood_hazard_index()
        districts = hazard_result.get("districts", [])

        severe_districts = [d for d in districts if d["hazard_class"] == "Severe"]
        high_districts   = [d for d in districts if d["hazard_class"] == "High"]
        total_at_risk    = len(severe_districts) + len(high_districts)

        # ── CHIRPS current-month rainfall ─────────────────────────────────
        today = date.today()
        start = today.replace(day=1).isoformat()
        end   = today.isoformat()

        from app.gee.statistics import compute_rainfall_statistics
        rainfall = compute_rainfall_statistics(start, end)
        national_rainfall_mm = rainfall.get("national_mean_rainfall_mm", 0)

        result = {
            "source": "Google Earth Engine (Sentinel-1 SAR + WorldPop + CHIRPS + Copernicus DEM)",
            "computed_at": datetime.utcnow().isoformat(),
            "hazard_districts": {
                "severe": len(severe_districts),
                "high": len(high_districts),
                "total_at_risk": total_at_risk,
                "top_severe": severe_districts[:5],
                "top_high": high_districts[:5],
            },
            "current_month_rainfall_mm": national_rainfall_mm,
            "all_districts": districts,
        }

        _cache_set("gee_summary", result)
        return result

    except Exception as e:
        logger.error("GEE summary error: %s", e)
        raise HTTPException(status_code=500, detail=f"GEE computation failed: {e}")


@router.get("/rainfall", summary="GEE: CHIRPS district-wise rainfall statistics")
async def get_gee_rainfall(
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD (default: 30 days ago)"),
    end_date:   Optional[str] = Query(None, description="End date YYYY-MM-DD (default: today)"),
):
    """
    Returns CHIRPS satellite-derived cumulative rainfall statistics
    for all Pakistan districts over the specified date range.
    """
    today = date.today()
    start = start_date or (today - timedelta(days=30)).isoformat()
    end   = end_date   or today.isoformat()

    cache_key = f"gee_rainfall_{start}_{end}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    try:
        _ensure_gee()
        from app.gee.statistics import compute_rainfall_statistics
        result = compute_rainfall_statistics(start, end)
        _cache_set(cache_key, result)
        return result
    except Exception as e:
        logger.error("GEE rainfall error: %s", e)
        raise HTTPException(status_code=500, detail=f"GEE rainfall computation failed: {e}")


@router.get("/hazard", summary="GEE: District-level Flood Hazard Index")
async def get_gee_hazard_index():
    """
    Computes the Flood Hazard Index for all Pakistan districts using:
    - Copernicus DEM 30m (elevation + slope)
    - JRC Global Surface Water historical occurrence
    Returns a 0–100 hazard score per district classified as Severe / High / Moderate / Low.
    """
    cached = _cache_get("gee_hazard")
    if cached:
        return cached

    try:
        _ensure_gee()
        from app.gee.statistics import compute_flood_hazard_index
        result = compute_flood_hazard_index()
        _cache_set("gee_hazard", result)
        return result
    except Exception as e:
        logger.error("GEE hazard error: %s", e)
        raise HTTPException(status_code=500, detail=f"GEE hazard computation failed: {e}")


# ── GEE MAP TILE ENDPOINTS ────────────────────────────────────────────────────
# These return live TMS tile URL templates that Leaflet loads as raster tile layers.
# GEE processes Sentinel-1 SAR / DEM / WorldPop in the cloud and serves tiles via CDN.

def _get_tile(layer_name: str, fn):
    """Shared helper: check cache, call GEE tile generator, cache result."""
    cache_key = f"gee_tile_{layer_name}"
    cached = _cache_get(cache_key)
    if cached:
        return cached
    _ensure_gee()
    result = fn()
    _cache_set(cache_key, result)
    return result


@router.get("/tiles/inundation", summary="GEE tile URL: Live Sentinel-1 flood inundation depth map")
async def get_inundation_tile():
    """
    Returns a live GEE TMS tile URL for the Sentinel-1 SAR flood inundation layer.
    Shows the current 30-day flood extent classified as:
      - Shallow (<0.5m) — Purple
      - Medium (0.5–2m) — Cyan
      - Deep (>2m)      — Lime Green
    Falls back to 2022 monsoon event if no current SAR imagery is available.
    Cached for 1 hour.
    """
    try:
        from app.gee.map_tiles import get_inundation_tile_url
        return _get_tile("inundation", get_inundation_tile_url)
    except Exception as e:
        logger.error("GEE inundation tile error: %s", e)
        raise HTTPException(status_code=500, detail=f"GEE inundation tile failed: {e}")


@router.get("/tiles/hazard", summary="GEE tile URL: Flood Hazard Index (DEM + JRC + Slope)")
async def get_hazard_tile():
    """
    Returns a GEE TMS tile URL for the Flood Hazard Index layer.
    Composite of Copernicus DEM elevation, terrain slope, and JRC historical flood occurrence.
    Rendered as a green→yellow→red→purple continuous heatmap (0–100 scale).
    Cached for 1 hour.
    """
    try:
        from app.gee.map_tiles import get_hazard_tile_url
        return _get_tile("hazard_tile", get_hazard_tile_url)
    except Exception as e:
        logger.error("GEE hazard tile error: %s", e)
        raise HTTPException(status_code=500, detail=f"GEE hazard tile failed: {e}")


@router.get("/tiles/risk", summary="GEE tile URL: Flood Risk Map (Hazard × WorldPop population)")
async def get_risk_tile():
    """
    Returns a GEE TMS tile URL for the Flood Risk Map layer.
    Computed as Hazard Index × WorldPop population density (log-normalised).
    Highlights areas where high physical hazard coincides with dense population.
    Cached for 1 hour.
    """
    try:
        from app.gee.map_tiles import get_risk_tile_url
        return _get_tile("risk_tile", get_risk_tile_url)
    except Exception as e:
        logger.error("GEE risk tile error: %s", e)
        raise HTTPException(status_code=500, detail=f"GEE risk tile failed: {e}")


@router.get("/tiles/awareness", summary="GEE tile URL: NDMA 5-class Early Warning Awareness layer")
async def get_awareness_tile():
    """
    Returns a GEE TMS tile URL for the NDMA Early Warning Awareness layer.
    Thresholds the Risk index into 5 discrete NDMA alert classes:
      1. Normal (Green) → 2. Advisory (Amber) → 3. Warning (Orange)
      → 4. Emergency (Red) → 5. Critical (Purple)
    Cached for 1 hour.
    """
    try:
        from app.gee.map_tiles import get_awareness_tile_url
        return _get_tile("awareness_tile", get_awareness_tile_url)
    except Exception as e:
        logger.error("GEE awareness tile error: %s", e)
        raise HTTPException(status_code=500, detail=f"GEE awareness tile failed: {e}")


@router.get("/tiles/all", summary="GEE: Preload all 4 map tile URLs in parallel")
async def get_all_tiles():
    """
    Preloads all 4 GEE layer tile URLs concurrently.
    Called once on dashboard startup so layer switching is instant.
    Returns a map of layer → tile URL (or error per layer).
    """
    import asyncio
    from app.gee.map_tiles import (
        get_inundation_tile_url,
        get_hazard_tile_url,
        get_risk_tile_url,
        get_awareness_tile_url,
    )

    _ensure_gee()

    LAYERS = {
        "inundation": ("gee_tile_inundation", get_inundation_tile_url),
        "hazard":     ("gee_tile_hazard_tile", get_hazard_tile_url),
        "risk":       ("gee_tile_risk_tile",   get_risk_tile_url),
        "awareness":  ("gee_tile_awareness_tile", get_awareness_tile_url),
    }

    results = {}

    def _compute_layer(layer_name, cache_key, fn):
        cached = _cache_get(cache_key)
        if cached:
            return layer_name, cached
        try:
            data = fn()
            _cache_set(cache_key, data)
            return layer_name, data
        except Exception as e:
            logger.error("GEE tile error for %s: %s", layer_name, e)
            return layer_name, {"error": str(e), "tile_url": None, "layer": layer_name}

    loop = asyncio.get_event_loop()
    tasks = [
        loop.run_in_executor(None, _compute_layer, name, cache_key, fn)
        for name, (cache_key, fn) in LAYERS.items()
    ]
    completed = await asyncio.gather(*tasks, return_exceptions=True)

    for item in completed:
        if isinstance(item, tuple):
            layer_name, data = item
            results[layer_name] = data

    return {
        "layers": results,
        "computed_at": datetime.utcnow().isoformat(),
        "cache_ttl_seconds": CACHE_TTL_SECONDS,
    }

