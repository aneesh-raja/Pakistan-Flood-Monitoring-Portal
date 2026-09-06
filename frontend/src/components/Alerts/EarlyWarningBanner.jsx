const STATUS_CONFIG = {
  'Very High Flood': { emoji: '🔴', variant: 'critical', bgColor: 'rgba(124,58,237,0.12)', borderColor: 'rgba(124,58,237,0.4)' },
  'High Flood':      { emoji: '🟠', variant: 'high',     bgColor: 'rgba(239,68,68,0.1)',    borderColor: 'rgba(239,68,68,0.4)' },
  'Medium Flood':    { emoji: '🟡', variant: 'medium',   bgColor: 'rgba(249,115,22,0.1)',   borderColor: 'rgba(249,115,22,0.35)' },
  'Low Flood':       { emoji: '🟢', variant: 'low',      bgColor: 'rgba(234,179,8,0.08)',   borderColor: 'rgba(234,179,8,0.35)' },
}

export default function EarlyWarningBanner({ alerts = [] }) {
  const data = alerts

  if (!data.length) {
    return (
      <div className="alert-banner" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.3)' }}>
        <span className="alert-banner-icon">✅</span>
        <div className="alert-banner-body">
          <div className="alert-banner-title" style={{ color: '#22c55e' }}>All Rivers Normal</div>
          <div className="alert-banner-desc">No active flood alerts at this time.</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="panel-title" style={{ marginBottom: 6 }}>
        🚨 Verified Flood Alerts ({data.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.slice(0, 5).map((alert, i) => {
          const config = STATUS_CONFIG[alert.flood_status] || STATUS_CONFIG['Low Flood']
          const overDanger = alert.current_level_m && alert.danger_level_m
            ? (alert.current_level_m - alert.danger_level_m).toFixed(1)
            : null

          return (
            <div
              key={alert.id || i}
              className="alert-banner"
              id={`alert-${alert.id || i}`}
              style={{ background: config.bgColor, borderColor: config.borderColor }}
            >
              <span className="alert-banner-icon">{config.emoji}</span>
              <div className="alert-banner-body">
                <div className="alert-banner-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {alert.station_name}
                  <span className={`badge badge-${config.variant}`} style={{ fontSize: 9 }}>
                    {alert.flood_status}
                  </span>
                </div>
                <div className="alert-banner-desc">
                  {alert.river_name} • {alert.province}
                  {overDanger > 0 && (
                    <span style={{ color: '#ef4444', fontWeight: 600, marginLeft: 6 }}>
                      +{overDanger}m above danger
                    </span>
                  )}
                  {alert.discharge_cusecs && (
                    <span style={{ marginLeft: 6 }}>
                      {(alert.discharge_cusecs / 1000).toFixed(0)}K cusecs
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {data.length > 5 && (
          <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
            +{data.length - 5} more alerts
          </div>
        )}
      </div>
    </div>
  )
}
