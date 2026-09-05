"""
districts.py
FastAPI router for Pakistan district boundaries and flood risk statistics.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from app.services.supabase_client import supabase

router = APIRouter()


@router.get("/", summary="Get all Pakistan districts with flood risk scores")
async def get_districts(
    province: Optional[str] = Query(None, description="Filter by province name"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level: Low, Moderate, High, Severe"),
):
    """
    Returns all Pakistan districts with their administrative boundaries
    (as GeoJSON geometries) and current flood risk metadata.
    """
    try:
        query = supabase.table("districts").select("*")
        if province:
            query = query.eq("province", province)
        response = query.execute()

        if not response.data:
            return {"type": "FeatureCollection", "features": []}

        features = []
        for d in response.data:
            feature = {
                "type": "Feature",
                "id": d["id"],
                "geometry": d.get("geom"),
                "properties": {
                    "id": d["id"],
                    "name_en": d.get("name_en"),
                    "province": d.get("province"),
                    "total_population": d.get("total_population"),
                    "total_buildings": d.get("total_buildings"),
                    "area_sqkm": d.get("area_sqkm"),
                    "hazard_score": d.get("hazard_score"),
                    "hazard_class": d.get("hazard_class"),
                },
            }
            if risk_level and d.get("hazard_class") != risk_level:
                continue
            features.append(feature)

        return {"type": "FeatureCollection", "features": features}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/impact", summary="Get district-wise current flood impact statistics")
async def get_district_impact(
    event_id: Optional[str] = Query(None, description="Filter by specific flood event ID"),
    province: Optional[str] = Query(None, description="Filter by province name"),
    min_risk: Optional[str] = Query(None, description="Minimum risk level threshold"),
):
    """
    Returns district-level flood impact metrics including affected population,
    building counts, inundated area, and risk classification.
    """
    try:
        query = supabase.table("district_flood_impact").select(
            "*, districts(name_en, province, total_population, total_buildings)"
        )
        if event_id:
            query = query.eq("event_id", event_id)

        response = query.execute()

        if not response.data:
            return {"districts": []}

        results = []
        for row in response.data:
            district_info = row.get("districts", {}) or {}
            if province and district_info.get("province") != province:
                continue

            results.append({
                "id": row["id"],
                "event_id": row.get("event_id"),
                "district_id": row.get("district_id"),
                "district_name": district_info.get("name_en", "Unknown"),
                "province": district_info.get("province", "Unknown"),
                "affected_population": row.get("affected_population", 0),
                "affected_buildings_count": row.get("affected_buildings_count", 0),
                "inundated_sqkm": row.get("inundated_sqkm", 0),
                "risk_score": row.get("risk_score", "Low"),
                "total_population": district_info.get("total_population", 0),
                "total_buildings": district_info.get("total_buildings", 0),
            })

        results.sort(key=lambda x: x.get("affected_population", 0), reverse=True)
        return {"districts": results, "count": len(results)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary", summary="National-level aggregate flood impact summary")
async def get_national_summary():
    """
    Returns aggregated national-level flood statistics including:
    total affected area, total population at risk, and total buildings at risk.
    """
    try:
        response = supabase.table("district_flood_impact").select(
            "affected_population, affected_buildings_count, inundated_sqkm, risk_score"
        ).execute()

        data = response.data or []
        total_pop = sum(d.get("affected_population", 0) for d in data)
        total_buildings = sum(d.get("affected_buildings_count", 0) for d in data)
        total_area = sum(d.get("inundated_sqkm", 0) for d in data)
        severe_districts = sum(1 for d in data if d.get("risk_score") == "Severe")
        high_districts = sum(1 for d in data if d.get("risk_score") == "High")

        return {
            "total_affected_population": total_pop,
            "total_buildings_at_risk": total_buildings,
            "total_inundated_area_sqkm": round(total_area, 2),
            "districts_at_severe_risk": severe_districts,
            "districts_at_high_risk": high_districts,
            "total_affected_districts": len(data),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
