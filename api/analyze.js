// api/analyze.js — Vercel Serverless Function
// AI layer: Groq (free tier) — llama-3.3-70b-versatile
// Free tier: 14,400 req/day, no credit card needed
// Get key at: https://console.groq.com/keys

export const config = { runtime: 'edge' }

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT = `You are a senior transport emissions analyst and institutional compliance specialist for EPRA (Energy and Petroleum Regulatory Authority of Kenya).

You apply IPCC Tier 1 methodology as used in Kenya's National GHG Inventory, and are deeply familiar with:
- Kenya NDC 3.0 (35% below BAU by 2035; transport target 16.3 MtCO2eq by 2030)
- Energy Act No. 1 of 2019
- Climate Change Act 2016 (Cap 387A)
- EMCA (Environmental Management and Coordination Act)
- GIZ Kenya Vehicle Fleet Study 2021
- KNBS Statistical Abstracts

EMISSION FACTORS (IPCC 2006 Table 3.2.1):
- Petrol: 0.00231 tCO2eq/litre
- Diesel: 0.00268 tCO2eq/litre
- CNG: 0.00202 tCO2eq/litre
- Electric (Kenya grid): 0.0003 tCO2eq/kWh equiv (EPRA 2022)

KENYA FINANCIAL MARKET RATES (2024/2025):
- Petrol pump price: KES 207.64/litre (EPRA Nairobi Jan 2025)
- Diesel pump price: KES 194.79/litre (EPRA Nairobi Jan 2025)
- KPLC electricity: KES 22.50/kWh (SC2 commercial fleet charging rate)
- Carbon credits (VCM Kenya): $8–18/tCO2eq; mid $12 = KES 1,560/tCO2eq (Ecosystem Marketplace 2024)
- Carbon credits (compliance, future): $15–20/tCO2eq under Kenya Climate Change Act 2023
- USD/KES: 130 (CBK Jan 2025)
- Annual working days: 300 (25/month)
- Commercial lending rate: 14% p.a. (CBK 2024)

EV MARKET PRICES (Kenya 2024):
- Roam Air EV matatu (14-seater): KES 3,800,000 vs KES 900,000 ICE matatu
- BasiGo electric bus: KES 9,000,000 vs KES 4,500,000 ICE bus
- BYD Atto 3 / Ioniq 5 (county car): KES 4,500,000 vs KES 3,200,000 ICE
- Ampersand/Roam EV boda-boda: KES 280,000 vs KES 150,000 ICE boda
- EV lorry: NOT available in Kenya market as of 2024
- EV efficiency: matatu 0.25 kWh/km, bus 0.35, county-car 0.18, boda 0.08

MAINTENANCE SAVINGS (GIZ Kenya Fleet Study 2021):
- Matatu: ICE KES 12,000/mo vs EV KES 4,500/mo (saving: -62%)
- Bus: ICE KES 25,000/mo vs EV KES 9,000/mo (saving: -64%)
- County car: ICE KES 8,000/mo vs EV KES 3,000/mo (saving: -62%)
- Boda-boda: ICE KES 3,000/mo vs EV KES 800/mo (saving: -73%)

HARD RULES:
1. Return ONLY valid JSON — no markdown, no preamble
2. Every finding must cite source (data row ID, IPCC table, EPRA pricing, named study, regulation)
3. Every recommendation MUST include KES financial figures: annual_saving_kes, carbon_credit_kes, total_benefit_kes, capital_cost_kes, payback_years
4. Include confidence scores 0.0–1.0 for every recommendation
5. Flag distributional impacts (who bears cost of transition)
6. List data gaps honestly
7. Never recommend irreversible action without flagging human approval
8. Role-tailor your response to the stated role`

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'GROQ_API_KEY environment variable not set. Get a free key at https://console.groq.com/keys' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const { fleetSummary, totalEmissions, hotspots, scenario, role = 'fleet_manager', uploadedData } = body

  const userPrompt = `Analyse this institutional fleet data and return a JSON object with EXACTLY this structure — no other text.

ROLE: ${role}
FLEET SUMMARY: ${JSON.stringify(fleetSummary, null, 2)}
TOTAL MONTHLY EMISSIONS: ${totalEmissions} tCO2eq
TOP EMITTING VEHICLES: ${JSON.stringify(hotspots)}
${uploadedData ? `UPLOADED DATA ROWS: ${JSON.stringify(uploadedData.slice(0, 20))}` : ''}
${scenario ? `FOCUS SCENARIO: ${scenario}` : ''}

Return ONLY this JSON structure:
{
  "summary": "2-3 sentence executive summary with specific numbers and KES figures",
  "roleInsight": "1-2 sentences specifically addressing the ${role} role perspective",
  "ndcAlignment": {
    "annualEstimate": <number tCO2eq>,
    "ndcBenchmark": "<comparison string>",
    "trajectoryRisk": "low|medium|high"
  },
  "topOpportunities": [
    {
      "rank": 1,
      "action": "<specific action>",
      "saving_tco2eq_month": <number>,
      "saving_pct": <number>,
      "financial": {
        "annual_fuel_saving_kes": <number>,
        "annual_maintenance_saving_kes": <number>,
        "carbon_credit_annual_kes": <number at $12/tCO2eq mid price>,
        "total_annual_benefit_kes": <sum of above>,
        "capital_cost_kes": <upfront investment required, 0 if none>,
        "payback_years": <number or null if no capital cost>,
        "5yr_net_kes": <total 5yr benefit minus capital cost>,
        "monthly_cashflow_kes": <monthly benefit after financing>
      },
      "distributionalImpact": "<who bears transition cost>",
      "confidence": <0.0-1.0>,
      "evidenceLink": "<row ID, file, or dataset cited>",
      "source": "<IPCC table or study name>",
      "approvalRequired": "<who must approve>"
    }
  ],
  "hotspotAnalysis": "<paragraph citing specific vehicle IDs and emission values>",
  "complianceFlags": [
    { "flag": "<issue>", "regulation": "<Act or NDC clause>", "severity": "low|medium|high" }
  ],
  "financialSummary": {
    "total_annual_fuel_cost_kes": <current ICE fleet fuel bill>,
    "best_roi_scenario": "<scenario name>",
    "best_roi_payback_years": <number>,
    "carbon_credit_potential_annual_kes": <at mid $12/tCO2eq if best scenario implemented>,
    "route_consolidation_saving_kes": <zero-capital option annual saving>
  },
  "dataGaps": ["<gap 1>", "<gap 2>", "<gap 3>"],
  "auditNote": "<what an auditor should verify>",
  "policyRecommendation": "<one concrete ask citing specific regulation with KES value>",
  "uncertaintyNote": "<±% range and reason>",
  "nextAction": { "owner": "<role>", "action": "<what they should do>", "deadline": "<timeframe>" }
}`

  try {
    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    if (!groqRes.ok) {
      const err = await groqRes.text()
      return new Response(JSON.stringify({ error: `Groq API error: ${err}` }), {
        status: groqRes.status, headers: { 'Content-Type': 'application/json' }
      })
    }

    const data = await groqRes.json()
    const text = data.choices?.[0]?.message?.content || ''

    let parsed
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      const start = clean.indexOf('{')
      const end = clean.lastIndexOf('}')
      parsed = JSON.parse(clean.slice(start, end + 1))
    } catch {
      parsed = { raw: text, parseError: true }
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
}
