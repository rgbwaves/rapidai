# Knowledge Base + API Code Review — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align knowledge base documentation with Python API code, fix bugs, complete missing implementations, and add test coverage.

**Architecture:** Three waves — Critical Alignment (knowledge-code sync), Knowledge Completeness (docs), Quality & Tests (hardening). Knowledge docs are the source of truth; code is fixed to match, and where code reveals design decisions not in docs, docs are updated.

**Tech Stack:** Python 3.13, FastAPI, Pydantic v2, NumPy, pytest

---

## Wave 1: Critical Alignment

### Task 1: Reconcile Confidence Propagation Formulas

**Files:**
- Modify: `knowledge/05_Formula_Index.md:154-164`

**Context:** Two confidence formulas are documented as "expressing the same principle" but are NOT mathematically equivalent. The code (main.py:271-276) uses the unweighted version. Fix the docs.

**Step 1: Edit 05_Formula_Index.md lines 154-164**

Replace the confidence propagation section with:

```markdown
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
```

**Step 2: Verify no other files claim equivalence**

Search for "same principle" or "both formulations" across knowledge/ — remove any misleading language.

---

### Task 2: Document Frozen Weibull Coefficients

**Files:**
- Modify: `knowledge/04_ACT_MaintenanceAndPrognosis.md:265-272`
- Modify: `knowledge/05_Formula_Index.md:247-251`

**Context:** The code already defines `ALPHA_SEVERITY = 0.8` and `GAMMA_DEGRADATION = 0.6` (moduleF_rul.py:43-44) but the knowledge base doesn't specify these frozen values.

**Step 1: Add frozen coefficient values to 04_ACT**

After the condition adjustment formulas, add:

```markdown
**Frozen v1.0 coefficients:**
| Coefficient | Value | Purpose |
|---|---|---|
| α_severity | 0.8 | Severity → β adjustment strength. Higher S_eff → steeper wear-out. |
| γ_degradation | 0.6 | SSI → η adjustment strength. Higher SSI → shorter characteristic life. |
| R_target | 0.90 | Reliability target for Weibull RUL (90% confidence level). |

These are calibrated defaults. Future versions may make them component-specific or adaptive.
```

**Step 2: Add same to 05_Formula_Index.md after the condition-adjusted Weibull section**

---

### Task 3: Fix Gating Rule Naming (BPP_state → stability_state)

**Files:**
- Modify: `knowledge/03_FUSE_HealthAssessment.md:39`
- Modify: `knowledge/05_Formula_Index.md:167-170`

**Context:** Knowledge references `BPP_state` but Module B++ outputs `stability_state` (schemas.py:234). Fix naming.

**Step 1: Replace in 03_FUSE**
```
OLD: If BPP_state == 'critical'
NEW: If stability_state == 'Critical_Instability'
```

**Step 2: Replace in 05_Formula_Index**
```
OLD: If BPP_state == 'critical' → SSI_floor = 0.70
NEW: If stability_state == 'Critical_Instability' → SSI_floor = 0.70
```

---

### Task 4: Implement SSI Gating Rule in Module C

**Files:**
- Modify: `rapid_ai_engine/modules/moduleC_fusion.py:97-154`
- Modify: `rapid_ai_engine/schemas.py:248-251` (add BPP state to ModuleCRequest)

**Context:** Knowledge doc 03 specifies `If stability_state == 'Critical_Instability' → SSI_floor = 0.70` but this is NOT implemented in the code. Module C doesn't receive B++ state.

**Step 1: Add stability_state to ModuleCRequest (schemas.py)**

```python
class ModuleCRequest(BaseModel):
    system_type: str
    profile_id: Optional[str] = None
    blocks: Dict[str, BlockInput]
    stability_state: Optional[StabilityState] = None  # From B++ for gating
```

**Step 2: Implement gating in moduleC_fusion.py**

After SSI computation (after line 125), add:

```python
    # ── Gating rule: B++ critical → SSI floor ──
    if request.stability_state == StabilityState.Critical_Instability:
        ssi = max(ssi, 0.70)
```

**Step 3: Pass stability_state through orchestrator (main.py)**

In the evaluate() function, after B++ completes, pass the state to Module C:

```python
    mC_req = ModuleCRequest(
        system_type=request.system_type,
        blocks={request.component: block_input},
        stability_state=mBpp_resp.stability_state,  # Gating rule
    )
```

---

### Task 5: Fix NLI Formula Discrepancy

**Files:**
- Modify: `knowledge/05_Formula_Index.md:62-66`
- Modify: `knowledge/02_SENSE_SignalIntelligence.md:174-179`

**Context:** Knowledge says `NLI = std(residuals) / mean(values)` but code does `instability = min(1.0, volatility * 5.0)` where `volatility = std(residuals)` (no division by mean). The code is correct (dividing by mean would make NLI unit-dependent). Fix knowledge to match code.

**Step 1: Fix 05_Formula_Index.md**

```markdown
### Module B+ — NLI (Instability Index)
```
residuals = ln(values) − polyfit_trend(ln(values))
volatility = std(residuals)
NLI = min(1.0, volatility × 5.0)
```
Clamped to [0, 1]. Log-domain residuals ensure scale independence. Multiplier of 5.0 normalizes typical volatility range to 0–1.
```

**Step 2: Fix 02_SENSE_SignalIntelligence.md**

```markdown
### Non-Linearity Index (NLI)
```
residuals    = log_values − linear_fit(log_values)
volatility   = std(residuals)
instability  = min(1.0, volatility × 5.0)    [normalized 0–1]
```
```

---

### Task 6: Fix Trend Classification Discrepancy (Formula Index vs Code)

**Files:**
- Modify: `knowledge/05_Formula_Index.md:69-75`

**Context:** The trend classification table in 05 uses different thresholds than both 02_SENSE and the code. The code and 02_SENSE are aligned. Fix 05 to match.

**Step 1: Replace the trend classification table in 05_Formula_Index.md**

