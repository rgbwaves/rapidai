"""
Module B++ — SEDL (Stability–Entropy Diagnostic Lens)
Computes Spectral Entropy, Time Entropy, Directional Entropy,
Stability Index, and determines stability state.

SI = 1 - (0.5*SE + 0.3*TE + 0.2*DE)
"""
import time
import math
import structlog
import numpy as np
from typing import Dict, List, Optional

from ..schemas import (
    ModuleBPPRequest, ModuleBPPResponse,
    StabilityState, SeverityLevel
)

# Frozen weights (WCFG01)
W_SE = 0.5
W_TE = 0.3
W_DE = 0.2


def _shannon_entropy(probs: np.ndarray) -> float:
    """Normalized Shannon entropy. Returns 0–1."""
    probs = probs[probs > 0]
    if len(probs) < 2:
        return 0.0
    n = len(probs)
    h = -float(np.sum(probs * np.log(probs)))
    h_max = math.log(n)
    return h / h_max if h_max > 0 else 0.0


def _spectral_entropy(values: np.ndarray) -> float:
    """Compute spectral entropy from FFT magnitudes."""
    if len(values) < 4:
        return 0.0
    fft_mag = np.abs(np.fft.rfft(values))[1:]  # drop DC
    if fft_mag.sum() < 1e-12:
        return 0.0
    probs = (fft_mag ** 2) / np.sum(fft_mag ** 2)
    return _shannon_entropy(probs)


def _time_entropy(values: np.ndarray, n_bins: int = 50) -> float:
    """Compute time-domain entropy from histogram of signal values."""
    if len(values) < 10:
        return 0.0
    hist, _ = np.histogram(values, bins=n_bins, density=False)
    hist = hist.astype(float)
    total = hist.sum()
    if total < 1:
        return 0.0
    probs = hist / total
    return _shannon_entropy(probs)


def _directional_entropy(energies: Dict[str, float]) -> float:
    """Compute entropy across H, V, A energy distribution."""
    vals = [energies.get("H", 0.0), energies.get("V", 0.0), energies.get("A", 0.0)]
    total = sum(vals)
    if total < 1e-12:
        return 0.0
    probs = np.array([v / total for v in vals])
    # Normalized by log(3) for 3 directions
    probs = probs[probs > 0]
    if len(probs) < 2:
        return 0.0
    h = -float(np.sum(probs * np.log(probs)))
    return h / math.log(3)


def run(request: ModuleBPPRequest) -> ModuleBPPResponse:
    t0 = time.perf_counter()
    try:
        SE = 0.0
        TE = 0.0
        DE = 0.0
        dSE_dt = 0.0

        # ── Option A: Pre-computed metrics provided ──
        if request.metrics:
            SE = request.metrics.get("SE", 0.0)
            TE = request.metrics.get("TE", 0.0)
            DE = request.metrics.get("DE", 0.0)
            dSE_dt = request.metrics.get("dSE_dt", 0.0)

        # ── Option B: Compute from raw spectra ──
        elif request.spectra:
            h_vals = np.array(request.spectra.get("H", []), dtype=float)
            v_vals = np.array(request.spectra.get("V", []), dtype=float)
            a_vals = np.array(request.spectra.get("A", []), dtype=float)

            # Spectral entropy (use H as primary)
            if len(h_vals) > 4:
                SE = _spectral_entropy(h_vals)
            if len(v_vals) > 4:
                se_v = _spectral_entropy(v_vals)
                SE = max(SE, se_v)  # worst case

            # Time entropy (use H)
            if len(h_vals) > 10:
                TE = _time_entropy(h_vals)

            # Directional entropy
            energies = {
                "H": float(np.sum(h_vals ** 2)) if len(h_vals) > 0 else 0.0,
                "V": float(np.sum(v_vals ** 2)) if len(v_vals) > 0 else 0.0,
                "A": float(np.sum(a_vals ** 2)) if len(a_vals) > 0 else 0.0,
            }
            DE = _directional_entropy(energies)

        # ── Stability Index ──
        SI = 1.0 - (W_SE * SE + W_TE * TE + W_DE * DE)
        SI = max(0.0, min(1.0, SI))

        # ── State Rules ──
        triggered_rules: List[str] = []
        state = StabilityState.Stable
        severity = SeverityLevel.normal

        # SR05: Critical instability (check first — highest priority)
        if SI <= 0.40:
            state = StabilityState.Critical_Instability
            severity = SeverityLevel.alarm
            triggered_rules.append("SR05")
        # SR04: Chaotic
        elif SE >= 0.65 and (TE >= 0.60 or DE >= 0.60):
            state = StabilityState.Chaotic
            severity = SeverityLevel.warning
            triggered_rules.append("SR04")
        # SR03: Destabilizing
        elif dSE_dt >= 0.02 and SI < 0.60:
            state = StabilityState.Destabilizing
            severity = SeverityLevel.warning
            triggered_rules.append("SR03")
        # SR02: Drifting
        elif SE > 0.35 and SE < 0.65 and dSE_dt < 0.02:
            state = StabilityState.Drifting
            severity = SeverityLevel.watch
            triggered_rules.append("SR02")
        # SR01: Stable
        elif SE <= 0.35 and TE < 0.50 and SI >= 0.70:
            state = StabilityState.Stable
            severity = SeverityLevel.normal
            triggered_rules.append("SR01")

        elapsed = (time.perf_counter() - t0) * 1000
        return ModuleBPPResponse(
            SE=round(SE, 4),
            TE=round(TE, 4),
            DE=round(DE, 4),
            dSE_dt=round(dSE_dt, 4),
            SI=round(SI, 4),
            stability_state=state,
            severity_level=severity,
            triggered_rules=triggered_rules,
            execution_time_ms=round(elapsed, 2),
        )
    except Exception as e:
        elapsed = (time.perf_counter() - t0) * 1000
        structlog.get_logger(__name__).error("module_error", module="B++", error=str(e), exc_info=True)
        return ModuleBPPResponse(
            execution_time_ms=round(elapsed, 2),
            stability_state=StabilityState.Stable,
            severity_level=SeverityLevel.normal,
            SI=1.0,
        )
