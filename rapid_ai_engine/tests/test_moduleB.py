"""Tests for Module B — Initiator Rules."""
from rapid_ai_engine.schemas import ModuleBRequest
from rapid_ai_engine.modules.moduleB_initiators import run, RULES_DB


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
