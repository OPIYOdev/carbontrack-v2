// src/components/AIAnalyst.jsx — High-impact stakeholder dashboard
import React, { useState } from 'react'
import { FLEET, getFleetSummary } from '../data/fleet'
import { logEvent } from '../utils/auditTrail'
import { addAction } from '../utils/actionStore'

// Helper to safely format numbers that might be strings or have commas
const formatKES = (val) => {
  if (val === null || val === undefined) return '—';
  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
  if (isNaN(num)) return val;
  return Math.round(num).toLocaleString('en-KE');
};

const formatNum = (val) => {
  if (val === null || val === undefined) return '—';
  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
  if (isNaN(num)) return val;
  return num.toLocaleString();
};

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>AI Strategic Analyst</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>Institutional transport intelligence for <strong>{role.replace('_',' ')}</strong></p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '8px' }}>Analysis Focus</div>
          <select value={scenario} onChange={(e) => setScenario(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border-md)', borderRadius: '8px', background: 'var(--surface)', color: 'var(--text-1)', fontSize: '13px', fontWeight: 500 }}>
            <option value="">General Fleet Strategy</option>
            <option value="EV fleet conversion">EV Conversion Feasibility</option>
            <option value="route consolidation">Route Optimization</option>
            <option value="modal shift BRT">Modal Shift (BRT/Rail)</option>
            <option value="high-emitter intervention">High-Emitter Intervention</option>
          </select>
        </div>
      </div>

      {/* Initial State / Run Analysis */}
      {!result && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', background: 'linear-gradient(to bottom right, var(--surface), var(--surface-2))' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h2 style={{ marginBottom: '8px' }}>Ready to Analyze Fleet Performance</h2>
          <p style={{ color: 'var(--text-2)', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
            Generate a high-level strategic report based on your current fleet data ({fleetSummary.totalVehicles} vehicles).
          </p>
          <button className="btn btn-primary" onClick={runAnalysis} style={{ padding: '12px 32px', fontSize: '15px', fontWeight: 600 }}>
            Generate Strategic Report ↗
          </button>
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <span className="spinner" style={{ width: '40px', height: '40px', marginBottom: '20px' }} />
          <h2 style={{ marginBottom: '8px' }}>Synthesizing Intelligence…</h2>
          <p style={{ color: 'var(--text-2)' }}>Applying IPCC Tier 1 methodology and Kenya NDC 3.0 benchmarks.</p>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ padding: '16px' }}>
          <strong>Analysis Interrupted:</strong> {error}
        </div>
      )}

      {/* Dashboard Result State */}
      {result && !result.parseError && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Top Row: Executive Summary & Next Action */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ fontSize: '12px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Executive Summary</h3>
              <p style={{ fontSize: '18px', lineHeight: 1.5, fontWeight: 500, color: 'var(--text-1)' }}>{result.summary}</p>
              {result.roleInsight && (
                <div style={{ marginTop: '16px', padding: '12px', background: 'var(--green-50)', borderRadius: '8px', borderLeft: '4px solid var(--green-600)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--green-800)', textTransform: 'uppercase' }}>{role.replace('_',' ')} Insight: </span>
                  <span style={{ fontSize: '13px', color: 'var(--green-900)' }}>{result.roleInsight}</span>
                </div>
              )}
            </div>

            <div style={{ background: 'var(--blue-600)', color: 'white', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 10px 20px rgba(24, 95, 165, 0.15)' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.8, letterSpacing: '1px', marginBottom: '16px' }}>Priority Next Step</div>
                <div style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1.3, marginBottom: '8px' }}>{result.nextAction?.action}</div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>Owner: <strong>{result.nextAction?.owner?.replace('_',' ')}</strong></div>
              </div>
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', opacity: 0.8 }}>Target Deadline</span>
                <span style={{ fontSize: '16px', fontWeight: 700 }}>{result.nextAction?.deadline}</span>
              </div>
            </div>
          </div>

          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '8px' }}>Annual Emissions</div>
              <div style={{ fontSize: '22px', fontWeight: 700 }}>{formatNum(result.ndcAlignment?.annualEstimate)} <span style={{ fontSize: '12px', fontWeight: 400 }}>tCO₂eq</span></div>
            </div>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '8px' }}>NDC Risk Level</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: riskColor[result.ndcAlignment?.trajectoryRisk?.toLowerCase()] || 'var(--text-1)' }}>{result.ndcAlignment?.trajectoryRisk?.toUpperCase()}</div>
            </div>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '8px' }}>Annual Fuel Bill</div>
              <div style={{ fontSize: '22px', fontWeight: 700 }}>KES {formatKES(result.financialSummary?.total_annual_fuel_cost_kes)}</div>
            </div>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '8px' }}>Credit Potential</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--green-600)' }}>KES {formatKES(result.financialSummary?.carbon_credit_potential_annual_kes)}</div>
            </div>
          </div>

          {/* Main Content: Opportunities & Strategy */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
            
            {/* Opportunities List */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Strategic Opportunities</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {result.topOpportunities?.map((op) => (
                  <div key={op.rank} className="card" style={{ padding: '20px', borderLeft: op.rank === 1 ? '4px solid var(--green-600)' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)' }}>{op.action}</div>
                      <div style={{ fontSize: '11px', background: 'var(--green-50)', color: 'var(--green-700)', padding: '4px 10px', borderRadius: '20px', fontWeight: 700 }}>{Math.round((parseFloat(op.confidence) || 0) * 100)}% Confidence</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>Monthly Saving</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--green-700)' }}>−{formatNum(op.saving_tco2eq_month)} tCO₂e</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>Annual Benefit</div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>KES {formatKES(op.financial?.total_annual_benefit_kes)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>Payback</div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{op.financial?.payback_years || 'Immediate'} yr</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-2)', padding: '10px', background: 'var(--surface-2)', borderRadius: '6px' }}>
                      <strong>Impact:</strong> {op.distributionalImpact}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Side Column: Compliance & Policy */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Compliance Status</h3>
                <div className="card" style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-100)', padding: '16px' }}>
                  {result.complianceFlags?.map((f, i) => (
                    <div key={i} style={{ marginBottom: i === result.complianceFlags.length - 1 ? 0 : '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#A32D2D' }}>{f.flag}</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: riskColor[f.severity?.toLowerCase()], textTransform: 'uppercase' }}>{f.severity}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>{f.regulation}</div>
                    </div>
                  ))}
                  {(!result.complianceFlags || result.complianceFlags.length === 0) && (
                    <div style={{ fontSize: '13px', color: 'var(--green-700)', fontWeight: 500 }}>✅ No immediate compliance risks identified.</div>
                  )}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Policy Recommendation</h3>
                <div className="card" style={{ background: 'var(--green-600)', color: 'white', padding: '20px' }}>
                  <p style={{ fontSize: '14px', lineHeight: 1.5, fontWeight: 500 }}>{result.policyRecommendation}</p>
                </div>
              </div>

              <div className="card" style={{ background: 'var(--surface-2)', padding: '16px' }}>
                <h3 style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '8px' }}>Data Quality Note</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-2)', fontStyle: 'italic' }}>{result.uncertaintyNote}</p>
              </div>
            </div>

          </div>

          {/* Footer / Re-run */}
          <div style={{ textAlign: 'center', padding: '20px 0', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-outline" onClick={() => setResult(null)} style={{ fontSize: '13px' }}>
              Reset and Re-analyze
            </button>
          </div>

        </div>
      )}

      {/* Fallback for Parse Error */}
      {result?.parseError && (
        <div className="card">
          <h3 style={{ marginBottom: '12px' }}>Technical Output</h3>
          <div className="alert alert-warn" style={{ marginBottom: '16px' }}>
            The AI response was generated but could not be formatted into the dashboard.
          </div>
          <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', color: 'var(--text-2)', background: 'var(--surface-2)', padding: '16px', borderRadius: '8px' }}>{result.raw}</pre>
          <button className="btn btn-primary" onClick={runAnalysis} style={{ marginTop: '16px' }}>Retry Analysis</button>
        </div>
      )}
    </div>
  )
}
