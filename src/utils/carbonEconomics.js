// src/utils/carbonEconomics.js
// Kenya-specific carbon economics engine
// All market rates cited with primary sources

// ─────────────────────────────────────────────────────────────────
// MARKET RATES — Kenya 2024/2025
// ─────────────────────────────────────────────────────────────────

export const MARKET_RATES = {
  // Fuel prices — EPRA regulated pump prices, Nairobi, Jan 2025
  // Source: EPRA Monthly Petroleum Pricing (January 2025)
  fuel_kes_per_litre: {
    petrol:  207.64,
    diesel:  194.79,
    cng:     112.00,   // per kg equiv, EPRA LPG/CNG bulletin
    electric: 0,       // replaced by electricity below
  },

  // Kenya Power electricity tariff
  // Source: KPLC Tariff Schedule (2024) — SC2 commercial off-peak
  electricity_kes_per_kwh: 22.50,  // blended fleet charging rate

  // Carbon credit market prices
  // Source: Kenya Carbon Market (Climate Change Act 2023 framework);
  //         Voluntary Carbon Market (VCM) Kenya average, Ecosystem Marketplace 2024
  carbon_credit: {
    vcm_conservative_usd:   8,    // Voluntary Carbon Market low end (2024 avg)
    vcm_mid_usd:           12,    // Voluntary Carbon Market mid
    vcm_optimistic_usd:    18,    // Compliance-grade high end
    usd_to_kes:           130,    // CBK average rate, Jan 2025
  },

  // Working days per year
  working_days_per_year: 300,  // 25/month × 12

  // EV efficiency (kWh/km) — Kenya EV models in service
  // Sources: Roam Air specs, BasiGo press releases, KPLC EV pilot data
  ev_kwh_per_km: {
    matatu:     0.25,   // Roam Air electric matatu
    bus:        0.35,   // BasiGo electric bus
    'county-car': 0.18, // BYD Atto 3 / Hyundai Ioniq 5
    lorry:      0.55,   // Long-haul EV truck (estimate — limited Kenya data)
    'boda-boda': 0.08,  // Ampersand / Roam electric boda
  },

  // ICE fuel efficiency defaults by type (km/L) — GIZ Kenya Fleet Study 2021
  ice_kpl_default: {
    matatu:      8.5,
    bus:         5.0,
    'county-car': 11.0,
    lorry:       4.0,
    'boda-boda': 33.0,
  },

  // ICE fuel type by vehicle type (Kenya norm)
  ice_fuel_default: {
    matatu:      'petrol',
    bus:         'diesel',
    'county-car': 'petrol',
    lorry:       'diesel',
    'boda-boda': 'petrol',
  },
}

// ─────────────────────────────────────────────────────────────────
// VEHICLE CAPITAL COSTS — Kenya market (2024)
// ─────────────────────────────────────────────────────────────────
// Sources:
//   ICE matatu: Kenya Motor Industry (KMI) survey 2023, used market
//   Roam Air EV matatu: Roam Electric Kenya list price 2024
//   BasiGo bus: BasiGo Kenya pricing 2024
//   EV county car: BYD Atto 3 Kenya retail price 2024
//   EV boda-boda: Ampersand Kenya, Roam Roam retail 2024
//   ICE lorry: CMC Motors Kenya 2023 average
//   EV lorry: Projected estimate (no Kenya retail yet) — flagged

export const VEHICLE_CAPITAL = {
  matatu: {
    ice: { cost: 900_000,   label: 'Used ICE matatu (14-seater)',  source: 'KMI 2023 survey' },
    ev:  { cost: 3_800_000, label: 'Roam Air EV matatu',           source: 'Roam Electric Kenya 2024', available: true },
  },
  bus: {
    ice: { cost: 4_500_000, label: 'ICE long-distance bus',        source: 'CMC Motors Kenya 2023' },
    ev:  { cost: 9_000_000, label: 'BasiGo electric bus',          source: 'BasiGo Kenya 2024',       available: true },
  },
  'county-car': {
    ice: { cost: 3_200_000, label: 'Toyota Hilux / Prado (ICE)',   source: 'Toyota Kenya 2024' },
    ev:  { cost: 4_500_000, label: 'BYD Atto 3 / Ioniq 5 (EV)',   source: 'Kenya EV dealers 2024',   available: true },
  },
  lorry: {
    ice: { cost: 7_000_000, label: 'ICE heavy lorry (6–10t)',      source: 'CMC Motors Kenya 2023' },
    ev:  { cost: 0,         label: 'EV lorry — not yet available in Kenya', source: 'N/A', available: false },
  },
  'boda-boda': {
    ice: { cost: 150_000,   label: 'ICE boda-boda (125cc)',        source: 'Kenya boda market 2024' },
    ev:  { cost: 280_000,   label: 'Ampersand / Roam EV boda',     source: 'Ampersand Kenya 2024',    available: true },
  },
}

