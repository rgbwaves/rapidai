"""
Module A — Trend Engine
Feature extraction + severity scoring from raw signal.
Computes RMS, peak, kurtosis, crest factor, degradation, severity.
"""
import time
import math
import structlog
import numpy as np
from typing import List, Optional

from ..schemas import (
    ModuleARequest, ModuleAResponse, SeverityLevel
)

# ─── Module A Constants ──────────────────────────────────────────
SEVERITY_MULTIPLIER = 10.0
BASELINE_RATIO_ALARM = 2.0
BASELINE_RATIO_WARNING = 1.5
BASELINE_RATIO_WATCH = 1.2
VARIANCE_CHAOTIC_THRESHOLD = 60.0
VARIANCE_PROCESS_THRESHOLD = 40.0
SLOPE_CHAOTIC_MAX = 0.05


def _logistic(x: float) -> float:
    """Sigmoid / logistic function clamped to avoid overflow."""
    x = max(-20.0, min(20.0, x))
    return 1.0 / (1.0 + math.exp(-x))


def run(request: ModuleARequest) -> ModuleAResponse:
    t0 = time.perf_counter()
    try:
        arr = np.array(request.values, dtype=float)
        clean = arr[~np.isnan(arr)]

        if len(clean) < 2:
            return ModuleAResponse(execution_time_ms=round((time.perf_counter() - t0) * 1000, 2))

        # ── Core signal statistics ──
        rms = float(np.sqrt(np.mean(clean ** 2)))
        peak = float(np.max(np.abs(clean)))
        mean = float(np.mean(clean))
        std = float(np.std(clean, ddof=1))
        cf = peak / rms if rms > 1e-12 else 0.0

        if std > 1e-12:
            kurt = float(np.mean(((clean - mean) / std) ** 4)) - 3.0
        else:
            kurt = 0.0

        # ── Baseline comparison ──
        baseline = request.baseline
        ratio = None
        degradation = 0.0

        if baseline and baseline > 1e-12:
            ratio = rms / baseline
            degradation = (rms - baseline) / baseline

        # ── Severity scoring ──
        # Approximate slope from values if we have enough
        slope = 0.0
        if len(clean) >= 4:
            x = np.arange(len(clean), dtype=float)
            raw_slope = float(np.polyfit(x, clean, 1)[0])
            # Normalize: slope per sample → slope per 1000 samples
            slope = raw_slope * min(len(clean), 1000)

        severity_score = abs(slope) * SEVERITY_MULTIPLIER
        severity_score = min(1.0, max(0.0, severity_score))

        # If we have baseline, also factor in degradation
        if degradation > 0:
            deg_severity = _logistic(degradation * abs(slope) * 5)
            severity_score = max(severity_score, deg_severity)

        severity_score = min(1.0, severity_score)

        # Also boost severity based on absolute level thresholds
        if ratio is not None:
            if ratio >= BASELINE_RATIO_ALARM:
                severity_score = max(severity_score, 0.9)
            elif ratio >= BASELINE_RATIO_WARNING:
                severity_score = max(severity_score, 0.7)
            elif ratio >= BASELINE_RATIO_WATCH:
                severity_score = max(severity_score, 0.4)

        # ── Trend classification ──
        classification = "machine"
        variance_pct = (std / mean * 100) if mean > 1e-12 else 0.0
        if variance_pct > VARIANCE_CHAOTIC_THRESHOLD and abs(slope) < SLOPE_CHAOTIC_MAX:
            classification = "chaotic"
            severity_score = 0.0  # Chaotic → no machine severity
        elif variance_pct > VARIANCE_PROCESS_THRESHOLD:
            classification = "process"

        # ── Severity level ──
        if severity_score >= 0.8:
            level = SeverityLevel.alarm
        elif severity_score >= 0.5:
            level = SeverityLevel.warning
        elif severity_score >= 0.3:
            level = SeverityLevel.watch
        else:
            level = SeverityLevel.normal

        elapsed = (time.perf_counter() - t0) * 1000
        return ModuleAResponse(
            overall_rms=round(rms, 6),
            peak=round(peak, 6),
            kurtosis=round(kurt, 4),
            crest_factor=round(cf, 4),
            baseline=baseline,
            ratio_to_baseline=round(ratio, 4) if ratio is not None else None,
            degradation=round(degradation, 6),
            severity_score=round(severity_score, 4),
            severity_level=level,
            trend_classification=classification,
            execution_time_ms=round(elapsed, 2),
        )
    except Exception as e:
        elapsed = (time.perf_counter() - t0) * 1000
        structlog.get_logger(__name__).error("module_error", module="A", error=str(e), exc_info=True)
        return ModuleAResponse(
            execution_time_ms=round(elapsed, 2),
            severity_score=0.0,
            severity_level=SeverityLevel.normal,
            trend_classification="error",
        )
