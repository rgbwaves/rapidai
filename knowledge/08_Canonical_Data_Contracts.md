# RAPID AI — Canonical Data Schema & JSON Contracts

_Input/output data shapes, example payloads, and schema versioning_

---

## Schema Version

All payloads carry `schema_version: "1.0"`. This is frozen for v1.0 of the API. Breaking changes require a version bump.

---

## Canonical Input Payload (Edge → RAPID AI)

The full payload a client sends to the flagship endpoint:

```json
{
  "schema_version": "1.0",
  "trace_id": "optional-uuid-for-tracing",
  "asset_id": "P-101A",
  "timestamp_utc": "2026-02-23T10:01:00Z",
  "machine_type": "pump_train_horizontal",
  "component": "afb",
  "criticality": 0.7,
  "signal": {
    "signal_type": "velocity",
    "direction": "H",
    "unit": "mm/s",
    "sampling_rate_hz": 6400,
    "values": [1.1, 2.2, 3.1, 2.8, "... (min 256 samples)"]
  },
  "context": {
    "rpm": 1480,
    "temperature_c": 58,
    "sensor_id": "S-101",
    "mount_type": "stud",
    "location": "DE"
  },
  "history": {
    "timestamps": ["2026-02-16T10:00:00Z", "2026-02-17T10:00:00Z", "..."],
    "values": [2.8, 3.0, 3.2, 3.5, "... (historical trend)"]
  },
  "thresholds": {
    "failure_threshold": 11.0,
    "baseline": 2.5
  }
}
```

### Required vs Optional Fields

| Field | Required | Notes |
|---|---|---|
| schema_version | Yes | Must be "1.0" |
| asset_id | Yes | Unique identifier per asset |
| timestamp_utc | Yes | ISO 8601 UTC |
| machine_type | Yes | pump/gearbox/fan (selects machine profile) |
| component | Yes | One of 12 component types |
| signal.signal_type | Yes | velocity/acceleration/displacement |
| signal.direction | Yes | H/V/A |
| signal.unit | Yes | Must match allowed units for signal_type |
| signal.sampling_rate_hz | Yes | Must be in allowed set |
| signal.values | Yes | Min 256 samples |
| context.rpm | Recommended | Needed for frequency analysis |
| history.timestamps | Recommended | Needed for B+ slope analysis |
| history.values | Recommended | Needed for B+ slope + F RUL |
| thresholds.failure_threshold | Recommended | Needed for Module F RUL |
| thresholds.baseline | Optional | Enables degradation scoring |
| criticality | Optional | Default 0.5. Affects priority scoring |
| trace_id | Optional | For distributed tracing |

---

## Per-Module Output Examples

### Module 0 — Data Guard
```json
{
  "module": "Module0_DataGuard",
  "status": "pass",
  "block": false,
  "quality_score": 0.98,
  "flags": {
    "flatline": false,
    "nan_present": false,
    "clipping": false,
    "spike_burst": false
  },
  "reasons": [],
  "metrics": {
    "sample_count": 6400,
    "nan_fraction": 0.0,
    "rms": 3.21,
    "peak": 5.4,
    "crest_factor": 1.68,
    "kurtosis": 2.1
  },
  "confidence_modifier": 0.98,
  "execution_time_ms": 1.2
}
```

### Module A — Feature Extraction & Severity
```json
{
  "module": "ModuleA_Trend",
  "asset_id": "P-101A",
  "overall_rms": 3.21,
  "peak": 5.4,
  "kurtosis": 2.1,
  "crest_factor": 1.68,
  "ratio_to_baseline": 1.28,
  "degradation": 0.284,
  "severity_score": 0.65,
  "severity_level": "warning",
  "trend_classification": "machine",
  "execution_time_ms": 12.3
}
```

### Module B — Initiator Detection
```json
{
  "module": "ModuleB_Initiators",
  "component": "afb",
  "num_matches": 2,
  "matched_rules": [
    {
      "rule_id": "AFB06",
      "initiator": "Shaft Imbalance",
      "diagnosis": "imbalance affecting bearing",
      "score": 2.0,
      "triggered_conditions": [
        {"expr": "H/V", "op": ">=", "threshold": 1.2, "value": 1.35}
      ]
    }
  ],
  "confidence": 0.72,
  "execution_time_ms": 3.1
}
```

### Module B+ — Slope Intelligence
```json
{
  "module": "ModuleBplus_Slope",
  "asset_id": "P-101A",
  "slope_log": 0.012,
  "slope_change": 0.003,
  "instability_index_NLI": 0.35,
  "trend_class": "Drift",
  "severity_score": 0.50,
  "confidence": 0.68,
  "execution_time_ms": 5.2
}
```

