"""
config.py
Loads all environment variables / API credentials for the FastAPI app.
"""
from pydantic_settings import BaseSettings
from typing import List


import os

class Settings(BaseSettings):
    # ── Google Earth Engine ──────────────────────────────────
    GEE_SERVICE_ACCOUNT_EMAIL: str = ""
    GEE_PRIVATE_KEY_PATH: str = "./gee_credentials.json"
    GEE_PROJECT_ID: str = ""

    # ── Supabase ─────────────────────────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # ── OpenWeatherMap ────────────────────────────────────────
    OPENWEATHER_API_KEY: str = ""

    # ── Open-Meteo Flood API (no key required) ────────────────
    OPEN_METEO_FLOOD_BASE_URL: str = "https://flood-api.open-meteo.com/v1/flood"

    # ── FastAPI Settings ──────────────────────────────────────
    FASTAPI_HOST: str = "0.0.0.0"
    FASTAPI_PORT: int = 8000
    FASTAPI_RELOAD: bool = True

    # ── CORS ──────────────────────────────────────────────────
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    def get_allowed_origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = (
            os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
            ".env",
        )
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

