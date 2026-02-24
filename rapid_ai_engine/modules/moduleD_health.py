"""
Module D — Fault Mechanism (Health Stages)
Maps SSI + SSI_slope into a degradation stage, RUL band, and escalation level.
"""
import time
import structlog

from ..schemas import (
    ModuleDRequest, ModuleDResponse, HealthStage, EscalationLevel, SystemState
)
from ..config import SSI_THRESHOLDS, SLOPE_THRESHOLDS

# ─── Module D Constants (from shared config) ─────────────────────
SSI_CRITICAL = SSI_THRESHOLDS[SystemState.critical][0]
SSI_UNSTABLE = SSI_THRESHOLDS[SystemState.unstable][0]
SSI_DEGRADING = SSI_THRESHOLDS[SystemState.degrading][0]
SLOPE_ESCALATION_UNSTABLE = SLOPE_THRESHOLDS["escalation_unstable"]
SLOPE_ESCALATION_DEGRADING = SLOPE_THRESHOLDS["escalation_degrading"]


def run(request: ModuleDRequest) -> ModuleDResponse:
    t0 = time.perf_counter()
    try:
        ssi = request.SSI
        slope = request.SSI_slope

        # ── Health Stage determination ──
        # SSI ≥ 0.80 → Critical (any slope)
        # SSI 0.60–0.80 AND slope > 0.05 → Unstable
        # SSI 0.30–0.60 AND slope ≤ 0.05 → Degrading
        # SSI < 0.30 AND slope ≤ 0.02 → Healthy
        # Edge cases: use SSI as primary, slope as tiebreaker

        if ssi >= SSI_CRITICAL:
            stage = HealthStage.Critical
            rul_band = "< 7 days"
        elif ssi >= SSI_UNSTABLE:
            stage = HealthStage.Unstable
            rul_band = "1-4 weeks"
        elif ssi >= SSI_DEGRADING:
            stage = HealthStage.Degrading
            rul_band = "1-6 months"
        else:
            stage = HealthStage.Healthy
            rul_band = "> 6 months"

        # Slope can escalate a borderline case
        if stage == HealthStage.Degrading and slope > SLOPE_ESCALATION_UNSTABLE:
            stage = HealthStage.Unstable
            rul_band = "1-4 weeks"
        elif stage == HealthStage.Healthy and slope > SLOPE_ESCALATION_DEGRADING:
            stage = HealthStage.Degrading
            rul_band = "1-6 months"

        # ── Escalation Level ──
        if stage == HealthStage.Critical:
            escalation = EscalationLevel.Level_3
            action = "Immediate intervention required"
        elif stage == HealthStage.Unstable:
            escalation = EscalationLevel.Level_2
            action = "Prepare intervention"
        elif stage == HealthStage.Degrading and slope > 0.03:
            escalation = EscalationLevel.Level_1
            action = "Schedule inspection"
        elif stage == HealthStage.Degrading:
            escalation = EscalationLevel.Level_1
            action = "Schedule inspection"
        else:
            escalation = EscalationLevel.Level_0
            action = "Continue monitoring"

        elapsed = (time.perf_counter() - t0) * 1000
        return ModuleDResponse(
            degradation_stage=stage,
            rul_band=rul_band,
            escalation_level=escalation,
            recommended_action=action,
            execution_time_ms=round(elapsed, 2),
        )
    except Exception as e:
        elapsed = (time.perf_counter() - t0) * 1000
        structlog.get_logger(__name__).error("module_error", module="D", error=str(e), exc_info=True)
        return ModuleDResponse(
            execution_time_ms=round(elapsed, 2),
            degradation_stage=HealthStage.Healthy,
            escalation_level=EscalationLevel.Level_0,
        )
