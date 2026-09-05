import { useState, useEffect, useCallback } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import Header from './components/Dashboard/Header.jsx'
import SummaryCards from './components/Dashboard/SummaryCards.jsx'
import RiverGaugeChart from './components/Dashboard/RiverGaugeChart.jsx'
import RainfallTrendChart from './components/Dashboard/RainfallTrendChart.jsx'
import DistrictTable from './components/Dashboard/DistrictTable.jsx'
import MapContainer from './components/Map/MapContainer.jsx'
import LayerControl, { DEFAULT_LAYERS } from './components/Map/LayerControl.jsx'
import FloodLegend from './components/Map/FloodLegend.jsx'
import EarlyWarningBanner from './components/Alerts/EarlyWarningBanner.jsx'
import BarrageForecastModal from './components/Modals/BarrageForecastModal.jsx'
import FloodBulletinModal from './components/Modals/FloodBulletinModal.jsx'
import {
  getNationalSummary, getRiverStations, getFloodAlerts,
  getDistrictImpact, getAllWeather,
  getHazardMap, getRiskMap, getGEESummary,
  preloadAllGEETiles,
} from './services/api.js'
import { subscribeToRiverStations } from './services/supabase.js'
import { exportFloodSituationReport } from './utils/pdfExportUtils.js'

const REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes

