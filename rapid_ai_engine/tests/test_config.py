"""Tests for shared config — single source of truth for thresholds."""
import pytest
from rapid_ai_engine.config import (
    SEVERITY_THRESHOLDS,
    SSI_THRESHOLDS,
    WEIBULL_COEFFICIENTS,
    SEDL_WEIGHTS,
    classify_severity,
    classify_ssi,
)
from rapid_ai_engine.schemas import SeverityLevel, SystemState


class TestSeverityClassification:
    def test_normal(self):
        assert classify_severity(0.0) == SeverityLevel.normal
        assert classify_severity(0.29) == SeverityLevel.normal

    def test_watch(self):
        assert classify_severity(0.30) == SeverityLevel.watch
        assert classify_severity(0.49) == SeverityLevel.watch

    def test_warning(self):
        assert classify_severity(0.50) == SeverityLevel.warning
        assert classify_severity(0.79) == SeverityLevel.warning

    def test_alarm(self):
        assert classify_severity(0.80) == SeverityLevel.alarm
        assert classify_severity(1.0) == SeverityLevel.alarm


class TestSSIClassification:
    def test_stable(self):
        assert classify_ssi(0.0) == SystemState.stable
        assert classify_ssi(0.29) == SystemState.stable

    def test_degrading(self):
        assert classify_ssi(0.30) == SystemState.degrading
        assert classify_ssi(0.59) == SystemState.degrading

    def test_unstable(self):
        assert classify_ssi(0.60) == SystemState.unstable
        assert classify_ssi(0.79) == SystemState.unstable

    def test_critical(self):
        assert classify_ssi(0.80) == SystemState.critical
        assert classify_ssi(1.0) == SystemState.critical


class TestConstants:
    def test_severity_thresholds_complete(self):
        assert len(SEVERITY_THRESHOLDS) == 4
        assert SeverityLevel.normal in SEVERITY_THRESHOLDS

    def test_weibull_coefficients(self):
        assert WEIBULL_COEFFICIENTS["alpha_severity"] == 0.8
        assert WEIBULL_COEFFICIENTS["gamma_degradation"] == 0.6
        assert WEIBULL_COEFFICIENTS["r_target"] == 0.90

    def test_sedl_weights_sum_to_one(self):
        assert abs(sum(SEDL_WEIGHTS.values()) - 1.0) < 0.001
