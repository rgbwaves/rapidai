"""Tests for Module 0 — Data Guard."""
import numpy as np
from rapid_ai_engine.schemas import Module0Request, SignalInput, ContextInput, StatusLevel, MountType
from rapid_ai_engine.modules.module0_dataguard import run


def _make_request(values, signal_type="velocity", unit="mm/s", fs=6400, **kwargs):
    return Module0Request(
        asset_id=kwargs.get("asset_id", "TEST-001"),
        timestamp_utc="2026-02-24T10:00:00Z",
        signal=SignalInput(
            signal_type=signal_type, direction="H",
            unit=unit, sampling_rate_hz=fs, values=values,
        ),
        context=kwargs.get("context", None),
    )


class TestHardBlocks:
    def test_dg001_missing_asset_id(self):
        resp = run(_make_request([1.0] * 300, asset_id=""))
        assert resp.block is True
        assert any("DG_001" in r for r in resp.reasons)

    def test_dg002_too_few_samples(self):
        resp = run(_make_request([1.0] * 100))
        assert resp.block is True
        assert any("DG_002" in r for r in resp.reasons)

    def test_dg005_invalid_unit(self):
        resp = run(_make_request([1.0] * 300, unit="invalid"))
        assert resp.block is True
        assert any("DG_005" in r for r in resp.reasons)


class TestSoftPenalties:
    def test_dg003_nan_fraction(self):
        values = [1.0] * 290 + [float("nan")] * 10  # 3.3% NaN
        resp = run(_make_request(values))
        assert resp.block is False
        assert resp.quality_score < 1.0
        assert any("DG_003" in r for r in resp.reasons)

    def test_dg007_flatline(self):
        resp = run(_make_request([5.0] * 300))
        assert resp.block is False
        assert resp.flags.flatline is True
        assert resp.quality_score <= 0.4

    def test_dg013_rpm_missing(self):
        ctx = ContextInput(rpm=None)
        resp = run(_make_request([1.0 + 0.1 * i for i in range(300)], context=ctx))
        assert any("DG_013" in r for r in resp.reasons)
        assert resp.quality_score < 1.0


class TestQualityScoring:
    def test_clean_signal_passes(self):
        np.random.seed(42)
        values = (2.0 * np.sin(np.linspace(0, 10, 300)) + 0.1 * np.random.randn(300)).tolist()
        resp = run(_make_request(values))
        assert resp.block is False
        assert resp.quality_score >= 0.8
        assert resp.status == StatusLevel.passed

    def test_multiple_penalties_multiply(self):
        values = [1.0] * 290 + [float("nan")] * 10  # DG_003: ×0.6
        resp = run(_make_request(values, fs=999))    # DG_006: ×0.7
        assert resp.quality_score <= 0.6 * 0.7 + 0.01  # Allow rounding

    def test_metrics_computed(self):
        values = list(range(300))
        resp = run(_make_request([float(v) for v in values]))
        assert resp.metrics.sample_count == 300
        assert resp.metrics.rms > 0
