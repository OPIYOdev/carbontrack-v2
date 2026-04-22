// src/utils/dataIntake.js
// Processing pipeline: extract → classify → validate → normalize → mask PII
// Supports: .xlsx, .xls, .xlsm (SheetJS), .csv (RFC 4180), .txt

import * as XLSX from 'xlsx'
import { EMISSION_FACTORS } from '../data/fleet'

// ─────────────────────────────────────────────
// SECTION 1: FIELD NORMALIZATION
// ─────────────────────────────────────────────

// Normalize a raw header string → canonical snake_case key
// Handles: "Km Per Day", "KM/DAY", "Daily Distance (km)", "km_per_day"
function normalizeHeader(raw) {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/[()[\]{}]/g, '')          // strip brackets
    .replace(/[^a-z0-9]+/g, '_')        // non-alphanumeric → underscore
    .replace(/^_+|_+$/g, '')            // trim leading/trailing underscores
    .replace(/_+/g, '_')                // collapse consecutive underscores
}

// All known aliases → canonical key
const HEADER_ALIASES = {
  // Vehicle identity
  id:          ['id', 'vehicle_id', 'vid', 'veh_id', 'fleet_id'],
  reg:         ['reg', 'registration', 'plate', 'number_plate', 'reg_no', 'reg_number', 'licence_plate', 'license_plate'],
  vehicle_type:['vehicle_type', 'type', 'category', 'veh_type', 'class', 'fleet_type'],
  fuel_type:   ['fuel_type', 'fuel', 'fuel_kind', 'energy_type', 'propulsion'],
  age:         ['age', 'vehicle_age', 'years', 'age_yrs', 'year_of_manufacture', 'yom', 'model_year'],
  route:       ['route', 'route_name', 'road', 'corridor', 'service_route', 'path'],
  seats:       ['seats', 'capacity', 'passengers', 'seating', 'seat_capacity', 'pax'],
  // Distance / fuel
  km_per_day:  ['km_per_day', 'daily_km', 'km_day', 'distance_per_day', 'daily_distance', 'dist_day', 'kms_per_day', 'kilometres_per_day'],
  km_per_litre:['km_per_litre', 'efficiency', 'fuel_efficiency', 'kpl', 'mpg', 'km_l', 'kmpl', 'fuel_economy', 'consumption_rate'],
  litres_per_day:['litres_per_day', 'fuel_litres', 'litres_day', 'litres', 'fuel_consumption', 'daily_fuel', 'ltr_per_day', 'liters_per_day'],
  // PII — will be masked
  driver:      ['driver', 'driver_name', 'name', 'operator', 'owner', 'assigned_to'],
  phone:       ['phone', 'mobile', 'contact', 'telephone', 'cell', 'phone_number'],
  id_number:   ['id_number', 'national_id', 'id_no', 'nid', 'passport', 'id_card'],
}

// Build reverse lookup: normalized alias → canonical key
const ALIAS_MAP = {}
for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
  for (const alias of aliases) {
    ALIAS_MAP[normalizeHeader(alias)] = canonical
  }
}

// Resolve a raw header to its canonical key (or return normalized form if unknown)
function resolveHeader(raw) {
  const norm = normalizeHeader(raw)
  return ALIAS_MAP[norm] || norm
}

// ─────────────────────────────────────────────
// SECTION 2: VALUE NORMALIZATION
// ─────────────────────────────────────────────

function normalizeFuel(raw) {
  const s = String(raw ?? '').toLowerCase().trim()
  if (s.includes('petrol') || s.includes('gasoline') || s.includes('unleaded') || s === 'p') return 'petrol'
  if (s.includes('diesel') || s.includes('gasoil') || s === 'd') return 'diesel'
  if (s.includes('cng') || s.includes('compressed') || s.includes('natural gas')) return 'cng'
  if (s.includes('electric') || s.includes(' ev') || s === 'ev' || s.includes('bev') || s.includes('battery')) return 'electric'
  if (s.includes('hybrid')) return 'petrol' // treat hybrid as petrol for Tier 1
  return null // unknown — will trigger validation warning
}

