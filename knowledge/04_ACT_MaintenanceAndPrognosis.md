# Stage 4: ACT — Maintenance & Prognosis

_Module E (Priority Scoring & Action Plan) + Module F (RUL & Failure Probability)_

---

## Purpose

ACT converts the unified health picture from FUSE into concrete decisions: what maintenance to do, how urgent it is, how long before failure, and what risk the asset carries. Module E scores and selects actions; Module F estimates remaining useful life and failure probability. After ACT completes, the pipeline generates **AI Insights** — a human-readable narrative summary that explains the assessment in plain language for maintenance engineers and reliability teams.

---

## Module E — Maintenance Priority Engine

### Priority Score Formula
```
P = 100 × (0.45·S + 0.25·C + 0.20·K + 0.10·U) × M_safe × R_sp × R_mp
```
Clamped to [0, 100].

### Parameters

| Symbol | Name | Default | Range | Source |
|---|---|---|---|---|
| S | Severity score | 0.5 | 0–1 | S_eff from pipeline |
| C | Confidence | 0.7 | 0–1 | C_final from pipeline |
| K | Asset criticality | 0.6 | 0–1 | From criticality table / risk model |
| U | Time urgency | 0.5 | 0–1 | Derived from slope-change / alarms |
| M_safe | Safety multiplier | 1.0 | 1.0–1.5 | 1.5 if safety_flag = true |
| R_sp | Spares readiness | 1.0 | 0.7–1.0 | 0.7 if spares not available |
| R_mp | Manpower readiness | 1.0 | 0.7–1.0 | 0.7 if manpower constrained |

### Priority → Recommended Window

| Priority Range | Window | Meaning |
|---|---|---|
| P ≥ 85 | Immediate | Stop/inspect now or within shift |
| 70 ≤ P < 85 | 24 hours | Execute within 24h |
| 50 ≤ P < 70 | 7 days | Plan within week |
| P < 50 | Next shutdown | Bundle into planned outage |

### Action Catalog

| Action ID | Title | Justification | Verification |
|---|---|---|---|
| ACT001 | Vibration re-measure (confirmation run) | Confirm trend before committing to intervention | Compare new RMS to previous within ±10% |
| ACT002 | Bearing lubrication / grease replenishment | HF or temperature rise indicates lubrication deficit | HF amplitude and temperature return to baseline within 24h |
| ACT003 | Alignment check (laser / dial indicator) | Axial dominance and coupling signature indicate misalignment | Alignment report within tolerance per OEM spec |
| ACT004 | Balance correction (single / dual plane) | 1× dominance with horizontal preference indicates imbalance | 1× amplitude reduced by ≥50% post-correction |
| ACT005 | Bearing replacement (scheduled) | BPFO/BPFI signatures with acceleration confirms defect | Post-replacement vibration within acceptance limits |
| ACT006 | Foundation tightening / soft foot correction | V/H ratio and looseness indicate structural issues | Phase stability and reduced looseness harmonics |
| ACT007 | Process investigation (not machine fault) | Trend correlates with process variable, not degradation | Vibration returns to normal with process stabilisation |
| ACT008 | Emergency shutdown / trip recommendation | Critical SSI with accelerating trend, imminent failure risk | Machine isolated, inspection completed before restart |

### Diagnosis → Action Mapping

Keyword-based matching from Module B diagnosis text:

| Keyword in Diagnosis | Action IDs |
|---|---|
| imbalance / unbalance | ACT004, ACT001 |
| misalignment | ACT003, ACT001 |
| bearing | ACT002, ACT005 |
| lubrication | ACT002 |
| looseness | ACT006, ACT001 |
| foundation | ACT006 |
| process | ACT007 |
| critical / shutdown | ACT008 |

**Selection logic:**
1. If P ≥ 85 → always include ACT008 (emergency shutdown)
2. Match diagnosis keywords → append corresponding actions
3. If no keywords match → default to ACT001 (confirmation run)
4. Deduplicate while preserving priority order

### API Contract: `POST /rapid-ai/moduleE`

**Request:**
```json
{
  "asset_id": "P-101A",
  "severity_score": 0.84,
  "confidence": 0.72,
  "criticality": 0.6,
  "urgency": 0.6,
  "safety_flag": false,
  "diagnosis": "Impeller imbalance or buildup",
  "component": "pump",
  "spares_ready": true,
  "manpower_ready": true
}
```

