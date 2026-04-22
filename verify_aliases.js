const HEADER_ALIASES = {
  id:          ['id', 'vehicle_id', 'vid', 'veh_id', 'fleet_id'],
  reg:         ['reg', 'registration', 'plate', 'number_plate', 'reg_no', 'reg_number', 'licence_plate', 'license_plate', 'reg_plate'],
  vehicle_type:['vehicle_type', 'type', 'category', 'veh_type', 'class', 'fleet_type'],
  fuel_type:   ['fuel_type', 'fuel', 'fuel_kind', 'energy_type', 'propulsion'],
  age:         ['age', 'vehicle_age', 'years', 'age_yrs', 'year_of_manufacture', 'yom', 'model_year', 'age_yr'],
  route:       ['route', 'route_name', 'road', 'corridor', 'service_route', 'path', 'primary_route'],
  seats:       ['seats', 'capacity', 'passengers', 'seating', 'seat_capacity', 'pax'],
  km_per_day:  ['km_per_day', 'daily_km', 'km_day', 'distance_per_day', 'daily_distance', 'dist_day', 'kms_per_day', 'kilometres_per_day', 'daily_km_avg'],
  km_per_litre:['km_per_litre', 'efficiency', 'fuel_efficiency', 'kpl', 'mpg', 'km_l', 'kmpl', 'fuel_economy', 'consumption_rate', 'km_litre'],
  litres_per_day:['litres_per_day', 'fuel_litres', 'litres_day', 'litres', 'fuel_consumption', 'daily_fuel', 'ltr_per_day', 'liters_per_day', 'daily_fuel_litres'],
  driver:      ['driver', 'driver_name', 'name', 'operator', 'owner', 'assigned_to', 'driver_name_pii'],
  phone:       ['phone', 'mobile', 'contact', 'telephone', 'cell', 'phone_number', 'driver_phone_pii'],
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

const userHeaders = [
  'id', 'reg_plate', 'description', 'vehicle_type', 'fuel_type', 
  'age_yr', 'primary_route', 'daily_km_avg', 'km_litre', 
  'daily_fuel_litres', 'tco_eq_day', 'tco_eq_month_25_days', 
  'tco_eq_year', 'driver_name_pii', 'driver_phone_pii'
];

console.log('--- Verifying User Headers ---');
userHeaders.forEach(h => {
  const resolved = resolveHeader(h);
  console.log(`${h.padEnd(25)} -> ${resolved}`);
});

const mapping = {
  'daily_km_avg': 'km_per_day',
  'km_litre': 'km_per_litre',
  'fuel_type': 'fuel_type',
  'reg_plate': 'reg',
  'age_yr': 'age',
  'primary_route': 'route',
  'daily_fuel_litres': 'litres_per_day',
  'driver_name_pii': 'driver',
  'driver_phone_pii': 'phone'
};

let allPassed = true;
for (const [input, expected] of Object.entries(mapping)) {
  const resolved = resolveHeader(input);
  if (resolved !== expected) {
      console.log(`❌ ERROR: ${input} mapped to ${resolved}, expected ${expected}`);
      allPassed = false;
  }
}

if (allPassed) {
  console.log('\n✅ SUCCESS: All user headers correctly mapped.');
} else {
  console.log('\n❌ FAILURE: Mapping errors detected.');
  process.exit(1);
}