```markdown
### Module B+ — Trend Classification
| Condition | Trend Class | Severity |
|---|---|---|
| max_jump > 0.5 (log-domain) | Step | 0.80 |
| volatility > 0.3 AND |slope| < 0.02 | Chaotic | 0.30 |
| |slope| > 0.05 AND |slope_change| > 0.02 | Accelerating | min(1.0, |slope|×10 + |slope_change|×5) |
| |slope| > 0.02 | Drift | min(0.70, |slope|×8) |
| else | Stable | max(0.0, |slope|×3) |
```

---

### Task 7: Fix Shannon Entropy Notation (log₂ vs ln)

**Files:**
- Modify: `knowledge/05_Formula_Index.md:77-83`

**Context:** Knowledge uses log₂ but code uses natural log (ln). Both produce valid 0-1 normalized entropy, but the normalization constant differs. Fix docs to match code.

**Step 1: Replace entropy formulas in 05_Formula_Index.md**

```markdown
### Module B++ — Shannon Entropy (SEDL)
```
SE = −Σ(p_i × ln(p_i)) / ln(N)    Spectral Entropy (frequency-domain)
TE = −Σ(p_i × ln(p_i)) / ln(N)    Temporal Entropy (time-domain)
DE = −Σ(p_i × ln(p_i)) / ln(3)    Directional Entropy (3 axes: H, V, A)
```
Each normalised to [0, 1]. Division by ln(N) (or ln(3) for DE) ensures maximum entropy = 1.0.
```

---

### Task 8: Complete Stub Component Rules (TPJB, DC_Motor, Belts, Chains)

**Files:**
- Modify: `rapid_ai_engine/modules/moduleB_initiators.py:248-256`

**Context:** Four component types have empty rule arrays. Knowledge spec says: TPJB (12 rules), DC Motor (7 rules), Belts (5 rules), Chains (4 rules). Implement physics-based rules matching the same pattern as existing components.

**Step 1: Add TPJB rules (12 rules: TPJB01–TPJB12)**

```python
def _build_tpjb_rules() -> List[dict]:
    """Tilting Pad Journal Bearing rules (TPJB01–TPJB12)."""
    return [
        {"rule_id": "TPJB01", "initiator": "Pad Flutter",
         "diagnosis": "Pad oscillation due to low preload or light load",
         "conditions": [("H_V_ratio", ">=", 0.9), ("H_V_ratio", "<=", 1.1)],
         "severity_base": 0.6},
        {"rule_id": "TPJB02", "initiator": "Preload Loss",
         "diagnosis": "Reduced pad preload allowing excessive shaft motion",
         "conditions": [("H_V_ratio", ">=", 1.3), ("A_H_ratio", "<", 0.3)],
         "severity_base": 0.7},
        {"rule_id": "TPJB03", "initiator": "Pad Pivot Wear",
         "diagnosis": "Pivot point degradation altering pad geometry",
         "conditions": [("kurtosis", ">=", 4.0), ("crest_factor", ">=", 2.5)],
         "severity_base": 0.6},
        {"rule_id": "TPJB04", "initiator": "Oil Starvation",
         "diagnosis": "Insufficient oil flow to pads causing film collapse",
         "conditions": [("temperature", ">=", 75), ("H_V_ratio", ">=", 0.9), ("H_V_ratio", "<=", 1.1)],
         "severity_base": 0.9},
        {"rule_id": "TPJB05", "initiator": "Babbitt Fatigue",
         "diagnosis": "Babbitt overlay fatigue cracking under cyclic load",
         "conditions": [("kurtosis", ">=", 5.0), ("temperature", ">=", 65)],
         "severity_base": 0.8},
        {"rule_id": "TPJB06", "initiator": "Thermal Distortion",
         "diagnosis": "Pad thermal bowing from uneven heat distribution",
         "conditions": [("temperature", ">=", 70), ("A_H_ratio", ">=", 0.5)],
         "severity_base": 0.5},
        {"rule_id": "TPJB07", "initiator": "Shaft Misalignment",
         "diagnosis": "Misalignment loading pads unevenly",
         "conditions": [("A_H_ratio", ">=", 1.2)],
         "severity_base": 0.6},
        {"rule_id": "TPJB08", "initiator": "Excessive Clearance",
         "diagnosis": "Large clearance ratio causing instability",
         "conditions": [("H_V_ratio", ">=", 2.0)],
         "severity_base": 0.6},
        {"rule_id": "TPJB09", "initiator": "Oil Whip (Severe)",
         "diagnosis": "Cross-coupled stiffness generating forward whirl above 2x threshold",
         "conditions": [("H_V_ratio", ">=", 0.9), ("H_V_ratio", "<=", 1.1), ("kurtosis", ">=", 6.0)],
         "severity_base": 0.9},
        {"rule_id": "TPJB10", "initiator": "Contamination",
         "diagnosis": "Particle contamination in oil scoring pad surface",
         "conditions": [("kurtosis", ">=", 5.0), ("crest_factor", ">=", 3.0)],
         "severity_base": 0.6},
        {"rule_id": "TPJB11", "initiator": "Overload",
         "diagnosis": "Bearing loaded beyond design capacity",
         "conditions": [("H_V_ratio", ">=", 1.4), ("temperature", ">=", 70)],
         "severity_base": 0.7},
        {"rule_id": "TPJB12", "initiator": "Rotor Rub",
         "diagnosis": "Shaft contacting pad or guard during transient",
         "conditions": [("A_H_ratio", ">=", 0.7), ("kurtosis", ">=", 7.0)],
         "severity_base": 0.9},
    ]
```

**Step 2: Add DC Motor rules (7 rules: DC01–DC07)**