**Response:**
```json
{
  "plan_items": [
    {
      "rank": 1,
      "priority_score": 77.0,
      "window": "24 hours",
      "action_id": "ACT004",
      "action_title": "Balance correction (single / dual plane)",
      "justification": "1× dominance with horizontal preference indicates imbalance",
      "verification": "1× amplitude reduced by ≥50% post-correction"
    }
  ],
  "total_actions": 2,
  "execution_time_ms": 0.12
}
```

---

## Module F — RUL & Failure Probability

### Three RUL Models

Model selection is automatic based on slope behaviour:

**1. Linear Model** (default)
```
RUL_days = ln(threshold / current) / slope_log
```
Used when slope_change < 0.01 and NLI < 0.6.

**2. Accelerating Model** (slope_change ≥ 0.01)
```
effective_slope = slope_log + slope_change
RUL_days = ln(threshold / current) / effective_slope
```
Accounts for increasing rate of degradation.

**3. Instability Adjustment** (NLI ≥ 0.6)
Applied after either Linear or Accelerating model:
```
RUL_adj = RUL_base × (1 − NLI)
```
Penalises RUL when system shows chaotic/unstable behaviour.

### Selection Logic
```
if current ≥ threshold → RUL = 0 (already failed)
if slope_log ≈ 0      → RUL = 3650 (cap at 10 years)
if slope_change ≥ 0.01 → Accelerating model
else                    → Linear model
if NLI ≥ 0.6           → Apply instability adjustment
```
RUL clamped to [0, 3650] days.

### Failure Probability (30-day horizon)
```
P_30 = 1 − exp(−30 / RUL_days)
P_adj = P_30 × confidence
```
Clamped to [0, 1]. If RUL ≈ 0, P_30 = 1.0.

### Risk Index
```
Risk_Index = 100 × severity × criticality
```
Clamped to [0, 100]. Pure severity × criticality product, no modifiers.

### RUL → Recommended Window

| RUL Range | Window |
|---|---|
| < 7 days | Immediate |
| 7–30 days | Urgent (< 30 days) |
| 30–180 days | Planned |
| > 180 days | Monitor |

### API Contract: `POST /rapid-ai/moduleF`

**Request:**
```json
{
  "asset_id": "P-101A",
  "severity_score": 0.65,
  "confidence": 0.78,
  "slope_log": 0.012,
  "slope_change": 0.003,
  "instability_index_NLI": 0.35,
  "criticality": 0.7,
  "current_value": 4.2,
  "failure_threshold": 11.0
}
```

**Response:**
```json
{
  "RUL_days": 80.12,
  "failure_probability_30d": 0.2513,
  "confidence": 0.78,
  "risk_index": 45.5,
  "recommended_window": "Planned",
  "execution_time_ms": 0.08
}
```

---

## Reliability Engineering Framework

_Grounded in Dibyendu De's Theory of Imperfections and RAPID methodology_

### Philosophical Foundation: Theory of Imperfections

RAPID AI's reliability layer is rooted in the principle that **failure is the inability of imposed energy to flow freely through a system's elements**. When energy cannot flow unimpeded, the elements are strained — that strain is the imperfection. As the imperfection grows, it manifests as measurable signatures (vibration, temperature, acoustic emission) long before functional failure.

This is not just physics — it is the diagnostic lens through which RAPID AI interprets every signal:

- **Displacement rising** → strain energy accumulating → elements being deformed by imposed energy flow
- **Velocity rising** → internal flow resistance increasing → energy loss through friction/wear
- **Acceleration rising** → elements unable to accommodate rate of change → impact/impulse forces

The role of maintenance is not merely to replace failing parts, but to **eliminate the root cause of imperfection** — to restore free energy flow. RAPID AI's action catalog (ACT001–ACT008) reflects this: alignment restores axial energy flow, balancing restores rotational symmetry, lubrication reduces flow resistance.

### Weibull Distribution (replacing exponential model)

The current Module F uses an exponential failure model (constant hazard rate). Real rotating machinery follows a **Weibull distribution** with shape parameter β that captures the physics of wear-out:

