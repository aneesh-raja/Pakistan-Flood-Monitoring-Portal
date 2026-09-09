import { useState, useEffect, useCallback } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import Header from './components/Dashboard/Header.jsx'
import ActiveAlertsPanel from './components/Dashboard/ActiveAlertsPanel.jsx'
import StationDetailPanel from './components/Dashboard/StationDetailPanel.jsx'
import RiverForecastSection from './components/Dashboard/RiverForecastSection.jsx'
import SummaryCards from './components/Dashboard/SummaryCards.jsx'
import RainfallTrendChart from './components/Dashboard/RainfallTrendChart.jsx'
import DistrictTable from './components/Dashboard/DistrictTable.jsx'
import MapContainer from './components/Map/MapContainer.jsx'
import LayerToolbar, { DEFAULT_LAYERS } from './components/Map/LayerToolbar.jsx'
import FloodLegend from './components/Map/FloodLegend.jsx'
import BarrageForecastModal from './components/Modals/BarrageForecastModal.jsx'
import FloodBulletinModal from './components/Modals/FloodBulletinModal.jsx'
import {
  getNationalSummary, getRiverStations, getFloodAlerts,
  getDistrictImpact, getAllWeather,
  getHazardMap, getRiskMap, getGEESummary,
  preloadAllGEETiles, getStationForecast,
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
  const [geeTileUrls, setGeeTileUrls]   = useState({})
  const [tilePreloading, setTilePreloading] = useState(true)
  const [stations, setStations]         = useState([])
  const [alerts, setAlerts]             = useState([])
  const [districtData, setDistrictData] = useState([])
  const [weatherData, setWeatherData]   = useState([])
  const [selectedStation, setSelectedStation] = useState(null)
  const [forecastStation, setForecastStation] = useState(null)
  const [stationForecastDetails, setStationForecastDetails] = useState(null)
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
      if (stns.status   === 'fulfilled') {
        const featureList = stns.value?.features || []
        setStations(featureList)
        // Default select Guddu Barrage or first station
        setSelectedStation(prev => {
          if (prev) return prev
          const guddu = featureList.find(f => f.properties?.station_name?.includes('Guddu'))
          return (guddu || featureList[0])?.properties || null
        })
      }
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

    // Preload all 4 GEE tile layers on startup
    setTilePreloading(true)
    preloadAllGEETiles()
      .then(data => {
        if (data?.layers) {
          setGeeTileUrls(data.layers)
          console.log('✅ GEE tile layers preloaded:', Object.keys(data.layers))
        }
      })
      .catch(err => console.warn('GEE tile preload error:', err))
      .finally(() => setTilePreloading(false))

    // Supabase real-time subscription
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

  // Fetch forecast details for selected station
  useEffect(() => {
    if (!selectedStation?.id) return
    getStationForecast(selectedStation.id, 7)
      .then(res => setStationForecastDetails(res))
      .catch(() => setStationForecastDetails(null))
  }, [selectedStation?.id])

  // ── Station Selection Handler ─────────────────────────────────────────────
  const handleStationSelect = useCallback((stationProps) => {
    setSelectedStation(stationProps)
  }, [])

  // ── Merge GEE stats into summary ─────────────────────────────────────────
  const mergedSummary = summary ? {
    ...summary,
    ...(geeSummary ? {
      gee_severe_districts:    geeSummary.hazard_districts?.severe,
      gee_high_districts:      geeSummary.hazard_districts?.high,
      gee_monthly_rainfall_mm: geeSummary.current_month_rainfall_mm,
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
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#050c1a', overflow: 'hidden' }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#081427',
            color: '#f8fafc',
            border: '1px solid rgba(0,240,255,0.3)',
            fontSize: '12px',
          },
        }}
      />

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showBulletins && (
        <FloodBulletinModal onClose={() => setShowBulletins(false)} />
      )}
      {forecastStation && (
        <BarrageForecastModal
          station={forecastStation}
          onClose={() => setForecastStation(null)}
        />
      )}

      {/* ── TOP HEADER ─────────────────────────────────────────────────── */}
      <Header
        weatherData={weatherData}
        alerts={alerts}
        onRefresh={fetchData}
        onOpenBulletins={() => setShowBulletins(true)}
      />

      {/* ── MAIN DASHBOARD SCROLL CONTAINER ────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        
        {/* ── 3-COLUMN MAIN AREA ─────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '280px minmax(400px, 1fr) 310px',
          gap: 12,
          minHeight: 460,
          height: '52vh',
        }}>
          {/* Left Column: Active Alerts List */}
          <ActiveAlertsPanel
            stations={stations.map(s => s.properties || s)}
            selectedStation={selectedStation}
            onSelectStation={handleStationSelect}
          />

          {/* Center Column: Map & Quick Layer Toolbar */}
          <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0, 240, 255, 0.2)', position: 'relative' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <MapContainer
                activeLayers={activeLayers}
                geeTileUrls={geeTileUrls}
                stations={stations}
                onStationSelect={handleStationSelect}
              />
              <div className="map-overlay-bottom-right">
                <FloodLegend activeLayer={activeLayers.inundation ? 'inundation' : activeLayers.rainfall ? 'hazard' : 'risk'} />
              </div>
            </div>

            {/* Integrated Layer Toolbar directly below map */}
            <LayerToolbar
              activeLayers={activeLayers}
              onToggleLayer={handleToggleLayer}
            />
          </div>

          {/* Right Column: Selected Station Detail Panel */}
          <StationDetailPanel
            station={selectedStation}
            forecastDetails={stationForecastDetails}
            onOpenModal={() => setForecastStation(selectedStation)}
          />
        </div>

        {/* ── WIDE SECTION: 72-HOUR RIVER FORECAST CHART ─────────────────── */}
        <RiverForecastSection
          station={selectedStation}
        />

        {/* ── BOTTOM SUMMARY BAR: 5 AGGREGATE KPI CARDS ─────────────────── */}
        <SummaryCards
          summary={mergedSummary}
          geeSummary={geeSummary}
          districtCount={districtData.length || 20}
          stationCount={stations.length || 8}
          loading={loading}
        />

        {/* ── SECONDARY MONITORING TILES (Districts & 3-Hour Rainfall) ───── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 340px', gap: 12, marginTop: 4 }}>
          <DistrictTable districts={districtData} loading={loading} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <RainfallTrendChart weatherData={weatherData} loading={loading} />
            
            <button
              id="export-pdf-btn"
              onClick={handleExportPDF}
              disabled={pdfLoading}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: pdfLoading
                  ? 'rgba(100,116,139,0.3)'
                  : 'linear-gradient(135deg, rgba(2,132,199,0.3) 0%, rgba(0,240,255,0.15) 100%)',
                border: '1px solid rgba(0,240,255,0.4)',
                borderRadius: 10,
                color: pdfLoading ? '#64748b' : '#00f0ff',
                fontSize: 12,
                fontWeight: 800,
                cursor: pdfLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s',
                letterSpacing: '0.03em',
              }}
            >
              {pdfLoading ? '⏳ Generating Official PDF…' : '📄 Export Flood Situation Report (PDF)'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