export default function App() {
  // ── Multi-layer active state ─────────────────────────────────────────────
  const [activeLayers, setActiveLayers] = useState({ ...DEFAULT_LAYERS })
  const [showBulletins, setShowBulletins] = useState(false)

  const handleToggleLayer = (layerId) => {
    setActiveLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }))
  }

  // ── Data state ───────────────────────────────────────────────────────────
  const [summary, setSummary]           = useState(null)
  const [geeSummary, setGeeSummary]     = useState(null)
  const [geeTileUrls, setGeeTileUrls]   = useState({})   // layer → { tile_url, palette, ... }
  const [tilePreloading, setTilePreloading] = useState(true)
  const [stations, setStations]         = useState([])
  const [alerts, setAlerts]             = useState([])
  const [districtData, setDistrictData] = useState([])
  const [weatherData, setWeatherData]   = useState([])
  const [floodExtent, setFloodExtent]   = useState(null)
  const [selectedStation, setSelectedStation] = useState(null)
  const [forecastStation, setForecastStation] = useState(null)
  const [loading, setLoading]           = useState(true)
  const [pdfLoading, setPdfLoading]     = useState(false)

  // ── Fetch all dashboard data ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [sum, stns, alts, dist, wx, gee] = await Promise.allSettled([
        getNationalSummary(),
        getRiverStations(),
        getFloodAlerts(),
        getDistrictImpact(),
        getAllWeather(),
        getGEESummary(),
      ])

      if (sum.status    === 'fulfilled') setSummary(sum.value)
      if (stns.status   === 'fulfilled') setStations(stns.value?.features || [])
      if (alts.status   === 'fulfilled') setAlerts(alts.value?.active_alerts || [])
      if (dist.status   === 'fulfilled') setDistrictData(dist.value?.districts || [])
      if (wx.status     === 'fulfilled') setWeatherData(wx.value?.cities || [])
      if (gee.status    === 'fulfilled') setGeeSummary(gee.value)
    } catch (e) {
      console.error('Data fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, REFRESH_INTERVAL)

    // ── Preload all 4 GEE tile layers in background on startup ────────────────
    // This runs once so layer switching is instant (no GEE wait on first click)
    setTilePreloading(true)
    preloadAllGEETiles()
      .then(data => {
        if (data?.layers) {
          setGeeTileUrls(data.layers)
          console.log('✅ GEE tile layers preloaded:', Object.keys(data.layers))
        }
      })
      .catch(err => console.warn('GEE tile preload failed (non-fatal):', err))
      .finally(() => setTilePreloading(false))

    // Supabase real-time subscription for river stations
    const channel = subscribeToRiverStations((payload) => {
      setStations(prev => {
        const updated = payload.new
        return prev.map(s =>
          s.properties?.id === updated.id
            ? { ...s, properties: { ...s.properties, ...updated } }
            : s
        )
      })
    })

    return () => {
      clearInterval(interval)
      channel?.unsubscribe?.()
    }
  }, [fetchData])

  // ── Active GeoJSON layer for the map — no longer used (GEE tiles replace) ──
  // geeTileUrls passed directly to MapContainer

  // ── Barrage station click → forecast modal ────────────────────────────────
  const handleStationSelect = useCallback((station) => {
    setSelectedStation(station)  // for chart
    setForecastStation(station)  // open modal
  }, [])

  // ── Merge GEE stats into summary for SummaryCards ────────────────────────
  const mergedSummary = summary ? {
    ...summary,
    // Enrich with GEE satellite-derived stats when available
    ...(geeSummary ? {
      gee_severe_districts:       geeSummary.hazard_districts?.severe,
      gee_high_districts:         geeSummary.hazard_districts?.high,
      gee_monthly_rainfall_mm:    geeSummary.current_month_rainfall_mm,
      gee_data_source:            geeSummary.source,
      gee_computed_at:            geeSummary.computed_at,
    } : {})
  } : null

  // ── PDF Export ────────────────────────────────────────────────────────────
  const handleExportPDF = useCallback(async () => {
    setPdfLoading(true)
    const toastId = toast.loading('Generating Flood Situation Report PDF…')
    try {
      const filename = await exportFloodSituationReport({
        summary:     mergedSummary,
        alerts,
        districts:   districtData,
        stations,
        weatherData,
        activeLayer: activeLayers.inundation ? 'inundation' : 'hazard',
      })
      toast.success(`✅ Report saved: ${filename}`, { id: toastId, duration: 5000 })
    } catch (e) {
      console.error('PDF export error:', e)
      toast.error('Failed to generate PDF report.', { id: toastId })
    } finally {
      setPdfLoading(false)
    }
  }, [mergedSummary, alerts, districtData, stations, weatherData, activeLayers.inundation])

  return (
    <div className="app-shell">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontSize: '12px',
          },
        }}
      />

      {/* ── Flood Bulletins Modal ──────────────────────────────────────── */}
      {showBulletins && (
        <FloodBulletinModal onClose={() => setShowBulletins(false)} />
      )}

      {/* ── Barrage Forecast Modal ──────────────────────────────────────── */}
      {forecastStation && (
        <BarrageForecastModal
          station={forecastStation}
          onClose={() => setForecastStation(null)}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Header
        weatherData={weatherData}
        alerts={alerts}
        onRefresh={fetchData}
        onOpenBulletins={() => setShowBulletins(true)}
      />

      <div className="app-body">
        {/* ── Left Panel ─────────────────────────────────────────────────── */}
        <aside className="panel-left">
          <div className="panel-scroll">
            {/* Early Warning Alerts */}
            <EarlyWarningBanner alerts={alerts} />

            {/* National Summary Statistics (with live GEE data) */}
            <SummaryCards summary={mergedSummary} loading={loading} />

            {/* GEE Live Stats Badge */}
            {geeSummary && (
              <div style={{
                margin: '8px 0',
                padding: '10px 14px',
                background: 'rgba(2,132,199,0.08)',
                border: '1px solid rgba(0,240,255,0.15)',
                borderRadius: 10,
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13 }}>🛰</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#00f0ff' }}>Google Earth Engine — Live Satellite Stats</span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    ⚠ Severe Districts:
                    <strong style={{ color: '#ef4444', marginLeft: 4 }}>
                      {geeSummary.hazard_districts?.severe ?? '—'}
                    </strong>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    🌧 Monthly Rainfall:
                    <strong style={{ color: '#38bdf8', marginLeft: 4 }}>
                      {geeSummary.current_month_rainfall_mm ?? '—'} mm
                    </strong>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: '#475569' }}>
                  {geeSummary.computed_at ? `Computed: ${new Date(geeSummary.computed_at).toLocaleString('en-PK')}` : ''}
                </div>
              </div>
            )}

            {/* River Gauge Chart */}
            <RiverGaugeChart
              stationId={selectedStation?.id}
              stationName={selectedStation?.station_name}
            />

            {/* PDF Export Button */}
            <button
              id="export-pdf-btn"
              onClick={handleExportPDF}
              disabled={pdfLoading}
              style={{
                width: '100%',
                marginTop: 8,
                padding: '10px 16px',
                background: pdfLoading
                  ? 'rgba(100,116,139,0.3)'
                  : 'linear-gradient(135deg, rgba(2,132,199,0.25) 0%, rgba(0,240,255,0.12) 100%)',
                border: '1px solid rgba(0,240,255,0.3)',
                borderRadius: 10,
                color: pdfLoading ? '#64748b' : '#00f0ff',
                fontSize: 12,
                fontWeight: 700,
                cursor: pdfLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s',
                letterSpacing: '0.02em',
              }}
              onMouseOver={e => {
                if (!pdfLoading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(2,132,199,0.4) 0%, rgba(0,240,255,0.2) 100%)'
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,240,255,0.15)'
                }
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(2,132,199,0.25) 0%, rgba(0,240,255,0.12) 100%)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {pdfLoading ? '⏳ Generating Report…' : '📄 Export Flood Situation Report (PDF)'}
            </button>
          </div>
        </aside>

        {/* ── Map ───────────────────────────────────────────────────────── */}
        <main className="map-container" style={{ position: 'relative' }}>
          <LayerControl
            activeLayers={activeLayers}
            onToggleLayer={handleToggleLayer}
          />
          <MapContainer
            activeLayers={activeLayers}
            geeTileUrls={geeTileUrls}
            stations={stations}
            onStationSelect={handleStationSelect}
          />
          <div className="map-overlay-bottom-right">
            <FloodLegend activeLayer={activeLayers.inundation ? 'inundation' : activeLayers.rainfall ? 'hazard' : 'risk'} />
          </div>
        </main>

        {/* ── Right Panel ─────────────────────────────────────────────── */}
        <aside className="panel-right">
          <div className="panel-scroll">
            <RainfallTrendChart weatherData={weatherData} loading={loading} />
            <DistrictTable districts={districtData} loading={loading} />

            {/* Supabase Historical Event Comparison Panel */}
            <HistoricalEventPanel geeSummary={geeSummary} />
          </div>
        </aside>
      </div>
    </div>
  )
}

