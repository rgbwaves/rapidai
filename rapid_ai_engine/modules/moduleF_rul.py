"""
Module F — Governance (RUL & Failure Probability + Reliability Engineering)

Three RUL models:
  Linear:       RUL = ln(threshold/current) / slope_log
  Accelerating: RUL = ln(threshold/current) / (slope_log + slope_change)
  Instability:  RUL_adj = Base_RUL × (1 − NLI)

Failure probability:
  P_30 = 1 − exp(−30 / RUL_days)
  P_adj = P_30 × confidence

Risk index:
  Risk_Index = 100 × severity × criticality

Reliability Engineering (Weibull-based):
  β_adj = β_base × (1 + α_severity × S_eff)
  η_adj = η_base × (1 − γ_degradation × SSI)
  h(t) = (β/η) × (t/η)^(β−1)
  RUL_weibull = η_adj × (−ln(R_target))^(1/β_adj) − t_current
"""
import math
import time

from ..schemas import (
    ModuleFRequest, ModuleFResponse,
    ReliabilityMetrics, BathtubPhase,
)

# ─── Component Weibull Parameters (β_base, η_base in hours) ────
COMPONENT_WEIBULL = {
    "bearing":    {"beta": 1.5, "eta": 50000},
    "seal":       {"beta": 1.2, "eta": 30000},
    "gear":       {"beta": 2.5, "eta": 80000},
    "coupling":   {"beta": 1.8, "eta": 60000},
    "motor":      {"beta": 1.3, "eta": 70000},
    "impeller":   {"beta": 2.0, "eta": 90000},
    "belt":       {"beta": 3.0, "eta": 15000},
    "foundation": {"beta": 1.1, "eta": 120000},
}

# Adjustment coefficients
ALPHA_SEVERITY = 0.8     # S_eff → β adjustment strength
GAMMA_DEGRADATION = 0.6  # SSI → η adjustment strength
R_TARGET = 0.90          # Reliability target for Weibull RUL
RUL_MAX_DAYS = 3650.0    # Maximum RUL cap (10 years)
ACCEL_MODEL_THRESHOLD = 0.01   # slope_change threshold for accelerating model
INSTABILITY_THRESHOLD = 0.6     # NLI threshold for instability adjustment


def _safe_ln_ratio(threshold: float, current: float) -> float:
    """ln(threshold / current), guarded."""
    if current <= 1e-12 or threshold <= 1e-12:
        return 0.0
    return math.log(threshold / current)


def _compute_reliability(
    component_type: str,
    severity: float,
    ssi: float,
    operating_hours: float,
    current_value: float,
    failure_threshold: float,
    baseline_value: float | None,
) -> ReliabilityMetrics:
    """Compute Weibull-based reliability metrics."""
    # Get component base parameters
    params = COMPONENT_WEIBULL.get(component_type, COMPONENT_WEIBULL["bearing"])
    beta_base = params["beta"]
    eta_base = params["eta"]

    # Condition-adjusted Weibull parameters
    beta_adj = beta_base * (1.0 + ALPHA_SEVERITY * severity)
    eta_adj = eta_base * (1.0 - GAMMA_DEGRADATION * ssi)
    eta_adj = max(eta_adj, 100.0)  # Floor to avoid division by zero

    # Hazard rate: h(t) = (β/η) × (t/η)^(β−1)
    t = max(operating_hours, 1.0)
    hazard_rate = (beta_adj / eta_adj) * ((t / eta_adj) ** (beta_adj - 1.0))

    # Bathtub phase inference
    if beta_adj < 0.8:
        phase = BathtubPhase.infant_mortality
    elif beta_adj <= 1.2:
        phase = BathtubPhase.useful_life
    else:
        phase = BathtubPhase.wear_out

    # P-F interval position
    baseline = baseline_value if baseline_value and baseline_value > 0 else current_value * 0.5
    denominator = failure_threshold - baseline
    if denominator > 1e-12:
        pf_position = (current_value - baseline) / denominator
        pf_position = max(0.0, min(1.0, pf_position))
    else:
        pf_position = 0.0

    # Weibull failure probability (30-day, conditional)
    # P_30 = [R(t) - R(t+30d)] / R(t)  where 30d ≈ 720 hours
    t_hours = t
    t_plus_30 = t_hours + 720.0
    r_t = math.exp(-((t_hours / eta_adj) ** beta_adj))
    r_t30 = math.exp(-((t_plus_30 / eta_adj) ** beta_adj))
    if r_t > 1e-12:
        weibull_p30 = (r_t - r_t30) / r_t
    else:
        weibull_p30 = 1.0
    weibull_p30 = max(0.0, min(1.0, weibull_p30))

    # Weibull-based RUL: time to reach R_target reliability
    # RUL = η_adj × (−ln(R_target))^(1/β_adj) − t_current
    try:
        weibull_rul_hours = eta_adj * ((-math.log(R_TARGET)) ** (1.0 / beta_adj)) - t_hours
        weibull_rul_days = max(0.0, weibull_rul_hours / 24.0)
        weibull_rul_days = min(3650.0, weibull_rul_days)
    except (ValueError, ZeroDivisionError):
        weibull_rul_days = 0.0

    # Nowlan & Heap pattern inference
    if beta_adj < 0.8:
        nh_pattern = "F"  # Infant mortality (68%)
    elif beta_adj <= 1.2:
        nh_pattern = "E"  # Random (14%)
    elif beta_adj <= 2.0:
        nh_pattern = "C"  # Gradual (5%)
    else:
        nh_pattern = "B"  # Wear-out (2%)

    return ReliabilityMetrics(
        beta_base=round(beta_base, 3),
        beta_adj=round(beta_adj, 3),
        eta_base_hours=eta_base,
        eta_adj_hours=round(eta_adj, 1),
        hazard_rate=round(hazard_rate, 8),
        bathtub_phase=phase,
        pf_interval_position=round(pf_position, 4),
        weibull_failure_prob_30d=round(weibull_p30, 4),
        weibull_rul_days=round(weibull_rul_days, 2),
        nowlan_heap_pattern=nh_pattern,
    )


