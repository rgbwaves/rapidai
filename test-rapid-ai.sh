#!/usr/bin/env bash
# test-rapid-ai.sh — Quick curl tests for RAPID AI evaluate endpoint
# Usage: ./test-rapid-ai.sh [base_url]
set -euo pipefail

BASE="${1:-http://localhost:8000}"
URL="${BASE}/rapid-ai/evaluate"

echo "=== Test 1: Without additional_signals (backward compat) ==="
curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": "1.0",
    "asset_id": "PUMP-001",
    "timestamp_utc": "2026-03-01T10:00:00Z",
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
      "values": '"$(python3 -c "import json; import math; vals=[2.8*math.sin(2*math.pi*50*i/6400)+0.3*math.sin(2*math.pi*100*i/6400) for i in range(300)]; print(json.dumps(vals))")"'
    }
  }' | python3 -m json.tool
echo ""

echo "=== Test 2: With additional_signals (V + A) + temperature ==="
curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": "1.0",
    "asset_id": "PUMP-001",
    "timestamp_utc": "2026-03-01T10:00:00Z",
    "machine_type": "pump_train_horizontal",
    "system_type": "pump_train_horizontal",
    "component": "afb",
    "criticality": 0.6,
    "failure_threshold": 8.0,
    "context": {
      "rpm": 1800,
      "temperature_c": 72.0
    },
    "signal": {
      "signal_type": "velocity",
      "direction": "H",
      "unit": "mm/s",
      "sampling_rate_hz": 6400,
      "values": '"$(python3 -c "import json; import math; vals=[2.8*math.sin(2*math.pi*50*i/6400)+0.3*math.sin(2*math.pi*100*i/6400) for i in range(300)]; print(json.dumps(vals))")"'
    },
    "additional_signals": [
      {
        "signal_type": "velocity",
        "direction": "V",
        "unit": "mm/s",
        "sampling_rate_hz": 6400,
        "values": '"$(python3 -c "import json; import math; vals=[2.1*math.sin(2*math.pi*50*i/6400)+0.2*math.sin(2*math.pi*100*i/6400) for i in range(300)]; print(json.dumps(vals))")"'
      },
      {
        "signal_type": "velocity",
        "direction": "A",
        "unit": "mm/s",
        "sampling_rate_hz": 6400,
        "values": '"$(python3 -c "import json; import math; vals=[1.9*math.sin(2*math.pi*50*i/6400)+0.15*math.sin(2*math.pi*100*i/6400) for i in range(300)]; print(json.dumps(vals))")"'
      }
    ]
  }' | python3 -m json.tool
echo ""

echo "=== Expected: Test 2 should show AFB08 (Overloading) in matched_rules ==="
echo "=== (H_V_ratio >= 1.1 with temperature_c = 72 >= 65)                  ==="