// Monthly maintenance costs (KES) — Kenya transport operator surveys
// Source: GIZ Kenya Fleet Study 2021; Nairobi matatu SACCO surveys 2023
export const MAINTENANCE_MONTHLY = {
  matatu:      { ice: 12_000, ev: 4_500 },
  bus:         { ice: 25_000, ev: 9_000 },
  'county-car':{ ice: 8_000,  ev: 3_000 },
  lorry:       { ice: 22_000, ev: null   },  // EV lorry N/A
  'boda-boda': { ice: 3_000,  ev: 800   },
}

// Financing cost assumption (% of EV premium per year, for operators borrowing)
// Source: Kenya commercial bank SME lending rate, CBK 2024 avg
export const FINANCING_RATE_ANNUAL = 0.14  // 14% p.a.

// ─────────────────────────────────────────────────────────────────
// MODULE 1 — CARBON CREDIT REVENUE
// ─────────────────────────────────────────────────────────────────

/**
 * Calculate annual carbon credit revenue from emission reductions.
 * @param {number} reductionMonthly  tCO2eq/month reduced
 * @param {'conservative'|'mid'|'optimistic'} priceScenario
 * @returns {{ annualTonnes, kes_per_tonne, annual_kes, monthly_kes, usd_price }}
 */
export function calcCarbonCreditRevenue(reductionMonthly, priceScenario = 'mid') {
  const { vcm_conservative_usd, vcm_mid_usd, vcm_optimistic_usd, usd_to_kes } = MARKET_RATES.carbon_credit
  const usdPrice = { conservative: vcm_conservative_usd, mid: vcm_mid_usd, optimistic: vcm_optimistic_usd }[priceScenario]
  const kes_per_tonne = Math.round(usdPrice * usd_to_kes)
  const annualTonnes  = Math.round(reductionMonthly * 12 * 100) / 100
  const annual_kes    = Math.round(annualTonnes * kes_per_tonne)
  const monthly_kes   = Math.round(annual_kes / 12)

  return { annualTonnes, usdPrice, kes_per_tonne, annual_kes, monthly_kes, priceScenario }
}

// All three price scenarios at once
export function calcCarbonCreditAllScenarios(reductionMonthly) {
  return {
    conservative: calcCarbonCreditRevenue(reductionMonthly, 'conservative'),
    mid:          calcCarbonCreditRevenue(reductionMonthly, 'mid'),
    optimistic:   calcCarbonCreditRevenue(reductionMonthly, 'optimistic'),
  }
}

// ─────────────────────────────────────────────────────────────────
// MODULE 2 — FUEL COST vs ELECTRICITY COST
// ─────────────────────────────────────────────────────────────────

/**
 * Per-vehicle annual fuel cost for an ICE vehicle.
 */
export function calcICEFuelCost({ type, kmPerDay, kmPerLitre, fuel }) {
  const kpl       = kmPerLitre || MARKET_RATES.ice_kpl_default[type] || 8
  const fuelType  = fuel || MARKET_RATES.ice_fuel_default[type] || 'petrol'
  const price_kes = MARKET_RATES.fuel_kes_per_litre[fuelType]
  const litresDay = kmPerDay / kpl
  const annual    = Math.round(litresDay * price_kes * MARKET_RATES.working_days_per_year)
  const monthly   = Math.round(annual / 12)

  return { litresPerDay: Math.round(litresDay * 10) / 10, fuelType, price_kes, annual_kes: annual, monthly_kes: monthly }
}

/**
 * Per-vehicle annual electricity cost for an EV.
 */
export function calcEVEnergyCost({ type, kmPerDay }) {
  const kwh_per_km    = MARKET_RATES.ev_kwh_per_km[type] || 0.25
  const elec_price    = MARKET_RATES.electricity_kes_per_kwh
  const kwhPerDay     = kmPerDay * kwh_per_km
  const annual        = Math.round(kwhPerDay * elec_price * MARKET_RATES.working_days_per_year)
  const monthly       = Math.round(annual / 12)

  return { kwhPerDay: Math.round(kwhPerDay * 10) / 10, kwh_per_km, elec_price, annual_kes: annual, monthly_kes: monthly }
}

