// src/components/DataIntake.jsx
import React, { useState, useRef } from 'react'
import { processCSVUpload, processExcelUpload, getTemplateCSV, getTemplateXLSX } from '../utils/dataIntake'
import { logEvent } from '../utils/auditTrail'

const ACCEPTED_EXTS = ['csv', 'txt', 'xlsx', 'xls', 'xlsm']

const STEP_STATUS_COLOR = {
  ok:    { bg: '#EAF3DE', text: '#27500A' },
  warn:  { bg: '#FAEEDA', text: '#633806' },
  error: { bg: '#FCEBEB', text: '#791F1F' },
}

const PIPELINE_STEPS = [
  { key: 'upload',        label: 'Upload' },
  { key: 'extraction',    label: 'Extract' },
  { key: 'classification',label: 'Classify' },
  { key: 'mask_pii',      label: 'Mask PII' },
  { key: 'validation',    label: 'Validate' },
  { key: 'normalization', label: 'Normalize' },
  { key: 'done',          label: 'Done' },
]

export default function DataIntake({ role, onDataLoaded }) {
  const [dragOver, setDragOver]     = useState(false)
  const [processing, setProcessing] = useState(false)
  const [pipelineStep, setPipelineStep] = useState(-1)
  const [result, setResult]         = useState(null)
  const [fileInfo, setFileInfo]     = useState(null)
  const fileRef = useRef(null)

  // ── File handler ──────────────────────────────────────────────
  async function handleFile(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!ACCEPTED_EXTS.includes(ext)) {
      setResult({ fatal: `File type .${ext} is not supported. Accepted: ${ACCEPTED_EXTS.join(', ')}` })
      return
    }

    setProcessing(true)
    setResult(null)
    setPipelineStep(0)
    setFileInfo({ name: file.name, size: file.size, ext })

    logEvent({
      type: 'data_upload', actor: role, role,
      action: `File uploaded: ${file.name}`,
      detail: `${file.name} · ${(file.size / 1024).toFixed(1)} KB · type: .${ext}`,
      sourceRef: file.name,
    })

    // Tick through pipeline steps with timing
    const tick = (i) => new Promise((r) => setTimeout(() => { setPipelineStep(i); r() }, 300))

    let output
    try {
      await tick(1) // extraction
      if (['xlsx', 'xls', 'xlsm'].includes(ext)) {
        const buf = await file.arrayBuffer()
        await tick(2) // classify
        output = processExcelUpload(buf, file.name)
      } else {
        const text = await file.text()
        await tick(2) // classify
        output = processCSVUpload(text, file.name)
      }
      await tick(3) // mask PII
      await tick(4) // validate
      await tick(5) // normalize
      await tick(6) // done
    } catch (err) {
      setResult({ fatal: `Processing error: ${err.message}` })
      setProcessing(false)
      return
    }

    logEvent({
      type: 'extraction', actor: 'system', role: 'system',
      action: `Pipeline complete: ${output.processed.length} vehicles from ${file.name}`,
      detail: `Valid: ${output.processed.length} · Errors: ${output.errors.length} · Warnings: ${output.warnings?.length ?? 0} · PII masked: ${output.masked}`,
      sourceRef: file.name, confidence: output.errors.length === 0 ? 0.97 : 0.82,
    })

    setResult(output)
    setProcessing(false)

    if (output.processed.length > 0 && onDataLoaded) {
      onDataLoaded(output.processed)
    }
  }

  // ── Template downloads ────────────────────────────────────────
  function downloadCSV() {
    const blob = new Blob([getTemplateCSV()], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: 'carbontrack_template.csv' }).click()
    URL.revokeObjectURL(url)
  }

  function downloadXLSX() {
    const bytes = getTemplateXLSX()
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: 'carbontrack_template.xlsx' }).click()
    URL.revokeObjectURL(url)
  }

  const pct = pipelineStep < 0 ? 0 : Math.round((pipelineStep / (PIPELINE_STEPS.length - 1)) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Header */}
      <div>
        <h2>Data Intake</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
          Upload fleet data → 7-step pipeline: extract · classify · mask PII · validate · normalize · emit
        </p>
      </div>

      <div className="alert alert-info">
        <strong>Accepted:</strong> Excel (.xlsx, .xls, .xlsm) and CSV (.csv, .txt).
        Multi-sheet workbooks: the most relevant sheet is auto-selected.
        Header row: auto-detected even if row 1 is a title.
        PII (driver names, phone numbers, national IDs) masked before processing.
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#3B6D11' : 'var(--border-md)'}`,
          borderRadius: '12px', padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
          background: dragOver ? '#EAF3DE' : 'var(--surface)', transition: 'all .15s',
        }}
      >
        <input
          ref={fileRef} type="file"
          accept=".csv,.txt,.xlsx,.xls,.xlsm"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ margin: '0 auto 12px', display: 'block' }}>
          <rect x="4" y="4" width="28" height="28" rx="6" stroke="var(--text-3)" strokeWidth="1.5"/>
          <path d="M18 10v16M10 18l8-8 8 8" stroke="#3B6D11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '6px' }}>
          Drop file here or click to browse
        </div>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {['.xlsx','.xls','.xlsm','.csv','.txt'].map((e) => (
            <span key={e} className="tag tag-gray" style={{ fontSize: '11px' }}>{e}</span>
          ))}
        </div>
      </div>

      {/* Template downloads */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn" onClick={downloadXLSX} style={{ fontSize: '12px' }}>
          Download Excel template (.xlsx)
        </button>
        <button className="btn" onClick={downloadCSV} style={{ fontSize: '12px' }}>
          Download CSV template
        </button>
        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
          Excel template has 2 sheets: Fleet Data + Reference (emission factors, column aliases)
        </span>
      </div>

      {/* Pipeline progress */}
      {(processing || pipelineStep === PIPELINE_STEPS.length - 1) && (
        <div className="card">
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Processing pipeline</span>
            {fileInfo && <span style={{ color: 'var(--text-3)' }}>{fileInfo.name} · {(fileInfo.size / 1024).toFixed(1)} KB</span>}
          </div>
          <div style={{ display: 'flex', marginBottom: '12px' }}>
            {PIPELINE_STEPS.map((s, i) => (
              <div key={s.key} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%', margin: '0 auto 4px',
                  background: i < pipelineStep ? '#3B6D11' : i === pipelineStep ? '#854F0B' : 'var(--surface-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 600,
                  color: i <= pipelineStep ? '#fff' : 'var(--text-3)',
                  transition: 'background .25s',
                }}>
                  {i < pipelineStep ? '✓' : i + 1}
                </div>
                <div style={{ fontSize: '9px', color: i <= pipelineStep ? 'var(--text-1)' : 'var(--text-3)', letterSpacing: '0.2px' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: '6px', background: 'var(--surface-3)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#3B6D11', borderRadius: '3px', width: `${pct}%`, transition: 'width .3s' }} />
          </div>
        </div>
      )}

      {/* Fatal error */}
      {result?.fatal && (
        <div className="alert alert-danger">{result.fatal}</div>
      )}

      {/* Results */}
      {result && !result.fatal && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Summary alert */}
          {result.processed.length > 0 ? (
            <div className="alert alert-success">
              <strong>Pipeline complete.</strong> {result.processed.length} vehicles ready.
              {result.masked > 0 && ` ${result.masked} row(s) had PII masked.`}
              {result.warnings?.length > 0 && ` ${result.warnings.length} warning(s).`}
              {result.errors.length > 0 && ` ${result.errors.length} row(s) skipped (fatal validation errors).`}
              {' Fleet data is now active — visible in Fleet Manager and AI Analyst.'}
            </div>
          ) : (
            <div className="alert alert-danger">
              <strong>No valid rows produced.</strong> Check validation errors below.
              {result.errors.length > 0 && ` ${result.errors.length} row(s) had fatal errors.`}
            </div>
          )}

          {/* Processing log */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--border)', fontSize: '11px', fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Processing log
            </div>
            {result.log.map((entry, i) => {
              const statusStyle = STEP_STATUS_COLOR[entry.status] || STEP_STATUS_COLOR.ok
              return (
                <div key={i} style={{ display: 'flex', gap: '10px', padding: '7px 14px', borderBottom: '0.5px solid var(--border)', fontSize: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '8px', background: statusStyle.bg, color: statusStyle.text, flexShrink: 0, fontWeight: 500 }}>
                    {entry.step}
                  </span>
                  <span style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>{entry.detail}</span>
                </div>
              )
            })}
          </div>

          {/* Normalized preview */}
          {result.processed.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Normalized data preview
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                  showing 5 of {result.processed.length}
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th><th>Reg</th><th>Type</th><th>Fuel</th>
                      <th>Age</th><th>km/day</th><th>L/day</th><th>km/L</th>
                      <th>tCO₂eq/mo</th><th>Source</th><th>PII</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.processed.slice(0, 5).map((v) => (
                      <tr key={v.id}>
                        <td className="mono" style={{ fontSize: '11px', fontWeight: 500 }}>{v.id}</td>
                        <td className="mono" style={{ fontSize: '11px' }}>{v.reg}</td>
                        <td><span className="tag tag-green" style={{ fontSize: '10px' }}>{v.type}</span></td>
                        <td style={{ fontSize: '12px' }}>{v.fuel}</td>
                        <td style={{ fontSize: '12px', color: v.age > 8 ? '#A32D2D' : 'inherit' }}>{v.age}yr</td>
                        <td className="mono" style={{ fontSize: '12px' }}>{v.kmPerDay}</td>
                        <td className="mono" style={{ fontSize: '12px' }}>{v.litresPerDay}</td>
                        <td className="mono" style={{ fontSize: '12px' }}>{v.kmPerLitre}</td>
                        <td className="mono" style={{ fontSize: '12px', fontWeight: 600, color: v.emPerMonth > 0.2 ? '#A32D2D' : 'inherit' }}>
                          {v.emPerMonth.toFixed(5)}
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--text-3)' }}>{v.sourceFile}</td>
                        <td>
                          <span className={`tag ${v._masked ? 'tag-amber' : 'tag-green'}`} style={{ fontSize: '10px' }}>
                            {v._masked ? 'masked' : 'clean'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Warnings */}
          {result.warnings?.length > 0 && (
            <div className="card">
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#633806', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                Warnings — rows processed with cautions ({result.warnings.length})
              </div>
              {result.warnings.slice(0, 8).map((w, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#854F0B', padding: '4px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <span className="mono" style={{ fontSize: '11px', marginRight: '6px' }}>{w.id}</span>
                  {w.issues.join(' · ')}
                </div>
              ))}
              {result.warnings.length > 8 && (
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>+ {result.warnings.length - 8} more</div>
              )}
            </div>
          )}

          {/* Fatal validation errors */}
          {result.errors.length > 0 && (
            <div className="card">
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#791F1F', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                Validation errors — rows skipped ({result.errors.length})
              </div>
              {result.errors.slice(0, 8).map((e, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#A32D2D', padding: '4px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <span className="mono" style={{ fontSize: '11px', marginRight: '6px' }}>Row {e.row} ({e.id})</span>
                  {e.issues.join(' · ')}
                </div>
              ))}
              {result.errors.length > 8 && (
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>+ {result.errors.length - 8} more</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Schema reference */}
      <div className="card" style={{ background: 'var(--surface-2)' }}>
        <h3 style={{ marginBottom: '10px', fontSize: '12px' }}>Column schema — flexible aliases accepted</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px,1fr))', gap: '6px' }}>
          {[
            ['km_per_day ✱',     'daily_km · km_day · distance_per_day · daily_distance'],
            ['fuel_type',        'fuel · fuel_kind · energy_type · propulsion'],
            ['vehicle_type',     'type · category · class · fleet_type'],
            ['reg',              'registration · plate · number_plate · reg_no'],
            ['km_per_litre',     'efficiency · kpl · kmpl · fuel_efficiency'],
            ['litres_per_day',   'fuel_litres · litres · daily_fuel · ltr_per_day'],
            ['age',              'vehicle_age · years · yom · year_of_manufacture'],
            ['route',            'route_name · road · corridor · service_route'],
            ['seats',            'capacity · passengers · seating'],
            ['id',               'vehicle_id · vid · fleet_id'],
            ['driver ⚠',         'driver_name · name · operator — auto-masked'],
            ['phone ⚠',          'mobile · contact · telephone — auto-masked'],
          ].map(([col, aliases]) => (
            <div key={col} style={{ padding: '7px 9px', background: 'var(--surface)', borderRadius: '6px', border: '0.5px solid var(--border)' }}>
              <div className="mono" style={{ fontSize: '11px', fontWeight: 600, color: col.includes('⚠') ? '#854F0B' : '#3B6D11', marginBottom: '3px' }}>
                {col}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', lineHeight: 1.5 }}>{aliases}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '8px' }}>
          ✱ Required. ⚠ Auto-masked before processing.
          Excel: header row auto-detected (title rows in row 1 are handled).
          Multi-sheet workbooks: fleet sheet auto-selected.
        </p>
      </div>
    </div>
  )
}
