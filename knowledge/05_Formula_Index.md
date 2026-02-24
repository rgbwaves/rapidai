# RAPID AI — Master Formula Index

_Every formula in the engine, grouped by stage. Single source of truth._

---

## Stage 1: GUARD

### Quality Score
```
quality_score = ∏(penalty_i)    for all triggered soft-penalty rules
```
Hard blocks (DG_001, DG_002, DG_005) set `block = true` and abort pipeline.

### Computed Metrics (DSP)
```
RMS   = √(Σ x² / N)
Peak  = max(|x|)
Crest = Peak / RMS
Kurtosis = (Σ(x − μ)⁴ / N) / σ⁴
```

---

## Stage 2: SENSE

### Module A — Severity Score
```
severity_score = slope × severity_multiplier
```
Where `severity_multiplier = 10.0` (fixed). Capped at [0, 1].

Baseline ratio boost: if `baseline_ratio > 1.5 AND severity < 0.5 → severity = min(severity × 1.5, 0.5)`.

### Module A — Classification
```
if variance > 60% AND slope < 0.05 → chaotic
if variance > 40%                  → process
else                               → machine
```

### Module B+ — Slope (log-domain)
```
slope_log = polyfit(t, ln(values), degree=1)[0]
```

### Module B+ — Explicit Least-Squares Regression
```
slope = (N·Σxy − Σx·Σy) / (N·Σx² − (Σx)²)
```
Where x = time indices, y = values (or ln(values) for log regression). This is the classic OLS formula used when numpy polyfit is not available.


### Module B+ — Slope Change
```
slope_first = polyfit(t[:N/2], ln(values[:N/2]))[0]
slope_second = polyfit(t[N/2:], ln(values[N/2:]))[0]
slope_change = slope_second − slope_first
```

### Module B+ — NLI (Instability Index)
```
residuals = ln(values) − polyfit_trend(ln(values))
volatility = std(residuals)
NLI = min(1.0, volatility × 5.0)
```
Clamped to [0, 1]. Log-domain residuals ensure scale independence. Multiplier of 5.0 normalizes typical volatility range to 0–1.

### Module B+ — Trend Classification
| Condition | Trend Class | Severity |
|---|---|---|
| max_jump > 0.5 (log-domain) | Step | 0.80 |
| volatility > 0.3 AND |slope| < 0.02 | Chaotic | 0.30 |
| |slope| > 0.05 AND |slope_change| > 0.02 | Accelerating | min(1.0, |slope|×10 + |slope_change|×5) |
| |slope| > 0.02 | Drift | min(0.70, |slope|×8) |
| else | Stable | max(0.0, |slope|×3) |

### Module B++ — Shannon Entropy (SEDL)
```
SE = −Σ(p_i × ln(p_i)) / ln(N)    Spectral Entropy (frequency-domain)
TE = −Σ(p_i × ln(p_i)) / ln(N)    Temporal Entropy (time-domain)
DE = −Σ(p_i × ln(p_i)) / ln(3)    Directional Entropy (3 axes: H, V, A)
```
Each normalised to [0, 1]. Division by ln(N) (or ln(3) for DE) ensures maximum entropy = 1.0.

### Module B++ — Stability Index
```
SI = 1 − (0.5·SE + 0.3·TE + 0.2·DE)
```
Clamped to [0, 1]. Higher SI = more stable.

### Module B++ — State Rules (priority order, highest first)
| Rule | Condition | State | Severity |
|---|---|---|---|
| SR05 | SI ≤ 0.40 | Critical_Instability | alarm |
| SR04 | SE ≥ 0.65 AND (TE ≥ 0.60 OR DE ≥ 0.60) | Chaotic | warning |
| SR03 | dSE_dt ≥ 0.02 AND SI < 0.60 | Destabilizing | warning |
| SR02 | SE > 0.35 AND SE < 0.65 AND dSE_dt < 0.02 | Drifting | watch |
| SR01 | SE ≤ 0.35 AND TE < 0.50 AND SI ≥ 0.70 | Stable | normal |

