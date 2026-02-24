# RAPID AI — Zen Architecture & Production Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform RAPID AI from prototype to production — clean Zen of Python backend architecture with externalized rules, structured logging, and pipeline context; plus a live API-driven dashboard with client-generated payloads, signal generator, and new visualizations.

**Architecture:** Two parallel streams. Stream 1 (Backend): extract shared config, externalize rules to YAML, introduce PipelineContext, add structlog, create exception hierarchy, decompose long functions. Stream 2 (Dashboard): replace mock data with live API client, add Request Builder with signal generator, add signal waveform and pipeline timeline charts, refactor ModuleExplorer into tab components. Streams are independent — same API contract.

**Tech Stack:** Python 3.13 / FastAPI / Pydantic v2 / structlog / PyYAML | React 18 / TypeScript / Vite / Tailwind CSS / Recharts

---

## Stream 1: Backend Architecture (Zen of Python)

### Task 1: Add dependencies (structlog, PyYAML)

**Files:**
- Modify: `rapid_ai_engine/requirements.txt`

**Step 1: Add structlog and PyYAML to requirements**

```
fastapi>=0.100.0
uvicorn[standard]>=0.23.0
pydantic>=2.0.0
numpy>=1.24.0
pytest>=8.0.0
httpx>=0.27.0
structlog>=24.0.0
pyyaml>=6.0.0
```

**Step 2: Install**

Run: `pip install -r rapid_ai_engine/requirements.txt`
Expected: All packages install successfully.

**Step 3: Commit**

```bash
git add rapid_ai_engine/requirements.txt
git commit -m "chore: add structlog and pyyaml dependencies"
```

---

### Task 2: Create shared config — single source of truth

**Files:**
- Create: `rapid_ai_engine/config.py`
- Test: `rapid_ai_engine/tests/test_config.py`

**Step 1: Write the failing test**

```python
"""Tests for shared config — single source of truth for thresholds."""
import pytest
from rapid_ai_engine.config import (
    SEVERITY_THRESHOLDS,
    SSI_THRESHOLDS,
    WEIBULL_COEFFICIENTS,
    SEDL_WEIGHTS,
    classify_severity,
    classify_ssi,
)
from rapid_ai_engine.schemas import SeverityLevel, SystemState


class TestSeverityClassification:
    def test_normal(self):
        assert classify_severity(0.0) == SeverityLevel.normal
        assert classify_severity(0.29) == SeverityLevel.normal

    def test_watch(self):
        assert classify_severity(0.30) == SeverityLevel.watch
        assert classify_severity(0.49) == SeverityLevel.watch

    def test_warning(self):
        assert classify_severity(0.50) == SeverityLevel.warning
        assert classify_severity(0.79) == SeverityLevel.warning

    def test_alarm(self):
        assert classify_severity(0.80) == SeverityLevel.alarm
        assert classify_severity(1.0) == SeverityLevel.alarm


class TestSSIClassification:
    def test_stable(self):
        assert classify_ssi(0.0) == SystemState.stable
        assert classify_ssi(0.29) == SystemState.stable

    def test_degrading(self):
        assert classify_ssi(0.30) == SystemState.degrading
        assert classify_ssi(0.59) == SystemState.degrading

    def test_unstable(self):
        assert classify_ssi(0.60) == SystemState.unstable
        assert classify_ssi(0.79) == SystemState.unstable

    def test_critical(self):
        assert classify_ssi(0.80) == SystemState.critical
        assert classify_ssi(1.0) == SystemState.critical


class TestConstants:
    def test_severity_thresholds_complete(self):
        assert len(SEVERITY_THRESHOLDS) == 4
        assert SeverityLevel.normal in SEVERITY_THRESHOLDS

    def test_weibull_coefficients(self):
        assert WEIBULL_COEFFICIENTS["alpha_severity"] == 0.8
        assert WEIBULL_COEFFICIENTS["gamma_degradation"] == 0.6
        assert WEIBULL_COEFFICIENTS["r_target"] == 0.90

    def test_sedl_weights_sum_to_one(self):
        assert abs(sum(SEDL_WEIGHTS.values()) - 1.0) < 0.001
```

**Step 2: Run test to verify it fails**

Run: `python -m pytest rapid_ai_engine/tests/test_config.py -v`
Expected: FAIL with "ModuleNotFoundError: No module named 'rapid_ai_engine.config'"

**Step 3: Write the implementation**

```python
"""
RAPID AI — Shared Configuration (Single Source of Truth)

All cross-cutting thresholds, coefficients, and classification functions
live here. Modules import from config instead of defining their own.

Zen of Python: "There should be one -- and preferably only one -- obvious way to do it."
"""
from .schemas import SeverityLevel, SystemState


# ─── Severity Thresholds ─────────────────────────────────────
# Used by: Module A, main.py (final severity), Module E (urgency)
SEVERITY_THRESHOLDS = {
    SeverityLevel.normal:  (0.0, 0.30),
    SeverityLevel.watch:   (0.30, 0.50),
    SeverityLevel.warning: (0.50, 0.80),
    SeverityLevel.alarm:   (0.80, 1.01),  # 1.01 to include 1.0
}


# ─── SSI / System State Thresholds ───────────────────────────
# Used by: Module C (_ssi_to_state), Module D (health stages)
SSI_THRESHOLDS = {
    SystemState.stable:    (0.0, 0.30),
    SystemState.degrading: (0.30, 0.60),
    SystemState.unstable:  (0.60, 0.80),
    SystemState.critical:  (0.80, 1.01),
}


# ─── Weibull Reliability Coefficients ────────────────────────
# Used by: Module F (_compute_reliability)
WEIBULL_COEFFICIENTS = {
    "alpha_severity": 0.8,
    "gamma_degradation": 0.6,
    "r_target": 0.90,
}


# ─── SEDL Entropy Weights ────────────────────────────────────
# Used by: Module B++ (SI computation)
SEDL_WEIGHTS = {
    "SE": 0.5,
    "TE": 0.3,
    "DE": 0.2,
}


# ─── Slope / Trend Thresholds ────────────────────────────────
# Used by: Module B+, Module D (escalation)
SLOPE_THRESHOLDS = {
    "step_jump": 0.5,
    "chaotic_volatility": 0.3,
    "chaotic_slope_max": 0.02,
    "accel_slope": 0.05,
    "accel_change": 0.02,
    "drift_slope": 0.02,
    "nli_multiplier": 5.0,
    "escalation_unstable": 0.05,
    "escalation_degrading": 0.02,
}


# ─── Module E Priority Weights ───────────────────────────────
PRIORITY_WEIGHTS = {
    "severity": 0.45,
    "confidence": 0.25,
    "criticality": 0.20,
    "urgency": 0.10,
}

PRIORITY_MODIFIERS = {
    "safety_multiplier": 1.5,
    "spares_penalty": 0.7,
    "manpower_penalty": 0.7,
}

PRIORITY_WINDOWS = {
    "immediate": 85,
    "24h": 70,
    "7d": 50,
}


# ─── Module A Feature Thresholds ─────────────────────────────
FEATURE_THRESHOLDS = {
    "severity_multiplier": 10.0,
    "baseline_ratio_alarm": 2.0,
    "baseline_ratio_warning": 1.5,
    "baseline_ratio_watch": 1.2,
    "variance_chaotic": 60.0,
    "variance_process": 40.0,
    "slope_chaotic_max": 0.05,
}


# ─── Classification Functions ────────────────────────────────

def classify_severity(score: float) -> SeverityLevel:
    """Classify a severity score into a SeverityLevel."""
    for level, (low, high) in SEVERITY_THRESHOLDS.items():
        if low <= score < high:
            return level
    return SeverityLevel.alarm  # Fallback for score >= 1.0


def classify_ssi(ssi: float) -> SystemState:
    """Classify an SSI value into a SystemState."""
    for state, (low, high) in SSI_THRESHOLDS.items():
        if low <= ssi < high:
            return state
    return SystemState.critical  # Fallback for SSI >= 1.0
```

