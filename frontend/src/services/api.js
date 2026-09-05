import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Districts ────────────────────────────────────────────────────────────────
export const getDistricts = (params = {}) =>
  api.get('/districts/', { params }).then(r => r.data)

export const getDistrictImpact = (params = {}) =>
  api.get('/districts/impact', { params }).then(r => r.data)

export const getNationalSummary = () =>
  api.get('/districts/summary').then(r => r.data)

// ── Rivers ───────────────────────────────────────────────────────────────────
export const getRiverStations = (params = {}) =>
  api.get('/rivers/stations', { params }).then(r => r.data)

export const getStationHistory = (id, days = 30) =>
  api.get(`/rivers/stations/${id}/history`, { params: { days } }).then(r => r.data)

export const getStationForecast = (id, days = 16) =>
  api.get(`/rivers/stations/${id}/forecast`, { params: { days } }).then(r => r.data)

export const getFloodAlerts = () =>
  api.get('/rivers/alerts').then(r => r.data)

export const getRiverSummary = () =>
  api.get('/rivers/summary').then(r => r.data)

// ── Flood ────────────────────────────────────────────────────────────────────
export const getLatestFloodExtent = () =>
  api.get('/flood/events/latest').then(r => r.data)

export const getFloodEvents = (params = {}) =>
  api.get('/flood/events', { params }).then(r => r.data)

export const getHazardMap = () =>
  api.get('/flood/hazard-map').then(r => r.data)

export const getRiskMap = () =>
  api.get('/flood/risk-map').then(r => r.data)

export const getFloodBulletins = () =>
  api.get('/flood/bulletins').then(r => r.data)

// ── Weather ──────────────────────────────────────────────────────────────────
export const getAllWeather = () =>
  api.get('/weather/current').then(r => r.data)

export const getCityWeather = (city) =>
  api.get(`/weather/current/${city}`).then(r => r.data)

export const getWeatherForecast = (lat, lon) =>
  api.get('/weather/forecast', { params: { lat, lon } }).then(r => r.data)

export const getAllDischargeForecast = () =>
  api.get('/weather/river-discharge/all').then(r => r.data)

export const getRainfallAlerts = (threshold = 50) =>
  api.get('/weather/alerts/rainfall', { params: { threshold_mm: threshold } }).then(r => r.data)

// ── GEE Live Statistics ───────────────────────────────────────────────────
export const getGEESummary = () =>
  api.get('/gee/summary').then(r => r.data)

export const getGEERainfall = (startDate = null, endDate = null) =>
  api.get('/gee/rainfall', {
    params: { start_date: startDate, end_date: endDate }
  }).then(r => r.data)

export const getGEEHazardIndex = () =>
  api.get('/gee/hazard').then(r => r.data)

// ── GEE Map Tile URLs (Leaflet raster layers) ────────────────────────────────
// These return live TMS tile URL templates that Leaflet loads as raster tile layers.
// GEE processes Sentinel-1 SAR / DEM / WorldPop in the cloud and serves tiles.

/** Fetch a single GEE layer tile URL — 'inundation' | 'hazard' | 'risk' | 'awareness' */
export const getGEETileUrl = (layer) =>
  api.get(`/gee/tiles/${layer}`).then(r => r.data)

/** Preload all 4 GEE layer tile URLs in parallel (called once on app startup). */
export const preloadAllGEETiles = () =>
  api.get('/gee/tiles/all').then(r => r.data)

export default api
