"""Shared test fixtures for RAPID AI Engine."""
import pytest
import numpy as np
from fastapi.testclient import TestClient
from rapid_ai_engine.main import app


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def sample_signal():
    """Minimal valid signal (256 samples of sine wave + noise)."""
    np.random.seed(42)
    t = np.linspace(0, 1, 256)
    values = (2.0 * np.sin(2 * np.pi * 50 * t) + 0.5 * np.random.randn(256)).tolist()
    return values


@pytest.fixture
def sample_request(sample_signal):
    """Minimal valid FullAnalysisRequest payload."""
    return {
        "schema_version": "1.0",
        "asset_id": "TEST-001",
        "timestamp_utc": "2026-02-24T10:00:00Z",
        "machine_type": "pump_train_horizontal",
        "system_type": "pump_train_horizontal",
        "component": "afb",
        "criticality": 0.6,
        "failure_threshold": 8.0,
        "signal": {
            "signal_type": "velocity",
            "direction": "H",
            "unit": "mm/s",
            "sampling_rate_hz": 6400,
            "values": sample_signal,
        },
    }
