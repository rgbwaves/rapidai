# RAPID AI — Deployment Architecture & Rollout Strategy

_Infrastructure, staged rollout, IP protection, and hierarchical decision authority_

---

## Deployment Architecture

### Service Model
- **Stateless microservices** — no session state between requests
- **Containerized** — Docker images, orchestrated by Kubernetes
- **Horizontal scaling** — spin up module instances independently based on load
- **Edge preprocessing optional** — clients may run GUARD (Module 0) at edge for latency reduction
- **Ingestion:** REST (primary) or event-driven (Kafka/MQTT for high-frequency monitoring)

### Infrastructure Stack
```
┌─────────────────────────────────────────┐
│              Load Balancer               │
│           (API Gateway / Kong)           │
├─────────────────────────────────────────┤
│                                         │
│   ┌─────────┐  ┌─────────┐  ┌───────┐ │
│   │ GUARD   │  │ SENSE   │  │ FUSE  │ │
│   │ (Mod 0) │→ │ (A,B,   │→ │ (C,D) │ │
│   │         │  │  B+,B++)│  │       │ │
│   └─────────┘  └─────────┘  └───┬───┘ │
│                                  │     │
│                          ┌───────▼───┐ │
│                          │   ACT     │ │
│                          │  (E, F)   │ │
│                          └───────────┘ │
│                                         │
│           Kubernetes Cluster            │
├─────────────────────────────────────────┤
│   PostgreSQL  │  Redis Cache  │  Logs  │
└─────────────────────────────────────────┘
```

### Performance Targets
| Metric | Target |
|---|---|
| Full pipeline latency | < 500ms (p95) |
| Module 0 (GUARD) | < 50ms |
| Module A (Features) | < 100ms |
| Modules B/B+/B++ (parallel) | < 200ms |
| Modules C+D (FUSE) | < 50ms |
| Modules E+F (ACT) | < 50ms |
| Throughput | 100+ req/s per instance |

---

## Staged Rollout Plan

### Philosophy

