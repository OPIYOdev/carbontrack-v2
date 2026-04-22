// src/utils/auditTrail.js
// In-memory audit log — in production this would be a database table

const EVENTS = []
let eventId = 1

export function logEvent({ type, actor, role, action, detail, sourceRef = null, confidence = null }) {
  const event = {
    id: `EVT-${String(eventId++).padStart(4, '0')}`,
    timestamp: new Date().toISOString(),
    type,           // 'data_upload' | 'extraction' | 'validation' | 'ai_analysis' | 'recommendation' | 'approval' | 'rejection' | 'escalation' | 'action_completed'
    actor,          // user identifier or 'system'
    role,           // user role
    action,         // short description
    detail,         // longer description
    sourceRef,      // file name, row ID, or dataset reference
    confidence,     // confidence score if applicable
  }
  EVENTS.unshift(event)  // newest first
  return event
}

export function getEvents() {
  return [...EVENTS]
}

export function getEventsByType(type) {
  return EVENTS.filter((e) => e.type === type)
}

export function clearEvents() {
  EVENTS.length = 0
  eventId = 1
}

// Seed with some initial system events for demo
logEvent({
  type: 'data_upload', actor: 'system', role: 'system',
  action: 'Fleet dataset loaded',
  detail: 'Synthetic 50-vehicle fleet loaded from GIZ Kenya fleet study template. IPCC emission factors applied.',
  sourceRef: 'fleet_synthetic_v1.csv', confidence: null,
})
logEvent({
  type: 'validation', actor: 'system', role: 'system',
  action: 'Data validation passed',
  detail: '50 vehicles validated. 0 duplicates. 3 vehicles flagged as high-age (>8yr) with efficiency penalty applied.',
  sourceRef: 'fleet_synthetic_v1.csv', confidence: 0.92,
})
logEvent({
  type: 'extraction', actor: 'system', role: 'system',
  action: 'Emission factors applied',
  detail: 'IPCC 2006 Table 3.2.1 factors applied: petrol 0.00231, diesel 0.00268 tCO2eq/L. GIZ age-penalty coefficients applied.',
  sourceRef: 'IPCC_2006_Vol2_Ch3', confidence: 1.0,
})