### Module B++ — SEDL (Entropy)
```json
{
  "module": "ModuleBpp_SEDL",
  "asset_id": "P-101A",
  "SE": 0.42,
  "TE": 0.38,
  "DE": 0.31,
  "dSE_dt": 0.008,
  "SI": 0.64,
  "stability_state": "Drifting",
  "severity_level": "watch",
  "triggered_rules": ["SR02"],
  "execution_time_ms": 8.7
}
```

### Module C — Fusion (SSI)
```json
{
  "module": "ModuleC_Fusion",
  "system_type": "pump_train_horizontal",
  "profile_id": "PROFILE_PUMP_A",
  "SSI": 0.52,
  "system_state": "degrading",
  "top_contributors": [
    {"block": "afb", "score": 0.65, "state": "degrading"},
    {"block": "fluid_flow", "score": 0.45, "state": "watch"}
  ],
  "recommended_action": "alert",
  "execution_time_ms": 2.1
}
```

### Module D — Health Stage
```json
{
  "module": "ModuleD_Health",
  "degradation_stage": "Degrading",
  "rul_band": "1-6 months",
  "escalation_level": "Level_1",
  "recommended_action": "Schedule inspection",
  "execution_time_ms": 0.5
}
```

### Module E — Maintenance Plan
```json
{
  "module": "ModuleE_Maintenance",
  "plan_items": [
    {
      "rank": 1,
      "priority_score": 73.8,
      "window": "24 hours",
      "action_id": "ACT004",
      "action_title": "Balance correction (single / dual plane)",
      "justification": "1x dominance with horizontal preference indicates imbalance",
      "verification": "1x amplitude reduced by >= 50% post-correction"
    },
    {
      "rank": 2,
      "priority_score": 73.8,
      "window": "24 hours",
      "action_id": "ACT001",
      "action_title": "Vibration re-measure (confirmation run)",
      "justification": "Confirm trend before committing to intervention",
      "verification": "Compare new RMS to previous within +/- 10%"
    }
  ],
  "total_actions": 2,
  "execution_time_ms": 0.12
}
```

### Module F — RUL & Failure Probability
```json
{
  "module": "ModuleF_RUL",
  "RUL_days": 80.12,
  "failure_probability_30d": 0.225,
  "confidence": 0.72,
  "risk_index": 50.4,
  "recommended_window": "Planned",
  "model_used": "linear",
  "execution_time_ms": 0.08
}
```

---

## Full Pipeline Response (Flagship Endpoint)

`POST /rapid-ai/evaluate` returns the combined output:

```json
{
  "trace_id": "uuid-string",
  "asset_id": "P-101A",
  "timestamp_utc": "2026-02-23T10:01:00Z",

  "guard": {
    "status": "pass",
    "quality_score": 0.98
  },

  "sense": {
    "features": { "rms": 3.21, "peak": 5.4, "severity_score": 0.65 },
    "initiators": { "component": "afb", "num_matches": 2, "top_rule": "AFB06" },
    "trend": { "slope_log": 0.012, "trend_class": "Drift" },
    "entropy": { "SI": 0.64, "stability_state": "Drifting" }
  },

  "fuse": {
    "SSI": 0.52,
    "system_state": "degrading",
    "health_stage": "Degrading",
    "escalation_level": "Level_1"
  },

  "act": {
    "priority_score": 73.8,
    "window": "24 hours",
    "actions": ["ACT004", "ACT001"],
    "RUL_days": 80.12,
    "failure_probability_30d": 0.225,
    "risk_index": 50.4
  },

  "severity_level": "warning",
  "confidence": 0.72,

  "insight": "Pump P-101A is showing signs of impeller imbalance with moderate confidence (72%). The vibration trend is rising steadily but not accelerating — estimated 80 days before reaching the failure threshold. Recommended action: schedule a balance correction within 24 hours. A confirmation measurement run is also recommended to validate the diagnosis before committing to the correction.",

  "execution_time_ms": 45.2,
  "modules_executed": ["Module0", "ModuleA", "ModuleB", "ModuleBplus", "ModuleBpp", "ModuleC", "ModuleD", "ModuleE", "ModuleF"]
}
```

---

## OpenAPI Specifications

Both specs are included in the knowledge folder:

| File | Version | Lines | Purpose |
|---|---|---|---|
| `RAPID_AI_OpenAPI_v2_MODULAR.yaml` | v2 (1114 lines) | Target | Full modular spec — per-module ping endpoints, /module0/validate, /wrapper/run orchestration, typed schemas with enums |
| `RAPID_AI_OpenAPI_v3_PRODUCTION_ALIGNED.yaml` | v3 (345 lines) | Current | Production-aligned version matching actual FastAPI route names |

The **v3 spec** is the source of truth for current implementation. The **v2 spec** represents the comprehensive target modular architecture and is the canonical reference for schema types.

---

## Canonical Enumerations (from OpenAPI v2)

### Signal Types
```
velocity | acceleration | displacement | current | temperature | other
```