```python
def _build_dc_motor_rules() -> List[dict]:
    """DC Motor rules (DC01–DC07)."""
    return [
        {"rule_id": "DC01", "initiator": "Commutator Roughness",
         "diagnosis": "Commutator surface wear causing brush bounce and arcing",
         "conditions": [("kurtosis", ">=", 4.0), ("crest_factor", ">=", 2.5)],
         "severity_base": 0.5},
        {"rule_id": "DC02", "initiator": "Brush Wear",
         "diagnosis": "Worn brushes causing intermittent contact and sparking",
         "conditions": [("kurtosis", ">=", 5.0), ("H_V_ratio", ">=", 0.9), ("H_V_ratio", "<=", 1.1)],
         "severity_base": 0.6},
        {"rule_id": "DC03", "initiator": "Armature Imbalance",
         "diagnosis": "Unbalanced armature producing radial vibration at 1x",
         "conditions": [("H_V_ratio", ">=", 1.2), ("A_H_ratio", "<", 0.3)],
         "severity_base": 0.5},
        {"rule_id": "DC04", "initiator": "Field Winding Fault",
         "diagnosis": "Asymmetric field causing electromagnetic unbalance",
         "conditions": [("H_V_ratio", ">=", 2.0)],
         "severity_base": 0.7},
        {"rule_id": "DC05", "initiator": "Bearing Fault",
         "diagnosis": "Motor bearing defect generating broadband vibration",
         "conditions": [("kurtosis", ">=", 6.0), ("crest_factor", ">=", 3.0)],
         "severity_base": 0.7},
        {"rule_id": "DC06", "initiator": "Misalignment",
         "diagnosis": "Shaft misalignment loading axial direction",
         "conditions": [("A_H_ratio", ">=", 1.3)],
         "severity_base": 0.6},
        {"rule_id": "DC07", "initiator": "Commutator Eccentricity",
         "diagnosis": "Out-of-round commutator causing periodic brush lift",
         "conditions": [("H_V_ratio", ">=", 1.5), ("kurtosis", ">=", 4.0)],
         "severity_base": 0.6},
    ]
```

**Step 3: Add Belt rules (5 rules: B01–B05)**

```python
def _build_belt_rules() -> List[dict]:
    """Belt Drive rules (B01–B05)."""
    return [
        {"rule_id": "B01", "initiator": "Belt Tension Incorrect",
         "diagnosis": "Improper belt tension causing slip or excessive load",
         "conditions": [("H_V_ratio", ">=", 1.3)],
         "severity_base": 0.5},
        {"rule_id": "B02", "initiator": "Belt Wear / Cracking",
         "diagnosis": "Belt surface degradation generating impulses at belt frequency",
         "conditions": [("kurtosis", ">=", 4.0), ("crest_factor", ">=", 2.0)],
         "severity_base": 0.6},
        {"rule_id": "B03", "initiator": "Sheave Misalignment",
         "diagnosis": "Pulley misalignment causing axial belt walk and wear",
         "conditions": [("A_H_ratio", ">=", 1.2)],
         "severity_base": 0.5},
        {"rule_id": "B04", "initiator": "Sheave Wear",
         "diagnosis": "Worn pulley groove altering belt contact geometry",
         "conditions": [("H_V_ratio", ">=", 1.4), ("kurtosis", ">=", 3.5)],
         "severity_base": 0.5},
        {"rule_id": "B05", "initiator": "Belt Resonance",
         "diagnosis": "Belt span natural frequency excited by running speed",
         "conditions": [("H", ">=", 2.0), ("H_V_ratio", ">=", 2.5)],
         "severity_base": 0.7},
    ]
```

**Step 4: Add Chain rules (4 rules: C01–C04)**

```python
def _build_chain_rules() -> List[dict]:
    """Chain Drive rules (C01–C04)."""
    return [
        {"rule_id": "C01", "initiator": "Chain Wear / Elongation",
         "diagnosis": "Link wear causing pitch elongation and meshing impacts",
         "conditions": [("kurtosis", ">=", 4.0)],
         "severity_base": 0.5},
        {"rule_id": "C02", "initiator": "Chain Tension Incorrect",
         "diagnosis": "Improper tension causing chain slap or excessive load",
         "conditions": [("H_V_ratio", ">=", 1.3), ("kurtosis", ">=", 3.5)],
         "severity_base": 0.5},
        {"rule_id": "C03", "initiator": "Sprocket Wear",
         "diagnosis": "Worn sprocket teeth causing irregular meshing",
         "conditions": [("kurtosis", ">=", 5.0), ("crest_factor", ">=", 2.5)],
         "severity_base": 0.6},
        {"rule_id": "C04", "initiator": "Chain Misalignment",
         "diagnosis": "Sprocket misalignment causing lateral chain loading",
         "conditions": [("A_H_ratio", ">=", 1.2)],
         "severity_base": 0.5},
    ]
```

**Step 5: Wire up in RULES_DB initialization**

Replace lines 248-257:
```python
RULES_DB["tpjb"] = _build_tpjb_rules()
RULES_DB["dc_motor"] = _build_dc_motor_rules()
RULES_DB["belts"] = _build_belt_rules()
RULES_DB["chains"] = _build_chain_rules()
```

---

### Task 9: Fix Type Issues in Schemas

**Files:**
- Modify: `rapid_ai_engine/schemas.py:79-84` (remove MachineState)
- Modify: `rapid_ai_engine/schemas.py:396` (fix health_stage type)

**Step 1: Remove dead MachineState enum**

Delete lines 79-84 (the entire MachineState class). No code references it.

**Step 2: Fix FullAnalysisResponse.health_stage type**

```python
# OLD
health_stage: str = "Healthy"

# NEW
health_stage: HealthStage = HealthStage.Healthy
```

**Step 3: Fix main.py line 336 to pass enum instead of .value**

```python
# OLD (main.py:336)
health_stage=mD_resp.degradation_stage.value,

# NEW
health_stage=mD_resp.degradation_stage,
```

---

### Task 10: Fix Enum Comparison in main.py

**Files:**
- Modify: `rapid_ai_engine/main.py:289`

