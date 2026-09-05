/**
 * pdfExportUtils.js
 * Generates a formatted Pakistan Flood Situation Report PDF.
 * Uses jsPDF for direct PDF generation without html2canvas for better reliability.
 */
import { jsPDF } from 'jspdf'

const BRAND_BLUE  = [2, 132, 199]
const BRAND_RED   = [239, 68, 68]
const BRAND_AMBER = [245, 158, 11]
const DARK_BG     = [8, 20, 39]
const WHITE       = [255, 255, 255]
const LIGHT_GREY  = [240, 244, 248]
const MID_GREY    = [148, 163, 184]

function setFill(doc, rgb) { doc.setFillColor(...rgb) }
function setTextColor(doc, rgb) { doc.setTextColor(...rgb) }
function setDrawColor(doc, rgb) { doc.setDrawColor(...rgb) }

/**
 * Generate and download a Flood Situation Report PDF.
 * @param {object} reportData - { summary, alerts, districts, stations, weatherData, activeLayer }
 */
export async function exportFloodSituationReport(reportData = {}) {
  const {
    summary = {},
    alerts = [],
    districts = [],
    stations = [],
    weatherData = [],
    activeLayer = 'inundation',
  } = reportData

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })

  let y = 0

  // ── Cover Header ───────────────────────────────────────────────────────────
  setFill(doc, DARK_BG)
  doc.rect(0, 0, W, 45, 'F')

  // Pakistan flag stripe
  setFill(doc, [1, 66, 106])
  doc.rect(0, 0, 8, 45, 'F')
  setFill(doc, [0, 130, 60])
  doc.rect(8, 0, 4, 45, 'F')

  setTextColor(doc, [0, 240, 255])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('PAKISTAN FLOOD MONITORING PORTAL', 20, 15)

  setTextColor(doc, WHITE)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('National Disaster Management Authority — Early Warning System', 20, 22)

  setTextColor(doc, [148, 163, 184])
  doc.setFontSize(8)
  doc.text(`Report Generated: ${dateStr} at ${timeStr} PKT`, 20, 30)
  doc.text('CONFIDENTIAL — FOR OFFICIAL USE ONLY', 20, 36)

  // Alert badge
  if (alerts.length > 0) {
    setFill(doc, BRAND_RED)
    doc.roundedRect(140, 10, 58, 14, 3, 3, 'F')
    setTextColor(doc, WHITE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(`⚠ ${alerts.length} ACTIVE FLOOD ALERTS`, 169, 17, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text('Immediate attention required', 169, 22, { align: 'center' })
  }

  y = 52

  // ── Section 1: National Summary ────────────────────────────────────────────
  setTextColor(doc, BRAND_BLUE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('1. NATIONAL FLOOD IMPACT SUMMARY', 14, y)

  setDrawColor(doc, BRAND_BLUE)
  doc.setLineWidth(0.5)
  doc.line(14, y + 2, W - 14, y + 2)
  y += 8

  const stats = [
    { label: 'Population at Risk',   value: summary.total_affected_population ? Number(summary.total_affected_population).toLocaleString() : 'Calculating…', color: BRAND_RED },
    { label: 'Buildings Exposed',    value: summary.total_buildings_at_risk    ? Number(summary.total_buildings_at_risk).toLocaleString() : '—',             color: BRAND_AMBER },
    { label: 'Inundated Area (km²)', value: summary.total_inundated_area_sqkm  ? `${summary.total_inundated_area_sqkm.toLocaleString()} km²` : '—',          color: [6, 182, 212] },
    { label: 'Severe Risk Districts', value: summary.districts_at_severe_risk || '—', color: BRAND_RED },
    { label: 'High Risk Districts',   value: summary.districts_at_high_risk    || '—', color: BRAND_AMBER },
    { label: 'Affected Districts',    value: summary.total_affected_districts   || '—', color: [34, 197, 94] },
  ]

  const cardW = (W - 28 - 10) / 3
  let cx = 14
  stats.forEach((s, i) => {
    setFill(doc, [15, 30, 55])
    doc.roundedRect(cx, y, cardW, 20, 2, 2, 'F')
    setDrawColor(doc, s.color)
    doc.setLineWidth(0.6)
    doc.line(cx, y, cx, y + 20)
    doc.setLineWidth(0.1)

    setTextColor(doc, MID_GREY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(s.label.toUpperCase(), cx + 4, y + 7)

    setTextColor(doc, WHITE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(String(s.value), cx + 4, y + 16)

    cx += cardW + 5
    if (i === 2) { cx = 14; y += 24 }
  })
  y += 28

  // ── Section 2: Active Flood Alerts ─────────────────────────────────────────
  setTextColor(doc, BRAND_RED)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('2. ACTIVE FLOOD ALERTS', 14, y)
  setDrawColor(doc, BRAND_RED)
  doc.setLineWidth(0.5)
  doc.line(14, y + 2, W - 14, y + 2)
  y += 8

  if (alerts.length === 0) {
    setTextColor(doc, [34, 197, 94])
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.text('✓ No active flood alerts at this time.', 14, y)
    y += 8
  } else {
    // Table header
    setFill(doc, [20, 40, 70])
    doc.rect(14, y, W - 28, 8, 'F')
    setTextColor(doc, [0, 240, 255])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('Barrage / Station', 17, y + 5.5)
    doc.text('River', 72, y + 5.5)
    doc.text('Province', 100, y + 5.5)
    doc.text('Level (m)', 130, y + 5.5)
    doc.text('Status', 160, y + 5.5)
    y += 9

    alerts.slice(0, 10).forEach((a, idx) => {
      setFill(doc, idx % 2 === 0 ? [12, 25, 48] : [15, 32, 60])
      doc.rect(14, y, W - 28, 8, 'F')

      const statusColor = a.flood_status === 'Very High Flood' ? BRAND_BLUE :
                          a.flood_status === 'High Flood'      ? BRAND_RED :
                          a.flood_status === 'Medium Flood'    ? BRAND_AMBER : [34, 197, 94]

      setTextColor(doc, WHITE)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.text(a.station_name || '—', 17, y + 5.5)
      doc.text(a.river_name || '—', 72, y + 5.5)
      doc.text(a.province || '—', 100, y + 5.5)
      doc.text(a.current_level_m ? `${a.current_level_m} m` : '—', 130, y + 5.5)

      setTextColor(doc, statusColor)
      doc.setFont('helvetica', 'bold')
      doc.text(a.flood_status || '—', 160, y + 5.5)
      y += 8
    })
    y += 6
  }

  // ── Section 3: Top Affected Districts ──────────────────────────────────────
  if (y > 230) { doc.addPage(); y = 20 }

  setTextColor(doc, BRAND_AMBER)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('3. TOP AFFECTED DISTRICTS', 14, y)
  setDrawColor(doc, BRAND_AMBER)
  doc.setLineWidth(0.5)
  doc.line(14, y + 2, W - 14, y + 2)
  y += 8

  if (districts.length === 0) {
    setTextColor(doc, MID_GREY)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.text('No district impact data available.', 14, y)
    y += 8
  } else {
    setFill(doc, [20, 40, 70])
    doc.rect(14, y, W - 28, 8, 'F')
    setTextColor(doc, [0, 240, 255])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('District', 17, y + 5.5)
    doc.text('Province', 72, y + 5.5)
    doc.text('Population at Risk', 110, y + 5.5)
    doc.text('Risk Level', 162, y + 5.5)
    y += 9

    districts.slice(0, 12).forEach((d, idx) => {
      setFill(doc, idx % 2 === 0 ? [12, 25, 48] : [15, 32, 60])
      doc.rect(14, y, W - 28, 8, 'F')

      const rColor = d.risk_score === 'Severe' ? BRAND_RED :
                     d.risk_score === 'High'   ? BRAND_AMBER :
                     d.risk_score === 'Moderate' ? [6, 182, 212] : [34, 197, 94]

      setTextColor(doc, WHITE)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.text(d.district_name || d.district || '—', 17, y + 5.5)
      doc.text(d.province || '—', 72, y + 5.5)
      doc.text(d.affected_population ? Number(d.affected_population).toLocaleString() : '—', 110, y + 5.5)

      setTextColor(doc, rColor)
      doc.setFont('helvetica', 'bold')
      doc.text(d.risk_score || '—', 162, y + 5.5)
      y += 8
    })
    y += 6
  }

  // ── Section 4: Weather Summary ─────────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = 20 }

  setTextColor(doc, [6, 182, 212])
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('4. WEATHER OBSERVATIONS', 14, y)
  setDrawColor(doc, [6, 182, 212])
  doc.setLineWidth(0.5)
  doc.line(14, y + 2, W - 14, y + 2)
  y += 8

  if (weatherData.length > 0) {
    const cols = 3
    const colW = (W - 28 - (cols - 1) * 4) / cols
    let wx = 14

    weatherData.slice(0, 9).forEach((city, idx) => {
      setFill(doc, [15, 30, 55])
      doc.roundedRect(wx, y, colW, 16, 2, 2, 'F')

      setTextColor(doc, [0, 240, 255])
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text(city.city_name || city.name || '—', wx + 3, y + 6)

      setTextColor(doc, WHITE)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`${city.temperature_c || '--'}°C`, wx + 3, y + 13)

      setTextColor(doc, MID_GREY)
      doc.setFontSize(7)
      const desc = city.description || city.weather_desc || ''
      doc.text(desc.substring(0, 18), wx + colW * 0.4, y + 13)

      wx += colW + 4
      if ((idx + 1) % cols === 0) { wx = 14; y += 20 }
    })
    y += 22
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg)
    setFill(doc, [12, 25, 48])
    doc.rect(0, 287, W, 10, 'F')
    setTextColor(doc, MID_GREY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text('Pakistan Flood Monitoring Portal  |  Real-Time Early Warning System  |  Data Sources: GEE, Open-Meteo, OpenWeatherMap', 14, 292.5)
    doc.text(`Page ${pg} of ${totalPages}`, W - 14, 292.5, { align: 'right' })
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  const filename = `Pakistan_Flood_Report_${now.toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
  return filename
}