### Directions
```
H | V | A | R | T | X | Y | Z
```

### Component Types (12)
```
afb | journal | tpjb | coupling | ac_motor | dc_motor |
foundation | gears | fluid_flow | belts | chains | shafts
```

### Severity Levels
```
normal | watch | warning | alarm
```

### Trend Classes (Module B+)
```
Stable | Drift | Accelerating | Step | Chaotic
```

### Stability States (Module B++ / SEDL)
```
Stable | Drifting | Destabilizing | Chaotic | Critical_Instability
```

### Stability Classes (Module B+ output)
```
stable | marginal | unstable
```

### Slope Methods
```
linear_regression | log_regression
```

### Audit Event Types (Module F)
```
analysis_run | config_change | override | deployment | incident
```

---

## API Endpoints (Complete Map)

### Health Checks
| Endpoint | Module |
|---|---|
| `GET /` | Root service alive |
| `GET /ping` | Module A ping |
| `GET /module0/ping` | Module 0 ping (returns rules_loaded count) |
| `GET /moduleB/ping` | Module B ping (returns sheets_loaded + sheet_names) |
| `GET /moduleBplus/ping` | Module B+ ping |
| `GET /moduleBpp/ping` | Module B++ ping (returns thresholds_loaded + state_rules_loaded) |
| `GET /moduleC/ping` | Module C ping |
| `GET /moduleD/ping` | Module D ping |
| `GET /moduleE/ping` | Module E ping |
| `GET /moduleF/ping` | Module F ping |

### Analysis Endpoints
| Endpoint | Module | Description |
|---|---|---|
| `POST /module0/validate` | Module 0 | Validate + normalize + DQ score |
| `POST /analyze` | Module A | Full analysis (trend + fusion + fault summary) |
| `POST /analyze_trend` | Module A | Convenience endpoint (velocity/H default) |
| `POST /moduleB/analyze_initiators` | Module B | Evaluate initiator rules for a component |
| `POST /moduleBplus/evaluate` | Module B+ | Compute windowed slope + stability flags |
| `POST /moduleBpp/evaluate` | Module B++ | Evaluate SEDL stability state |
| `POST /moduleC/evaluate` | Module C | Compute SSI and system state |
| `POST /moduleD/evaluate` | Module D | Map initiators + SSI to fault mechanisms |
| `POST /moduleE/plan` | Module E | Convert diagnosis into prioritized plan |
| `POST /moduleF/audit_event` | Module F | Store audit event for traceability |
| `POST /wrapper/run` | Wrapper | **Orchestration pipeline** (0 → F) for single asset window |

### Endpoint Naming: v2 (Modular) vs v3 (Production)

| v2 Modular Spec | v3 Production Spec | Purpose |
|---|---|---|
| `POST /wrapper/run` | `POST /rapid-ai/evaluate` | Full pipeline orchestration |
| `POST /module0/validate` | `POST /rapid-ai/module0` | Data quality gate |
| `POST /moduleB/analyze_initiators` | `POST /rapid-ai/moduleB` | Initiator detection |

The v3 spec (`RAPID_AI_OpenAPI_v3_PRODUCTION_ALIGNED.yaml`) matches the actual FastAPI routes in `main.py`. The v2 spec represents the target modular architecture.

### Wrapper / Orchestration Endpoint

`POST /wrapper/run` is the full pipeline orchestration endpoint (equivalent to `/rapid-ai/evaluate` in v3):

**Request:**
```json
{
  "schema_version": "1.0",
  "asset_id": "P-101A",
  "system_type": "pump_train_horizontal",
  "inputs": {
    "signal": {
      "signal_type": "velocity",
      "direction": "H",
      "unit": "mm/s",
      "sampling_rate_hz": 2560
    },
    "features": {
      "overall_rms": 2.8,
      "peak": 4.0,
      "kurtosis": 6.2,
      "crest_factor": 3.1,
      "hf_band_5_9khz": 2.2
    },
    "context": {
      "rpm": 1480,
      "temperature_c": 58
    }
  }
}
```

**Response:** Unified output bundle with all module results (module0 through moduleF).

---

## DSP Processing Parameters (Frozen v1.0)

| Parameter | Value | Notes |
|---|---|---|
| Default sampling rate | 6400 Hz | Fixed for v1.0 |
| Fmax | sampling_rate / 2.5 | Nyquist with safety margin |
| FFT window | Hanning | Standard vibration analysis window |
| FFT overlap | 50% | Reduces spectral leakage |
| Frequency resolution | sampling_rate / N | Where N = FFT size |
| Min FFT samples | 1024 (preferred 2048) | |
| Min window duration | >= 1.0 second | |
| Band-limited RMS | 1–1000 Hz | |
| Envelope band | 1000–5000 Hz | |
| FFT extraction | 1x, 2x, sidebands, HF bands | From Module A |