**Step 4: Run tests to verify they pass**

Run: `python -m pytest rapid_ai_engine/tests/test_config.py -v`
Expected: All 11 tests PASS.

**Step 5: Commit**

```bash
git add rapid_ai_engine/config.py rapid_ai_engine/tests/test_config.py
git commit -m "feat: add shared config — single source of truth for all thresholds"
```

---

### Task 3: Create exception hierarchy

**Files:**
- Create: `rapid_ai_engine/exceptions.py`

**Step 1: Write the exception module**

```python
"""
RAPID AI — Exception Hierarchy

Zen of Python: "Errors should never pass silently. Unless explicitly silenced."

Specific exceptions replace bare `except Exception` throughout the codebase.
"""


class RapidAIError(Exception):
    """Base exception for all RAPID AI errors."""
    pass


class DataQualityError(RapidAIError):
    """Raised when Module 0 detects data quality issues that block the pipeline."""
    pass


class RuleEvaluationError(RapidAIError):
    """Raised when rule evaluation fails (Module B, C, E)."""
    pass


class PipelineAbortError(RapidAIError):
    """Raised when the pipeline must abort (data quality block, missing module output)."""
    pass


class ConfigurationError(RapidAIError):
    """Raised when configuration (rules, profiles, thresholds) is invalid."""
    pass
```

**Step 2: Commit**

```bash
git add rapid_ai_engine/exceptions.py
git commit -m "feat: add exception hierarchy for specific error handling"
```

---

### Task 4: Externalize rules to YAML — rule loader

**Files:**
- Create: `rapid_ai_engine/rules/__init__.py`
- Create: `rapid_ai_engine/rules/loader.py`
- Create: `rapid_ai_engine/rules/actions.yaml`
- Create: `rapid_ai_engine/rules/profiles.yaml`
- Create: `rapid_ai_engine/rules/block_scores.yaml`
- Test: `rapid_ai_engine/tests/test_rules_loader.py`

**Step 1: Write the failing test**

```python
"""Tests for YAML rule loader."""
import pytest
from rapid_ai_engine.rules.loader import load_actions, load_profiles, load_block_scores


class TestLoadActions:
    def test_loads_all_actions(self):
        actions = load_actions()
        assert "ACT001" in actions
        assert "ACT008" in actions
        assert len(actions) == 8

    def test_action_has_required_fields(self):
        actions = load_actions()
        act = actions["ACT001"]
        assert "title" in act
        assert "justification" in act
        assert "verification" in act

    def test_diagnosis_map_loaded(self):
        actions = load_actions()
        assert "diagnosis_map" in actions or hasattr(actions, '__contains__')


class TestLoadProfiles:
    def test_loads_pump_profile(self):
        profiles = load_profiles()
        assert "pump_train_horizontal" in profiles
        p = profiles["pump_train_horizontal"]
        assert "id" in p
        assert "weights" in p

    def test_weights_sum_near_one(self):
        profiles = load_profiles()
        for name, profile in profiles.items():
            w = sum(profile["weights"].values())
            assert abs(w - 1.0) < 0.01, f"{name} weights sum to {w}"


class TestLoadBlockScores:
    def test_loads_rules(self):
        rules = load_block_scores()
        assert len(rules) >= 7
        assert rules[0]["id"] == "BSR007"  # Highest priority first
```

**Step 2: Run test to verify it fails**

Run: `python -m pytest rapid_ai_engine/tests/test_rules_loader.py -v`
Expected: FAIL with ModuleNotFoundError

**Step 3: Create the YAML files**

`rapid_ai_engine/rules/__init__.py`:
```python
"""Externalized rules — loaded from YAML at startup."""
```

`rapid_ai_engine/rules/actions.yaml`:
```yaml
# Module E — Action Catalog & Diagnosis Mapping
# ACT001–ACT008: Maintenance actions with justification and verification

actions:
  ACT001:
    title: "Vibration re-measure (confirmation run)"
    justification: "Confirm trend before committing to intervention"
    verification: "Compare new RMS to previous within +/-10%"
  ACT002:
    title: "Bearing lubrication / grease replenishment"
    justification: "High frequency or temperature rise indicates lubrication deficit"
    verification: "HF amplitude and temperature return to baseline within 24h"
  ACT003:
    title: "Alignment check (laser / dial indicator)"
    justification: "Axial dominance and coupling signature indicate misalignment"
    verification: "Alignment report within tolerance per OEM spec"
  ACT004:
    title: "Balance correction (single / dual plane)"
    justification: "1x dominance with horizontal preference indicates imbalance"
    verification: "1x amplitude reduced by >=50% post-correction"
  ACT005:
    title: "Bearing replacement (scheduled)"
    justification: "BPFO/BPFI signatures with acceleration confirms bearing defect"
    verification: "Post-replacement vibration within acceptance limits"
  ACT006:
    title: "Foundation tightening / soft foot correction"
    justification: "V/H ratio and looseness indicate structural issues"
    verification: "Phase stability and reduced looseness harmonics"
  ACT007:
    title: "Process investigation (not machine fault)"
    justification: "Trend correlates with process variable, not machine degradation"
    verification: "Vibration returns to normal with process stabilisation"
  ACT008:
    title: "Emergency shutdown / trip recommendation"
    justification: "Critical SSI with accelerating trend, imminent failure risk"
    verification: "Machine isolated, inspection completed before restart"

# Stem-based mapping: diagnosis keyword stems → action IDs
diagnosis_map:
  imbalanc: [ACT004, ACT001]
  unbalanc: [ACT004, ACT001]
  misalign: [ACT003, ACT001]
  bearing: [ACT002, ACT005]
  lubric: [ACT002]
  loose: [ACT006, ACT001]
  foundation: [ACT006]
  process: [ACT007]
  critical: [ACT008]
  shutdown: [ACT008]
  cavitat: [ACT007, ACT001]
  resonan: [ACT006, ACT001]
```

`rapid_ai_engine/rules/profiles.yaml`:
```yaml
# Module C — System Profile Weights
# Weight per block for SSI computation. Weights must sum to 1.0.

pump_train_horizontal:
  id: PROFILE_PUMP_A
  weights:
    foundation: 0.15
    ac_motor: 0.10
    coupling: 0.10
    shafts: 0.10
    afb: 0.25
    fluid_flow: 0.30

gearbox_train:
  id: PROFILE_GBX_A
  weights:
    foundation: 0.15
    ac_motor: 0.10
    coupling: 0.10
    shafts: 0.10
    gears: 0.35
    afb: 0.20

fan_train:
  id: PROFILE_FAN_A
  weights:
    foundation: 0.15
    ac_motor: 0.15
    coupling: 0.05
    shafts: 0.10
    afb: 0.25
    fluid_flow: 0.30
```

