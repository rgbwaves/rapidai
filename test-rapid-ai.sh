#!/usr/bin/env bash
# test-rapid-ai.sh — Curl tests for RAPID AI evaluate endpoint + human report
# Usage: ./test-rapid-ai.sh [base_url]
set -euo pipefail

BASE="${1:-http://localhost:8000}"
URL="${BASE}/rapid-ai/evaluate"

# ── Report generator (reads JSON from stdin, prints human report) ──
generate_report() {
python3 -c '
import json, sys

d = json.load(sys.stdin)
mt = d.get("module_trace", {})
mF = mt.get("moduleF") or {}
mA = mt.get("moduleA") or {}
mB = mt.get("moduleB") or {}
mD = mt.get("moduleD") or {}
mBpp = mt.get("moduleBpp") or {}

likelihood = mF.get("failure_probability_30d", 0) * 100
degradation = mA.get("degradation", 0)
rul_days = d.get("rul_days")
risk_index = d.get("risk_index", 0)
health = d.get("health_stage", "Unknown")
severity = d.get("final_severity_level", "unknown")
action = d.get("recommended_action", "Continue monitoring")
window = d.get("recommended_window", "Planned")
matched = mB.get("matched_rules", [])
stability = mBpp.get("stability_state", "Unknown")

# ── Likelihood interpretation ──
if likelihood < 10:
    lk_text = "Very low risk. System is healthy."
elif likelihood < 30:
    lk_text = "Low risk of failure. System is operating within safe parameters."
elif likelihood < 60:
    lk_text = "Moderate risk. Plan preventive maintenance."
else:
    lk_text = "High risk. Immediate attention required."

# ── Degradation interpretation ──
if degradation < 0.3:
    dg_text = "Minimal degradation. No action needed."
elif degradation < 1.0:
    dg_text = "Early degradation detected. Trend monitoring recommended."
elif degradation < 3.0:
    dg_text = "Moderate degradation. Monitor and schedule maintenance."
else:
    dg_text = "Significant degradation. Prioritize inspection."

# ── Print report ──
print()
print("=" * 60)
print("              RAPID AI — Analysis Report")
print("=" * 60)
print()
print(f"  Asset:  {d.get(\"asset_id\", \"?\")}    Health: {health}")
print(f"  Severity: {severity}   Risk Index: {risk_index:.2f}")
print()
print("-" * 60)
print(f"  \U0001F3AF Likelihood:        {likelihood:.2f}%")
print(f"     {lk_text}")
print()
print(f"  \U0001F4C9 Degradation Index: {degradation:.2f}")
print(f"     {dg_text}")
print()
if rul_days is not None:
    print(f"  \u23F3 Remaining Life:    {rul_days:.0f} days")
    print()
print(f"  \U0001F50D Stability State:  {stability}")
print("-" * 60)
print()
print("  Analysis:")
print()

if matched:
    # Sort by score descending
    matched.sort(key=lambda r: r.get("score", 0), reverse=True)
    print("  High Probability Issues:")
    for r in matched:
        score_pct = r.get("score", 0) * 100
        print(f"    [{score_pct:.0f}%] {r[\"rule_id\"]}: {r[\"initiator\"]}")
        print(f"         {r[\"diagnosis\"]}")
        conds = r.get("triggered_conditions", [])
        if conds:
            parts = [f"{c[\"expr\"]}={c[\"value\"]}" for c in conds]
            print(f"         Evidence: {\"  \".join(parts)}")
        print()
else:
    print("  No fault initiators matched current metrics.")
    print("  System appears to be operating normally.")
    print()

print("-" * 60)
print(f"  \U0001F527 Recommended Action: {action}")
print(f"  \U0001F4C5 Window:             {window}")
print("=" * 60)
print()
'
}

# ─────────────────────────────────────────────────────────
# Test 1: Without additional_signals (backward compat)
# ─────────────────────────────────────────────────────────
echo "=== Test 1: H-only signal, no temperature (backward compat) ==="
echo ""

RESP1=$(curl -s -X POST "$URL" \
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
  }')

echo "$RESP1" | generate_report

# ─────────────────────────────────────────────────────────
# Test 2: Triaxial (H + V + A) + temperature
# ─────────────────────────────────────────────────────────
echo "=== Test 2: Triaxial signals + temperature (real data) ==="
echo ""

RESP2=$(curl -s -X POST "$URL" \
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
  }')

echo "$RESP2" | generate_report

# ─────────────────────────────────────────────────────────
# Test 3: High severity scenario (bearing fault symptoms)
# ─────────────────────────────────────────────────────────
echo "=== Test 3: High severity — bearing fault + overload + temp ==="
echo ""

RESP3=$(curl -s -X POST "$URL" \
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
# High-amplitude signal with impulsive content (bearing fault signature)
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
  }')

echo "$RESP3" | generate_report

# ─────────────────────────────────────────────────────────
# Comparison summary
# ─────────────────────────────────────────────────────────
echo "=== Comparison ==="
echo ""
echo "Test 1 (proxy, no temp): Should show proxy-ratio rules only, no temp rules"
echo "Test 2 (triaxial + 72C): Should show AFB08 (Overloading) — real ratios + temp"
echo "Test 3 (high severity):  Should show multiple initiators — bearing fault scenario"
echo ""
