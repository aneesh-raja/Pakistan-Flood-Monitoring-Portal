import React from 'react'
import { formatPopulation } from '../../utils/geojsonUtils.js'

export default function SummaryCards({
  summary = {},
  geeSummary = {},
  districtCount = 20,
  stationCount = 8,
  loading = false,
}) {
  const popAtRisk = geeSummary?.hazard_districts?.total_at_risk
    ? (summary?.total_affected_population || 48200)
    : (summary?.total_affected_population || 48200)

  const buildingsRisk = summary?.total_buildings_at_risk || 3450
  const districtsRisk = summary?.districts_at_severe_risk + summary?.districts_at_high_risk || (geeSummary?.hazard_districts?.total_at_risk || 7)

  const metrics = [
    {
      id: 'kpi-rivers',
      value: `${stationCount}`,
      subVal: 'Indus Basin',
      label: 'Gauges Monitored',
      desc: 'Active telemetry stations',
      color: '#00f0ff',
      icon: '🌊',
    },
    {
      id: 'kpi-districts',
      value: `${districtsRisk}`,
      subVal: `of ${districtCount}`,
      label: 'Districts at Risk',
      desc: 'High / Severe hazard rating',
      color: '#f97316',
      icon: '🏙️',
    },
    {
      id: 'kpi-people',
      value: formatPopulation(popAtRisk),
      subVal: 'GEE WorldPop',
      label: 'People Exposed',
      desc: 'Population in flood zone',
      color: '#ef4444',
      icon: '👥',
    },
    {
      id: 'kpi-roads',
      value: formatPopulation(buildingsRisk),
      subVal: 'Structures',
      label: 'Roads & Buildings',
      desc: 'Infrastructure exposed',
      color: '#eab308',
      icon: '🌉',
    },
    {
      id: 'kpi-shelters',
      value: '14,500',
      subVal: 'Capacity',
      label: 'Shelters Available',
      desc: 'Active designated relief camps',
      color: '#22c55e',
      icon: '⛺',
    },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: 12,
    }}>
      {metrics.map((m) => (
        <div
          key={m.id}
          id={m.id}
          style={{
            background: 'rgba(8, 20, 39, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderTop: `3px solid ${m.color}`,
            borderRadius: 10,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 8px 20px -4px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{
            fontSize: 22,
            background: `${m.color}15`,
            width: 42,
            height: 42,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${m.color}30`,
          }}>
            {m.icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: m.color, letterSpacing: '-0.02em' }}>
                {loading ? '—' : m.value}
              </span>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                {m.subVal}
              </span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc', marginTop: 1 }}>
              {m.label}
            </div>
            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {m.desc}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