**Step 1: Use enum comparison instead of string comparison**

```python
# OLD
safety_flag=(mD_resp.degradation_stage.value == "Critical"),

# NEW
safety_flag=(mD_resp.degradation_stage == HealthStage.Critical),
```

Add `HealthStage` to the import at top of file.

---

### Task 11: Add Error Handling to All Modules

**Files:**
- Modify: `rapid_ai_engine/modules/moduleA_trend.py`
- Modify: `rapid_ai_engine/modules/moduleB_initiators.py`
- Modify: `rapid_ai_engine/modules/moduleBplus_slope.py`
- Modify: `rapid_ai_engine/modules/moduleBpp_sedl.py`
- Modify: `rapid_ai_engine/modules/moduleC_fusion.py`
- Modify: `rapid_ai_engine/modules/moduleD_health.py`
- Modify: `rapid_ai_engine/modules/moduleE_maintenance.py`

**Pattern:** Wrap each module's `run()` body in try-except. On error, return a default response with execution_time_ms set, and log the error. Do NOT swallow errors silently — include error info in the response where possible.

**Step 1: Add to each module's run() function**

For each module, wrap the core logic:

```python
def run(request: ModuleXRequest) -> ModuleXResponse:
    t0 = time.perf_counter()
    try:
        # ... existing logic ...
    except Exception as e:
        elapsed = (time.perf_counter() - t0) * 1000
        import logging
        logging.getLogger(__name__).error(f"Module X error: {e}", exc_info=True)
        return ModuleXResponse(
            execution_time_ms=round(elapsed, 2),
            # ... safe defaults ...
        )
```

Module-specific defaults:
- **Module A:** severity_score=0.0, severity_level=normal, trend_classification="error"
- **Module B:** confidence=0.0, num_matches=0, component=request.component
- **Module B+:** trend_class=Stable, severity_score=0.0
- **Module B++:** stability_state=Stable, severity_level=normal, SI=1.0
- **Module C:** SSI=0.0, system_state=stable
- **Module D:** degradation_stage=Healthy, escalation_level=Level_0
- **Module E:** plan_items=[], total_actions=0

---

## Wave 2: Knowledge Completeness

### Task 12: Document Missing DG Rules

**Files:**
- Modify: `knowledge/01_GUARD_DataQuality.md:41-62`

**Context:** Knowledge claims 16 rules (DG_001–DG_016) but only 11 are documented. The code implements exactly those 11. Mark the remaining 5 rule IDs as reserved.

**Step 1: Add "Reserved Rule IDs" section after the soft penalties table**

```markdown
### Reserved Rule IDs (not implemented in v1.0)
| Rule | Intended Purpose | Status |
|---|---|---|
| DG_008 | DC offset detection | Reserved — v2.0 |
| DG_011 | Aliasing detection (Fs < 2.5× Fmax) | Reserved — v2.0 |
| DG_012 | Phase reversal check (multi-channel) | Reserved — multi-sensor |
| DG_014 | Signal duration mismatch | Reserved — v2.0 |
| DG_015 | Cross-channel synchronization | Reserved — multi-sensor |

Rule IDs are non-sequential by design — gaps allow insertion of new rules without renumbering.
```

---

### Task 13: Add Renormalization Formula to 03_FUSE

**Files:**
- Modify: `knowledge/03_FUSE_HealthAssessment.md:43-44`

**Step 1: Replace the renormalization paragraph with explicit formula**

```markdown
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
```

**Step 2: Implement in moduleC_fusion.py**

After the equal-weight fallback (line 107), add renormalization for missing profile blocks:

```python
    # Renormalize weights for blocks actually present
    if weights:
        active_weights = {k: weights[k] for k in request.blocks if k in weights}
        weight_sum = sum(active_weights.values())
        if weight_sum > 0 and weight_sum < 0.99:  # Missing blocks
            active_weights = {k: v / weight_sum for k, v in active_weights.items()}
        weights = active_weights
```

---

### Task 14: Extract Magic Numbers to Module-Level Constants

**Files:**
- Modify: `rapid_ai_engine/modules/moduleA_trend.py`
- Modify: `rapid_ai_engine/modules/moduleBplus_slope.py`
- Modify: `rapid_ai_engine/modules/moduleC_fusion.py`
- Modify: `rapid_ai_engine/modules/moduleD_health.py`
- Modify: `rapid_ai_engine/modules/moduleE_maintenance.py`
- Modify: `rapid_ai_engine/modules/moduleF_rul.py`

**Pattern:** Extract inline magic numbers to named constants at the top of each module. No behavior change.

**Module A constants:**
```python
SEVERITY_MULTIPLIER = 10.0
BASELINE_RATIO_ALARM = 2.0
BASELINE_RATIO_WARNING = 1.5
BASELINE_RATIO_WATCH = 1.2
VARIANCE_CHAOTIC_THRESHOLD = 60.0
VARIANCE_PROCESS_THRESHOLD = 40.0
SLOPE_CHAOTIC_MAX = 0.05
```

**Module B+ constants:**
```python
STEP_JUMP_THRESHOLD = 0.5
CHAOTIC_VOLATILITY_THRESHOLD = 0.3
CHAOTIC_SLOPE_MAX = 0.02
ACCEL_SLOPE_THRESHOLD = 0.05
ACCEL_CHANGE_THRESHOLD = 0.02
DRIFT_SLOPE_THRESHOLD = 0.02
NLI_MULTIPLIER = 5.0
```

**Module C constants (already partially done):** No change needed.

**Module D constants:**
```python
SSI_CRITICAL = 0.80
SSI_UNSTABLE = 0.60
SSI_DEGRADING = 0.30
SLOPE_ESCALATION_UNSTABLE = 0.05
SLOPE_ESCALATION_DEGRADING = 0.02
```

