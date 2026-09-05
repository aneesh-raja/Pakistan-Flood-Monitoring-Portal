/**
 * FloodBulletinModal.jsx
 * Official FFD / NDMA Flood Bulletins Feed & Warning Dissemination Tool.
 */
import { useState, useEffect } from 'react'
import { getFloodBulletins } from '../../services/api.js'

export default function FloodBulletinModal({ onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(null)
  const [selectedBulletin, setSelectedBulletin] = useState(null)

  useEffect(() => {
    getFloodBulletins()
      .then(res => {
        setData(res)
        if (res?.bulletins?.length) setSelectedBulletin(res.bulletins[0])
      })
      .catch(err => console.error('Error fetching bulletins:', err))
      .finally(() => setLoading(false))
  }, [])

  const handleCopySMS = (bulletin) => {
    const text = `🚨 NDMA FLOOD WARNING [${bulletin.severity}]\nLocation: ${bulletin.river} River / ${bulletin.target_districts.join(', ')}\nHeadline: ${bulletin.headline}\nAction: ${bulletin.action_required}\nHorizon: ${bulletin.horizon}\nSource: FFD / NDMA PK`
    navigator.clipboard.writeText(text)
    setCopiedId(bulletin.id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.82)', backdropFilter: 'blur(10px)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #0b172a 0%, #081224 100%)',
        border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: 16,
        width: '100%', maxWidth: 880, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.6)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 24 }}>📢</div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: '#f8fafc', fontWeight: 700 }}>
                Flood Bulletins & Warning Dissemination
              </h2>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                Official Advisories — Flood Forecasting Division (FFD) / NDMA Pakistan
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer',
          }}>✕</button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#00f0ff' }}>Loading official FFD bulletins…</div>
          ) : (
            <>
              {/* Synoptic Situation Overview */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700, letterSpacing: '0.05em' }}>
                  SYNOPTIC HYDROLOGICAL SITUATION (OFFICIAL)
                </div>
                <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
                  {data?.synoptic_situation}
                </div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                  Bulletin No: {data?.bulletin_number} | Authority: {data?.issuing_authority}
                </div>
              </div>

              {/* Bulletins Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                {data?.bulletins?.map(b => (
                  <div key={b.id}
                    onClick={() => setSelectedBulletin(b)}
                    style={{
                      background: selectedBulletin?.id === b.id ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.45)',
                      border: `1px solid ${selectedBulletin?.id === b.id ? b.badge_color : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{
                        background: b.badge_color, color: '#fff', fontSize: 10, fontWeight: 800,
                        padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase',
                      }}>
                        {b.severity}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>⏱ {b.horizon}</span>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 6, lineHeight: 1.3 }}>
                      {b.title}
                    </div>

                    <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.4, marginBottom: 10 }}>
                      {b.headline}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {b.target_districts.map(d => (
                        <span key={d} style={{
                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#94a3b8', fontSize: 10, padding: '1px 6px', borderRadius: 3,
                        }}>
                          📍 {d}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Warning Dissemination Studio */}
              {selectedBulletin && (
                <div style={{
                  background: 'rgba(8, 20, 39, 0.95)', border: `1px solid ${selectedBulletin.badge_color}66`,
                  borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#00f0ff' }}>
                      ⚡ WARNING DISSEMINATION STUDIO — {selectedBulletin.id}
                    </div>
                    <button
                      onClick={() => handleCopySMS(selectedBulletin)}
                      style={{
                        background: copiedId === selectedBulletin.id ? '#22c55e' : '#0284c7',
                        border: 'none', color: '#fff', fontSize: 11, fontWeight: 700,
                        padding: '6px 14px', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s',
                      }}
                    >
                      {copiedId === selectedBulletin.id ? '✓ SMS Text Copied!' : '📲 Copy SMS Alert Format'}
                    </button>
                  </div>

                  <div style={{
                    background: '#020617', border: '1px dashed rgba(255,255,255,0.15)',
                    borderRadius: 8, padding: 14, fontFamily: 'monospace', fontSize: 11, color: '#e2e8f0', lineHeight: 1.6,
                  }}>
                    <div><strong>[SMS ADVISORY FORMAT FOR DDMA DISPATCH]</strong></div>
                    <div style={{ color: selectedBulletin.badge_color, marginTop: 4 }}>
                      🚨 NDMA FLOOD ALERT ({selectedBulletin.severity}): {selectedBulletin.title}
                    </div>
                    <div style={{ color: '#94a3b8', marginTop: 4 }}>
                      ACTION: {selectedBulletin.action_required}
                    </div>
                    <div style={{ color: '#64748b', marginTop: 4 }}>
                      AFFECTED DISTRICTS: {selectedBulletin.target_districts.join(', ')}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
