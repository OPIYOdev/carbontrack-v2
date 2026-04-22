# CarbonTrack v2: Comprehensive System Audit & Enhancement Roadmap

## 1. Executive Summary
The CarbonTrack v2 system is a robust, role-based institutional transport emission intelligence platform. It successfully implements complex data ingestion, PII masking, and AI-driven recommendations. However, the current architecture is "demo-heavy," with several core components (Overview, Scenarios, Policy Report) still bound to synthetic data rather than the live uploaded fleet. Moving to production requires hardening the audit trail, decoupling static constants, and implementing a persistent data layer.

---

## 2. Core Audit Findings

### 2.1. Data Ingestion & Integration (Critical)
- **Finding:** While the `DataIntake` pipeline is highly robust, the rest of the application (Overview, Scenario Modeler, Policy Report) still imports and displays the static `FLEET` demo data.
- **Impact:** Users who upload their own data cannot see their institutional dashboard or generate a valid policy report.
- **Enhancement:** Implement a global state provider (Context API or Redux) to ensure all components consume the `uploadedFleet` when available.

### 2.2. AI Recommendation Logic (High)
- **Finding:** The `AIAnalyst` sends a summary of the static fleet to Groq, even if a user has uploaded a custom fleet.
- **Impact:** AI recommendations are based on demo data, making them irrelevant for real institutional use.
- **Enhancement:** Refactor `AIAnalyst.jsx` to compute aggregates from the `activeFleet` (uploaded or demo) before sending the payload to the API.

### 2.3. Economic Modeling Realism (Medium)
- **Finding:** Financial constants (fuel prices, EV costs) are hardcoded in `carbonEconomics.js`.
- **Impact:** The system becomes outdated as EPRA adjusts monthly fuel prices or as EV market prices shift.
- **Enhancement:** Move market rates to a configurable settings module or fetch them from an external API (e.g., an EPRA pricing scraper or NTSA API).

### 2.4. Audit Trail & Security (High)
- **Finding:** The system claims "immutable evidence," but the `auditTrail.js` is an in-memory array with a `clearEvents()` function.
- **Impact:** No durable record of decisions exists for regulatory auditors.
- **Enhancement:** Implement a Supabase/PostgreSQL backend for the audit trail and introduce cryptographic hash chaining for event integrity.

---

## 3. Prioritized Enhancement Roadmap

### Phase 1: Integration & Realism (Weeks 1-2)
| Task | Description | Priority |
| :--- | :--- | :--- |
| **Global State Sync** | Connect `Overview`, `Scenarios`, and `PolicyReport` to the `uploadedFleet` state. | Critical |
| **Dynamic AI Payload** | Update `AIAnalyst` to analyze the live uploaded data instead of the demo fleet. | High |
| **Dynamic Market Rates** | Allow administrators to update fuel and carbon prices via a settings UI. | Medium |

### Phase 2: Production Hardening (Weeks 3-4)
| Task | Description | Priority |
| :--- | :--- | :--- |
| **Persistence Layer** | Implement Supabase/PostgreSQL for fleet data, actions, and audit logs. | High |
| **Auth & Role Security** | Replace the client-side `RoleGate` with a proper Auth solution (e.g., Clerk or Supabase Auth). | High |
| **Immutable Audit Log** | Add server-side timestamping and hash-linking to the audit trail. | High |

### Phase 3: Technical Depth (Weeks 5+)
| Task | Description | Priority |
| :--- | :--- | :--- |
| **IPCC Tier 2 Engine** | Move from Tier 1 (fuel-based) to Tier 2 (technology/age-based) emission factors. | Medium |
| **NTSA API Integration** | Auto-fetch vehicle specs (type, age, fuel) using the registration plate. | Low |
| **Predictive Scenarios** | Use Monte Carlo simulations for more realistic ROI and payback projections. | Low |

---

## 4. Conclusion
CarbonTrack v2 is a powerful prototype with a high-quality UI and a clear value proposition. By addressing the "demo-data decoupling" and implementing a persistent backend, the system can transition from a sales demo to a mission-critical tool for Kenya's transport decarbonization.