---

## Stage 3: FUSE

### Block Score Rules (BSR001–BSR007, first match wins)
| Rule | Condition | Score | State |
|---|---|---|---|
| BSR007 | B_match ≥ 0.90 | 0.90 | critical |
| BSR001 | Trend = Accelerating AND conf ≥ 0.70 | 0.85 | unstable |
| BSR003 | Trend = Step AND conf ≥ 0.70 | 0.80 | unstable |
| BSR002 | Trend = Drift AND conf ≥ 0.60 | 0.65 | degrading |
| BSR005 | B_match ≥ 0.70 AND (Stable OR conf < 0.50) | 0.55 | watch |
| BSR004 | Trend = Chaotic AND proc_corr ≥ 0.70 | 0.35 | process-driven |
| BSR006 | B_match < 0.30 AND Stable | 0.15 | healthy |

### SSI (System Stability Index)
```
SSI = Σ(weight_i × block_score_i)
```
Clamped to [0, 1]. Weights from machine profile.

### SSI → System State
| SSI | State |
|---|---|
| < 0.30 | stable |
| 0.30–0.60 | degrading |
| 0.60–0.80 | unstable |
| ≥ 0.80 | critical |

Special: if >50% blocks have process_correlation ≥ 0.70 → "process-driven".

### Health Stage (Module D)
| SSI | Stage | RUL Band |
|---|---|---|
| ≥ 0.80 | Critical | < 7 days |
| 0.60–0.80 | Unstable | 1–4 weeks |
| 0.30–0.60 | Degrading | 1–6 months |
| < 0.30 | Healthy | > 6 months |

### Slope Escalation
```
if Degrading AND SSI_slope > 0.05 → Unstable
if Healthy AND SSI_slope > 0.02   → Degrading
```

---

## Cross-Cutting (Pipeline)

### Effective Severity
```
S_eff = S_fusion × Q_data
```

### Confidence Propagation (canonical v1.0)
```
C_final = Q_data × (1 − ∏(1 − C_i))
```
Where C_i = [B+ severity_score, B++ SI, B match confidence]. Independent evidence compounds: if any module is highly confident, overall confidence rises. Q_data gates the result — poor data quality suppresses confidence regardless of module agreement.

### Confidence Propagation (weighted variant — future)
```
C_total = 1 − ∏(1 − C_i × weight_i)
```
NOTE: This is NOT equivalent to the canonical formula above. It weights each module's contribution before compounding. Reserved for future use when module-specific reliability weighting is calibrated. Not implemented in v1.0.

### Gating Rules (Module C → SSI floor)
```
If stability_state == 'Critical_Instability' → SSI_floor = 0.70
```
Forces minimum SSI when entropy detects critical instability (Module B++ SR05), overriding block-level scores.

### State Transitions (hysteresis)
| Transition | S_eff Threshold | Persistence | Hysteresis |
|---|---|---|---|
| → Degrading | > 0.55 | 3 windows | ±0.08 |
| → Unstable | > 0.70 | 3 windows | ±0.08 |
| → Critical | > 0.85 | 2 windows | ±0.08 |
| ← (return down) | < threshold − 0.08 | 5 windows | ±0.08 |

**Implementation note (v1.0):** State transitions with hysteresis require temporal persistence tracking across multiple API calls. In v1.0 (stateless API), each call is independent — the client is responsible for implementing persistence logic if hysteresis is needed. The thresholds above define the canonical transition rules for client-side implementation.

### Final Severity Level
| S_eff | Level |
|---|---|
| ≥ 0.80 | alarm |
| 0.50–0.80 | warning |
| 0.30–0.50 | watch |
| < 0.30 | normal |

---

## Stage 4: ACT

