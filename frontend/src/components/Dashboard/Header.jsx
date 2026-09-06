import { useState, useEffect } from 'react'
import { FiRefreshCw, FiAlertTriangle, FiRadio } from 'react-icons/fi'
import { WiThunderstorm } from 'react-icons/wi'
import { format } from 'date-fns'

export default function Header({ weatherData = [], alerts = [], onRefresh, onOpenBulletins }) {
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
  const statusColor = alertCount > 3 ? '#ef4444' : alertCount > 0 ? '#eab308' : '#22c55e'

  const tickerItems = weatherData.map(w => ({
        city: w.city,
        temp: w.temperature_c,
        rain: w.rainfall_3h_mm,
        desc: w.weather_desc,
      }))

  return (
    <header className="header">
      {/* Logo */}
      <div className="header-logo">
        <div className="header-logo-icon">🌊</div>
        <div>
          <h1>Pakistan Flood Monitoring Portal</h1>
          <span>Real-Time Flood Early Warning System</span>
        </div>
      </div>

      {/* Weather Ticker */}
      <div className="header-ticker">
        <div className="ticker-wrap" style={{ flex: 1, overflow: 'hidden' }}>
          <div className="ticker-content">
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span key={i} className="ticker-item">
                <span style={{ color: 'var(--text-muted)', marginRight: 2 }}>📍</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.city}</span>
                {item.temp != null && (
                  <span>{item.temp?.toFixed(1)}°C</span>
                )}
                {item.rain > 0 && (
                  <span className="badge badge-medium" style={{ fontSize: 9 }}>
                    🌧 {item.rain}mm/3h
                  </span>
                )}
                {item.status && (
                  <span
                    className={`badge badge-${item.status === 'Normal' ? 'normal' : item.status === 'Low Flood' ? 'low' : item.status === 'Medium Flood' ? 'medium' : 'high'}`}
                    style={{ fontSize: 9 }}
                  >
                    {item.status}
                  </span>
                )}
                <span style={{ color: 'var(--border)', userSelect: 'none' }}>│</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Nav badges */}
      <div className="header-nav">
        {alertCount > 0 && (
          <div className="header-badge" style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}>
            <FiAlertTriangle size={11} />
            {alertCount} Flood Alert{alertCount > 1 ? 's' : ''}
          </div>
        )}

        <div className="header-badge live">
          <div className="live-dot" />
          LIVE
        </div>

        <div className="header-badge" style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>
          {format(currentTime, 'HH:mm:ss')} PKT
        </div>

        <button
          onClick={onOpenBulletins}
          className="btn btn-secondary"
          style={{
            padding: '5px 12px', fontSize: 11, fontWeight: 700,
            background: 'rgba(0,240,255,0.12)', border: '1px solid rgba(0,240,255,0.4)',
            color: '#00f0ff', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span>📢 Bulletins & Alerts</span>
        </button>

        <button
          id="header-refresh-btn"
          className="btn btn-ghost"
          style={{ padding: '5px 10px' }}
          onClick={handleRefresh}
          title="Refresh all data"
        >
          <FiRefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </header>
  )
}