`rapid_ai_engine/rules/block_scores.yaml`:
```yaml
# Module C — Block Score Rules (BSR001–BSR007)
# Evaluated in order (first match wins). Higher priority rules first.

rules:
  - id: BSR007
    description: "Very strong initiator"
    condition: "b_match >= 0.90"
    score: 0.90

  - id: BSR001
    description: "Accelerating + high confidence"
    condition: "trend == Accelerating AND confidence >= 0.70"
    score: 0.85

  - id: BSR003
    description: "Step + high confidence"
    condition: "trend == Step AND confidence >= 0.70"
    score: 0.80

  - id: BSR002
    description: "Drift + moderate confidence"
    condition: "trend == Drift AND confidence >= 0.60"
    score: 0.65

  - id: BSR005
    description: "Initiator present but trend stable"
    condition: "b_match >= 0.70 AND (trend == Stable OR confidence < 0.50)"
    score: 0.55

  - id: BSR006
    description: "No initiator + stable"
    condition: "b_match < 0.30 AND trend == Stable"
    score: 0.15

  - id: BSR004
    description: "Chaotic + high process correlation"
    condition: "trend == Chaotic AND process_corr >= 0.70"
    score: 0.35

  - id: FALLBACK
    description: "Default when no rule matches"
    condition: "always"
    score: 0.40
```

**Step 4: Write the loader**

`rapid_ai_engine/rules/loader.py`:
```python
"""
YAML Rule Loader — loads externalized rules at startup and caches them.

Zen of Python: "Explicit is better than implicit."
Rules live in YAML where they can be audited, versioned, and modified
without touching Python code.
"""
import os
from typing import Any, Dict, List
from functools import lru_cache

import yaml

from ..exceptions import ConfigurationError

_RULES_DIR = os.path.dirname(os.path.abspath(__file__))


def _load_yaml(filename: str) -> Dict[str, Any]:
    """Load a YAML file from the rules directory."""
    path = os.path.join(_RULES_DIR, filename)
    try:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        raise ConfigurationError(f"Rule file not found: {path}")
    except yaml.YAMLError as e:
        raise ConfigurationError(f"Invalid YAML in {path}: {e}")


@lru_cache(maxsize=1)
def load_actions() -> Dict[str, Any]:
    """Load action catalog and diagnosis mapping."""
    data = _load_yaml("actions.yaml")
    result = dict(data.get("actions", {}))
    result["diagnosis_map"] = data.get("diagnosis_map", {})
    return result


@lru_cache(maxsize=1)
def load_profiles() -> Dict[str, Any]:
    """Load system profiles with weights."""
    return _load_yaml("profiles.yaml")


@lru_cache(maxsize=1)
def load_block_scores() -> List[Dict[str, Any]]:
    """Load block score rules (priority-ordered)."""
    data = _load_yaml("block_scores.yaml")
    return data.get("rules", [])
```

**Step 5: Run tests to verify they pass**

Run: `python -m pytest rapid_ai_engine/tests/test_rules_loader.py -v`
Expected: All tests PASS.

**Step 6: Commit**

```bash
git add rapid_ai_engine/rules/ rapid_ai_engine/tests/test_rules_loader.py
git commit -m "feat: externalize rules to YAML with loader and caching"
```

---

### Task 5: Wire modules to use shared config

**Files:**
- Modify: `rapid_ai_engine/modules/moduleA_trend.py` — import from config
- Modify: `rapid_ai_engine/modules/moduleBplus_slope.py` — import from config
- Modify: `rapid_ai_engine/modules/moduleBpp_sedl.py` — import from config
- Modify: `rapid_ai_engine/modules/moduleC_fusion.py` — import from config + YAML profiles
- Modify: `rapid_ai_engine/modules/moduleD_health.py` — import from config
- Modify: `rapid_ai_engine/modules/moduleE_maintenance.py` — import from config + YAML actions
- Modify: `rapid_ai_engine/modules/moduleF_rul.py` — import from config
- Modify: `rapid_ai_engine/main.py` — use classify_severity from config

**Step 1: Replace module-level constants with config imports**

For each module, replace hardcoded constants with imports from `config.py`. Examples:

**moduleA_trend.py** — Replace:
```python
SEVERITY_MULTIPLIER = 10.0
BASELINE_RATIO_ALARM = 2.0
# ... etc
```
With:
```python
from ..config import FEATURE_THRESHOLDS, classify_severity
```
Then use `FEATURE_THRESHOLDS["severity_multiplier"]` etc.

**moduleC_fusion.py** — Replace hardcoded `PROFILES` dict with:
```python
from ..rules.loader import load_profiles
```
And replace `_ssi_to_state()` with:
```python
from ..config import classify_ssi
```

**moduleD_health.py** — Replace:
```python
SSI_CRITICAL = 0.80
SSI_UNSTABLE = 0.60
SSI_DEGRADING = 0.30
```
With:
```python
from ..config import SSI_THRESHOLDS, SLOPE_THRESHOLDS
```

**moduleE_maintenance.py** — Replace hardcoded `ACTION_CATALOG` and `DIAGNOSIS_ACTION_MAP` with:
```python
from ..rules.loader import load_actions
```

**main.py** — Replace lines 324-331 (severity classification) with:
```python
from .config import classify_severity
final_level = classify_severity(s_eff)
```

**Step 2: Run all existing tests to verify nothing broke**

Run: `python -m pytest rapid_ai_engine/tests/ -v --tb=short`
Expected: All 111 tests PASS (plus the new config/loader tests).

**Step 3: Commit**

```bash
git add rapid_ai_engine/modules/ rapid_ai_engine/main.py
git commit -m "refactor: wire all modules to shared config and YAML rules"
```

---

### Task 6: Add structured logging (structlog)

**Files:**
- Create: `rapid_ai_engine/logging_config.py`
- Modify: `rapid_ai_engine/main.py` — configure structlog at startup
- Modify: All module files — replace `logging.getLogger` with structlog

**Step 1: Create logging config**

```python
"""
RAPID AI — Structured Logging Configuration

Zen of Python: "Errors should never pass silently."
Structured logs are queryable, parseable, and production-ready.
"""
import structlog


def configure_logging(json_output: bool = True):
    """Configure structlog for the application."""
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if json_output:
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(0),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
```

**Step 2: Update main.py lifespan to configure logging**

Add to the top of `main.py`:
```python
from .logging_config import configure_logging
```

Update the lifespan:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(json_output=True)
    yield
    _executor.shutdown(wait=False)
```

**Step 3: Update all modules to use structlog**

In each module, replace:
```python
import logging
# ... in except block:
logging.getLogger(__name__).error(f"Module X error: {e}", exc_info=True)
```

With:
```python
import structlog
logger = structlog.get_logger(__name__)
# ... in except block:
logger.error("module_error", module="X", error=str(e), exc_info=True)
```

Also add structured start/complete logging in each `run()`:
```python
def run(request):
    t0 = time.perf_counter()
    logger.info("module_start", module="X", asset_id=request.asset_id)
    try:
        # ... existing logic ...
        elapsed = (time.perf_counter() - t0) * 1000
        logger.info("module_complete", module="X", elapsed_ms=round(elapsed, 2))
        return result
    except Exception as e:
        elapsed = (time.perf_counter() - t0) * 1000
        logger.error("module_error", module="X", error=str(e), elapsed_ms=round(elapsed, 2), exc_info=True)
        return safe_default
