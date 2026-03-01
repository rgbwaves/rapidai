"""Tests for Module B — Initiator Rules."""
import math
from rapid_ai_engine.schemas import ModuleBRequest, SignalInput, ContextInput, SignalType, Direction
from rapid_ai_engine.modules.moduleB_initiators import run, RULES_DB
from rapid_ai_engine.main import (
    _extract_triaxial_metrics,
    _extract_triaxial_spectra,
    _extract_temperature,
)
from rapid_ai_engine.config import TRIAXIAL_PROXY


class TestRuleLoading:
    def test_all_12_components_populated(self):
        expected = {"afb", "journal", "tpjb", "coupling", "ac_motor",
                    "dc_motor", "foundation", "gears", "fluid_flow",
                    "belts", "chains", "shafts"}
        for comp in expected:
            assert comp in RULES_DB, f"Missing component: {comp}"
            assert len(RULES_DB[comp]) > 0, f"Empty rules for: {comp}"


class TestRuleMatching:
    def test_afb06_imbalance(self):
        resp = run(ModuleBRequest(
            asset_id="T1", component="afb",
            metrics={"H": 3.0, "V": 2.0, "A": 0.5, "kurtosis": 2.0, "crest_factor": 1.5, "temperature": 40},
        ))
        rule_ids = [r.rule_id for r in resp.matched_rules]
        assert "AFB06" in rule_ids

    def test_no_match_returns_zero_confidence(self):
        resp = run(ModuleBRequest(
            asset_id="T1", component="afb",
            metrics={"H": 1.0, "V": 1.0, "A": 0.1, "kurtosis": 1.0, "crest_factor": 1.0, "temperature": 30},
        ))
        assert resp.confidence == 0.0

    def test_unknown_component_returns_empty(self):
        resp = run(ModuleBRequest(
            asset_id="T1", component="unknown",
            metrics={"H": 5.0, "V": 1.0, "A": 0.1},
        ))
        assert resp.num_matches == 0

    def test_or_logic_afb02(self):
        """AFB02 should match via OR condition (H_V_ratio < 0.6)."""
        resp = run(ModuleBRequest(
            asset_id="T1", component="afb",
            metrics={"H": 1.0, "V": 3.0, "A": 0.5, "kurtosis": 2.0, "crest_factor": 1.5, "temperature": 40},
        ))
        rule_ids = [r.rule_id for r in resp.matched_rules]
        assert "AFB02" in rule_ids


class TestNewComponents:
    def test_tpjb_rules_exist(self):
        assert len(RULES_DB["tpjb"]) == 12

    def test_dc_motor_rules_exist(self):
        assert len(RULES_DB["dc_motor"]) == 7

    def test_belts_rules_exist(self):
        assert len(RULES_DB["belts"]) == 5

    def test_chains_rules_exist(self):
        assert len(RULES_DB["chains"]) == 4


def _make_signal(direction: str, values: list[float]) -> SignalInput:
    """Helper to create a SignalInput for testing."""
    return SignalInput(
        signal_type=SignalType.velocity,
        direction=Direction(direction),
        unit="mm/s",
        sampling_rate_hz=6400,
        values=values,
    )


