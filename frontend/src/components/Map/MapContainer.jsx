import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getDistricts } from '../../services/api.js'

// Center coordinates for Pakistan region
const PAKISTAN_CENTER = [30.3753, 69.3451]
const PAKISTAN_ZOOM = 6

const TILE_LAYERS = {
  topo: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 18,
  },
  street: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 18,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 18,
  },
}

// Major Pakistan River Lines coordinates
const PAKISTAN_RIVER_POLYLINES = [
  { name: 'Indus River', color: '#00f0ff', weight: 4, coords: [[35.3, 75.5], [34.0, 72.7], [32.9, 71.5], [30.7, 70.8], [28.4, 69.7], [27.7, 68.8], [25.3, 68.3], [24.0, 67.5]] },
  { name: 'Jhelum River', color: '#38bdf8', weight: 3, coords: [[34.1, 74.8], [33.1, 73.6], [32.6, 73.5], [31.1, 72.1]] },
  { name: 'Chenab River', color: '#34d399', weight: 3.5, coords: [[32.7, 74.5], [31.5, 72.5], [31.1, 72.1], [29.3, 71.0]] },
  { name: 'Ravi River', color: '#fbbf24', weight: 2.5, coords: [[32.5, 75.0], [31.5, 74.3], [30.6, 72.5], [30.5, 71.8]] },
  { name: 'Sutlej River', color: '#f59e0b', weight: 2.5, coords: [[31.1, 74.5], [29.8, 70.9], [29.3, 71.0]] },
  { name: 'Kabul River', color: '#a855f7', weight: 3, coords: [[34.5, 70.0], [34.0, 71.5], [34.0, 72.0]] },
]

// Critical Infrastructure Points (Bridges, Dams, Power Plants)
const CRITICAL_INFRASTRUCTURE = [
  { name: 'Tarbela Hydro Power Station', type: 'Power Plant', lat: 34.08, lon: 72.70, color: '#f59e0b' },
  { name: 'Mangla Power House', type: 'Power Plant', lat: 33.14, lon: 73.64, color: '#f59e0b' },
  { name: 'Sukkur Barrage Bridge', type: 'Bridge', lat: 27.70, lon: 68.86, color: '#ec4899' },
  { name: 'N-5 Highway Indus Crossing (Kotri)', type: 'Bridge', lat: 25.37, lon: 68.31, color: '#ec4899' },
  { name: 'Nowshera Kabul River Bridge', type: 'Bridge', lat: 34.01, lon: 71.98, color: '#ec4899' },
]

// Evacuation Relief Camps
const EVACUATION_SHELTERS = [
  { name: 'Sukkur Sports Complex Relief Camp', capacity: '5,000 Persons', lat: 27.71, lon: 68.84 },
  { name: 'Guddu High School Shelter', capacity: '2,500 Persons', lat: 28.44, lon: 69.72 },
  { name: 'Nowshera Degree College Relief Camp', capacity: '3,000 Persons', lat: 34.02, lon: 71.97 },
  { name: 'D.G. Khan Stadium Shelter', capacity: '4,000 Persons', lat: 30.05, lon: 70.63 },
]