**Module E constants:**
```python
W_SEVERITY = 0.45
W_CONFIDENCE = 0.25
W_CRITICALITY = 0.20
W_URGENCY = 0.10
SAFETY_MULTIPLIER = 1.5
SPARES_PENALTY = 0.7
MANPOWER_PENALTY = 0.7
PRIORITY_IMMEDIATE = 85
PRIORITY_24H = 70
PRIORITY_7D = 50
```

**Module F constants:** Already well-defined (ALPHA_SEVERITY, GAMMA_DEGRADATION, R_TARGET, COMPONENT_WEIBULL). Add:
```python
RUL_MAX_DAYS = 3650.0
ACCEL_MODEL_THRESHOLD = 0.01
INSTABILITY_THRESHOLD = 0.6
```

---

### Task 15: Fix Module A Slope Normalization

**Files:**
- Modify: `rapid_ai_engine/modules/moduleA_trend.py:56-63`

**Context:** Slope is computed over raw sample indices, making it dependent on signal length. A 1000-sample and 10000-sample signal with identical degradation produce different slopes. Normalize by dividing by sample count.

**Step 1: Normalize slope computation**

```python
    # Approximate slope from values — normalized by sample count
    slope = 0.0
    if len(clean) >= 4:
        x = np.arange(len(clean), dtype=float)
        raw_slope = float(np.polyfit(x, clean, 1)[0])
        # Normalize: slope per sample → slope per unit time
        # For consistency, scale to "per 1000 samples"
        slope = raw_slope * min(len(clean), 1000)
```

---

### Task 16: Add Input Validation to main.py Orchestrator

**Files:**
- Modify: `rapid_ai_engine/main.py:132-145`

**Step 1: Add basic validation at the top of evaluate()**

```python
    # ── Input validation ──
    if request.failure_threshold <= 0:
        raise HTTPException(status_code=400, detail="failure_threshold must be positive")
    if not request.signal.values:
        raise HTTPException(status_code=400, detail="signal.values cannot be empty")
    if request.criticality < 0 or request.criticality > 1:
        raise HTTPException(status_code=400, detail="criticality must be between 0 and 1")
```

---

### Task 17: Add State Transition Documentation Note

**Files:**
- Modify: `knowledge/05_Formula_Index.md:172-178`

**Context:** State transitions with hysteresis/persistence are documented but NOT implemented (API is stateless). Add a clear note.

**Step 1: Add implementation note after the state transition table**

```markdown
**Implementation note (v1.0):** State transitions with hysteresis require temporal persistence tracking across multiple API calls. In v1.0 (stateless API), each call is independent — the client is responsible for implementing persistence logic if hysteresis is needed. The thresholds above define the canonical transition rules for client-side implementation.
```

---

### Task 18: Align Endpoint Naming in Knowledge Base

**Files:**
- Modify: `knowledge/08_Canonical_Data_Contracts.md:392-396`

**Step 1: Add clear clarification**

```markdown
### Endpoint Naming: v2 (Modular) vs v3 (Production)

| v2 Modular Spec | v3 Production Spec | Purpose |
|---|---|---|
| `POST /wrapper/run` | `POST /rapid-ai/evaluate` | Full pipeline orchestration |
| `POST /module0/validate` | `POST /rapid-ai/module0` | Data quality gate |
| `POST /moduleB/analyze_initiators` | `POST /rapid-ai/moduleB` | Initiator detection |

The v3 spec (`RAPID_AI_OpenAPI_v3_PRODUCTION_ALIGNED.yaml`) matches the actual FastAPI routes in `main.py`. The v2 spec represents the target modular architecture.
```

---

## Wave 3: Quality & Tests

### Task 19: Add pytest to requirements.txt

**Files:**
- Modify: `rapid_ai_engine/requirements.txt`

**Step 1: Add test dependencies**

```
fastapi>=0.100.0
uvicorn[standard]>=0.23.0
pydantic>=2.0.0
numpy>=1.24.0
pytest>=8.0.0
httpx>=0.27.0
```

httpx is needed for FastAPI TestClient (async).

**Step 2: Install**

```bash
pip install -r rapid_ai_engine/requirements.txt
```

---

### Task 20: Create Test Infrastructure

**Files:**
- Create: `rapid_ai_engine/tests/conftest.py`
- Create: `rapid_ai_engine/tests/test_helpers.py`

**Step 1: Create conftest.py**

```python
"""Shared test fixtures for RAPID AI Engine."""
import pytest
from fastapi.testclient import TestClient
from rapid_ai_engine.main import app


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def sample_signal():
    """Minimal valid signal (256 samples of sine wave + noise)."""
    import numpy as np
    np.random.seed(42)
    t = np.linspace(0, 1, 256)
    values = (2.0 * np.sin(2 * np.pi * 50 * t) + 0.5 * np.random.randn(256)).tolist()
    return values


@pytest.fixture
def sample_request(sample_signal):
    """Minimal valid FullAnalysisRequest payload."""
    return {
        "schema_version": "1.0",
        "asset_id": "TEST-001",
        "timestamp_utc": "2026-02-24T10:00:00Z",
        "machine_type": "pump_train_horizontal",
        "system_type": "pump_train_horizontal",
        "component": "afb",
        "criticality": 0.6,
        "failure_threshold": 8.0,
        "signal": {
            "signal_type": "velocity",
            "direction": "H",
            "unit": "mm/s",
            "sampling_rate_hz": 6400,
            "values": sample_signal,
        },
    }
```

---

### Task 21: Unit Tests — Module 0 (Data Guard)

**Files:**
- Create: `rapid_ai_engine/tests/test_module0.py`