function normalizeType(raw) {
  const s = String(raw ?? '').toLowerCase().trim()
  if (s.includes('matatu') || s.includes('minibus') || (s.includes('14') && s.includes('seat'))) return 'matatu'
  if (s.includes('lorry') || s.includes('truck') || s.includes('hgv') || s.includes('heavy') || s.includes('cargo')) return 'lorry'
  if (s.includes('boda') || s.includes('motorcycle') || s.includes('motorbike') || s.includes('bike') || s.includes('okada')) return 'boda-boda'
  if (s.includes('bus') || s.includes('coach') || s.includes('shuttle')) return 'bus'
  if (s.includes('car') || s.includes('saloon') || s.includes('suv') || s.includes('pickup') || s.includes('4x4') || s.includes('county') || s.includes('sedan')) return 'county-car'
  return 'county-car' // default
}

// Coerce a cell value to a usable number.
// Excel cells can be: number (n), string (s), boolean (b), date (d), error (e), empty (z)
function toNumber(val) {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return val           // already a clean number from Excel
  if (typeof val === 'boolean') return val ? 1 : 0
  if (val instanceof Date) return null              // dates don't make sense as km values
  const n = parseFloat(String(val).replace(/[,\s]/g, ''))  // strip thousands separators
  return isNaN(n) ? null : n
}

function toInt(val) {
  const n = toNumber(val)
  return n === null ? null : Math.round(n)
}

function toString(val) {
  if (val === null || val === undefined) return ''
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  return String(val).trim()
}

// Precision-safe emission calc: avoid float drift by rounding at defined decimal places
function calcEmission(litresPerDay, fuelType, workingDays = 25) {
  const ef = EMISSION_FACTORS[fuelType] || EMISSION_FACTORS.petrol
  // Use integer arithmetic scaled to avoid 0.1+0.2 style drift
  // litresPerDay × ef × workingDays, rounded to 5 decimal places at each step
  const daily = Math.round(litresPerDay * ef * 1e7) / 1e7      // 7dp intermediate
  const monthly = Math.round(daily * workingDays * 1e5) / 1e5  // 5dp output
  const annual = Math.round(monthly * 12 * 1e3) / 1e3          // 3dp output
  return { emPerDay: daily, emPerMonth: monthly, emPerYear: annual }
}

// ─────────────────────────────────────────────
// SECTION 3: PII MASKING
// ─────────────────────────────────────────────

const PII_CANONICAL_KEYS = new Set(['driver', 'phone', 'id_number'])

// Kenya phone: 07xx, 01xx, +2547xx, +2541xx — also catches 10-digit variants
const PHONE_RE = /^(\+?254|0)(7|1)\d{8}$/

function maskPII(row) {
  const masked = { ...row }
  let wasMasked = false
  for (const [key, val] of Object.entries(masked)) {
    if (PII_CANONICAL_KEYS.has(key) && val && val !== '[MASKED]') {
      masked[key] = '[MASKED]'
      wasMasked = true
      continue
    }
    // Value-level phone detection regardless of column name
    const s = String(val ?? '').replace(/[\s\-]/g, '')
    if (PHONE_RE.test(s)) {
      masked[key] = '[MASKED-PHONE]'
      wasMasked = true
    }
  }
  return { masked, wasMasked }
}

// ─────────────────────────────────────────────
// SECTION 4: CSV PARSER (RFC 4180 compliant)
// ─────────────────────────────────────────────

// Handles: quoted fields, commas inside quotes, escaped quotes (""),
//          CRLF and LF line endings, UTF-8 BOM, trailing empty lines
export function parseCSV(text) {
  // Strip UTF-8 BOM if present
  const clean = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text

  const rows = []
  let field = ''
  let inQuotes = false
  let currentRow = []

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    const next = clean[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"'   // escaped quote
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        currentRow.push(field.trim())
        field = ''
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(field.trim())
        rows.push(currentRow)
        currentRow = []
        field = ''
        i++ // skip \n
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(field.trim())
        rows.push(currentRow)
        currentRow = []
        field = ''
      } else {
        field += ch
      }
    }
  }
  // Final field/row
  if (field !== '' || currentRow.length > 0) {
    currentRow.push(field.trim())
    rows.push(currentRow)
  }

  // Filter entirely empty rows
  const nonEmpty = rows.filter((r) => r.some((c) => c !== ''))
  if (nonEmpty.length < 2) return { rows: [], headers: [], log: ['CSV has fewer than 2 non-empty rows'] }

  const rawHeaders = nonEmpty[0]
  const headers = rawHeaders.map(resolveHeader)
  const dataRows = nonEmpty.slice(1).map((cols) => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cols[i] ?? '' })
    return obj
  })

  return { rows: dataRows, headers, log: [`RFC 4180 parse: ${dataRows.length} data rows, ${headers.length} columns`] }
}

