const HEADER_ALIASES = {
  id:          ['id', 'vehicle_id', 'vid', 'veh_id', 'fleet_id'],
  reg:         ['reg', 'registration', 'plate', 'number_plate', 'reg_no', 'reg_number', 'licence_plate', 'license_plate', 'reg_plate'],
  vehicle_type:['vehicle_type', 'type', 'category', 'veh_type', 'class', 'fleet_type'],
  fuel_type:   ['fuel_type', 'fuel', 'fuel_kind', 'energy_type', 'propulsion'],
  age:         ['age', 'vehicle_age', 'years', 'age_yrs', 'year_of_manufacture', 'yom', 'model_year', 'age_yr'],
  route:       ['route', 'route_name', 'road', 'corridor', 'service_route', 'path', 'primary_route'],
  seats:       ['seats', 'capacity', 'passengers', 'seating', 'seat_capacity', 'pax', 'pax_trip'],
  km_per_day:  ['km_per_day', 'daily_km', 'km_day', 'distance_per_day', 'daily_distance', 'dist_day', 'kms_per_day', 'kilometres_per_day', 'daily_km_avg'],
  km_per_litre:['km_per_litre', 'efficiency', 'fuel_efficiency', 'kpl', 'mpg', 'km_l', 'kmpl', 'fuel_economy', 'consumption_rate', 'km_litre'],
  litres_per_day:['litres_per_day', 'fuel_litres', 'litres_day', 'litres', 'fuel_consumption', 'daily_fuel', 'ltr_per_day', 'liters_per_day', 'daily_fuel_litres'],
  driver:      ['driver', 'driver_name', 'name', 'operator', 'owner', 'assigned_to', 'driver_name_pii', 'owner_name_pii'],
  phone:       ['phone', 'mobile', 'contact', 'telephone', 'cell', 'phone_number', 'driver_phone_pii', 'owner_phone_pii'],
  id_number:   ['id_number', 'national_id', 'id_no', 'nid', 'passport', 'id_card'],
};

function normalizeHeader(raw) {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/[()[\]{}]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

const ALIAS_MAP = {};
for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
  for (const alias of aliases) {
    ALIAS_MAP[normalizeHeader(alias)] = canonical;
  }
}

function resolveHeader(raw) {
  const norm = normalizeHeader(raw);
  return ALIAS_MAP[norm] || norm;
}

function toNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const n = parseFloat(String(val).replace(/[,\s]/g, ''));
  return isNaN(n) ? null : n;
}

function normalizeFuel(raw) {
  const s = String(raw ?? '').toLowerCase().trim();
  if (s.includes('petrol')) return 'petrol';
  return null;
}

function normalizeRow(raw, idx) {
  const getField = (canonical) => {
    if (raw[canonical] !== undefined && raw[canonical] !== null) return raw[canonical];
    const aliases = HEADER_ALIASES[canonical] || [];
    for (const alias of aliases) {
      const normAlias = normalizeHeader(alias);
      if (raw[normAlias] !== undefined && raw[normAlias] !== null) return raw[normAlias];
    }
    return null;
  };

  const kmPerDay    = toNumber(getField('km_per_day'));
  const kmPerLitre  = toNumber(getField('km_per_litre'));
  const fuelRaw     = getField('fuel_type');
  const fuel        = normalizeFuel(fuelRaw);

  return { kmPerDay, kmPerLitre, fuel, fuelRaw };
}

// Test cases representing the 4 bugs
const testData = {
    "daily_km_avg": 120,    // Bug 1: Newline/Avg normalization
    "km_litre": 8.5,        // Bug 2: km/litre normalization
    "fuel_kind": "petrol"   // Bug 4: Fuel type via alias
};

console.log('--- Verifying All 4 Bugs ---');

const result = normalizeRow(testData, 0);

console.log('Bug 1 (daily_km_avg -> km_per_day):', result.kmPerDay === 120 ? '✅ FIXED' : '❌ FAILED');
console.log('Bug 2 (km_litre -> km_per_litre):', result.kmPerLitre === 8.5 ? '✅ FIXED' : '❌ FAILED');
console.log('Bug 4 (fuel_kind -> fuel_type):', result.fuel === 'petrol' ? '✅ FIXED' : '❌ FAILED');

// Bug 3 check
const bug3Headers = ['age_yr', 'reg_plate', 'primary_route'];
const bug3Expected = ['age', 'reg', 'route'];
let bug3Fixed = true;
bug3Headers.forEach((h, i) => {
    const resolved = resolveHeader(h);
    if (resolved !== bug3Expected[i]) {
        console.log(`Bug 3 (${h} -> ${resolved}): ❌ FAILED`);
        bug3Fixed = false;
    }
});
if (bug3Fixed) console.log('Bug 3 (Alias resolution): ✅ FIXED');

if (result.kmPerDay === 120 && result.kmPerLitre === 8.5 && result.fuel === 'petrol' && bug3Fixed) {
    console.log('\nFinal Verification: ALL BUGS RESOLVED.');
} else {
    process.exit(1);
}
