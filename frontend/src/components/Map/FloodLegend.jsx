const LEGENDS = {
  inundation: {
    title: 'Inundation Depth Map',
    items: [
      { color: '#ccff00', label: 'Deep Inundation (> 2.0m)' },
      { color: '#00e5ff', label: 'Medium Inundation (0.5 - 2.0m)' },
      { color: '#7c3aed', label: 'Shallow Fringe (< 0.5m)' },
      { color: '#1e293b', label: 'Exposed Buildings / Infrastructure' },
    ],
  },
  hazard: {
    title: 'Flood Hazard Index',
    gradient: true,
    items: [
      { color: '#1e3a5f', label: 'Very Low (0-25)' },
      { color: '#1d6fa4', label: 'Low (25-50)' },
      { color: '#f59e0b', label: 'Moderate (50-75)' },
      { color: '#ef4444', label: 'High (75-90)' },
      { color: '#7c3aed', label: 'Severe (90-100)' },
    ],
  },
  risk: {
    title: 'Flood Risk Level',
    items: [
      { color: '#22c55e', label: 'Low Risk' },
      { color: '#eab308', label: 'Moderate Risk' },
      { color: '#f97316', label: 'High Risk' },
      { color: '#dc2626', label: 'Severe Risk' },
    ],
  },
  awareness: {
    title: 'Early Warning Level',
    items: [
      { color: '#22c55e', label: 'Normal — No Action' },
      { color: '#eab308', label: 'Advisory — Watch' },
      { color: '#f97316', label: 'Warning — Prepare' },
      { color: '#ef4444', label: 'Emergency — Evacuate' },
      { color: '#7c3aed', label: 'Critical — Disaster' },
    ],
  },
}

const RIVER_STATUS = [
  { color: '#22c55e', label: 'Normal' },
  { color: '#eab308', label: 'Low Flood' },
  { color: '#f97316', label: 'Medium Flood' },
  { color: '#ef4444', label: 'High Flood' },
  { color: '#7c3aed', label: 'Very High Flood' },
]

export default function FloodLegend({ activeLayer }) {
  const legend = LEGENDS[activeLayer] || LEGENDS.inundation

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Primary layer legend */}
      <div className="legend" id="map-legend">
        <div className="legend-title">{legend.title}</div>
        {legend.items.map((item, i) => (
          <div key={i} className="legend-item">
            <div className="legend-swatch" style={{ background: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* River station legend */}
      <div className="legend" id="river-legend">
        <div className="legend-title">River Gauge Status</div>
        {RIVER_STATUS.map((item, i) => (
          <div key={i} className="legend-item">
            <div
              className="legend-swatch"
              style={{
                background: item.color,
                borderRadius: '50%',
                width: 10,
                height: 10,
              }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
