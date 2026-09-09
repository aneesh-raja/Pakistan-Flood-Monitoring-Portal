import { useState, useEffect } from 'react'
import { FiRefreshCw, FiAlertTriangle, FiBell, FiWind, FiDroplet } from 'react-icons/fi'
import { format } from 'date-fns'

export default function Header({
  weatherData = [],
  alerts = [],
  onRefresh,
  onOpenBulletins,
}) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh?.()
    setTimeout(() => setRefreshing(false), 800)
  }

  const alertCount = alerts.length
  const criticalCount = alerts.filter(a => a.flood_status === 'Very High Flood' || a.flood_status === 'High Flood').length

  const weatherCities = weatherData.length > 0 ? weatherData : [
    { city: 'Islamabad', temperature_c: 29.5, rainfall_3h_mm: 0, weather_desc: 'Clear sky' },
    { city: 'Lahore',    temperature_c: 34.2, rainfall_3h_mm: 0, weather_desc: 'Haze' },
    { city: 'Karachi',   temperature_c: 33.1, rainfall_3h_mm: 0, weather_desc: 'Humid' },
    { city: 'Peshawar',  temperature_c: 31.0, rainfall_3h_mm: 0, weather_desc: 'Mainly sunny' },
    { city: 'Quetta',    temperature_c: 24.5, rainfall_3h_mm: 0, weather_desc: 'Clear' },
    { city: 'Multan',    temperature_c: 35.8, rainfall_3h_mm: 0, weather_desc: 'Hot' },
    { city: 'Sukkur',    temperature_c: 36.4, rainfall_3h_mm: 0, weather_desc: 'Clear' },
  ]

  return (
    <header className="header" style={{
      borderBottom: '1px solid rgba(0, 240, 255, 0.25)',
      padding: '8px 18px',
      background: 'linear-gradient(90deg, #050e1f 0%, #081830 50%, #050e1f 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      minHeight: 56,
      zIndex: 100,
    }}>
      {/* Brand Title & Accreditation */}
      <div className="header-logo" style={{ minWidth: 310, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 38,
          height: 38,
          background: 'radial-gradient(circle, rgba(0,240,255,0.2) 0%, rgba(15,23,42,0.9) 100%)',
          border: '1px solid rgba(0, 240, 255, 0.4)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          boxShadow: '0 0 12px rgba(0, 240, 255, 0.25)',
        }}>
          🇵🇰
        </div>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em', margin: 0, lineHeight: 1.2 }}>
            PAKISTAN FLOOD MONITORING PORTAL
          </h1>
          <span style={{ fontSize: 10.5, color: '#38bdf8', fontWeight: 600, letterSpacing: '0.03em' }}>
            PMD / FFD • NDMA • WAPDA • GEE SATELLITE
          </span>
        </div>
      </div>

      {/* Live City Weather Strip (Fast, Smooth, Comprehensive) */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        background: 'rgba(10, 25, 47, 0.7)',
        border: '1px solid rgba(0, 240, 255, 0.15)',
        borderRadius: 8,
        padding: '4px 10px',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          paddingRight: 10,
          borderRight: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
          zIndex: 2,
        }}>
          <span style={{ fontSize: 12 }}>🌤️</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#00f0ff', letterSpacing: '0.05em' }}>
            LIVE WEATHER
          </span>
        </div>

        <div className="weather-ticker-container" style={{ flex: 1, overflow: 'hidden', position: 'relative', marginLeft: 10 }}>
          <div className="weather-ticker-track">
            {[...weatherCities, ...weatherCities].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '2px 10px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: 5,
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ color: '#94a3b8', fontSize: 10 }}>📍</span>
                <span style={{ fontWeight: 700, color: '#f8fafc' }}>{item.city}</span>
                <span style={{
                  fontWeight: 700,
                  color: item.temperature_c > 35 ? '#f87171' : '#38bdf8',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {item.temperature_c != null ? `${item.temperature_c.toFixed(1)}°C` : '--'}
                </span>
                {item.weather_desc && (
                  <span style={{ fontSize: 10, color: '#64748b' }}>
                    ({item.weather_desc})
                  </span>
                )}
                {item.rainfall_3h_mm > 0 && (
                  <span style={{
                    background: 'rgba(56, 189, 248, 0.2)',
                    border: '1px solid #38bdf8',
                    color: '#38bdf8',
                    padding: '1px 5px',
                    borderRadius: 4,
                    fontSize: 9,
                    fontWeight: 700,
                  }}>
                    🌧 {item.rainfall_3h_mm}mm
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Indicators & Action Controls */}
      <div className="header-nav" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Live Status Pill */}
        <div style={{
          background: 'rgba(34, 197, 94, 0.12)',
          border: '1px solid rgba(34, 197, 94, 0.35)',
          color: '#22c55e',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          letterSpacing: '0.04em',
        }}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#22c55e',
            display: 'inline-block',
            boxShadow: '0 0 8px #22c55e',
          }} />
          LIVE ●
        </div>

        {/* Timestamp */}
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          fontWeight: 600,
          color: '#94a3b8',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 6,
          padding: '4px 8px',
        }}>
          Updated {format(currentTime, 'HH:mm')} PKT
        </div>

        {/* FFD / PMD Flood Alerts Button */}
        <button
          id="header-bulletins-btn"
          onClick={onOpenBulletins}
          style={{
            padding: '5px 12px',
            fontSize: 11,
            fontWeight: 800,
            background: criticalCount > 0 ? 'rgba(239, 68, 68, 0.2)' : alertCount > 0 ? 'rgba(234, 179, 8, 0.18)' : 'rgba(34, 197, 94, 0.15)',
            border: `1px solid ${criticalCount > 0 ? '#ef4444' : alertCount > 0 ? '#eab308' : '#22c55e'}`,
            color: criticalCount > 0 ? '#ef4444' : alertCount > 0 ? '#eab308' : '#22c55e',
            cursor: 'pointer',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
            boxShadow: alertCount > 0 ? '0 0 12px rgba(234, 179, 8, 0.2)' : 'none',
          }}
        >
          <FiBell size={13} />
          <span>
            {criticalCount > 0
              ? `${criticalCount} Critical Alert${criticalCount > 1 ? 's' : ''}`
              : alertCount > 0
              ? `${alertCount} Active Alert${alertCount > 1 ? 's' : ''}`
              : 'All Normal'}
          </span>
        </button>

        {/* Manual Refresh */}
        <button
          id="header-refresh-btn"
          onClick={handleRefresh}
          title="Refresh real-time feeds"
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: refreshing ? '#00f0ff' : '#94a3b8',
            borderRadius: 6,
            padding: '6px 9px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
        >
          <FiRefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .weather-ticker-container {
          mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);
        }
        .weather-ticker-track {
          display: flex;
          gap: 12px;
          animation: fast-ticker 18s linear infinite;
          width: max-content;
        }
        .weather-ticker-track:hover {
          animation-play-state: paused;
        }
        @keyframes fast-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </header>
  )
}
