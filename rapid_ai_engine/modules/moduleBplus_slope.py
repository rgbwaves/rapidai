"""
Module B+ — Slope Intelligence
Computes log-domain trend slope, acceleration, and instability index.
Classifies trends: Stable, Drift, Accelerating, Chaotic, Step.
"""
import time
import math
import structlog
import numpy as np
from typing import List

from ..schemas import ModuleBPlusRequest, ModuleBPlusResponse, TrendClass

# ─── Module B+ Constants ─────────────────────────────────────────
STEP_JUMP_THRESHOLD = 0.5
CHAOTIC_VOLATILITY_THRESHOLD = 0.3
CHAOTIC_SLOPE_MAX = 0.02
ACCEL_SLOPE_THRESHOLD = 0.05
ACCEL_CHANGE_THRESHOLD = 0.02
DRIFT_SLOPE_THRESHOLD = 0.02
NLI_MULTIPLIER = 5.0


def run(request: ModuleBPlusRequest) -> ModuleBPlusResponse:
    t0 = time.perf_counter()
    try:
        values = np.array(request.values, dtype=float)
        n = len(values)

        if n < 2:
            return ModuleBPlusResponse(
                execution_time_ms=round((time.perf_counter() - t0) * 1000, 2)
            )

        # ── Log-domain transform (protect against zero/negatives) ──
        eps = 1e-9
        log_vals = np.log(np.maximum(values, eps))

        # ── Slope via least-squares regression ──
        x = np.arange(n, dtype=float)
        if n >= 2:
            coeffs = np.polyfit(x, log_vals, 1)
            slope = float(coeffs[0])  # slope per sample step
        else:
            slope = 0.0

        # ── Slope change (second derivative) ──
        slope_change = 0.0
        if n >= 4:
            mid = n // 2
            if mid >= 2 and (n - mid) >= 2:
                slope1 = float(np.polyfit(np.arange(mid), log_vals[:mid], 1)[0])
                slope2 = float(np.polyfit(np.arange(n - mid), log_vals[mid:], 1)[0])
                slope_change = slope2 - slope1

        # ── Instability index (NLI proxy) ──
        # Variance-based instability measure
        if n >= 3:
            residuals = log_vals - np.polyval(np.polyfit(x, log_vals, 1), x)
            volatility = float(np.std(residuals))
        else:
            volatility = 0.0

        # Normalize to 0–1 via sigmoid-like transform
        instability = min(1.0, volatility * NLI_MULTIPLIER)

        # ── Trend classification ──
        abs_slope = abs(slope)
        abs_change = abs(slope_change)

        # Step detection: large jump between consecutive points
        max_jump = 0.0
        if n >= 2:
            diffs = np.abs(np.diff(log_vals))
            max_jump = float(np.max(diffs))

        if max_jump > STEP_JUMP_THRESHOLD:
            trend_class = TrendClass.Step
        elif volatility > CHAOTIC_VOLATILITY_THRESHOLD and abs_slope < CHAOTIC_SLOPE_MAX:
            trend_class = TrendClass.Chaotic
        elif abs_slope > ACCEL_SLOPE_THRESHOLD and abs_change > ACCEL_CHANGE_THRESHOLD:
            trend_class = TrendClass.Accelerating
        elif abs_slope > DRIFT_SLOPE_THRESHOLD:
            trend_class = TrendClass.Drift
        else:
            trend_class = TrendClass.Stable

        # ── Severity score ──
        if trend_class == TrendClass.Chaotic:
            severity = 0.3  # Chaotic = investigate, not alarm
        elif trend_class == TrendClass.Step:
            severity = 0.8
        elif trend_class == TrendClass.Accelerating:
            severity = min(1.0, abs_slope * 10 + abs_change * 5)
        elif trend_class == TrendClass.Drift:
            severity = min(0.7, abs_slope * 8)
        else:
            severity = max(0.0, abs_slope * 3)

        elapsed = (time.perf_counter() - t0) * 1000
        return ModuleBPlusResponse(
            slope=round(slope, 6),
            slope_change=round(slope_change, 6),
            instability_index=round(instability, 4),
            trend_class=trend_class,
            severity_score=round(min(1.0, severity), 4),
            execution_time_ms=round(elapsed, 2),
        )
    except Exception as e:
        elapsed = (time.perf_counter() - t0) * 1000
        structlog.get_logger(__name__).error("module_error", module="B+", error=str(e), exc_info=True)
        return ModuleBPlusResponse(
            execution_time_ms=round(elapsed, 2),
            trend_class=TrendClass.Stable,
            severity_score=0.0,
        )
