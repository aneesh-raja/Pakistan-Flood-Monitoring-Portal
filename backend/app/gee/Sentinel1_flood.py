"""
Sentinel1_flood.py
Google Earth Engine Python script for Sentinel-1 SAR flood extent mapping over Pakistan.

Algorithm:
  1. Filter Sentinel-1 GRD SAR imagery (IW mode, VV polarization) for the study area.
  2. Define a baseline pre-flood period vs the flood event period.
  3. Compute mean backscatter for each period.
  4. Calculate the difference (change detection) in dB.
  5. Apply backscatter threshold (< -3 dB change) to classify flooded pixels.
  6. Remove permanent water bodies using JRC Global Surface Water (occurrence > 80%).
  7. Remove terrain shadow artefacts using Copernicus DEM 30m slope (> 5 degrees).
  8. Apply speckle filter (focal mean 3×3).
  9. Vectorize the flood mask and export as GeoJSON to Google Drive or Cloud Storage.

Usage:
  python Sentinel1_flood.py \
      --start_flood 2022-08-01 \
      --end_flood 2022-09-15 \
      --output_path ./outputs/flood_extent.geojson

Requirements:
  pip install earthengine-api geojson geopandas
  earthengine authenticate   (first time only)
"""

import argparse
import json
import os
import sys
import logging
from datetime import datetime

import ee
import geojson

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ── Pakistan bounding box ─────────────────────────────────────────────────────
PAKISTAN_BBOX = ee.Geometry.Rectangle([60.87, 23.63, 77.83, 37.09])

# ── Algorithm constants ───────────────────────────────────────────────────────
DIFF_THRESHOLD_DB = -3.0       # dB change threshold for flood detection
SLOPE_THRESHOLD_DEG = 5.0      # Degrees — pixels with slope > this are masked
JRC_OCCURRENCE_THRESHOLD = 80  # % occurrence — permanent water mask


def initialize_gee(service_account: str = None, key_path: str = None):
    """
    Authenticate with Google Earth Engine.
    If service_account + key_path are provided, uses service account auth.
    Otherwise falls back to interactive earthengine authenticate credentials.
    """
    try:
        if service_account and key_path and os.path.exists(key_path):
            credentials = ee.ServiceAccountCredentials(service_account, key_path)
            ee.Initialize(credentials)
            logger.info("GEE initialized with service account: %s", service_account)
        else:
            ee.Initialize()
            logger.info("GEE initialized with default credentials.")
    except Exception as e:
        logger.error("Failed to initialize GEE: %s", e)
        sys.exit(1)


def apply_speckle_filter(image: ee.Image) -> ee.Image:
    """Apply a 3×3 focal mean speckle filter to a SAR image."""
    return image.focal_mean(radius=50, kernelType="circle", units="meters")


def get_s1_collection(start: str, end: str) -> ee.ImageCollection:
    """
    Filter Sentinel-1 GRD collection over Pakistan for a given date range.
    Uses IW (Interferometric Wide) mode, VV polarization, descending orbit.
    """
    return (
        ee.ImageCollection("COPERNICUS/S1_GRD")
        .filterBounds(PAKISTAN_BBOX)
        .filterDate(start, end)
        .filter(ee.Filter.eq("instrumentMode", "IW"))
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
        .filter(ee.Filter.eq("orbitProperties_pass", "DESCENDING"))
        .select("VV")
    )


def get_flood_extent_image(
    start_baseline: str,
    end_baseline: str,
    start_flood: str,
    end_flood: str,
) -> ee.Image:
    """
    Compute the binary flood extent image from Sentinel-1 SAR change detection.

    Returns:
        ee.Image: 1 = flooded, 0 = not flooded
    """
    logger.info("Loading Sentinel-1 collections ...")

    # ── Baseline (pre-flood) image ────────────────────────────────────────────
    baseline_col = get_s1_collection(start_baseline, end_baseline)
    baseline = apply_speckle_filter(baseline_col.mean())

    # ── Flood-period image ────────────────────────────────────────────────────
    flood_col = get_s1_collection(start_flood, end_flood)
    if flood_col.size().getInfo() == 0:
        logger.error(
            "No Sentinel-1 imagery found for flood period %s to %s.",
            start_flood, end_flood,
        )
        sys.exit(1)
    flood_img = apply_speckle_filter(flood_col.mean())

    # ── Change detection (dB difference) ─────────────────────────────────────
    diff = flood_img.subtract(baseline)

    # ── Initial flood mask ────────────────────────────────────────────────────
    flood_mask = diff.lt(DIFF_THRESHOLD_DB)

    # ── Remove permanent water (JRC Global Surface Water) ─────────────────────
    jrc = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence")
    permanent_water = jrc.gt(JRC_OCCURRENCE_THRESHOLD)
    flood_mask = flood_mask.where(permanent_water, 0)

    # ── Remove terrain shadows (Copernicus DEM slope) ─────────────────────────
    dem = ee.ImageCollection("COPERNICUS/DEM/GLO30").filterBounds(PAKISTAN_BBOX).mosaic()
    slope = ee.Terrain.slope(dem)
    steep_terrain = slope.gt(SLOPE_THRESHOLD_DEG)
    flood_mask = flood_mask.where(steep_terrain, 0)

    return flood_mask.rename("flood_extent").clip(PAKISTAN_BBOX)


