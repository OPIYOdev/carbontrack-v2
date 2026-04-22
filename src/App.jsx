// src/App.jsx
import React, { useState } from 'react'
import { useFleet } from './FleetContext'
import RoleGate, { ROLES } from './components/RoleGate'
import Overview from './components/Overview'
import FleetManager from './components/FleetManager'
import Calculator from './components/Calculator'
import DataIntake from './components/DataIntake'
import AIAnalyst from './components/AIAnalyst'
import ScenarioModeler from './components/ScenarioModeler'
import PolicyReport from './components/PolicyReport'
import Settings from './components/Settings'
import KenyaComplianceCalculator from './components/KenyaComplianceCalculator'
import ActionWorkflow from './components/ActionWorkflow'
import AuditTrail from './components/AuditTrail'
import Economics from './components/Economics'

const ALL_TABS = {
  overview:   { label: 'Overview',      component: Overview },
  fleet:      { label: 'Fleet',         component: FleetManager },
  calculator: { label: 'Calculator',    component: Calculator },
  intake:     { label: 'Data Intake',   component: DataIntake },
  ai:         { label: 'AI Analyst',    component: AIAnalyst },
  scenarios:  { label: 'Scenarios',     component: ScenarioModeler },
  economics:  { label: 'Economics',     component: Economics },
  workflow:   { label: 'Workflow',      component: ActionWorkflow },
  audit:      { label: 'Audit Trail',   component: AuditTrail },
  report:     { label: 'Policy Report', component: PolicyReport },
  compliance: { label: 'Compliance',    component: KenyaComplianceCalculator },
  settings:   { label: 'Settings',      component: Settings },
}

const S = {
  app: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--surface-2)' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px',
    background: 'var(--surface)', borderBottom: '0.5px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 },
  logo: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoIcon: { width: '32px', height: '32px', borderRadius: '8px', background: '#3B6D11',
    display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: '15px', fontWeight: 700, letterSpacing: '-0.2px' },
  logoSub: { fontSize: '11px', color: 'var(--text-2)' },
  nav: { display: 'flex', padding: '0 16px', background: 'var(--surface)',
    borderBottom: '0.5px solid var(--border)', overflowX: 'auto' },
  navBtn: (a) => ({ padding: '9px 14px', fontSize: '12px', border: 'none', background: 'none', cursor: 'pointer',
    color: a ? '#3B6D11' : 'var(--text-2)', borderBottom: a ? '2px solid #3B6D11' : '2px solid transparent',
    fontWeight: a ? 600 : 400, whiteSpace: 'nowrap', fontFamily: 'var(--font)', transition: 'color .12s' }),
  main: { flex: 1, maxWidth: '980px', width: '100%', margin: '0 auto', padding: '20px 20px 40px' },
  badge: (c, bg, b) => ({ fontSize: '10px', padding: '3px 8px', borderRadius: '10px',
    background: bg, color: c, border: `0.5px solid ${b}`, fontWeight: 500 }),
}

export default function App() {
  const [role, setRole] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const { uploadedFleet, setUploadedFleet } = useFleet()

  if (!role) return <RoleGate onSelect={(r) => { setRole(r); setActiveTab(ROLES[r].tabs[0]) }} />

  const roleDef = ROLES[role]
  const visibleTabs = roleDef.tabs.filter((t) => ALL_TABS[t])
  const safeTab = visibleTabs.includes(activeTab) ? activeTab : visibleTabs[0]
  const ActiveComponent = ALL_TABS[safeTab]?.component || Overview
  const props = { role, uploadedFleet: uploadedFleet || [], ...(safeTab === 'intake' ? { onDataLoaded: setUploadedFleet } : {}) }

  return (
    <div style={S.app}>
      <div style={S.topbar}>
        <div style={S.logo}>
          <div style={S.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7.5" stroke="#C0DD97" strokeWidth="1.5"/>
              <circle cx="9" cy="9" r="3" fill="#C0DD97"/>
              <path d="M9 2V9M9 9L13 5" stroke="#C0DD97" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={S.logoText}>EPRA CarbonTrack</div>
            <div style={S.logoSub}>Transport Emission Intelligence Platform</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {uploadedFleet && uploadedFleet.length > 0 && (
            <span style={S.badge('#27500A','#EAF3DE','#C0DD97')}>{uploadedFleet.length} vehicles uploaded</span>
          )}
          <span style={S.badge('#27500A','#EAF3DE','#C0DD97')}>NDC 3.0</span>
          <span style={S.badge('#0C447C','#E6F1FB','#B5D4F4')}>IPCC Tier 1</span>
          <button onClick={() => setRole(null)}
            style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '10px', cursor: 'pointer',
              background: roleDef.bg, color: roleDef.color, border: `1px solid ${roleDef.border}`,
              fontWeight: 600, fontFamily: 'var(--font)' }}>
            {roleDef.label} ↩
          </button>
        </div>
      </div>

      <div style={S.nav}>
        {visibleTabs.map((t) => (
          <button key={t} style={S.navBtn(safeTab === t)} onClick={() => setActiveTab(t)}>
            {ALL_TABS[t]?.label}
          </button>
        ))}
      </div>

      <div style={S.main}>
        <ActiveComponent {...props} />
      </div>
    </div>
  )
}
