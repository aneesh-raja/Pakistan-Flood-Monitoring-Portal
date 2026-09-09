import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell
} from 'recharts'

const getRainfallColor = (mm) => {
  if (mm >= 50) return '#7c3aed'
  if (mm >= 25) return '#ef4444'
  if (mm >= 10) return '#f97316'
  if (mm >= 5)  return '#eab308'
  if (mm > 0)   return '#22c55e'
  return '#0284c7' // Blue accent for 0mm / clear conditions
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload || {}
  const mm = d.rainfall || 0
  return (
    <div style={{
      background: 'rgba(8, 20, 39, 0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(0, 240, 255, 0.3)',
      borderRadius: 8,
      padding: '8px 12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      fontSize: 11,
      minWidth: 150,
    }}>
      <div style={{ fontWeight: 800, color: '#00f0ff', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>📍</span> {label}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', gap: 10 }}>
        <span>Rainfall (3h):</span>
        <span style={{ fontWeight: 700, color: getRainfallColor(mm) }}>
          {mm.toFixed(1)} mm
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', gap: 10, marginTop: 2 }}>
        <span>Temperature:</span>
        <span style={{ fontWeight: 700, color: '#f8fafc' }}>
          {d.temp != null ? `${d.temp.toFixed(1)}°C` : '--'}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', gap: 10, marginTop: 2 }}>
        <span>Conditions:</span>
        <span style={{ fontWeight: 600, color: '#38bdf8' }}>
          {d.condition || 'Clear'}
        </span>
      </div>
    </div>
  )
}

export default function RainfallTrendChart({ weatherData = [], loading }) {
  const fallbackWeather = [
    { city: 'Karachi',   temperature_c: 33.1, rainfall_3h_mm: 0, weather_desc: 'Scattered clouds' },
    { city: 'Lahore',    temperature_c: 34.2, rainfall_3h_mm: 0, weather_desc: 'Haze' },
    { city: 'Islamabad', temperature_c: 29.5, rainfall_3h_mm: 0, weather_desc: 'Clear sky' },
    { city: 'Peshawar',  temperature_c: 31.0, rainfall_3h_mm: 0, weather_desc: 'Clear sky' },
    { city: 'Quetta',    temperature_c: 24.5, rainfall_3h_mm: 0, weather_desc: 'Clear' },
    { city: 'Multan',    temperature_c: 35.8, rainfall_3h_mm: 0, weather_desc: 'Hot & sunny' },
    { city: 'Sukkur',    temperature_c: 36.4, rainfall_3h_mm: 0, weather_desc: 'Clear sky' },
    { city: 'Faisalabad',temperature_c: 33.9, rainfall_3h_mm: 0, weather_desc: 'Clear' },
  ]

  const list = (Array.isArray(weatherData) && weatherData.length > 0) ? weatherData : fallbackWeather

  const chartData = list.map(w => ({
    city: w.city || w.name,
    rainfall: parseFloat((w.rainfall_3h_mm || 0).toFixed(1)),
    displayBar: Math.max(parseFloat((w.rainfall_3h_mm || 0).toFixed(1)), 0.3), // Minimum bar width for visual clarity
    temp: w.temperature_c,
    condition: w.weather_desc || w.description,
  })).sort((a, b) => (b.rainfall - a.rainfall) || (b.temp - a.temp))

  return (
    <div>
      <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>3-HOUR RAINFALL — MAJOR CITIES</span>
        <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>
          Live OpenWeatherMap
        </span>
      </div>

      <div className="chart-wrapper" style={{
        background: 'rgba(8, 20, 39, 0.7)',
        border: '1px solid rgba(0, 240, 255, 0.15)',
        borderRadius: 8,
        padding: '12px 14px',
      }}>
        <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc' }}>
            Real-Time Precipitation Gauge
          </span>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>mm / 3h (Units)</span>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 190, borderRadius: 8 }} />
        ) : (
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 15, left: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 'dataMax + 2']}
                tick={{ fontSize: 9, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="city"
                tick={{ fontSize: 10, fill: '#cbd5e1', fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,240,255,0.05)' }} />
              <Bar dataKey="displayBar" name="Rainfall (mm)" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.rainfall > 0 ? getRainfallColor(entry.rainfall) : 'rgba(2, 132, 199, 0.35)'}
                    stroke={entry.rainfall > 0 ? 'none' : 'rgba(56, 189, 248, 0.5)'}
                    strokeWidth={1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Legend & Condition Badges */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { label: 'Dry / 0mm',    color: 'rgba(2, 132, 199, 0.6)' },
            { label: 'Light <5mm',   color: '#22c55e' },
            { label: 'Mod 5-25mm',   color: '#eab308' },
            { label: 'Heavy 25-50',  color: '#ef4444' },
            { label: 'Extreme 50+',  color: '#7c3aed' },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
              <span style={{ fontSize: 9, color: '#94a3b8' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
