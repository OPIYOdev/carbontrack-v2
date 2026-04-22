// src/components/RoleGate.jsx
import React from 'react'

export const ROLES = {
  fleet_manager: {
    label: 'Fleet Manager',
    description: 'Monitor vehicle emissions, identify hotspots, manage routes',
    tabs: ['overview', 'fleet', 'calculator', 'intake', 'economics', 'workflow', 'ai'],
    color: '#3B6D11', bg: '#EAF3DE', border: '#C0DD97',
  },
  compliance: {
    label: 'Compliance Officer',
    description: 'Track regulatory obligations, prepare EPRA reports, manage NDC progress',
    tabs: ['overview', 'scenarios', 'economics', 'report', 'workflow', 'audit', 'ai'],
    color: '#185FA5', bg: '#E6F1FB', border: '#B5D4F4',
  },
  auditor: {
    label: 'Auditor',
    description: 'Verify emission calculations, review evidence trail, check data integrity',
    tabs: ['fleet', 'audit', 'intake', 'economics', 'report'],
    color: '#534AB7', bg: '#EEEDFE', border: '#AFA9EC',
  },
  procurement: {
    label: 'Procurement',
    description: 'Review vendor contracts, fuel costs, vehicle acquisition decisions',
    tabs: ['overview', 'fleet', 'economics', 'workflow', 'ai'],
    color: '#854F0B', bg: '#FAEEDA', border: '#FAC775',
  },
  regulator: {
    label: 'Regulator (EPRA)',
    description: 'Review institutional emission accounts and NDC alignment',
    tabs: ['overview', 'scenarios', 'economics', 'report', 'audit'],
    color: '#A32D2D', bg: '#FCEBEB', border: '#F7C1C1',
  },
  executive: {
    label: 'Executive / Decision-Maker',
    description: 'Strategic view of emission trajectory, approve major actions',
    tabs: ['overview', 'scenarios', 'economics', 'workflow', 'report'],
    color: '#444441', bg: '#F1EFE8', border: '#D3D1C7',
  },
}

export default function RoleGate({ onSelect }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--surface-2)' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--green-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="9" stroke="#C0DD97" strokeWidth="1.5" />
            <circle cx="11" cy="11" r="3.5" fill="#C0DD97" />
            <path d="M11 3V11M11 11L15 7" stroke="#C0DD97" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px' }}>EPRA CarbonTrack</div>
          <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>Transport Emission Intelligence Platform</div>
        </div>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '28px', textAlign: 'center' }}>
        Select your role to see the tools and information relevant to you
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', maxWidth: '780px', width: '100%' }}>
        {Object.entries(ROLES).map(([key, role]) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            style={{
              padding: '16px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer',
              background: role.bg, border: `1px solid ${role.border}`,
              transition: 'transform .12s, box-shadow .12s', display: 'flex', flexDirection: 'column', gap: '6px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none' }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: role.color }}>{role.label}</div>
            <div style={{ fontSize: '12px', color: role.color, opacity: 0.8, lineHeight: 1.5 }}>{role.description}</div>
            <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {role.tabs.map((t) => (
                <span key={t} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: 'rgba(255,255,255,0.5)', color: role.color }}>
                  {t}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '24px', textAlign: 'center' }}>
        IPCC Tier 1 Methodology · Kenya NDC 3.0 Aligned · Energy Act No. 1 of 2019
      </p>
    </div>
  )
}