```

**Step 4: Run all tests**

Run: `python -m pytest rapid_ai_engine/tests/ -v --tb=short`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add rapid_ai_engine/logging_config.py rapid_ai_engine/main.py rapid_ai_engine/modules/
git commit -m "feat: add structured logging via structlog across all modules"
```

---

### Task 7: Decompose Module C run() into helpers

**Files:**
- Modify: `rapid_ai_engine/modules/moduleC_fusion.py`

**Step 1: Extract helpers from run()**

Replace the monolithic `run()` with focused helpers:

```python
def _load_and_normalize_weights(system_type: str, blocks: dict) -> tuple[str, dict]:
    """Load profile weights and renormalize for present blocks."""
    profiles = load_profiles()
    profile = profiles.get(system_type, {"id": "PROFILE_DEFAULT", "weights": {}})
    profile_id = profile["id"]
    weights = profile.get("weights", {})

    if not weights and blocks:
        n = len(blocks)
        weights = {k: 1.0 / n for k in blocks}

    active = {k: weights[k] for k in blocks if k in weights}
    weight_sum = sum(active.values())
    if 0 < weight_sum < 0.99:
        active = {k: v / weight_sum for k, v in active.items()}

    return profile_id, active


def _compute_block_scores(blocks: dict) -> dict:
    """Compute individual block scores from B/B+/B++ outputs."""
    return {
        name: _block_score(
            bi.B_match_score, bi.Bplus_trend_class,
            bi.Bplus_confidence, bi.process_correlation,
        )
        for name, bi in blocks.items()
    }


def _aggregate_ssi(block_scores: dict, weights: dict) -> float:
    """Compute weighted SSI from block scores."""
    ssi = sum(weights.get(name, 0.0) * score for name, score in block_scores.items())
    return max(0.0, min(1.0, ssi))


def _check_process_driven(blocks: dict) -> bool:
    """Check if majority of blocks are process-correlated."""
    count = sum(1 for b in blocks.values() if b.process_correlation >= 0.70)
    return count > len(blocks) / 2


def _rank_contributors(block_scores: dict, weights: dict, top_n: int = 3) -> list:
    """Rank blocks by weighted contribution."""
    contributions = [
        (name, weights.get(name, 0.0) * score)
        for name, score in block_scores.items()
    ]
    contributions.sort(key=lambda x: x[1], reverse=True)
    return [c[0] for c in contributions[:top_n]]
```

Then `run()` becomes:
```python
def run(request: ModuleCRequest) -> ModuleCResponse:
    t0 = time.perf_counter()
    try:
        profile_id, weights = _load_and_normalize_weights(request.system_type, request.blocks)
        block_scores = _compute_block_scores(request.blocks)
        ssi = _aggregate_ssi(block_scores, weights)

        # Gating rule: B++ critical instability → SSI floor
        if request.stability_state == StabilityState.Critical_Instability:
            ssi = max(ssi, 0.70)

        # Determine system state
        if _check_process_driven(request.blocks):
            system_state = SystemState.process_driven
        else:
            system_state = classify_ssi(ssi)

        top = _rank_contributors(block_scores, weights)

        elapsed = (time.perf_counter() - t0) * 1000
        return ModuleCResponse(
            system_type=request.system_type,
            profile_id=profile_id,
            SSI=round(ssi, 4),
            system_state=system_state,
            top_contributors=top,
            recommended_action=_state_to_action(system_state),
            execution_time_ms=round(elapsed, 2),
        )
    except Exception as e:
        # ... error handling
```

**Step 2: Run tests**

Run: `python -m pytest rapid_ai_engine/tests/test_moduleC.py -v`
Expected: All Module C tests PASS.

**Step 3: Commit**

```bash
git add rapid_ai_engine/modules/moduleC_fusion.py
git commit -m "refactor: decompose Module C run() into focused helpers"
```

---

### Task 8: Decompose Module F run() into helpers

**Files:**
- Modify: `rapid_ai_engine/modules/moduleF_rul.py`

**Step 1: Extract helpers**

```python
def _select_rul_model(slope_log, slope_change, nli, ln_ratio, current, threshold):
    """Select and compute RUL using appropriate model."""
    if current >= threshold:
        return 0.0
    if abs(slope_log) < 1e-9:
        return RUL_MAX_DAYS

    if slope_change >= ACCEL_MODEL_THRESHOLD:
        effective = slope_log + slope_change
        rul = ln_ratio / effective if effective > 1e-9 else RUL_MAX_DAYS
    else:
        rul = ln_ratio / slope_log

    if nli >= INSTABILITY_THRESHOLD:
        rul *= (1.0 - nli)

    return max(0.0, min(RUL_MAX_DAYS, rul))


def _compute_failure_probability(rul_days, confidence):
    """Compute 30-day failure probability adjusted by confidence."""
    if rul_days > 1e-6:
        p_30 = 1.0 - math.exp(-30.0 / rul_days)
    else:
        p_30 = 1.0
    return max(0.0, min(1.0, p_30 * confidence))


def _compute_risk_index(severity, criticality):
    """Risk_Index = 100 * severity * criticality, clamped [0, 100]."""
    return max(0.0, min(100.0, 100.0 * severity * criticality))


def _determine_window(rul_days):
    """Map RUL to recommended maintenance window."""
    if rul_days < 7:
        return "Immediate"
    elif rul_days < 30:
        return "Urgent (< 30 days)"
    elif rul_days < 180:
        return "Planned"
    return "Monitor"
```

**Step 2: Run tests**

Run: `python -m pytest rapid_ai_engine/tests/test_moduleF.py -v`
Expected: All Module F tests PASS.

**Step 3: Commit**

```bash
git add rapid_ai_engine/modules/moduleF_rul.py
git commit -m "refactor: decompose Module F run() into focused helpers"
```

---

### Task 9: Document magic numbers (V/A proxy multipliers)

**Files:**
- Modify: `rapid_ai_engine/main.py:206-211`
- Modify: `rapid_ai_engine/config.py`

**Step 1: Add proxy constants to config**

Add to `config.py`:
```python
# ─── Tri-Axial Proxy Multipliers ─────────────────────────────
# When only horizontal (H) measurement is available, approximate
# vertical (V) and axial (A) from H. Based on ISO 10816-3
# typical ratios for horizontal rotating machinery.
# V ≈ 0.85 × H (vertical typically 10-20% lower than horizontal)
# A ≈ 0.60 × H (axial typically 30-50% lower for radial bearings)
TRIAXIAL_PROXY = {
    "v_from_h": 0.85,
    "a_from_h": 0.60,
}
```

**Step 2: Update main.py to use named constants**

Replace lines 206-208 with:
```python
from .config import TRIAXIAL_PROXY

# ... in evaluate():
mB_req = ModuleBRequest(
    asset_id=request.asset_id,
    component=request.component,
    metrics={
        "H": mA_resp.overall_rms,
        "V": mA_resp.overall_rms * TRIAXIAL_PROXY["v_from_h"],
        "A": mA_resp.overall_rms * TRIAXIAL_PROXY["a_from_h"],
        "kurtosis": mA_resp.kurtosis,
        "crest_factor": mA_resp.crest_factor,
        "temperature": 0.0,
    },
)
```

