import { useState } from 'react'
import { formatPopulation, formatArea, getFloodStatusBadgeClass } from '../../utils/geojsonUtils.js'

const DEMO_DISTRICTS = [
  { district_name: 'Sukkur',     province: 'Sindh',  affected_population: 892000, inundated_sqkm: 3210, risk_score: 'Severe' },
  { district_name: 'Dadu',       province: 'Sindh',  affected_population: 654000, inundated_sqkm: 2840, risk_score: 'Severe' },
  { district_name: 'Larkana',    province: 'Sindh',  affected_population: 481000, inundated_sqkm: 1920, risk_score: 'High'   },
  { district_name: 'Jampur',     province: 'Punjab', affected_population: 312000, inundated_sqkm: 980,  risk_score: 'High'   },
  { district_name: 'Rajanpur',   province: 'Punjab', affected_population: 298000, inundated_sqkm: 870,  risk_score: 'High'   },
  { district_name: 'Charsadda',  province: 'KPK',    affected_population: 215000, inundated_sqkm: 640,  risk_score: 'Moderate'},
  { district_name: 'Nowshera',   province: 'KPK',    affected_population: 187000, inundated_sqkm: 520,  risk_score: 'Moderate'},
  { district_name: 'Kashmore',   province: 'Sindh',  affected_population: 163000, inundated_sqkm: 480,  risk_score: 'High'   },
  { district_name: 'Shikarpur',  province: 'Sindh',  affected_population: 142000, inundated_sqkm: 390,  risk_score: 'Moderate'},
  { district_name: 'Muzaffargarh', province: 'Punjab', affected_population: 128000, inundated_sqkm: 320, risk_score: 'Moderate'},
]

const RISK_ORDER = { Severe: 0, High: 1, Moderate: 2, Low: 3 }
const SORT_KEYS = ['district_name', 'affected_population', 'inundated_sqkm', 'risk_score']

export default function DistrictTable({ districts = [], loading }) {
  const [sortKey, setSortKey] = useState('affected_population')
  const [sortAsc, setSortAsc] = useState(false)
  const [filter, setFilter] = useState('')

  const data = (districts.length > 0 ? districts : DEMO_DISTRICTS)
    .filter(d =>
      d.district_name?.toLowerCase().includes(filter.toLowerCase()) ||
      d.province?.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      if (sortKey === 'risk_score') {
        const diff = RISK_ORDER[a.risk_score] - RISK_ORDER[b.risk_score]
        return sortAsc ? diff : -diff
      }
      const av = a[sortKey] ?? 0
      const bv = b[sortKey] ?? 0
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortAsc ? av - bv : bv - av
    })

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(false) }
  }

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <span style={{ opacity: 0.3 }}>↕</span>
    return <span>{sortAsc ? '↑' : '↓'}</span>
  }

  return (
    <div>
      <div className="panel-title">District Flood Impact</div>

      <input
        id="district-search"
        type="text"
        placeholder="Filter district or province..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        style={{
          width: '100%',
          padding: '6px 10px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'var(--bg-glass)',
          color: 'var(--text-primary)',
          fontSize: 11,
          fontFamily: 'inherit',
          marginBottom: 8,
          outline: 'none',
        }}
      />

      {loading ? (
        <div className="skeleton" style={{ height: 240, borderRadius: 8 }} />
      ) : (
        <div className="district-table-wrapper">
          <table className="district-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('district_name')} id="th-district">
                  District <SortIcon k="district_name" />
                </th>
                <th onClick={() => toggleSort('affected_population')} id="th-population">
                  Pop. at Risk <SortIcon k="affected_population" />
                </th>
                <th onClick={() => toggleSort('inundated_sqkm')} id="th-area">
                  Area <SortIcon k="inundated_sqkm" />
                </th>
                <th onClick={() => toggleSort('risk_score')} id="th-risk">
                  Risk <SortIcon k="risk_score" />
                </th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 50).map((d, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 11 }}>
                      {d.district_name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.province}</div>
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatPopulation(d.affected_population)}
                  </td>
                  <td>{formatArea(d.inundated_sqkm)}</td>
                  <td>
                    <span className={`badge badge-${
                      d.risk_score === 'Severe' ? 'critical' :
                      d.risk_score === 'High' ? 'high' :
                      d.risk_score === 'Moderate' ? 'medium' : 'normal'
                    }`}>
                      {d.risk_score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
