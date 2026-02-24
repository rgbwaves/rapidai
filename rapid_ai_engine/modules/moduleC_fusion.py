"""
Module C — Fusion (System Stability Index)
Aggregates block-level scores from B/B+/B++ into a system-level SSI.
SSI = Σ(weight_i × block_score_i)
"""
import time
import structlog
from typing import Dict

from ..schemas import (
    ModuleCRequest, ModuleCResponse, SystemState, TrendClass, StabilityState
)
from ..rules.loader import load_profiles
from ..config import classify_ssi

# ─── Profile Definitions — loaded from rules/profiles.yaml ───────

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
    """Classify SSI into system state — delegates to shared config."""
    return classify_ssi(ssi)


def _state_to_action(state: SystemState) -> str:
    return {
        SystemState.stable: "monitor",
        SystemState.degrading: "alert",
        SystemState.unstable: "intervene",
        SystemState.critical: "shutdown_or_trip",
        SystemState.process_driven: "investigate_process",
    }.get(state, "monitor")


def _load_and_normalize_weights(system_type: str, blocks: Dict) -> tuple:
    """Load profile for system_type and renormalize weights for present blocks.

    Returns (profile_id, weights) where weights maps block names to
    normalized floats summing to ~1.0.
    """
    profiles = load_profiles()
    profile = profiles.get(system_type, DEFAULT_PROFILE)
    profile_id = profile["id"]
    weights = profile.get("weights", {})

    # If no profile weights, distribute evenly
    if not weights and blocks:
        n = len(blocks)
        weights = {k: 1.0 / n for k in blocks}

    # Renormalize weights for blocks actually present
    if weights:
        active_weights = {k: weights[k] for k in blocks if k in weights}
        weight_sum = sum(active_weights.values())
        if weight_sum > 0 and weight_sum < 0.99:  # Missing blocks
            active_weights = {k: v / weight_sum for k, v in active_weights.items()}
        weights = active_weights

    return profile_id, weights


def _compute_block_scores(blocks: Dict) -> Dict[str, float]:
    """Compute block scores from B/B+/B++ outputs for each block."""
    block_scores = {}
    for block_name, block_input in blocks.items():
        bs = _block_score(
            block_input.B_match_score,
            block_input.Bplus_trend_class,
            block_input.Bplus_confidence,
            block_input.process_correlation,
        )
        block_scores[block_name] = bs
    return block_scores


def _aggregate_ssi(block_scores: Dict[str, float], weights: Dict[str, float]) -> float:
    """Compute weighted SSI from block scores and weights, clamped to [0, 1]."""
    ssi = 0.0
    for block_name, score in block_scores.items():
        w = weights.get(block_name, 0.0)
        ssi += w * score
    return max(0.0, min(1.0, ssi))


def _check_process_driven(blocks: Dict) -> bool:
    """Return True if majority of blocks are process-correlated."""
    process_driven_count = sum(
        1 for b in blocks.values() if b.process_correlation >= 0.70
    )
    return process_driven_count > len(blocks) / 2


def _rank_contributors(block_scores: Dict[str, float], weights: Dict[str, float],
                       top_n: int = 3) -> list:
    """Rank blocks by weighted contribution and return top N names."""
    contributions = [
        (name, weights.get(name, 0.0) * block_scores.get(name, 0.0))
        for name in block_scores
    ]
    contributions.sort(key=lambda x: x[1], reverse=True)
    return [c[0] for c in contributions[:top_n]]


def run(request: ModuleCRequest) -> ModuleCResponse:
    t0 = time.perf_counter()
    try:
        default_profile_id, weights = _load_and_normalize_weights(
            request.system_type, request.blocks
        )
        profile_id = request.profile_id or default_profile_id

        block_scores = _compute_block_scores(request.blocks)
        ssi = _aggregate_ssi(block_scores, weights)

        # Gating rule: B++ critical instability -> SSI floor
        if request.stability_state == StabilityState.Critical_Instability:
            ssi = max(ssi, 0.70)

        # System state
        if _check_process_driven(request.blocks):
            system_state = SystemState.process_driven
        else:
            system_state = _ssi_to_state(ssi)

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
        elapsed = (time.perf_counter() - t0) * 1000
        structlog.get_logger(__name__).error("module_error", module="C", error=str(e), exc_info=True)
        return ModuleCResponse(
            execution_time_ms=round(elapsed, 2),
            system_type=request.system_type,
            SSI=0.0,
            system_state=SystemState.stable,
        )
