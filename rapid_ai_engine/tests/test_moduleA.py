"""Tests for Module A — Trend Engine."""
import numpy as np
from rapid_ai_engine.schemas import ModuleARequest, SeverityLevel
from rapid_ai_engine.modules.moduleA_trend import run


def _make_request(values, baseline=None):
    return ModuleARequest(
        asset_id="TEST-001", signal_type="velocity", direction="H",
        sampling_rate_hz=6400, values=values, baseline=baseline,
    )


class TestFeatureExtraction:
    def test_rms_computation(self):
        values = [1.0] * 300
        resp = run(_make_request(values))
        assert abs(resp.overall_rms - 1.0) < 0.01

    def test_peak_computation(self):
        values = [0.0] * 299 + [5.0]
        resp = run(_make_request(values))
        assert resp.peak == 5.0

    def test_short_signal_returns_defaults(self):
        resp = run(_make_request([1.0]))
        assert resp.overall_rms == 0.0


class TestSeverityScoring:
    def test_baseline_ratio_boost_alarm(self):
        resp = run(_make_request([5.0] * 300, baseline=2.0))
        assert resp.severity_score >= 0.9

    def test_baseline_ratio_boost_warning(self):
        resp = run(_make_request([3.0] * 300, baseline=1.8))
        assert resp.severity_score >= 0.7

    def test_no_baseline_uses_slope(self):
        resp = run(_make_request([1.0] * 300))
        assert resp.severity_level in [SeverityLevel.normal, SeverityLevel.watch]


class TestClassification:
    def test_machine_classification(self):
        np.random.seed(42)
        values = (3.0 + 0.1 * np.random.randn(300)).tolist()
        resp = run(_make_request(values))
        assert resp.trend_classification == "machine"
