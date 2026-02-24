"""Tests for Module C — Fusion (System Stability Index)."""
from rapid_ai_engine.schemas import (
    ModuleCRequest, ModuleCResponse, BlockInput, TrendClass,
    SystemState, StabilityState,
)
from rapid_ai_engine.modules.moduleC_fusion import run


class TestSSIComputation:
    def test_ssi_weighted_sum_pump_profile(self):
        """SSI should equal weighted sum of block scores for known inputs."""
        # All blocks stable + no initiator → BSR006 → block_score = 0.15
        blocks = {
            "foundation": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.3),
            "ac_motor": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.3),
            "coupling": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.3),
            "shafts": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.3),
            "afb": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.3),
            "fluid_flow": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.3),
        }
        resp = run(ModuleCRequest(system_type="pump_train_horizontal", blocks=blocks))
        # All block scores are 0.15, weights sum to 1.0 → SSI = 0.15
        assert abs(resp.SSI - 0.15) < 0.01
        assert resp.system_state == SystemState.stable

    def test_ssi_with_high_initiator(self):
        """A single block with B_match >= 0.90 → block_score = 0.90."""
        blocks = {
            "afb": BlockInput(B_match_score=0.95, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.5),
            "fluid_flow": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.3),
        }
        resp = run(ModuleCRequest(system_type="pump_train_horizontal", blocks=blocks))
        # afb weight=0.25, fluid_flow weight=0.30 → renormalized to 0.25/0.55, 0.30/0.55
        w_afb = 0.25 / 0.55
        w_ff = 0.30 / 0.55
        expected_ssi = w_afb * 0.90 + w_ff * 0.15
        assert abs(resp.SSI - expected_ssi) < 0.02


class TestProfileWeights:
    def test_pump_train_profile_used(self):
        """pump_train_horizontal profile should be applied."""
        blocks = {
            "afb": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.3),
        }
        resp = run(ModuleCRequest(system_type="pump_train_horizontal", blocks=blocks))
        assert resp.profile_id == "PROFILE_PUMP_A"

    def test_unknown_system_type_uses_default(self):
        """Unknown system type falls back to equal-weight default."""
        blocks = {
            "block_a": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.3),
            "block_b": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.3),
        }
        resp = run(ModuleCRequest(system_type="unknown_machine", blocks=blocks))
        assert resp.profile_id == "PROFILE_DEFAULT"


class TestProcessDrivenDetection:
    def test_majority_process_correlation_triggers_process_driven(self):
        """>50% blocks with process_correlation >= 0.70 → process-driven state."""
        blocks = {
            "afb": BlockInput(B_match_score=0.5, Bplus_trend_class=TrendClass.Chaotic,
                              Bplus_confidence=0.5, process_correlation=0.80),
            "fluid_flow": BlockInput(B_match_score=0.5, Bplus_trend_class=TrendClass.Chaotic,
                                     Bplus_confidence=0.5, process_correlation=0.75),
            "coupling": BlockInput(B_match_score=0.2, Bplus_trend_class=TrendClass.Stable,
                                   Bplus_confidence=0.3, process_correlation=0.10),
        }
        resp = run(ModuleCRequest(system_type="pump_train_horizontal", blocks=blocks))
        assert resp.system_state == SystemState.process_driven
        assert resp.recommended_action == "investigate_process"

    def test_minority_process_correlation_no_process_driven(self):
        """<=50% blocks with high process_correlation → normal state mapping."""
        blocks = {
            "afb": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable,
                              Bplus_confidence=0.3, process_correlation=0.80),
            "fluid_flow": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable,
                                     Bplus_confidence=0.3, process_correlation=0.10),
            "coupling": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable,
                                   Bplus_confidence=0.3, process_correlation=0.10),
            "shafts": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable,
                                 Bplus_confidence=0.3, process_correlation=0.10),
        }
        resp = run(ModuleCRequest(system_type="pump_train_horizontal", blocks=blocks))
        assert resp.system_state != SystemState.process_driven


class TestGatingRule:
    def test_critical_instability_floors_ssi(self):
        """When stability_state = Critical_Instability, SSI should be at least 0.70."""
        blocks = {
            "afb": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.3),
        }
        resp = run(ModuleCRequest(
            system_type="pump_train_horizontal",
            blocks=blocks,
            stability_state=StabilityState.Critical_Instability,
        ))
        assert resp.SSI >= 0.70

    def test_no_gating_without_critical_instability(self):
        """Without Critical_Instability, SSI is computed normally (can be low)."""
        blocks = {
            "afb": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.3),
        }
        resp = run(ModuleCRequest(
            system_type="pump_train_horizontal",
            blocks=blocks,
            stability_state=StabilityState.Stable,
        ))
        assert resp.SSI < 0.70


class TestSystemStateMapping:
    def test_stable_state(self):
        """SSI < 0.30 → stable."""
        blocks = {
            "afb": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.3),
            "fluid_flow": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.3),
        }
        resp = run(ModuleCRequest(system_type="pump_train_horizontal", blocks=blocks))
        assert resp.SSI < 0.30
        assert resp.system_state == SystemState.stable

    def test_degrading_state(self):
        """SSI 0.30–0.60 → degrading."""
        # Use Drift + moderate confidence → block_score = 0.65 per BSR002
        blocks = {
            "afb": BlockInput(B_match_score=0.5, Bplus_trend_class=TrendClass.Drift,
                              Bplus_confidence=0.65),
            "fluid_flow": BlockInput(B_match_score=0.5, Bplus_trend_class=TrendClass.Drift,
                                     Bplus_confidence=0.65),
            "foundation": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable,
                                     Bplus_confidence=0.3),
            "ac_motor": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable,
                                   Bplus_confidence=0.3),
            "coupling": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable,
                                   Bplus_confidence=0.3),
            "shafts": BlockInput(B_match_score=0.1, Bplus_trend_class=TrendClass.Stable,
                                 Bplus_confidence=0.3),
        }
        resp = run(ModuleCRequest(system_type="pump_train_horizontal", blocks=blocks))
        assert 0.30 <= resp.SSI < 0.60
        assert resp.system_state == SystemState.degrading

    def test_critical_state(self):
        """SSI >= 0.80 → critical."""
        # Very strong initiators → block_score = 0.90 for all
        blocks = {
            "foundation": BlockInput(B_match_score=0.95, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.5),
            "ac_motor": BlockInput(B_match_score=0.95, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.5),
            "coupling": BlockInput(B_match_score=0.95, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.5),
            "shafts": BlockInput(B_match_score=0.95, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.5),
            "afb": BlockInput(B_match_score=0.95, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.5),
            "fluid_flow": BlockInput(B_match_score=0.95, Bplus_trend_class=TrendClass.Stable, Bplus_confidence=0.5),
        }
        resp = run(ModuleCRequest(system_type="pump_train_horizontal", blocks=blocks))
        assert resp.SSI >= 0.80
        assert resp.system_state == SystemState.critical
