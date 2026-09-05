# 🌊 Pakistan Flood Monitoring & Early Warning Portal

A real-time geospatial flood monitoring dashboard for Pakistan, integrating satellite data from **Google Earth Engine (GEE)**, **OpenWeatherMap**, **Open-Meteo GloFAS Flood API**, **Leaflet**, and **Supabase PostGIS**.

---

## 📸 Features & Capabilities

- **Inundation Map** — Live Sentinel-1 SAR change detection (last 30-day window) with multi-depth zone bands (Shallow / Medium / Deep).
- **Flood Hazard Map** — Copernicus DEM elevation + terrain slope + JRC historical flood occurrence composite heatmap (0–100 scale).
- **Flood Risk Map** — Socio-economic risk combining physical hazard × WorldPop population density.
- **NDMA Awareness Map** — 5-class NDMA early warning alert levels (Normal → Advisory → Warning → Emergency → Critical).
- **Interactive River Telemetry Pins** — Real-time discharge for key Indus Basin river stations (Tarbela Dam, Sukkur, Guddu, Kotri, Taunsa, Mangla, Marala, Nowshera).
- **7-Day Barrage Forecast & 14-Day History Charts** — Recharts line graph modal driven by Open-Meteo GloFAS discharge forecasts and telemetry height trends.
- **Automated PDF Situation Report** — 1-click PDF download with KPIs, active alerts table, district rankings, and weather forecasts.
- **Supabase Historical Comparison** — Event comparison panel contrasting current conditions against past catastrophes (2019–2022 flood seasons).

---

## 🗂️ Project Structure

```
flood-monitoring-dashboard/
├── backend/           # FastAPI + GEE Python SDK (Sentinel-1, DEM, JRC, WorldPop, CHIRPS)
├── frontend/          # React + Vite + Leaflet + Recharts + jsPDF
├── scripts/           # Supabase schema SQL & seeding scripts
├── start.bat          # 1-Click Windows Launcher for Backend + Frontend
├── .env               # Environment configuration
└── README.md
```

---

## ⚡ 1-Click Fast Launch (Windows)

Simply double-click **`start.bat`** in the project root folder.
It will automatically launch:
1. **FastAPI Backend** on `http://localhost:8000` (API Docs at `http://localhost:8000/docs`)
2. **Vite React Frontend** on `http://localhost:5173`

---

## 🔑 Required Credentials (`.env`)

| Service | Purpose | Where to Get |
|---|---|---|
| **Google Earth Engine** | Satellite SAR, DEM, JRC, WorldPop tile processing | `gee_credentials.json` Service Account |
| **OpenWeatherMap API** | City weather ticker & rainfall forecasts | https://openweathermap.org/api |
| **Supabase PostGIS** | Telemetry database & historical readings | https://supabase.com/ |
| **Open-Meteo GloFAS** | River discharge ensemble forecasts | Open API (No key required) |

---

## 🌍 Satellite & Hydrological Datasets

| Dataset | Source | Purpose | Update Frequency |
|---|---|---|---|
| Sentinel-1 SAR | GEE / ESA Copernicus | Flood inundation extent & backscatter drop | ~6 days |
| CHIRPS Daily Rainfall | UCSB CHG / GEE | District precipitation totals | Daily |
| Copernicus DEM 30m | ESA / GEE | Elevation & terrain slope hazard factor | Static |
| JRC Global Surface Water | EC JRC / GEE | Permanent water mask & flood frequency | Annual |
| WorldPop Population | WorldPop / GEE | Population exposure & risk modeling | Annual |
| River Discharge | Open-Meteo GloFAS | 7 to 16-day barrage streamflow forecast | Daily |
| City Weather | OpenWeatherMap API | Live temperature, humidity, and rainfall | Live |

