// src/utils/kenyaCompliance.js
// Kenya Compliance Template Calculation Engine
// Methodology: CDM AMS-III.C (Electric & Hybrid Vehicles)
// Aligned with NEMA and Climate Change Act 2023 requirements

import { MARKET_RATES } from './carbonEconomics';

export const KENYA_EMISSION_FACTORS = {
  diesel: 2.68, // kg CO2/liter
  petrol: 2.31, // kg CO2/liter
  electricity: 0.15, // kg CO2/kWh (Kenya grid factor for compliance)
};

export const COMPLIANCE_CONSTANTS = {
  REVENUE_PER_TONNE_KES: 2500,
  CONSERVATIVE_BUFFER: 0.10, // 10%
};

/**
 * Calculate carbon credits based on the Kenya Compliance Template.
 * 
 * @param {Object} data - Input data for calculation
 * @param {number} data.baselineDiesel - Baseline Year 1 Diesel Consumption (liters/year)
 * @param {number} data.baselineVehicleCount - Baseline Vehicle Count
 * @param {number} data.projectDiesel - Current Year Diesel Consumption (liters/year)
 * @param {number} data.projectEVCharging - Current Year EV Charging (kWh/year)
 * @returns {Object} Calculated results
 */
export function calculateKenyaComplianceCredits(data) {
  const {
    baselineDiesel = 0,
    baselineVehicleCount = 0,
    projectDiesel = 0,
    projectEVCharging = 0
  } = data;

  // 1. Baseline Calculations
  const totalBaselineEmissionsKg = baselineDiesel * KENYA_EMISSION_FACTORS.diesel;
  const totalBaselineEmissionsTonnes = totalBaselineEmissionsKg / 1000;

  // 2. Project Calculations
  const projectDieselEmissionsKg = projectDiesel * KENYA_EMISSION_FACTORS.diesel;
  const projectEVEmissionsKg = projectEVCharging * KENYA_EMISSION_FACTORS.electricity;
  const totalProjectEmissionsKg = projectDieselEmissionsKg + projectEVEmissionsKg;
  const totalProjectEmissionsTonnes = totalProjectEmissionsKg / 1000;

  // 3. Certified Credits
  const emissionReductionKg = totalBaselineEmissionsKg - totalProjectEmissionsKg;
  const grossReductionTonnes = emissionReductionKg / 1000;
  
  const bufferTonnes = grossReductionTonnes * COMPLIANCE_CONSTANTS.CONSERVATIVE_BUFFER;
  const certifiedAnnualCreditsTonnes = Math.max(0, grossReductionTonnes - bufferTonnes);
  
  const revenueKes = certifiedAnnualCreditsTonnes * COMPLIANCE_CONSTANTS.REVENUE_PER_TONNE_KES;

  return {
    baseline: {
      dieselConsumption: baselineDiesel,
      vehicleCount: baselineVehicleCount,
      emissionFactor: KENYA_EMISSION_FACTORS.diesel,
      totalEmissionsKg: totalBaselineEmissionsKg,
      totalEmissionsTonnes: totalBaselineEmissionsTonnes,
    },
    project: {
      dieselConsumption: projectDiesel,
      evChargingKwh: projectEVCharging,
      evEmissionFactor: KENYA_EMISSION_FACTORS.electricity,
      totalEmissionsKg: totalProjectEmissionsKg,
      totalEmissionsTonnes: totalProjectEmissionsTonnes,
      reductionKg: emissionReductionKg,
      reductionTonnes: grossReductionTonnes,
    },
    certified: {
      grossReductionTonnes,
      bufferTonnes,
      certifiedAnnualCreditsTonnes,
      revenueKes,
      ratePerTonne: COMPLIANCE_CONSTANTS.REVENUE_PER_TONNE_KES,
    }
  };
}
