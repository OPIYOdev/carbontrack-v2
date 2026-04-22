// src/utils/actionStore.js
// Pending and completed actions routed by role

const ACTIONS = [
  {
    id: 'ACT-001', status: 'pending', priority: 'high',
    title: 'Retire or replace 12 vehicles older than 8 years',
    description: 'High-age vehicles apply a 15–18% efficiency penalty, contributing disproportionately to fleet emissions. Recommend schedule for retirement or CNG/EV replacement.',
    owner: 'fleet_manager', createdBy: 'ai_analysis', createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    evidence: ['V007 (13yr, 0.312 tCO2eq/mo)', 'V019 (12yr, 0.298 tCO2eq/mo)', 'V034 (11yr, 0.271 tCO2eq/mo)'],
    sourceRef: 'GIZ Kenya Fleet Study 2021', confidence: 0.87,
    approvalRequired: 'executive', dueDate: '30 days',
  },
  {
    id: 'ACT-002', status: 'pending', priority: 'medium',
    title: 'Consolidate 3 overlapping Mombasa Road lorry routes',
    description: 'Route analysis identifies 3 lorry routes with >65% geographic overlap. Consolidation could reduce vehicle-km by 28%, saving ~0.14 tCO2eq/month with no capital expenditure.',
    owner: 'fleet_manager', createdBy: 'ai_analysis', createdAt: new Date(Date.now() - 86400000).toISOString(),
    evidence: ['V022 (Mombasa Road, 280km/day)', 'V031 (Mombasa Road, 265km/day)', 'V041 (Mombasa Road, 240km/day)'],
    sourceRef: 'IPCC AR6 WG3 Ch10; GIZ 2021', confidence: 0.79,
    approvalRequired: 'fleet_manager', dueDate: '14 days',
  },
  {
    id: 'ACT-003', status: 'pending', priority: 'high',
    title: 'Submit NDC progress report to EPRA by end of quarter',
    description: 'Climate Change Act 2016 (Cap 387A) requires quarterly transport emission reporting for fleets over 20 vehicles. Deadline approaching. Report draft available in Policy Report tab.',
    owner: 'compliance', createdBy: 'system', createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    evidence: ['Climate Change Act 2016 Cap 387A Section 14', 'NDC 3.0 Institutional Reporting Framework'],
    sourceRef: 'Climate Change Act 2016', confidence: 1.0,
    approvalRequired: 'compliance', dueDate: '7 days',
  },
  {
    id: 'ACT-004', status: 'pending', priority: 'low',
    title: 'Review fuel vendor contract — anomalous fuel price variance',
    description: 'Fuel cost per litre from vendor KES 148 vs market rate KES 131. Variance of 13% exceeds threshold. Procurement review recommended before contract renewal.',
    owner: 'procurement', createdBy: 'ai_analysis', createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    evidence: ['Fuel purchase records Q4 2024', 'Kenya Energy Regulatory pricing bulletin'],
    sourceRef: 'EPRA Fuel Pricing Bulletin 2024', confidence: 0.71,
    approvalRequired: 'procurement', dueDate: '21 days',
  },
  {
    id: 'ACT-005', status: 'approved', priority: 'medium',
    title: 'Install fuel tracking dongle on 8 diesel lorries',
    description: 'Real-time fuel consumption data would reduce emission estimate uncertainty from ±22% to ±6% on lorry fleet. Approved for pilot installation.',
    owner: 'fleet_manager', createdBy: 'fleet_manager', createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    approvedBy: 'executive', approvedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    evidence: ['Current data gap: real-time odometer readings', 'Vendor quote: KES 12,000/unit'],
    sourceRef: 'Internal fleet ops', confidence: 0.95,
    approvalRequired: 'executive', dueDate: '60 days',
  },
]

let actionIdCounter = 6

export function getActions() {
  return [...ACTIONS]
}

export function getActionsByOwner(role) {
  return ACTIONS.filter((a) => a.owner === role || a.approvalRequired === role)
}

export function updateAction(id, updates) {
  const idx = ACTIONS.findIndex((a) => a.id === id)
  if (idx !== -1) Object.assign(ACTIONS[idx], updates)
  return ACTIONS[idx]
}

export function addAction(action) {
  const newAction = {
    id: `ACT-${String(actionIdCounter++).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
    status: 'pending',
    ...action,
  }
  ACTIONS.unshift(newAction)
  return newAction
}