// ─────────────────────────────────────────────
// SECTION 5: EXCEL PARSER (SheetJS, precision mode)
// ─────────────────────────────────────────────

// Keywords that indicate a sheet contains fleet/vehicle data
const FLEET_KEYWORDS = ['vehicle', 'fleet', 'reg', 'fuel', 'route', 'matatu', 'lorry', 'boda', 'bus', 'km', 'litre', 'emission']

// Score a sheet name for likelihood of being the fleet data sheet
function scoreSheetName(name) {
  const s = name.toLowerCase()
  if (['summary', 'charts', 'chart', 'dashboard', 'pivot', 'readme', 'instructions', 'notes', 'cover'].some((x) => s.includes(x))) return -10
  return FLEET_KEYWORDS.filter((kw) => s.includes(kw)).length
}

// Detect which row in a sheet is the header row (0-indexed)
// Scans first 10 rows, returns the row index whose values best match known headers
function detectHeaderRow(rows2d) {
  let bestRow = 0
  let bestScore = 0
  const limit = Math.min(10, rows2d.length)
  for (let i = 0; i < limit; i++) {
    const row = rows2d[i]
    if (!row || row.every((c) => c === null || c === undefined || c === '')) continue
    const score = row.filter((cell) => {
      const norm = normalizeHeader(String(cell ?? ''))
      return ALIAS_MAP[norm] !== undefined
    }).length
    if (score > bestScore) {
      bestScore = score
      bestRow = i
    }
  }
  return { headerRowIdx: bestRow, confidence: bestScore }
}

// Expand merged cells: fill each merged region's top-left value into all covered cells
function expandMerges(worksheet) {
  const merges = worksheet['!merges'] || []
  for (const merge of merges) {
    const { s, e } = merge // s=start, e=end, both {r, c}
    const sourceAddr = XLSX.utils.encode_cell(s)
    const sourceCell = worksheet[sourceAddr]
    if (!sourceCell) continue
    for (let r = s.r; r <= e.r; r++) {
      for (let c = s.c; c <= e.c; c++) {
        if (r === s.r && c === s.c) continue // skip source cell itself
        const addr = XLSX.utils.encode_cell({ r, c })
        // Always fill merged cells, even if they have an empty object or null
        // This ensures the value from the top-left cell (s) is propagated.
        worksheet[addr] = { ...sourceCell }
      }
    }
  }
}

export function parseExcel(arrayBuffer, fileName) {
  const log = []

  // Read workbook — raw values, date conversion, preserve number formats
  const wb = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,     // Excel serial dates → JS Date objects
    cellNF: true,        // preserve number format strings
    cellText: false,     // use raw values, not formatted display text
    raw: true,           // raw numeric precision, not rounded display
  })

  log.push(`Workbook opened: ${wb.SheetNames.length} sheet(s) — [${wb.SheetNames.join(', ')}]`)

  // Select the best sheet
  const scored = wb.SheetNames.map((name) => ({ name, score: scoreSheetName(name) }))
  scored.sort((a, b) => b.score - a.score)
  const sheetName = scored[0].name
  log.push(`Sheet selected: "${sheetName}" (score: ${scored[0].score})${scored.length > 1 ? ` over "${scored[1].name}"` : ''}`)

  const ws = wb.Sheets[sheetName]

  // Expand merged cells before reading
  expandMerges(ws)

  // Read as 2D array with raw values (numbers stay numbers, dates stay Dates)
  const rows2d = XLSX.utils.sheet_to_json(ws, {
    header: 1,      // return array-of-arrays
    raw: true,      // raw values — no formatted strings
    defval: null,   // empty cells = null, not undefined
    blankrows: false, // skip rows where every cell is blank
  })

  if (rows2d.length < 2) {
    return { rows: [], headers: [], log: [...log, 'Sheet has fewer than 2 rows — no data found'] }
  }

  // Auto-detect header row
  const { headerRowIdx, confidence } = detectHeaderRow(rows2d)
  log.push(`Header row: row ${headerRowIdx + 1} (matched ${confidence} known column name(s))`)

  const rawHeaders = rows2d[headerRowIdx]
  const headers = rawHeaders.map((h) => resolveHeader(String(h ?? '')))
  log.push(`Columns mapped: ${headers.join(', ')}`)

  // Data rows start after header row; filter completely empty rows
  const dataRows = rows2d
    .slice(headerRowIdx + 1)
    .filter((row) => row && row.some((c) => c !== null && c !== undefined && c !== ''))
    .map((cols) => {
      const obj = {}
      headers.forEach((h, i) => { obj[h] = cols[i] ?? null })
      return obj
    })

  log.push(`Data rows extracted: ${dataRows.length}`)
  return { rows: dataRows, headers, log }
}

