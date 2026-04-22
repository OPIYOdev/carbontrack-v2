// src/components/Economics.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Chart } from 'chart.js/auto'
import { useFleet } from '../FleetContext'
import {
  calcFleetEconomics, calcTCO,
  calcFuelSaving,
  VEHICLE_CAPITAL,
  MAINTENANCE_MONTHLY,
  fmtKES,
  fmtKESFull,
} from '../utils/carbonEconomics'

const VEHICLE_TYPES = ['matatu', 'county-car', 'lorry', 'boda-boda', 'bus']
const SCENARIO_KM = { matatu: 120, 'county-car': 80, lorry: 200, 'boda-boda': 90, bus: 300 }

const SCENARIO_COLORS = {
  evFleet:            '#3B6D11',
  routeConsolidation: '#854F0B',
  modalShift:         '#185FA5',
}

const TYPE_COLORS = {
  matatu: '#639922', 'county-car': '#185FA5', lorry: '#854F0B', 'boda-boda': '#993556', bus: '#534AB7',
}

function KpiCard({ label, value, sub, accent, note }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: '10px', padding: '12px 14px' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1, color: accent || 'var(--text-1)' }}>{value}</div>
      {sub  && <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '4px' }}>{sub}</div>}
      {note && <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '3px' }}>{note}</div>}
    </div>
  )
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ borderLeft: '3px solid #3B6D11', paddingLeft: '10px', marginBottom: '14px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '2px' }}>{title}</h3>
      {sub && <p style={{ fontSize: '12px', color: 'var(--text-2)' }}>{sub}</p>}
    </div>
  )
}

