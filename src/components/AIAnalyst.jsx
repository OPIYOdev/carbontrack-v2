// src/components/AIAnalyst.jsx — Groq free API, role-aware, audit-logging
import React, { useState } from 'react'
import { FLEET, getFleetSummary } from '../data/fleet'
import { logEvent } from '../utils/auditTrail'
import { addAction } from '../utils/actionStore'

export default function AIAnalyst({ role, uploadedFleet = [] }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [scenario, setScenario] = useState('')

  const activeFleet = uploadedFleet.length > 0 ? uploadedFleet : FLEET
  const summary = getFleetSummary()

  const fleetSummary = {
    totalVehicles: activeFleet.length,
    source: uploadedFleet.length > 0 ? 'user_uploaded' : 'synthetic_demo',
    byType: summary.byType,
    totalMonthlyEmissions: summary.total,
    totalAnnualEstimate: +(summary.total * 12).toFixed(2),
    oldVehicles: activeFleet.filter((v) => v.age > 8).length,
    dieselVehicles: activeFleet.filter((v) => v.fuel === 'diesel').length,
    avgAge: +(activeFleet.reduce((s, v) => s + v.age, 0) / activeFleet.length).toFixed(1),
  }

  const hotspots = summary.hotspots.map((v) => ({
    id: v.id, type: v.type, fuel: v.fuel, age: v.age, route: v.route, emPerMonth: v.emPerMonth,
  }))

  async function runAnalysis() {
    setLoading(true); setError(null); setResult(null)
    logEvent({ type: 'ai_analysis', actor: role, role, action: 'AI analysis requested',
      detail: `Role: ${role}${scenario ? ' · Scenario: ' + scenario : ''} · Fleet: ${fleetSummary.totalVehicles} vehicles`,
      sourceRef: 'fleet_dataset' })
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fleetSummary, hotspots, totalEmissions: summary.total, scenario, role,
          uploadedData: uploadedFleet.length > 0 ? uploadedFleet.slice(0, 20) : null }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `HTTP ${res.status}`) }
      const data = await res.json()
      setResult(data)
      logEvent({ type: 'recommendation', actor: 'ai_groq', role: 'system',
        action: `AI returned ${data.topOpportunities?.length || 0} opportunities`,
        detail: data.summary || 'Analysis complete',
        sourceRef: 'Groq llama-3.3-70b', confidence: data.topOpportunities?.[0]?.confidence || null })
      if (data.topOpportunities?.length > 0) {
        const top = data.topOpportunities[0]
        addAction({ title: top.action,
          description: `AI recommendation. Saving: ${top.saving_tco2eq_month} tCO2eq/mo. ${top.distributionalImpact}`,
          owner: top.approvalRequired || role, approvalRequired: top.approvalRequired || 'executive',
          createdBy: `ai_analysis (${role})`,
          evidence: [top.evidenceLink || 'AI output', `Confidence: ${Math.round((top.confidence||0)*100)}%`],
          sourceRef: top.source || 'Groq llama-3.3-70b', confidence: top.confidence,
          priority: (top.saving_pct||0) > 30 ? 'high' : (top.saving_pct||0) > 15 ? 'medium' : 'low',
          dueDate: '30 days' })
      }
    } catch (e) {
      setError(e.message)
      logEvent({ type: 'ai_analysis', actor: 'system', role: 'system', action: 'AI analysis failed', detail: e.message })
    } finally { setLoading(false) }
  }

  const riskColor = { high: '#A32D2D', medium: '#854F0B', low: '#3B6D11' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <h2>AI Transport Analyst</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
          Powered by Groq · llama-3.3-70b-versatile · free tier · role-aware · every finding cited
        </p>
      </div>
      <div className="alert alert-warn">
        <strong>Governance:</strong> AI supports decisions — humans make them. Every recommendation is routed
        to Action Workflow for approval. No action taken automatically.
      </div>
      <div className="card">
        <h3 style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Request · role: <span style={{ color: 'var(--green-600)' }}>{role.replace('_',' ')}</span>
        </h3>
        {uploadedFleet.length > 0 && (
          <div className="alert alert-success" style={{ marginBottom: '10px' }}>Using uploaded fleet ({uploadedFleet.length} vehicles)</div>
        )}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-2)', marginBottom: '5px' }}>Focus scenario</label>
          <select value={scenario} onChange={(e) => setScenario(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', border: '0.5px solid var(--border-md)', borderRadius: '6px',
              background: 'var(--surface)', color: 'var(--text-1)', fontSize: '13px' }}>
            <option value="">General fleet analysis</option>
            <option value="EV fleet conversion">EV fleet conversion feasibility</option>
            <option value="route consolidation">Route consolidation opportunities</option>
            <option value="modal shift BRT">Modal shift to BRT/rail</option>
            <option value="high-emitter intervention">High-emitter vehicle intervention</option>
          </select>
        </div>
        <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '10px', fontSize: '12px', color: 'var(--text-2)', marginBottom: '14px' }}>
          {fleetSummary.totalVehicles} vehicles · {summary.total.toFixed(2)} tCO₂eq/mo · avg age {fleetSummary.avgAge}yr · {fleetSummary.oldVehicles} over 8yr · source: {fleetSummary.source}
        </div>
        <button className="btn btn-primary" onClick={runAnalysis} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {loading && <span className="spinner" />}
          {loading ? 'Analysing…' : 'Run analysis ↗'}
        </button>
      </div>
      {error && (
        <div className="alert alert-danger">
          <strong>Error:</strong> {error}.{' '}
          {error.includes('GROQ_API_KEY') ? 'Add GROQ_API_KEY in Vercel → Settings → Environment Variables. Free key: console.groq.com/keys' : 'Check Vercel function logs.'}
        </div>
      )}
      {result && !result.parseError && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card">
            <h3 style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Executive summary</h3>
            <p style={{ fontSize: '13px', lineHeight: 1.7 }}>{result.summary}</p>
            {result.roleInsight && (
              <p style={{ fontSize: '13px', lineHeight: 1.7, marginTop: '8px', color: 'var(--green-800)',
                background: 'var(--green-50)', padding: '8px 10px', borderRadius: '6px' }}>
                <strong>{role.replace('_',' ')} view:</strong> {result.roleInsight}
              </p>
            )}
            {result.ndcAlignment && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                  background: (riskColor[result.ndcAlignment.trajectoryRisk]||'#888')+'22',
                  color: riskColor[result.ndcAlignment.trajectoryRisk]||'#888' }}>
                  NDC risk: {result.ndcAlignment.trajectoryRisk}
                </span>
                <span className="tag tag-gray">{result.ndcAlignment.ndcBenchmark}</span>
              </div>
            )}
          </div>
          {result.topOpportunities?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Top opportunities · added to workflow
              </h3>
              {result.topOpportunities.map((op) => (
                <div key={op.rank} style={{ borderBottom: '0.5px solid var(--border)', paddingBottom: '14px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ background: 'var(--green-50)', color: 'var(--green-800)', width: '22px', height: '22px',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>{op.rank}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, flex: 1 }}>{op.action}</span>
                    <span style={{ fontSize: '10px', background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
                      {op.confidence !== undefined ? Math.round(op.confidence*100)+'% conf.' : ''}
                    </span>
                  </div>
                  <div style={{ marginLeft: '30px' }}>
                    {/* Emission saving */}
                    <div style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '8px' }}>
                      Emission saving: <span style={{ color: '#3B6D11', fontWeight: 600 }}>−{op.saving_tco2eq_month} tCO₂eq/mo (−{op.saving_pct}%)</span>
                    </div>
                    {/* Financial breakdown grid */}
                    {op.financial && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '6px', marginBottom: '8px' }}>
                        {[
                          ['Annual fuel saving',    op.financial.annual_fuel_saving_kes,        '#3B6D11'],
                          ['Maintenance saving/yr', op.financial.annual_maintenance_saving_kes,  '#3B6D11'],
                          ['Carbon credits/yr',     op.financial.carbon_credit_annual_kes,       '#185FA5'],
                          ['Total benefit/yr',      op.financial.total_annual_benefit_kes,       '#3B6D11'],
                          ['Capital required',      op.financial.capital_cost_kes,               op.financial.capital_cost_kes > 0 ? '#854F0B' : '#3B6D11'],
                          ['5-yr net position',     op.financial.five_yr_net_kes ?? op.financial['5yr_net_kes'], op.financial['5yr_net_kes'] > 0 ? '#3B6D11' : '#A32D2D'],
                        ].filter(([,v]) => v !== undefined && v !== null).map(([label, val, color]) => (
                          <div key={label} style={{ background: 'var(--surface-2)', borderRadius: '6px', padding: '6px 8px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '2px' }}>{label}</div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
                              {typeof val === 'number'
                                ? `KES ${Math.round(val).toLocaleString('en-KE')}`
                                : val ?? '—'}
                            </div>
                          </div>
                        ))}
                        {op.financial.payback_years !== null && op.financial.payback_years !== undefined && (
                          <div style={{ background: op.financial.payback_years <= 5 ? 'var(--green-50)' : 'var(--amber-50)', borderRadius: '6px', padding: '6px 8px', border: `0.5px solid ${op.financial.payback_years <= 5 ? 'var(--green-100)' : 'var(--amber-100)'}` }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '2px' }}>Payback period</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: op.financial.payback_years <= 5 ? '#27500A' : '#633806' }}>
                              {op.financial.payback_years}yr
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: '#854F0B', marginBottom: '4px' }}>
                      Distributional: {op.distributionalImpact}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '2px' }}>
                      Approval: <strong>{op.approvalRequired}</strong>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                      Evidence: {op.evidenceLink} · {op.source}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {result.financialSummary && (
              <div className="card">
                <h3 style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Financial summary</h3>
                {[
                  ['Current annual fuel bill', result.financialSummary.total_annual_fuel_cost_kes],
                  ['Best ROI scenario',         result.financialSummary.best_roi_scenario],
                  ['Payback period',            result.financialSummary.best_roi_payback_years ? `${result.financialSummary.best_roi_payback_years}yr` : null],
                  ['Carbon credit potential/yr', result.financialSummary.carbon_credit_potential_annual_kes],
                  ['Route consolidation saving', result.financialSummary.route_consolidation_saving_kes],
                ].filter(([,v]) => v !== null && v !== undefined).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid var(--border)', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-2)' }}>{k}</span>
                    <span style={{ fontFamily: typeof v === 'number' ? 'var(--font-mono)' : 'inherit', fontWeight: 500, color: '#3B6D11' }}>
                      {typeof v === 'number' ? `KES ${Math.round(v).toLocaleString('en-KE')}` : v}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {result.complianceFlags?.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Compliance flags</h3>
                {result.complianceFlags.map((f, i) => (
                  <div key={i} style={{ padding: '5px 0', borderBottom: '0.5px solid var(--border)', fontSize: '12px' }}>
                    <div style={{ fontWeight: 500 }}>{f.flag}</div>
                    <div style={{ color: 'var(--text-3)', fontSize: '11px' }}>{f.regulation} · {f.severity}</div>
                  </div>
                ))}
              </div>
            )}
            {result.dataGaps?.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Data gaps</h3>
                <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.8 }}>
                  {result.dataGaps.map((g, i) => <li key={i}>{g}</li>)}
                </ul>
              </div>
            )}
          </div>
          {result.policyRecommendation && (
            <div style={{ background: 'var(--green-50)', border: '0.5px solid var(--green-100)', borderRadius: '10px', padding: '14px' }}>
              <h3 style={{ marginBottom: '6px', color: 'var(--green-800)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Policy recommendation for EPRA</h3>
              <p style={{ fontSize: '13px', color: 'var(--green-800)', lineHeight: 1.7 }}>{result.policyRecommendation}</p>
              {result.nextAction && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--green-600)' }}>
                  Next: <strong>{result.nextAction.owner}</strong> to {result.nextAction.action} by {result.nextAction.deadline}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {result?.parseError && (
        <div className="card">
          <h3 style={{ marginBottom: '8px' }}>Raw response</h3>
          <pre style={{ fontSize: '11px', whiteSpace: 'pre-wrap', color: 'var(--text-2)' }}>{result.raw}</pre>
        </div>
      )}
    </div>
  )
}
