import React from 'react'

export default function ActiveAlertsPanel({
  stations = [],
  selectedStation,
  onSelectStation,
}) {
  // Sort and group stations into severity tiers
  const critical = stations.filter(s => s.flood_status === 'Very High Flood')
  const high     = stations.filter(s => s.flood_status === 'High Flood')
  const medium   = stations.filter(s => s.flood_status === 'Medium Flood' || s.flood_status === 'Low Flood')
  const normal   = stations.filter(s => !s.flood_status || s.flood_status === 'Normal')

  const groups = [
    { label: 'CRITICAL', emoji: '🔴', color: '#ef4444', items: critical },
    { label: 'HIGH',     emoji: '🟠', color: '#f97316', items: high },
    { label: 'MEDIUM / LOW', emoji: '🟡', color: '#eab308', items: medium },
    { label: 'NORMAL',   emoji: '🟢', color: '#22c55e', items: normal },
  ]

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
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#00f0ff', letterSpacing: '0.05em' }}>
          ACTIVE ALERTS ({stations.length})
        </div>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>Ranked by Severity</span>
      </div>

      {/* Station List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {groups.map((grp) => (
          <div key={grp.label}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 10,
              fontWeight: 800,
              color: grp.color,
              marginBottom: 6,
              paddingLeft: 6,
              letterSpacing: '0.04em',
            }}>
              <span>{grp.emoji}</span>
              <span>{grp.label} ({grp.items.length})</span>
            </div>

            {grp.items.length === 0 ? (
              <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic', paddingLeft: 18, marginBottom: 4 }}>
                No stations in this tier
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {grp.items.map(st => {
                  const isSelected = selectedStation?.id === st.id
                  const qK = st.discharge_cusecs ? `${(st.discharge_cusecs / 1000).toFixed(0)}k cfs` : '—'

                  return (
                    <div
                      key={st.id}
                      onClick={() => onSelectStation?.(st)}
                      style={{
                        background: isSelected ? 'rgba(0, 240, 255, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                        border: `1px solid ${isSelected ? '#00f0ff' : 'rgba(255, 255, 255, 0.06)'}`,
                        borderRadius: 8,
                        padding: '8px 10px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? '#00f0ff' : '#f8fafc' }}>
                          {st.station_name}
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>
                          {st.river_name} River • {st.province}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: grp.color }}>
                          {qK}
                        </div>
                        <div style={{ fontSize: 9, color: '#64748b' }}>
                          {st.current_level_m ? `${st.current_level_m}m` : ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
