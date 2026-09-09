import { useState, useEffect } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend
} from 'recharts'
import { format } from 'date-fns'
import { getStationHistory } from '../../services/api.js'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="map-popup" style={{ minWidth: 160 }}>
      <div className="popup-title">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="popup-row">
          <span className="popup-label">{p.name}</span>
          <span className="popup-value" style={{ color: p.color }}>
            {p.name === 'Discharge'
              ? `${(p.value / 1000).toFixed(1)}K cusecs`
              : `${p.value} m`}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function RiverGaugeChart({ stationId, stationName, stations = [], onSelectStation }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('discharge')

  useEffect(() => {
    if (!stationId) { setData([]); return }
    setLoading(true)
    getStationHistory(stationId, 30)
      .then(res => {
        const readings = (res.readings || []).map(r => ({
          date: format(new Date(r.recorded_at), 'MMM d HH:mm'),
          discharge: r.discharge_cusecs,
          level: r.gauge_height_m,
        }))
        setData(readings)
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [stationId])

  return (
    <div>
      <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>River Gauge Telemetry</span>
        {stations.length > 0 && (
          <select
            value={stationId || ''}
            onChange={(e) => {
              const selected = stations.find(s => s.id === e.target.value)
              if (selected) onSelectStation?.(selected)
            }}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: 6,
              padding: '2px 6px',
              fontSize: 10,
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
              maxWidth: 140,
            }}
          >
            <option value="" disabled>Select Station...</option>
            {stations.map(st => (
              <option key={st.id} value={st.id}>
                {st.station_name} ({st.river_name})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="chart-wrapper">
        <div className="chart-header">
          <span className="chart-title" style={{ fontSize: 11, color: '#f8fafc' }}>
            {stationName ? `📍 ${stationName} — 30-Day Trend` : 'Select a river station'}
          </span>
          <div className="tab-bar" style={{ width: 'auto' }}>
            <button
              id="tab-discharge"
              className={`tab-btn ${tab === 'discharge' ? 'active' : ''}`}
              onClick={() => setTab('discharge')}
            >Discharge</button>
            <button
              id="tab-level"
              className={`tab-btn ${tab === 'level' ? 'active' : ''}`}
              onClick={() => setTab('level')}
            >Gauge Level</button>
          </div>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 160, borderRadius: 8 }} />
        ) : data.length === 0 ? (
          <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              Select a river station to view 30-day telemetry:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {stations.slice(0, 4).map(st => (
                <button
                  key={st.id}
                  onClick={() => onSelectStation?.(st)}
                  style={{
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    borderRadius: 4,
                    padding: '3px 8px',
                    fontSize: 10,
                    cursor: 'pointer',
                  }}
                >
                  📍 {st.station_name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gaugeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1d6fa4" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#1d6fa4" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="levelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                interval="preserveStartEnd"
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              {tab === 'discharge' ? (
                <>
                  <ReferenceLine y={400000} stroke="#ef4444" strokeDasharray="4 3" label={{ value: 'Danger', fill: '#ef4444', fontSize: 9 }} />
                  <ReferenceLine y={300000} stroke="#eab308" strokeDasharray="4 3" label={{ value: 'Warning', fill: '#eab308', fontSize: 9 }} />
                  <Area
                    type="monotone"
                    dataKey="discharge"
                    name="Discharge"
                    stroke="#1d6fa4"
                    fill="url(#gaugeGrad)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#06b6d4' }}
                  />
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="level"
                  name="Gauge Level"
                  stroke="#06b6d4"
                  fill="url(#levelGrad)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#06b6d4' }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