```python
"""Tests for Module 0 — Data Guard."""
import numpy as np
from rapid_ai_engine.schemas import Module0Request, SignalInput, ContextInput, StatusLevel, MountType
from rapid_ai_engine.modules.module0_dataguard import run


def _make_request(values, signal_type="velocity", unit="mm/s", fs=6400, **kwargs):
    return Module0Request(
        asset_id=kwargs.get("asset_id", "TEST-001"),
        timestamp_utc="2026-02-24T10:00:00Z",
        signal=SignalInput(
            signal_type=signal_type, direction="H",
            unit=unit, sampling_rate_hz=fs, values=values,
        ),
        context=kwargs.get("context", None),
    )


class TestHardBlocks:
    def test_dg001_missing_asset_id(self):
        resp = run(_make_request([1.0] * 300, asset_id=""))
        assert resp.block is True
        assert any("DG_001" in r for r in resp.reasons)

    def test_dg002_too_few_samples(self):
        resp = run(_make_request([1.0] * 100))
        assert resp.block is True
        assert any("DG_002" in r for r in resp.reasons)

    def test_dg005_invalid_unit(self):
        resp = run(_make_request([1.0] * 300, unit="invalid"))
        assert resp.block is True
        assert any("DG_005" in r for r in resp.reasons)


class TestSoftPenalties:
    def test_dg003_nan_fraction(self):
        values = [1.0] * 290 + [float("nan")] * 10  # 3.3% NaN
        resp = run(_make_request(values))
        assert resp.block is False
        assert resp.quality_score < 1.0
        assert any("DG_003" in r for r in resp.reasons)

    def test_dg007_flatline(self):
        resp = run(_make_request([5.0] * 300))
        assert resp.block is False
        assert resp.flags.flatline is True
        assert resp.quality_score <= 0.4

    def test_dg013_rpm_missing(self):
        ctx = ContextInput(rpm=None)
        resp = run(_make_request([1.0 + 0.1 * i for i in range(300)], context=ctx))
        assert any("DG_013" in r for r in resp.reasons)
        assert resp.quality_score < 1.0


class TestQualityScoring:
    def test_clean_signal_passes(self):
        np.random.seed(42)
        values = (2.0 * np.sin(np.linspace(0, 10, 300)) + 0.1 * np.random.randn(300)).tolist()
        resp = run(_make_request(values))
        assert resp.block is False
        assert resp.quality_score >= 0.8
        assert resp.status == StatusLevel.passed

    def test_multiple_penalties_multiply(self):
        values = [1.0] * 290 + [float("nan")] * 10  # DG_003: ×0.6
        resp = run(_make_request(values, fs=999))    # DG_006: ×0.7
        assert resp.quality_score <= 0.6 * 0.7 + 0.01  # Allow rounding

    def test_metrics_computed(self):
        values = list(range(300))
        resp = run(_make_request([float(v) for v in values]))
        assert resp.metrics.sample_count == 300
        assert resp.metrics.rms > 0
```

---

### Task 22: Unit Tests — Module A (Trend Engine)

**Files:**
- Create: `rapid_ai_engine/tests/test_moduleA.py`

```python
"""Tests for Module A — Trend Engine."""
import numpy as np
from rapid_ai_engine.schemas import ModuleARequest, SeverityLevel
from rapid_ai_engine.modules.moduleA_trend import run


def _make_request(values, baseline=None):
    return ModuleARequest(
        asset_id="TEST-001", signal_type="velocity", direction="H",
        sampling_rate_hz=6400, values=values, baseline=baseline,
    )


class TestFeatureExtraction:
    def test_rms_computation(self):
        values = [1.0] * 300
        resp = run(_make_request(values))
        assert abs(resp.overall_rms - 1.0) < 0.01

    def test_peak_computation(self):
        values = [0.0] * 299 + [5.0]
        resp = run(_make_request(values))
        assert resp.peak == 5.0

    def test_empty_signal_returns_defaults(self):
        resp = run(_make_request([]))
        assert resp.overall_rms == 0.0


class TestSeverityScoring:
    def test_baseline_ratio_boost_alarm(self):
        resp = run(_make_request([5.0] * 300, baseline=2.0))
        assert resp.severity_score >= 0.9

    def test_baseline_ratio_boost_warning(self):
        resp = run(_make_request([3.0] * 300, baseline=1.8))
        assert resp.severity_score >= 0.7

    def test_no_baseline_uses_slope(self):
        resp = run(_make_request([1.0] * 300))
        assert resp.severity_level in [SeverityLevel.normal, SeverityLevel.watch]


class TestClassification:
    def test_machine_classification(self):
        np.random.seed(42)
        values = (3.0 + 0.1 * np.random.randn(300)).tolist()
        resp = run(_make_request(values))
        assert resp.trend_classification == "machine"
```

---

### Task 23: Unit Tests — Module B (Initiators)

**Files:**
- Create: `rapid_ai_engine/tests/test_moduleB.py`

```python
"""Tests for Module B — Initiator Rules."""
from rapid_ai_engine.schemas import ModuleBRequest
from rapid_ai_engine.modules.moduleB_initiators import run, RULES_DB


class TestRuleLoading:
    def test_all_12_components_populated(self):
        expected = {"afb", "journal", "tpjb", "coupling", "ac_motor",
                    "dc_motor", "foundation", "gears", "fluid_flow",
                    "belts", "chains", "shafts"}
        for comp in expected:
            assert comp in RULES_DB, f"Missing component: {comp}"
            assert len(RULES_DB[comp]) > 0, f"Empty rules for: {comp}"


class TestRuleMatching:
    def test_afb06_imbalance(self):
        """AFB06: H/V >= 1.2, H/V <= 2.0, A/H < 0.3"""
        resp = run(ModuleBRequest(
            asset_id="T1", component="afb",
            metrics={"H": 3.0, "V": 2.0, "A": 0.5, "kurtosis": 2.0, "crest_factor": 1.5, "temperature": 40},
        ))
        rule_ids = [r.rule_id for r in resp.matched_rules]
        assert "AFB06" in rule_ids

    def test_no_match_returns_zero_confidence(self):
        resp = run(ModuleBRequest(
            asset_id="T1", component="afb",
            metrics={"H": 1.0, "V": 1.0, "A": 0.1, "kurtosis": 1.0, "crest_factor": 1.0, "temperature": 30},
        ))
        assert resp.confidence == 0.0

    def test_unknown_component_returns_empty(self):
        resp = run(ModuleBRequest(
            asset_id="T1", component="unknown",
            metrics={"H": 5.0, "V": 1.0, "A": 0.1},
        ))
        assert resp.num_matches == 0


class TestNewComponents:
    def test_tpjb_rules_exist(self):
        assert len(RULES_DB["tpjb"]) == 12

    def test_dc_motor_rules_exist(self):
        assert len(RULES_DB["dc_motor"]) == 7

    def test_belts_rules_exist(self):
        assert len(RULES_DB["belts"]) == 5

    def test_chains_rules_exist(self):
        assert len(RULES_DB["chains"]) == 4
```