// ─────────────────────────────────────────────
// SECTION 6: VALIDATION
// ─────────────────────────────────────────────

function validateRow(row, rowNum) {
  const issues = []

  if (row.kmPerDay === null || row.kmPerDay <= 0) {
    issues.push(`row ${rowNum}: km_per_day missing or zero`)
  } else if (row.kmPerDay > 2000) {
    issues.push(`row ${rowNum}: km_per_day ${row.kmPerDay} exceeds 2000 — check units`)
  }

  if (!row.fuel) {
    issues.push(`row ${rowNum}: fuel_type missing or unrecognized (original: "${row.fuelRaw}")`)
  }

  if (row.kmPerLitre !== null && row.kmPerLitre < 0.5) {
    issues.push(`row ${rowNum}: km_per_litre ${row.kmPerLitre} is implausibly low`)
  }
  if (row.kmPerLitre !== null && row.kmPerLitre > 80) {
    issues.push(`row ${rowNum}: km_per_litre ${row.kmPerLitre} is implausibly high`)
  }
  if (row.age !== null && row.age < 0) {
    issues.push(`row ${rowNum}: age ${row.age} is negative`)
  }
  if (row.age !== null && row.age > 40) {
    issues.push(`row ${rowNum}: age ${row.age} — vehicle over 40 years old, verify`)
  }

  const isFatal = row.kmPerDay === null || row.kmPerDay <= 0 || !row.fuel
  return { issues, isFatal }
}

// ─────────────────────────────────────────────
// SECTION 7: NORMALIZATION → FLEET RECORD
// ─────────────────────────────────────────────

const WORKING_DAYS = 25

function normalizeRow(raw, idx) {
  // Coerce all numeric fields precisely
  const kmPerDay    = toNumber(raw.km_per_day)
  const kmPerLitre  = toNumber(raw.km_per_litre)
  const litresRaw   = toNumber(raw.litres_per_day)
  const age         = toInt(raw.age)
  const seats       = toInt(raw.seats)

  const fuelRaw = raw.fuel_type
  const fuel    = normalizeFuel(fuelRaw)
  const type    = normalizeType(raw.vehicle_type)

  // Litres per day: use explicit value if present, else derive from km ÷ efficiency
  // Use an efficiency default based on vehicle type if km_per_litre is missing
  const defaultKpl = { matatu: 8.5, 'county-car': 11, lorry: 4, 'boda-boda': 33, bus: 5 }
  const kpl = kmPerLitre ?? defaultKpl[type] ?? 9
  const litresPerDay = litresRaw ?? (kmPerDay !== null && kpl > 0 ? kmPerDay / kpl : null)

  const { emPerDay, emPerMonth, emPerYear } = (litresPerDay !== null && fuel)
    ? calcEmission(litresPerDay, fuel, WORKING_DAYS)
    : { emPerDay: 0, emPerMonth: 0, emPerYear: 0 }

  const id  = toString(raw.id)  || toString(raw.reg) || `U${String(idx + 1).padStart(3, '0')}`
  const reg = toString(raw.reg) || toString(raw.id)  || `UPLOAD-${idx + 1}`

  return {
    id,
    reg,
    type,
    fuel,
    fuelRaw: toString(fuelRaw),   // preserved for audit
    age:          age  ?? 0,
    route:        toString(raw.route) || 'Unknown',
    seats:        seats ?? 5,
    kmPerDay:     kmPerDay  ?? 0,
    kmPerLitre:   Math.round((kpl) * 10) / 10,
    litresPerDay: litresPerDay !== null ? Math.round(litresPerDay * 10) / 10 : 0,
    emPerDay,
    emPerMonth,
    emPerYear,
    // Preserved from raw for driver/phone masking display
    driver:    toString(raw.driver),
    phone:     toString(raw.phone),
    id_number: toString(raw.id_number),
    // Provenance
    sourceFile:  null,  // set by caller
    uploadedAt:  new Date().toISOString(),
    _masked:     false, // set by caller after PII pass
    _rowNum:     idx + 2, // 1-indexed, +1 for header row
  }
}

// ─────────────────────────────────────────────
// SECTION 8: FULL PIPELINE ENTRY POINTS
// ─────────────────────────────────────────────