function CompareBar({ label, iceVal, evVal, maxVal, iceLabel = 'ICE', evLabel = 'EV' }) {
  const icePct = maxVal > 0 ? Math.round((iceVal / maxVal) * 100) : 0
  const evPct  = maxVal > 0 ? Math.round((evVal  / maxVal) * 100) : 0
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-1)', marginBottom: '5px' }}>{label}</div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '3px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-2)', width: '28px' }}>{iceLabel}</span>
        <div style={{ flex: 1, height: '10px', background: 'var(--surface-3)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${icePct}%`, background: '#A32D2D', borderRadius: '3px', transition: 'width .4s' }} />
        </div>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#A32D2D', minWidth: '80px', textAlign: 'right', fontWeight: 600 }}>
          {fmtKES(iceVal)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-2)', width: '28px' }}>{evLabel}</span>
        <div style={{ flex: 1, height: '10px', background: 'var(--surface-3)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${evPct}%`, background: '#3B6D11', borderRadius: '3px', transition: 'width .4s' }} />
        </div>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#3B6D11', minWidth: '80px', textAlign: 'right', fontWeight: 600 }}>
          {fmtKES(evVal)}
        </span>
      </div>
    </div>
  )
}

export default function Economics() {
  const { activeFleet: fleet, marketRates } = useFleet()
  const eco            = useMemo(() => calcFleetEconomics(fleet, marketRates), [fleet, marketRates])
  const [creditPrice, setCreditPrice] = useState('mid')
  const [tcoType, setTcoType]         = useState('matatu')
  const [tcoYears, setTcoYears]       = useState(5)
  const tcoData = useMemo(() => calcTCO({ type: tcoType, kmPerDay: SCENARIO_KM[tcoType], years: tcoYears }, marketRates), [tcoType, tcoYears, marketRates])

  const barRef  = useRef(null)
  const barChart= useRef(null)

  useEffect(() => {
    if (!barRef.current || !eco) return
    if (barChart.current) barChart.current.destroy()

    const scenarios = ['evFleet', 'routeConsolidation', 'modalShift']
    const labels = ['EV Fleet Switch', 'Route Consolidation', 'Modal Shift (BRT)']
    const creditData = scenarios.map(s => Math.round(eco.carbonCredits[s]?.[creditPrice]?.annual_kes / 1000) || 0)
    const fuelData   = scenarios.map(s => {
      if (s === 'evFleet')            return Math.round(eco.ev.fuelSavingAnnual / 1000)
      if (s === 'routeConsolidation') return Math.round(eco.routeConsolidation.fuelSavingAnnual / 1000)
      return Math.round(eco.totalAnnualFuelCost * 0.65 / 1000) // modal shift fuel saving estimate
    })

    barChart.current = new Chart(barRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Carbon credits (KES 000)',
            data: creditData,
            backgroundColor: '#3B6D1188',
            borderColor: '#3B6D11',
            borderWidth: 1.5,
            borderRadius: 4,
          },
          {
            label: 'Fuel savings (KES 000)',
            data: fuelData,
            backgroundColor: '#185FA588',
            borderColor: '#185FA5',
            borderWidth: 1.5,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => ` ${c.dataset.label}: KES ${c.parsed.y.toLocaleString()}K` } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { title: { display: true, text: 'KES (thousands)', font: { size: 11 } }, ticks: { font: { size: 11 } } },
        },
      },
    })
    return () => barChart.current?.destroy()
  }, [eco, creditPrice])

  if (!eco) return <div className="alert alert-danger">No fleet data available.</div>

  const cc = eco.carbonCredits

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div>
        <h2>Carbon Economics</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
          Carbon credit revenue · fuel cost savings · EV vs ICE total cost of ownership · 5-year net financial position
        </p>
      </div>

      <div className="alert alert-info">
        <strong>Market rates used:</strong> EPRA fuel prices (petrol KES {marketRates.fuel_kes_per_litre.petrol}/L, diesel KES {marketRates.fuel_kes_per_litre.diesel}/L) ·
        KPLC electricity KES {marketRates.electricity_kes_per_kwh}/kWh · Carbon credits ${marketRates.carbon_credit.vcm_conservative_usd}–{marketRates.carbon_credit.vcm_optimistic_usd}/tCO₂eq (VCM Kenya) ·
        CBK exchange rate KES {marketRates.carbon_credit.usd_to_kes}/USD · EV prices: Roam Electric, BasiGo, Ampersand Kenya 2024
      </div>

      {/* ── SECTION 1: Fleet financial baseline ── */}
      <div>
        <SectionHeader
          title="Fleet Financial Baseline"
          sub={`Current annual operating costs for ${eco.fleetSize} vehicles at ICE fuel prices`}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '10px' }}>
          <KpiCard label="Annual fuel bill"        value={fmtKES(eco.totalAnnualFuelCost)}    sub="ICE fleet fuel cost/yr"   accent="#A32D2D" />
          <KpiCard label="Monthly fuel bill"       value={fmtKES(eco.totalMonthlyFuelCost)}   sub="avg per month"            accent="#A32D2D" />
          <KpiCard label="Annual maintenance"      value={fmtKES(eco.totalAnnualMaintenance)} sub="ICE maintenance/yr"       accent="#854F0B" />
          <KpiCard label="Total annual opex"       value={fmtKES(eco.totalAnnualFuelCost + eco.totalAnnualMaintenance)} sub="fuel + maintenance" accent="#A32D2D" />
          <KpiCard label="EV-eligible vehicles"    value={`${eco.evEligibleCount} / ${eco.fleetSize}`} sub="types with EV in Kenya market" />
          <KpiCard label="Petrol price"            value={`KES ${marketRates.fuel_kes_per_litre.petrol}/L`}  note="Current Market Rate" />
          <KpiCard label="Diesel price"            value={`KES ${marketRates.fuel_kes_per_litre.diesel}/L`}  note="Current Market Rate" />
          <KpiCard label="Electricity"             value={`KES ${marketRates.electricity_kes_per_kwh}/kWh`} note="KPLC Commercial Rate" />
        </div>
      </div>

      {/* ── SECTION 2: Carbon credit revenue ── */}
      <div>
        <SectionHeader
          title="Carbon Credit Revenue"
          sub="Value of emission reductions under Kenya's Voluntary Carbon Market (VCM) and Climate Change Act 2023"
        />

        {/* Price scenario selector */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Credit price scenario:</span>
          {[
            ['conservative', `Conservative — $${marketRates.carbon_credit.vcm_conservative_usd}/tCO₂eq (KES ${(marketRates.carbon_credit.vcm_conservative_usd * marketRates.carbon_credit.usd_to_kes).toLocaleString()})`],
            ['mid',          `Mid — $${marketRates.carbon_credit.vcm_mid_usd}/tCO₂eq (KES ${(marketRates.carbon_credit.vcm_mid_usd * marketRates.carbon_credit.usd_to_kes).toLocaleString()})`],
            ['optimistic',   `Optimistic — $${marketRates.carbon_credit.vcm_optimistic_usd}/tCO₂eq (KES ${(marketRates.carbon_credit.vcm_optimistic_usd * marketRates.carbon_credit.usd_to_kes).toLocaleString()})`],
          ].map(([key, label]) => (
            <button key={key} className="btn" onClick={() => setCreditPrice(key)}
              style={{ fontSize: '11px', padding: '5px 10px',
                background: creditPrice === key ? '#3B6D11' : 'var(--surface)',
                color:      creditPrice === key ? '#EAF3DE'  : 'var(--text-2)',
                borderColor: creditPrice === key ? '#3B6D11' : 'var(--border-md)' }}>
              {label}
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 0, marginBottom: '14px' }}>
          <table>
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Monthly reduction</th>
                <th>Annual tCO₂eq</th>
                <th>Credit price</th>
                <th>Annual revenue (KES)</th>
                <th>Monthly revenue (KES)</th>
                <th>10-yr cumulative</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'evFleet',            label: 'EV Fleet Switch',         color: SCENARIO_COLORS.evFleet },
                { key: 'routeConsolidation', label: 'Route Consolidation',     color: SCENARIO_COLORS.routeConsolidation },
                { key: 'modalShift',         label: 'Modal Shift (BRT/Rail)',  color: SCENARIO_COLORS.modalShift },
              ].map(({ key, label, color }) => {
                const c = cc[key]?.[creditPrice]
                if (!c) return null
                return (
                  <tr key={key}>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 500, fontSize: '12px' }}>{label}</span>
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: '12px' }}>{eco.emReductionScenarios[key].toFixed(3)} tCO₂eq</td>
                    <td className="mono" style={{ fontSize: '12px', fontWeight: 600, color }}>{c.annualTonnes.toFixed(2)} t</td>
                    <td className="mono" style={{ fontSize: '12px' }}>${c.usdPrice} = KES {c.kes_per_tonne.toLocaleString()}</td>
                    <td className="mono" style={{ fontSize: '12px', fontWeight: 700, color: '#3B6D11' }}>{fmtKESFull(c.annual_kes)}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{fmtKESFull(c.monthly_kes)}</td>
                    <td className="mono" style={{ fontSize: '12px', color: '#3B6D11' }}>{fmtKES(c.annual_kes * 10)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>
          Source: Ecosystem Marketplace VCM Report 2024 · Kenya Climate Change (Amendment) Act 2023 ·
          CBK exchange rate KES 130/USD (Jan 2025). Carbon credits require MRV (Measurement, Reporting, Verification) registration.
        </p>
      </div>

      {/* ── SECTION 3: Annual financial gains per scenario ── */}
      <div>
        <SectionHeader
          title="Annual Financial Gains by Scenario"
          sub="Carbon credit revenue + fuel savings combined — what the institution actually receives per year"
        />
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--text-2)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#3B6D1188' }} />Carbon credits (KES 000)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#185FA588' }} />Fuel savings (KES 000)
          </span>
        </div>
        <div style={{ position: 'relative', height: '220px' }}>
          <canvas ref={barRef} role="img" aria-label="Grouped bar chart showing carbon credit revenue and fuel savings per scenario" />
        </div>
      </div>

      {/* ── SECTION 4: EV vs ICE fuel cost per vehicle type ── */}
      <div>
        <SectionHeader
          title="EV vs ICE — Annual Energy Cost by Vehicle Type"
          sub="What each vehicle type costs to run per year on fuel vs electricity (same daily distance assumed)"
        />
        <div className="card" style={{ padding: 0, marginBottom: '10px' }}>
          <table>
            <thead>
              <tr>
                <th>Vehicle type</th>
                <th>Daily km</th>
                <th>ICE fuel cost/yr</th>
                <th>EV energy cost/yr</th>
                <th>Annual saving</th>
                <th>Monthly saving</th>
                <th>Saving %</th>
                <th>EV available</th>
              </tr>
            </thead>
            <tbody>
              {VEHICLE_TYPES.map((type) => {
                const km   = SCENARIO_KM[type]
                const evOk = VEHICLE_CAPITAL[type]?.ev?.available
                const fs   = evOk ? calcFuelSaving({ type, kmPerDay: km }) : null
                return (
                  <tr key={type}>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: TYPE_COLORS[type] }} />
                        <span style={{ fontWeight: 500 }}>{type}</span>
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: '12px' }}>{km} km</td>
                    <td className="mono" style={{ fontSize: '12px', color: '#A32D2D', fontWeight: 600 }}>
                      {fs ? fmtKESFull(fs.ice.annual_kes) : fmtKESFull(calcFuelSaving({ type, kmPerDay: km }).ice.annual_kes)}
                    </td>
                    <td className="mono" style={{ fontSize: '12px', color: evOk ? '#3B6D11' : 'var(--text-3)' }}>
                      {evOk ? fmtKESFull(fs.ev.annual_kes) : 'N/A (no EV)'}
                    </td>
                    <td className="mono" style={{ fontSize: '12px', fontWeight: 700, color: evOk ? '#3B6D11' : 'var(--text-3)' }}>
                      {evOk ? fmtKESFull(fs.saving_annual) : '—'}
                    </td>
                    <td className="mono" style={{ fontSize: '12px', color: evOk ? '#3B6D11' : 'var(--text-3)' }}>
                      {evOk ? fmtKESFull(fs.saving_monthly) : '—'}
                    </td>
                    <td>
                      {evOk
                        ? <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '8px', background: '#EAF3DE', color: '#27500A', fontWeight: 600 }}>
                            −{fs.saving_pct}%
                          </span>
                        : <span className="tag tag-gray" style={{ fontSize: '10px' }}>N/A</span>}
                    </td>
                    <td>
                      <span className={`tag ${evOk ? 'tag-green' : 'tag-red'}`} style={{ fontSize: '10px' }}>
                        {evOk ? VEHICLE_CAPITAL[type]?.ev?.label?.split('(')[0]?.trim() : 'Not available'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {VEHICLE_TYPES.filter(t => VEHICLE_CAPITAL[t]?.ev?.available).map((type) => {
            const km = SCENARIO_KM[type]
            const fs = calcFuelSaving({ type, kmPerDay: km })
            const maxVal = Math.max(fs.ice.annual_kes, fs.ev.annual_kes)
            return <CompareBar key={type} label={`${type} · ${km} km/day`}
              iceVal={fs.ice.annual_kes} evVal={fs.ev.annual_kes} maxVal={maxVal} />
          })}
        </div>
      </div>

      {/* ── SECTION 5: 5-year TCO comparison ── */}
      <div>
        <SectionHeader
          title="Total Cost of Ownership (TCO) — EV vs ICE"
          sub="5-year or custom-year cost including purchase price, fuel/energy, maintenance, and EV financing"
        />

        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>Vehicle type:</span>
          {VEHICLE_TYPES.map((t) => (
            <button key={t} className="btn" onClick={() => setTcoType(t)}
              style={{ fontSize: '11px', padding: '5px 10px',
                background: tcoType === t ? TYPE_COLORS[t] : 'var(--surface)',
                color:      tcoType === t ? '#fff'          : 'var(--text-2)',
                borderColor: tcoType === t ? TYPE_COLORS[t] : 'var(--border-md)' }}>
              {t}
            </button>
          ))}
          <span style={{ fontSize: '12px', color: 'var(--text-2)', marginLeft: '8px' }}>Years:</span>
          {[3,5,7,10].map(y => (
            <button key={y} className="btn" onClick={() => setTcoYears(y)}
              style={{ fontSize: '11px', padding: '5px 10px',
                background: tcoYears === y ? '#444441' : 'var(--surface)',
                color:      tcoYears === y ? '#fff'    : 'var(--text-2)' }}>
              {y}yr
            </button>
          ))}
        </div>

        {tcoData && (
          <div style={{ display: 'grid', gridTemplateColumns: tcoData.ev_available ? '1fr 1fr' : '1fr', gap: '14px' }}>
            {/* ICE card */}
            <div className="card" style={{ border: '1px solid #F7C1C1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#791F1F' }}>{tcoData.ice.label}</div>
                <span className="tag tag-red" style={{ fontSize: '10px' }}>ICE</span>
              </div>
              {[
                ['Purchase price',       fmtKESFull(tcoData.ice.purchase)],
                ['Annual fuel cost',     fmtKESFull(tcoData.ice.annual_fuel)],
                ['Annual maintenance',   fmtKESFull(tcoData.ice.annual_maint)],
                ['Annual opex total',    fmtKESFull(tcoData.ice.annual_opex)],
                [`${tcoYears}-yr opex`,  fmtKESFull(tcoData.ice.annual_opex * tcoYears)],
                [`${tcoYears}-yr TCO`,   fmtKESFull(tcoData.ice.tco)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0',
                  borderBottom: '0.5px solid var(--border)', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-2)' }}>{k}</span>
                  <span className="mono" style={{ fontWeight: k.includes('TCO') ? 700 : 500, color: k.includes('TCO') ? '#791F1F' : 'inherit' }}>{v}</span>
                </div>
              ))}
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '8px' }}>Source: {tcoData.ice.source}</div>
            </div>

            {/* EV card or unavailable */}
            {tcoData.ev_available ? (
              <div className="card" style={{ border: '1px solid #C0DD97' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#27500A' }}>{tcoData.ev.label}</div>
                  <span className="tag tag-green" style={{ fontSize: '10px' }}>EV</span>
                </div>
                {[
                  ['Purchase price',         fmtKESFull(tcoData.ev.purchase)],
                  ['EV premium over ICE',    fmtKESFull(tcoData.ev.ev_premium)],
                  ['Annual energy cost',     fmtKESFull(tcoData.ev.annual_energy)],
                  ['Annual maintenance',     fmtKESFull(tcoData.ev.annual_maint)],
                  ['Annual financing cost',  fmtKESFull(tcoData.ev.annual_financing)],
                  ['Annual opex total',      fmtKESFull(tcoData.ev.annual_opex)],
                  [`${tcoYears}-yr opex`,    fmtKESFull(tcoData.ev.annual_opex * tcoYears)],
                  [`${tcoYears}-yr TCO`,     fmtKESFull(tcoData.ev.tco)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0',
                    borderBottom: '0.5px solid var(--border)', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-2)' }}>{k}</span>
                    <span className="mono" style={{ fontWeight: k.includes('TCO') ? 700 : 500, color: k.includes('TCO') ? '#27500A' : 'inherit' }}>{v}</span>
                  </div>
                ))}
                <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '8px' }}>Source: {tcoData.ev.source}</div>
              </div>
            ) : (
              <div className="card alert-warn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                <div style={{ textAlign: 'center', color: '#854F0B' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>EV lorry not yet available in Kenya</div>
                  <div style={{ fontSize: '12px' }}>No retail EV heavy lorry product exists in the Kenya market as of 2024. Route consolidation or CNG conversion recommended for lorry fleet.</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TCO verdict */}
        {tcoData?.tco_saving !== null && (
          <div style={{ marginTop: '12px', padding: '14px', borderRadius: '10px',
            background: tcoData.tco_saving > 0 ? '#EAF3DE' : '#FCEBEB',
            border: `0.5px solid ${tcoData.tco_saving > 0 ? '#C0DD97' : '#F7C1C1'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: tcoData.tco_saving > 0 ? '#27500A' : '#791F1F', marginBottom: '4px' }}>
                  {tcoData.tco_saving > 0
                    ? `EV saves ${fmtKES(tcoData.tco_saving)} over ${tcoYears} years vs ICE`
                    : `ICE is cheaper by ${fmtKES(Math.abs(tcoData.tco_saving))} over ${tcoYears} years`}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                  Annual opex saving: {fmtKESFull(tcoData.annual_opex_saving || 0)} · 14% financing on EV premium included
                  {tcoData.annual_opex_saving > 0 && ` · Carbon credits not included (add ${fmtKES((tcoData.tco_saving < 0 ? Math.abs(tcoData.tco_saving) : 0))} for breakeven)`}
                </div>
              </div>
              {tcoData.payback_years !== null && (
                <div style={{ textAlign: 'center', padding: '8px 16px', borderRadius: '8px',
                  background: tcoData.payback_years <= 5 ? '#EAF3DE' : '#FAEEDA',
                  border: `0.5px solid ${tcoData.payback_years <= 5 ? '#C0DD97' : '#FAC775'}` }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: tcoData.payback_years <= 5 ? '#27500A' : '#854F0B' }}>
                    {tcoData.payback_years}yr
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-2)' }}>payback period</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 6: Fleet EV conversion — net financial position ── */}
      <div>
        <SectionHeader
          title={`Fleet EV Conversion — Net 5-Year Financial Position`}
          sub={`${eco.evEligibleCount} of ${eco.fleetSize} vehicles eligible. Lorries excluded (no Kenya EV product).`}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '10px', marginBottom: '14px' }}>
          <KpiCard label="EV capital required"    value={fmtKES(eco.ev.capitalRequired)}          sub="Total EV premium to pay" accent="#854F0B" note="Over ICE purchase price" />
          <KpiCard label="Annual fuel saving"     value={fmtKES(eco.ev.fuelSavingAnnual)}         sub="Fuel → electricity delta" accent="#3B6D11" note="EPRA + KPLC prices" />
          <KpiCard label="Annual maintenance save" value={fmtKES(eco.ev.maintenanceSavingAnnual)} sub="Lower EV maintenance"    accent="#3B6D11" note="GIZ fleet study 2021" />
          <KpiCard label="Total annual saving"    value={fmtKES(eco.ev.totalAnnualSaving)}        sub="Fuel + maintenance"      accent="#3B6D11" />
          <KpiCard label="Payback period"         value={`${eco.ev.paybackYears}yr`}              sub="Break-even on EV premium" accent={eco.ev.paybackYears <= 5 ? '#3B6D11' : '#854F0B'} note="Incl. 14% financing" />
          <KpiCard label="5-yr net position"      value={fmtKES(eco.netPosition5yr.net)}         sub="Savings minus capital"   accent={eco.netPosition5yr.net > 0 ? '#3B6D11' : '#A32D2D'} />
          <KpiCard label="Carbon credits (mid)"   value={fmtKES(eco.carbonCredits.evFleet?.mid?.annual_kes)} sub="$12/tCO₂eq · not yet in net" accent="#3B6D11" note="Additional upside" />
          <KpiCard label="Route consolidation"    value={fmtKES(eco.routeConsolidation.fuelSavingAnnual)}    sub="Zero capital required" accent="#854F0B" note="Immediate return" />
        </div>

        {/* Maintenance comparison */}
        <div className="card" style={{ marginBottom: '14px' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '12px' }}>
            Monthly maintenance: ICE vs EV per vehicle type
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '10px' }}>
            {VEHICLE_TYPES.map((type) => {
              const m = MAINTENANCE_MONTHLY[type]
              if (!m) return null
              const evOk = VEHICLE_CAPITAL[type]?.ev?.available
              const savingPct = m.ev ? Math.round(((m.ice - m.ev) / m.ice) * 100) : null
              return (
                <div key={type} style={{ padding: '10px 12px', border: '0.5px solid var(--border)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: TYPE_COLORS[type], marginBottom: '8px' }}>{type}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: '#A32D2D' }}>ICE</span>
                    <span className="mono" style={{ fontWeight: 600, color: '#A32D2D' }}>KES {m.ice.toLocaleString()}/mo</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: evOk ? '#3B6D11' : 'var(--text-3)' }}>EV</span>
                    <span className="mono" style={{ fontWeight: 600, color: evOk ? '#3B6D11' : 'var(--text-3)' }}>
                      {evOk ? `KES ${m.ev.toLocaleString()}/mo` : 'N/A'}
                    </span>
                  </div>
                  {evOk && savingPct && (
                    <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '8px', background: '#EAF3DE', color: '#27500A', fontWeight: 600 }}>
                      −{savingPct}% saving
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── SECTION 7: Route consolidation — zero-capital option ── */}
      <div>
        <SectionHeader
          title="Route Consolidation — Zero Capital Required"
          sub="28% vehicle-km reduction through route optimisation. Immediate return with no purchase cost."
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '10px', marginBottom: '10px' }}>
          <KpiCard label="Annual fuel saving"    value={fmtKES(eco.routeConsolidation.fuelSavingAnnual)}  sub="28% fewer km" accent="#854F0B" />
          <KpiCard label="Monthly fuel saving"   value={fmtKES(eco.routeConsolidation.fuelSavingMonthly)} sub="from month 1"  accent="#854F0B" />
          <KpiCard label="Capital required"      value="KES 0"  sub="No vehicle purchase needed" accent="#3B6D11" />
          <KpiCard label="Payback period"        value="Immediate"  sub="ROI from day 1"         accent="#3B6D11" />
          <KpiCard label="Carbon credits (mid)"  value={fmtKES(eco.carbonCredits.routeConsolidation?.mid?.annual_kes)} sub="additional revenue" accent="#3B6D11" />
          <KpiCard label="Total annual benefit"  value={fmtKES(eco.routeConsolidation.fuelSavingAnnual + (eco.carbonCredits.routeConsolidation?.mid?.annual_kes || 0))} sub="fuel save + credits" accent="#3B6D11" />
        </div>
        <div className="alert alert-success">
          <strong>Recommended first action:</strong> Route consolidation delivers {fmtKES(eco.routeConsolidation.fuelSavingAnnual)} in annual fuel savings
          with zero capital outlay. Combined with carbon credit registration, total annual benefit reaches{' '}
          {fmtKES(eco.routeConsolidation.fuelSavingAnnual + (eco.carbonCredits.routeConsolidation?.mid?.annual_kes || 0))} at mid carbon price.
          Approval required from: Fleet Manager. Timeline: 14 days.
        </div>
      </div>

      {/* ── Sources ── */}
      <div className="card" style={{ background: 'var(--surface-2)', fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.8 }}>
        <strong style={{ color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>All sources</strong>
        EPRA Monthly Petroleum Pricing Jan 2025 ·
        KPLC Tariff Schedule 2024 (SC2 commercial) ·
        Ecosystem Marketplace VCM Report 2024 ·
        CBK Exchange Rate Jan 2025 ·
        Kenya Climate Change (Amendment) Act 2023 ·
        Roam Electric Kenya pricing 2024 ·
        BasiGo Kenya pricing 2024 ·
        Ampersand Kenya retail 2024 ·
        Toyota Kenya / CMC Motors 2023–2024 ·
        GIZ Kenya Fleet Study 2021 (maintenance benchmarks) ·
        Kenya Motor Industry (KMI) survey 2023 ·
        IPCC AR6 WG3 (EV emission reduction factors)
      </div>
    </div>
  )
}
