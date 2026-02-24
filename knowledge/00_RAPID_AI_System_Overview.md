# RAPID AI — System Overview (Canonical v2.1)

_Physics-Grounded Stability Intelligence Engine for Rotating Machinery_
_Last updated: 23 Feb 2026_

---

## What RAPID AI Is

RAPID AI is a **commercial API service** — a physics-grounded stability intelligence engine for rotating industrial machinery. Clients send pre-processed vibration and process data to RAPID AI's flagship REST API and receive back actionable health assessments, fault diagnoses, maintenance priorities, remaining useful life estimates, and AI-generated insights — at a cost per call.

The core value proposition:

```
Client sends data → RAPID AI analyses → Client gets back health + diagnosis + actions + insights
```

RAPID AI is NOT a data acquisition system. NOT a CMMS. NOT an edge platform. It is a **cloud-hosted analytical API** that clients integrate into their own monitoring infrastructure.

---

## Deployment Model

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT SIDE                                 │
│                                                                 │
│  Sensors ──▶ Data Acquisition ──▶ Cleanup & Feature Extraction  │
│  (vibration,    (SCADA, DCS,       (filtering, resampling,      │
│   temp, etc.)    historian)          feature computation)        │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    REST API call
                    (JSON payload)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     RAPID AI API                                │
│                                                                 │
│  ┌──────────┐  ┌───────────────┐  ┌────────┐  ┌─────────────┐ │
│  │ 1.GUARD  │─▶│   2.SENSE     │─▶│ 3.FUSE │─▶│   4.ACT     │ │
│  │ Validate │  │ Analyse       │  │ Combine │  │ Prioritise  │ │
│  │ Quality  │  │ Detect        │  │ Assess  │  │ Predict     │ │
│  │ Gate     │  │ Classify      │  │ Stage   │  │ Recommend   │ │
│  └──────────┘  └───────────────┘  └────────┘  └──────┬──────┘ │
│                                                       │        │
│                                               ┌───────▼──────┐ │
│                                               │  AI INSIGHTS │ │
│                                               │  (narrative  │ │
│                                               │   summary)   │ │
│                                               └──────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    JSON response
                    (scores + insights)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT SIDE                                 │
│                                                                 │
│  Dashboard / CMMS / Alerting / Mobile App / Reporting           │
└─────────────────────────────────────────────────────────────────┘
```

**Key boundaries:**

- **Client owns:** sensors, data acquisition, cleanup, feature extraction, storage, dashboards, alerting
- **RAPID AI owns:** analytical intelligence, health assessment, fault diagnosis, prognosis, AI insights
- **Interface:** Stateless REST API. JSON in, JSON out. Authenticated, metered, billed per call.

---

## What the Client Sends

The client is responsible for data acquisition, signal conditioning, and basic feature extraction before calling RAPID AI. A typical request includes:

- **Asset metadata:** asset_id, machine_type, component, criticality
- **Signal data:** pre-processed vibration values, sampling rate, signal type, direction
- **Historical context:** timestamps and historical trend values (for slope/RUL computation)
- **Thresholds:** failure_threshold for the asset (from OEM specs or client standards)

RAPID AI does NOT pull data from sensors, historians, or SCADA systems. The client pushes data to the API when they need an assessment.

---

## What the Client Gets Back

### Analytical Results
- **Health stage:** Healthy / Degrading / Unstable / Critical
- **Severity level:** normal / watch / warning / alarm (with score 0–1)
- **Confidence:** combined confidence score (0–1)
- **Fault diagnosis:** matched fault pattern and component
- **Maintenance priority:** score (0–100) with recommended window (Immediate / 24h / 7 days / Next shutdown)
- **Action plan:** ranked list of specific maintenance actions with justifications
- **RUL:** remaining useful life in days
- **Failure probability:** 30-day horizon probability
- **Risk index:** combined severity × criticality score (0–100)

### AI Insights (narrative layer)
Alongside the numerical results, the API returns human-readable AI insights that explain:
- What is happening to this machine in plain language
- Why the engine reached this conclusion
- What the maintenance team should focus on
- How urgent the situation is and what happens if action is delayed

This insight layer is what makes RAPID AI more than a scoring engine — it provides the interpretive narrative that a reliability engineer would give, automatically.

---

## Architectural Philosophy

RAPID AI is a **deterministic, physics-aware, modular decision engine**. Each module performs one clearly bounded responsibility. No module overlaps another. Signal processing, rule logic, entropy modeling, fusion, diagnosis, planning, and governance are deliberately separated to preserve clarity, scalability, and IP protection.

The philosophy follows this sequence:
```
Data Integrity → Trend Recognition → Initiator Detection → Instability Detection
→ Entropy/Stability Lens → Multi-Signal Fusion → Mechanism Mapping
→ Action Planning → Governance
```

### Module Design Philosophies

| Module | Philosophy |
|---|---|
| **0 — Data Guard** | Garbage in = garbage out. No analytics before validation. |
| **A — Trend Engine** | Trends reveal behavior before faults fully manifest. |
| **B — Initiator Rules** | Failures begin with physical causes (clearance, load, misalignment). |
| **B+ — Slope Engine** | Instability is dynamic; speed of change matters. |
| **B++ — SEDL** | Systems move from order to disorder before catastrophic failure. |
| **C — Fusion** | Single-signal logic is weak; evidence must be fused. |
| **D — Fault Mapping** | Diagnosis requires physics interpretation. |
| **E — Maintenance** | Intelligence is useless without action. |
| **F — Governance** | Systems improve through feedback and controlled adaptation. |

---

## Four Semantic Stages

The engine has **4 stages** (internally implemented as 9 compute modules):

| Stage | Purpose | Internal Modules | Nature |
|-------|---------|-----------------|--------|
| **1. GUARD** | Validate client input, gate bad data | Module 0 (Data Guard) | Sequential gate |
| **2. SENSE** | Extract features, detect patterns, measure entropy | Module A + B + B+ + B++ | A sequential, then B/B+/B++ parallel |
| **3. FUSE** | Combine signals into unified health picture | Module C (Fusion) + D (Health Stage) | Sequential |
| **4. ACT** | Decide what to do and when | Module E (Maintenance) + F (RUL) | Sequential |

---

## Execution Pipeline

```
POST /rapid-ai/evaluate

