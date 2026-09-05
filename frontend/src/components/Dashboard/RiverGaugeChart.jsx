import { useState, useEffect } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend
} from 'recharts'
import { format, subDays } from 'date-fns'
import { getStationHistory } from '../../services/api.js'

// Generate demo data if no station selected
const generateDemoData = () => {
  const data = []
  const baseDischarge = 350000
  for (let i = 29; i >= 0; i--) {
    const d = subDays(new Date(), i)
    const variation = Math.sin(i * 0.3) * 80000 + (Math.random() - 0.3) * 60000
    data.push({
      date: format(d, 'MMM d'),
      discharge: Math.max(50000, Math.round(baseDischarge + variation)),
      level: parseFloat((12 + Math.sin(i * 0.3) * 3 + (Math.random() - 0.3) * 1.5).toFixed(2)),
    })
  }
  return data
}

const DEMO_DATA = generateDemoData()

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

export default function RiverGaugeChart({ stationId, stationName }) {
  const [data, setData] = useState(DEMO_DATA)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('discharge')

  useEffect(() => {
    if (!stationId) { setData(DEMO_DATA); return }
    setLoading(true)
    getStationHistory(stationId, 30)
      .then(res => {
        const readings = (res.readings || []).map(r => ({
          date: format(new Date(r.recorded_at), 'MMM d HH:mm'),
          discharge: r.discharge_cusecs,
          level: r.gauge_height_m,
        }))
        setData(readings.length > 0 ? readings : DEMO_DATA)
      })
      .catch(() => setData(DEMO_DATA))
      .finally(() => setLoading(false))
  }, [stationId])

  const title = stationName ? `${stationName} — 30-Day Trend` : 'Indus Basin — River Gauge (Demo)'

  return (
    <div>
      <div className="panel-title">River Gauge Telemetry</div>
      <div className="chart-wrapper">
        <div className="chart-header">
          <span className="chart-title" style={{ fontSize: 11 }}>{title}</span>
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
