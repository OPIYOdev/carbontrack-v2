const { calcFleetEconomics, calcTCO, MARKET_RATES } = require('./src/utils/carbonEconomics');

const mockFleet = [
  { id: 'V001', type: 'matatu', fuel: 'petrol', kmPerDay: 120, kmPerLitre: 8.5, emPerMonth: 5.5 },
  { id: 'V002', type: 'bus', fuel: 'diesel', kmPerDay: 300, kmPerLitre: 5.0, emPerMonth: 12.0 }
];

const customRates = {
  ...MARKET_RATES,
  fuel_kes_per_litre: { petrol: 300, diesel: 250 },
  carbon_credit: { vcm_conservative_usd: 20, vcm_mid_usd: 30, vcm_optimistic_usd: 40, usd_to_kes: 150 }
};

console.log('--- CarbonTrack v2 Final Stability Test ---');

// 1. Test calcFleetEconomics with custom rates
const ecoDefault = calcFleetEconomics(mockFleet);
const ecoCustom = calcFleetEconomics(mockFleet, customRates);

console.log('1. Dynamic Fleet Economics:');
console.log('   - Default Annual Fuel: ' + ecoDefault.totalAnnualFuelCost);
console.log('   - Custom Annual Fuel: ' + ecoCustom.totalAnnualFuelCost);
console.log('   - Success:', ecoCustom.totalAnnualFuelCost > ecoDefault.totalAnnualFuelCost ? '✅' : '❌');

// 2. Test Carbon Credit Revenue in calcFleetEconomics
const creditDefault = ecoDefault.carbonCredits.evFleet.mid.annual_kes;
const creditCustom = ecoCustom.carbonCredits.evFleet.mid.annual_kes;

console.log('2. Dynamic Carbon Credits:');
console.log('   - Default Credit (Mid): ' + creditDefault);
console.log('   - Custom Credit (Mid): ' + creditCustom);
console.log('   - Success:', creditCustom > creditDefault ? '✅' : '❌');

// 3. Test calcTCO with custom rates
const tcoDefault = calcTCO({ type: 'matatu', kmPerDay: 120 }, MARKET_RATES);
const tcoCustom = calcTCO({ type: 'matatu', kmPerDay: 120 }, customRates);

console.log('3. Dynamic TCO:');
console.log('   - Default ICE Annual Fuel: ' + tcoDefault.ice.annual_fuel);
console.log('   - Custom ICE Annual Fuel: ' + tcoCustom.ice.annual_fuel);
console.log('   - Success:', tcoCustom.ice.annual_fuel > tcoDefault.ice.annual_fuel ? '✅' : '❌');

if (ecoCustom.totalAnnualFuelCost > ecoDefault.totalAnnualFuelCost && 
    creditCustom > creditDefault && 
    tcoCustom.ice.annual_fuel > tcoDefault.ice.annual_fuel) {
  console.log('\nFinal stability verification PASSED ✅');
} else {
  console.log('\nFinal stability verification FAILED ❌');
  process.exit(1);
}