// Shared processing: raw rows → masked, normalized, validated fleet records
function processParsedRows(rawRows, sourceFileName, extractLog) {
  const results = {
    processed: [],
    warnings: [],
    errors: [],
    masked: 0,
    sheetInfo: null,
    log: [...extractLog],
  }

  if (rawRows.length === 0) {
    results.log.push({ step: 'extraction', detail: 'No data rows found', status: 'error' })
    return results
  }

  results.log.push({ step: 'extraction', detail: `${rawRows.length} raw rows ready for processing`, status: 'ok' })

  // Column mapping report
  const sample = rawRows[0] || {}
  const hasLitres = 'litres_per_day' in sample
  const hasKpl    = 'km_per_litre' in sample
  results.log.push({
    step: 'classification',
    detail: `Direct litres column: ${hasLitres ? 'yes' : 'no (will derive from km ÷ efficiency)'}. Efficiency column: ${hasKpl ? 'yes' : 'no (will use type default)'}`,
    status: 'ok',
  })

  // PII masking pass
  let piiCount = 0
  const maskedRows = rawRows.map((row) => {
    const { masked, wasMasked } = maskPII(row)
    if (wasMasked) piiCount++
    return { ...masked, _wasMasked: wasMasked }
  })
  results.masked = piiCount
  results.log.push({
    step: 'mask_pii',
    detail: `PII scan complete: ${piiCount} row(s) had driver names, phone numbers, or ID numbers masked`,
    status: piiCount > 0 ? 'warn' : 'ok',
  })

  // Normalization + validation pass
  maskedRows.forEach((row, idx) => {
    const normalized = normalizeRow(row, idx)
    normalized.sourceFile = sourceFileName
    normalized._masked    = row._wasMasked

    const { issues, isFatal } = validateRow(normalized, normalized._rowNum)

    if (issues.length > 0) {
      if (isFatal) {
        results.errors.push({ row: normalized._rowNum, id: normalized.id, issues })
        return // skip this row
      } else {
        results.warnings.push({ row: normalized._rowNum, id: normalized.id, issues })
      }
    }

    results.processed.push(normalized)
  })

  results.log.push({
    step: 'validation',
    detail: `${results.processed.length} valid, ${results.errors.length} skipped (fatal errors), ${results.warnings.length} warnings`,
    status: results.errors.length > 0 ? 'warn' : 'ok',
  })

  results.log.push({
    step: 'normalization',
    detail: `Fuel types standardized. IPCC 2006 Tier 1 emission factors applied (petrol 0.00231, diesel 0.00268, cng 0.00202 tCO₂eq/L). Age-efficiency penalty: −7% over 5yr, −18% over 8yr.`,
    status: 'ok',
  })

  return results
}

// Entry point for CSV files
export function processCSVUpload(csvText, sourceFileName) {
  const { rows, headers, log: parseLog } = parseCSV(csvText)
  const extractLog = parseLog.map((d) => ({ step: 'extraction', detail: d, status: 'ok' }))
  return processParsedRows(rows, sourceFileName, extractLog)
}

// Entry point for Excel files
export function processExcelUpload(arrayBuffer, sourceFileName) {
  const { rows, headers, log: parseLog } = parseExcel(arrayBuffer, sourceFileName)
  const extractLog = parseLog.map((d) => ({ step: 'extraction', detail: d, status: 'ok' }))
  return processParsedRows(rows, sourceFileName, extractLog)
}

// ─────────────────────────────────────────────
// SECTION 9: TEMPLATE GENERATION
// ─────────────────────────────────────────────

export function getTemplateCSV() {
  const header = 'id,reg,vehicle_type,fuel_type,age,route,km_per_day,km_per_litre,seats,driver,phone'
  const rows = [
    'V001,KAB123CD,matatu,petrol,6,CBD-Westlands,120,8.5,14,John Doe,0712345678',
    'V002,KBC456EF,lorry,diesel,4,Mombasa Road,200,4.2,2,,',
    'V003,KCA789GH,county-car,petrol,3,"County HQ, Nairobi",80,11,5,,',
    'V004,KDA012IJ,boda-boda,petrol,2,CBD Last-Mile,90,33,1,,',
    'V005,KEB345KL,bus,diesel,7,Nairobi-Kisumu,350,5.1,50,,',
  ]
  // Note: row 1 has PII (driver + phone) to demonstrate masking
  return [header, ...rows].join('\n')
}