export default function MapContainer({
  activeLayers = {},
  geeTileUrls = {},
  stations = [],
  onStationSelect,
}) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const baseTileLayerRef = useRef(null)

  // Layer groups for dynamic toggling
  const stationGroupRef = useRef(null)
  const riverGroupRef = useRef(null)
  const infraGroupRef = useRef(null)
  const evacGroupRef = useRef(null)
  const rasterLayerRef = useRef(null)

  const [tileLoading, setTileLoading] = useState(false)

  // ── 1. Initialize Leaflet Map ─────────────────────────────────────────────
  useEffect(() => {
    if (mapInstance.current) return

    const map = L.map(mapRef.current, {
      center: PAKISTAN_CENTER,
      zoom: PAKISTAN_ZOOM,
      zoomControl: false,
      attributionControl: false,
    })

    L.control.zoom({ position: 'topright' }).addTo(map)
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map)

    const baseTile = L.tileLayer(TILE_LAYERS.satellite.url, {
      attribution: TILE_LAYERS.satellite.attribution,
      maxZoom: TILE_LAYERS.satellite.maxZoom,
    }).addTo(map)

    baseTileLayerRef.current = baseTile
    stationGroupRef.current = L.layerGroup().addTo(map)
    riverGroupRef.current   = L.layerGroup().addTo(map)
    districtGroupRef.current = L.layerGroup().addTo(map)
    infraGroupRef.current   = L.layerGroup().addTo(map)
    evacGroupRef.current    = L.layerGroup().addTo(map)
    mapInstance.current     = map

    const timer = setTimeout(() => {
      if (mapInstance.current) mapInstance.current.invalidateSize()
    }, 200)

    const resizeObserver = new ResizeObserver(() => {
      mapInstance.current?.invalidateSize({ animate: false })
    })
    resizeObserver.observe(mapRef.current)

    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
      map.remove()
      mapInstance.current = null
    }
  }, [])

  // ── 2. Basemap Toggle ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !baseTileLayerRef.current) return

    const isSat = Boolean(activeLayers.satellite)
    const cfg = isSat ? TILE_LAYERS.satellite : TILE_LAYERS.topo

    map.removeLayer(baseTileLayerRef.current)
    baseTileLayerRef.current = L.tileLayer(cfg.url, { maxZoom: cfg.maxZoom }).addTo(map)
  }, [activeLayers.satellite])

  // ── 3. Render Vector Rivers ────────────────────────────────────────────────
  useEffect(() => {
    const group = riverGroupRef.current
    if (!group) return
    group.clearLayers()

    if (activeLayers.rivers) {
      PAKISTAN_RIVER_POLYLINES.forEach(r => {
        const polyline = L.polyline(r.coords, {
          color: r.color,
          weight: r.weight,
          opacity: 0.85,
        })
        polyline.bindTooltip(`🌊 ${r.name}`, { sticky: true })
        group.addLayer(polyline)
      })
    }
  }, [activeLayers.rivers])

  // ── 3.5 Render District & Province Boundaries ─────────────────────────────
  const [districtGeoJson, setDistrictGeoJson] = useState(null)
  const districtGroupRef = useRef(null)

  useEffect(() => {
    getDistricts()
      .then(data => {
        if (data?.features) setDistrictGeoJson(data)
      })
      .catch(err => console.warn('Failed to fetch district boundaries:', err))
  }, [])

  useEffect(() => {
    const group = districtGroupRef.current
    if (!group) return
    group.clearLayers()

    if ((activeLayers.districts || activeLayers.provinces) && districtGeoJson) {
      const geoLayer = L.geoJSON(districtGeoJson, {
        style: (feature) => {
          const hClass = feature.properties?.hazard_class || 'Low'
          const color = hClass === 'Severe' ? '#ef4444' :
                        hClass === 'High' ? '#f97316' :
                        hClass === 'Moderate' ? '#eab308' : '#22c55e'
          return {
            color: activeLayers.provinces ? '#38bdf8' : color,
            weight: activeLayers.provinces ? 2 : 1.2,
            opacity: 0.85,
            fillColor: color,
            fillOpacity: activeLayers.districts ? 0.18 : 0.05,
            dashArray: activeLayers.provinces ? '4, 4' : null,
          }
        },
        onEachFeature: (feature, layer) => {
          const p = feature.properties || {}
          layer.bindPopup(`
            <div class="map-popup">
              <div class="popup-title">🏙️ ${p.name_en || 'District'}</div>
              <div class="popup-row"><span class="popup-label">Province</span><span class="popup-value">${p.province || '—'}</span></div>
              <div class="popup-row"><span class="popup-label">Hazard Level</span><span class="popup-value" style="color:${p.hazard_class === 'Severe' ? '#ef4444' : '#f97316'}; font-weight:700;">${p.hazard_class || 'Low'}</span></div>
              <div class="popup-row"><span class="popup-label">Population</span><span class="popup-value">${p.total_population?.toLocaleString() || '—'}</span></div>
              <div class="popup-row"><span class="popup-label">Buildings</span><span class="popup-value">${p.total_buildings?.toLocaleString() || '—'}</span></div>
            </div>
          `)
        }
      })
      group.addLayer(geoLayer)
    }
  }, [districtGeoJson, activeLayers.districts, activeLayers.provinces])

  // ── 4. Render Critical Infrastructure & Evacuation Areas ───────────────────
  useEffect(() => {
    const infraGroup = infraGroupRef.current
    const evacGroup  = evacGroupRef.current
    if (!infraGroup || !evacGroup) return

    infraGroup.clearLayers()
    evacGroup.clearLayers()

    if (activeLayers.infrastructure) {
      CRITICAL_INFRASTRUCTURE.forEach(inf => {
        const marker = L.circleMarker([inf.lat, inf.lon], {
          radius: 7, fillColor: inf.color, color: '#fff', weight: 2, fillOpacity: 0.9,
        })
        marker.bindPopup(`
          <div class="map-popup">
            <div class="popup-title">🌉 ${inf.name}</div>
            <div class="popup-row"><span class="popup-label">Type</span><span class="popup-value">${inf.type}</span></div>
          </div>
        `)
        infraGroup.addLayer(marker)
      })
    }

    if (activeLayers.evacuation) {
      EVACUATION_SHELTERS.forEach(ev => {
        const marker = L.marker([ev.lat, ev.lon], {
          icon: L.divIcon({
            className: 'evac-label',
            html: `<div style="background:#16a34a;color:#fff;font-size:10px;font-weight:800;padding:2px 6px;border-radius:4px;border:1px solid #fff;white-space:nowrap;">⛺ ${ev.name}</div>`,
            iconSize: [120, 20],
          }),
        })
        marker.bindPopup(`
          <div class="map-popup">
            <div class="popup-title">⛺ ${ev.name}</div>
            <div class="popup-row"><span class="popup-label">Capacity</span><span class="popup-value" style="color:#4ade80;">${ev.capacity}</span></div>
          </div>
        `)
        evacGroup.addLayer(marker)
      })
    }
  }, [activeLayers.infrastructure, activeLayers.evacuation])

  // ── 5. Render Stations, Barrages, and Dams Pins ───────────────────────────
  useEffect(() => {
    const group = stationGroupRef.current
    if (!group) return
    group.clearLayers()

    stations.forEach(feat => {
      const props = feat.properties || {}
      const coords = feat.geometry?.coordinates
      if (!coords || coords.length < 2) return

      const lon = Number(coords[0])
      const lat = Number(coords[1])
      const name = props.station_name || ''
      const isDam = name.toLowerCase().includes('dam')
      const isBarrage = name.toLowerCase().includes('barrage') || name.toLowerCase().includes('headworks')

      // Check toggles: stations | barrages | dams
      const showStation = Boolean(activeLayers.stations)
      const showBarrage = Boolean(activeLayers.barrages) && isBarrage
      const showDam     = Boolean(activeLayers.dams) && isDam

      if (!showStation && !showBarrage && !showDam) return

      const status = props.flood_status || 'Normal'
      const statusColor = props.status_color || (
        status === 'Very High Flood' ? '#7c3aed' :
        status === 'High Flood' ? '#ef4444' :
        status === 'Medium Flood' ? '#f97316' :
        status === 'Low Flood' ? '#eab308' : '#22c55e'
      )

      const marker = L.circleMarker([lat, lon], {
        radius: isDam ? 10 : isBarrage ? 9 : 7,
        fillColor: isDam ? '#38bdf8' : statusColor,
        color: '#ffffff',
        weight: 2,
        fillOpacity: 0.95,
      })

      const disK = props.discharge_cusecs ? (props.discharge_cusecs / 1000).toFixed(1) + 'K' : '--'
      const popupHtml = `
        <div class="map-popup">
          <div class="popup-title">${isDam ? '🧱' : isBarrage ? '🏗️' : '📍'} ${props.station_name}</div>
          <div class="popup-row"><span class="popup-label">River</span><span class="popup-value">${props.river_name}</span></div>
          <div class="popup-row"><span class="popup-label">Status</span><span class="popup-value" style="color:${statusColor}; font-weight:700;">${status}</span></div>
          <div class="popup-row"><span class="popup-label">Discharge</span><span class="popup-value">${disK} cusecs</span></div>
          <div style="margin-top:8px; text-align:center;">
            <span style="color:#00f0ff; font-size:10px; font-weight:700; cursor:pointer; text-decoration:underline;">
              Click pin for 12-metric detail & forecast graph 📊
            </span>
          </div>
        </div>
      `

      marker.bindPopup(popupHtml, { className: 'leaflet-custom-popup' })
      marker.on('click', () => {
        onStationSelect?.({
          id: props.id,
          station_name: props.station_name,
          discharge_cusecs: props.discharge_cusecs,
          current_level_m: props.current_level_m,
          danger_level_m: props.danger_level_m,
          warning_level_m: props.warning_level_m,
        })
      })

      group.addLayer(marker)
    })
  }, [stations, activeLayers.stations, activeLayers.barrages, activeLayers.dams, onStationSelect])

  // ── 6. Render Raster Overlay (Inundation / Rainfall / Radar / Population) ──
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    if (rasterLayerRef.current) {
      map.removeLayer(rasterLayerRef.current)
      rasterLayerRef.current = null
    }

    // Live OpenWeatherMap Precipitation Radar
    if (activeLayers.radar) {
      const radarLayer = L.tileLayer(
        'https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=822a8cf65299dd975338e4bbd7f0e428',
        { opacity: 0.75, maxZoom: 18 }
      )
      radarLayer.addTo(map)
      rasterLayerRef.current = radarLayer
      return
    }

    let activeRasterKey = null
    if (activeLayers.inundation) activeRasterKey = 'inundation'
    else if (activeLayers.rainfall) activeRasterKey = 'hazard'
    else if (activeLayers.population) activeRasterKey = 'risk'

    if (!activeRasterKey) return

    const tileData = geeTileUrls[activeRasterKey]
    if (!tileData?.tile_url) return

    setTileLoading(true)
    const layer = L.tileLayer(tileData.tile_url, { opacity: 0.82, maxZoom: 18 })
    layer.on('load', () => setTileLoading(false))
    layer.on('tileerror', () => setTileLoading(false))
    layer.addTo(map)
    rasterLayerRef.current = layer
  }, [activeLayers.inundation, activeLayers.rainfall, activeLayers.population, activeLayers.radar, geeTileUrls])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapRef} id="main-leaflet-map" style={{ width: '100%', height: '100%', background: '#081427' }} />

      {tileLoading && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 2000, background: 'rgba(8,20,39,0.92)', border: '1px solid rgba(0,240,255,0.3)',
          borderRadius: 14, padding: '18px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          backdropFilter: 'blur(12px)', pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 28, animation: 'spin 2s linear infinite' }}>🛰</div>
          <div style={{ color: '#00f0ff', fontWeight: 700, fontSize: 12 }}>Fetching GEE Satellite Overlay…</div>
        </div>
      )}
    </div>
  )
}
