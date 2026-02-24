"""
RAPID AI — Shared Configuration (Single Source of Truth)

All cross-cutting thresholds, coefficients, and classification functions
live here. Modules import from config instead of defining their own.

Zen of Python: "There should be one -- and preferably only one -- obvious way to do it."
"""
from .schemas import SeverityLevel, SystemState


# ─── Severity Thresholds ─────────────────────────────────────
SEVERITY_THRESHOLDS = {
    SeverityLevel.normal:  (0.0, 0.30),
    SeverityLevel.watch:   (0.30, 0.50),
    SeverityLevel.warning: (0.50, 0.80),
    SeverityLevel.alarm:   (0.80, 1.01),
}

# ─── SSI / System State Thresholds ───────────────────────────
SSI_THRESHOLDS = {
    SystemState.stable:    (0.0, 0.30),
    SystemState.degrading: (0.30, 0.60),
    SystemState.unstable:  (0.60, 0.80),
    SystemState.critical:  (0.80, 1.01),
}

# ─── Weibull Reliability Coefficients ────────────────────────
WEIBULL_COEFFICIENTS = {
    "alpha_severity": 0.8,
    "gamma_degradation": 0.6,
    "r_target": 0.90,
}

# ─── SEDL Entropy Weights ────────────────────────────────────
SEDL_WEIGHTS = {
    "SE": 0.5,
    "TE": 0.3,
    "DE": 0.2,
}

# ─── Slope / Trend Thresholds ────────────────────────────────
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

# ─── Tri-Axial Proxy Multipliers ─────────────────────────────
# When only H measurement available, approximate V and A from H.
# Based on ISO 10816-3 typical ratios for horizontal rotating machinery.
TRIAXIAL_PROXY = {
    "v_from_h": 0.85,
    "a_from_h": 0.60,
}


# ─── Classification Functions ────────────────────────────────

def classify_severity(score: float) -> SeverityLevel:
    """Classify a severity score into a SeverityLevel."""
    for level, (low, high) in SEVERITY_THRESHOLDS.items():
        if low <= score < high:
            return level
    return SeverityLevel.alarm


def classify_ssi(ssi: float) -> SystemState:
    """Classify an SSI value into a SystemState."""
    for state, (low, high) in SSI_THRESHOLDS.items():
        if low <= ssi < high:
            return state
    return SystemState.critical
