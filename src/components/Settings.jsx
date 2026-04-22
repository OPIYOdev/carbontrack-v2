import React, { useState } from 'react'
import { useFleet } from '../FleetContext'

export default function Settings() {
  const { marketRates, setMarketRates } = useFleet()
  const [localRates, setLocalRates] = useState(marketRates)
  const [saved, setSaved] = useState(false)

  const handleChange = (path, value) => {
    const keys = path.split('.')
    const newRates = { ...localRates }
    let current = newRates
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] }
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = parseFloat(value) || 0
    setLocalRates(newRates)
    setSaved(false)
  }

  const handleSave = () => {
    setMarketRates(localRates)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleReset = () => {
    setLocalRates(marketRates)
    setSaved(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2>System Settings</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
          Configure market rates, fuel prices, and economic assumptions for the entire platform.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-1)' }}>Fuel Prices (KES per Litre/Unit)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px' }}>Petrol (Super)</label>
            <input 
              type="number" 
              className="btn" 
              style={{ width: '100%', textAlign: 'left', background: 'var(--surface)' }}
              value={localRates.fuel_kes_per_litre.petrol}
              onChange={(e) => handleChange('fuel_kes_per_litre.petrol', e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px' }}>Diesel</label>
            <input 
              type="number" 
              className="btn" 
              style={{ width: '100%', textAlign: 'left', background: 'var(--surface)' }}
              value={localRates.fuel_kes_per_litre.diesel}
              onChange={(e) => handleChange('fuel_kes_per_litre.diesel', e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px' }}>CNG (per kg equiv)</label>
            <input 
              type="number" 
              className="btn" 
              style={{ width: '100%', textAlign: 'left', background: 'var(--surface)' }}
              value={localRates.fuel_kes_per_litre.cng}
              onChange={(e) => handleChange('fuel_kes_per_litre.cng', e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px' }}>Electricity (KES/kWh)</label>
            <input 
              type="number" 
              className="btn" 
              style={{ width: '100%', textAlign: 'left', background: 'var(--surface)' }}
              value={localRates.electricity_kes_per_kwh}
              onChange={(e) => handleChange('electricity_kes_per_kwh', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-1)' }}>Carbon Credit Market ($ USD per tCO₂eq)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px' }}>Conservative Price</label>
            <input 
              type="number" 
              className="btn" 
              style={{ width: '100%', textAlign: 'left', background: 'var(--surface)' }}
              value={localRates.carbon_credit.vcm_conservative_usd}
              onChange={(e) => handleChange('carbon_credit.vcm_conservative_usd', e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px' }}>Mid-Range Price</label>
            <input 
              type="number" 
              className="btn" 
              style={{ width: '100%', textAlign: 'left', background: 'var(--surface)' }}
              value={localRates.carbon_credit.vcm_mid_usd}
              onChange={(e) => handleChange('carbon_credit.vcm_mid_usd', e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px' }}>Optimistic Price</label>
            <input 
              type="number" 
              className="btn" 
              style={{ width: '100%', textAlign: 'left', background: 'var(--surface)' }}
              value={localRates.carbon_credit.vcm_optimistic_usd}
              onChange={(e) => handleChange('carbon_credit.vcm_optimistic_usd', e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px' }}>Exchange Rate (KES/USD)</label>
            <input 
              type="number" 
              className="btn" 
              style={{ width: '100%', textAlign: 'left', background: 'var(--surface)' }}
              value={localRates.carbon_credit.usd_to_kes}
              onChange={(e) => handleChange('carbon_credit.usd_to_kes', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
        <button className="btn" onClick={handleReset}>Reset Changes</button>
        <button className="btn btn-primary" onClick={handleSave} style={{ minWidth: '120px' }}>
          {saved ? 'Settings Saved ✓' : 'Save Settings'}
        </button>
      </div>

      <div className="alert alert-info">
        <strong>Note:</strong> Changes to market rates will immediately update all financial projections in the Economics, Scenarios, and AI Analyst modules.
      </div>
    </div>
  )
}
