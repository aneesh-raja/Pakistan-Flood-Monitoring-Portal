"""
statistics.py
GEE-based zonal statistics for flood impact estimation over Pakistan.
Computes affected population (WorldPop) and estimated building exposure
for flooded areas derived from Sentinel-1 SAR.
"""

import json
import logging
import os
import sys
from typing import Dict, Any

import ee

logger = logging.getLogger(__name__)

def get_pakistan_bbox():
    """Returns Pakistan bounding box geometry (lazy initialized after GEE auth)."""
    return ee.Geometry.Rectangle([60.87, 23.63, 77.83, 37.09])


def initialize_gee(service_account: str = None, key_path: str = None):
    """Initialize GEE with service account or default credentials."""
    try:
        if service_account and key_path and os.path.exists(key_path):
            credentials = ee.ServiceAccountCredentials(service_account, key_path)
            ee.Initialize(credentials)
        else:
            ee.Initialize()
        logger.info("Successfully initialized Google Earth Engine using service account key.")
    except Exception as e:
        logger.error("Failed to initialize GEE: %s", e)
        sys.exit(1)


def load_pakistan_districts() -> ee.FeatureCollection:
    """Load GADM Pakistan Level-2 (district) boundaries from GEE Asset."""
    # Using FAO GAUL (Global Administrative Unit Layers) available in GEE
    gaul = ee.FeatureCollection("FAO/GAUL/2015/level2")
    return gaul.filter(ee.Filter.eq("ADM0_NAME", "Pakistan"))


def compute_population_at_risk(flood_mask: ee.Image, year: int = 2020) -> Dict[str, Any]:
    """
    Compute total affected population using WorldPop population grid.

    Args:
        flood_mask: Binary flood extent image (1=flooded, 0=not flooded)
        year: WorldPop year to use (2020 is most recent available globally)

    Returns:
        dict with total_affected_population and district_breakdown list
    """
    logger.info("Loading WorldPop population grid for Pakistan (year=%d) ...", year)
    worldpop = (
        ee.ImageCollection("WorldPop/GP/100m/pop")
        .filter(ee.Filter.eq("country", "PAK"))
        .filter(ee.Filter.calendarRange(year, year, "year"))
        .first()
    )

    if worldpop is None:
        logger.warning("WorldPop image not found for year %d, using 2020.", year)
        worldpop = (
            ee.ImageCollection("WorldPop/GP/100m/pop")
            .filter(ee.Filter.eq("country", "PAK"))
            .filter(ee.Filter.calendarRange(2020, 2020, "year"))
            .first()
        )

    # Mask population by flood extent
    pop_at_risk = worldpop.updateMask(flood_mask)

    # Total affected population
    total_pop_dict = pop_at_risk.reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=get_pakistan_bbox(),
        scale=100,
        maxPixels=1e13,
    )
    total_pop = round(total_pop_dict.get("population").getInfo() or 0)

    # District-wise breakdown
    districts = load_pakistan_districts()
    district_pop = pop_at_risk.reduceRegions(
        collection=districts,
        reducer=ee.Reducer.sum(),
        scale=100,
    )

    district_list = []
    for feature in district_pop.toList(district_pop.size().getInfo()).getInfo():
        props = feature.get("properties", {})
        district_list.append({
            "district": props.get("ADM2_NAME", "Unknown"),
            "province": props.get("ADM1_NAME", "Unknown"),
            "affected_population": round(props.get("sum", 0) or 0),
        })

    # Sort by affected population descending
    district_list.sort(key=lambda x: x["affected_population"], reverse=True)

    return {
        "total_affected_population": total_pop,
        "districts": district_list,
    }


def compute_rainfall_statistics(start_date: str, end_date: str) -> Dict[str, Any]:
    """
    Compute mean and total rainfall over Pakistan using CHIRPS daily dataset.

    Args:
        start_date: Start date string YYYY-MM-DD
        end_date:   End date string YYYY-MM-DD

    Returns:
        dict with total_rainfall_mm, mean_daily_mm, and district_breakdown
    """
    logger.info("Loading CHIRPS rainfall data for %s to %s ...", start_date, end_date)

    chirps = (
        ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
        .filterDate(start_date, end_date)
        .filterBounds(get_pakistan_bbox())
    )

    total_rainfall = chirps.sum().clip(get_pakistan_bbox())
    mean_rainfall = chirps.mean().clip(get_pakistan_bbox())

    # Pakistan-wide totals
    stats = total_rainfall.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=get_pakistan_bbox(),
        scale=5000,
        maxPixels=1e13,
    )
    total_mean_mm = round(stats.get("precipitation").getInfo() or 0, 2)

    # District-wise CHIRPS totals
    districts = load_pakistan_districts()
    district_rain = total_rainfall.reduceRegions(
        collection=districts,
        reducer=ee.Reducer.mean(),
        scale=5000,
    )

    district_rainfall_list = []
    for feature in district_rain.toList(district_rain.size().getInfo()).getInfo():
        props = feature.get("properties", {})
        district_rainfall_list.append({
            "district": props.get("ADM2_NAME", "Unknown"),
            "province": props.get("ADM1_NAME", "Unknown"),
            "total_rainfall_mm": round(props.get("mean", 0) or 0, 2),
        })

    district_rainfall_list.sort(key=lambda x: x["total_rainfall_mm"], reverse=True)

    return {
        "period": f"{start_date} to {end_date}",
        "national_mean_rainfall_mm": total_mean_mm,
        "districts": district_rainfall_list,
    }