```
Weibull PDF:     f(t) = (β/η) × (t/η)^(β−1) × exp(−(t/η)^β)
Weibull CDF:     F(t) = 1 − exp(−(t/η)^β)
Reliability:     R(t) = exp(−(t/η)^β)
Hazard rate:     h(t) = (β/η) × (t/η)^(β−1)
```

Where:
- **β (shape)** — failure mode physics:
  - β < 1: infant mortality (installation defects, burn-in failures)
  - β = 1: random failures (exponential — what we currently assume)
  - β > 1: wear-out (the dominant mode for rotating machinery)
- **η (scale / characteristic life)** — time at which 63.2% of population has failed
- **t** — operating time or equivalent cycles

### Component-Specific Weibull Parameters

| Component | Failure Mode | Typical β | Typical η (hours) | Source |
|---|---|---|---|---|
| Ball bearing (inner race) | Spalling | 1.5–2.5 | 20,000–80,000 | L10 life standards |
| Ball bearing (outer race) | Fatigue pitting | 1.3–2.0 | 30,000–100,000 | OEM catalogues |
| Mechanical seal | Wear/leakage | 1.2–1.8 | 15,000–40,000 | Field data |
| Gear teeth | Pitting/scuffing | 2.0–3.5 | 30,000–60,000 | AGMA standards |
| Coupling (flexible) | Fatigue/misalignment | 1.5–2.5 | 25,000–50,000 | Field data |
| Impeller | Erosion/cavitation | 1.8–3.0 | 20,000–60,000 | Hydraulic institute |
| Motor winding | Insulation breakdown | 3.0–5.0 | 40,000–100,000 | IEEE 493 |

These β values are **defaults** — RAPID AI adjusts them based on real-time condition data from the SENSE stage (this is the fusion of reliability statistics with condition monitoring).

### Condition-Adjusted Weibull (Hybrid Model)

The key innovation: combine Weibull prior (population statistics) with real-time condition evidence (SENSE output) to produce a **posterior RUL estimate**:

```
RUL_weibull = η × (−ln(R_target))^(1/β) − t_current

where R_target = desired reliability (e.g., 0.90 for 90% confidence)
```

**Condition adjustment** (using SENSE outputs):
```
β_adj = β_base × (1 + α_severity × S_eff)
η_adj = η_base × (1 − γ_degradation × SSI)
```

Where:
- `α_severity` scales β upward when severity is high (steeper wear-out curve)
- `γ_degradation` scales η downward when SSI indicates advanced degradation
- S_eff and SSI come directly from the GUARD→SENSE→FUSE pipeline

**Frozen v1.0 coefficients:**
| Coefficient | Value | Purpose |
|---|---|---|
| α_severity | 0.8 | Severity → β adjustment strength. Higher S_eff → steeper wear-out. |
| γ_degradation | 0.6 | SSI → η adjustment strength. Higher SSI → shorter characteristic life. |
| R_target | 0.90 | Reliability target for Weibull RUL (90% confidence level). |

These are calibrated defaults. Future versions may make them component-specific or adaptive.

This means: a bearing with β=2.0 and η=50,000h in the catalogue might have β_adj=2.8 and η_adj=32,000h when RAPID AI detects elevated BPFO signatures and rising entropy.

### Failure Probability (Weibull-based, replacing exponential)

```
P_30 = F(t_current + 30) − F(t_current)
     = exp(−(t_current/η_adj)^β_adj) − exp(−((t_current+30)/η_adj)^β_adj)

P_adj = P_30 / R(t_current)     (conditional probability)
```

This gives a **much more accurate** 30-day failure probability than the current `1 − exp(−30/RUL)` because it accounts for the wear-out shape.

### P-F Interval (Potential Failure to Functional Failure)

The P-F interval is the time between when a fault becomes **detectable** (Point P) and when **functional failure** occurs (Point F). This is the window within which condition-based maintenance must act.

```
Point P: first detectable imperfection (SENSE triggers watch/warning)
Point F: functional failure (threshold exceeded, machine trips)
P-F interval: the time between P and F
```