**Step 3: Run tests and commit**

Run: `python -m pytest rapid_ai_engine/tests/ -v --tb=short`
Expected: All tests PASS.

```bash
git add rapid_ai_engine/config.py rapid_ai_engine/main.py
git commit -m "docs: document V/A proxy multipliers with ISO 10816-3 reference"
```

---

### Task 10: Final backend verification

**Step 1: Run full test suite**

Run: `python -m pytest rapid_ai_engine/tests/ -v --tb=short`
Expected: All tests PASS (111 original + ~15 new config/loader tests).

**Step 2: Start the server and test**

Run: `python -m uvicorn rapid_ai_engine.main:app --host 0.0.0.0 --port 8000`
Expected: Server starts. Test `/health` returns OK. Test `/rapid-ai/evaluate` with sample request returns valid response.

**Step 3: Commit any final fixes**

---

## Stream 2: Dashboard — Production Client

### Task 11: Create API client layer

**Files:**
- Create: `dashboard/src/api/client.ts`
- Create: `dashboard/src/api/evaluate.ts`
- Delete content from: `dashboard/src/api/mockData.ts` (keep file but export nothing for now)

**Step 1: Write the API client**

`dashboard/src/api/client.ts`:
```typescript
/**
 * RAPID AI — API Client
 * Handles all communication with the FastAPI backend.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new ApiError(res.status, detail)
  }

  return res.json()
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    throw new ApiError(res.status, await res.text())
  }
  return res.json()
}
```

`dashboard/src/api/evaluate.ts`:
```typescript
import { apiPost } from './client'
import type { FullAnalysisResponse } from '../types/rapid-ai'

export interface EvaluateRequest {
  schema_version?: string
  asset_id: string
  timestamp_utc: string
  machine_type?: string
  system_type?: string
  signal: {
    signal_type: string
    direction: string
    unit: string
    sampling_rate_hz: number
    values: number[]
  }
  context?: {
    rpm?: number
    temperature_c?: number
  }
  component?: string
  historical_timestamps?: string[]
  historical_values?: number[]
  criticality?: number
  failure_threshold?: number
}

export async function evaluateAsset(request: EvaluateRequest): Promise<FullAnalysisResponse> {
  return apiPost<FullAnalysisResponse>('/rapid-ai/evaluate', request)
}

export async function healthCheck(): Promise<{ status: string }> {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/health`
  )
  return res.json()
}
```

**Step 2: Commit**

```bash
cd dashboard && git add src/api/client.ts src/api/evaluate.ts
git commit -m "feat: add API client layer for live backend communication"
```

---

### Task 12: Create AnalysisContext for state management

**Files:**
- Create: `dashboard/src/context/AnalysisContext.tsx`

**Step 1: Write the context**

```tsx
import { createContext, useContext, useState, useCallback } from 'react'
import type { FullAnalysisResponse } from '../types/rapid-ai'
import type { EvaluateRequest } from '../api/evaluate'
import { evaluateAsset } from '../api/evaluate'

interface AnalysisState {
  result: FullAnalysisResponse | null
  request: EvaluateRequest | null
  isLoading: boolean
  error: string | null
  runAnalysis: (req: EvaluateRequest) => Promise<void>
  clearResult: () => void
}

