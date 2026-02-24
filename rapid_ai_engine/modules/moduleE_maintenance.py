"""
Module E — Maintenance Plan (Priority Scoring)
P = 100 × (0.45·S + 0.25·C + 0.20·K + 0.10·U) × M_safe × R_sp × R_mp
"""
import time
import logging
from typing import List

from ..schemas import (
    ModuleERequest, ModuleEResponse, PlanItem
)

# ─── Module E Constants ──────────────────────────────────────────
W_SEVERITY = 0.45
W_CONFIDENCE = 0.25
W_CRITICALITY = 0.20
W_URGENCY = 0.10
SAFETY_MULTIPLIER = 1.5
SPARES_PENALTY = 0.7
MANPOWER_PENALTY = 0.7
PRIORITY_IMMEDIATE = 85
PRIORITY_24H = 70
PRIORITY_7D = 50

# ─── Action Catalog ──────────────────────────────────────────
ACTION_CATALOG = {
    "ACT001": {
        "title": "Vibration re-measure (confirmation run)",
        "justification": "Confirm trend before committing to intervention",
        "verification": "Compare new RMS to previous within ±10%",
    },
    "ACT002": {
        "title": "Bearing lubrication / grease replenishment",
        "justification": "High frequency or temperature rise indicates lubrication deficit",
        "verification": "HF amplitude and temperature return to baseline within 24h",
    },
    "ACT003": {
        "title": "Alignment check (laser / dial indicator)",
        "justification": "Axial dominance and coupling signature indicate misalignment",
        "verification": "Alignment report within tolerance per OEM spec",
    },
    "ACT004": {
        "title": "Balance correction (single / dual plane)",
        "justification": "1× dominance with horizontal preference indicates imbalance",
        "verification": "1× amplitude reduced by ≥50% post-correction",
    },
    "ACT005": {
        "title": "Bearing replacement (scheduled)",
        "justification": "BPFO/BPFI signatures with acceleration confirms bearing defect",
        "verification": "Post-replacement vibration within acceptance limits",
    },
    "ACT006": {
        "title": "Foundation tightening / soft foot correction",
        "justification": "V/H ratio and looseness indicate structural issues",
        "verification": "Phase stability and reduced looseness harmonics",
    },
    "ACT007": {
        "title": "Process investigation (not machine fault)",
        "justification": "Trend correlates with process variable, not machine degradation",
        "verification": "Vibration returns to normal with process stabilisation",
    },
    "ACT008": {
        "title": "Emergency shutdown / trip recommendation",
        "justification": "Critical SSI with accelerating trend, imminent failure risk",
        "verification": "Machine isolated, inspection completed before restart",
    },
}

# Stem-based mapping from diagnosis keywords to recommended action IDs
# Stems match broader word forms (e.g., "imbalanc" matches imbalance/imbalanced)
DIAGNOSIS_ACTION_MAP = {
    "imbalanc": ["ACT004", "ACT001"],
    "unbalanc": ["ACT004", "ACT001"],
    "misalign": ["ACT003", "ACT001"],
    "bearing": ["ACT002", "ACT005"],
    "lubric": ["ACT002"],
    "loose": ["ACT006", "ACT001"],
    "foundation": ["ACT006"],
    "process": ["ACT007"],
    "critical": ["ACT008"],
    "shutdown": ["ACT008"],
    "cavitat": ["ACT007", "ACT001"],
    "resonan": ["ACT006", "ACT001"],
}


def _select_actions(diagnosis: str | None, priority: float) -> List[str]:
    """Pick action IDs based on diagnosis keywords and priority."""
    if priority >= PRIORITY_IMMEDIATE:
        # Always include shutdown recommendation at top
        actions = ["ACT008"]
    else:
        actions = []

    if diagnosis:
        diag_lower = diagnosis.lower()
        for keyword, act_ids in DIAGNOSIS_ACTION_MAP.items():
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

        plan_items: List[PlanItem] = []
        for rank, act_id in enumerate(action_ids, start=1):
            cat = ACTION_CATALOG.get(act_id, {
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
        logging.getLogger(__name__).error(f"Module E error: {e}", exc_info=True)
        return ModuleEResponse(
            execution_time_ms=round(elapsed, 2),
            plan_items=[],
            total_actions=0,
        )
