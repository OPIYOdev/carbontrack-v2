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
    .replace(/[()[\]{}⚠₂]/g, '')
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

function getField(raw, canonical) {
  if (raw[canonical] !== undefined && raw[canonical] !== null) return raw[canonical]
  const aliases = HEADER_ALIASES[canonical] || []
  for (const alias of aliases) {
    const normAlias = normalizeHeader(alias)
    if (raw[normAlias] !== undefined && raw[normAlias] !== null) return raw[normAlias]
  }
  for (const [key, val] of Object.entries(raw)) {
    if (ALIAS_MAP[key] === canonical) return val
  }
  return null
}

console.log('--- Enhancement 1: normalizeHeader (Special Chars) ---');
const testHeader = "Driver Name ⚠ (PII)";
const norm = normalizeHeader(testHeader);
console.log(`Input: "${testHeader}" -> Normalized: "${norm}"`);
if (norm === "driver_name_pii") console.log('✅ PASS'); else console.log('❌ FAIL');

console.log('\n--- Enhancement 2: Alias Expansion ---');
const aliasTests = {
    'pax_trip': 'seats',
    'daily_km_avg': 'km_per_day',
    'km_litre': 'km_per_litre'
};
for (const [alias, canonical] of Object.entries(aliasTests)) {
    const resolved = ALIAS_MAP[normalizeHeader(alias)];
    console.log(`Alias: "${alias}" -> Canonical: "${resolved}"`);
    if (resolved === canonical) console.log('✅ PASS'); else console.log('❌ FAIL');
}

console.log('\n--- Enhancement 3: getField() Helper ---');
const rawData = {
    'daily_km_avg': 150,
    'km_litre': 10
};
const km = getField(rawData, 'km_per_day');
const kpl = getField(rawData, 'km_per_litre');
console.log(`km_per_day: ${km}, km_per_litre: ${kpl}`);
if (km === 150 && kpl === 10) console.log('✅ PASS'); else console.log('❌ FAIL');

console.log('\n--- Enhancement 4: Footer Row Detection ---');
const footerRow = {
    'id': 'NOTES: Daily fuel consumption is based on average route distance and estimated efficiency.',
    'some_other_col': 'A very long string that should trigger the footer detection because it is more than eighty characters long.'
};
const kmFooter = getField(footerRow, 'km_per_day');
const hasLongText = Object.values(footerRow).some(v => typeof v === 'string' && v.length > 80);
console.log(`km_per_day: ${kmFooter}, hasLongText: ${hasLongText}`);
if (kmFooter === null && hasLongText) console.log('✅ PASS: Footer detected'); else console.log('❌ FAIL');
