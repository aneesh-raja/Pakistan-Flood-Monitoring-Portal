/**
 * LayerControl.jsx
 * Multi-layer interactive checkbox control panel supporting 13 vector & raster layers.
 */
import { useState } from 'react'

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

const VECTOR_LAYERS = [
  { id: 'stations',       label: 'Flood Stations',        icon: '📍', desc: 'River telemetry gauges' },
  { id: 'rivers',         label: 'Rivers',                icon: '🌊', desc: 'Major river channels' },
  { id: 'barrages',       label: 'Barrages',              icon: '🏗️', desc: 'Water control barrages' },
  { id: 'dams',           label: 'Dams',                  icon: '🧱', desc: 'Tarbela & Mangla reservoirs' },
  { id: 'districts',      label: 'District Boundaries',   icon: '🏙️', desc: '160+ Pakistan districts' },
  { id: 'provinces',      label: 'Province Boundaries',   icon: '🗺️', desc: 'Provincial outlines' },
  { id: 'infrastructure', label: 'Critical Infrastructure',icon: '🌉', desc: 'Bridges, roads & power plants' },
  { id: 'evacuation',     label: 'Evacuation Areas',      icon: '⛺', desc: 'Relief camps & safe shelters' },
]

const RASTER_LAYERS = [
  { id: 'inundation', label: 'Flood Inundation', desc: 'GEE Sentinel-1 SAR depth map', icon: '💧', color: '#00f0ff' },
  { id: 'rainfall',   label: 'Rainfall',         desc: 'GEE CHIRPS daily precipitation', icon: '🌧️', color: '#3b82f6' },
  { id: 'radar',      label: 'Weather Radar',    desc: 'Live cloud & rainfall radar',  icon: '📡', color: '#a855f7' },
  { id: 'population', label: 'Population Density',desc: 'GEE WorldPop population grid',icon: '👥', color: '#ef4444' },
  { id: 'satellite',  label: 'Satellite Basemap',desc: 'High-resolution satellite view',icon: '🛰️', color: '#10b981' },
]

export default function LayerControl({ activeLayers = {}, onToggleLayer }) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div style={{
      position: 'absolute', top: 14, left: 14, zIndex: 1000,
      background: 'rgba(8, 20, 39, 0.92)', backdropFilter: 'blur(14px)',
      border: '1px solid rgba(0, 240, 255, 0.25)', borderRadius: 12,
      width: 250, boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
      overflow: 'hidden', transition: 'all 0.3s ease',
    }}>
      {/* Panel Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '10px 14px', background: 'rgba(15, 23, 42, 0.8)',
          borderBottom: isOpen ? '1px solid rgba(255,255,255,0.1)' : 'none',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🗺️</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#00f0ff', letterSpacing: '0.04em' }}>
            MAP LAYERS CONTROL
          </span>
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {/* Checkbox Options List */}
      {isOpen && (
        <div style={{ padding: 10, maxHeight: '65vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Vector & Marker Group */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6, paddingLeft: 4 }}>
              FEATURES & BOUNDARIES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {VECTOR_LAYERS.map(l => {
                const checked = Boolean(activeLayers[l.id])
                return (
                  <label
                    key={l.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
                      borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
                      background: checked ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleLayer(l.id)}
                      style={{ accentColor: '#00f0ff', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 13 }}>{l.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: checked ? 700 : 500, color: checked ? '#f8fafc' : '#94a3b8' }}>
                        {l.label}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

          {/* Raster & Satellite Overlays */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6, paddingLeft: 4 }}>
              SATELLITE & RASTER OVERLAYS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {RASTER_LAYERS.map(l => {
                const checked = Boolean(activeLayers[l.id])
                return (
                  <label
                    key={l.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
                      borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
                      background: checked ? `${l.color}18` : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleLayer(l.id)}
                      style={{ accentColor: l.color, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 13 }}>{l.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: checked ? 700 : 500, color: checked ? '#f8fafc' : '#94a3b8' }}>
                        {l.label}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