---

### Task 24: Unit Tests — Module B+ (Slope)

**Files:**
- Create: `rapid_ai_engine/tests/test_moduleBplus.py`

```python
"""Tests for Module B+ — Slope Intelligence."""
import numpy as np
from rapid_ai_engine.schemas import ModuleBPlusRequest, TrendClass
from rapid_ai_engine.modules.moduleBplus_slope import run


class TestTrendClassification:
    def test_stable_trend(self):
        values = [2.0 + 0.001 * i for i in range(20)]
        resp = run(ModuleBPlusRequest(
            asset_id="T1", timestamps=[f"2026-02-{i+1:02d}" for i in range(20)], values=values,
        ))
        assert resp.trend_class == TrendClass.Stable

    def test_step_detection(self):
        values = [1.0] * 10 + [10.0] * 10
        resp = run(ModuleBPlusRequest(
            asset_id="T1", timestamps=[f"2026-02-{i+1:02d}" for i in range(20)], values=values,
        ))
        assert resp.trend_class == TrendClass.Step

    def test_empty_values(self):
        resp = run(ModuleBPlusRequest(asset_id="T1", timestamps=[], values=[]))
        assert resp.trend_class == TrendClass.Stable
        assert resp.severity_score == 0.0
```

---

### Task 25: Unit Tests — Module B++ (SEDL)

**Files:**
- Create: `rapid_ai_engine/tests/test_moduleBpp.py`

```python
"""Tests for Module B++ — SEDL."""
from rapid_ai_engine.schemas import ModuleBPPRequest, StabilityState, SeverityLevel
from rapid_ai_engine.modules.moduleBpp_sedl import run


class TestPrecomputedMetrics:
    def test_stable_state(self):
        resp = run(ModuleBPPRequest(
            asset_id="T1", metrics={"SE": 0.2, "TE": 0.3, "DE": 0.1, "dSE_dt": 0.001},
        ))
        assert resp.stability_state == StabilityState.Stable
        assert resp.SI >= 0.70

    def test_critical_instability(self):
        resp = run(ModuleBPPRequest(
            asset_id="T1", metrics={"SE": 0.8, "TE": 0.7, "DE": 0.6, "dSE_dt": 0.05},
        ))
        assert resp.stability_state == StabilityState.Critical_Instability
        assert resp.severity_level == SeverityLevel.alarm

    def test_drifting_state(self):
        resp = run(ModuleBPPRequest(
            asset_id="T1", metrics={"SE": 0.45, "TE": 0.3, "DE": 0.2, "dSE_dt": 0.01},
        ))
        assert resp.stability_state == StabilityState.Drifting


class TestSIComputation:
    def test_si_formula(self):
        resp = run(ModuleBPPRequest(
            asset_id="T1", metrics={"SE": 0.4, "TE": 0.3, "DE": 0.2, "dSE_dt": 0.0},
        ))
        expected_si = 1.0 - (0.5 * 0.4 + 0.3 * 0.3 + 0.2 * 0.2)
        assert abs(resp.SI - expected_si) < 0.01
```

---

### Task 26: Unit Tests — Modules C, D, E, F

**Files:**
- Create: `rapid_ai_engine/tests/test_moduleC.py`
- Create: `rapid_ai_engine/tests/test_moduleD.py`
- Create: `rapid_ai_engine/tests/test_moduleE.py`
- Create: `rapid_ai_engine/tests/test_moduleF.py`

These follow the same patterns — test happy path, edge cases, and boundary conditions for each module. Key tests:

**Module C:** SSI computation with known block scores, profile weight verification, process-driven detection, gating rule (stability_state Critical_Instability → SSI floor 0.70).

**Module D:** Health stage thresholds at boundaries (0.29/0.30, 0.59/0.60, 0.79/0.80), slope escalation (Degrading + slope > 0.05 → Unstable).

**Module E:** Priority formula verification against hand-calculated values, safety multiplier effect, action selection from diagnosis keywords.

**Module F:** RUL model selection (linear vs accelerating), boundary cases (current >= threshold → RUL=0, zero slope → 3650), Weibull computation (beta_adj/eta_adj), instability adjustment.

---

### Task 27: Integration Test — Full Pipeline

**Files:**
- Create: `rapid_ai_engine/tests/test_pipeline.py`

