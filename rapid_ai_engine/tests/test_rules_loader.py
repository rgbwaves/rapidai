"""Tests for YAML rule loader."""
import pytest
from rapid_ai_engine.rules.loader import load_actions, load_profiles, load_block_scores


class TestLoadActions:
    def test_loads_all_actions(self):
        actions = load_actions()
        assert "ACT001" in actions
        assert "ACT008" in actions

    def test_action_has_required_fields(self):
        actions = load_actions()
        act = actions["ACT001"]
        assert "title" in act
        assert "justification" in act
        assert "verification" in act

    def test_diagnosis_map_loaded(self):
        actions = load_actions()
        assert "diagnosis_map" in actions


class TestLoadProfiles:
    def test_loads_pump_profile(self):
        profiles = load_profiles()
        assert "pump_train_horizontal" in profiles
        p = profiles["pump_train_horizontal"]
        assert "id" in p
        assert "weights" in p

    def test_weights_sum_near_one(self):
        profiles = load_profiles()
        for name, profile in profiles.items():
            if isinstance(profile, dict) and "weights" in profile:
                w = sum(profile["weights"].values())
                assert abs(w - 1.0) < 0.01, f"{name} weights sum to {w}"


class TestLoadBlockScores:
    def test_loads_rules(self):
        rules = load_block_scores()
        assert len(rules) >= 7
        assert rules[0]["id"] == "BSR007"
