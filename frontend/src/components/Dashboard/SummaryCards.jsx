import { formatPopulation, formatArea } from '../../utils/geojsonUtils.js'

function Card({ label, value, sub, variant = 'info', id }) {
  return (
    <div className={`summary-card ${variant}`} id={id}>
      <div className="summary-card-label">{label}</div>
      <div className="summary-card-value">{value}</div>
      {sub && <div className="summary-card-sub">{sub}</div>}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="summary-card">
      <div className="skeleton" style={{ height: 10, width: '60%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 24, width: '80%' }} />
    </div>
  )
}

export default function SummaryCards({ summary, loading }) {
  const data = summary || {}

  if (loading) {
    return (
      <div>
        <div className="panel-title">National Overview</div>
        <div className="summary-cards">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="panel-title">National Overview</div>
      <div className="summary-cards">
        <Card
          id="card-affected-pop"
          label="Population at Risk"
          value={formatPopulation(data.total_affected_population)}
          sub="Across all flooded districts"
          variant="alert"
        />
        <Card
          id="card-buildings-risk"
          label="Buildings at Risk"
          value={formatPopulation(data.total_buildings_at_risk)}
          sub="Estimated exposure"
          variant="warn"
        />
        <Card
          id="card-inundated-area"
          label="Inundated Area"
          value={formatArea(data.total_inundated_area_sqkm)}
          sub="Sentinel-1 SAR derived"
          variant="info"
        />
        <Card
          id="card-affected-districts"
          label="Affected Districts"
          value={data.total_affected_districts || 0}
          sub="Out of 160 districts"
          variant="warn"
        />
        <Card
          id="card-severe-districts"
          label="Severe Risk"
          value={data.districts_at_severe_risk || 0}
          sub="Districts"
          variant="alert"
        />
        <Card
          id="card-high-districts"
          label="High Risk"
          value={data.districts_at_high_risk || 0}
          sub="Districts"
          variant="warn"
        />
      </div>
    </div>
  )
}
