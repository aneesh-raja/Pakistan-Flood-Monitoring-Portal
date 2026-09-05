"""
map_tiles.py
Generates Google Earth Engine (GEE) TMS tile URL templates for the 4 map layers:
  1. Inundation  — Sentinel-1 SAR change detection (live, last 30 days)
  2. Hazard      — Copernicus DEM + JRC + Slope composite index
  3. Risk        — Hazard × WorldPop population density
  4. Awareness   — 5-class NDMA early warning level

Each function returns a dict:
  {
    "tile_url": "https://earthengine.googleapis.com/v1/.../tiles/{z}/{x}/{y}",
    "layer":    "<layer_name>",
    "palette":  [...],
    "computed_at": "<ISO timestamp>",
  }

GEE tile URLs are temporary (~24h). The FastAPI layer caches them for 1 hour.
"""

import logging
from datetime import datetime, timedelta
import ee

logger = logging.getLogger(__name__)

# ── Pakistan bounding box ─────────────────────────────────────────────────────
def _pak_bbox():
    return ee.Geometry.Rectangle([60.87, 23.63, 77.83, 37.09])


# ── Sentinel-1 helpers ────────────────────────────────────────────────────────
def _get_s1_collection(start: str, end: str) -> ee.ImageCollection:
    """Filter Sentinel-1 GRD IW VV descending over Pakistan."""
    return (
        ee.ImageCollection("COPERNICUS/S1_GRD")
        .filterBounds(_pak_bbox())
        .filterDate(start, end)
        .filter(ee.Filter.eq("instrumentMode", "IW"))
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
        .filter(ee.Filter.eq("orbitProperties_pass", "DESCENDING"))
        .select("VV")
    )


def _speckle_filter(image: ee.Image) -> ee.Image:
    return image.focal_mean(radius=50, kernelType="circle", units="meters")


