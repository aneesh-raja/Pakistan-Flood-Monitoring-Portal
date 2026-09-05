"""
weather.py
FastAPI router for weather data — current conditions and forecasts.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.services.weather_service import (
    fetch_all_cities_weather,
    fetch_city_weather,
    fetch_weather_forecast,
    fetch_all_river_discharge_forecasts,
    PAKISTAN_CITIES,
)

router = APIRouter()


@router.get("/current", summary="Current weather for all monitored Pakistan cities")
async def get_all_current_weather():
    """
    Returns real-time weather observations for major Pakistan cities from
    OpenWeatherMap. Includes temperature, rainfall, humidity, and wind.
    """
    try:
        data = await fetch_all_cities_weather()
        return {"cities": data, "count": len(data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/current/{city_name}", summary="Current weather for a specific city")
async def get_city_weather(city_name: str):
    """Returns current weather for a specific city by name."""
    try:
        city = next(
            (c for c in PAKISTAN_CITIES if c["name"].lower() == city_name.lower()), None
        )
        if not city:
            available = [c["name"] for c in PAKISTAN_CITIES]
            raise HTTPException(
                status_code=404,
                detail=f"City '{city_name}' not found. Available: {available}",
            )
        return await fetch_city_weather(city)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forecast", summary="5-day rainfall forecast for a location")
async def get_location_forecast(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
):
    """
    Returns a 5-day / 3-hour weather forecast from OpenWeatherMap for any
    lat/lon coordinate over Pakistan.
    """
    try:
        return await fetch_weather_forecast(lat, lon)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/river-discharge/all", summary="Open-Meteo discharge forecasts for all river stations")
async def get_all_discharge_forecasts():
    """
    Returns 16-day river discharge forecasts for all major Pakistan
    river gauge stations using the Open-Meteo Flood API.
    """
    try:
        return await fetch_all_river_discharge_forecasts()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/river-discharge", summary="Discharge forecast for a single coordinate")
async def get_discharge_forecast(
    lat: float = Query(..., description="Latitude of river gauge"),
    lon: float = Query(..., description="Longitude of river gauge"),
    days: int = Query(16, ge=1, le=16, description="Forecast days (1-16)"),
):
    """
    Returns Open-Meteo river discharge forecast for a specific coordinate.
    No API key required.
    """
    try:
        from app.services.weather_service import fetch_open_meteo_flood
        return await fetch_open_meteo_flood(lat, lon, days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/rainfall", summary="Identify districts with extreme rainfall")
async def get_rainfall_alerts(
    threshold_mm: float = Query(50.0, description="Rainfall threshold in mm/3h to trigger alert"),
):
    """
    Cross-references OpenWeatherMap data with Pakistan cities to identify
    areas experiencing extreme rainfall above the alert threshold.
    """
    try:
        all_weather = await fetch_all_cities_weather()
        alerts = []
        for city in all_weather:
            rain_3h = city.get("rainfall_3h_mm", 0) or 0
            if rain_3h >= threshold_mm:
                alerts.append({
                    "city": city["city"],
                    "lat": city["lat"],
                    "lon": city["lon"],
                    "rainfall_3h_mm": rain_3h,
                    "weather_desc": city.get("weather_desc"),
                    "alert_level": "Extreme" if rain_3h >= 100 else "High",
                })
        alerts.sort(key=lambda x: x["rainfall_3h_mm"], reverse=True)
        return {"rainfall_alerts": alerts, "threshold_mm": threshold_mm, "count": len(alerts)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
