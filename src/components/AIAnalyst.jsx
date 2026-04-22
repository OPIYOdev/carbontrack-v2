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
          Powered by Groq · llama-3.3-70b-versatile · role-aware · every finding cited
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
          {/* Executive Summary & Role Insight */}
          <div className="card" style={{ borderLeft: '4px solid var(--green-600)' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Executive Summary</h3>
            <p style={{ fontSize: '15px', lineHeight: 1.6, fontWeight: 500, color: 'var(--text-1)' }}>{result.summary}</p>
            {result.roleInsight && (
              <div style={{ marginTop: '12px', padding: '10px', background: 'var(--green-50)', borderRadius: '8px', border: '0.5px solid var(--green-100)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--green-800)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {role.replace('_',' ')} Perspective
                </div>
                <p style={{ fontSize: '13px', color: 'var(--green-900)', lineHeight: 1.5 }}>{result.roleInsight}</p>
              </div>
            )}
          </div>

          {/* Next Action - High Visibility */}
          {result.nextAction && (
            <div style={{ background: 'var(--blue-600)', color: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 4px 12px rgba(24, 95, 165, 0.2)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.9, marginBottom: '8px' }}>Immediate Next Step</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{result.nextAction.action}</div>
                  <div style={{ fontSize: '13px', opacity: 0.9 }}>Owner: <strong>{result.nextAction.owner.replace('_',' ')}</strong></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>Deadline</div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{result.nextAction.deadline}</div>
                </div>
              </div>
            </div>
          )}

          {/* NDC Alignment & Trajectory */}
          {result.ndcAlignment && (
            <div className="card">
              <h3 style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>NDC Alignment & Trajectory</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Annual Estimate</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-1)' }}>{result.ndcAlignment.annualEstimate.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 400 }}>tCO₂eq</span></div>
                </div>
                <div style={{ background: (riskColor[result.ndcAlignment.trajectoryRisk]||'#888')+'11', padding: '12px', borderRadius: '8px', border: `1px solid ${(riskColor[result.ndcAlignment.trajectoryRisk]||'#888')+'33'}` }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>Trajectory Risk</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: riskColor[result.ndcAlignment.trajectoryRisk]||'#888', textTransform: 'capitalize' }}>{result.ndcAlignment.trajectoryRisk}</div>
                </div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-2)', padding: '8px', background: 'var(--surface-2)', borderRadius: '6px' }}>
                <strong>Benchmark:</strong> {result.ndcAlignment.ndcBenchmark}
              </div>
            </div>
          )}

          {/* Top Opportunities */}
          {result.topOpportunities?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '16px', fontSize: '12px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Strategic Opportunities
              </h3>
              {result.topOpportunities.map((op) => (
                <div key={op.rank} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '16px', background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ background: 'var(--green-600)', color: 'white', width: '24px', height: '24px',
                        borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{op.rank}</span>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-1)' }}>{op.action}</span>
                    </div>
                    <span style={{ fontSize: '11px', background: 'var(--green-50)', color: 'var(--green-700)', padding: '4px 8px', borderRadius: '20px', fontWeight: 600 }}>
                      {Math.round((op.confidence||0)*100)}% Confidence
                    </span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ background: 'var(--green-50)', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--green-700)', fontWeight: 700, textTransform: 'uppercase' }}>Monthly Saving</div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--green-800)' }}>−{op.saving_tco2eq_month} tCO₂eq</div>
                      <div style={{ fontSize: '11px', color: 'var(--green-600)' }}>{op.saving_pct}% reduction</div>
                    </div>
                    {op.financial && (
                      <>
                        <div style={{ background: 'var(--surface-2)', padding: '10px', borderRadius: '8px' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Annual Benefit</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--green-700)' }}>KES {Math.round(op.financial.total_annual_benefit_kes).toLocaleString('en-KE')}</div>
                        </div>
                        {op.financial.payback_years !== null && (
                          <div style={{ background: op.financial.payback_years <= 3 ? 'var(--green-50)' : 'var(--surface-2)', padding: '10px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Payback</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: op.financial.payback_years <= 3 ? 'var(--green-700)' : 'var(--text-1)' }}>{op.financial.payback_years} Years</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5, marginBottom: '12px', padding: '10px', background: 'var(--surface-2)', borderRadius: '6px' }}>
                    <strong>Impact:</strong> {op.distributionalImpact}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-3)', borderTop: '0.5px solid var(--border)', paddingTop: '10px' }}>
                    <div>Approval: <strong style={{ color: 'var(--text-1)' }}>{op.approvalRequired.replace('_',' ')}</strong></div>
                    <div title={op.source}>Source: {op.evidenceLink}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Financial Summary Grid */}
          {result.financialSummary && (
            <div className="card">
              <h3 style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Financial Outlook</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {[
                  ['Current Annual Fuel Bill', result.financialSummary.total_annual_fuel_cost_kes, 'KES'],
                  ['Carbon Credit Potential', result.financialSummary.carbon_credit_potential_annual_kes, 'KES'],
                  ['Route Optimization Saving', result.financialSummary.route_consolidation_saving_kes, 'KES'],
                ].map(([label, val, unit]) => (
                  <div key={label} style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>{label}</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)' }}>
                      {unit} {Math.round(val).toLocaleString('en-KE')}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px', padding: '10px', background: 'var(--blue-50)', borderRadius: '8px', border: '0.5px solid var(--blue-100)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--blue-800)', textTransform: 'uppercase' }}>Best ROI Strategy</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--blue-900)' }}>{result.financialSummary.best_roi_scenario}</div>
                <div style={{ fontSize: '12px', color: 'var(--blue-700)' }}>Expected payback in {result.financialSummary.best_roi_payback_years} years</div>
              </div>
            </div>
          )}

          {/* Compliance & Policy */}
          {(result.complianceFlags?.length > 0 || result.policyRecommendation) && (
            <div className="card" style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-100)' }}>
              <h3 style={{ marginBottom: '12px', fontSize: '12px', color: '#854F0B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Compliance & Policy</h3>
              
              {result.complianceFlags?.map((f, i) => (
                <div key={i} style={{ marginBottom: '12px', padding: '10px', background: 'white', borderRadius: '8px', border: '0.5px solid var(--amber-200)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#A32D2D' }}>{f.flag}</div>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: (riskColor[f.severity]||'#888')+'22', color: riskColor[f.severity]||'#888', fontWeight: 700, textTransform: 'uppercase' }}>{f.severity}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>{f.regulation}</div>
                </div>
              ))}

              {result.policyRecommendation && (
                <div style={{ marginTop: '8px', padding: '12px', background: 'var(--green-600)', borderRadius: '8px', color: 'white' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.9, marginBottom: '4px' }}>Policy Recommendation</div>
                  <p style={{ fontSize: '13px', lineHeight: 1.5, fontWeight: 500 }}>{result.policyRecommendation}</p>
                </div>
              )}
            </div>
          )}

          {/* Data Gaps & Technical Notes */}
          {(result.dataGaps?.length > 0 || result.uncertaintyNote) && (
            <div className="card" style={{ background: 'var(--surface-2)' }}>
              <h3 style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Data Quality & Gaps</h3>
              {result.dataGaps?.length > 0 && (
                <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-2)', marginBottom: '8px' }}>
                  {result.dataGaps.map((g, i) => <li key={i} style={{ marginBottom: '4px' }}>{g}</li>)}
                </ul>
              )}
              {result.uncertaintyNote && (
                <div style={{ fontSize: '11px', color: 'var(--text-3)', fontStyle: 'italic', borderTop: '0.5px solid var(--border)', paddingTop: '8px' }}>
                  Note: {result.uncertaintyNote}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {result?.parseError && (
        <div className="card">
          <h3 style={{ marginBottom: '8px' }}>Analysis Output</h3>
          <div className="alert alert-danger" style={{ marginBottom: '12px' }}>
            The AI response could not be parsed into the standard dashboard format. Showing raw output below.
          </div>
          <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', color: 'var(--text-2)', background: 'var(--surface-2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>{result.raw}</pre>
        </div>
      )}
    </div>
  )
}
