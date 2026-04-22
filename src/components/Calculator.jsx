// src/components/Calculator.jsx
import React, { useState } from 'react'
import { EMISSION_FACTORS } from '../data/fleet'
import { calcFromDistance } from '../utils/emissions'

const VEHICLE_PROFILES = {
  matatu: { fuel: 'petrol', kmPerLitre: 8.5, label: 'Matatu (14-seater)' },
  'county-car': { fuel: 'petrol', kmPerLitre: 11, label: 'County government car' },
  lorry: { fuel: 'diesel', kmPerLitre: 4, label: 'Heavy lorry / truck' },
  'boda-boda': { fuel: 'petrol', kmPerLitre: 33, label: 'Boda-boda (motorcycle)' },
  bus: { fuel: 'diesel', kmPerLitre: 5, label: 'Long-distance bus' },
  custom: { fuel: 'petrol', kmPerLitre: 10, label: 'Custom vehicle' },
}

export default function Calculator() {
  const [vehicleType, setVehicleType] = useState('matatu')
  const [fuel, setFuel] = useState('petrol')
  const [kmPerDay, setKmPerDay] = useState(120)
  const [kmPerLitre, setKmPerLitre] = useState(8.5)
  const [days, setDays] = useState(25)
  const [useProfile, setUseProfile] = useState(true)

  const handleTypeChange = (t) => {
    setVehicleType(t)
    if (t !== 'custom') {
      const p = VEHICLE_PROFILES[t]
      setFuel(p.fuel)
      setKmPerLitre(p.kmPerLitre)
      setUseProfile(true)
    }
  }

  const result = calcFromDistance({ fuelType: fuel, kmPerDay: Number(kmPerDay), kmPerLitre: Number(kmPerLitre), days: Number(days) })

  const annualEm = result.emissionsTotal * 12
  const ndcShare = ((annualEm / 1000) / 11.8) * 100

  const fieldStyle = {
    label: { display: 'block', fontSize: '12px', color: 'var(--text-2)', marginBottom: '5px' },
    input: { width: '100%', padding: '8px 10px', border: '0.5px solid var(--border-md)', borderRadius: '6px',
      background: 'var(--surface)', color: 'var(--text-1)', fontSize: '13px' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <h2>Carbon Calculator</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
          IPCC Tier 1 · Formula: Emissions = Fuel (L) × Emission Factor (tCO₂eq/L)
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '14px', fontSize: '12px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Vehicle inputs
          </h3>

          <div style={{ marginBottom: '12px' }}>
            <label style={fieldStyle.label}>Vehicle type</label>
            <select value={vehicleType} onChange={(e) => handleTypeChange(e.target.value)} style={fieldStyle.input}>
              {Object.entries(VEHICLE_PROFILES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={fieldStyle.label}>Fuel type</label>
            <select value={fuel} onChange={(e) => setFuel(e.target.value)} style={fieldStyle.input}>
              <option value="petrol">Petrol (EF: 0.00231 tCO₂eq/L)</option>
              <option value="diesel">Diesel (EF: 0.00268 tCO₂eq/L)</option>
              <option value="cng">CNG (EF: 0.00202 tCO₂eq/L)</option>
              <option value="electric">Electric (EF: 0.0003 tCO₂eq/kWh equiv)</option>
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={fieldStyle.label}>Distance per day (km)</label>
            <input type="number" min="1" max="2000" value={kmPerDay}
              onChange={(e) => setKmPerDay(e.target.value)} style={fieldStyle.input} />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={fieldStyle.label}>Fuel efficiency (km / litre)</label>
            <input type="number" min="1" max="60" step="0.1" value={kmPerLitre}
              onChange={(e) => setKmPerLitre(e.target.value)} style={fieldStyle.input} />
          </div>

          <div style={{ marginBottom: '0' }}>
            <label style={fieldStyle.label}>Working days per month</label>
            <input type="number" min="1" max="31" value={days}
              onChange={(e) => setDays(e.target.value)} style={fieldStyle.input} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Result */}
          <div style={{ background: 'var(--green-50)', border: '0.5px solid var(--green-100)', borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--green-600)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Monthly emissions
            </div>
            <div style={{ fontSize: '36px', fontWeight: 600, color: 'var(--green-800)', lineHeight: 1 }}>
              {result.emissionsTotal.toFixed(4)}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--green-600)', marginTop: '4px' }}>tCO₂eq / month</div>
            <hr style={{ border: 'none', borderTop: '0.5px solid var(--green-100)', margin: '12px 0' }} />
            <div style={{ fontSize: '11px', color: 'var(--green-600)', lineHeight: 1.8 }}>
              <div>{result.litresPerDay.toFixed(1)} L/day · {result.litresTotal.toFixed(0)} L/month</div>
              <div>EF used: {EMISSION_FACTORS[fuel]} tCO₂eq/L (IPCC 2006)</div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="card" style={{ flex: 1 }}>
            <h3 style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Emission breakdown
            </h3>
            {[
              ['Per trip (day)', `${result.emissionsPerDay.toFixed(5)} tCO₂eq`],
              ['Per month', `${result.emissionsTotal.toFixed(4)} tCO₂eq`],
              ['Per year (est.)', `${annualEm.toFixed(3)} tCO₂eq`],
              ['Fuel / day', `${result.litresPerDay.toFixed(1)} litres`],
              ['Fuel / month', `${result.litresTotal.toFixed(0)} litres`],
              ['NDC national share', `${ndcShare.toFixed(6)}%`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '5px 0', borderBottom: '0.5px solid var(--border)' }}>
                <span style={{ color: 'var(--text-2)' }}>{k}</span>
                <span className="mono" style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Methodology note */}
      <div className="card" style={{ background: 'var(--surface-2)' }}>
        <h3 style={{ marginBottom: '8px', fontSize: '12px' }}>Methodology</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.7 }}>
          <strong>Formula:</strong> Emissions (tCO₂eq) = Fuel consumed (L) × Emission factor (tCO₂eq/L)<br />
          <strong>Standard:</strong> IPCC 2006 Guidelines for National GHG Inventories, Volume 2 Energy, Chapter 3 (Tier 1)<br />
          <strong>Factors:</strong> Petrol 0.00231 · Diesel 0.00268 · CNG 0.00202 tCO₂eq/L (IPCC Table 3.2.1)<br />
          <strong>Kenya grid:</strong> Electric 0.0003 tCO₂eq/kWh equivalent (EPRA Grid Intensity Report 2022)<br />
          <strong>Uncertainty:</strong> ±15–25% on individual vehicles due to load factor, maintenance, and driving style variation
        </p>
      </div>
    </div>
  )
}
