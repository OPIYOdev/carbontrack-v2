// src/data/fleet.js
// Synthetic institutional fleet — 50 vehicles shaped like real Kenya fleet data
// Sources: GIZ Kenya Vehicle Fleet Study, KNBS Statistical Abstract 2022

export const EMISSION_FACTORS = {
  petrol: 0.00231,   // tCO2eq/litre — IPCC 2006 Table 3.2.1
  diesel: 0.00268,   // tCO2eq/litre — IPCC 2006 Table 3.2.1
  cng: 0.00202,      // tCO2eq/litre — IPCC 2006 Table 3.2.1
  electric: 0.0003,  // tCO2eq/kWh equiv — Kenya grid factor (EPRA 2022)
}

export const NDC = {
  baseline2022: 11.8,   // MtCO2eq — Kenya GHG Inventory 2022
  target2022: 11.5,     // MtCO2eq — NDC 3.0 commitment
  bau2030: 21.0,        // MtCO2eq — BAU trajectory
  ndc2030: 16.3,        // MtCO2eq — NDC 3.0 commitment
  gap: 4.7,             // MtCO2eq — gap to close
}

const VEHICLE_TYPES = [
  {
    type: 'matatu',
    fuel: 'petrol',
    kmPerLitre: { min: 7, max: 10 },
    kmPerDay: { min: 80, max: 180 },
    seats: 14,
    routes: ['Nairobi–Thika', 'CBD–Westlands', 'CBD–Kasarani', 'CBD–Eastlands', 'Ngong Road'],
    count: 12,
  },
  {
    type: 'county-car',
    fuel: 'petrol',
    kmPerLitre: { min: 9, max: 13 },
    kmPerDay: { min: 40, max: 120 },
    seats: 5,
    routes: ['County HQ–Field', 'Admin Route A', 'Admin Route B', 'CBD–Airport', 'County–Nakuru'],
    count: 10,
  },
  {
    type: 'lorry',
    fuel: 'diesel',
    kmPerLitre: { min: 3, max: 5 },
    kmPerDay: { min: 100, max: 300 },
    seats: 2,
    routes: ['Mombasa Road', 'Nairobi–Nakuru', 'Industrial Area', 'Northern Bypass', 'EPZ Route'],
    count: 8,
  },
  {
    type: 'boda-boda',
    fuel: 'petrol',
    kmPerLitre: { min: 28, max: 40 },
    kmPerDay: { min: 50, max: 120 },
    seats: 1,
    routes: ['CBD Last-Mile', 'Kibera', 'Mathare', 'Eastleigh', 'Kawangware'],
    count: 12,
  },
  {
    type: 'bus',
    fuel: 'diesel',
    kmPerLitre: { min: 4, max: 6 },
    kmPerDay: { min: 150, max: 400 },
    seats: 50,
    routes: ['Nairobi–Mombasa', 'Nairobi–Kisumu', 'Langata Road', 'Thika Superhwy', 'Enterprise Rd'],
    count: 8,
  },
]

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function generateFleet() {
  const fleet = []
  let id = 1

  for (const vt of VEHICLE_TYPES) {
    for (let i = 0; i < vt.count; i++) {
      const age = Math.round(rand(2, 15))
      const agePenalty = age > 8 ? 0.82 : age > 5 ? 0.93 : 1.0
      const kmPerLitre = rand(vt.kmPerLitre.min, vt.kmPerLitre.max) * agePenalty
      const kmPerDay = Math.round(rand(vt.kmPerDay.min, vt.kmPerDay.max))
      const litresPerDay = kmPerDay / kmPerLitre
      const emPerDay = litresPerDay * EMISSION_FACTORS[vt.fuel]
      const workingDays = 25

      const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ'
      const reg = `K${letters[Math.floor(Math.random() * letters.length)]}${Math.floor(rand(100, 999))}${letters[Math.floor(Math.random() * letters.length)]}${letters[Math.floor(Math.random() * letters.length)]}`

      fleet.push({
        id: `V${String(id++).padStart(3, '0')}`,
        reg,
        type: vt.type,
        fuel: vt.fuel,
        age,
        route: vt.routes[Math.floor(Math.random() * vt.routes.length)],
        seats: vt.seats,
        kmPerDay,
        litresPerDay: +litresPerDay.toFixed(1),
        emPerDay: +emPerDay.toFixed(4),
        emPerMonth: +(emPerDay * workingDays).toFixed(3),
        emPerYear: +(emPerDay * workingDays * 12).toFixed(2),
        kmPerLitre: +kmPerLitre.toFixed(1),
      })
    }
  }

  return fleet
}

// Generate once, export as stable reference
export const FLEET = generateFleet()

export function getFleetSummary() {
  const total = FLEET.reduce((s, v) => s + v.emPerMonth, 0)
  const byType = {}
  FLEET.forEach((v) => {
    byType[v.type] = (byType[v.type] || 0) + v.emPerMonth
  })
  const hotspots = [...FLEET].sort((a, b) => b.emPerMonth - a.emPerMonth).slice(0, 5)
  return { total: +total.toFixed(3), byType, hotspots, count: FLEET.length }
}
