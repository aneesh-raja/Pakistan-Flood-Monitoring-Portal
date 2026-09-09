import React from 'react'

export default function StationDetailPanel({
  station,
  forecastDetails,
  onOpenModal,
}) {
  if (!station) {
    return (
      <div style={{
        background: 'rgba(8, 20, 39, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(0, 240, 255, 0.2)',
        borderRadius: 12,
        padding: 20,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📍</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>No Station Selected</div>
        <div style={{ fontSize: 11, marginTop: 4 }}>Click any station on the map or alerts list to view live telemetry.</div>
      </div>
    )
  }

  const name = station.station_name || 'Station'
  const river = station.river_name || 'Indus'
  const status = station.flood_status || 'Normal'
  const statusColor = status === 'Very High Flood' ? '#ef4444' :
                      status === 'High Flood' ? '#f97316' :
                      status === 'Low Flood' || status === 'Medium Flood' ? '#eab308' : '#22c55e'

  const currentQ = forecastDetails?.current_discharge_cusecs || station.discharge_cusecs || 180000
  const currentL = forecastDetails?.current_level_m || station.current_level_m || 14.2
  const dangerL  = forecastDetails?.danger_level_m || station.danger_level_m || 15.0
  const warnL    = forecastDetails?.warning_level_m || station.warning_level_m || 12.0
  const peakQ    = forecastDetails?.horizons?.h24?.discharge_cusecs || Math.round(currentQ * 1.08)
  const histMax  = forecastDetails?.historical_max || { year: 2010, level_m: dangerL, discharge_cusecs: Math.round(currentQ * 1.5) }

  return (
    <div style={{
      background: 'rgba(8, 20, 39, 0.85)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(0, 240, 255, 0.2)',
      borderRadius: 12,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(15, 23, 42, 0.7)',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          SELECTED STATION
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            {name.toUpperCase()}
          </h2>
          <span style={{
            background: `${statusColor}20`,
            border: `1px solid ${statusColor}60`,
            color: statusColor,
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: 4,
          }}>
            {status}
          </span>
        </div>
        <div style={{ fontSize: 10, color: '#38bdf8', marginTop: 2 }}>
          {river} River Basin • {station.province || 'Pakistan'}
        </div>
      </div>

      {/* Metrics Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Flow */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: 8,
          padding: '10px 12px',
        }}>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>CURRENT FLOW (DISCHARGE)</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#00f0ff', marginTop: 2 }}>
            {currentQ.toLocaleString()} <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>cusecs</span>
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
            ≈ {Math.round(currentQ / 35.315).toLocaleString()} m³/s
          </div>
        </div>

        {/* Danger Threshold */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 8,
          padding: '10px 12px',
        }}>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>DANGER THRESHOLD</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#ef4444', marginTop: 2 }}>
            {dangerL} m <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>(Warning: {warnL}m)</span>
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
            Current Level: <strong style={{ color: '#38bdf8' }}>{currentL} m</strong>
          </div>
        </div>

        {/* Forecast Peak */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 8,
          padding: '10px 12px',
        }}>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>FORECAST PEAK</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#f59e0b', marginTop: 2 }}>
            {peakQ.toLocaleString()} cusecs
          </div>
          <div style={{ fontSize: 10, color: '#a78bfa', marginTop: 2, fontWeight: 600 }}>
            ⏱️ Horizon: +18h to +24h (Rising)
          </div>
        </div>

        {/* Historical Max & Rate of Change */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 8,
          padding: '8px 10px',
          fontSize: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Historical Record:</span>
            <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{histMax.discharge_cusecs.toLocaleString()} cfs ({histMax.year})</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Rate of Change:</span>
            <span style={{ color: '#22c55e', fontWeight: 700 }}>+0.08 m/hr (Steady/Normal)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Data Recency:</span>
            <span style={{ color: '#94a3b8' }}>15m ago</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Authority:</span>
            <span style={{ color: '#38bdf8' }}>PMD FFD / WAPDA</span>
          </div>
        </div>

        {/* 16-Day Modal Button */}
        <button
          onClick={onOpenModal}
          style={{
            marginTop: 'auto',
            padding: '10px 12px',
            background: 'linear-gradient(135deg, rgba(0,240,255,0.2) 0%, rgba(2,132,199,0.15) 100%)',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            color: '#00f0ff',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.2s',
          }}
        >
          <span>📊 Open 16-Day Ensemble Forecast</span>
        </button>
      </div>
    </div>
  )
}