```python
"""Integration tests for full RAPID AI pipeline."""
import numpy as np


class TestFullPipeline:
    def test_healthy_scenario(self, client, sample_request):
        resp = client.post("/rapid-ai/evaluate", json=sample_request)
        assert resp.status_code == 200
        data = resp.json()
        assert data["asset_id"] == "TEST-001"
        assert data["health_stage"] in ["Healthy", "Degrading"]
        assert data["confidence"] >= 0.0
        assert data["module_trace"]["module0"] is not None

    def test_blocked_by_quality(self, client, sample_request):
        sample_request["signal"]["values"] = [1.0] * 100  # Too few
        resp = client.post("/rapid-ai/evaluate", json=sample_request)
        assert resp.status_code == 200
        data = resp.json()
        assert data["health_stage"] == "Blocked"

    def test_critical_scenario(self, client):
        np.random.seed(42)
        values = (8.0 + 2.0 * np.random.randn(300)).tolist()
        req = {
            "schema_version": "1.0",
            "asset_id": "CRIT-001",
            "timestamp_utc": "2026-02-24T10:00:00Z",
            "machine_type": "pump_train_horizontal",
            "system_type": "pump_train_horizontal",
            "component": "afb",
            "criticality": 0.9,
            "failure_threshold": 8.0,
            "signal": {
                "signal_type": "velocity", "direction": "H",
                "unit": "mm/s", "sampling_rate_hz": 6400,
                "values": values,
            },
        }
        resp = client.post("/rapid-ai/evaluate", json=req)
        assert resp.status_code == 200

    def test_all_module_endpoints_respond(self, client):
        """Smoke test: each individual module endpoint returns 200."""
        # Module 0
        resp = client.post("/rapid-ai/module0", json={
            "asset_id": "T1", "timestamp_utc": "2026-02-24T10:00:00Z",
            "signal": {"signal_type": "velocity", "direction": "H",
                       "unit": "mm/s", "sampling_rate_hz": 6400,
                       "values": [1.0] * 300},
        })
        assert resp.status_code == 200
```

---

### Task 28: Add OR-Logic to Module B Rules

**Files:**
- Modify: `rapid_ai_engine/modules/moduleB_initiators.py`

**Context:** AFB02 has a comment `# OR H_V < 0.6` but the code only supports AND-logic. Add OR-condition support.

**Step 1: Add `or_conditions` field to rule definitions**

```python
{"rule_id": "AFB02", "initiator": "Wrong Clearance",
 "diagnosis": "Incorrect internal clearance shifts stiffness and load zones",
 "conditions": [("H_V_ratio", ">=", 1.6)],
 "or_conditions": [("H_V_ratio", "<", 0.6)],  # Alternative trigger
 "severity_base": 0.5},
```

**Step 2: Update evaluation logic in run()**

```python
    for rule in rules:
        conditions = rule["conditions"]
        or_conditions = rule.get("or_conditions", [])
        all_met = True
        triggered = []

        for (metric_key, op, thresh) in conditions:
            val = derived.get(metric_key, 0.0)
            if _eval_condition(val, op, thresh):
                triggered.append({"expr": metric_key, "op": op, "threshold": thresh, "value": round(val, 4)})
            else:
                all_met = False
                break

        # Check OR conditions if AND conditions didn't match
        if not all_met and or_conditions:
            for (metric_key, op, thresh) in or_conditions:
                val = derived.get(metric_key, 0.0)
                if _eval_condition(val, op, thresh):
                    all_met = True
                    triggered = [{"expr": metric_key, "op": op, "threshold": thresh, "value": round(val, 4)}]
                    break

        if all_met and triggered:
            matched.append(MatchedRule(...))
```

---

### Task 29: Improve Module E Keyword Matching

**Files:**
- Modify: `rapid_ai_engine/modules/moduleE_maintenance.py:79-83`

**Context:** Current keyword matching is exact substring. "imbalanced" won't match "imbalance". Use broader matching.

**Step 1: Add stem matching**

```python
# Extended keyword matching with common stems
DIAGNOSIS_ACTION_MAP = {
    "imbalanc": ["ACT004", "ACT001"],     # matches imbalance, imbalanced, unbalanced
    "unbalanc": ["ACT004", "ACT001"],
    "misalign": ["ACT003", "ACT001"],     # matches misalignment, misaligned
    "bearing": ["ACT002", "ACT005"],
    "lubric": ["ACT002"],                  # matches lubrication, lubricant
    "loose": ["ACT006", "ACT001"],         # matches looseness, loose
    "foundation": ["ACT006"],
    "process": ["ACT007"],
    "critical": ["ACT008"],
    "shutdown": ["ACT008"],
    "cavitat": ["ACT007", "ACT001"],       # matches cavitation
    "resonan": ["ACT006", "ACT001"],       # matches resonance
}
```

---

### Task 30: Run All Tests and Verify

**Step 1: Run full test suite**

```bash
cd D:/rapidai && python -m pytest rapid_ai_engine/tests/ -v --tb=short
```

Expected: All tests pass.

**Step 2: Run the API server to verify no import errors**

```bash
python -m uvicorn rapid_ai_engine.main:app --host 0.0.0.0 --port 8000 &
curl http://localhost:8000/health
```

Expected: `{"status": "ok", "engine": "RAPID AI", "version": "1.0.0"}`

---

## Summary of Changes

### Knowledge Base (10 files modified)
| File | Changes |
|---|---|
| 01_GUARD | Add reserved rule IDs section |
| 02_SENSE | Fix NLI formula |
| 03_FUSE | Fix BPP_state naming, add renormalization formula |
| 04_ACT | Add frozen Weibull coefficient values |
| 05_Formula_Index | Fix confidence formulas, NLI, trend classification, entropy notation, Weibull coefficients, state transition note |
| 08_Canonical_Data_Contracts | Clarify endpoint naming |

### Python API (12 files modified, 10 files created)
| File | Changes |
|---|---|
| schemas.py | Remove MachineState, fix health_stage type, add stability_state to ModuleCRequest |
| main.py | Fix enum comparison, add input validation, pass stability_state to Module C, fix health_stage assignment |
| moduleA_trend.py | Extract constants, fix slope normalization, add error handling |
| moduleB_initiators.py | Add 28 rules (TPJB/DC/Belts/Chains), add OR-logic |
| moduleBplus_slope.py | Extract constants, add error handling |
| moduleBpp_sedl.py | Add error handling |
| moduleC_fusion.py | Add gating rule, add renormalization, add error handling |
| moduleD_health.py | Extract constants, add error handling |
| moduleE_maintenance.py | Extract constants, improve keyword matching, add error handling |
| moduleF_rul.py | Extract constants, add error handling |
| requirements.txt | Add pytest, httpx |
| tests/* (10 files) | Full test suite |