### Priority Score (Module E)
```
P = 100 × (0.45·S + 0.25·C + 0.20·K + 0.10·U) × M_safe × R_sp × R_mp
```
Clamped to [0, 100].

| Window | Condition |
|---|---|
| Immediate | P ≥ 85 |
| 24 hours | 70 ≤ P < 85 |
| 7 days | 50 ≤ P < 70 |
| Next shutdown | P < 50 |

### RUL Models (Module F)

**Linear:**
```
RUL = ln(threshold / current) / slope_log
```

**Accelerating (slope_change ≥ 0.01):**
```
RUL = ln(threshold / current) / (slope_log + slope_change)
```

**Instability adjustment (NLI ≥ 0.6):**
```
RUL_adj = RUL_base × (1 − NLI)
```

### Failure Probability
```
P_30 = 1 − exp(−30 / RUL_days)
P_adj = P_30 × confidence
```

### Risk Index
```
Risk_Index = 100 × severity × criticality
```
Clamped to [0, 100].

---

## Reliability Engineering (Module F — extended)

### Weibull Distribution
```
PDF:         f(t) = (β/η) × (t/η)^(β−1) × exp(−(t/η)^β)
CDF:         F(t) = 1 − exp(−(t/η)^β)
Reliability: R(t) = exp(−(t/η)^β)
Hazard:      h(t) = (β/η) × (t/η)^(β−1)
```
β = shape (failure physics), η = scale (characteristic life).

### Condition-Adjusted Weibull
```
β_adj = β_base × (1 + α_severity × S_eff)
η_adj = η_base × (1 − γ_degradation × SSI)
RUL_weibull = η_adj × (−ln(R_target))^(1/β_adj) − t_current
```

**Frozen v1.0 coefficients:**
| Coefficient | Value | Purpose |
|---|---|---|
| α_severity | 0.8 | Severity → β adjustment strength |
| γ_degradation | 0.6 | SSI → η adjustment strength |
| R_target | 0.90 | Reliability target (90% confidence) |

### Weibull Failure Probability (30-day, conditional)
```
P_30 = [exp(−(t/η_adj)^β_adj) − exp(−((t+30)/η_adj)^β_adj)] / R(t)
```

### Kaplan-Meier Survival (fleet)
```
S(t) = ∏(1 − d_i/n_i)    for all t_i ≤ t
```

### Hazard Rate (instantaneous failure risk)
```
h(t) = (β/η) × (t/η)^(β−1)
```
β < 1 → decreasing hazard (infant mortality). β = 1 → constant hazard (random). β > 1 → increasing hazard (wear-out).

### P-F Interval Position
```
PF_position = (current_value − baseline) / (failure_threshold − baseline)
```
Clamped to [0, 1]. PF_position = 0 → at Point P (just detectable). PF_position = 1 → at Point F (functional failure).

### Bathtub Phase Inference
```
if β_adj < 0.8                → infant_mortality
if 0.8 ≤ β_adj ≤ 1.2         → useful_life (random)
if β_adj > 1.2                → wear_out
```

### Nowlan & Heap Pattern Mapping
| Pattern | Shape | % of Failures | Description |
|---|---|---|---|
| A (Bathtub) | β varies by phase | 4% | Classic three-phase life |
| B (Wear-out) | β > 2.0 | 2% | Age-related, predictable |
| C (Gradual) | 1.0 < β < 2.0 | 5% | Slowly increasing failure rate |
| D (Initial spike) | β ≈ 1.0, early peak | 7% | Low initial, then constant |
| E (Random) | β ≈ 1.0 | 14% | Constant failure rate throughout |
| F (Infant mortality) | β < 1.0 | 68% | High early, then constant |

82% of failures (D+E+F) are random or infant mortality — time-based replacement is ineffective. Only condition-based monitoring (what RAPID AI provides) catches them.

### Availability
```
MTBF = total_operating_time / number_of_failures
MTTR = total_repair_time / number_of_repairs
Availability = MTBF / (MTBF + MTTR)
```
