"""
Module C — Fusion (System Stability Index)
Aggregates block-level scores from B/B+/B++ into a system-level SSI.
SSI = Σ(weight_i × block_score_i)
"""
import time
import logging
from typing import Dict

from ..schemas import (
    ModuleCRequest, ModuleCResponse, SystemState, TrendClass, StabilityState
)

# ─── Profile Definitions (weight per block) ──────────────────────

PROFILES = {
    "pump_train_horizontal": {
        "id": "PROFILE_PUMP_A",
        "weights": {
            "foundation": 0.15, "ac_motor": 0.10, "coupling": 0.10,
            "shafts": 0.10, "afb": 0.25, "fluid_flow": 0.30,
        },
    },
    "gearbox_train": {
        "id": "PROFILE_GBX_A",
        "weights": {
            "foundation": 0.15, "ac_motor": 0.10, "coupling": 0.10,
            "shafts": 0.10, "gears": 0.35, "afb": 0.20,
        },
    },
    "fan_train": {
        "id": "PROFILE_FAN_A",
        "weights": {
            "foundation": 0.15, "ac_motor": 0.15, "coupling": 0.05,
            "shafts": 0.10, "afb": 0.25, "fluid_flow": 0.30,
        },
    },
}

# Default catch-all profile (equal weights)
DEFAULT_PROFILE = {
    "id": "PROFILE_DEFAULT",
    "weights": {},
}


def _block_score(b_match: float, trend_class: TrendClass, confidence: float,
                 process_corr: float) -> float:
    """
    Block Score Rules (BSR001–BSR007):
    Determine individual block score from B + B+ outputs.
    """
    # BSR007: Very strong initiator
    if b_match >= 0.90:
        return 0.90
    # BSR001: Accelerating + high confidence
    if trend_class == TrendClass.Accelerating and confidence >= 0.70:
        return 0.85
    # BSR003: Step + high confidence
    if trend_class == TrendClass.Step and confidence >= 0.70:
        return 0.80
    # BSR002: Drift + moderate confidence
    if trend_class == TrendClass.Drift and confidence >= 0.60:
        return 0.65
    # BSR004: Chaotic + high process correlation
    if trend_class == TrendClass.Chaotic and process_corr >= 0.70:
        return 0.35
    # BSR005: Initiator present but trend stable
    if b_match >= 0.70 and (trend_class == TrendClass.Stable or confidence < 0.50):
        return 0.55
    # BSR006: No initiator + stable
    if b_match < 0.30 and trend_class == TrendClass.Stable:
        return 0.15
    # Fallback
    return 0.40


def _ssi_to_state(ssi: float) -> SystemState:
    if ssi >= 0.80:
        return SystemState.critical
    elif ssi >= 0.60:
        return SystemState.unstable
    elif ssi >= 0.30:
        return SystemState.degrading
    return SystemState.stable


def _state_to_action(state: SystemState) -> str:
    return {
        SystemState.stable: "monitor",
        SystemState.degrading: "alert",
        SystemState.unstable: "intervene",
        SystemState.critical: "shutdown_or_trip",
        SystemState.process_driven: "investigate_process",
    }.get(state, "monitor")


def run(request: ModuleCRequest) -> ModuleCResponse:
    t0 = time.perf_counter()
    try:
        profile = PROFILES.get(request.system_type, DEFAULT_PROFILE)
        profile_id = request.profile_id or profile["id"]
        weights = profile.get("weights", {})

        # If no profile weights, distribute evenly
        if not weights and request.blocks:
            n = len(request.blocks)
            weights = {k: 1.0 / n for k in request.blocks}

        # Renormalize weights for blocks actually present
        if weights:
            active_weights = {k: weights[k] for k in request.blocks if k in weights}
            weight_sum = sum(active_weights.values())
            if weight_sum > 0 and weight_sum < 0.99:  # Missing blocks
                active_weights = {k: v / weight_sum for k, v in active_weights.items()}
            weights = active_weights

        # ── Compute block scores and SSI ──
        block_scores = {}
        for block_name, block_input in request.blocks.items():
            bs = _block_score(
                block_input.B_match_score,
                block_input.Bplus_trend_class,
                block_input.Bplus_confidence,
                block_input.process_correlation,
            )
            block_scores[block_name] = bs

        # SSI = weighted sum
        ssi = 0.0
        for block_name, score in block_scores.items():
            w = weights.get(block_name, 0.0)
            ssi += w * score
        ssi = max(0.0, min(1.0, ssi))

        # ── Gating rule: B++ critical instability → SSI floor ──
        if request.stability_state == StabilityState.Critical_Instability:
            ssi = max(ssi, 0.70)

        # ── System state ──
        # Check if process-driven
        process_driven_count = sum(
            1 for b in request.blocks.values() if b.process_correlation >= 0.70
        )
        if process_driven_count > len(request.blocks) / 2:
            system_state = SystemState.process_driven
        else:
            system_state = _ssi_to_state(ssi)

        # Top contributors (sorted by weighted contribution)
        contributions = [
            (name, weights.get(name, 0.0) * block_scores.get(name, 0.0))
            for name in block_scores
        ]
        contributions.sort(key=lambda x: x[1], reverse=True)
        top = [c[0] for c in contributions[:3]]

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
        elapsed = (time.perf_counter() - t0) * 1000
        logging.getLogger(__name__).error(f"Module C error: {e}", exc_info=True)
        return ModuleCResponse(
            execution_time_ms=round(elapsed, 2),
            system_type=request.system_type,
            SSI=0.0,
            system_state=SystemState.stable,
        )
