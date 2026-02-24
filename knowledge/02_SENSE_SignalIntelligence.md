# Stage 2: SENSE — Signal Intelligence

_Modules A (Features) + B (Initiators) + B+ (Trends) + B++ (Entropy)_

---

## Purpose

SENSE extracts everything the engine needs to understand from the signal. It runs 4 parallel analyses:

| Module | What it does | Output type |
|---|---|---|
| **A (Features)** | Extract signal statistics + severity | Numeric features |
| **B (Initiators)** | Match fault patterns against 116 rules | Fault matches |
| **B+ (Trends)** | Compute slope, acceleration, instability | Trend metrics |
| **B++ (SEDL)** | Compute entropy and stability index | Stability state |

Module A runs first (its outputs feed B). Then B, B+, B++ run **in parallel**.

---

## How FFT Fits Into SENSE

FFT analysis is foundational but not a standalone module — it is embedded across SENSE:

- **Module A** extracts FFT magnitudes, dominant frequencies, harmonics (1x, 2x, sidebands, HF bands)
- **Module B** uses FFT-derived ratios and harmonic content for rule evaluation
- **Module B++** uses FFT magnitude distribution to compute Spectral Entropy (SE)

### FFT Processing Parameters
```
Window:              Hanning (reduces spectral leakage)
Overlap:             50%
Frequency resolution: sampling_rate / N  (where N = FFT size)
Extraction targets:  1x, 2x, sidebands, high-frequency bands
```

---

## Module A — Feature Extraction & Severity

### Core Signal Statistics
```
rms            = sqrt(mean(values²))
peak           = max(abs(values))
crest_factor   = peak / rms
kurtosis       = mean(((x - μ) / σ)⁴) − 3    [excess kurtosis]
```

### Severity Scoring
```
slope          = linear regression slope over signal (proxy for trend)
severity_score = |slope| × 10.0    [clamped 0–1]

If baseline provided:
  ratio = rms / baseline
  degradation = (rms - baseline) / baseline
  deg_severity = logistic(degradation × |slope| × 5)
  severity_score = max(severity_score, deg_severity)
```

### Baseline Ratio Boosting
| Ratio (rms/baseline) | Min Severity |
|---|---|
| ≥ 2.0 | 0.90 |
| ≥ 1.5 | 0.70 |
| ≥ 1.2 | 0.40 |

### Classification: Machine vs Process vs Chaotic
```
variance_pct = (std / mean) × 100

If variance_pct > 60 AND |slope| < 0.05 → "chaotic" (severity = 0)
If variance_pct > 40                    → "process"
Otherwise                               → "machine" (real fault)
```

### Severity Levels (consistent across all modules)
| Score | Level |
|---|---|
| ≥ 0.80 | alarm |
| 0.50–0.80 | warning |
| 0.30–0.50 | watch |
| < 0.30 | normal |

### Signal Groups (from rule documentation)
11 categories with 90+ rules total: Velocity Trend (VT001–VT005), Acceleration Trend (AT001–AT006), Displacement Trend (DT001–DT005), FFT Band Rules (FB001–FB015), FFT Zone Rules (Z1–ZC), Impulse Metrics (IM001–IM006), Envelope Acceleration (EA001–EA007), Electrical Trends (ET001–ET009), Temperature Trends (TM001–TM008), HF Band Rules (HF001–HF007), Load Correction Factors.

### Fusion Weights (Signal Group → Severity)
| Signal Group | Weight |
|---|---|
| HF Bands | 0.30 |
| Velocity Trend | 0.20 |
| Acceleration Trend | 0.10 |
| FFT Bands | 0.10 |
| Displacement | 0.05 |
| FFT Zones | 0.05 |
| Impulse Metrics | 0.05 |
| Temperature | 0.05 |
| Electrical | 0.05 |
| Directional | 0.03 |
| Load Correction | 0.02 |

---

## Module B — Initiator Detection (116 Rules)

### Implementation Notes
- Rule expressions are parsed from Excel threshold sheets (12 sheets, one per component)
- Rules are evaluated in strict priority order — first match wins per component
- Return match confidence based on how strongly conditions are satisfied
- Excel sheets contain ONLY thresholds and expressions; scoring logic remains in service code

### How It Works
Each rule defines a **detection pattern** — a set of metric conditions that, when ALL satisfied, indicate a specific fault initiator:
```
IF (ratio_condition AND metric_condition AND supplementary_condition)
THEN match(rule_id, score, diagnosis)
```

### Component Types (12)

