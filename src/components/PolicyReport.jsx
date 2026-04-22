// src/components/PolicyReport.jsx
import React, { useMemo } from 'react'
import { useFleet } from '../FleetContext'
import { NDC } from '../data/fleet'
import { calcScenarios, ndcGapAnalysis } from '../utils/emissions'

export default function PolicyReport() {
  const { activeFleet, fleetSummary } = useFleet()
  const { totalMonthlyEmissions: totalMonthly, count, isDemo } = fleetSummary
  const totalAnnual = +(totalMonthly * 12).toFixed(2)
  
  const scenarios = useMemo(() => calcScenarios(totalMonthly), [totalMonthly])
  const ndcInfo = useMemo(() => ndcGapAnalysis(totalAnnual), [totalAnnual])
  
  const today = new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })
  const highEmitters = activeFleet.filter((v) => v.age > 8).length
  const dieselCount = activeFleet.filter((v) => v.fuel === 'diesel').length
  const petrolCount = activeFleet.filter((v) => v.fuel === 'petrol').length
  const handlePrint = () => window.print()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Policy Report</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
            Regulatory-ready summary for EPRA submission · NDC 3.0 aligned
          </p>
        </div>
        <button className="btn btn-primary" onClick={handlePrint}>Print / Export PDF</button>
      </div>

      {/* Report */}
      <div className="card" id="policy-report">
        {/* Header */}
        <div style={{ borderBottom: '2px solid var(--green-600)', paddingBottom: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--green-600)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
                Energy and Petroleum Regulatory Authority
              </div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>
                Institutional Fleet Emission Account
              </h1>
              <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                Transport Sector NDC 3.0 Progress Report · {today}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-3)' }}>
              <div>CarbonTrack v1.0</div>
              <div>IPCC Tier 1 Methodology</div>
              <div>Energy Act No. 1 of 2019</div>
            </div>
          </div>
        </div>

        {/* Executive summary */}
        <div style={{ borderLeft: '3px solid var(--green-600)', paddingLeft: '14px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--green-600)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
            Executive Summary
          </h3>
          <p style={{ fontSize: '13px', lineHeight: 1.8, color: 'var(--text-1)' }}>
            This report presents the emission account for a {count}-vehicle institutional fleet over a
            reference period of one month. Total fleet emissions are estimated at{' '}
            <strong>{totalMonthly.toFixed(2)} tCO₂eq/month</strong> (
            <strong>{totalAnnual} tCO₂eq/year</strong>), computed using IPCC Tier 1 emission factors as applied
            in Kenya's National GHG Inventory (EPRA, 2022).
          </p>
          <p style={{ fontSize: '13px', lineHeight: 1.8, color: 'var(--text-1)', marginTop: '8px' }}>
            Kenya's transport sector reached 11.8 MtCO₂eq in 2022 — already above the NDC 3.0 commitment of
            11.5 MtCO₂eq. The BAU trajectory projects 21.0 MtCO₂eq by 2030 against a target of 16.3 MtCO₂eq,
            creating a 4.7 MtCO₂eq gap. Institutional fleets must account for their share of this gap and
            demonstrate a credible reduction pathway.
          </p>
        </div>

        {/* Regulatory basis */}
        <div style={{ borderLeft: '3px solid var(--blue-600)', paddingLeft: '14px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--blue-600)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
            Regulatory Basis
          </h3>
          <ul style={{ fontSize: '13px', lineHeight: 1.8, paddingLeft: '16px', color: 'var(--text-2)' }}>
            <li><strong>Energy Act No. 1 of 2019</strong> — mandates EPRA to ensure efficient operation of the energy sector and promote data-driven regulation</li>
            <li><strong>Climate Change Act 2016 (Cap 387A)</strong> — requires public and private institutions to report on and reduce GHG emissions</li>
            <li><strong>Kenya NDC 3.0 (2030)</strong> — 35% below BAU by 2035; transport sector target: 16.3 MtCO₂eq by 2030</li>
            <li><strong>EMCA (Environmental Management and Coordination Act)</strong> — environmental safeguards for transport operations</li>
            <li><strong>IPCC 2006 Guidelines</strong> — Tier 1 methodology for national and institutional GHG accounting</li>
          </ul>
        </div>

        {/* Emission account */}
        <div style={{ borderLeft: '3px solid var(--amber-600)', paddingLeft: '14px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--amber-600)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
            Emission Account — Reference Month
          </h3>
          <table style={{ marginBottom: '8px' }}>
            <thead>
              <tr><th>Metric</th><th>Value</th><th>Source</th></tr>
            </thead>
            <tbody>
              {[
                ['Total vehicles', `${count}`, isDemo ? 'Pilot fleet dataset' : 'Institutional uploaded fleet'],
                ['Petrol vehicles', `${petrolCount}`, 'Fleet register'],
                ['Diesel vehicles', `${dieselCount}`, 'Fleet register'],
                ['Vehicles >8 years (high-emitter risk)', `${highEmitters}`, 'GIZ fleet age penalty study'],
                ['Total monthly emissions', `${totalMonthly.toFixed(3)} tCO₂eq`, 'IPCC Tier 1 calculation'],
                ['Annual estimate', `${totalAnnual} tCO₂eq`, 'Monthly × 12'],
                ['Emission factor — petrol', '0.00231 tCO₂eq/L', 'IPCC 2006 Table 3.2.1'],
                ['Emission factor — diesel', '0.00268 tCO₂eq/L', 'IPCC 2006 Table 3.2.1'],
                ['NDC national share (est.)', `${ndcInfo.nationalShare.toFixed(4)}%`, 'Kenya GHG Inventory 2022'],
                ['NDC-aligned target (−35%)', `${ndcInfo.targetAnnual.toFixed(2)} tCO₂eq/yr`, 'Kenya NDC 3.0'],
              ].map(([m, v, s]) => (
                <tr key={m}>
                  <td style={{ fontSize: '12px' }}>{m}</td>
                  <td className="mono" style={{ fontSize: '12px', fontWeight: 500 }}>{v}</td>
                  <td style={{ fontSize: '11px', color: 'var(--text-3)' }}>{s}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Scenario pathways */}
        <div style={{ borderLeft: '3px solid var(--green-600)', paddingLeft: '14px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--green-600)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
            Reduction Pathways
          </h3>
          {Object.values(scenarios).map((s) => (
            <div key={s.label} style={{ marginBottom: '10px', padding: '10px', background: 'var(--surface-2)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{s.label}</span>
                <span className="mono" style={{ fontSize: '12px', color: s.color, fontWeight: 600 }}>
                  {s.monthly.toFixed(2)} tCO₂eq/mo
                  {s.reductionPct > 0 && ` (−${s.reductionPct}%)`}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6 }}>{s.description}</p>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '3px' }}>Source: {s.source}</div>
            </div>
          ))}
        </div>

        {/* Data gaps */}
        <div style={{ borderLeft: '3px solid var(--gray-400)', paddingLeft: '14px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
            Data Gaps and Uncertainty
          </h3>
          <ul style={{ fontSize: '13px', lineHeight: 1.8, paddingLeft: '16px', color: 'var(--text-2)' }}>
            <li>Actual fuel purchase receipts per vehicle — proxy: distance ÷ efficiency</li>
            <li>Real-time odometer readings — proxy: assumed daily distance by vehicle type</li>
            <li>Passenger load factors per trip — proxy: vehicle seat capacity</li>
            <li>Vehicle maintenance status — proxy: age-based efficiency penalty (GIZ study)</li>
            <li>Trip-level GPS data — proxy: typical route distance by operator class</li>
          </ul>
          <p style={{ fontSize: '12px', color: '#854F0B', marginTop: '8px' }}>
            Estimated uncertainty: ±15–25% on individual vehicle figures. Aggregate fleet estimates are more
            reliable due to variance cancellation. Full NTSA + fuel marketer API integration would reduce
            uncertainty to ±5–8%.
          </p>
        </div>

        {/* Policy ask */}
        <div style={{ background: 'var(--green-50)', border: '0.5px solid var(--green-100)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--green-800)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
            Concrete Ask of EPRA
          </h3>
          <p style={{ fontSize: '13px', lineHeight: 1.8, color: 'var(--green-800)' }}>
            CarbonTrack supports NDC 3.0's 35% below BAU target and aligns with EPRA's mandate under the Energy
            Act 2019. A county fleet of 50 vehicles operating this tool can identify <strong>15–20% emission
            reduction opportunities within the existing budget</strong> through route consolidation and
            high-emitter vehicle targeting.
          </p>
          <p style={{ fontSize: '13px', lineHeight: 1.8, color: 'var(--green-800)', marginTop: '8px' }}>
            <strong>We request EPRA to:</strong>
          </p>
          <ol style={{ fontSize: '13px', lineHeight: 1.8, paddingLeft: '18px', color: 'var(--green-800)' }}>
            <li>Include CarbonTrack in the draft transport emissions reporting guidelines currently under development</li>
            <li>Endorse a pilot through the REREC rural fleet program (6-month, one county government fleet)</li>
            <li>Mandate NTSA + fuel marketer API integration to replace manual data entry in Phase 2</li>
          </ol>
        </div>

        {/* Signature block */}
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '12px', fontSize: '11px', color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div>Generated by EPRA CarbonTrack v1.0</div>
            <div>Methodology: IPCC 2006 Tier 1 · Kenya GHG Inventory 2022</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>Date: {today}</div>
            <div>Classification: For regulatory review</div>
          </div>
        </div>
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>
        Use browser Print (Ctrl+P / Cmd+P) and "Save as PDF" to export. {isDemo ? 'All data in this report is based on synthetic demonstration data.' : 'This report is based on institutional uploaded fleet data.'} Real deployment requires verified fleet records.
      </p>
    </div>
  )
}