def run(request: ModuleFRequest) -> ModuleFResponse:
    t0 = time.perf_counter()

    slope_log = request.slope_log
    slope_change = request.slope_change
    nli = request.instability_index_NLI
    confidence = request.confidence
    severity = request.severity_score
    criticality = request.criticality
    current = request.current_value
    threshold = request.failure_threshold

    # ── Select RUL model ──
    ln_ratio = _safe_ln_ratio(threshold, current)

    # Guard: if current already exceeds threshold, RUL = 0
    if current >= threshold:
        rul_days = 0.0
    elif abs(slope_log) < 1e-9:
        # No meaningful slope → very long RUL (cap at 3650 days / 10 years)
        rul_days = RUL_MAX_DAYS
    else:
        # Model selection
        if slope_change >= ACCEL_MODEL_THRESHOLD:
            # Accelerating model
            effective_slope = slope_log + slope_change
            if effective_slope > 1e-9:
                rul_days = ln_ratio / effective_slope
            else:
                rul_days = RUL_MAX_DAYS
        else:
            # Linear model
            rul_days = ln_ratio / slope_log

        # Instability adjustment
        if nli >= INSTABILITY_THRESHOLD:
            rul_days = rul_days * (1.0 - nli)

    # Clamp RUL
    rul_days = max(0.0, min(RUL_MAX_DAYS, rul_days))

    # ── Failure probability (30-day horizon) ──
    if rul_days > 1e-6:
        p_30 = 1.0 - math.exp(-30.0 / rul_days)
    else:
        p_30 = 1.0  # Already at/past threshold

    p_adj = p_30 * confidence
    p_adj = max(0.0, min(1.0, p_adj))

    # ── Risk index ──
    risk_index = 100.0 * severity * criticality
    risk_index = max(0.0, min(100.0, risk_index))

    # ── Recommended window ──
    if rul_days < 7:
        window = "Immediate"
    elif rul_days < 30:
        window = "Urgent (< 30 days)"
    elif rul_days < 180:
        window = "Planned"
    else:
        window = "Monitor"

    # ── Reliability Engineering (Weibull) ──
    reliability = _compute_reliability(
        component_type=request.component_type,
        severity=severity,
        ssi=request.SSI,
        operating_hours=request.operating_hours,
        current_value=current,
        failure_threshold=threshold,
        baseline_value=request.baseline_value,
    )

    elapsed = (time.perf_counter() - t0) * 1000
    return ModuleFResponse(
        RUL_days=round(rul_days, 2),
        failure_probability_30d=round(p_adj, 4),
        confidence=round(confidence, 4),
        risk_index=round(risk_index, 2),
        recommended_window=window,
        reliability_metrics=reliability,
        execution_time_ms=round(elapsed, 2),
    )