The base algorithm (Dibyendu De's 2005 HVA diagnostic engine) has been validated over 15 years with 98% accuracy across 4,000+ industrial cases. This is **institutionalized field intelligence** — not "just rules." It is the core IP, stress-tested over 4,000+ real cases.

**Strategy:** Deploy proven base first, then **wrap** it with additional intelligence layers. You do NOT replace the Base API — you wrap it.

### Why Base API First Is Smart
1. It is proven (98% reliability)
2. It is stable
3. It already works in real industrial environments
4. It gives quick visible value
5. It protects credibility
6. It buys time to mature the full stack

### Why NOT Deploy Full Stack Immediately
If you deploy Modules 0–F together on Day 1:
- Debug complexity explodes
- Clients will try to inspect everything
- More API surface area is exposed
- Forced into premature optimization
- Risk of IP leakage increases

**Never expose your full architecture on Day 1.**

### Stage 1 — Base API (Weeks 1–2)

**Deploy:** `BASE_API_V1`

**Inputs:**
- H, V, A overall velocity
- Temperature
- RPM

**Outputs:**
- Fault class
- Confidence score
- Severity

**Characteristics:**
- Simple, fast, proven
- 98% reliability from field validation
- Externally: clean API surface
- Internally: core diagnostic intelligence

### Stage 2 — Modular Extensions in Shadow Mode (Weeks 3–6)

**Deploy:** Module A, B, B+, B++ as separate endpoints

**Sub-timeline:**
- Weeks 3–4: Module A (features) + Module B+ (slope) in shadow
- Weeks 5–6: Module B++ (entropy) + logging infrastructure

**Shadow mode means:**
- Modules compute and log results
- Results do NOT drive production decisions
- Used for validation and calibration against base API
- Allows comparison: base prediction vs module prediction
- Building confidence in new modules before production authority

### Stage 3 — Integrated Master API (Weeks 6–8)

**Deploy:** `INTEGRATED_MASTER_API`

**Orchestration:**
1. Run Base API
2. Run B / B+ / B++ in parallel
3. Run Fusion (Module C)
4. Apply hierarchical decision authority:

```
If Base_API_confidence > 0.85
  → Trust Base API
Else
  → Trust Fusion score (Module C SSI)
Else
  → Fallback to entropy state (Module B++ SI)
```

This creates **hierarchical decision authority** — the proven base dominates, while new modules adjust confidence and add context.

### Stage 4 — Full Stack (Weeks 8–10)

**Deploy:** Maintenance Plan (E) + RUL (F) + Governance

**Final architecture levels:**

| Level | Module | Role |
|---|---|---|
| 1 | Base Diagnostic Engine | Core IP (2005 HVA) — **dominates** |
| 2 | Trend Acceleration Layer | Module A + B+ — adjusts confidence |
| 3 | Entropy Stability Layer | Module B++ — detects disorder |
| 4 | System Fusion Layer | Module C — combines evidence |
| 5 | Mechanism & Action | Module D + E — diagnosis + plan |
| 6 | Governance | Module F — audit + RUL |
| 7 | CDE (future) | Module G — client data exchange |

**Production decision:** Level 1 dominates. Higher levels adjust confidence and add context. They do **not** override the base engine unless its confidence is low.

---

## IP Protection Strategy

### Core Principles

1. **Base API must remain black-box** — no exposure of decision tree or thresholds
2. **Only inputs and outputs visible** — never internals
3. **Core ratio intelligence remains opaque** — the 116 rules and their thresholds
4. **Future modules can be partially visible** — entropy concepts are publishable, but specific weights and cutoffs are not

### Protected Assets (never exposed to client)

| Asset | Location |
|---|---|
| Entropy formulas and weights (SEDL) | Module B++ code |
| Rule scoring logic and thresholds | Module B code |
| BSR block score rules | Module C code |
| RUL mathematical models | Module F code |
| Confidence adjustment math | Pipeline orchestrator |
| Weight coefficients | Machine profiles |
| Priority formula coefficients | Module E code |

### Exposed to Client (API response only)

| Output | Format |
|---|---|
| Health stage label | String (Healthy/Degrading/Unstable/Critical) |
| Severity level | String (normal/watch/warning/alarm) |
| Risk index | Number (0–100) |
| Maintenance window | String (Immediate/24h/7 days/Next shutdown) |
| Action plan | Array of action titles + justifications |
| RUL (days) | Number |
| Failure probability (30-day) | Number (0–1) |
| Confidence score | Number (0–1) |
| AI Insights | Narrative text (human-readable summary) |

### Technical Protection

- Base API should be **compiled and containerized** — not readable source
- **Access-controlled** — API key per client, rate-limited
- Treat core engine like **firmware** — no shared repo access
- Do NOT allow anyone to merge Base API logic into shared repo
- API returns humanized narratives (AI Insights) that explain conclusions without exposing formulas
- Excel sheets contain thresholds only — core math lives in service code

### Why IP Protection Matters
When a company tries to reverse-engineer your code, it means your code is valuable. The base algorithm is **physics-derived machine reasoning** — deterministic intelligence that is stronger than neural networks in industrial environments because it is explainable, validated, and physically grounded.

### What "AI" Really Is Here
The base algorithm is pattern-intelligence — physics-derived machine reasoning. It may not be neural network AI, but it is **deterministic intelligence**. That is stronger in industrial environments because it is explainable, repeatable, and auditable.

---

## Why Hierarchy Matters

The **Base Algorithm** (Dibyendu De's 2005 work):
- Is empirically validated over 15+ years
- Is directionally intelligent (uses H/V/A ratios)
- Is physically grounded (maps to known fault mechanisms)

The **new modules** (A through F):
- Add trend detection
- Add entropy/stability modeling
- Add system-level fusion
- Add explainability and audit trail

The new modules **augment** the base engine. They do **not replace** it. The hierarchical architecture ensures that the proven core always has the final say unless its confidence is genuinely low.

---

## Version Strategy

| Version | Scope | Status |
|---|---|---|
| v1.0 | Vibration-only entropy (SEDL Option A), REST API, AI insights | Current |
| v2.0 | Multi-sensor entropy (vibration + temperature) | Planned |
| v3.0 | Full thermodynamic stability model | Future |
