# Stage 3: FUSE — Health Assessment

_Module C (Fusion → SSI) + Module D (Health Stage + Escalation)_

---

## Purpose

FUSE combines all SENSE outputs into a single health picture. Module C aggregates block-level scores into a System Stability Index (SSI). Module D maps that SSI + slope into a health stage and escalation level.

---

## Module C — Fusion (System Stability Index)

### Block Score Rules (BSR001–BSR007)

Each component block gets scored based on its B (initiator match) and B+ (trend) outputs:

| Rule | Condition | Block Score | State |
|---|---|---|---|
| BSR007 | B_match ≥ 0.90 | 0.90 | critical |
| BSR001 | Trend = Accelerating AND confidence ≥ 0.70 | 0.85 | unstable |
| BSR003 | Trend = Step AND confidence ≥ 0.70 | 0.80 | unstable |
| BSR002 | Trend = Drift AND confidence ≥ 0.60 | 0.65 | degrading |
| BSR005 | B_match ≥ 0.70 AND (Trend = Stable OR confidence < 0.50) | 0.55 | watch |
| BSR004 | Trend = Chaotic AND process_correlation ≥ 0.70 | 0.35 | process-driven |
| BSR006 | B_match < 0.30 AND Trend = Stable | 0.15 | healthy |

**Priority:** Rules are evaluated top-to-bottom; first match wins.

### SSI Formula
```
SSI = Σ(weight_i × block_score_i)    for all blocks in machine profile
```
Clamped to [0, 1].

### Gating Rules (override SSI floor)
```
If stability_state == 'Critical_Instability' → SSI_floor = 0.70  (SSI cannot drop below 0.70)
```
When the entropy lens detects critical instability, SSI is forced to at least 0.70 regardless of block scores. This prevents false-negative fusion when individual blocks appear calm but the system-level entropy signature is alarming.

### Renormalization (missing blocks)
If a machine profile expects N blocks but only M are present (M < N), active block weights are renormalized proportionally:
```
weight_i_adj = weight_i / Σ(weight_j)    for all active blocks j
```
Example: PUMP_A profile expects 6 blocks (sum=1.0). If coupling is missing, the remaining 5 blocks have original weights summing to 0.90. Each is scaled by 1/0.90:
- fluid_flow: 0.30 / 0.90 = 0.333
- afb: 0.25 / 0.90 = 0.278
- etc.

Minimum required blocks must still be met per profile definition (blocks marked "Required" in the profile table).

### Machine Profiles (weight per component block)

**Pump Train (PROFILE_PUMP_A)**
| Block | Weight | Required |
|---|---|---|
| fluid_flow | 0.30 | Yes |
| afb (bearings) | 0.25 | Yes |
| foundation | 0.15 | Yes |
| ac_motor | 0.10 | Yes |
| coupling | 0.10 | No |
| shafts | 0.10 | Yes |

**Gearbox Train (PROFILE_GBX_A)**
| Block | Weight | Required |
|---|---|---|
| gears | 0.35 | Yes |
| afb | 0.20 | Yes |
| foundation | 0.15 | Yes |
| ac_motor | 0.10 | Yes |
| coupling | 0.10 | No |
| shafts | 0.10 | Yes |

**Fan Train (PROFILE_FAN_A)**
| Block | Weight | Required |
|---|---|---|
| fluid_flow | 0.30 | Yes |
| afb | 0.25 | Yes |
| foundation | 0.15 | Yes |
| ac_motor | 0.15 | Yes |
| shafts | 0.10 | Yes |
| coupling | 0.05 | No |

### SSI → System State
| SSI Range | System State |
|---|---|
| < 0.30 | stable |
| 0.30–0.60 | degrading |
| 0.60–0.80 | unstable |
| ≥ 0.80 | critical |

**Special case:** If > 50% of blocks have process_correlation ≥ 0.70 → state = "process-driven".

