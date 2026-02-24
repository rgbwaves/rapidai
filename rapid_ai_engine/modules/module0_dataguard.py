"""
Module 0 — Data Guard
Pre-flight quality gate. Validates signal integrity before any analytics.
Quality score = product of all triggered penalties, clamped [0, 1].
"""
import math
import time
import numpy as np
from typing import List, Tuple

from ..schemas import (
    Module0Request, Module0Response, DataGuardFlags,
    SignalMetrics, StatusLevel
)

# ─── Allowed unit sets per signal type ───
ALLOWED_UNITS = {
    "velocity": {"mm/s", "inch/s", "in/s"},
    "acceleration": {"g", "m/s²", "m/s2"},
    "displacement": {"µm", "um", "mm", "mil"},
}

# Allowed sampling rates per signal type
ALLOWED_FS = {
    "velocity": {256, 512, 1024, 2048, 2560, 5120, 6400, 10240, 25600, 51200},
    "acceleration": {256, 512, 1024, 2048, 2560, 5120, 6400, 10240, 25600, 51200},
    "displacement": {256, 512, 1024, 2048, 2560, 5120, 6400},
}


def _compute_metrics(values: List[float]) -> SignalMetrics:
    """Compute basic signal statistics."""
    arr = np.array(values, dtype=float)
    n = len(arr)
    nan_mask = np.isnan(arr)
    nan_frac = float(nan_mask.sum() / n) if n > 0 else 0.0
    clean = arr[~nan_mask]

    if len(clean) < 2:
        return SignalMetrics(sample_count=n, nan_fraction=nan_frac)

    mean = float(np.mean(clean))
    std = float(np.std(clean, ddof=1))
    rms = float(np.sqrt(np.mean(clean ** 2)))
    peak = float(np.max(np.abs(clean)))
    cf = peak / rms if rms > 1e-12 else 0.0

    # Kurtosis (excess)
    if std > 1e-12:
        kurt = float(np.mean(((clean - mean) / std) ** 4)) - 3.0
    else:
        kurt = 0.0

    # Clip fraction — values at sensor extremes
    if len(clean) > 10:
        max_val = np.max(clean)
        min_val = np.min(clean)
        clip_count = np.sum((clean >= 0.999 * max_val) | (clean <= 0.999 * min_val))
        clip_frac = float(clip_count / len(clean))
    else:
        clip_frac = 0.0

    return SignalMetrics(
        sample_count=n,
        nan_fraction=nan_frac,
        std_dev=round(std, 6),
        rms=round(rms, 6),
        peak=round(peak, 6),
        crest_factor=round(cf, 4),
        kurtosis=round(kurt, 4),
        clip_fraction=round(clip_frac, 6),
    )


def run(request: Module0Request) -> Module0Response:
    """Execute all data guard checks and return quality score."""
    t0 = time.perf_counter()
    flags = DataGuardFlags()
    reasons: List[str] = []
    penalties: List[float] = []
    blocked = False

    sig = request.signal
    values = sig.values

    # ── DG_001: Required fields presence ──
    if not request.asset_id or not request.timestamp_utc:
        blocked = True
        reasons.append("DG_001: Missing required fields (asset_id or timestamp)")

    # ── DG_002: Minimum sample count ──
    if len(values) < 256:
        blocked = True
        flags.short_signal = True
        reasons.append(f"DG_002: Too few samples ({len(values)} < 256)")

    # ── DG_005: Unit mismatch ──
    allowed = ALLOWED_UNITS.get(sig.signal_type.value, set())
    if sig.unit not in allowed:
        blocked = True
        flags.unit_mismatch = True
        reasons.append(f"DG_005: Unit '{sig.unit}' not valid for {sig.signal_type.value}")

    if blocked:
        elapsed = (time.perf_counter() - t0) * 1000
        metrics = _compute_metrics(values) if len(values) >= 2 else SignalMetrics()
        return Module0Response(
            trace_id=request.trace_id,
            status=StatusLevel.block,
            block=True,
            quality_score=0.0,
            flags=flags,
            reasons=reasons,
            metrics=metrics,
            confidence_modifier=0.0,
            execution_time_ms=round(elapsed, 2),
        )

    # Compute metrics for soft checks
    metrics = _compute_metrics(values)
    arr = np.array(values, dtype=float)

    # ── DG_003: NaN fraction ──
    if metrics.nan_fraction > 0.01:
        flags.nan_present = True
        penalties.append(0.6)
        reasons.append(f"DG_003: NaN fraction {metrics.nan_fraction:.3f} > 0.01")

    # ── DG_004: Clipping ──
    if metrics.clip_fraction > 0.01:
        flags.clipping_detected = True
        penalties.append(0.5)
        reasons.append(f"DG_004: Clipping fraction {metrics.clip_fraction:.3f} > 0.01")

    # ── DG_006: Sampling rate suspect ──
    allowed_fs = ALLOWED_FS.get(sig.signal_type.value, set())
    if sig.sampling_rate_hz not in allowed_fs:
        flags.sampling_rate_suspect = True
        penalties.append(0.7)
        reasons.append(f"DG_006: Sampling rate {sig.sampling_rate_hz} Hz suspect")

    # ── DG_007: Flatline ──
    clean = arr[~np.isnan(arr)]
    if len(clean) > 10:
        detrended_std = float(np.std(np.diff(clean)))
        if detrended_std < 1e-6:
            flags.flatline = True
            penalties.append(0.4)
            reasons.append("DG_007: Flatline detected (std of diff < 1e-6)")

    # ── DG_009: Outlier burst ──
    if len(clean) > 30 and metrics.std_dev > 1e-6:
        z_scores = np.abs((clean - np.mean(clean)) / metrics.std_dev)
        outlier_frac = float(np.sum(z_scores > 3.0) / len(clean))
        if outlier_frac > 0.02:
            flags.outlier_burst = True
            penalties.append(0.9)
            reasons.append(f"DG_009: Outlier burst fraction {outlier_frac:.3f} > 0.02")

    # ── DG_010: Spike burst (kurtosis / crest factor) ──
    if metrics.kurtosis > 8 or metrics.crest_factor > 6:
        penalties.append(0.6)
        reasons.append(f"DG_010: Spike burst (kurtosis={metrics.kurtosis:.2f}, CF={metrics.crest_factor:.2f})")

    # ── DG_013: RPM missing ──
    if request.context and request.context.rpm is None:
        penalties.append(0.85)
        reasons.append("DG_013: RPM missing — reduced feature set")

    # ── DG_016: Magnet mount risk ──
    if (request.context and request.context.mount_type and
            request.context.mount_type.value == "magnet" and metrics.rms > 10):
        penalties.append(0.8)
        reasons.append("DG_016: Magnet mount may slip at high RMS")

    # ── Compute quality score ──
    quality_score = 1.0
    for p in penalties:
        quality_score *= p
    quality_score = max(0.0, min(1.0, quality_score))

    # Determine status
    if quality_score >= 0.8:
        status = StatusLevel.passed
    elif quality_score >= 0.5:
        status = StatusLevel.warn
    else:
        status = StatusLevel.fail

    elapsed = (time.perf_counter() - t0) * 1000
    return Module0Response(
        trace_id=request.trace_id,
        status=status,
        block=False,
        quality_score=round(quality_score, 4),
        flags=flags,
        reasons=reasons,
        metrics=metrics,
        confidence_modifier=round(quality_score, 4),
        execution_time_ms=round(elapsed, 2),
    )