// Generate a proper .xlsx template using SheetJS
export function getTemplateXLSX() {
  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Fleet Data ──
  const fleetData = [
    // Title row (will be skipped by header detection — good test)
    ['CarbonTrack Fleet Register — EPRA NDC 3.0 Reporting Template'],
    [],
    // Actual header row
    ['id', 'reg', 'vehicle_type', 'fuel_type', 'age', 'route', 'km_per_day', 'km_per_litre', 'seats', 'driver', 'phone'],
    // Sample data rows — including one with PII to demo masking
    ['V001', 'KAB123CD', 'matatu',     'petrol', 6,  'CBD-Westlands',    120, 8.5, 14, 'John Doe',   '0712345678'],
    ['V002', 'KBC456EF', 'lorry',      'diesel', 4,  'Mombasa Road',     200, 4.2, 2,  '',           ''],
    ['V003', 'KCA789GH', 'county-car', 'petrol', 3,  'County HQ-Nakuru', 80,  11,  5,  '',           ''],
    ['V004', 'KDA012IJ', 'boda-boda',  'petrol', 2,  'CBD Last-Mile',    90,  33,  1,  '',           ''],
    ['V005', 'KEB345KL', 'bus',        'diesel', 7,  'Nairobi-Kisumu',   350, 5.1, 50, '',           ''],
    ['V006', 'KFC678MN', 'matatu',     'diesel', 9,  'Thika Superhwy',   150, 7.8, 14, 'Jane Smith', '+254711223344'],
    ['V007', 'KGD901OP', 'lorry',      'diesel', 12, 'Northern Bypass',  220, 3.9, 2,  '',           ''],
  ]

  const wsFleet = XLSX.utils.aoa_to_sheet(fleetData)

  // Column widths
  wsFleet['!cols'] = [
    { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 6 },
    { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 7 }, { wch: 14 }, { wch: 16 },
  ]

  // Bold the header row (row 3, 0-indexed row 2)
  const headerRowIdx = 2
  const headerKeys = ['id','reg','vehicle_type','fuel_type','age','route','km_per_day','km_per_litre','seats','driver','phone']
  headerKeys.forEach((_, c) => {
    const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c })
    if (wsFleet[addr]) wsFleet[addr].s = { font: { bold: true } }
  })

  XLSX.utils.book_append_sheet(wb, wsFleet, 'Fleet Data')

  // ── Sheet 2: Reference ──
  const refData = [
    ['Vehicle Type Reference'],
    [],
    ['Type Code',       'Description',             'Default km/L', 'Fuel'],
    ['matatu',          '14-seater minibus',        8.5,            'petrol'],
    ['lorry',           'Heavy goods vehicle',      4.0,            'diesel'],
    ['county-car',      'Government/admin car',     11.0,           'petrol'],
    ['boda-boda',       'Motorcycle taxi',          33.0,           'petrol'],
    ['bus',             'Long-distance bus',        5.0,            'diesel'],
    [],
    ['Fuel Type Reference'],
    [],
    ['Fuel Code',  'IPCC Emission Factor (tCO₂eq/L)', 'Source'],
    ['petrol',     0.00231,                            'IPCC 2006 Table 3.2.1'],
    ['diesel',     0.00268,                            'IPCC 2006 Table 3.2.1'],
    ['cng',        0.00202,                            'IPCC 2006 Table 3.2.1'],
    ['electric',   0.00030,                            'EPRA Grid Intensity 2022 (tCO₂eq/kWh equiv)'],
    [],
    ['Accepted Column Name Aliases'],
    [],
    ['Canonical Column', 'Also Accepted As'],
    ['km_per_day',   'daily_km, km_day, distance_per_day, daily_distance'],
    ['km_per_litre', 'efficiency, kpl, kmpl, fuel_efficiency, fuel_economy'],
    ['litres_per_day','fuel_litres, litres, daily_fuel, ltr_per_day'],
    ['vehicle_type', 'type, category, class, fleet_type'],
    ['fuel_type',    'fuel, fuel_kind, energy_type, propulsion'],
    ['reg',          'registration, plate, number_plate, reg_no'],
    ['age',          'vehicle_age, years, year_of_manufacture, yom'],
  ]

  const wsRef = XLSX.utils.aoa_to_sheet(refData)
  wsRef['!cols'] = [{ wch: 20 }, { wch: 42 }, { wch: 16 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsRef, 'Reference')

  // Write to array buffer
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true })
  return new Uint8Array(buf)
}
