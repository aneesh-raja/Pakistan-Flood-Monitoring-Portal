import React from 'react'

export const DEFAULT_LAYERS = {
  stations: true,
  rivers: true,
  barrages: true,
  dams: true,
  districts: true,
  provinces: true,
  inundation: false,
  rainfall: false,
  radar: false,
  satellite: true,
  population: false,
  infrastructure: false,
  evacuation: false,
}

const VECTOR_BUTTONS = [
  { id: 'stations',       label: 'Stations',    icon: '📍', color: '#00f0ff' },
  { id: 'rivers',         label: 'Rivers',      icon: '🌊', color: '#38bdf8' },
  { id: 'barrages',       label: 'Barrages',    icon: '🏗️', color: '#06b6d4' },
  { id: 'dams',           label: 'Dams',        icon: '🧱', color: '#f59e0b' },
  { id: 'districts',      label: 'Districts',   icon: '🏙️', color: '#a855f7' },
  { id: 'infrastructure', label: 'Bridges/Roads', icon: '🌉', color: '#ec4899' },
  { id: 'evacuation',     label: 'Shelters',    icon: '⛺', color: '#10b981' },
]

const RASTER_BUTTONS = [
  { id: 'inundation', label: 'SAR Flood Extent', icon: '💧', color: '#22c55e' },
  { id: 'rainfall',   label: 'Rainfall / Hazard', icon: '🌧️', color: '#38bdf8' },
  { id: 'radar',      label: 'Weather Radar',    icon: '📡', color: '#c084fc' },
  { id: 'population', label: 'Population Risk',  icon: '👥', color: '#ef4444' },
  { id: 'satellite',  label: 'Satellite Base',   icon: '🛰️', color: '#6ee7b7' },
]

export default function LayerToolbar({
  activeLayers = {},
  onToggleLayer,
}) {
  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(10, 22, 40, 0.98) 0%, rgba(5, 12, 24, 0.99) 100%)',
      backdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(0, 240, 255, 0.25)',
      borderRadius: '0 0 12px 12px',
      padding: '8px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      zIndex: 10,
    }}>
      {/* Row 1: Vector Features & Telemetry */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 9,
          fontWeight: 800,
          color: '#64748b',
          letterSpacing: '0.06em',
          minWidth: 70,
          textTransform: 'uppercase',
        }}>
          Gauges & Layers
        </span>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
          {VECTOR_BUTTONS.map((btn) => {
            const isActive = Boolean(activeLayers[btn.id])
            return (
              <button
                key={btn.id}
                id={`toolbar-btn-${btn.id}`}
                onClick={() => onToggleLayer?.(btn.id)}
                style={{
                  background: isActive ? `${btn.color}22` : 'rgba(15, 23, 42, 0.65)',
                  border: `1px solid ${isActive ? btn.color : 'rgba(255, 255, 255, 0.12)'}`,
                  color: isActive ? '#f8fafc' : '#94a3b8',
                  borderRadius: 5,
                  padding: '3px 8px',
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? `0 0 8px ${btn.color}35` : 'none',
                }}
              >
                <span style={{ fontSize: 11 }}>{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Row 2: Satellite, Radar & Environmental Overlays */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 5 }}>
        <span style={{
          fontSize: 9,
          fontWeight: 800,
          color: '#00f0ff',
          letterSpacing: '0.06em',
          minWidth: 70,
          textTransform: 'uppercase',
        }}>
          Overlays & Radar
        </span>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
          {RASTER_BUTTONS.map((btn) => {
            const isActive = Boolean(activeLayers[btn.id])
            return (
              <button
                key={btn.id}
                id={`toolbar-btn-${btn.id}`}
                onClick={() => onToggleLayer?.(btn.id)}
                style={{
                  background: isActive ? `${btn.color}26` : 'rgba(15, 23, 42, 0.65)',
                  border: `1px solid ${isActive ? btn.color : 'rgba(255, 255, 255, 0.12)'}`,
                  color: isActive ? '#f8fafc' : '#94a3b8',
                  borderRadius: 5,
                  padding: '3px 8px',
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? `0 0 8px ${btn.color}35` : 'none',
                }}
              >
                <span style={{ fontSize: 11 }}>{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
