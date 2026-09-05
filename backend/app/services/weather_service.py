"""
weather_service.py
Fetches real-time weather data from OpenWeatherMap and Open-Meteo Flood API
for major Pakistan cities/river stations.
"""
import httpx
from typing import List, Dict, Any
from app.config import settings

# Key cities and river gauge reference points in Pakistan
PAKISTAN_CITIES = [
    {"name": "Karachi",    "lat": 24.8607, "lon": 67.0011},
    {"name": "Lahore",     "lat": 31.5497, "lon": 74.3436},
    {"name": "Islamabad",  "lat": 33.6844, "lon": 73.0479},
    {"name": "Peshawar",   "lat": 34.0151, "lon": 71.5249},
    {"name": "Quetta",     "lat": 30.1798, "lon": 66.9750},
    {"name": "Multan",     "lat": 30.1575, "lon": 71.5249},
    {"name": "Sukkur",     "lat": 27.7052, "lon": 68.8574},
    {"name": "Hyderabad",  "lat": 25.3960, "lon": 68.3578},
    {"name": "Faisalabad", "lat": 31.4504, "lon": 73.1350},
    {"name": "Rawalpindi", "lat": 33.5651, "lon": 73.0169},
]

# Open-Meteo Flood API coordinates (Indus River Basin main gauges)
RIVER_GAUGE_COORDS = [
    {"name": "Tarbela",   "lat": 33.99, "lon": 72.73, "river": "Indus"},
    {"name": "Kalabagh",  "lat": 32.96, "lon": 71.56, "river": "Indus"},
    {"name": "Chashma",   "lat": 32.45, "lon": 71.38, "river": "Indus"},
    {"name": "Taunsa",    "lat": 30.70, "lon": 70.85, "river": "Indus"},
    {"name": "Guddu",     "lat": 28.43, "lon": 69.70, "river": "Indus"},
    {"name": "Sukkur",    "lat": 27.70, "lon": 68.86, "river": "Indus"},
    {"name": "Kotri",     "lat": 25.37, "lon": 68.31, "river": "Indus"},
    {"name": "Marala",    "lat": 32.68, "lon": 74.47, "river": "Chenab"},
    {"name": "Trimmu",    "lat": 31.14, "lon": 72.14, "river": "Chenab"},
    {"name": "Rasul",     "lat": 32.69, "lon": 73.56, "river": "Jhelum"},
    {"name": "Balloki",   "lat": 31.23, "lon": 73.87, "river": "Ravi"},
    {"name": "Islam",     "lat": 29.82, "lon": 70.95, "river": "Sutlej"},
]


import asyncio

async def fetch_city_weather_client(client: httpx.AsyncClient, city: Dict[str, Any]) -> Dict[str, Any]:
    """Fetch current weather for a single city using a shared httpx client."""
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": city["lat"],
        "lon": city["lon"],
        "appid": settings.OPENWEATHER_API_KEY,
        "units": "metric",
    }
    try:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        return {
            "city": city["name"],
            "lat": city["lat"],
            "lon": city["lon"],
            "temperature_c": data["main"]["temp"],
            "feels_like_c": data["main"]["feels_like"],
            "humidity_pct": data["main"]["humidity"],
            "pressure_hpa": data["main"]["pressure"],
            "weather_desc": data["weather"][0]["description"],
            "weather_icon": data["weather"][0]["icon"],
            "wind_speed_ms": data["wind"]["speed"],
            "wind_direction_deg": data["wind"].get("deg", 0),
            "rainfall_1h_mm": data.get("rain", {}).get("1h", 0),
            "rainfall_3h_mm": data.get("rain", {}).get("3h", 0),
            "visibility_m": data.get("visibility", 0),
            "cloudiness_pct": data["clouds"]["all"],
        }
    except Exception as e:
        return {"city": city["name"], "error": str(e), "rainfall_3h_mm": 0, "temperature_c": 28.0}


async def fetch_city_weather(city: Dict[str, Any]) -> Dict[str, Any]:
    """Fetch current weather for a single city from OpenWeatherMap API."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        return await fetch_city_weather_client(client, city)


async def fetch_all_cities_weather() -> List[Dict[str, Any]]:
    """Fetch current weather for all monitored Pakistan cities concurrently."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        tasks = [fetch_city_weather_client(client, city) for city in PAKISTAN_CITIES]
        return await asyncio.gather(*tasks)


async def fetch_weather_forecast(lat: float, lon: float) -> Dict[str, Any]:
    """Fetch 5-day / 3-hour weather forecast from OpenWeatherMap."""
    url = "https://api.openweathermap.org/data/2.5/forecast"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": settings.OPENWEATHER_API_KEY,
        "units": "metric",
        "cnt": 40,  # 5 days × 8 3-hour slots
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        forecast_list = []
        for item in data["list"]:
            forecast_list.append({
                "datetime": item["dt_txt"],
                "temp_c": item["main"]["temp"],
                "rainfall_3h_mm": item.get("rain", {}).get("3h", 0),
                "weather_desc": item["weather"][0]["description"],
                "weather_icon": item["weather"][0]["icon"],
                "humidity_pct": item["main"]["humidity"],
                "wind_speed_ms": item["wind"]["speed"],
            })
        return {
            "city": data["city"]["name"],
            "lat": lat,
            "lon": lon,
            "forecast": forecast_list,
        }


async def fetch_open_meteo_flood(lat: float, lon: float, days: int = 16) -> Dict[str, Any]:
    """
    Fetch river discharge forecast from Open-Meteo Flood API.
    No API key required. Returns up to 16-day forecast.
    """
    url = settings.OPEN_METEO_FLOOD_BASE_URL
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "river_discharge",
        "forecast_days": days,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        dates = data.get("daily", {}).get("time", [])
        discharges = data.get("daily", {}).get("river_discharge", [])
        return {
            "lat": lat,
            "lon": lon,
            "discharge_forecast": [
                {"date": d, "discharge_m3s": q}
                for d, q in zip(dates, discharges)
            ],
        }


async def fetch_all_river_discharge_forecasts() -> List[Dict[str, Any]]:
    """Fetch discharge forecasts for all major river gauge stations."""
    results = []
    for gauge in RIVER_GAUGE_COORDS:
        try:
            forecast = await fetch_open_meteo_flood(gauge["lat"], gauge["lon"])
            forecast["station_name"] = gauge["name"]
            forecast["river"] = gauge["river"]
            results.append(forecast)
        except Exception as e:
            results.append({
                "station_name": gauge["name"],
                "river": gauge["river"],
                "error": str(e),
            })
    return results