const AnalysisContext = createContext<AnalysisState | null>(null)

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<FullAnalysisResponse | null>(null)
  const [request, setRequest] = useState<EvaluateRequest | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = useCallback(async (req: EvaluateRequest) => {
    setIsLoading(true)
    setError(null)
    setRequest(req)
    try {
      const resp = await evaluateAsset(req)
      setResult(resp)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearResult = useCallback(() => {
    setResult(null)
    setRequest(null)
    setError(null)
  }, [])

  return (
    <AnalysisContext.Provider value={{ result, request, isLoading, error, runAnalysis, clearResult }}>
      {children}
    </AnalysisContext.Provider>
  )
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext)
  if (!ctx) throw new Error('useAnalysis must be used within AnalysisProvider')
  return ctx
}
```

**Step 2: Commit**

```bash
git add src/context/AnalysisContext.tsx
git commit -m "feat: add AnalysisContext for live API state management"
```

---

### Task 13: Create signal generator utility

**Files:**
- Create: `dashboard/src/utils/signalGenerator.ts`

**Step 1: Write the signal generator**

```typescript
/**
 * Signal Generator — creates realistic vibration signals for API testing.
 * Each preset produces a number[] of signal values ready for the API payload.
 */

function randn(): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random()
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

function sine(freq: number, t: number): number {
  return Math.sin(2 * Math.PI * freq * t)
}

export interface SignalParams {
  samplingRate: number
  duration: number
  amplitude: number
  noiseLevel: number
}

const DEFAULT_PARAMS: SignalParams = {
  samplingRate: 6400,
  duration: 1.0,
  amplitude: 2.0,
  noiseLevel: 0.3,
}

export function generateHealthy(params: Partial<SignalParams> = {}): number[] {
  const p = { ...DEFAULT_PARAMS, ...params }
  const n = Math.floor(p.samplingRate * p.duration)
  const dt = 1 / p.samplingRate
  return Array.from({ length: n }, (_, i) => {
    const t = i * dt
    return p.amplitude * sine(50, t) + p.noiseLevel * randn()
  })
}

export function generateBearingDefect(params: Partial<SignalParams> = {}, severity = 0.5): number[] {
  const p = { ...DEFAULT_PARAMS, amplitude: 4.0 + severity * 6.0, noiseLevel: 0.5 + severity, ...params }
  const n = Math.floor(p.samplingRate * p.duration)
  const dt = 1 / p.samplingRate
  const bpfo = 120 // Bearing defect frequency
  return Array.from({ length: n }, (_, i) => {
    const t = i * dt
    const base = p.amplitude * sine(50, t)
    const defect = severity * 3.0 * sine(bpfo, t) * (1 + 0.5 * sine(50, t))
    // Add impulses at defect frequency
    const impulse = Math.random() < (severity * 0.02) ? severity * 8.0 * randn() : 0
    return base + defect + impulse + p.noiseLevel * randn()
  })
}

export function generateImbalance(params: Partial<SignalParams> = {}, severity = 0.5): number[] {
  const p = { ...DEFAULT_PARAMS, amplitude: 3.0 + severity * 5.0, ...params }
  const n = Math.floor(p.samplingRate * p.duration)
  const dt = 1 / p.samplingRate
  return Array.from({ length: n }, (_, i) => {
    const t = i * dt
    // 1x dominant (imbalance signature)
    const onex = p.amplitude * sine(30, t)
    const twox = p.amplitude * 0.2 * sine(60, t) // Small 2x
    return onex + twox + p.noiseLevel * randn()
  })
}

export function generateMisalignment(params: Partial<SignalParams> = {}, severity = 0.5): number[] {
  const p = { ...DEFAULT_PARAMS, amplitude: 3.0 + severity * 4.0, ...params }
  const n = Math.floor(p.samplingRate * p.duration)
  const dt = 1 / p.samplingRate
  return Array.from({ length: n }, (_, i) => {
    const t = i * dt
    // 2x dominant (misalignment signature) + axial component
    const onex = p.amplitude * 0.4 * sine(30, t)
    const twox = p.amplitude * sine(60, t)
    const threex = p.amplitude * 0.3 * sine(90, t)
    return onex + twox + threex + p.noiseLevel * randn()
  })
}

export function generateLooseness(params: Partial<SignalParams> = {}, severity = 0.5): number[] {
  const p = { ...DEFAULT_PARAMS, amplitude: 2.5 + severity * 5.0, ...params }
  const n = Math.floor(p.samplingRate * p.duration)
  const dt = 1 / p.samplingRate
  return Array.from({ length: n }, (_, i) => {
    const t = i * dt
    // Sub-harmonics + broadband (looseness signature)
    const half = p.amplitude * 0.6 * sine(15, t)
    const onex = p.amplitude * sine(30, t)
    const harmonics = p.amplitude * 0.3 * sine(60, t) + p.amplitude * 0.2 * sine(90, t)
    return half + onex + harmonics + (p.noiseLevel + severity) * randn()
  })
}

export const SIGNAL_PRESETS = [
  { id: 'healthy', name: 'Healthy Baseline', generate: generateHealthy, description: 'Clean signal, low noise' },
  { id: 'bearing', name: 'Bearing Defect', generate: generateBearingDefect, description: 'BPFO/BPFI impulse pattern' },
  { id: 'imbalance', name: 'Imbalance', generate: generateImbalance, description: '1x dominant vibration' },
  { id: 'misalignment', name: 'Misalignment', generate: generateMisalignment, description: '2x dominant, axial' },
  { id: 'looseness', name: 'Looseness', generate: generateLooseness, description: 'Sub-harmonics + broadband' },
] as const
```

**Step 2: Commit**

```bash
git add src/utils/signalGenerator.ts
git commit -m "feat: add signal generator with 5 fault presets for API testing"
```

---

### Task 14: Create Request Builder page

**Files:**
- Create: `dashboard/src/pages/RequestBuilder.tsx`

**Step 1: Write the Request Builder page**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnalysis } from '../context/AnalysisContext'
import { SIGNAL_PRESETS, generateHealthy } from '../utils/signalGenerator'
import type { EvaluateRequest } from '../api/evaluate'

const MACHINE_TYPES = ['pump_train_horizontal', 'gearbox_train', 'fan_train', 'generic']
const COMPONENTS = ['afb', 'journal', 'tpjb', 'coupling', 'ac_motor', 'gears', 'seal', 'shaft', 'belts', 'chains', 'dc_motor', 'impeller']
const SIGNAL_TYPES = ['velocity', 'acceleration', 'displacement']
const DIRECTIONS = ['H', 'V', 'A']
const UNITS: Record<string, string> = { velocity: 'mm/s', acceleration: 'g', displacement: 'um' }

export default function RequestBuilder() {
  const navigate = useNavigate()
  const { runAnalysis, isLoading, error } = useAnalysis()

  const [assetId, setAssetId] = useState('PUMP-101-DE')
  const [machineType, setMachineType] = useState('pump_train_horizontal')
  const [systemType, setSystemType] = useState('pump_train_horizontal')
  const [component, setComponent] = useState('afb')
  const [signalType, setSignalType] = useState('velocity')
  const [direction, setDirection] = useState('H')
  const [samplingRate, setSamplingRate] = useState(6400)
  const [criticality, setCriticality] = useState(0.6)
  const [failureThreshold, setFailureThreshold] = useState(8.0)
  const [selectedPreset, setSelectedPreset] = useState('healthy')
  const [severity, setSeverity] = useState(0.5)
  const [operatingHours, setOperatingHours] = useState(10000)

  const handleSubmit = async () => {
    const preset = SIGNAL_PRESETS.find(p => p.id === selectedPreset)
    const values = preset
      ? preset.generate({ samplingRate, duration: 1.0 }, severity)
      : generateHealthy({ samplingRate })

    const request: EvaluateRequest = {
      asset_id: assetId,
      timestamp_utc: new Date().toISOString(),
      machine_type: machineType,
      system_type: systemType,
      signal: {
        signal_type: signalType,
        direction,
        unit: UNITS[signalType] || 'mm/s',
        sampling_rate_hz: samplingRate,
        values,
      },
      component,
      criticality,
      failure_threshold: failureThreshold,
    }

    await runAnalysis(request)
    navigate('/results')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">New Analysis</h2>
        <p className="text-sm text-slate-400 mt-1">Configure sensor data and machine parameters, then submit to the RAPID AI engine.</p>
      </div>

      {/* Machine Configuration */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Machine Configuration</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Asset ID</label>
            <input
              type="text" value={assetId} onChange={e => setAssetId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Machine Type</label>
            <select value={machineType} onChange={e => { setMachineType(e.target.value); setSystemType(e.target.value) }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none">
              {MACHINE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Component</label>
            <select value={component} onChange={e => setComponent(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none">
              {COMPONENTS.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Criticality ({criticality.toFixed(2)})</label>
            <input type="range" min="0" max="1" step="0.05" value={criticality}
              onChange={e => setCriticality(parseFloat(e.target.value))}
              className="w-full accent-sky-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Failure Threshold (mm/s)</label>
            <input type="number" value={failureThreshold} onChange={e => setFailureThreshold(parseFloat(e.target.value) || 8.0)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Operating Hours</label>
            <input type="number" value={operatingHours} onChange={e => setOperatingHours(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none" />
          </div>
        </div>
      </div>

      {/* Signal Configuration */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Signal Configuration</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Signal Type</label>
            <select value={signalType} onChange={e => setSignalType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none">
              {SIGNAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Direction</label>
            <select value={direction} onChange={e => setDirection(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none">
              {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Sampling Rate (Hz)</label>
            <input type="number" value={samplingRate} onChange={e => setSamplingRate(parseInt(e.target.value) || 6400)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none" />
          </div>
        </div>
      </div>

      {/* Signal Preset */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Signal Generator</h3>
        <div className="grid grid-cols-5 gap-2">
          {SIGNAL_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => setSelectedPreset(preset.id)}
              className={`p-3 rounded-lg text-left transition-colors ${
                selectedPreset === preset.id
                  ? 'bg-sky-500/20 border border-sky-500/50 text-sky-400'
                  : 'bg-slate-900 border border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className="text-sm font-medium">{preset.name}</div>
              <div className="text-[10px] mt-1 opacity-70">{preset.description}</div>
            </button>
          ))}
        </div>
        {selectedPreset !== 'healthy' && (
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fault Severity ({severity.toFixed(2)})</label>
            <input type="range" min="0.1" max="1.0" step="0.05" value={severity}
              onChange={e => setSeverity(parseFloat(e.target.value))}
              className="w-full accent-sky-500" />
          </div>
        )}
      </div>

      {/* Submit */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
          {error}
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={isLoading || !assetId}
        className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        {isLoading ? 'Analyzing...' : 'Run Analysis'}
      </button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/pages/RequestBuilder.tsx
git commit -m "feat: add Request Builder page with signal generator presets"
```

---

### Task 15: Create SignalWaveform component

**Files:**
- Create: `dashboard/src/components/SignalWaveform.tsx`

**Step 1: Write the component**

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'

interface Props {
  values: number[]
  samplingRate?: number
  rms?: number
  className?: string
}

export default function SignalWaveform({ values, samplingRate = 6400, rms, className = '' }: Props) {
  // Downsample for display (max 500 points)
  const step = Math.max(1, Math.floor(values.length / 500))
  const data = values
    .filter((_, i) => i % step === 0)
    .map((v, i) => ({
      time: ((i * step) / samplingRate * 1000).toFixed(1),
      value: v,
    }))

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 10 }} label={{ value: 'ms', position: 'insideBottomRight', fill: '#64748b', fontSize: 10 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(v: number) => [v.toFixed(3), 'Amplitude']}
          />
          <Line type="monotone" dataKey="value" stroke="#38bdf8" dot={false} strokeWidth={1} />
          {rms !== undefined && (
            <>
              <ReferenceLine y={rms} stroke="#22c55e" strokeDasharray="5 5" label={{ value: `RMS ${rms.toFixed(2)}`, fill: '#22c55e', fontSize: 10 }} />
              <ReferenceLine y={-rms} stroke="#22c55e" strokeDasharray="5 5" />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/SignalWaveform.tsx
git commit -m "feat: add SignalWaveform component with RMS reference lines"
```

---

### Task 16: Create PipelineTimeline component

**Files:**
- Create: `dashboard/src/components/PipelineTimeline.tsx`

**Step 1: Write the component**

```tsx
import type { ModuleTrace } from '../types/rapid-ai'

interface Props {
  trace: ModuleTrace
  totalMs: number
}

const STAGES = [
  { key: 'module0', label: '0: Guard', color: '#3b82f6', stage: 'GUARD' },
  { key: 'moduleA', label: 'A: Features', color: '#22c55e', stage: 'SENSE' },
  { key: 'moduleB', label: 'B: Initiators', color: '#22c55e', stage: 'SENSE' },
  { key: 'moduleBplus', label: 'B+: Trends', color: '#22c55e', stage: 'SENSE' },
  { key: 'moduleBpp', label: 'B++: Entropy', color: '#22c55e', stage: 'SENSE' },
  { key: 'moduleC', label: 'C: Fusion', color: '#eab308', stage: 'FUSE' },
  { key: 'moduleD', label: 'D: Health', color: '#eab308', stage: 'FUSE' },
  { key: 'moduleE', label: 'E: Maint.', color: '#ef4444', stage: 'ACT' },
  { key: 'moduleF', label: 'F: RUL', color: '#ef4444', stage: 'ACT' },
] as const

export default function PipelineTimeline({ trace, totalMs }: Props) {
  return (
    <div className="space-y-1.5">
      {STAGES.map(({ key, label, color }) => {
        const mod = trace[key as keyof ModuleTrace] as any
        const ms = mod?.execution_time_ms || 0
        const pct = totalMs > 0 ? (ms / totalMs) * 100 : 0
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 w-24 text-right font-mono">{label}</span>
            <div className="flex-1 h-4 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-[10px] text-slate-500 w-16 font-mono">{ms.toFixed(1)} ms</span>
          </div>
        )
      })}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/PipelineTimeline.tsx
git commit -m "feat: add PipelineTimeline component showing module execution times"
```

---

### Task 17: Update App.tsx routing and Layout

**Files:**
- Modify: `dashboard/src/App.tsx`
- Modify: `dashboard/src/components/Layout.tsx`

**Step 1: Update App.tsx**

Replace the entire file:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AnalysisProvider } from './context/AnalysisContext'
import Layout from './components/Layout'
import RequestBuilder from './pages/RequestBuilder'
import PipelineDashboard from './pages/PipelineDashboard'
import ModuleExplorer from './pages/ModuleExplorer'
import ReliabilityView from './pages/ReliabilityView'

