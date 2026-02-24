"""Tests for Module D — Health Stages."""
from rapid_ai_engine.schemas import ModuleDRequest, HealthStage, EscalationLevel
from rapid_ai_engine.modules.moduleD_health import run


class TestHealthStageThresholds:
    def test_healthy_below_030(self):
        """SSI = 0.29 with zero slope → Healthy."""
        resp = run(ModuleDRequest(SSI=0.29, SSI_slope=0.0))
        assert resp.degradation_stage == HealthStage.Healthy
        assert resp.rul_band == "> 6 months"

    def test_degrading_at_030(self):
        """SSI = 0.30 → Degrading."""
        resp = run(ModuleDRequest(SSI=0.30, SSI_slope=0.0))
        assert resp.degradation_stage == HealthStage.Degrading
        assert resp.rul_band == "1-6 months"

    def test_unstable_at_060(self):
        """SSI = 0.60 → Unstable."""
        resp = run(ModuleDRequest(SSI=0.60, SSI_slope=0.0))
        assert resp.degradation_stage == HealthStage.Unstable
        assert resp.rul_band == "1-4 weeks"

    def test_critical_at_080(self):
        """SSI = 0.80 → Critical."""
        resp = run(ModuleDRequest(SSI=0.80, SSI_slope=0.0))
        assert resp.degradation_stage == HealthStage.Critical
        assert resp.rul_band == "< 7 days"

    def test_critical_at_100(self):
        """SSI = 1.0 → Critical."""
        resp = run(ModuleDRequest(SSI=1.0, SSI_slope=0.10))
        assert resp.degradation_stage == HealthStage.Critical


class TestSlopeEscalation:
    def test_degrading_escalated_to_unstable_by_slope(self):
        """Degrading (SSI=0.40) + slope > 0.05 → Unstable."""
        resp = run(ModuleDRequest(SSI=0.40, SSI_slope=0.06))
        assert resp.degradation_stage == HealthStage.Unstable
        assert resp.rul_band == "1-4 weeks"

    def test_degrading_not_escalated_when_slope_below_threshold(self):
        """Degrading (SSI=0.40) + slope = 0.04 → stays Degrading."""
        resp = run(ModuleDRequest(SSI=0.40, SSI_slope=0.04))
        assert resp.degradation_stage == HealthStage.Degrading

    def test_healthy_escalated_to_degrading_by_slope(self):
        """Healthy (SSI=0.20) + slope > 0.02 → Degrading."""
        resp = run(ModuleDRequest(SSI=0.20, SSI_slope=0.03))
        assert resp.degradation_stage == HealthStage.Degrading
        assert resp.rul_band == "1-6 months"

    def test_healthy_not_escalated_when_slope_below_threshold(self):
        """Healthy (SSI=0.10) + slope = 0.01 → stays Healthy."""
        resp = run(ModuleDRequest(SSI=0.10, SSI_slope=0.01))
        assert resp.degradation_stage == HealthStage.Healthy

    def test_slope_does_not_escalate_critical(self):
        """Critical cannot be escalated further."""
        resp = run(ModuleDRequest(SSI=0.85, SSI_slope=0.10))
        assert resp.degradation_stage == HealthStage.Critical

    def test_slope_boundary_degrading_to_unstable(self):
        """Slope exactly at 0.05 does NOT escalate (must be > 0.05)."""
        resp = run(ModuleDRequest(SSI=0.45, SSI_slope=0.05))
        assert resp.degradation_stage == HealthStage.Degrading

    def test_slope_boundary_healthy_to_degrading(self):
        """Slope exactly at 0.02 does NOT escalate (must be > 0.02)."""
        resp = run(ModuleDRequest(SSI=0.20, SSI_slope=0.02))
        assert resp.degradation_stage == HealthStage.Healthy


class TestEscalationLevels:
    def test_healthy_level_0(self):
        resp = run(ModuleDRequest(SSI=0.10, SSI_slope=0.0))
        assert resp.escalation_level == EscalationLevel.Level_0
        assert resp.recommended_action == "Continue monitoring"

    def test_degrading_level_1(self):
        resp = run(ModuleDRequest(SSI=0.35, SSI_slope=0.01))
        assert resp.escalation_level == EscalationLevel.Level_1
        assert resp.recommended_action == "Schedule inspection"

    def test_unstable_level_2(self):
        resp = run(ModuleDRequest(SSI=0.65, SSI_slope=0.0))
        assert resp.escalation_level == EscalationLevel.Level_2
        assert resp.recommended_action == "Prepare intervention"

    def test_critical_level_3(self):
        resp = run(ModuleDRequest(SSI=0.90, SSI_slope=0.0))
        assert resp.escalation_level == EscalationLevel.Level_3
        assert resp.recommended_action == "Immediate intervention required"
