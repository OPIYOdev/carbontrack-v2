// src/utils/emissions.js
// IPCC Tier 1 carbon accounting engine
// Methodology: IPCC 2006 Guidelines for National GHG Inventories, Volume 2 Energy, Chapter 3

import { EMISSION_FACTORS, NDC } from '../data/fleet'

/**
 * Core accounting formula:
 * Emissions (tCO2eq) = Fuel consumed (litres) × Emission factor (tCO2eq/litre)
 * Source: IPCC 2006, Table 3.2.1
 */
export function calcEmissions({ fuelType, litres }) {
  const ef = EMISSION_FACTORS[fuelType] || 0
  return +(litres * ef).toFixed(5)
}

export function calcFromDistance({ fuelType, kmPerDay, kmPerLitre, days = 25 }) {
  const litresPerDay = kmPerDay / kmPerLitre
  const litresTotal = litresPerDay * days
  const em = calcEmissions({ fuelType, litres: litresTotal })
  return {
    litresPerDay: +litresPerDay.toFixed(1),
    litresTotal: +litresTotal.toFixed(1),
    emissionsTotal: em,
    emissionsPerDay: +(em / days).toFixed(5),
    emissionFactor: EMISSION_FACTORS[fuelType],
  }
}

/**
 * Scenario calculations
 * Sources:
 * - EV conversion factor: Kenya grid intensity 0.0003 tCO2eq/kWh (EPRA 2022)
 * - Route consolidation: 20-30% vehicle-km reduction assumption (GIZ Kenya fleet study)
 * - Modal shift to BRT/rail: 65-80% per-passenger emission reduction (IPCC AR6 WG3)
 */
export function calcScenarios(baselineMonthly) {
  return {
    bau: {
      label: 'Business as Usual',
      monthly: baselineMonthly,
      annual: +(baselineMonthly * 12).toFixed(2),
      projection2030: +(baselineMonthly * 12 * 1.045 ** 7).toFixed(2), // 4.5% growth
      reduction: 0,
      reductionPct: 0,
      color: '#A32D2D',
      description: 'No policy change. Fleet grows at 4.5%/yr (KNBS vehicle registration trend).',
      source: 'KNBS Statistical Abstract 2022',
    },
    evFleet: {
      label: 'EV Fleet Switch',
      monthly: +(baselineMonthly * 0.13).toFixed(3), // ~87% reduction on EV conversion
      annual: +(baselineMonthly * 0.13 * 12).toFixed(2),
      projection2030: +(baselineMonthly * 0.13 * 12).toFixed(2),
      reduction: +(baselineMonthly * 0.87).toFixed(3),
      reductionPct: 87,
      color: '#3B6D11',
      description: 'Full electric fleet using Kenya grid factor 0.0003 tCO2eq/kWh. Capital intensive.',
      source: 'EPRA Grid Intensity Report 2022; IPCC AR6 WG3',
    },
    routeConsolidation: {
      label: 'Route Consolidation',
      monthly: +(baselineMonthly * 0.72).toFixed(3), // 28% reduction
      annual: +(baselineMonthly * 0.72 * 12).toFixed(2),
      projection2030: +(baselineMonthly * 0.72 * 12).toFixed(2),
      reduction: +(baselineMonthly * 0.28).toFixed(3),
      reductionPct: 28,
      color: '#854F0B',
      description: '28% vehicle-km reduction through route optimisation. Low upfront cost.',
      source: 'GIZ Kenya Fleet Optimisation Study 2021',
    },
    modalShift: {
      label: 'Modal Shift (BRT/Rail)',
      monthly: +(baselineMonthly * 0.35).toFixed(3), // 65% reduction
      annual: +(baselineMonthly * 0.35 * 12).toFixed(2),
      projection2030: +(baselineMonthly * 0.35 * 12).toFixed(2),
      reduction: +(baselineMonthly * 0.65).toFixed(3),
      reductionPct: 65,
      color: '#185FA5',
      description: 'Passenger shift to Nairobi BRT and SGR. Requires infrastructure investment.',
      source: 'IPCC AR6 WG3 Chapter 10; Nairobi BRT Master Plan 2019',
    },
  }
}

export function ndcGapAnalysis(institutionAnnual) {
  const nationalShare = (institutionAnnual / (NDC.baseline2022 * 1000)) * 100
  const targetReduction = institutionAnnual * 0.35
  return {
    nationalShare: +nationalShare.toFixed(4),
    targetReduction: +targetReduction.toFixed(3),
    targetAnnual: +(institutionAnnual * 0.65).toFixed(3),
    ndcGap: NDC.gap,
    trajectoryRisk: nationalShare > 0.05 ? 'high' : nationalShare > 0.01 ? 'medium' : 'low',
  }
}
