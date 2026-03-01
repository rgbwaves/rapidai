#!/usr/bin/env bash
# test-rapid-ai.sh — Curl tests for RAPID AI evaluate endpoint
# Usage: ./test-rapid-ai.sh [base_url]
set -euo pipefail

BASE="${1:-http://localhost:8000}"
URL="${BASE}/rapid-ai/evaluate"

# ── Pretty-print the report object from API response ──
print_report() {
python3 -c '
import json, sys

d = json.load(sys.stdin)
r = d.get("report")
if not r:
    print("  (no report in response — pipeline may have blocked)")
    return

print()
print("=" * 60)
print("              RAPID AI — Analysis Report")
print("=" * 60)
print()
print(f"  Asset:  {d.get(\"asset_id\", \"?\")}    Health: {r[\"health_stage\"]}")
print(f"  Severity: {r[\"severity_level\"]}   Risk Index: {r[\"risk_index\"]}")
print()
print("-" * 60)
print(f"  \U0001F3AF Likelihood:        {r[\"likelihood_pct\"]:.2f}%")
print(f"     {r[\"likelihood_text\"]}")
print()
print(f"  \U0001F4C9 Degradation Index: {r[\"degradation_index\"]:.2f}")
print(f"     {r[\"degradation_text\"]}")
print()
rul = r.get("rul_days")
if rul is not None:
    print(f"  \u23F3 Remaining Life:    {rul:.0f} days")
    print()
print(f"  \U0001F50D Stability State:  {r[\"stability_state\"]}")
print("-" * 60)
print()
print("  Analysis:")
print()

issues = r.get("issues", [])
if issues:
    print("  High Probability Issues:")
    for issue in issues:
        print(f"    [{issue[\"confidence_pct\"]:.0f}%] {issue[\"rule_id\"]}: {issue[\"initiator\"]}")
        print(f"         {issue[\"diagnosis\"]}")
        ev = issue.get("evidence", [])
        if ev:
            print(f"         Evidence: {\"  \".join(ev)}")
        print()
else:
    print("  No fault initiators matched current metrics.")
    print("  System appears to be operating normally.")
    print()

print("-" * 60)
print(f"  \U0001F527 Recommended Action: {r[\"recommended_action\"]}")
print(f"  \U0001F4C5 Window:             {r[\"recommended_window\"]}")
print("=" * 60)
print()
'
}

# ─────────────────────────────────────────────────────────
# Test 1: Without additional_signals (backward compat)
# ─────────────────────────────────────────────────────────
echo "=== Test 1: H-only signal, no temperature (backward compat) ==="

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
      "values": '"$(python3 -c "import json,math; print(json.dumps([2.8*math.sin(2*math.pi*50*i/6400)+0.3*math.sin(2*math.pi*100*i/6400) for i in range(300)]))")"'
    }
  }' | print_report

# ─────────────────────────────────────────────────────────
# Test 2: Triaxial (H + V + A) + temperature
# ─────────────────────────────────────────────────────────
echo "=== Test 2: Triaxial signals + temperature (real data) ==="

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
      "values": '"$(python3 -c "import json,math; print(json.dumps([2.8*math.sin(2*math.pi*50*i/6400)+0.3*math.sin(2*math.pi*100*i/6400) for i in range(300)]))")"'
    },
    "additional_signals": [
      {
        "signal_type": "velocity",
        "direction": "V",
        "unit": "mm/s",
        "sampling_rate_hz": 6400,
        "values": '"$(python3 -c "import json,math; print(json.dumps([2.1*math.sin(2*math.pi*50*i/6400)+0.2*math.sin(2*math.pi*100*i/6400) for i in range(300)]))")"'
      },
      {
        "signal_type": "velocity",
        "direction": "A",
        "unit": "mm/s",
        "sampling_rate_hz": 6400,
        "values": '"$(python3 -c "import json,math; print(json.dumps([1.9*math.sin(2*math.pi*50*i/6400)+0.15*math.sin(2*math.pi*100*i/6400) for i in range(300)]))")"'
      }
    ]
  }' | print_report

# ─────────────────────────────────────────────────────────
# Test 3: High severity scenario (bearing fault symptoms)
# ─────────────────────────────────────────────────────────
echo "=== Test 3: High severity — bearing fault + overload + temp ==="

curl -s -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": "1.0",
    "asset_id": "PUMP-003",
    "timestamp_utc": "2026-03-01T10:00:00Z",
    "machine_type": "pump_train_horizontal",
    "system_type": "pump_train_horizontal",
    "component": "afb",
    "criticality": 0.9,
    "failure_threshold": 8.0,
    "context": {
      "rpm": 3600,
      "temperature_c": 85.0
    },
    "signal": {
      "signal_type": "velocity",
      "direction": "H",
      "unit": "mm/s",
      "sampling_rate_hz": 6400,
      "values": '"$(python3 -c "
import json,math,random
random.seed(42)
vals = [6.5*math.sin(2*math.pi*50*i/6400) + 3.0*(random.random()-0.5) + (8.0 if i%128<4 else 0) for i in range(300)]
print(json.dumps(vals))
")"'
    },
    "additional_signals": [
      {
        "signal_type": "velocity",
        "direction": "V",
        "unit": "mm/s",
        "sampling_rate_hz": 6400,
        "values": '"$(python3 -c "
import json,math,random
random.seed(99)
vals = [3.2*math.sin(2*math.pi*50*i/6400) + 1.5*(random.random()-0.5) for i in range(300)]
print(json.dumps(vals))
")"'
      },
      {
        "signal_type": "velocity",
        "direction": "A",
        "unit": "mm/s",
        "sampling_rate_hz": 6400,
        "values": '"$(python3 -c "
import json,math,random
random.seed(77)
vals = [1.0*math.sin(2*math.pi*50*i/6400) + 0.5*(random.random()-0.5) for i in range(300)]
print(json.dumps(vals))
")"'
      }
    ]
  }' | print_report

echo "=== Comparison ==="
echo "Test 1 (proxy, no temp): Proxy-ratio rules only, no temp rules"
echo "Test 2 (triaxial + 72C): AFB08 (Overloading) fires — real ratios + temp"
echo "Test 3 (high severity):  Multiple initiators — bearing fault scenario"
