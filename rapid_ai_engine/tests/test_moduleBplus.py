"""Tests for Module B+ — Slope Intelligence."""
import numpy as np
from rapid_ai_engine.schemas import ModuleBPlusRequest, TrendClass
from rapid_ai_engine.modules.moduleBplus_slope import run


class TestTrendClassification:
    def test_stable_trend(self):
        values = [2.0 + 0.001 * i for i in range(20)]
        resp = run(ModuleBPlusRequest(
            asset_id="T1", timestamps=[f"2026-02-{i+1:02d}" for i in range(20)], values=values,
        ))
        assert resp.trend_class == TrendClass.Stable

    def test_step_detection(self):
        values = [1.0] * 10 + [10.0] * 10
        resp = run(ModuleBPlusRequest(
            asset_id="T1", timestamps=[f"2026-02-{i+1:02d}" for i in range(20)], values=values,
        ))
        assert resp.trend_class == TrendClass.Step

    def test_empty_values(self):
        resp = run(ModuleBPlusRequest(asset_id="T1", timestamps=[], values=[]))
        assert resp.trend_class == TrendClass.Stable
        assert resp.severity_score == 0.0
