"""
Module E — Maintenance Plan (Priority Scoring)
P = 100 × (0.45·S + 0.25·C + 0.20·K + 0.10·U) × M_safe × R_sp × R_mp
"""
import time
import structlog
from typing import List

from ..schemas import (
    ModuleERequest, ModuleEResponse, PlanItem
)
from ..rules.loader import load_actions
from ..config import PRIORITY_WEIGHTS, PRIORITY_MODIFIERS, PRIORITY_WINDOWS

# ─── Module E Constants (from shared config) ─────────────────────
W_SEVERITY = PRIORITY_WEIGHTS["severity"]
W_CONFIDENCE = PRIORITY_WEIGHTS["confidence"]
W_CRITICALITY = PRIORITY_WEIGHTS["criticality"]
W_URGENCY = PRIORITY_WEIGHTS["urgency"]
SAFETY_MULTIPLIER = PRIORITY_MODIFIERS["safety_multiplier"]
SPARES_PENALTY = PRIORITY_MODIFIERS["spares_penalty"]
MANPOWER_PENALTY = PRIORITY_MODIFIERS["manpower_penalty"]
PRIORITY_IMMEDIATE = PRIORITY_WINDOWS["immediate"]
PRIORITY_24H = PRIORITY_WINDOWS["24h"]
PRIORITY_7D = PRIORITY_WINDOWS["7d"]


def _select_actions(diagnosis: str | None, priority: float) -> List[str]:
    """Pick action IDs based on diagnosis keywords and priority."""
    actions_data = load_actions()
    diagnosis_map = actions_data.get("diagnosis_map", {})

    if priority >= PRIORITY_IMMEDIATE:
        # Always include shutdown recommendation at top
        actions = ["ACT008"]
    else:
        actions = []

    if diagnosis:
        diag_lower = diagnosis.lower()
        for keyword, act_ids in diagnosis_map.items():
            if keyword in diag_lower:
                actions.extend(act_ids)

    # Always add confirmation run if nothing specific
    if not actions:
        actions = ["ACT001"]

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for a in actions:
        if a not in seen:
            seen.add(a)
            unique.append(a)
    return unique


def _priority_window(p: float) -> str:
    if p >= PRIORITY_IMMEDIATE:
        return "Immediate"
    elif p >= PRIORITY_24H:
        return "24 hours"
    elif p >= PRIORITY_7D:
        return "7 days"
    return "Next shutdown"


def run(request: ModuleERequest) -> ModuleEResponse:
    t0 = time.perf_counter()
    try:
        S = request.severity_score
        C = request.confidence
        K = request.criticality
        U = request.urgency

        # Safety multiplier
        M_safe = SAFETY_MULTIPLIER if request.safety_flag else 1.0

        # Spares readiness modifier
        R_sp = 1.0 if request.spares_ready else SPARES_PENALTY

        # Manpower readiness modifier
        R_mp = 1.0 if request.manpower_ready else MANPOWER_PENALTY

        # Priority formula
        base = W_SEVERITY * S + W_CONFIDENCE * C + W_CRITICALITY * K + W_URGENCY * U
        P = 100.0 * base * M_safe * R_sp * R_mp
        P = max(0.0, min(100.0, P))

        window = _priority_window(P)

        # Select actions
        action_ids = _select_actions(request.diagnosis, P)

        actions_data = load_actions()
        plan_items: List[PlanItem] = []
        for rank, act_id in enumerate(action_ids, start=1):
            cat = actions_data.get(act_id, {
                "title": f"Action {act_id}",
                "justification": "See diagnosis",
                "verification": "Verify post-action",
            })
            plan_items.append(PlanItem(
                rank=rank,
                priority_score=round(P, 2),
                window=window,
                action_id=act_id,
                action_title=cat["title"],
                justification=cat["justification"],
                verification=cat["verification"],
            ))

        elapsed = (time.perf_counter() - t0) * 1000
        return ModuleEResponse(
            plan_items=plan_items,
            total_actions=len(plan_items),
            execution_time_ms=round(elapsed, 2),
        )
    except Exception as e:
        elapsed = (time.perf_counter() - t0) * 1000
        structlog.get_logger(__name__).error("module_error", module="E", error=str(e), exc_info=True)
        return ModuleEResponse(
            execution_time_ms=round(elapsed, 2),
            plan_items=[],
            total_actions=0,
        )
