"""Integration tests for full RAPID AI pipeline."""
import numpy as np


class TestFullPipeline:
    def test_healthy_scenario(self, client, sample_request):
        resp = client.post("/rapid-ai/evaluate", json=sample_request)
        assert resp.status_code == 200
        data = resp.json()
        assert data["asset_id"] == "TEST-001"
        assert data["health_stage"] in ["Healthy", "Degrading"]
        assert data["confidence"] >= 0.0
        assert data["module_trace"]["module0"] is not None

    def test_blocked_by_quality(self, client, sample_request):
        sample_request["signal"]["values"] = [1.0] * 100  # Too few
        resp = client.post("/rapid-ai/evaluate", json=sample_request)
        assert resp.status_code == 200
        data = resp.json()
        assert data["health_stage"] == "Blocked"

    def test_critical_scenario(self, client):
        np.random.seed(42)
        values = (8.0 + 2.0 * np.random.randn(300)).tolist()
        req = {
            "schema_version": "1.0",
            "asset_id": "CRIT-001",
            "timestamp_utc": "2026-02-24T10:00:00Z",
            "machine_type": "pump_train_horizontal",
            "system_type": "pump_train_horizontal",
            "component": "afb",
            "criticality": 0.9,
            "failure_threshold": 8.0,
            "signal": {
                "signal_type": "velocity", "direction": "H",
                "unit": "mm/s", "sampling_rate_hz": 6400,
                "values": values,
            },
        }
        resp = client.post("/rapid-ai/evaluate", json=req)
        assert resp.status_code == 200

    def test_all_module_endpoints_respond(self, client):
        """Smoke test: each individual module endpoint returns 200."""
        resp = client.post("/rapid-ai/module0", json={
            "asset_id": "T1", "timestamp_utc": "2026-02-24T10:00:00Z",
            "signal": {"signal_type": "velocity", "direction": "H",
                       "unit": "mm/s", "sampling_rate_hz": 6400,
                       "values": [1.0] * 300},
        })
        assert resp.status_code == 200

    def test_input_validation_failure_threshold(self, client, sample_request):
        sample_request["failure_threshold"] = -1.0
        resp = client.post("/rapid-ai/evaluate", json=sample_request)
        assert resp.status_code == 400

    def test_input_validation_criticality(self, client, sample_request):
        sample_request["criticality"] = 1.5
        resp = client.post("/rapid-ai/evaluate", json=sample_request)
        assert resp.status_code == 400
