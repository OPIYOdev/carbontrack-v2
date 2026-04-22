// src/components/ScenarioModeler.jsx
import React, { useEffect, useRef, useState } from 'react'
import { Chart } from 'chart.js/auto'
import { FLEET } from '../data/fleet'
import { calcScenarios } from '../utils/emissions'

const totalMonthly = FLEET.reduce((s, v) => s + v.emPerMonth, 0)
const scenarios = calcScenarios(totalMonthly)

const SCENARIO_KEYS = ['bau', 'routeConsolidation', 'modalShift', 'evFleet']

export default function ScenarioModeler() {
  const barRef = useRef(null)
  const lineRef = useRef(null)
  const barChart = useRef(null)
  const lineChart = useRef(null)
  const [selected, setSelected] = useState('evFleet')

  useEffect(() => {
    if (barChart.current) barChart.current.destroy()
    if (lineChart.current) lineChart.current.destroy()

    const sc = Object.values(scenarios)
    const colors = sc.map((s) => s.color)

    barChart.current = new Chart(barRef.current, {
      type: 'bar',
      data: {
        labels: sc.map((s) => s.label),
        datasets: [{
          label: 'Monthly tCO₂eq',
          data: sc.map((s) => +s.monthly.toFixed(2)),
          backgroundColor: colors.map((c) => c + 'cc'),
          borderColor: colors,
          borderWidth: 1.5,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: (c) => ` ${c.parsed.x.toFixed(2)} tCO₂eq/mo` }
        }},
        scales: {
          x: { title: { display: true, text: 'tCO₂eq / month', font: { size: 11 } }, ticks: { font: { size: 11 } } },
          y: { ticks: { font: { size: 11 } }, grid: { display: false } },
        },
      },
    })

    // 2030 projection line chart
    const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030]
    const datasets = SCENARIO_KEYS.map((key) => {
      const s = scenarios[key]
      const base = s.monthly * 12
      return {
        label: s.label,
        data: years.map((y, i) => {
          if (key === 'bau') return +(base * (1.045 ** i)).toFixed(2)
          return +(base * (1 + (key === 'evFleet' ? 0.005 : 0.01) * i)).toFixed(2)
        }),
        borderColor: s.color,
        backgroundColor: s.color + '18',
        fill: false,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 3,
      }
    })

    lineChart.current = new Chart(lineRef.current, {
      type: 'line',
      data: { labels: years, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${c.parsed.y.toFixed(1)} tCO₂eq/yr` } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { title: { display: true, text: 'tCO₂eq / year', font: { size: 11 } }, ticks: { font: { size: 11 } } },
        },
      },
    })

    return () => { barChart.current?.destroy(); lineChart.current?.destroy() }
  }, [])

  const sel = scenarios[selected]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <h2>Scenario Modeler</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
          Four reduction pathways against BAU · sources: IPCC AR6 WG3, EPRA 2022, GIZ Kenya, Nairobi BRT Plan
        </p>
      </div>

      {/* Scenario cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: '10px' }}>
        {SCENARIO_KEYS.map((key) => {
          const s = scenarios[key]
          const isSelected = selected === key
          return (
            <div
              key={key}
              onClick={() => setSelected(key)}
              style={{
                border: isSelected ? `2px solid ${s.color}` : '0.5px solid var(--border)',
                borderRadius: '10px', padding: '14px', cursor: 'pointer',
                background: isSelected ? s.color + '10' : 'var(--surface)',
                transition: 'all .15s',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: isSelected ? s.color : 'var(--text-1)' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: s.color, marginBottom: '2px' }}>
                {s.monthly.toFixed(1)} t
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '6px' }}>tCO₂eq / month</div>
              {s.reductionPct > 0 && (
                <span className="tag" style={{ background: 'var(--green-50)', color: 'var(--green-800)', fontSize: '10px' }}>
                  −{s.reductionPct}% vs BAU
                </span>
              )}
              {key === 'bau' && (
                <span className="tag tag-red" style={{ fontSize: '10px' }}>No change</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected scenario detail */}
      {sel && (
        <div style={{ background: sel.color + '10', border: `0.5px solid ${sel.color}44`, borderRadius: '10px', padding: '14px' }}>
          <h3 style={{ marginBottom: '8px', color: sel.color }}>{sel.label}</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-1)', lineHeight: 1.7, marginBottom: '8px' }}>{sel.description}</p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px' }}>
            <span><strong>Monthly:</strong> {sel.monthly.toFixed(2)} tCO₂eq</span>
            <span><strong>Annual:</strong> {sel.annual.toFixed(1)} tCO₂eq</span>
            {sel.reductionPct > 0 && <span style={{ color: 'var(--green-600)' }}><strong>Saving:</strong> −{sel.reduction.toFixed(2)} tCO₂eq/mo (−{sel.reductionPct}%)</span>}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '8px' }}>Source: {sel.source}</div>
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Monthly comparison
          </h3>
          <div style={{ position: 'relative', height: '200px' }}>
            <canvas ref={barRef} role="img" aria-label="Horizontal bar chart comparing monthly emissions across four scenarios" />
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            2024–2030 projection
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '8px', fontSize: '11px' }}>
            {SCENARIO_KEYS.map((key) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-2)' }}>
                <span style={{ width: '10px', height: '3px', background: scenarios[key].color, display: 'inline-block', borderRadius: '2px' }} />
                {scenarios[key].label}
              </span>
            ))}
          </div>
          <div style={{ position: 'relative', height: '165px' }}>
            <canvas ref={lineRef} role="img" aria-label="Line chart showing projected annual emissions to 2030 across four scenarios" />
          </div>
        </div>
      </div>

      {/* NDC alignment table */}
      <div className="card">
        <h3 style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          NDC 3.0 alignment — annual estimates
        </h3>
        <table>
          <thead>
            <tr>
              <th>Scenario</th><th>Monthly (tCO₂eq)</th><th>Annual (tCO₂eq)</th>
              <th>Annual (MtCO₂eq)</th><th>vs NDC 2030 target</th><th>Source</th>
            </tr>
          </thead>
          <tbody>
            {SCENARIO_KEYS.map((key) => {
              const s = scenarios[key]
              const annual = s.monthly * 12
              const annualMt = annual / 1000000
              return (
                <tr key={key}>
                  <td style={{ fontWeight: 500 }}>{s.label}</td>
                  <td className="mono">{s.monthly.toFixed(2)}</td>
                  <td className="mono">{annual.toFixed(1)}</td>
                  <td className="mono">{annualMt.toFixed(4)}</td>
                  <td>
                    <span className="tag" style={{ background: s.color + '22', color: s.color }}>
                      {key === 'bau' ? 'No contribution' : `−${s.reductionPct}% vs BAU`}
                    </span>
                  </td>
                  <td style={{ fontSize: '10px', color: 'var(--text-3)', maxWidth: '120px' }}>{s.source.split(';')[0]}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '8px' }}>
          Note: Pilot fleet figures are illustrative. National NDC target: 16.3 MtCO₂eq by 2030 (Kenya NDC 3.0).
        </p>
      </div>
    </div>
  )
}