def vectorize_flood_mask(flood_mask: ee.Image) -> ee.FeatureCollection:
    """Convert the raster flood mask to a vector FeatureCollection."""
    logger.info("Vectorizing flood mask ...")
    return flood_mask.selfMask().reduceToVectors(
        geometry=PAKISTAN_BBOX,
        scale=30,
        geometryType="polygon",
        eightConnected=False,
        labelProperty="flood",
        maxPixels=1e13,
    )


def compute_flood_area_km2(flood_mask: ee.Image) -> float:
    """Compute total flooded area in km²."""
    area_img = flood_mask.multiply(ee.Image.pixelArea())
    area_dict = area_img.reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=PAKISTAN_BBOX,
        scale=30,
        maxPixels=1e13,
    )
    area_m2 = area_dict.get("flood_extent").getInfo() or 0
    return round(area_m2 / 1_000_000, 2)


def export_to_geojson(feature_collection: ee.FeatureCollection, output_path: str):
    """Download a FeatureCollection as a local GeoJSON file."""
    logger.info("Exporting flood extent to GeoJSON ...")
    geojson_dict = feature_collection.getInfo()
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(geojson_dict, f)
    logger.info("Flood extent saved to: %s", output_path)


def run_flood_mapping(
    start_flood: str,
    end_flood: str,
    output_path: str = "./outputs/flood_extent.geojson",
    service_account: str = None,
    key_path: str = None,
    baseline_months: int = 2,
):
    """
    Main entry point for the Sentinel-1 SAR flood mapping pipeline.

    Args:
        start_flood:      Start of flood period (YYYY-MM-DD)
        end_flood:        End of flood period (YYYY-MM-DD)
        output_path:      Local GeoJSON output file path
        service_account:  GEE service account email
        key_path:         Path to GEE service account JSON key
        baseline_months:  Number of months before flood for baseline window
    """
    # ── Initialize GEE ────────────────────────────────────────────────────────
    initialize_gee(service_account, key_path)

    # ── Compute baseline window ───────────────────────────────────────────────
    from dateutil.relativedelta import relativedelta
    flood_start_dt = datetime.strptime(start_flood, "%Y-%m-%d")
    baseline_end_dt = flood_start_dt - relativedelta(days=1)
    baseline_start_dt = baseline_end_dt - relativedelta(months=baseline_months)
    start_baseline = baseline_start_dt.strftime("%Y-%m-%d")
    end_baseline = baseline_end_dt.strftime("%Y-%m-%d")

    logger.info(
        "Baseline window: %s → %s | Flood window: %s → %s",
        start_baseline, end_baseline, start_flood, end_flood,
    )

    # ── Run algorithm ─────────────────────────────────────────────────────────
    flood_mask = get_flood_extent_image(start_baseline, end_baseline, start_flood, end_flood)

    # ── Compute area ──────────────────────────────────────────────────────────
    area_km2 = compute_flood_area_km2(flood_mask)
    logger.info("Total flooded area: %.2f km²", area_km2)

    # ── Vectorize & export ────────────────────────────────────────────────────
    vectors = vectorize_flood_mask(flood_mask)
    export_to_geojson(vectors, output_path)

    return {
        "flooded_area_km2": area_km2,
        "output_path": output_path,
        "flood_period": f"{start_flood} to {end_flood}",
        "baseline_period": f"{start_baseline} to {end_baseline}",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Sentinel-1 SAR Flood Mapping for Pakistan using Google Earth Engine"
    )
    parser.add_argument(
        "--start_flood", required=True, help="Flood period start date (YYYY-MM-DD)"
    )
    parser.add_argument(
        "--end_flood", required=True, help="Flood period end date (YYYY-MM-DD)"
    )
    parser.add_argument(
        "--output_path",
        default="./outputs/flood_extent.geojson",
        help="Output GeoJSON file path",
    )
    parser.add_argument(
        "--service_account",
        default=os.environ.get("GEE_SERVICE_ACCOUNT_EMAIL", ""),
        help="GEE service account email",
    )
    parser.add_argument(
        "--key_path",
        default=os.environ.get("GEE_PRIVATE_KEY_PATH", "./gee_credentials.json"),
        help="Path to GEE service account JSON key file",
    )
    parser.add_argument(
        "--baseline_months",
        type=int,
        default=2,
        help="Number of months before flood period used as baseline (default: 2)",
    )
    args = parser.parse_args()

    result = run_flood_mapping(
        start_flood=args.start_flood,
        end_flood=args.end_flood,
        output_path=args.output_path,
        service_account=args.service_account,
        key_path=args.key_path,
        baseline_months=args.baseline_months,
    )
    print(json.dumps(result, indent=2))