class TestExtractTriaxialMetrics:
    def test_proxy_fallback_when_no_additional_signals(self):
        result = _extract_triaxial_metrics(2.8, None)
        assert result["H"] == 2.8
        assert math.isclose(result["V"], 2.8 * TRIAXIAL_PROXY["v_from_h"], rel_tol=1e-9)
        assert math.isclose(result["A"], 2.8 * TRIAXIAL_PROXY["a_from_h"], rel_tol=1e-9)

    def test_proxy_fallback_when_empty_list(self):
        result = _extract_triaxial_metrics(2.8, [])
        assert math.isclose(result["V"], 2.8 * TRIAXIAL_PROXY["v_from_h"], rel_tol=1e-9)
        assert math.isclose(result["A"], 2.8 * TRIAXIAL_PROXY["a_from_h"], rel_tol=1e-9)

    def test_real_signal_rms(self):
        """Constant signal of 2.1 should have RMS = 2.1."""
        v_signal = _make_signal("V", [2.1] * 100)
        a_signal = _make_signal("A", [1.9] * 100)
        result = _extract_triaxial_metrics(2.8, [v_signal, a_signal])
        assert result["H"] == 2.8
        assert math.isclose(result["V"], 2.1, rel_tol=1e-6)
        assert math.isclose(result["A"], 1.9, rel_tol=1e-6)

    def test_partial_signals_v_only(self):
        """Only V provided — A should fall back to proxy."""
        v_signal = _make_signal("V", [3.0] * 50)
        result = _extract_triaxial_metrics(2.0, [v_signal])
        assert math.isclose(result["V"], 3.0, rel_tol=1e-6)
        assert math.isclose(result["A"], 2.0 * TRIAXIAL_PROXY["a_from_h"], rel_tol=1e-9)

    def test_empty_values_falls_back_to_proxy(self):
        """Signal with empty values list should fall back to proxy."""
        v_signal = _make_signal("V", [])
        result = _extract_triaxial_metrics(2.0, [v_signal])
        assert math.isclose(result["V"], 2.0 * TRIAXIAL_PROXY["v_from_h"], rel_tol=1e-9)


class TestExtractTriaxialSpectra:
    def test_no_additional_signals(self):
        h_vals = list(range(300))
        result = _extract_triaxial_spectra(h_vals, None)
        assert len(result["H"]) == 256  # Truncated to 256
        assert result["V"] == []
        assert result["A"] == []

    def test_with_additional_signals(self):
        h_vals = list(range(300))
        v_signal = _make_signal("V", list(range(200)))
        a_signal = _make_signal("A", list(range(400)))
        result = _extract_triaxial_spectra(h_vals, [v_signal, a_signal])
        assert len(result["H"]) == 256
        assert len(result["V"]) == 200  # Under 256, kept as-is
        assert len(result["A"]) == 256  # Truncated to 256


class TestExtractTemperature:
    def test_temperature_from_context(self):
        ctx = ContextInput(temperature_c=72.0)
        assert _extract_temperature(ctx) == 72.0

    def test_no_context(self):
        assert _extract_temperature(None) == 0.0

    def test_context_without_temperature(self):
        ctx = ContextInput(rpm=1800)
        assert _extract_temperature(ctx) == 0.0

    def test_zero_temperature_is_valid(self):
        ctx = ContextInput(temperature_c=0.0)
        assert _extract_temperature(ctx) == 0.0


class TestTriaxialIntegration:
    def test_afb08_fires_with_real_triaxial_and_temperature(self):
        """AFB08: Overloading — H_V_ratio >= 1.1 AND temperature >= 65."""
        # vel_h=2.8, vel_v=2.1 → H_V_ratio = 2.8/2.1 ≈ 1.33 (>= 1.1 ✓)
        # temperature = 72 (>= 65 ✓)
        resp = run(ModuleBRequest(
            asset_id="T1", component="afb",
            metrics={
                "H": 2.8, "V": 2.1, "A": 1.9,
                "kurtosis": 2.0, "crest_factor": 1.5,
                "temperature": 72.0,
            },
        ))
        rule_ids = [r.rule_id for r in resp.matched_rules]
        assert "AFB08" in rule_ids, f"AFB08 not found in {rule_ids}"

    def test_afb08_blocked_by_proxy_temperature(self):
        """With proxy ratios, AFB08 needs temp >= 65 but old code sent 0.0."""
        resp = run(ModuleBRequest(
            asset_id="T1", component="afb",
            metrics={
                "H": 2.8, "V": 2.8 * 0.85, "A": 2.8 * 0.60,
                "kurtosis": 2.0, "crest_factor": 1.5,
                "temperature": 0.0,
            },
        ))
        rule_ids = [r.rule_id for r in resp.matched_rules]
        assert "AFB08" not in rule_ids