Step 1: GUARD
  └─ Module 0 (Data Guard) → quality_score, pass/block

Step 2: SENSE (if not blocked)
  └─ Module A (Features) → RMS, peak, kurtosis, severity
  └─ ┌── Module B  (Initiators)  ─┐
     ├── Module B+ (Trends)       ├── parallel
     └── Module B++(Entropy/SEDL) ─┘

Step 3: FUSE
  └─ Module C (Fusion)       → SSI, system_state
  └─ Module D (Health Stage)  → health_stage, escalation_level

Step 4: ACT
  └─ Module E (Maintenance)  → priority_score, action_plan
  └─ Module F (RUL)          → RUL_days, failure_probability, risk_index

Step 5: AI INSIGHTS
  └─ Generate narrative summary from all module outputs
```

---

## Canonical Enumerations

RAPID AI uses these state labels consistently across all stages:

### Severity Levels (4 tiers, used everywhere)
| Level | Score Range | Meaning |
|-------|-------------|---------|
| normal | < 0.30 | No concern |
| watch | 0.30–0.50 | Monitor closely |
| warning | 0.50–0.80 | Plan intervention |
| alarm | ≥ 0.80 | Act immediately |

### Health Stages (from Stage 3 — FUSE)
| Stage | SSI Range | RUL Band | Escalation |
|-------|-----------|----------|------------|
| Healthy | < 0.30 | > 6 months | Level 0: Monitor |
| Degrading | 0.30–0.60 | 1–6 months | Level 1: Inspect |
| Unstable | 0.60–0.80 | 1–4 weeks | Level 2: Intervene |
| Critical | ≥ 0.80 | < 7 days | Level 3: Immediate |

### Trend Classes (from Module B+)
Stable, Drift, Accelerating, Chaotic, Step

### Stability States (from Module B++ / SEDL)
Stable, Drifting, Destabilizing, Chaotic, Critical_Instability

---

## Key Cross-Cutting Formulas

### Effective Severity (quality-adjusted)
```
S_eff = S_fusion × Q_data
```

### Confidence Propagation
```
C_final = Q_data × (1 − ∏(1 − C_i))
```
Where C_i are confidence values from B, B+, B++.

### State Transitions (hysteresis + persistence)
| Transition | Threshold | Persistence | Hysteresis |
|---|---|---|---|
| → Degrading | S_eff > 0.55 | 3 windows | ±0.08 |
| → Unstable | S_eff > 0.70 | 3 windows | ±0.08 |
| → Critical | S_eff > 0.85 | 2 windows | ±0.08 |
| ← (return down) | S_eff < threshold − 0.08 | 5 windows | ±0.08 |

---

## Reliability Engineering Foundation

RAPID AI's analytical engine is grounded in modern reliability engineering principles, championed by Dibyendu De's Theory of Imperfections: failure is the inability of imposed energy to flow freely through system elements. Every RAPID AI module maps to this framework:

### How Modules Feed Reliability

| Module | Reliability Role | Formula |
|---|---|---|
| **SENSE (A, B+)** | S_eff adjusts Weibull shape β — higher severity = steeper wear-out | `β_adj = β_base × (1 + α_severity × S_eff)` |
| **FUSE (C, D)** | SSI adjusts Weibull scale η — higher degradation = shorter characteristic life | `η_adj = η_base × (1 − γ_degradation × SSI)` |
| **ACT (F)** | Computes condition-adjusted Weibull RUL, hazard rate, failure probability | `RUL = η_adj × (−ln(R_target))^(1/β_adj) − t_current` |
| **SENSE (B++)** | Entropy (SI) validates bathtub phase — detects transition from random to wear-out | SI drop → β shifting above 1.0 |

### Key Reliability Concepts

- **Weibull Distribution:** Replaces constant-hazard exponential model. Shape β captures failure physics (β<1 infant, β≈1 random, β>1 wear-out). Scale η = characteristic life.
- **P-F Interval:** Time between detectable fault (Point P — when SENSE triggers) and functional failure (Point F). CBM must act within this window.
- **Bathtub Curve:** Three life phases (infant mortality → useful life → wear-out) inferred from β and mapped to health stage.
- **Nowlan & Heap Patterns:** Six failure patterns; 82% are random/infant mortality (D, E, F) — time-based replacement fails, only CBM catches them.
- **FRETTLSM:** Dibyendu De's diagnostic lens (Force/Flow/Foundation, Reactive/EM, Environment, Time, Temperature, Lubrication, Surface, Material/Man) — mapped to Module B's 116 initiator rules.

Full formulas: see `04_ACT_MaintenanceAndPrognosis.md` § Reliability Engineering Framework and `05_Formula_Index.md` § Reliability Engineering.

---

## IP Protection Boundary

### Protected (internal — never exposed to client)
- Entropy formulas and weights (SEDL)
- Rule scoring logic and thresholds
- BSR block score rules
- RUL mathematical models
- Confidence adjustment math
- Weight coefficients

### Exposed (returned to client)
- Final state labels (health_stage, severity_level)
- Risk index (0–100)
- Maintenance window and action plan (titles + justifications)
- RUL_days
- Failure probability (30-day)
- AI Insights (narrative summary)
- Confidence score

---

## API Contract (Frozen v1.0)

| Endpoint | Method | Stage | Use |
|---|---|---|---|
| `/health` | GET | — | Health check |
| `/rapid-ai/evaluate` | POST | Full pipeline | **Flagship endpoint** — runs all stages, returns complete assessment + insights |
| `/rapid-ai/module0` | POST | 1. GUARD | Standalone data validation |
| `/rapid-ai/moduleA` | POST | 2. SENSE | Standalone feature extraction |
| `/rapid-ai/moduleB` | POST | 2. SENSE | Standalone fault pattern matching |
| `/rapid-ai/moduleBplus` | POST | 2. SENSE | Standalone trend analysis |
| `/rapid-ai/moduleBpp` | POST | 2. SENSE | Standalone entropy analysis |
| `/rapid-ai/moduleC` | POST | 3. FUSE | Standalone fusion |
| `/rapid-ai/moduleD` | POST | 3. FUSE | Standalone health staging |
| `/rapid-ai/moduleE` | POST | 4. ACT | Standalone maintenance planning |
| `/rapid-ai/moduleF` | POST | 4. ACT | Standalone RUL estimation |

The flagship endpoint is `/rapid-ai/evaluate`. Individual module endpoints exist for clients who want granular control or already have partial results.

---

## Commercial Model

- **Authentication:** API key per client
- **Metering:** per-call billing on `/rapid-ai/evaluate`
- **Tiers:** volume-based pricing (to be defined)
- **SLA:** latency, uptime, and support tiers (to be defined)

---

## Version Roadmap

- **v1.0 (current):** Vibration-only entropy (SEDL Option A), REST API, AI insights
- **v2.0 (future):** Multi-sensor entropy (vibration + temperature)
- **v3.0 (future):** Full thermodynamic stability model

---

## Knowledge Base Index

| Document | Contents |
|---|---|
| `00_RAPID_AI_System_Overview.md` | This file — system overview, deployment model, pipeline, enumerations |
| `01_GUARD_DataQuality.md` | Module 0 — data validation rules, quality scoring, DSP parameters |
| `02_SENSE_SignalIntelligence.md` | Modules A, B, B+, B++ — features, rules, slope, entropy |
| `03_FUSE_HealthAssessment.md` | Modules C, D — fusion, SSI, health staging, escalation |
| `04_ACT_MaintenanceAndPrognosis.md` | Modules E, F — priority scoring, RUL, Weibull, reliability engineering |
| `05_Formula_Index.md` | Every formula in the engine, grouped by stage |
| `06_AI_Taxonomy_and_Roadmap.md` | AI positioning, 7 paradigms, self-assessment, evolution roadmap |
| `07_Deployment_and_Rollout_Strategy.md` | Infrastructure, staged rollout, IP protection, hierarchical authority |
| `08_Canonical_Data_Contracts.md` | JSON schemas, example payloads, DSP parameters |
| `09_Dibyendu_De_Theoretical_Foundation.md` | Theory of Imperfections, RAPID, FRETTLSM, entropy, Weibull |
| `RAPID_AI_OpenAPI_v2_MODULAR.yaml` | Target modular OpenAPI specification (1114 lines, typed schemas, enums) |
| `RAPID_AI_OpenAPI_v3_PRODUCTION_ALIGNED.yaml` | Current production OpenAPI specification |
