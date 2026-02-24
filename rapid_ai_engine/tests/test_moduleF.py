"""Tests for Module F — Governance (RUL & Failure Probability + Reliability Engineering)."""
import math
import pytest
from rapid_ai_engine.schemas import ModuleFRequest, ModuleFResponse


def _make_request(**overrides):
    defaults = {
        "asset_id": "TEST-F-001",
        "slope_log": 0.01,
        "slope_change": 0.0,
        "instability_index_NLI": 0.2,
        "confidence": 0.85,
        "severity_score": 0.5,
        "criticality": 0.6,
        "current_value": 3.0,
        "failure_threshold": 8.0,
        "component_type": "bearing",
        "SSI": 0.4,
        "operating_hours": 10000,
        "baseline_value": 1.5,
    }
    defaults.update(overrides)
    return ModuleFRequest(**defaults)


class TestRULLinearModel:
    """Linear: RUL = ln(threshold/current) / slope_log"""

    def test_basic_linear_rul(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(slope_log=0.01, slope_change=0.0)
        resp = run(req)
        # ln(8/3) / 0.01 = 0.9808 / 0.01 = 98.08 days
        expected = math.log(8.0 / 3.0) / 0.01
        assert abs(resp.RUL_days - round(expected, 2)) < 0.1

    def test_current_at_threshold(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(current_value=8.0)
        resp = run(req)
        assert resp.RUL_days == 0.0

    def test_current_above_threshold(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(current_value=10.0)
        resp = run(req)
        assert resp.RUL_days == 0.0

    def test_zero_slope_gives_max_rul(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(slope_log=0.0)
        resp = run(req)
        assert resp.RUL_days == 3650.0  # RUL_MAX_DAYS


class TestRULAcceleratingModel:
    """Accelerating: RUL = ln(threshold/current) / (slope_log + slope_change)"""

    def test_accelerating_reduces_rul(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        linear_req = _make_request(slope_log=0.01, slope_change=0.0)
        accel_req = _make_request(slope_log=0.01, slope_change=0.02)
        linear_resp = run(linear_req)
        accel_resp = run(accel_req)
        assert accel_resp.RUL_days < linear_resp.RUL_days

    def test_accelerating_formula(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(slope_log=0.01, slope_change=0.02)
        resp = run(req)
        expected = math.log(8.0 / 3.0) / (0.01 + 0.02)
        assert abs(resp.RUL_days - round(expected, 2)) < 0.1


class TestRULInstabilityAdjustment:
    """Instability: RUL_adj = Base_RUL × (1 − NLI) when NLI >= 0.6"""

    def test_nli_below_threshold_no_adjustment(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(instability_index_NLI=0.5)
        resp = run(req)
        expected = math.log(8.0 / 3.0) / 0.01
        assert abs(resp.RUL_days - round(expected, 2)) < 0.1

    def test_nli_above_threshold_adjusts(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(instability_index_NLI=0.7)
        resp = run(req)
        base_rul = math.log(8.0 / 3.0) / 0.01
        expected = base_rul * (1.0 - 0.7)
        assert abs(resp.RUL_days - round(expected, 2)) < 0.1

    def test_nli_at_threshold_adjusts(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(instability_index_NLI=0.6)
        resp = run(req)
        base_rul = math.log(8.0 / 3.0) / 0.01
        expected = base_rul * 0.4
        assert abs(resp.RUL_days - round(expected, 2)) < 0.1


class TestFailureProbability:
    """P_30 = 1 − exp(−30 / RUL_days), P_adj = P_30 × confidence"""

    def test_failure_prob_formula(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request()
        resp = run(req)
        rul = resp.RUL_days
        expected_p30 = 1.0 - math.exp(-30.0 / rul)
        expected_padj = expected_p30 * 0.85
        assert abs(resp.failure_probability_30d - round(expected_padj, 4)) < 0.001

    def test_failure_prob_at_threshold(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(current_value=8.0)
        resp = run(req)
        # RUL=0 → P_30=1.0, P_adj = 1.0 * 0.85 = 0.85
        assert resp.failure_probability_30d == 0.85


class TestRiskIndex:
    """Risk_Index = 100 × severity × criticality, clamped [0, 100]"""

    def test_risk_index_formula(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(severity_score=0.5, criticality=0.6)
        resp = run(req)
        assert resp.risk_index == 30.0

    def test_risk_index_max(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(severity_score=1.0, criticality=1.0)
        resp = run(req)
        assert resp.risk_index == 100.0


class TestRecommendedWindow:
    def test_immediate_window(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(current_value=7.9, slope_log=0.5)
        resp = run(req)
        # Very short RUL → Immediate
        assert resp.recommended_window == "Immediate"

    def test_monitor_window(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(slope_log=0.001)
        resp = run(req)
        # Long RUL → Monitor
        assert resp.recommended_window == "Monitor"


class TestWeibullReliability:
    """Weibull-based reliability metrics."""

    def test_bearing_defaults(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(component_type="bearing")
        resp = run(req)
        rm = resp.reliability_metrics
        assert rm.beta_base == 1.5
        assert rm.eta_base_hours == 50000

    def test_beta_adjusted_by_severity(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(severity_score=0.5, component_type="bearing")
        resp = run(req)
        rm = resp.reliability_metrics
        # beta_adj = 1.5 * (1 + 0.8 * 0.5) = 1.5 * 1.4 = 2.1
        assert rm.beta_adj == 2.1

    def test_eta_adjusted_by_ssi(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(SSI=0.4, component_type="bearing")
        resp = run(req)
        rm = resp.reliability_metrics
        # eta_adj = 50000 * (1 - 0.6 * 0.4) = 50000 * 0.76 = 38000
        assert rm.eta_adj_hours == 38000.0

    def test_bathtub_phase_wear_out(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        # High severity → high beta_adj → wear_out
        req = _make_request(severity_score=0.8)
        resp = run(req)
        assert resp.reliability_metrics.bathtub_phase == "wear_out"

    def test_unknown_component_falls_back_to_bearing(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(component_type="unknown_widget")
        resp = run(req)
        rm = resp.reliability_metrics
        assert rm.beta_base == 1.5  # Bearing defaults
        assert rm.eta_base_hours == 50000

    def test_pf_interval_position(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(current_value=3.0, failure_threshold=8.0, baseline_value=1.5)
        resp = run(req)
        # pf_pos = (3.0 - 1.5) / (8.0 - 1.5) = 1.5 / 6.5 ≈ 0.2308
        assert abs(resp.reliability_metrics.pf_interval_position - 0.2308) < 0.001

    def test_weibull_failure_prob_30d(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request()
        resp = run(req)
        assert 0.0 <= resp.reliability_metrics.weibull_failure_prob_30d <= 1.0

    def test_nowlan_heap_pattern(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(severity_score=0.8)
        resp = run(req)
        # High beta_adj > 2.0 → pattern B (Wear-out)
        assert resp.reliability_metrics.nowlan_heap_pattern == "B"

    def test_gear_component(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request(component_type="gear")
        resp = run(req)
        rm = resp.reliability_metrics
        assert rm.beta_base == 2.5
        assert rm.eta_base_hours == 80000


class TestResponseShape:
    def test_execution_time_present(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request()
        resp = run(req)
        assert resp.execution_time_ms >= 0

    def test_all_fields_present(self):
        from rapid_ai_engine.modules.moduleF_rul import run
        req = _make_request()
        resp = run(req)
        assert resp.RUL_days is not None
        assert resp.failure_probability_30d is not None
        assert resp.confidence is not None
        assert resp.risk_index is not None
        assert resp.recommended_window is not None
        assert resp.reliability_metrics is not None