| Component | Rules | Examples |
|---|---|---|
| AFB (Anti-friction bearings) | 16 (AFB01–AFB16) | BPFO, BPFI, BSF, cage defects, lubrication |
| Journal Bearings | 12 (JB01–JB12) | Oil whirl, oil whip, clearance |
| TPJB (Tilting Pad) | 12 (TPJB01–TPJB12) | Pad flutter, preload loss |
| Couplings | 8 (COUP01–COUP08) | Misalignment, wear |
| AC Motors | 9 (AC01–AC09) | Electrical unbalance, rotor bar, VFD |
| DC Motors | 7 (DC01–DC07) | Commutator, brush issues |
| Foundations | 10 (FND01–FND10) | Soft foot, looseness, resonance |
| Gears | 10 (GEAR01–GEAR10) | Mesh defects, tooth wear |
| Fluid Flow | 15 (FL001–FL015) | Cavitation, recirculation, vane pass |
| Belts | 5 (B01–B05) | Tension, wear, misalignment |
| Chains | 4 (C01–C04) | Wear, tension |
| Shafts | 9 (S01–S09) | Crack, bow, rub |

### Key Directional Ratios
| Ratio | Range | Indicates |
|---|---|---|
| H/V > 1.2 | Horizontal dominance | Imbalance, looseness |
| V/H > 1.4 | Vertical dominance | Soft foot, foundation |
| A/H > 1.3 | Axial dominance | Misalignment, thermal growth |
| 0.9 < H/V < 1.1 | Isotropy | Oil film loss, contamination |

### Output
```json
{
  "component": "afb",
  "num_matches": 1,
  "matched_rules": [{
    "rule_id": "AFB06",
    "initiator": "Shaft Imbalance",
    "diagnosis": "imbalance affecting bearing",
    "score": 2.0,
    "triggered_conditions": [
      {"expr": "H/V", "op": ">=", "threshold": 1.2, "value": 1.2}
    ]
  }],
  "confidence": 0.66
}
```

---

## Module B+ — Slope Intelligence

### Log-Domain Slope
```
slope_log    = d/dt[ln(RMS)]       (via least-squares regression)
slope_change = slope_second_half − slope_first_half    (second derivative proxy)
```

### Non-Linearity Index (NLI / Instability Index)
```
residuals    = log_values − linear_fit(log_values)
volatility   = std(residuals)
instability  = min(1.0, volatility × 5.0)    [normalized 0–1]
```
Log-domain residuals ensure scale independence. Multiplier of 5.0 normalizes typical volatility range to 0–1.

### Trend Classification
| Class | Condition |
|---|---|
| **Step** | max_jump > 0.5 (sudden shift) |
| **Chaotic** | volatility > 0.3 AND |slope| < 0.02 |
| **Accelerating** | |slope| > 0.05 AND |slope_change| > 0.02 |
| **Drift** | |slope| > 0.02 (steady rise) |
| **Stable** | Otherwise |

### Severity by Trend Class
| Class | Severity |
|---|---|
| Chaotic | 0.30 (investigate, not alarm) |
| Step | 0.80 |
| Accelerating | min(1.0, |slope|×10 + |slope_change|×5) |
| Drift | min(0.70, |slope|×8) |
| Stable | max(0.0, |slope|×3) |

---

## Module B++ — SEDL (Stability–Entropy Diagnostic Lens)

The thermodynamic backbone. Computes entropy metrics that detect degradation **before** amplitude changes become visible.

### Implementation Notes
- Normalize all entropy values to [0, 1] range
- Use weighted entropy to compute SI: `SI = 1 − (0.5·SE + 0.3·TE + 0.2·DE)` (weights frozen: WCFG01)
- Apply state thresholds from Excel configuration (6 thresholds, 5 state rules)
- Store FFT frequency bins from Module A for SE computation
- DE requires multi-directional data (H, V, A); fallback to SE + TE only if single-direction

### Spectral Entropy (SE)
```
p_i = |X(f_i)|² / Σ|X(f_j)|²        (power spectral distribution)
SE  = −Σ(p_i · ln(p_i)) / ln(N)     (normalized 0–1)
```
Healthy machine: energy concentrated at known frequencies → low SE.
Degrading machine: energy spreads across spectrum → high SE.

### Time Entropy (TE)
```
Histogram time signal into N bins
p_i = bin_count_i / total_count
TE  = −Σ(p_i · ln(p_i)) / ln(N)     (normalized 0–1)
```
Healthy: Gaussian-like distribution → moderate TE.
Impulsive: peaked distribution → low TE.
Chaotic: flat distribution → high TE.

