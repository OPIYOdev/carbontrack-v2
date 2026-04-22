// src/components/AuditTrail.jsx
import React, { useState } from 'react'
import { getEvents } from '../utils/auditTrail'

const TYPE_STYLE = {
  data_upload:  { label: 'Upload',      bg: '#E6F1FB', text: '#0C447C' },
  extraction:   { label: 'Extract',     bg: '#EEEDFE', text: '#3C3489' },
  validation:   { label: 'Validate',    bg: '#EAF3DE', text: '#27500A' },
  normalization:{ label: 'Normalize',   bg: '#EAF3DE', text: '#3B6D11' },
  ai_analysis:  { label: 'AI',          bg: '#FAEEDA', text: '#633806' },
  recommendation:{ label: 'Recommend',  bg: '#FAEEDA', text: '#854F0B' },
  approval:     { label: 'Approve',     bg: '#EAF3DE', text: '#27500A' },
  rejection:    { label: 'Reject',      bg: '#FCEBEB', text: '#791F1F' },
  escalation:   { label: 'Escalate',    bg: '#EEEDFE', text: '#534AB7' },
  action_completed:{ label: 'Complete', bg: '#F1EFE8', text: '#5F5E5A' },
}

export default function AuditTrail() {
  const [filter, setFilter] = useState('all')
  const events = getEvents()

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter)

  const counts = {}
  events.forEach((e) => { counts[e.type] = (counts[e.type] || 0) + 1 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <h2>Audit Trail</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
          Every extraction, calculation, recommendation, and decision — immutable, sourced, reproducible
        </p>
      </div>

      <div className="alert alert-info">
        <strong>Evidence standard:</strong> Every event records actor, role, timestamp, source reference, and confidence score.
        Transformation chain: upload → extract → normalize → AI analysis → recommendation → decision.
        This log satisfies IPCC reproducibility requirements and Kenya Climate Change Act audit provisions.
      </div>

      {/* Event type summary */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <button onClick={() => setFilter('all')} className="btn" style={{ fontSize: '11px', padding: '5px 10px',
          background: filter === 'all' ? 'var(--surface-3)' : 'var(--surface)' }}>
          All ({events.length})
        </button>
        {Object.entries(TYPE_STYLE).map(([type, s]) => counts[type] ? (
          <button key={type} onClick={() => setFilter(type)} className="btn"
            style={{ fontSize: '11px', padding: '5px 10px', background: filter === type ? s.bg : 'var(--surface)', color: filter === type ? s.text : 'var(--text-2)' }}>
            {s.label} ({counts[type]})
          </button>
        ) : null)}
      </div>

      {/* Event log */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--border)', fontSize: '11px', color: 'var(--text-3)', display: 'flex', gap: '8px' }}>
          <span style={{ width: '80px' }}>Time</span>
          <span style={{ width: '90px' }}>Type</span>
          <span style={{ width: '80px' }}>Actor</span>
          <span style={{ flex: 1 }}>Action / Detail</span>
          <span style={{ width: '90px' }}>Source ref</span>
          <span style={{ width: '60px', textAlign: 'right' }}>Confidence</span>
        </div>

        {filtered.map((evt) => {
          const ts = TYPE_STYLE[evt.type] || { label: evt.type, bg: '#F1EFE8', text: '#444441' }
          return (
            <div key={evt.id} style={{ display: 'flex', gap: '8px', padding: '9px 14px', borderBottom: '0.5px solid var(--border)', alignItems: 'flex-start', fontSize: '12px' }}>
              <div style={{ width: '80px', flexShrink: 0 }}>
                <div className="mono" style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                  {new Date(evt.timestamp).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="mono" style={{ fontSize: '9px', color: 'var(--text-3)' }}>
                  {new Date(evt.timestamp).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                </div>
              </div>
              <div style={{ width: '90px', flexShrink: 0 }}>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', background: ts.bg, color: ts.text }}>
                  {ts.label}
                </span>
              </div>
              <div style={{ width: '80px', flexShrink: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 500 }}>{evt.actor}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{evt.role}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, marginBottom: '2px' }}>{evt.action}</div>
                <div style={{ color: 'var(--text-2)', fontSize: '11px', lineHeight: 1.5 }}>{evt.detail}</div>
              </div>
              <div style={{ width: '90px', flexShrink: 0, fontSize: '10px', color: 'var(--text-3)' }}>
                {evt.sourceRef || '—'}
              </div>
              <div style={{ width: '60px', textAlign: 'right', flexShrink: 0 }}>
                {evt.confidence !== null && evt.confidence !== undefined ? (
                  <span style={{ fontSize: '10px', padding: '2px 5px', borderRadius: '6px', background: 'var(--green-50)', color: 'var(--green-800)' }}>
                    {(evt.confidence * 100).toFixed(0)}%
                  </span>
                ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)', fontSize: '13px' }}>
            No events of this type yet
          </div>
        )}
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>
        Audit trail is append-only. Each entry includes actor, role, UTC timestamp, and source reference.
        In production this persists to a database with cryptographic hash chaining.
        Methodology version: IPCC 2006 Tier 1 · Emission factors: 2022 Kenya GHG Inventory edition.
      </p>
    </div>
  )
}