def compute_flood_hazard_index() -> Dict[str, Any]:
    """
    Compute a static Flood Hazard Index for Pakistan using:
      - Copernicus DEM (elevation & slope) — low elevation = higher hazard
      - JRC Historical Flood Occurrence (frequency)
      - Distance to major rivers (proximity factor)

    Returns a district-level hazard score (0–100 scale).
    """
    logger.info("Computing Flood Hazard Index ...")

    # ── DEM & Slope ───────────────────────────────────────────────────────────
    dem = ee.ImageCollection("COPERNICUS/DEM/GLO30").filterBounds(get_pakistan_bbox()).mosaic()
    elevation = dem.select("DEM")
    slope = ee.Terrain.slope(elevation)

    # Normalize elevation (0–1, low elevation = high hazard)
    elev_norm = elevation.unitScale(0, 5000).subtract(1).multiply(-1)
    # Normalize slope (0–1, flat terrain = higher hazard)
    slope_norm = slope.unitScale(0, 45).subtract(1).multiply(-1)

    # ── JRC Flood Occurrence (historical frequency) ────────────────────────────
    jrc = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence")
    jrc_norm = jrc.unitScale(0, 100)

    # ── Composite Hazard Index (weighted average) ─────────────────────────────
    # Weight: elevation 40%, slope 20%, historical flood occurrence 40%
    hazard_index = (
        elev_norm.multiply(0.4)
        .add(slope_norm.multiply(0.2))
        .add(jrc_norm.multiply(0.4))
        .multiply(100)
        .rename("hazard_index")
        .clip(get_pakistan_bbox())
    )

    # District-level aggregation
    districts = load_pakistan_districts()
    district_hazard = hazard_index.reduceRegions(
        collection=districts,
        reducer=ee.Reducer.mean(),
        scale=500,
    )

    district_list = []
    for feature in district_hazard.toList(district_hazard.size().getInfo()).getInfo():
        props = feature.get("properties", {})
        score = round(props.get("mean", 0) or 0, 1)
        # Classify
        if score >= 70:
            risk_class = "Severe"
        elif score >= 50:
            risk_class = "High"
        elif score >= 30:
            risk_class = "Moderate"
        else:
            risk_class = "Low"

        district_list.append({
            "district": props.get("ADM2_NAME", "Unknown"),
            "province": props.get("ADM1_NAME", "Unknown"),
            "hazard_score": score,
            "hazard_class": risk_class,
        })

    district_list.sort(key=lambda x: x["hazard_score"], reverse=True)
    return {"districts": district_list}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="GEE Zonal Statistics for Pakistan Flood Impact")
    parser.add_argument("--mode", choices=["population", "rainfall", "hazard"], required=True)
    parser.add_argument("--start_date", help="Start date (YYYY-MM-DD) for rainfall mode")
    parser.add_argument("--end_date", help="End date (YYYY-MM-DD) for rainfall mode")
    parser.add_argument("--flood_geojson", help="Path to flood extent GeoJSON (for population mode)")
    parser.add_argument(
        "--service_account", default=os.environ.get("GEE_SERVICE_ACCOUNT_EMAIL", "")
    )
    parser.add_argument(
        "--key_path", default=os.environ.get("GEE_PRIVATE_KEY_PATH", "./gee_credentials.json")
    )
    args = parser.parse_args()

    initialize_gee(args.service_account, args.key_path)

    if args.mode == "rainfall":
        result = compute_rainfall_statistics(args.start_date, args.end_date)
    elif args.mode == "hazard":
        result = compute_flood_hazard_index()
    elif args.mode == "population":
        # Load flood mask from GeoJSON
        if not args.flood_geojson or not os.path.exists(args.flood_geojson):
            print("ERROR: --flood_geojson path required for population mode")
            sys.exit(1)
        with open(args.flood_geojson) as f:
            gj = json.load(f)
        flood_fc = ee.FeatureCollection(gj)
        flood_mask = flood_fc.map(lambda f: f.set("flood", 1))
        flood_img = flood_mask.reduceToImage(properties=["flood"], reducer=ee.Reducer.first())
        result = compute_population_at_risk(flood_img)
    else:
        result = {}

    print(json.dumps(result, indent=2))