/**
 * Fuel saving: ICE annual fuel cost minus EV annual electricity cost.
 */
export function calcFuelSaving(vehicle) {
  const ice  = calcICEFuelCost(vehicle)
  const ev   = calcEVEnergyCost(vehicle)
  const saving_annual  = ice.annual_kes - ev.annual_kes
  const saving_monthly = Math.round(saving_annual / 12)
  const saving_pct     = Math.round((saving_annual / ice.annual_kes) * 100)

  return { ice, ev, saving_annual, saving_monthly, saving_pct }
}

// ─────────────────────────────────────────────────────────────────
// MODULE 3 — TOTAL COST OF OWNERSHIP (5-year)
// ─────────────────────────────────────────────────────────────────

/**
 * 5-year TCO for ICE and EV variants of a given vehicle type.
 * Includes: purchase, fuel/energy, maintenance, financing cost on EV premium.
 */
export function calcTCO({ type, kmPerDay, years = 5 }) {
  const caps  = VEHICLE_CAPITAL[type]
  if (!caps) return null

  const ice_purchase  = caps.ice.cost
  const ev_purchase   = caps.ev.cost
  const ev_available  = caps.ev.available

  const maint = MAINTENANCE_MONTHLY[type] || { ice: 10_000, ev: null }
  const ice_maint_annual = (maint.ice  || 0) * 12
  const ev_maint_annual  = (maint.ev   || 0) * 12

  const ice_fuel = calcICEFuelCost({ type, kmPerDay })
  const ev_nrg   = ev_available ? calcEVEnergyCost({ type, kmPerDay }) : null

  // EV premium financing — annual interest cost on the difference
  const ev_premium        = ev_purchase - ice_purchase
  const financing_annual  = ev_available ? Math.round(Math.max(0, ev_premium) * FINANCING_RATE_ANNUAL) : 0

  const ice_tco = ice_purchase + (ice_fuel.annual_kes + ice_maint_annual) * years
  const ev_tco  = ev_available
    ? ev_purchase + (ev_nrg.annual_kes + ev_maint_annual + financing_annual) * years
    : null

  const tco_saving = ev_tco !== null ? ice_tco - ev_tco : null

  // Payback period: how many years until cumulative EV savings cover the premium
  const annual_opex_saving = ev_available
    ? (ice_fuel.annual_kes + ice_maint_annual) - (ev_nrg.annual_kes + ev_maint_annual + financing_annual)
    : null
  const payback_years = (annual_opex_saving > 0 && ev_premium > 0)
    ? Math.round((ev_premium / annual_opex_saving) * 10) / 10
    : null

  return {
    type, kmPerDay, years,
    ice: {
      purchase:       ice_purchase,
      annual_fuel:    ice_fuel.annual_kes,
      annual_maint:   ice_maint_annual,
      annual_opex:    ice_fuel.annual_kes + ice_maint_annual,
      tco:            ice_tco,
      label:          caps.ice.label,
      source:         caps.ice.source,
    },
    ev: ev_available ? {
      purchase:       ev_purchase,
      ev_premium,
      annual_energy:  ev_nrg.annual_kes,
      annual_maint:   ev_maint_annual,
      annual_financing: financing_annual,
      annual_opex:    ev_nrg.annual_kes + ev_maint_annual + financing_annual,
      tco:            ev_tco,
      label:          caps.ev.label,
      source:         caps.ev.source,
    } : null,
    ev_available,
    tco_saving,
    annual_opex_saving,
    payback_years,
  }
}

// ─────────────────────────────────────────────────────────────────
// MODULE 4 — FLEET-LEVEL ECONOMICS
// ─────────────────────────────────────────────────────────────────

/**
 * Aggregate economics for a fleet array.
 * Returns per-scenario financial summary.
 */
