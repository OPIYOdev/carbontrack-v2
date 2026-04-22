// src/components/ActionWorkflow.jsx
import React, { useState } from 'react'
import { getActions, updateAction } from '../utils/actionStore'
import { logEvent } from '../utils/auditTrail'

const PRIORITY_STYLE = {
  high: { bg: '#FCEBEB', text: '#791F1F', border: '#F7C1C1' },
  medium: { bg: '#FAEEDA', text: '#633806', border: '#FAC775' },
  low: { bg: '#EAF3DE', text: '#27500A', border: '#C0DD97' },
}

const STATUS_STYLE = {
  pending: { bg: '#FAEEDA', text: '#633806' },
  approved: { bg: '#EAF3DE', text: '#27500A' },
  rejected: { bg: '#FCEBEB', text: '#791F1F' },
  escalated: { bg: '#EEEDFE', text: '#3C3489' },
  completed: { bg: '#F1EFE8', text: '#5F5E5A' },
}

export default function ActionWorkflow({ role }) {
  const [actions, setActions] = useState(getActions())
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')

  function refresh() { setActions(getActions()) }

  function act(id, newStatus) {
    const action = actions.find((a) => a.id === id)
    const updates = {
      status: newStatus,
      resolvedBy: role,
      resolvedAt: new Date().toISOString(),
      note: note || undefined,
    }
    updateAction(id, updates)
    logEvent({
      type: newStatus === 'approved' ? 'approval' : newStatus === 'rejected' ? 'rejection' : 'escalation',
      actor: role, role,
      action: `${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}: ${action?.title}`,
      detail: note || `Action ${newStatus} by ${role}`,
      sourceRef: id, confidence: null,
    })
    setNote('')
    setSelected(null)
    refresh()
  }

  const canAct = (action) =>
    action.status === 'pending' &&
    (action.owner === role || action.approvalRequired === role || role === 'executive')

  const filtered = actions.filter((a) => {
    if (filter === 'mine') return a.owner === role || a.approvalRequired === role
    if (filter === 'pending') return a.status === 'pending'
    if (filter === 'resolved') return ['approved', 'rejected', 'completed', 'escalated'].includes(a.status)
    return true
  })

  const pending = actions.filter((a) => a.status === 'pending').length
  const myPending = actions.filter((a) => a.status === 'pending' && (a.owner === role || a.approvalRequired === role)).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <h2>Action Workflow</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
          Insights routed for review, approval, and follow-up · every decision is logged
        </p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: '10px' }}>
        {[
          { label: 'Total actions', val: actions.length, color: 'var(--text-1)' },
          { label: 'Pending', val: pending, color: '#854F0B' },
          { label: 'My queue', val: myPending, color: '#A32D2D' },
          { label: 'Approved', val: actions.filter((a) => a.status === 'approved').length, color: 'var(--green-600)' },
        ].map((k) => (
          <div key={k.label} style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>{k.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {myPending > 0 && (
        <div className="alert alert-warn">
          <strong>Your queue:</strong> {myPending} action{myPending > 1 ? 's' : ''} require your attention as <strong>{role.replace('_', ' ')}</strong>.
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {[['all','All'],['mine','My queue'],['pending','Pending'],['resolved','Resolved']].map(([v,l]) => (
          <button key={v} className="btn" onClick={() => setFilter(v)}
            style={{ background: filter === v ? 'var(--green-600)' : 'var(--surface)', color: filter === v ? 'var(--green-50)' : 'var(--text-1)', fontSize: '12px', padding: '6px 12px' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Action list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map((action) => {
          const ps = PRIORITY_STYLE[action.priority]
          const ss = STATUS_STYLE[action.status] || STATUS_STYLE.pending
          const isOpen = selected === action.id
          const mine = canAct(action)

          return (
            <div key={action.id} className="card" style={{ padding: '12px 14px', border: mine && action.status === 'pending' ? '1px solid var(--amber-600)' : '0.5px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer' }}
                onClick={() => setSelected(isOpen ? null : action.id)}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span className="mono" style={{ fontSize: '10px', color: 'var(--text-3)' }}>{action.id}</span>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: ps.bg, color: ps.text, border: `0.5px solid ${ps.border}` }}>
                      {action.priority}
                    </span>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: ss.bg, color: ss.text }}>
                      {action.status}
                    </span>
                    <span className="tag tag-gray" style={{ fontSize: '10px' }}>owner: {action.owner}</span>
                    {mine && action.status === 'pending' && (
                      <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: 'var(--amber-50)', color: 'var(--amber-600)', fontWeight: 600 }}>
                        → needs your review
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-1)', marginBottom: '3px' }}>
                    {action.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                    {new Date(action.createdAt).toLocaleDateString()} · due: {action.dueDate} · approval: {action.approvalRequired}
                  </div>
                </div>
                <span style={{ color: 'var(--text-3)', fontSize: '16px', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {isOpen && (
                <div style={{ marginTop: '12px', borderTop: '0.5px solid var(--border)', paddingTop: '12px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '10px' }}>
                    {action.description}
                  </p>

                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Evidence</div>
                    {action.evidence.map((e, i) => (
                      <div key={i} style={{ fontSize: '12px', color: 'var(--text-2)', padding: '3px 0', borderBottom: '0.5px solid var(--border)' }}>
                        {e}
                      </div>
                    ))}
                    <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px' }}>Source: {action.sourceRef}</div>
                    {action.confidence && (
                      <div style={{ fontSize: '10px', color: 'var(--green-600)', marginTop: '2px' }}>
                        Confidence: {(action.confidence * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>

                  {action.status === 'approved' && action.approvedBy && (
                    <div className="alert alert-success" style={{ fontSize: '12px', padding: '8px 10px' }}>
                      Approved by {action.approvedBy} on {new Date(action.approvedAt).toLocaleDateString()}
                    </div>
                  )}

                  {mine && action.status === 'pending' && (
                    <div>
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-2)', marginBottom: '4px' }}>
                          Add note (optional)
                        </label>
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Reason for decision, conditions, or follow-up instructions…"
                          style={{ width: '100%', padding: '8px', border: '0.5px solid var(--border-md)', borderRadius: '6px',
                            background: 'var(--surface)', color: 'var(--text-1)', fontSize: '12px', height: '64px', resize: 'none', fontFamily: 'var(--font)' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary" style={{ fontSize: '12px', padding: '7px 14px' }} onClick={() => act(action.id, 'approved')}>
                          Approve
                        </button>
                        <button className="btn" style={{ fontSize: '12px', padding: '7px 14px', color: '#A32D2D', borderColor: '#F7C1C1' }} onClick={() => act(action.id, 'rejected')}>
                          Reject
                        </button>
                        <button className="btn" style={{ fontSize: '12px', padding: '7px 14px', color: '#534AB7', borderColor: '#AFA9EC' }} onClick={() => act(action.id, 'escalated')}>
                          Escalate ↑
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)', fontSize: '13px' }}>
          No actions in this view
        </div>
      )}
    </div>
  )
}
