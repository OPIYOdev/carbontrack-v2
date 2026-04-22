// src/components/KenyaComplianceCalculator.jsx
import React, { useState, useEffect } from 'react';
import { calculateKenyaComplianceCredits } from '../utils/kenyaCompliance';

const KenyaComplianceCalculator = () => {
  const [inputs, setInputs] = useState({
    institutionName: '',
    reportingYear: 2026,
    nemaReg: '',
    baselineDiesel: 50000,
    baselineVehicleCount: 10,
    projectDiesel: 20000,
    projectEVCharging: 45000,
  });

  const [checks, setChecks] = useState({
    nemaVerified: false,
    baselineLocked: false,
    efUsed: true,
    doeScheduled: false,
    publicUploaded: false,
  });

  const [results, setResults] = useState(null);

  useEffect(() => {
    const res = calculateKenyaComplianceCredits(inputs);
    setResults(res);
  }, [inputs]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setInputs(prev => ({
      ...prev,
      [name]: e.target.type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleCheckChange = (name) => {
    setChecks(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const fmt = (val) => val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', borderBottom: '2px solid #3B6D11', paddingBottom: '10px' }}>
        <h2 style={{ color: '#3B6D11', margin: 0 }}>CARBON CREDITS CALCULATION</h2>
        <p style={{ color: '#666', margin: '5px 0' }}>KENYA COMPLIANCE TEMPLATE — CDM AMS-III.C</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Input Form */}
        <div className="card">
          <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Project Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '13px' }}>Institution Name
              <input type="text" name="institutionName" value={inputs.institutionName} onChange={handleInputChange} style={{ width: '100%', padding: '8px', marginTop: '4px' }} placeholder="e.g. Nairobi City County" />
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ fontSize: '13px', flex: 1 }}>Reporting Year
                <input type="number" name="reportingYear" value={inputs.reportingYear} onChange={handleInputChange} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
              </label>
              <label style={{ fontSize: '13px', flex: 1 }}>NEMA Registration #
                <input type="text" name="nemaReg" value={inputs.nemaReg} onChange={handleInputChange} style={{ width: '100%', padding: '8px', marginTop: '4px' }} placeholder="NEMA/CC/..." />
              </label>
            </div>
            
            <h4 style={{ fontSize: '14px', marginTop: '15px', borderBottom: '1px solid #eee' }}>Baseline (Year 1)</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ fontSize: '13px', flex: 1 }}>Diesel (L/yr)
                <input type="number" name="baselineDiesel" value={inputs.baselineDiesel} onChange={handleInputChange} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
              </label>
              <label style={{ fontSize: '13px', flex: 1 }}>Vehicle Count
                <input type="number" name="baselineVehicleCount" value={inputs.baselineVehicleCount} onChange={handleInputChange} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
              </label>
            </div>

            <h4 style={{ fontSize: '14px', marginTop: '15px', borderBottom: '1px solid #eee' }}>Project (Current Year)</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ fontSize: '13px', flex: 1 }}>Diesel (L/yr)
                <input type="number" name="projectDiesel" value={inputs.projectDiesel} onChange={handleInputChange} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
              </label>
              <label style={{ fontSize: '13px', flex: 1 }}>EV Charging (kWh/yr)
                <input type="number" name="projectEVCharging" value={inputs.projectEVCharging} onChange={handleInputChange} style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
              </label>
            </div>
          </div>

          <h3 style={{ fontSize: '16px', marginTop: '25px', marginBottom: '15px' }}>Compliance Checks</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              ['nemaVerified', 'NEMA registration verified'],
              ['baselineLocked', 'Baseline locked (Year 1 only)'],
              ['efUsed', 'Kenya emission factors used'],
              ['doeScheduled', 'DOE validation scheduled'],
              ['publicUploaded', 'Public disclosure uploaded'],
            ].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={checks[key]} onChange={() => handleCheckChange(key)} />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Results Display */}
        {results && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ borderLeft: '5px solid #3B6D11' }}>
              <h3 style={{ fontSize: '14px', color: '#666', textTransform: 'uppercase', marginBottom: '15px' }}>Calculation Summary</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '12px', color: '#888' }}>BASELINE EMISSIONS</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{fmt(results.baseline.totalEmissionsTonnes)} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>tCO₂e</span></div>
                <div style={{ fontSize: '11px', color: '#999' }}>{fmt(results.baseline.dieselConsumption)} L Diesel × {results.baseline.emissionFactor} kg/L</div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '12px', color: '#888' }}>PROJECT EMISSIONS</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#A32D2D' }}>{fmt(results.project.totalEmissionsTonnes)} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>tCO₂e</span></div>
                <div style={{ fontSize: '11px', color: '#999' }}>{fmt(results.project.dieselConsumption)} L Diesel + {fmt(results.project.evChargingKwh)} kWh EV</div>
              </div>

              <div style={{ marginBottom: '15px', padding: '10px', background: '#f0f7e6', borderRadius: '4px' }}>
                <div style={{ fontSize: '12px', color: '#3B6D11', fontWeight: 'bold' }}>EMISSION REDUCTION</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3B6D11' }}>{fmt(results.project.reductionTonnes)} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>tCO₂e</span></div>
              </div>
            </div>

            <div className="card" style={{ background: '#3B6D11', color: 'white' }}>
              <h3 style={{ fontSize: '14px', textTransform: 'uppercase', marginBottom: '15px', color: '#EAF3DE' }}>Certified Annual Credits</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '5px' }}>
                <span style={{ fontSize: '13px' }}>Gross Reduction</span>
                <span style={{ fontWeight: 'bold' }}>{fmt(results.certified.grossReductionTonnes)} tCO₂e</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '5px' }}>
                <span style={{ fontSize: '13px' }}>10% Conservative Buffer</span>
                <span style={{ fontWeight: 'bold' }}>-{fmt(results.certified.bufferTonnes)} tCO₂e</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>CERTIFIED CREDITS</span>
                <span style={{ fontSize: '28px', fontWeight: 'bold' }}>{fmt(results.certified.certifiedAnnualCreditsTonnes)} <span style={{ fontSize: '16px' }}>tCO₂e</span></span>
              </div>

              <div style={{ marginTop: '10px', padding: '15px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#EAF3DE', marginBottom: '5px' }}>ESTIMATED ANNUAL REVENUE</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold' }}>KES {fmt(results.certified.revenueKes)}</div>
                <div style={{ fontSize: '11px', color: '#EAF3DE', marginTop: '5px' }}>@ KES {results.certified.ratePerTonne.toLocaleString()}/tCO₂e</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '30px', fontSize: '12px', color: '#999', fontStyle: 'italic', textAlign: 'center' }}>
        Methodology: AMS-III.C (Electric & Hybrid Vehicles) | Kenya Climate Change Act 2023 Compliant
      </div>
    </div>
  );
};

export default KenyaComplianceCalculator;