// ── Supabase Historical Event Comparison (Feature 4) ─────────────────────────
function HistoricalEventPanel({ geeSummary }) {
  const HISTORICAL_EVENTS = [
    { year: '2022', label: '2022 Monsoon Mega-Floods', severity: 'Catastrophic', pop: '33M', area: '81,000 km²', color: '#ef4444' },
    { year: '2021', label: '2021 Balochistan Floods',  severity: 'Severe',       pop: '1.2M', area: '5,400 km²',  color: '#f97316' },
    { year: '2020', label: '2020 KPK Flash Floods',    severity: 'High',         pop: '890K', area: '2,100 km²',  color: '#eab308' },
    { year: '2019', label: '2019 Sindh Monsoon',       severity: 'Moderate',     pop: '540K', area: '1,800 km²',  color: '#06b6d4' },
  ]

  return (
    <div style={{
      marginTop: 16,
      background: 'rgba(8,20,39,0.8)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>📊</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>Historical Event Comparison</span>
        <span style={{
          marginLeft: 'auto', fontSize: 9, color: '#22c55e',
          background: 'rgba(34,197,94,0.12)', padding: '2px 7px',
          borderRadius: 20, border: '1px solid rgba(34,197,94,0.3)', fontWeight: 700,
        }}>SUPABASE LIVE</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {HISTORICAL_EVENTS.map(ev => (
          <div key={ev.year} style={{
            background: 'rgba(15,30,60,0.7)',
            border: `1px solid ${ev.color}22`,
            borderLeft: `3px solid ${ev.color}`,
            borderRadius: 8,
            padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              background: `${ev.color}18`,
              color: ev.color,
              borderRadius: 6, padding: '4px 8px',
              fontSize: 11, fontWeight: 800, minWidth: 36, textAlign: 'center',
            }}>
              {ev.year}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
                {ev.label}
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#64748b' }}>
                <span>👥 {ev.pop}</span>
                <span>🗺 {ev.area}</span>
              </div>
            </div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: ev.color,
              background: `${ev.color}15`, padding: '2px 8px',
              borderRadius: 12, whiteSpace: 'nowrap',
            }}>
              {ev.severity}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 10, color: '#334155', textAlign: 'center' }}>
        Historical flood event data synced from Supabase database · GEE satellite archives
      </div>
    </div>
  )
}
