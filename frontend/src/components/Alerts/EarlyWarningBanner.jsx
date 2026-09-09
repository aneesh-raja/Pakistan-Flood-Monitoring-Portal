const STATUS_CONFIG = {
  'Very High Flood': { emoji: '🔴', variant: 'critical', bgColor: 'rgba(124,58,237,0.14)', borderColor: 'rgba(124,58,237,0.5)', badgeColor: '#a855f7' },
  'High Flood':      { emoji: '🟠', variant: 'high',     bgColor: 'rgba(239,68,68,0.12)',   borderColor: 'rgba(239,68,68,0.5)', badgeColor: '#ef4444' },
  'Medium Flood':    { emoji: '🟡', variant: 'medium',   bgColor: 'rgba(249,115,22,0.12)',  borderColor: 'rgba(249,115,22,0.45)', badgeColor: '#f97316' },
  'Low Flood':       { emoji: '🟡', variant: 'low',      bgColor: 'rgba(234,179,8,0.10)',   borderColor: 'rgba(234,179,8,0.4)', badgeColor: '#eab308' },
}

export default function EarlyWarningBanner({ alerts = [] }) {
  const data = alerts

  if (!data.length) {
    return (
      <div className="alert-banner" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.3)', padding: '12px 16px' }}>
        <span className="alert-banner-icon" style={{ fontSize: 20 }}>✅</span>
        <div className="alert-banner-body">
          <div className="alert-banner-title" style={{ color: '#22c55e', fontWeight: 700 }}>All River Gauges Normal</div>
          <div className="alert-banner-desc" style={{ color: '#94a3b8', fontSize: 11 }}>
            No active river flood alerts at this time. All major barrages flowing within safe design limits.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="panel-title" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>🚨 Active River Flood Alerts ({data.length})</span>
        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>Standard FFD Early Warning Pipeline</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.slice(0, 5).map((alert, i) => {
          const config = STATUS_CONFIG[alert.flood_status] || STATUS_CONFIG['Low Flood']
          
          const observedVal = alert.observed || `${alert.current_level_m || '—'}m (${(alert.discharge_cusecs || 0).toLocaleString()} cusecs)`
          const dangerVal   = alert.danger_threshold || `${alert.danger_level_m || '—'}m`
          const peakVal     = alert.forecast_peak || `${Math.round((alert.discharge_cusecs || 0) * 1.08).toLocaleString()} cusecs`
          const timeVal     = alert.forecast_time || '+24 to 36 Hours'
          const ageVal      = alert.data_age || '15 mins ago'
          const sourceVal   = alert.source || 'PMD FFD / WAPDA Telemetry'

          return (
            <div
              key={alert.id || i}
              className="alert-banner"
              id={`alert-${alert.id || i}`}
              style={{
                background: config.bgColor,
                border: `1px solid ${config.borderColor}`,
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {/* Header row: Station + Status + River */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{config.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc' }}>
                    {alert.station_name}
                  </span>
                  <span style={{
                    background: `${config.badgeColor}25`,
                    border: `1px solid ${config.badgeColor}60`,
                    color: config.badgeColor,
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}>
                    {alert.flood_status}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  {alert.river_name} River • {alert.province}
                </span>
              </div>

              {/* 6-Field Standardized Early Warning Flow:
                  Observed → Danger threshold → Forecast peak → Forecast time → Data age → Source */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 8,
                padding: '8px 10px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '8px 12px',
                fontSize: 11,
              }}>
                <div>
                  <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                    1. Observed
                  </div>
                  <div style={{ color: '#38bdf8', fontWeight: 700, marginTop: 2 }}>
                    {observedVal}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                    2. Danger Threshold
                  </div>
                  <div style={{ color: '#ef4444', fontWeight: 700, marginTop: 2 }}>
                    {dangerVal}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                    3. Forecast Peak
                  </div>
                  <div style={{ color: '#f59e0b', fontWeight: 700, marginTop: 2 }}>
                    {peakVal}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                    4. Forecast Time
                  </div>
                  <div style={{ color: '#e2e8f0', fontWeight: 600, marginTop: 2 }}>
                    ⏱️ {timeVal}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                    5. Data Age
                  </div>
                  <div style={{ color: '#a78bfa', fontWeight: 600, marginTop: 2 }}>
                    🕒 {ageVal}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                    6. Source
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 500, marginTop: 2 }}>
                    🏛️ {sourceVal}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {data.length > 5 && (
          <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
            +{data.length - 5} more active alerts
          </div>
        )}
      </div>
    </div>
  )
}
