// src/components/Overview.jsx
import React, { useEffect, useRef, useMemo } from 'react'
import { Chart } from 'chart.js/auto'
import { useFleet } from '../FleetContext'
import { NDC } from '../data/fleet'
import { calcScenarios, ndcGapAnalysis } from '../utils/emissions'

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: '16px' },
  header: { marginBottom: '4px' },
  sub: { fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '10px' },
  kpi: { background: 'var(--surface-2)', borderRadius: '10px', padding: '12px 14px' },
  kpiLabel: { fontSize: '11px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' },
  kpiVal: { fontSize: '22px', fontWeight: 600, lineHeight: 1 },
  kpiSub: { fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  chartBox: { position: 'relative', height: '200px' },
  progressLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' },
  progressTrack: { height: '8px', background: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' },
  ndcRow: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', fontSize: '12px' },
  dot: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 },
}

export default function Overview() {
  const { activeFleet, fleetSummary } = useFleet()
  const { totalMonthlyEmissions: totalMonthly, byType, hotspots, count, isDemo } = fleetSummary
  const totalAnnual = totalMonthly * 12

  const scenarios = useMemo(() => calcScenarios(totalMonthly), [totalMonthly])
  const ndcInfo = useMemo(() => ndcGapAnalysis(totalAnnual), [totalAnnual])

  const donutRef = useRef(null)
  const trendRef = useRef(null)
  const donutChart = useRef(null)
  const trendChart = useRef(null)

  useEffect(() => {
    if (donutChart.current) donutChart.current.destroy()
    if (trendChart.current) trendChart.current.destroy()

    const typeColors = {
      'matatu': '#639922', 'county-car': '#185FA5',
      'lorry': '#854F0B', 'boda-boda': '#993556', 'bus': '#534AB7',
    }

    donutChart.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: {
        labels: Object.keys(byType),
        datasets: [{
          data: Object.values(byType).map(v => +v.toFixed(2)),
          backgroundColor: Object.keys(byType).map(k => typeColors[k] || '#888'),
          borderWidth: 2,
          borderColor: 'var(--surface)',
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: (c) => ` ${c.label}: ${c.parsed.toFixed(2)} tCO₂eq/mo` }
        }},
      },
    })

    const years = [2022,2023,2024,2025,2026,2027,2028,2029,2030]
    const bau = years.map(y => +(NDC.baseline2022 * (1.045 ** (y - 2022))).toFixed(2))
    const ndc = years.map(y => {
      if (y <= 2022) return NDC.baseline2022
      return +(NDC.baseline2022 - (NDC.baseline2022 - NDC.ndc2030) * ((y - 2022) / 8)).toFixed(2)
    })

    trendChart.current = new Chart(trendRef.current, {
      type: 'line',
      data: {
        labels: years,
        datasets: [
          {
            label: 'BAU trajectory',
            data: bau, borderColor: '#A32D2D', backgroundColor: 'rgba(163,45,45,0.08)',
            fill: true, tension: 0.3, borderWidth: 2, pointRadius: 3,
          },
          {
            label: 'NDC 3.0 target',
            data: ndc, borderColor: '#3B6D11', backgroundColor: 'rgba(59,109,17,0.08)',
            fill: true, tension: 0.3, borderWidth: 2, borderDash: [5,3], pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: (c) => ` ${c.dataset.label}: ${c.parsed.y} MtCO₂eq` }
        }},
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: {
            title: { display: true, text: 'MtCO₂eq', font: { size: 11 } },
            ticks: { font: { size: 11 } },
          },
        },
      },
    })

    return () => {
      donutChart.current?.destroy()
      trendChart.current?.destroy()
    }
  }, [byType])

  const kpis = [
    { label: 'Total Vehicles', val: count, sub: isDemo ? '50 vehicle pilot fleet' : 'Institutional uploaded fleet', color: 'var(--text-1)' },
    { label: 'Monthly Emissions', val: `${totalMonthly.toFixed(1)} t`, sub: 'tCO₂eq / month', color: 'var(--amber-600)' },
    { label: 'Annual Estimate', val: `${totalAnnual.toFixed(1)} t`, sub: 'tCO₂eq / year', color: '#A32D2D' },
    { label: 'NDC 2030 Gap', val: `${NDC.gap} Mt`, sub: 'national gap to close', color: '#A32D2D' },
    { label: 'NDC Target', val: `16.3 Mt`, sub: 'by 2030 (transport)', color: 'var(--green-600)' },
    { label: 'BAU Risk', val: '21.0 Mt', sub: 'projected 2030 w/o action', color: '#A32D2D' },
  ]

  const typeColors = { matatu: '#639922', 'county-car': '#185FA5', lorry: '#854F0B', 'boda-boda': '#993556', bus: '#534AB7' }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2>Fleet Emission Overview</h2>
        <p style={styles.sub}>
          {isDemo ? 'Pilot: 50-vehicle institutional fleet' : `Institutional Fleet: ${count} vehicles`} · IPCC Tier 1 methodology ·
          Factors: petrol 0.00231, diesel 0.00268 tCO₂eq/L (IPCC 2006)
        </p>
      </div>

      <div style={styles.kpiGrid}>
        {kpis.map((k) => (
          <div key={k.label} style={styles.kpi}>
            <div style={styles.kpiLabel}>{k.label}</div>
            <div style={{ ...styles.kpiVal, color: k.color }}>{k.val}</div>
            <div style={styles.kpiSub}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="alert alert-danger">
        <strong>NDC Alert:</strong> Kenya transport emissions reached 11.8 MtCO₂eq in 2022 — already above the NDC
        commitment of 11.5 MtCO₂eq. BAU trajectory reaches 21.0 MtCO₂eq by 2030 against a 16.3 MtCO₂eq target.
        The 4.7 MtCO₂eq gap requires immediate institutional action.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '14px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Emissions by fleet type
          </h3>
          <div style={styles.chartBox}>
            <canvas ref={donutRef} role="img" aria-label="Doughnut chart of monthly emissions by vehicle type" />
          </div>
          <div style={{ marginTop: '12px' }}>
            {Object.entries(byType).map(([type, val]) => (
              <div key={type} style={styles.ndcRow}>
                <div style={{ ...styles.dot, background: typeColors[type] }} />
                <span style={{ flex: 1 }}>{type}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{val.toFixed(2)} t/mo</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '4px', fontSize: '12px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            National NDC trajectory 2022–2030
          </h3>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', fontSize: '11px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '3px', background: '#A32D2D', display: 'inline-block' }} />
              BAU
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '3px', background: '#3B6D11', display: 'inline-block', borderTop: '2px dashed #3B6D11' }} />
              NDC target
            </span>
          </div>
          <div style={styles.chartBox}>
            <canvas ref={trendRef} role="img" aria-label="Line chart showing Kenya transport BAU vs NDC 3.0 target trajectory 2022 to 2030" />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Scenario comparison — monthly tCO₂eq
        </h3>
        {Object.values(scenarios).map((s) => (
          <div key={s.label}>
            <div style={styles.progressLabel}>
              <span>{s.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                {s.monthly.toFixed(1)} t/mo
                {s.reductionPct > 0 && (
                  <span style={{ color: 'var(--green-600)', marginLeft: '6px' }}>
                    −{s.reductionPct}%
                  </span>
                )}
              </span>
            </div>
            <div style={styles.progressTrack}>
              <div style={{
                height: '100%', borderRadius: '4px', background: s.color,
                width: `${(s.monthly / scenarios.bau.monthly) * 100}%`,
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
