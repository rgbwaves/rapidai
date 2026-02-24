"""Tests for Module E — Maintenance Plan (Priority Scoring)."""
import pytest
from rapid_ai_engine.schemas import ModuleERequest, ModuleEResponse


def _make_request(**overrides):
    defaults = {
        "asset_id": "TEST-E-001",
        "severity_score": 0.5,
        "confidence": 0.8,
        "criticality": 0.6,
        "urgency": 0.5,
        "safety_flag": False,
        "spares_ready": True,
        "manpower_ready": True,
        "diagnosis": None,
    }
    defaults.update(overrides)
    return ModuleERequest(**defaults)


class TestPriorityFormula:
    """P = 100 × (0.45·S + 0.25·C + 0.20·K + 0.10·U) × M_safe × R_sp × R_mp"""

    def test_baseline_calculation(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        req = _make_request()
        # base = 0.45*0.5 + 0.25*0.8 + 0.20*0.6 + 0.10*0.5
        #      = 0.225 + 0.200 + 0.120 + 0.050 = 0.595
        # P = 100 * 0.595 * 1.0 * 1.0 * 1.0 = 59.5
        resp = run(req)
        assert resp.plan_items[0].priority_score == 59.5

    def test_safety_multiplier(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        req = _make_request(safety_flag=True)
        # P = 100 * 0.595 * 1.5 * 1.0 * 1.0 = 89.25
        resp = run(req)
        assert resp.plan_items[0].priority_score == 89.25

    def test_spares_penalty(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        req = _make_request(spares_ready=False)
        # P = 100 * 0.595 * 1.0 * 0.7 * 1.0 = 41.65
        resp = run(req)
        assert resp.plan_items[0].priority_score == 41.65

    def test_manpower_penalty(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        req = _make_request(manpower_ready=False)
        # P = 100 * 0.595 * 1.0 * 1.0 * 0.7 = 41.65
        resp = run(req)
        assert resp.plan_items[0].priority_score == 41.65

    def test_both_penalties(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        req = _make_request(spares_ready=False, manpower_ready=False)
        # P = 100 * 0.595 * 1.0 * 0.7 * 0.7 = 29.155
        resp = run(req)
        assert resp.plan_items[0].priority_score == 29.16  # rounded

    def test_clamped_to_100(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        req = _make_request(
            severity_score=1.0, confidence=1.0,
            criticality=1.0, urgency=1.0,
            safety_flag=True,
        )
        # base = 0.45+0.25+0.20+0.10 = 1.0
        # P = 100 * 1.0 * 1.5 = 150 → clamped to 100
        resp = run(req)
        assert resp.plan_items[0].priority_score == 100.0


class TestPriorityWindow:
    def test_immediate(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        # Need P >= 85 → safety_flag + high inputs
        req = _make_request(
            severity_score=1.0, confidence=1.0,
            criticality=1.0, urgency=1.0,
            safety_flag=True,
        )
        resp = run(req)
        assert resp.plan_items[0].window == "Immediate"

    def test_24h_window(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        # Need 70 <= P < 85 → P = 59.5 * 1.5 = 89.25 too high
        # P=74.25: severity=0.7, conf=0.9, crit=0.7, urg=0.6, safety=True
        # base = 0.45*0.7 + 0.25*0.9 + 0.20*0.7 + 0.10*0.6 = 0.315+0.225+0.14+0.06=0.74
        # P = 100 * 0.74 * 1.5 = 111 → clamped 100 → Immediate. Too high.
        # Without safety: P = 74.0
        req = _make_request(
            severity_score=0.7, confidence=0.9,
            criticality=0.7, urgency=0.6,
        )
        resp = run(req)
        assert resp.plan_items[0].window == "24 hours"

    def test_7d_window(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        req = _make_request()
        # P = 59.5
        resp = run(req)
        assert resp.plan_items[0].window == "7 days"

    def test_next_shutdown_window(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        req = _make_request(
            severity_score=0.2, confidence=0.3,
            criticality=0.2, urgency=0.1,
        )
        # base = 0.45*0.2 + 0.25*0.3 + 0.20*0.2 + 0.10*0.1 = 0.09+0.075+0.04+0.01 = 0.215
        # P = 21.5
        resp = run(req)
        assert resp.plan_items[0].window == "Next shutdown"


class TestActionSelection:
    def test_imbalance_diagnosis(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        req = _make_request(diagnosis="Imbalance detected on drive end")
        resp = run(req)
        action_ids = [item.action_id for item in resp.plan_items]
        assert "ACT004" in action_ids  # Balance correction

    def test_bearing_diagnosis(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        req = _make_request(diagnosis="Bearing defect BPFO pattern")
        resp = run(req)
        action_ids = [item.action_id for item in resp.plan_items]
        assert "ACT002" in action_ids  # Lubrication
        assert "ACT005" in action_ids  # Bearing replacement

    def test_misalignment_diagnosis(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        req = _make_request(diagnosis="Misalignment coupling signature")
        resp = run(req)
        action_ids = [item.action_id for item in resp.plan_items]
        assert "ACT003" in action_ids  # Alignment check

    def test_high_priority_includes_shutdown(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        req = _make_request(
            severity_score=1.0, confidence=1.0,
            criticality=1.0, urgency=1.0,
            safety_flag=True,
        )
        resp = run(req)
        assert resp.plan_items[0].action_id == "ACT008"  # Shutdown first

    def test_no_diagnosis_defaults_to_confirmation(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        req = _make_request(
            severity_score=0.2, confidence=0.3,
            criticality=0.2, urgency=0.1,
        )
        resp = run(req)
        action_ids = [item.action_id for item in resp.plan_items]
        assert "ACT001" in action_ids  # Confirmation run

    def test_stem_matching_lubric(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        req = _make_request(diagnosis="Lubrication deficit observed")
        resp = run(req)
        action_ids = [item.action_id for item in resp.plan_items]
        assert "ACT002" in action_ids

    def test_deduplication(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        # "bearing" maps to ACT002 + ACT005, should not duplicate
        req = _make_request(diagnosis="bearing bearing bearing")
        resp = run(req)
        action_ids = [item.action_id for item in resp.plan_items]
        assert len(action_ids) == len(set(action_ids))


class TestResponseShape:
    def test_total_actions_matches(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        req = _make_request(diagnosis="bearing defect")
        resp = run(req)
        assert resp.total_actions == len(resp.plan_items)

    def test_plan_item_fields(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        req = _make_request()
        resp = run(req)
        item = resp.plan_items[0]
        assert item.rank == 1
        assert item.priority_score > 0
        assert item.window
        assert item.action_id
        assert item.action_title
        assert item.justification
        assert item.verification

    def test_execution_time_present(self):
        from rapid_ai_engine.modules.moduleE_maintenance import run
        req = _make_request()
        resp = run(req)
        assert resp.execution_time_ms >= 0
