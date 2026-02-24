"""Tests for Module B++ — SEDL."""
from rapid_ai_engine.schemas import ModuleBPPRequest, StabilityState, SeverityLevel
from rapid_ai_engine.modules.moduleBpp_sedl import run


class TestPrecomputedMetrics:
    def test_stable_state(self):
        resp = run(ModuleBPPRequest(
            asset_id="T1", metrics={"SE": 0.2, "TE": 0.3, "DE": 0.1, "dSE_dt": 0.001},
        ))
        assert resp.stability_state == StabilityState.Stable
        assert resp.SI >= 0.70

    def test_critical_instability(self):
        resp = run(ModuleBPPRequest(
            asset_id="T1", metrics={"SE": 0.8, "TE": 0.7, "DE": 0.6, "dSE_dt": 0.05},
        ))
        assert resp.stability_state == StabilityState.Critical_Instability
        assert resp.severity_level == SeverityLevel.alarm

    def test_drifting_state(self):
        resp = run(ModuleBPPRequest(
            asset_id="T1", metrics={"SE": 0.45, "TE": 0.3, "DE": 0.2, "dSE_dt": 0.01},
        ))
        assert resp.stability_state == StabilityState.Drifting


class TestSIComputation:
    def test_si_formula(self):
        resp = run(ModuleBPPRequest(
            asset_id="T1", metrics={"SE": 0.4, "TE": 0.3, "DE": 0.2, "dSE_dt": 0.0},
        ))
        expected_si = 1.0 - (0.5 * 0.4 + 0.3 * 0.3 + 0.2 * 0.2)
        assert abs(resp.SI - expected_si) < 0.01