export function calcFleetEconomics(fleet) {
  if (!fleet || fleet.length === 0) return null

  // Total annual fuel cost (ICE baseline)
  const totalAnnualFuelCost = fleet.reduce((sum, v) => {
    const fc = calcICEFuelCost({ type: v.type, kmPerDay: v.kmPerDay, kmPerLitre: v.kmPerLitre, fuel: v.fuel })
    return sum + fc.annual_kes
  }, 0)

  // Fleet monthly emissions
  const totalMonthlyEm = fleet.reduce((s, v) => s + (v.emPerMonth || 0), 0)

  // EV conversion savings — only for types where EV is available
  const evFleet = fleet.filter(v => VEHICLE_CAPITAL[v.type]?.ev?.available)
  const nonEvFleet = fleet.filter(v => !VEHICLE_CAPITAL[v.type]?.ev?.available)

  const evFuelSavingAnnual = evFleet.reduce((sum, v) => {
    const s = calcFuelSaving({ type: v.type, kmPerDay: v.kmPerDay, kmPerLitre: v.kmPerLitre, fuel: v.fuel })
    return sum + s.saving_annual
  }, 0)

  const evCapitalRequired = evFleet.reduce((sum, v) => {
    const cap = VEHICLE_CAPITAL[v.type]
    if (!cap || !cap.ev.available) return sum
    return sum + Math.max(0, cap.ev.cost - cap.ice.cost)
  }, 0)

  const evMaintenanceSavingAnnual = evFleet.reduce((sum, v) => {
    const m = MAINTENANCE_MONTHLY[v.type]
    if (!m || !m.ev) return sum
    return sum + (m.ice - m.ev) * 12
  }, 0)

  // Carbon credits — all four scenarios
  const emReductionScenarios = {
    evFleet:           totalMonthlyEm * 0.87,
    routeConsolidation:totalMonthlyEm * 0.28,
    modalShift:        totalMonthlyEm * 0.65,
  }

  const carbonCredits = {}
  for (const [scenario, reduction] of Object.entries(emReductionScenarios)) {
    carbonCredits[scenario] = calcCarbonCreditAllScenarios(reduction)
  }

  // Route consolidation savings (no capital cost)
  const routeSavingAnnual = Math.round(totalAnnualFuelCost * 0.28)  // 28% fewer vehicle-km
  const routeSavingMonthly = Math.round(routeSavingAnnual / 12)

  const totalAnnualMaintenance = fleet.reduce((sum, v) => {
    const m = MAINTENANCE_MONTHLY[v.type]
    return sum + ((m?.ice || 10_000) * 12)
  }, 0)

  return {
    fleetSize:              fleet.length,
    evEligibleCount:        evFleet.length,
    nonEvCount:             nonEvFleet.length,

    // Baseline costs
    totalAnnualFuelCost,
    totalMonthlyFuelCost:   Math.round(totalAnnualFuelCost / 12),
    totalAnnualMaintenance,

    // EV scenario
    ev: {
      capitalRequired:      evCapitalRequired,
      fuelSavingAnnual:     evFuelSavingAnnual,
      fuelSavingMonthly:    Math.round(evFuelSavingAnnual / 12),
      maintenanceSavingAnnual: evMaintenanceSavingAnnual,
      totalAnnualSaving:    evFuelSavingAnnual + evMaintenanceSavingAnnual,
      paybackYears:         evCapitalRequired > 0
        ? Math.round((evCapitalRequired / (evFuelSavingAnnual + evMaintenanceSavingAnnual)) * 10) / 10
        : 0,
      financingCostAnnual:  Math.round(evCapitalRequired * FINANCING_RATE_ANNUAL),
    },

    // Route consolidation (zero capital)
    routeConsolidation: {
      capitalRequired:      0,
      fuelSavingAnnual:     routeSavingAnnual,
      fuelSavingMonthly:    routeSavingMonthly,
      paybackYears:         0,  // immediate return
    },

    // Carbon credit revenue by scenario
    carbonCredits,
    emReductionScenarios,

    // Net 5-year financial position (EV scenario)
    netPosition5yr: {
      totalSaving:  (evFuelSavingAnnual + evMaintenanceSavingAnnual) * 5,
      capitalCost:  evCapitalRequired,
      net:          (evFuelSavingAnnual + evMaintenanceSavingAnnual) * 5 - evCapitalRequired,
    },
  }
}

// ─────────────────────────────────────────────────────────────────
// FORMATTING HELPERS
// ─────────────────────────────────────────────────────────────────

export function fmtKES(n) {
  if (n === null || n === undefined) return '—'
  const abs = Math.abs(Math.round(n))
  if (abs >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000)     return `KES ${(n / 1_000).toFixed(1)}K`
  return `KES ${Math.round(n).toLocaleString()}`
}

export function fmtKESFull(n) {
  if (n === null || n === undefined) return '—'
  return `KES ${Math.round(n).toLocaleString('en-KE')}`
}