### Directional Entropy (DE)
```
p_H = H_energy / total,  p_V = V_energy / total,  p_A = A_energy / total
DE  = −Σ(p_dir · ln(p_dir)) / ln(3)    (normalized 0–1)
```
Healthy: directional preference → low DE.
Degrading: energy spreads across directions → high DE.

### Stability Index (SI)
```
SI = 1 − (0.5·SE + 0.3·TE + 0.2·DE)    [weights frozen: WCFG01]
```
SI = 1.0 → perfectly stable. SI → 0.0 → critically unstable.

### Entropy Slope
```
dSE_dt = rate of SE change per day (computed over 7-day window)
```

### SEDL State Rules (priority order, highest first)

| Rule | Condition | State | Severity |
|---|---|---|---|
| SR05 | SI ≤ 0.40 | Critical_Instability | alarm |
| SR04 | SE ≥ 0.65 AND (TE ≥ 0.60 OR DE ≥ 0.60) | Chaotic | warning |
| SR03 | dSE_dt ≥ 0.02 AND SI < 0.60 | Destabilizing | warning |
| SR02 | SE > 0.35 AND SE < 0.65 AND dSE_dt < 0.02 | Drifting | watch |
| SR01 | SE ≤ 0.35 AND TE < 0.50 AND SI ≥ 0.70 | Stable | normal |

### SEDL Threshold Configuration
| ID | Parameter | Value |
|---|---|---|
| TH01 | SE_stable_max | 0.35 |
| TH02 | SE_chaotic_min | 0.65 |
| TH03 | TE_stable_max | 0.50 |
| TH04 | SI_critical_max | 0.40 |
| TH05 | SI_destabilizing_max | 0.60 |
| TH06 | dSE_dt_drift_threshold | 0.02 |

---

## API Contracts

### Module A: `POST /rapid-ai/moduleA`
**Request:** asset_id, machine_type, signal_type, direction, sampling_rate_hz, values[], baseline
**Response:** overall_rms, peak, kurtosis, crest_factor, ratio_to_baseline, degradation, severity_score, severity_level, trend_classification

### Module B: `POST /rapid-ai/moduleB`
**Request:** asset_id, component, metrics {H, V, A, kurtosis, crest_factor, temperature, ...}
**Response:** component, num_matches, matched_rules[], confidence

### Module B+: `POST /rapid-ai/moduleBplus`
**Request:** asset_id, timestamps[], values[], window_n_points
**Response:** slope, slope_change, instability_index, trend_class, severity_score

### Module B++: `POST /rapid-ai/moduleBpp`
**Request:** asset_id, metrics {SE, TE, DE, dSE_dt} OR spectra {H[], V[], A[]}
**Response:** SE, TE, DE, dSE_dt, SI, stability_state, severity_level, triggered_rules[]

---

## Downstream: Feeding Reliability

SENSE outputs drive the reliability engineering layer in Stage 4 (ACT). This is the bridge between real-time condition data and population-level reliability statistics.

### S_eff → Weibull Shape (β_adj)

Module A's severity score combines with data quality to produce S_eff (`S_eff = S_fusion × Q_data`). This adjusts the Weibull shape parameter:

```
β_adj = β_base × (1 + α_severity × S_eff)
```

Higher severity → higher β → steeper hazard curve → accelerating failure probability. This means a machine showing active degradation (high S_eff) shifts from random failure regime toward predictable wear-out — exactly what CBM should detect.

### Entropy (SI) → Bathtub Phase Validation

The Stability Index from Module B++ validates which phase of the bathtub curve the machine is in:

| SI Range | Bathtub Phase | β Implication |
|---|---|---|
| SI ≥ 0.70 | Useful life (random) | β ≈ 1.0 — constant hazard |
| 0.40 < SI < 0.70 | Transition zone | β trending above 1.0 |
| SI ≤ 0.40 | Wear-out phase | β > 1.5 — increasing hazard |

When SI drops below 0.70, the entropy signature tells us the machine is transitioning from random failure to wear-out — the point where condition monitoring becomes critical and time-based strategies fail.

### FRETTLSM Mapping

Module B's 116 initiator rules map to Dibyendu De's FRETTLSM diagnostic categories, connecting fault detection to the Theory of Imperfections energy flow model. See `04_ACT_MaintenanceAndPrognosis.md` § FRETTLSM for the full mapping.
