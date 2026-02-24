# Stage 1: GUARD — Data Quality Gate

_Module 0 (Data Guard) — Pre-flight validation before any analytics_

---

## Purpose

Every request the client sends must pass through GUARD before entering the engine. Even though the client is responsible for data cleanup and feature extraction, bad or malformed data can still arrive — corrupted signals, wrong units, insufficient samples, flatlines. GUARD validates what the client sends and produces a quality score that propagates through all downstream calculations. Bad data produces confident wrong diagnoses; GUARD prevents that.

### Implementation Notes
- JSON schema validation layer runs first — reject malformed payloads before any processing
- Validate `schema_version` field matches expected version
- Validate timestamp continuity (detect time gaps in historical series)
- Apply unit normalization (convert inch/s to mm/s, etc.)
- Return quality metadata alongside validation result
- Quality score feeds directly into `S_eff = S_fusion × Q_data` and `C_final = Q_data × (1 − ∏(1 − C_i))`

---

## Quality Score Formula

```
quality_score = ∏(penalty_i)   for all triggered soft rules
```
- Clamped to [0, 1]
- Hard block → quality_score = 0.0, pipeline aborts
- Soft penalties multiply (e.g., 0.6 × 0.8 = 0.48)
- quality_score feeds into: S_eff = S_fusion × Q_data

### Status Levels
| quality_score | Status |
|---|---|
| ≥ 0.80 | pass |
| 0.50–0.80 | warn (proceed with reduced confidence) |
| < 0.50 | fail |
| 0.0 (hard block) | block (pipeline aborts) |

---

## Data Guard Rules

### Hard Blocks (pipeline aborts)

| Rule | Condition | Action |
|---|---|---|
| DG_001 | Missing asset_id or timestamp | Block |
| DG_002 | len(values) < 256 samples | Block |
| DG_005 | Unit not in allowed set for signal type | Block |

### Soft Penalties (reduce quality_score)

| Rule | Condition | Penalty | Effect |
|---|---|---|---|
| DG_003 | nan_fraction > 0.01 | ×0.6 | NaN contamination |
| DG_004 | clip_fraction > 0.01 | ×0.5 | Sensor saturation |
| DG_006 | Sampling rate not in allowed set | ×0.7 | Suspect acquisition |
| DG_007 | Flatline (std of diff < 1e-6) | ×0.4 | Dead sensor |
| DG_009 | Z-score outlier fraction > 0.02 | ×0.9 | Burst noise |
| DG_010 | kurtosis > 8 OR crest_factor > 6 | ×0.6 | Spike burst |
| DG_013 | RPM missing from context | ×0.85 | Reduced feature set |
| DG_016 | Magnet mount + RMS > 10 | ×0.8 | Mount slip risk |

### Reserved Rule IDs (not implemented in v1.0)
| Rule | Intended Purpose | Status |
|---|---|---|
| DG_008 | DC offset detection | Reserved — v2.0 |
| DG_011 | Aliasing detection (Fs < 2.5× Fmax) | Reserved — v2.0 |
| DG_012 | Phase reversal check (multi-channel) | Reserved — multi-sensor |
| DG_014 | Signal duration mismatch | Reserved — v2.0 |
| DG_015 | Cross-channel synchronization | Reserved — multi-sensor |

Rule IDs are non-sequential by design — gaps allow insertion of new rules without renumbering.

---

## Allowed Values

### Units per Signal Type
| Signal Type | Allowed Units |
|---|---|
| velocity | mm/s, inch/s, in/s |
| acceleration | g, m/s², m/s2 |
| displacement | µm, um, mm, mil |

### Sampling Rates (Hz)
| Signal Type | Allowed |
|---|---|
| velocity | 256, 512, 1024, 2048, 2560, 5120, 6400, 10240, 25600, 51200 |
| acceleration | 256, 512, 1024, 2048, 2560, 5120, 6400, 10240, 25600, 51200 |
| displacement | 256, 512, 1024, 2048, 2560, 5120, 6400 |

---

## DSP Frozen Parameters

| Parameter | Value | Notes |
|---|---|---|
| Default sampling rate | 6400 Hz | Fixed for v1.0 |
| Fmax | sampling_rate / 2.5 | Nyquist with margin |
| Min FFT samples | 1024 (preferred 2048) | |
| Min window duration | ≥ 1.0 second | |
| Band-limited RMS | 1–1000 Hz | |
| Envelope band | 1000–5000 Hz | |

---

## Computed Metrics (output)

| Metric | Formula |
|---|---|
| sample_count | len(values) |
| nan_fraction | count(NaN) / sample_count |
| std_dev | std(clean_values, ddof=1) |
| rms | sqrt(mean(clean² )) |
| peak | max(abs(clean)) |
| crest_factor | peak / rms |
| kurtosis | mean(((x-μ)/σ)⁴) − 3 (excess) |
| clip_fraction | count(vals at sensor extremes) / len |

---

## API Contract

**Endpoint:** `POST /rapid-ai/module0`

**Request:**
```json
{
  "schema_version": "1.0",
  "trace_id": "optional-uuid",
  "asset_id": "P-101A",
  "timestamp_utc": "2026-02-23T10:00:00Z",
  "signal": {
    "signal_type": "velocity",
    "direction": "H",
    "unit": "mm/s",
    "sampling_rate_hz": 6400,
    "values": [1.1, 2.2, ...]
  },
  "context": {
    "rpm": 1480,
    "temperature_c": 58,
    "sensor_id": "S-101",
    "mount_type": "stud",
    "location": "DE"
  }
}
```

**Response:**
```json
{
  "module": "Module0_DataGuard",
  "status": "pass|warn|fail|block",
  "block": false,
  "quality_score": 0.72,
  "flags": { "flatline": false, "nan_present": true, ... },
  "reasons": ["DG_003: NaN fraction 0.015 > 0.01"],
  "metrics": { "rms": 3.21, "peak": 5.4, "kurtosis": 2.1, ... },
  "confidence_modifier": 0.72,
  "execution_time_ms": 1.2
}
```