### Action Playbook
| State | Action | Operator Message |
|---|---|---|
| stable | monitor | System stable. Continue routine monitoring. |
| degrading | alert | Plan inspection within schedule window. |
| unstable | intervene | Reduce load/speed if possible. Inspect soon. |
| critical | shutdown_or_trip | Stop if safe. Inspect immediately. |
| process-driven | investigate_process | Check operating conditions. Re-test after stabilization. |

---

## Module D — Health Stage & Escalation

Maps SSI + SSI_slope into a health stage with slope-based escalation.

### Implementation Notes
- Uses structured physics mapping table to connect block patterns to mechanisms
- Confidence propagation from upstream modules carries through to hypotheses
- Example diagnostic pattern: **If journal block unstable + entropy rising → lubrication film collapse hypothesis**
- Example diagnostic pattern: **If AFB block + HF rise + temperature rise → bearing defect progression**

### Health Stage Determination

**Primary (SSI-based):**
| SSI Range | Stage | RUL Band |
|---|---|---|
| ≥ 0.80 | Critical | < 7 days |
| 0.60–0.80 | Unstable | 1–4 weeks |
| 0.30–0.60 | Degrading | 1–6 months |
| < 0.30 | Healthy | > 6 months |

**Slope Escalation (secondary):**
| Current Stage | Slope Condition | Escalates To |
|---|---|---|
| Degrading | SSI_slope > 0.05 | → Unstable |
| Healthy | SSI_slope > 0.02 | → Degrading |

### Escalation Levels
| Stage | Level | Action |
|---|---|---|
| Critical | Level_3 | Immediate intervention required |
| Unstable | Level_2 | Prepare intervention |
| Degrading (slope > 0.03) | Level_1 | Schedule inspection |
| Degrading (slope ≤ 0.03) | Level_1 | Schedule inspection |
| Healthy | Level_0 | Continue monitoring |

---

## API Contracts

### Module C: `POST /rapid-ai/moduleC`
**Request:**
```json
{
  "system_type": "pump_train_horizontal",
  "profile_id": "PROFILE_PUMP_A",
  "blocks": {
    "afb": {
      "B_match_score": 0.72,
      "Bplus_trend_class": "Drift",
      "Bplus_confidence": 0.65,
      "process_correlation": 0.0
    },
    "fluid_flow": { "..." }
  }
}
```
**Response:** system_type, profile_id, SSI, system_state, top_contributors[], recommended_action

### Module D: `POST /rapid-ai/moduleD`
**Request:** SSI, SSI_slope, system_state (optional)
**Response:** degradation_stage, rul_band, escalation_level, recommended_action

---

## Downstream: Feeding Reliability

FUSE outputs drive the reliability engineering layer in Stage 4 (ACT). SSI is the bridge between system-level health assessment and Weibull-based prognosis.

### SSI → Weibull Scale (η_adj)

The System Stability Index from Module C adjusts the Weibull scale (characteristic life) parameter:

```
η_adj = η_base × (1 − γ_degradation × SSI)
```

Higher SSI → shorter characteristic life → failure expected sooner. A machine with SSI = 0.80 (critical) has its expected life dramatically compressed compared to SSI = 0.15 (healthy).

### Health Stage → Bathtub Phase

Module D's health stage maps directly to bathtub curve phases and Weibull parameter ranges:

| Health Stage | Bathtub Phase | β Range | η Effect |
|---|---|---|---|
| Healthy | Useful life | β ≈ 1.0 | η near baseline |
| Degrading | Early wear-out | 1.0 < β < 2.0 | η reduced 20–50% |
| Unstable | Active wear-out | β > 2.0 | η reduced 50–80% |
| Critical | End of life | β > 3.0 | η reduced > 80% |

### SSI Slope → Hazard Rate Trend

The SSI slope (from Module D's escalation logic) indicates whether the hazard rate is increasing:

- SSI_slope > 0.05 → rapidly increasing hazard → β effectively increasing
- SSI_slope > 0.02 → moderate hazard increase → watch for transition
- SSI_slope ≤ 0.02 → stable hazard rate → current phase holding

This feeds directly into Module F's condition-adjusted Weibull calculations. See `04_ACT_MaintenanceAndPrognosis.md` § Reliability Engineering Framework for full formulas.
