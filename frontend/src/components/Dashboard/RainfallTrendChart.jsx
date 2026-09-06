import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell
} from 'recharts'

const getRainfallColor = (mm) => {
  if (mm >= 50) return '#7c3aed'
  if (mm >= 25) return '#ef4444'
  if (mm >= 10) return '#f97316'
  if (mm >= 5)  return '#eab308'
  return '#22c55e'
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const mm = payload[0]?.value
  return (
    <div className="map-popup" style={{ minWidth: 140 }}>
      <div className="popup-title">📍 {label}</div>
      <div className="popup-row">
        <span className="popup-label">Rainfall (3h)</span>
        <span className="popup-value" style={{ color: getRainfallColor(mm) }}>
          {mm} mm
        </span>
      </div>
      <div className="popup-row">
        <span className="popup-label">Status</span>
        <span className="popup-value">
          {mm >= 50 ? '🔴 Extreme' : mm >= 25 ? '🟠 Heavy' : mm >= 10 ? '🟡 Moderate' : '🟢 Light'}
        </span>
      </div>
    </div>
  )
}

export default function RainfallTrendChart({ weatherData = [], loading }) {
  const chartData = weatherData.map(w => ({
    city: w.city,
    rainfall: parseFloat((w.rainfall_3h_mm || 0).toFixed(1)),
  })).sort((a, b) => b.rainfall - a.rainfall)

  return (
    <div>
      <div className="panel-title">3-Hour Rainfall — Major Cities</div>
      <div className="chart-wrapper">
        <div className="chart-header">
          <span className="chart-title">OpenWeatherMap Data</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>mm / 3h</span>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
        ) : chartData.length === 0 ? (
          <div style={{ height: 200, display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
            Verified weather data is unavailable.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="city"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="rainfall" name="Rainfall (mm)" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={getRainfallColor(entry.rainfall)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Rainfall Legend */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {[
            { label: 'Light <5mm',   color: '#22c55e' },
            { label: 'Mod 5-25mm',   color: '#eab308' },
            { label: 'Heavy 25-50',  color: '#ef4444' },
            { label: 'Extreme 50+',  color: '#7c3aed' },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