export default function App() {
  return (
    <AnalysisProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<RequestBuilder />} />
          <Route path="/results" element={<PipelineDashboard />} />
          <Route path="/modules" element={<ModuleExplorer />} />
          <Route path="/reliability" element={<ReliabilityView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AnalysisProvider>
  )
}
```

**Step 2: Update Layout.tsx**

Replace the entire file:

```tsx
import { NavLink } from 'react-router-dom'
import { useAnalysis } from '../context/AnalysisContext'

interface Props {
  children: React.ReactNode
}

const navItems = [
  { to: '/', label: 'New Analysis', icon: '⚡' },
  { to: '/results', label: 'Dashboard', icon: '📈' },
  { to: '/modules', label: 'Module Explorer', icon: '🔬' },
  { to: '/reliability', label: 'Reliability', icon: '📊' },
]

export default function Layout({ children }: Props) {
  const { result } = useAnalysis()

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-slate-800">
          <h1 className="text-lg font-bold text-white tracking-tight">
            <span className="text-sky-400">RAPID</span> AI
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
            Condition Intelligence Engine
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Current Analysis Info */}
        {result && (
          <div className="p-3 border-t border-slate-800">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest px-3 mb-2">
              Current Analysis
            </p>
            <div className="px-3 space-y-1">
              <div className="text-sm text-white font-medium">{result.asset_id}</div>
              <div className="text-[10px] text-slate-500">{result.health_stage} — {result.final_severity_level}</div>
              <div className="text-[10px] text-slate-600 font-mono">{result.trace_id}</div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 text-[10px] text-slate-600">
          <div>LIVE API MODE</div>
          <div className="mt-1">v1.0.0 — Physics-Grounded</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/App.tsx src/components/Layout.tsx
git commit -m "refactor: update routing for live API flow — build -> results -> explore"
```

---

### Task 18: Update PipelineDashboard for live API data

**Files:**
- Modify: `dashboard/src/pages/PipelineDashboard.tsx`

**Step 1: Rewrite to use AnalysisContext instead of scenario prop**

```tsx
import { useNavigate } from 'react-router-dom'
import { useAnalysis } from '../context/AnalysisContext'
import HealthBadge from '../components/HealthBadge'
import RadialGauge from '../components/RadialGauge'
import ActionPlanCard from '../components/ActionPlanCard'
import PFDiagram from '../components/PFDiagram'
import SignalWaveform from '../components/SignalWaveform'
import PipelineTimeline from '../components/PipelineTimeline'
import { scoreToColor, severityColor } from '../utils/colors'
import { days, pct, fixed } from '../utils/formatters'

export default function PipelineDashboard() {
  const navigate = useNavigate()
  const { result, request, isLoading, error } = useAnalysis()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400 mx-auto" />
          <p className="text-slate-400 mt-4">Running RAPID AI pipeline...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
          <h3 className="text-lg font-bold text-red-400">Analysis Failed</h3>
          <p className="text-sm text-slate-400 mt-2">{error}</p>
          <button onClick={() => navigate('/')} className="mt-4 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center">
        <h3 className="text-xl font-bold text-white">No Analysis Yet</h3>
        <p className="text-sm text-slate-400 mt-2">Submit sensor data to see results.</p>
        <button onClick={() => navigate('/')} className="mt-4 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm">
          New Analysis
        </button>
      </div>
    )
  }

  const r = result
  const trace = r.module_trace
  const rel = r.reliability_metrics

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{r.asset_id}</h2>
          <p className="text-sm text-slate-400 mt-1">Analysis complete in {fixed(r.execution_time_ms, 1)} ms</p>
        </div>
        <div className="flex items-center gap-3">
          <HealthBadge stage={r.health_stage} size="lg" />
          <button onClick={() => navigate('/')} className="text-xs text-sky-400 hover:text-sky-300">
            New Analysis
          </button>
        </div>
      </div>

      {/* Signal Waveform */}
      {request?.signal?.values && (
        <div className="card">
          <div className="card-title">Submitted Signal ({request.signal.values.length} samples)</div>
          <SignalWaveform
            values={request.signal.values}
            samplingRate={request.signal.sampling_rate_hz}
            rms={trace.moduleA?.overall_rms}
          />
        </div>
      )}

      {/* Top gauges row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card flex flex-col items-center">
          <RadialGauge value={r.final_severity_score} label="Severity" />
          <span className="text-[10px] mt-1 font-semibold uppercase" style={{ color: severityColor[r.final_severity_level] }}>
            {r.final_severity_level}
          </span>
        </div>
        <div className="card flex flex-col items-center">
          <RadialGauge value={trace.moduleC?.SSI || 0} label="SSI" />
          <span className="text-[10px] mt-1 text-slate-400">{trace.moduleC?.system_state}</span>
        </div>
        <div className="card flex flex-col items-center">
          <RadialGauge value={r.confidence} label="Confidence" color="#38bdf8" />
        </div>
        <div className="card flex flex-col items-center">
          <RadialGauge value={trace.moduleE?.plan_items[0]?.priority_score || 0} max={100} label="Priority" />
          <span className="text-[10px] mt-1 text-slate-400">{r.recommended_window}</span>
        </div>
        <div className="card flex flex-col items-center">
          <RadialGauge value={r.risk_index} max={100} label="Risk Index" />
        </div>
      </div>

      {/* RUL + Failure Probability + P-F row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-title">Remaining Useful Life</div>
          <div className="text-3xl font-bold" style={{ color: scoreToColor(r.final_severity_score) }}>
            {r.rul_days != null ? days(r.rul_days) : 'N/A'}
          </div>
          {r.rul_days != null && (
            <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, (r.rul_days / 365) * 100)}%`, backgroundColor: scoreToColor(r.final_severity_score) }} />
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-title">30-Day Failure Probability</div>
          <div className="text-3xl font-bold" style={{ color: scoreToColor(trace.moduleF?.failure_probability_30d || 0) }}>
            {pct(trace.moduleF?.failure_probability_30d || 0)}
          </div>
          {rel && (
            <div className="mt-2 text-xs text-slate-400 space-y-1">
              <div>Weibull P30: {pct(rel.weibull_failure_prob_30d)}</div>
              <div>Hazard rate: {rel.hazard_rate.toExponential(2)}</div>
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-title">P-F Interval Position</div>
          {rel ? (
            <>
              <PFDiagram position={rel.pf_interval_position} />
              <div className="mt-3 flex justify-between text-xs text-slate-400">
                <span>Phase: {rel.bathtub_phase.replace('_', ' ')}</span>
                <span>N&H: Pattern {rel.nowlan_heap_pattern}</span>
              </div>
            </>
          ) : <p className="text-sm text-slate-500">No reliability data</p>}
        </div>
      </div>

      {/* Action Plan */}
      {trace.moduleE && trace.moduleE.plan_items.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Action Plan ({trace.moduleE.total_actions} actions)
          </h3>
          <div className="space-y-2">
            {trace.moduleE.plan_items.map((item) => (
              <ActionPlanCard key={item.action_id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Pipeline Execution Timeline */}
      <div className="card">
        <div className="card-title">Pipeline Execution ({fixed(r.execution_time_ms, 1)} ms total)</div>
        <PipelineTimeline trace={trace} totalMs={r.execution_time_ms} />
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/pages/PipelineDashboard.tsx
git commit -m "refactor: PipelineDashboard now uses live API via AnalysisContext"
```

---

### Task 19: Update ModuleExplorer for live API data

**Files:**
- Modify: `dashboard/src/pages/ModuleExplorer.tsx`

**Step 1: Update to use AnalysisContext**

Change the component to use `useAnalysis()` instead of `scenario` prop. Replace the props interface and first few lines:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnalysis } from '../context/AnalysisContext'
// ... keep other imports

export default function ModuleExplorer() {
  const [active, setActive] = useState('0')
  const navigate = useNavigate()
  const { result } = useAnalysis()

  if (!result) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center">
        <h3 className="text-xl font-bold text-white">No Analysis Data</h3>
        <p className="text-sm text-slate-400 mt-2">Run an analysis first.</p>
        <button onClick={() => navigate('/')} className="mt-4 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm">New Analysis</button>
      </div>
    )
  }

  const trace = result.module_trace
  // ... rest of component stays the same (just remove scenario references)
```

**Step 2: Commit**

```bash
git add src/pages/ModuleExplorer.tsx
git commit -m "refactor: ModuleExplorer uses live API data via AnalysisContext"
```

---

### Task 20: Update ReliabilityView for live API data

**Files:**
- Modify: `dashboard/src/pages/ReliabilityView.tsx`

**Step 1: Update to use AnalysisContext**

Same pattern — replace `scenario` prop with `useAnalysis()`:

```tsx
import { useNavigate } from 'react-router-dom'
import { useAnalysis } from '../context/AnalysisContext'
// ... keep other imports

export default function ReliabilityView() {
  const navigate = useNavigate()
  const { result } = useAnalysis()

  if (!result) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center">
        <h3 className="text-xl font-bold text-white">No Analysis Data</h3>
        <p className="text-sm text-slate-400 mt-2">Run an analysis first.</p>
        <button onClick={() => navigate('/')} className="mt-4 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-sm">New Analysis</button>
      </div>
    )
  }

  const r = result
  const rel = r.reliability_metrics
  // ... rest stays the same (just remove scenario references)
```

**Step 2: Commit**

```bash
git add src/pages/ReliabilityView.tsx
git commit -m "refactor: ReliabilityView uses live API data via AnalysisContext"
```

---

### Task 21: Clean up mock data and verify build

**Files:**
- Delete or gut: `dashboard/src/api/mockData.ts`

**Step 1: Replace mockData.ts with empty export**

```typescript
// Mock data removed — dashboard now uses live API.
// This file kept for backwards compatibility with any imports.
export {}
```

**Step 2: Verify TypeScript builds clean**

Run: `cd dashboard && npm run build`
Expected: Build succeeds with no type errors.

**Step 3: Commit**

```bash
git add src/api/mockData.ts
git commit -m "chore: remove mock data — dashboard now uses live API only"
```

---

### Task 22: Final integration test

**Step 1: Start the backend**

Run: `cd /d/rapidai && python -m uvicorn rapid_ai_engine.main:app --host 0.0.0.0 --port 8000`

**Step 2: Start the dashboard**

Run: `cd /d/rapidai/dashboard && npm run dev`

**Step 3: Manual test flow**

1. Open http://localhost:5173/
2. Verify Request Builder page loads with form fields
3. Select "Bearing Defect" preset, set severity to 0.7
4. Click "Run Analysis"
5. Verify redirects to /results with live data
6. Verify gauges, waveform, and timeline render
7. Navigate to Module Explorer — verify all 9 tabs work
8. Navigate to Reliability — verify Weibull charts render

**Step 4: Run backend tests to confirm nothing broke**

Run: `python -m pytest rapid_ai_engine/tests/ -v --tb=short`
Expected: All tests PASS.

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete RAPID AI v2 — Zen architecture + production dashboard"
```