# ─────────────────────────────────────────────────────────────────────────────
# 1. INUNDATION LAYER
#    Live Sentinel-1 SAR change detection (current 30-day window vs 2-month baseline)
#    Depth proxy classified as: shallow / medium / deep
# ─────────────────────────────────────────────────────────────────────────────
def get_inundation_tile_url() -> dict:
    """
    Compute live Sentinel-1 flood inundation extent and return a GEE TMS tile URL.
    Uses the last 30 days as the 'flood window' vs 2 months prior as baseline.
    Classifies pixels into 3 water-depth proxy bands and returns a coloured tile.
    """
    today     = datetime.utcnow()
    flood_end   = today.strftime("%Y-%m-%d")
    flood_start = (today - timedelta(days=30)).strftime("%Y-%m-%d")
    base_end    = (today - timedelta(days=31)).strftime("%Y-%m-%d")
    base_start  = (today - timedelta(days=91)).strftime("%Y-%m-%d")

    logger.info("Inundation: flood %s→%s | baseline %s→%s",
                flood_start, flood_end, base_start, base_end)

    baseline_col = _get_s1_collection(base_start, base_end)
    flood_col    = _get_s1_collection(flood_start, flood_end)

    # Fallback: if no current imagery, use 2022 monsoon flood window
    if flood_col.size().getInfo() == 0:
        logger.warning("No current S1 imagery — falling back to 2022 monsoon event")
        flood_start, flood_end = "2022-08-01", "2022-09-15"
        base_start,  base_end  = "2022-06-01", "2022-07-31"
        baseline_col = _get_s1_collection(base_start, base_end)
        flood_col    = _get_s1_collection(flood_start, flood_end)

    baseline = _speckle_filter(baseline_col.mean())
    flood_img = _speckle_filter(flood_col.mean())

    # dB change (negative = backscatter drop = open water)
    diff = flood_img.subtract(baseline)

    # Remove permanent water (JRC occurrence > 80%)
    jrc = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence")
    perm_water = jrc.gt(80)

    # Remove steep terrain shadows (slope > 5°)
    dem   = ee.ImageCollection("COPERNICUS/DEM/GLO30").filterBounds(_pak_bbox()).mosaic()
    slope = ee.Terrain.slope(dem.select("DEM"))
    steep = slope.gt(5)

    # Depth proxy bands — depth ∝ magnitude of backscatter drop
    deep    = diff.lt(-10).And(perm_water.Not()).And(steep.Not())  # > 2m proxy
    medium  = diff.lt(-6).And(diff.gte(-10)).And(perm_water.Not()).And(steep.Not())
    shallow = diff.lt(-3).And(diff.gte(-6)).And(perm_water.Not()).And(steep.Not())

    # Combine into a single classified image: 3=deep, 2=medium, 1=shallow, 0=dry
    depth_class = (
        deep.multiply(3)
        .add(medium.multiply(2))
        .add(shallow.multiply(1))
        .clip(_pak_bbox())
        .selfMask()
    )

    # Palette: index 0 (dry, masked), 1=shallow purple, 2=medium cyan, 3=deep lime
    vis = {
        "min": 1,
        "max": 3,
        "palette": ["#7c3aed", "#00e5ff", "#ccff00"],
        "opacity": 0.82,
    }

    map_id = depth_class.getMapId(vis)
    tile_url = map_id["tile_fetcher"].url_format

    return {
        "tile_url": tile_url,
        "layer": "inundation",
        "palette": ["#7c3aed", "#00e5ff", "#ccff00"],
        "palette_labels": ["Shallow (< 0.5m)", "Medium (0.5–2m)", "Deep (> 2m)"],
        "flood_period": f"{flood_start} to {flood_end}",
        "baseline_period": f"{base_start} to {base_end}",
        "computed_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. HAZARD LAYER
#    Composite: Copernicus DEM elevation+slope + JRC historical flood occurrence
#    0–100 continuous index rendered as green → yellow → red
# ─────────────────────────────────────────────────────────────────────────────
def get_hazard_tile_url() -> dict:
    """
    Generate GEE tile URL for Flood Hazard Index across Pakistan.
    Static layer (does not change day-to-day) — based on terrain + historical floods.
    """
    logger.info("Computing Flood Hazard Index tile ...")

    dem       = ee.ImageCollection("COPERNICUS/DEM/GLO30").filterBounds(_pak_bbox()).mosaic()
    elevation = dem.select("DEM")
    slope     = ee.Terrain.slope(elevation)

    # Low elevation → higher hazard  (invert, normalize 0–5000m)
    elev_hazard = elevation.unitScale(0, 5000).subtract(1).multiply(-1).clamp(0, 1)
    # Flat terrain → higher hazard   (invert, normalize 0–45°)
    slope_hazard = slope.unitScale(0, 45).subtract(1).multiply(-1).clamp(0, 1)
    # JRC historical flood frequency  (normalize 0–100%)
    jrc       = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence")
    jrc_norm  = jrc.unitScale(0, 100).clamp(0, 1)

    # Weighted composite: elevation 40% + slope 20% + JRC 40%
    hazard_index = (
        elev_hazard.multiply(0.4)
        .add(slope_hazard.multiply(0.2))
        .add(jrc_norm.multiply(0.4))
        .multiply(100)
        .rename("hazard_index")
        .clip(_pak_bbox())
    )

    vis = {
        "min": 0,
        "max": 100,
        "palette": [
            "#1a4731",  # 0-20  Very Low  (dark green)
            "#22c55e",  # 20-40 Low
            "#eab308",  # 40-60 Moderate (amber)
            "#f97316",  # 60-80 High     (orange)
            "#dc2626",  # 80-90 Severe   (red)
            "#7c3aed",  # 90-100 Extreme (purple)
        ],
        "opacity": 0.78,
    }

    map_id = hazard_index.getMapId(vis)
    return {
        "tile_url": map_id["tile_fetcher"].url_format,
        "layer": "hazard",
        "palette": ["#1a4731", "#22c55e", "#eab308", "#f97316", "#dc2626", "#7c3aed"],
        "palette_labels": ["Very Low", "Low", "Moderate", "High", "Severe", "Extreme"],
        "computed_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. RISK LAYER
#    Hazard × Exposure (population density) — socio-economic vulnerability
# ─────────────────────────────────────────────────────────────────────────────
def get_risk_tile_url() -> dict:
    """
    Generate GEE tile URL for combined Flood Risk = Hazard × Population Exposure.
    Uses WorldPop 100m population density as the vulnerability/exposure factor.
    """
    logger.info("Computing Flood Risk tile (Hazard × WorldPop) ...")

    # ── Hazard component (same as above, compact) ─────────────────────────────
    dem       = ee.ImageCollection("COPERNICUS/DEM/GLO30").filterBounds(_pak_bbox()).mosaic()
    elevation = dem.select("DEM")
    slope     = ee.Terrain.slope(elevation)
    jrc       = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence")

    elev_h  = elevation.unitScale(0, 5000).subtract(1).multiply(-1).clamp(0, 1)
    slope_h = slope.unitScale(0, 45).subtract(1).multiply(-1).clamp(0, 1)
    jrc_h   = jrc.unitScale(0, 100).clamp(0, 1)

    hazard = (
        elev_h.multiply(0.4).add(slope_h.multiply(0.2)).add(jrc_h.multiply(0.4))
    ).clamp(0, 1)

    # ── Population exposure (WorldPop 2020) ───────────────────────────────────
    worldpop = (
        ee.ImageCollection("WorldPop/GP/100m/pop")
        .filter(ee.Filter.eq("country", "PAK"))
        .filter(ee.Filter.calendarRange(2020, 2020, "year"))
        .first()
    )
    # Log-normalise population density (0–1 scale)
    pop_norm = worldpop.log1p().unitScale(0, 10).clamp(0, 1)

    # ── Risk = Hazard × Exposure ──────────────────────────────────────────────
    risk = hazard.multiply(pop_norm).multiply(100).rename("risk_index").clip(_pak_bbox())

    vis = {
        "min": 0,
        "max": 100,
        "palette": [
            "#064e3b",  # Very Low
            "#22c55e",  # Low
            "#eab308",  # Moderate
            "#f97316",  # High
            "#dc2626",  # Severe
        ],
        "opacity": 0.80,
    }

    map_id = risk.getMapId(vis)
    return {
        "tile_url": map_id["tile_fetcher"].url_format,
        "layer": "risk",
        "palette": ["#064e3b", "#22c55e", "#eab308", "#f97316", "#dc2626"],
        "palette_labels": ["Very Low", "Low", "Moderate", "High", "Severe"],
        "computed_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. AWARENESS LAYER
#    5-class NDMA early warning: Normal / Advisory / Warning / Emergency / Critical
#    Thresholded from risk index to match NDMA colour code standard
# ─────────────────────────────────────────────────────────────────────────────
def get_awareness_tile_url() -> dict:
    """
    Generate GEE tile URL for the NDMA 5-class Early Warning Awareness layer.
    Derived from the Risk index with NDMA Pakistan standard thresholds.
    """
    logger.info("Computing NDMA Awareness tile ...")

    # Recompute Risk index (same as above)
    dem       = ee.ImageCollection("COPERNICUS/DEM/GLO30").filterBounds(_pak_bbox()).mosaic()
    elevation = dem.select("DEM")
    slope     = ee.Terrain.slope(elevation)
    jrc       = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence")

    elev_h  = elevation.unitScale(0, 5000).subtract(1).multiply(-1).clamp(0, 1)
    slope_h = slope.unitScale(0, 45).subtract(1).multiply(-1).clamp(0, 1)
    jrc_h   = jrc.unitScale(0, 100).clamp(0, 1)
    hazard  = elev_h.multiply(0.4).add(slope_h.multiply(0.2)).add(jrc_h.multiply(0.4)).clamp(0, 1)

    worldpop = (
        ee.ImageCollection("WorldPop/GP/100m/pop")
        .filter(ee.Filter.eq("country", "PAK"))
        .filter(ee.Filter.calendarRange(2020, 2020, "year"))
        .first()
    )
    pop_norm = worldpop.log1p().unitScale(0, 10).clamp(0, 1)
    risk_raw = hazard.multiply(pop_norm).multiply(100).clip(_pak_bbox())

    # ── 5-class NDMA thresholding ─────────────────────────────────────────────
    # 1=Normal, 2=Advisory, 3=Warning, 4=Emergency, 5=Critical
    awareness = (
        risk_raw.where(risk_raw.lt(20), 1)
                .where(risk_raw.gte(20).And(risk_raw.lt(40)), 2)
                .where(risk_raw.gte(40).And(risk_raw.lt(60)), 3)
                .where(risk_raw.gte(60).And(risk_raw.lt(80)), 4)
                .where(risk_raw.gte(80), 5)
                .rename("awareness_level")
    )

    vis = {
        "min": 1,
        "max": 5,
        "palette": [
            "#22c55e",  # 1 Normal     — Green
            "#eab308",  # 2 Advisory   — Amber
            "#f97316",  # 3 Warning    — Orange
            "#ef4444",  # 4 Emergency  — Red
            "#7c3aed",  # 5 Critical   — Purple
        ],
        "opacity": 0.80,
    }

    map_id = awareness.getMapId(vis)
    return {
        "tile_url": map_id["tile_fetcher"].url_format,
        "layer": "awareness",
        "palette": ["#22c55e", "#eab308", "#f97316", "#ef4444", "#7c3aed"],
        "palette_labels": [
            "Normal — No Action",
            "Advisory — Watch",
            "Warning — Prepare",
            "Emergency — Evacuate",
            "Critical — Disaster",
        ],
        "computed_at": datetime.utcnow().isoformat(),
    }
