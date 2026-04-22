// src/components/FleetManager.jsx
import React, { useState } from 'react'
import { FLEET } from '../data/fleet'

const TYPE_COLORS = {
  matatu: { bg: '#EAF3DE', text: '#27500A' },
  'county-car': { bg: '#E6F1FB', text: '#0C447C' },
  lorry: { bg: '#FAEEDA', text: '#633806' },
  'boda-boda': { bg: '#FBEAF0', text: '#72243E' },
  bus: { bg: '#EEEDFE', text: '#3C3489' },
}

const maxEm = Math.max(...FLEET.map((v) => v.emPerMonth))

export default function FleetManager() {
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('emPerMonth')
  const [search, setSearch] = useState('')

  const types = ['all', ...new Set(FLEET.map((v) => v.type))]

  const filtered = FLEET
    .filter((v) => filter === 'all' || v.type === filter)
    .filter((v) =>
      !search || v.id.toLowerCase().includes(search.toLowerCase()) ||
      v.reg.toLowerCase().includes(search.toLowerCase()) ||
      v.route.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => b[sort] - a[sort])

  const totalEm = filtered.reduce((s, v) => s + v.emPerMonth, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <h2>Fleet Manager</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
          50-vehicle synthetic pilot fleet · shaped on GIZ Kenya fleet study + KNBS vehicle registry
        </p>
      </div>

      <div className="alert alert-info">
        <strong>Data note:</strong> This is a synthetic demonstration dataset. Real deployment connects to NTSA
        vehicle registry and fuel marketer APIs via MCP integration. Estimates carry ±15–25% uncertainty.
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ padding: '7px 10px', border: '0.5px solid var(--border-md)', borderRadius: '6px',
            background: 'var(--surface)', color: 'var(--text-1)', fontSize: '13px', width: '180px' }}
          placeholder="Search ID / reg / route…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '7px 10px', border: '0.5px solid var(--border-md)', borderRadius: '6px',
            background: 'var(--surface)', color: 'var(--text-1)', fontSize: '13px' }}
        >
          {types.map((t) => <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>)}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{ padding: '7px 10px', border: '0.5px solid var(--border-md)', borderRadius: '6px',
            background: 'var(--surface)', color: 'var(--text-1)', fontSize: '13px' }}
        >
          <option value="emPerMonth">Sort: highest emissions</option>
          <option value="kmPerDay">Sort: most km/day</option>
          <option value="litresPerDay">Sort: most fuel/day</option>
          <option value="age">Sort: oldest first</option>
        </select>
        <span style={{ fontSize: '12px', color: 'var(--text-2)', marginLeft: 'auto' }}>
          {filtered.length} vehicles · {totalEm.toFixed(2)} tCO₂eq/mo
        </span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Reg</th><th>Type</th><th>Fuel</th>
                <th>Age</th><th>Route</th><th>km/day</th>
                <th>L/day</th><th>km/L</th><th>tCO₂eq/mo</th><th>Bar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => {
                const pct = v.emPerMonth / maxEm
                const tc = TYPE_COLORS[v.type] || { bg: '#F1EFE8', text: '#5F5E5A' }
                const highEm = pct > 0.6
                return (
                  <tr key={v.id}>
                    <td><span className="mono" style={{ fontSize: '11px', fontWeight: 500 }}>{v.id}</span></td>
                    <td><span className="mono" style={{ fontSize: '11px', color: 'var(--text-2)' }}>{v.reg}</span></td>
                    <td>
                      <span className="tag" style={{ background: tc.bg, color: tc.text }}>{v.type}</span>
                    </td>
                    <td style={{ fontSize: '12px' }}>{v.fuel}</td>
                    <td style={{ fontSize: '12px', color: v.age > 8 ? '#A32D2D' : 'var(--text-1)', fontWeight: v.age > 8 ? 500 : 400 }}>
                      {v.age}yr{v.age > 8 && ' ⚠'}
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--text-2)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.route}
                    </td>
                    <td className="mono" style={{ fontSize: '12px' }}>{v.kmPerDay}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{v.litresPerDay}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{v.kmPerLitre}</td>
                    <td className="mono" style={{ fontSize: '12px', fontWeight: 500, color: highEm ? '#A32D2D' : 'var(--text-1)' }}>
                      {v.emPerMonth.toFixed(3)}
                    </td>
                    <td style={{ minWidth: '60px' }}>
                      <div style={{ height: '6px', background: 'var(--surface-3)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '3px',
                          width: `${Math.round(pct * 100)}%`,
                          background: highEm ? '#A32D2D' : pct > 0.35 ? '#854F0B' : '#3B6D11',
                        }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>
        Emission factors: petrol 0.00231, diesel 0.00268 tCO₂eq/L (IPCC 2006, Table 3.2.1).
        Working days assumed: 25/month. Age efficiency penalty applied at &gt;5yr (−7%) and &gt;8yr (−18%).
        Source: GIZ Kenya Vehicle Fleet Study 2021.
      </p>
    </div>
  )
}
