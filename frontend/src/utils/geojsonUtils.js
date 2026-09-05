// geojsonUtils.js — Utility functions for map layer styling & data thresholds

// ── Risk / Hazard Color Scales ────────────────────────────────────────────────
export const RISK_COLORS = {
  Low:      '#22c55e',
  Moderate: '#eab308',
  High:     '#f97316',
  Severe:   '#dc2626',
}

export const FLOOD_STATUS_COLORS = {
  Normal:          '#22c55e',
  'Low Flood':     '#eab308',
  'Medium Flood':  '#f97316',
  'High Flood':    '#ef4444',
  'Very High Flood': '#7c3aed',
}

export const HAZARD_GRADIENT = [
  [0,   '#1e3a5f'],
  [25,  '#1d6fa4'],
  [50,  '#f59e0b'],
  [75,  '#ef4444'],
  [100, '#7c3aed'],
]

// ── Map Paint Expressions (Mapbox GL style expressions) ──────────────────────
export const districtRiskFillColor = [
  'match',
  ['get', 'risk_score'],
  'Low',      RISK_COLORS.Low,
  'Moderate', RISK_COLORS.Moderate,
  'High',     RISK_COLORS.High,
  'Severe',   RISK_COLORS.Severe,
  '#64748b',
]

export const districtHazardFillColor = [
  'interpolate',
  ['linear'],
  ['get', 'hazard_score'],
  0,   '#1e3a5f',
  25,  '#1d6fa4',
  50,  '#f59e0b',
  75,  '#ef4444',
  100, '#7c3aed',
]

export const riverStationCircleColor = [
  'match',
  ['get', 'flood_status'],
  'Normal',            '#22c55e',
  'Low Flood',         '#eab308',
  'Medium Flood',      '#f97316',
  'High Flood',        '#ef4444',
  'Very High Flood',   '#7c3aed',
  '#94a3b8',
]

// ── Number Formatters ─────────────────────────────────────────────────────────
export const formatPopulation = (n) => {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export const formatArea = (km2) => {
  if (!km2) return '0 km²'
  return `${Number(km2).toLocaleString(undefined, { maximumFractionDigits: 1 })} km²`
}

export const formatDischarge = (cusecs) => {
  if (!cusecs) return '0'
  if (cusecs >= 1_000_000) return `${(cusecs / 1_000_000).toFixed(2)}M cusecs`
  if (cusecs >= 1_000)     return `${(cusecs / 1_000).toFixed(1)}K cusecs`
  return `${cusecs} cusecs`
}

// ── Flood Status Helpers ──────────────────────────────────────────────────────
export const getFloodStatusBadgeClass = (status) => {
  const map = {
    'Normal':           'badge-normal',
    'Low Flood':        'badge-low',
    'Medium Flood':     'badge-medium',
    'High Flood':       'badge-high',
    'Very High Flood':  'badge-critical',
  }
  return map[status] || 'badge-normal'
}

export const getRiskClass = (score) => {
  if (score >= 70) return 'Severe'
  if (score >= 50) return 'High'
  if (score >= 30) return 'Moderate'
  return 'Low'
}

// ── Map Layer IDs ─────────────────────────────────────────────────────────────
export const LAYER_IDS = {
  INUNDATION:    'flood-inundation-fill',
  HAZARD:        'district-hazard-fill',
  RISK:          'district-risk-fill',
  AWARENESS:     'district-awareness-fill',
  RIVERS:        'river-stations-circle',
  DISTRICT_LINE: 'district-outline',
}

export const SOURCE_IDS = {
  INUNDATION: 'flood-inundation',
  DISTRICTS:  'pakistan-districts',
  RIVERS:     'river-stations',
}
