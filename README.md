# EPRA CarbonTrack v2

> Role-based institutional transport emission intelligence — Kenya NDC 3.0 aligned.

**Stack:** React + Vite · Vercel Serverless Functions · Groq API (free) · llama-3.3-70b  
**No paid backend.** One Vercel Function proxies Groq. Everything else is client-side.

---

## What's new in v2 (vs document spec)

| Document requirement | Implemented |
|---|---|
| Role-based access (6 roles) | ✅ Fleet Manager, Compliance, Auditor, Procurement, Regulator, Executive |
| Data intake — CSV upload | ✅ Drag-and-drop, processing pipeline UI |
| Extract → classify → validate → normalize | ✅ Full pipeline with step animation |
| PII minimization (names, phones, IDs) | ✅ Auto-masked before processing |
| Evidence + audit trail | ✅ Immutable event log, source-referenced |
| Action workflow (approve/reject/escalate) | ✅ Queue by role, decision logging |
| AI recommendations cited to source | ✅ Every finding has evidenceLink + source |
| Carbon accounting engine | ✅ IPCC Tier 1 |
| Scenario modeler | ✅ BAU / EV / Route / Modal |
| Policy report | ✅ Print-ready EPRA submission |

---

## Get a free Groq key (2 minutes)

1. Go to https://console.groq.com/keys
2. Sign up (free, no credit card)
3. Click "Create API Key"
4. Copy the key — you'll need it in step 3 below

Free tier: **14,400 requests/day** · Model: llama-3.3-70b-versatile

---

## Deploy to Vercel

### Step 1 — Push to GitHub
```bash
cd carbontrack
git init && git add . && git commit -m "EPRA CarbonTrack v2"
gh repo create epra-carbontrack --public --push
# or: git remote add origin <your-repo-url> && git push -u origin main
```

### Step 2 — Import on Vercel
1. Go to https://vercel.com/new
2. Import your GitHub repo
3. Framework: **Vite** (auto-detected)
4. Click **Deploy**

### Step 3 — Add environment variable
**Vercel → Project → Settings → Environment Variables → Add**
```
Name:  GROQ_API_KEY
Value: gsk_...your key here...
```
Then **Redeploy** (Deployments → Redeploy)

Done. Your live URL appears in the Vercel dashboard.

---

## Local development

```bash
npm install -g vercel
cp .env.example .env.local    # add GROQ_API_KEY
npm install
vercel dev                     # runs Vite + /api functions on :3000
```

> Without the API key, all tabs except AI Analyst work fully.

---

## Role access matrix

| Tab | Fleet Mgr | Compliance | Auditor | Procurement | Regulator | Executive |
|-----|-----------|------------|---------|-------------|-----------|-----------|
| Overview | ✅ | ✅ | | ✅ | ✅ | ✅ |
| Fleet | ✅ | | ✅ | ✅ | | |
| Calculator | ✅ | | | | | |
| Data Intake | ✅ | | ✅ | | | |
| AI Analyst | ✅ | ✅ | | ✅ | | |
| Scenarios | | ✅ | | | ✅ | ✅ |
| Workflow | ✅ | ✅ | | ✅ | | ✅ |
| Audit Trail | | | ✅ | | ✅ | |
| Policy Report | | ✅ | ✅ | | ✅ | ✅ |

---

## Architecture

```
carbontrack/
├── api/
│   └── analyze.js          ← Vercel Serverless Function (Groq proxy)
├── src/
│   ├── App.jsx             ← Role-aware shell
│   ├── data/fleet.js       ← 50-vehicle synthetic fleet + IPCC factors
│   ├── utils/
│   │   ├── emissions.js    ← IPCC Tier 1 accounting engine
│   │   ├── dataIntake.js   ← CSV pipeline: extract→validate→normalize→mask
│   │   ├── auditTrail.js   ← Append-only event log
│   │   └── actionStore.js  ← Action workflow store
│   └── components/
│       ├── RoleGate.jsx    ← Role selection entry screen
│       ├── Overview.jsx    ← Dashboard
│       ├── FleetManager.jsx
│       ├── Calculator.jsx
│       ├── DataIntake.jsx  ← File upload + pipeline UI
│       ├── AIAnalyst.jsx   ← Groq-powered analyst
│       ├── ScenarioModeler.jsx
│       ├── ActionWorkflow.jsx ← Approve/reject/escalate queue
│       ├── AuditTrail.jsx  ← Evidence log
│       └── PolicyReport.jsx
├── vercel.json
├── vite.config.js
└── package.json
```

---

## Phased roadmap (as per spec)

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Data ingestion + emissions calculation | ✅ Implemented |
| 2 | Evidence-backed AI recommendations | ✅ Implemented |
| 3 | Workflow + reporting integration | ✅ Implemented (in-memory; production needs DB) |
| Production | PostgreSQL/Supabase persistence, NTSA API MCP integration | Roadmap |