| Failure Mode | Detection Method | Typical P-F Interval |
|---|---|---|
| Bearing inner race defect | BPFO/BPFI in spectrum | 1–9 months |
| Imbalance (mass loss/buildup) | 1× rise in vibration | 3–12 months |
| Misalignment | 2× axial rise + coupling pattern | 3–9 months |
| Gear tooth pitting | Gear mesh sidebands | 1–6 months |
| Cavitation erosion | HF acoustic emission bursts | 6–12 months |
| Looseness (structural) | Sub-harmonic + harmonics | 1–6 months |
| Motor winding degradation | Current signature + temperature | 1–3 months |

**RAPID AI's role in P-F:** The SENSE stage detects Point P. Module F estimates where we are on the P-F curve. Module E recommends action within the remaining P-F window. The AI Insight explains how much of the P-F interval has been consumed.

### Hazard Rate Function

The hazard rate h(t) tells us the instantaneous failure risk at time t, given survival to t:
```
h(t) = f(t) / R(t) = (β/η) × (t/η)^(β−1)
```

RAPID AI reports hazard rate as an additional output to help reliability engineers understand whether risk is:
- **Decreasing** (β < 1): infant mortality — investigate installation quality
- **Constant** (β ≈ 1): random — monitor but no trend to predict
- **Increasing** (β > 1): wear-out — the condition monitoring sweet spot

### Bathtub Curve Mapping

Every asset sits somewhere on the bathtub curve. RAPID AI infers the life phase from the combination of operating age + condition data:

```
Phase 1 — Infant Mortality (β < 1):
  → If age < commissioning_period AND defects detected
  → Likely installation/manufacturing defect
  → Action: root cause investigation, not routine maintenance

Phase 2 — Useful Life (β ≈ 1):
  → Random failures, condition monitoring is the primary strategy
  → CBM is most effective here

Phase 3 — Wear-Out (β > 1):
  → Increasing hazard rate, trend extrapolation is reliable
  → RUL estimation is most accurate in this phase
  → This is where Weibull + condition data fusion excels
```

### Survival Analysis Outputs

For fleet-level insights (when client has multiple assets of the same type):

```
Kaplan-Meier survival estimate:
  S(t) = ∏(1 − d_i/n_i)    for all failure times t_i ≤ t

where d_i = number of failures at time t_i
      n_i = number at risk just before t_i
```

This enables:
- **Fleet reliability curves** — what % of my pumps survive past 2 years?
- **Comparative analysis** — are Plant A's bearings failing faster than Plant B's?
- **Spare parts planning** — how many bearings will I need in the next quarter?

### MTBF / MTTR Integration

```
MTBF = total_operating_time / number_of_failures
MTTR = total_repair_time / number_of_repairs
Availability = MTBF / (MTBF + MTTR)
```

RAPID AI can track these over time as clients submit repeated assessments for the same asset, building an operational history that improves the Weibull parameter estimates.

### Nowlan & Heap Failure Patterns

Following Dibyendu De's approach, RAPID AI classifies each detected failure mode against the six Nowlan & Heap patterns:

| Pattern | Shape | % of Failures | RAPID AI Detection |
|---|---|---|---|
| A — Bathtub | Infant + wear-out | ~4% | Age + condition combined |
| B — Increasing wear-out | β >> 1 | ~2% | Steady trend rise |
| C — Gradual increase | β slightly > 1 | ~5% | Slow drift in SENSE |
| D — Initial spike then constant | β < 1 then β = 1 | ~7% | Post-commissioning pattern |
| E — Random | β = 1 | ~14% | No trend, random excursions |
| F — Infant mortality then random | β < 1 dominant | ~68% | Early defects detected |

~82% of failures are random or infant mortality (patterns D, E, F) — **time-based replacement doesn't work for these**. Only condition monitoring catches them. This is why RAPID AI's SENSE stage exists.

### FRETTLSM Diagnostic Lens

Dibyendu De's multi-layer diagnostic framework for root cause analysis:

```
F — Force / Flow / Foundation
R — Reactive / Electromagnetic
E — Environment
T — Time (operating age, duty cycles)
T — Temperature
L — Lubrication
S — Surface condition
M — Material / Man (human factors)
```

Each FRETTLSM factor maps to observable proxies that RAPID AI's SENSE stage can detect:

| Factor | Observable Proxy | RAPID AI Module |
|---|---|---|
| Force/Flow | 1× vibration, pressure pulsation | Module A + B |
| Foundation | Sub-harmonics, looseness patterns | Module B (rule matching) |
| Reactive/EM | Current unbalance, motor spectrum | Module B (electrical rules) |
| Temperature | Trend correlation with thermal data | Module A (process classification) |
| Lubrication | HF amplitude, bearing tone shift | Module B (bearing rules) |
| Surface | Kurtosis rise, crest factor change | Module A (features) |
| Time | Operating age → Weibull position | Module F (reliability layer) |
| Material/Man | Post-maintenance regression | Module B+ (trend reversal detection) |

### Energy Flow Model (connecting SEDL to reliability)

The SEDL entropy layer (Module B++) is the mathematical expression of Dibyendu De's Theory of Imperfections:

```
Low SE (spectral entropy)  → Energy concentrated in few frequencies → Dominant fault
High SE                    → Energy spread across spectrum → Random/healthy
Low TE (temporal entropy)  → Repeating pattern → Periodic fault mechanism
High TE                    → Random time behaviour → No deterministic fault
Low DE (directional entropy) → Energy in one axis → Directional fault (misalignment)
High DE                    → Equal energy all axes → Isotropic (imbalance or healthy)
```

**SI (Stability Index) is the measure of how freely energy flows through the system.** SI = 1 means perfect energy flow (no imperfection). SI → 0 means energy cannot flow — imperfection is critical.

This directly maps to Dibyendu's framework:
- **SI dropping** = imperfection growing = strain energy accumulating
- **SI stable** = energy flowing freely = system in balance
- **SI oscillating** = system fighting between states = instability

---

## AI Insights (Narrative Layer)

After Modules E and F complete, the pipeline generates a human-readable narrative summary. This is the interpretive layer that turns scores into understanding.

### What AI Insights Provide
- **Situation summary:** What is happening to this machine, in plain language
- **Root cause narrative:** Why the engine reached this conclusion, linking diagnosis to physics
- **Action guidance:** What the maintenance team should focus on, in priority order
- **Urgency context:** How urgent the situation is and what happens if action is delayed
- **Confidence qualifier:** How certain the assessment is and what could change it

### Example AI Insight (for the walkthrough below)
```
"Pump P-101A is showing signs of impeller imbalance with moderate confidence
(72%). The vibration trend is rising steadily but not accelerating — estimated
80 days before reaching the failure threshold. Recommended action: schedule a
balance correction within 24 hours. Spares are available. If left unaddressed,
expect the trend to cross the alarm threshold within 3 months. A confirmation
measurement run is also recommended to validate the diagnosis before committing
to the correction."
```

### Design Principles
- Written for maintenance engineers and shift supervisors, not data scientists
- References specific actions from the catalog (ACT001–ACT008) by name
- Avoids exposing internal scores, formulas, or module names (IP protection)
- Adapts tone to severity: factual for normal/watch, directive for warning/alarm

---

## Example Walkthrough

**Input scenario:** Pump P-101A with impeller imbalance, S_eff=0.84, C=0.72, K=0.6, U=0.6, no safety flag, spares available.

**Module E calculation:**
```
base = 0.45×0.84 + 0.25×0.72 + 0.20×0.6 + 0.10×0.6
     = 0.378 + 0.18 + 0.12 + 0.06 = 0.738
P = 100 × 0.738 × 1.0 × 1.0 × 1.0 = 73.8
Window = "24 hours" (70 ≤ 73.8 < 85)
Actions = ACT004 (imbalance keyword) + ACT001 (confirmation)
```

**Module F calculation (linear model):**
```
slope_log = 0.012, slope_change = 0.003 (< 0.01 → linear)
current = 4.2 mm/s, threshold = 11.0 mm/s
RUL = ln(11.0/4.2) / 0.012 = 0.9625 / 0.012 ≈ 80.2 days
NLI = 0.35 (< 0.6 → no instability adjustment)
P_30 = 1 − exp(−30/80.2) = 0.312
P_adj = 0.312 × 0.72 = 0.225
Risk_Index = 100 × 0.84 × 0.6 = 50.4
Window = "Planned" (30 < 80.2 < 180)
```
