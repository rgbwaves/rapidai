"""
Module B — Initiator Rules Engine
Matches vibration/temperature metrics against 116 physics-based rules
across 12 component types (AFB, JB, TPJB, couplings, motors, etc.).

Each rule uses AND logic on directional ratios + supplementary metrics.
"""
import time
import structlog
from typing import Dict, List, Any, Optional
from ..schemas import ModuleBRequest, ModuleBResponse, MatchedRule


# ─── Rule Definitions ───────────────────────────────────────────
# Each rule: (rule_id, initiator_name, diagnosis, conditions, physics_basis)
# Conditions are list of (metric_expr, operator, threshold)
# We pre-compute derived ratios from the input metrics.

RULES_DB: Dict[str, List[dict]] = {}


def _build_afb_rules() -> List[dict]:
    """Anti-Friction Bearing rules (AFB01–AFB16)."""
    return [
        {"rule_id": "AFB01", "initiator": "Incorrect Preload - High",
         "diagnosis": "Excessive bearing preload increasing axial stiffness",
         "conditions": [("A_H_ratio", ">=", 1.2), ("V_H_ratio", "<", 0.8)],
         "severity_base": 0.6},
        {"rule_id": "AFB02", "initiator": "Wrong Clearance",
         "diagnosis": "Incorrect internal clearance shifts stiffness and load zones",
         "conditions": [("H_V_ratio", ">=", 1.6)],
         "or_conditions": [("H_V_ratio", "<", 0.6)],
         "severity_base": 0.5},
        {"rule_id": "AFB03", "initiator": "Lubrication Starvation",
         "diagnosis": "Film collapse; metal-to-metal contact generating HF impacts",
         "conditions": [("H_V_ratio", ">=", 0.9), ("H_V_ratio", "<=", 1.1),
                        ("kurtosis", ">=", 5.0)],
         "severity_base": 0.8},
        {"rule_id": "AFB04", "initiator": "Wrong Lubricant Viscosity",
         "diagnosis": "Viscosity mismatch altering damping and film thickness",
         "conditions": [("H_V_ratio", ">=", 0.9), ("H_V_ratio", "<=", 1.1),
                        ("temperature", ">=", 50)],
         "severity_base": 0.5},
        {"rule_id": "AFB05", "initiator": "Contamination",
         "diagnosis": "Particles interrupt film causing micro impacts",
         "conditions": [("kurtosis", ">=", 5.0), ("crest_factor", ">=", 2.0)],
         "severity_base": 0.6},
        {"rule_id": "AFB06", "initiator": "Shaft Imbalance",
         "diagnosis": "Centrifugal force produces radial unbalance load",
         "conditions": [("H_V_ratio", ">=", 1.2), ("H_V_ratio", "<=", 2.0),
                        ("A_H_ratio", "<", 0.3)],
         "severity_base": 0.5},
        {"rule_id": "AFB07", "initiator": "Coupling Misalignment",
         "diagnosis": "Misalignment loads axial direction strongly",
         "conditions": [("A_H_ratio", ">=", 1.3), ("A", ">=", 0.5)],
         "severity_base": 0.6},
        {"rule_id": "AFB08", "initiator": "Overloading",
         "diagnosis": "High load causing higher radial force",
         "conditions": [("H_V_ratio", ">=", 1.1), ("temperature", ">=", 65)],
         "severity_base": 0.6},
        {"rule_id": "AFB09", "initiator": "Resonance",
         "diagnosis": "Operating speed near natural frequency",
         "conditions": [("H", ">=", 3.0), ("H_V_ratio", ">=", 3.0)],
         "severity_base": 0.8},
        {"rule_id": "AFB10", "initiator": "Soft Foot",
         "diagnosis": "Uneven support changing vertical stiffness",
         "conditions": [("V_H_ratio", ">=", 1.4), ("A_V_ratio", "<", 0.3)],
         "severity_base": 0.5},
        {"rule_id": "AFB11", "initiator": "Poor Surface Finish",
         "diagnosis": "Rough raceway creates micro-impacts",
         "conditions": [("kurtosis", ">=", 5.0), ("crest_factor", ">=", 2.5)],
         "severity_base": 0.5},
        {"rule_id": "AFB12", "initiator": "VFD Bearing Currents",
         "diagnosis": "Shaft voltage discharge causing EDM pitting",
         "conditions": [("crest_factor", ">=", 3.0), ("kurtosis", ">=", 6.0)],
         "severity_base": 0.7},
        {"rule_id": "AFB13", "initiator": "Incorrect Mounting",
         "diagnosis": "Mounting distortion shifts load zones",
         "conditions": [("H_V_ratio", ">=", 1.5), ("A_H_ratio", "<", 0.5)],
         "severity_base": 0.5},
        {"rule_id": "AFB14", "initiator": "Thermal Expansion Effects",
         "diagnosis": "Axial thermal growth increases thrust load",
         "conditions": [("A_H_ratio", ">=", 1.1), ("temperature", ">=", 60)],
         "severity_base": 0.5},
        {"rule_id": "AFB15", "initiator": "False Brinelling",
         "diagnosis": "Micro-pitting under static vibration",
         "conditions": [("H", "<", 0.2), ("V", "<", 0.2), ("kurtosis", ">=", 7.0)],
         "severity_base": 0.4},
        {"rule_id": "AFB16", "initiator": "Early Micro-Slip",
         "diagnosis": "Micro-slip increases friction and heat",
         "conditions": [("H_V_ratio", ">=", 0.9), ("H_V_ratio", "<=", 1.1),
                        ("temperature", ">=", 50)],
         "severity_base": 0.4},
    ]


def _build_journal_rules() -> List[dict]:
    """Journal Bearing rules (JB01–JB12)."""
    return [
        {"rule_id": "JB01", "initiator": "Low Oil Film Thickness",
         "diagnosis": "Reduced film thickness increases metal contact",
         "conditions": [("H_V_ratio", ">=", 1.3), ("temperature", ">=", 70)],
         "severity_base": 0.6},
        {"rule_id": "JB02", "initiator": "Oil Starvation",
         "diagnosis": "Collapsed hydrodynamic wedge causing asperity contact",
         "conditions": [("H_V_ratio", ">=", 0.9), ("H_V_ratio", "<=", 1.1),
                        ("kurtosis", ">=", 6)],
         "severity_base": 0.9},
        {"rule_id": "JB03", "initiator": "Rotor Instability / Oil Whirl",
         "diagnosis": "Oil wedge cross-coupled stiffness generating unstable orbit",
         "conditions": [("H_V_ratio", ">=", 0.9), ("H_V_ratio", "<=", 1.1)],
         "severity_base": 0.7},
        {"rule_id": "JB05", "initiator": "Shaft Misalignment",
         "diagnosis": "Misalignment forces axial loading on sleeve",
         "conditions": [("A_H_ratio", ">=", 1.2)],
         "severity_base": 0.6},
        {"rule_id": "JB06", "initiator": "Excessive Clearance",
         "diagnosis": "Excess clearance causes rotor movement and impacts",
         "conditions": [("H_V_ratio", ">=", 2.0)],
         "severity_base": 0.6},
        {"rule_id": "JB08", "initiator": "Rotor Rubbing",
         "diagnosis": "Shaft contacts bearing metal or thrust face",
         "conditions": [("A_H_ratio", ">=", 0.7), ("kurtosis", ">=", 7)],
         "severity_base": 0.9},
        {"rule_id": "JB12", "initiator": "Heavy Rotor Load",
         "diagnosis": "Increased load causing larger eccentricity",
         "conditions": [("H_V_ratio", ">=", 1.4)],
         "severity_base": 0.5},
    ]


def _build_coupling_rules() -> List[dict]:
    return [
        {"rule_id": "COUP01", "initiator": "Parallel Misalignment",
         "diagnosis": "Radial offset between shafts",
         "conditions": [("H_V_ratio", ">=", 1.3), ("A_H_ratio", "<", 0.2)],
         "severity_base": 0.6},
        {"rule_id": "COUP02", "initiator": "Angular Misalignment",
         "diagnosis": "Angular offset at coupling face",
         "conditions": [("A_H_ratio", ">=", 1.3)],
         "severity_base": 0.6},
        {"rule_id": "COUP05", "initiator": "Coupling Backlash / Wear",
         "diagnosis": "Wear at coupling interface causing impacts",
         "conditions": [("A_H_ratio", ">=", 0.8), ("kurtosis", ">=", 4)],
         "severity_base": 0.5},
    ]


def _build_ac_motor_rules() -> List[dict]:
    return [
        {"rule_id": "AC01", "initiator": "Rotor Imbalance",
         "diagnosis": "Unbalanced rotor mass",
         "conditions": [("H_V_ratio", ">=", 1.2), ("H_V_ratio", "<=", 2.5),
                        ("A_H_ratio", "<", 0.3)],
         "severity_base": 0.5},
        {"rule_id": "AC03", "initiator": "Air-Gap Eccentricity",
         "diagnosis": "Non-uniform air gap causing electromagnetic force imbalance",
         "conditions": [("H_V_ratio", ">=", 2.0), ("A_H_ratio", "<", 0.2)],
         "severity_base": 0.6},
        {"rule_id": "AC04", "initiator": "Soft Foot",
         "diagnosis": "Uneven motor support",
         "conditions": [("V_H_ratio", ">=", 1.5), ("A_H_ratio", "<", 0.5)],
         "severity_base": 0.5},
        {"rule_id": "AC05", "initiator": "Misalignment",
         "diagnosis": "Coupling misalignment loading axial direction",
         "conditions": [("A_H_ratio", ">=", 1.3)],
         "severity_base": 0.6},
        {"rule_id": "AC07", "initiator": "Motor Bearing Fault",
         "diagnosis": "Bearing defect in motor",
         "conditions": [("H_V_ratio", ">=", 0.9), ("H_V_ratio", "<=", 1.1)],
         "severity_base": 0.7},
    ]


def _build_gear_rules() -> List[dict]:
    return [
        {"rule_id": "GEAR01", "initiator": "Uniform Tooth Wear",
         "diagnosis": "General gear mesh wear",
         "conditions": [("H_V_ratio", ">=", 1.2), ("H", ">=", 2.0)],
         "severity_base": 0.5},
        {"rule_id": "GEAR02", "initiator": "Localized Pitting",
         "diagnosis": "Localized tooth surface pitting",
         "conditions": [("kurtosis", ">=", 4.0)],
         "severity_base": 0.6},
        {"rule_id": "GEAR04", "initiator": "Gear Misalignment",
         "diagnosis": "Axial misalignment in gearbox",
         "conditions": [("A_H_ratio", ">=", 1.2), ("H_V_ratio", ">=", 1.2)],
         "severity_base": 0.6},
        {"rule_id": "GEAR10", "initiator": "Tooth Chipping / Breakage",
         "diagnosis": "Early tooth breakage",
         "conditions": [("kurtosis", ">=", 5.0)],
         "severity_base": 0.8},
    ]


def _build_foundation_rules() -> List[dict]:
    return [
        {"rule_id": "FND01", "initiator": "Soft Foot",
         "diagnosis": "Uneven support surface",
         "conditions": [("V_H_ratio", ">=", 1.4)],
         "severity_base": 0.5},
        {"rule_id": "FND02", "initiator": "Base Looseness",
         "diagnosis": "Loose base causing impacts",
         "conditions": [("H_V_ratio", ">=", 1.6)],
         "severity_base": 0.6},
        {"rule_id": "FND03", "initiator": "Structural Resonance",
         "diagnosis": "Structure excited at natural frequency",
         "conditions": [("H_V_ratio", ">=", 3.0)],  # or any ratio > 3.0
         "severity_base": 0.7},
    ]


def _build_fluid_flow_rules() -> List[dict]:
    return [
        {"rule_id": "FL001", "initiator": "Micro-bubble Formation",
         "diagnosis": "Early cavitation at impeller eye",
         "conditions": [("H_V_ratio", ">=", 0.9), ("H_V_ratio", "<=", 1.2)],
         "severity_base": 0.5},
        {"rule_id": "FL002", "initiator": "Continuous Cavitation",
         "diagnosis": "Severe cavitation with bubble collapse",
         "conditions": [("H", ">=", 1.3), ("V", ">=", 1.3), ("crest_factor", ">=", 3.0)],
         "severity_base": 0.8},
        {"rule_id": "FL006", "initiator": "Water Hammer",
         "diagnosis": "Sudden pressure impact waves",
         "conditions": [("crest_factor", ">=", 4.5)],
         "severity_base": 0.9},
    ]


def _build_shaft_rules() -> List[dict]:
    return [
        {"rule_id": "S01", "initiator": "Uneven Mass Distribution",
         "diagnosis": "Shaft mass imbalance",
         "conditions": [("H_V_ratio", ">=", 1.2), ("A_H_ratio", "<", 0.3)],
         "severity_base": 0.5},
        {"rule_id": "S03", "initiator": "Coupling Face Misalignment",
         "diagnosis": "Coupling faces not parallel",
         "conditions": [("A_H_ratio", ">=", 1.3), ("A_V_ratio", ">=", 1.3)],
         "severity_base": 0.6},
        {"rule_id": "S05", "initiator": "Shaft Crack",
         "diagnosis": "Propagating transverse crack — catastrophic risk",
         "conditions": [("A_H_ratio", ">=", 0.8), ("kurtosis", ">=", 4.0)],
         "severity_base": 0.95},
    ]


def _build_tpjb_rules() -> List[dict]:
    """Tilting Pad Journal Bearing rules (TPJB01–TPJB12)."""
    return [
        {"rule_id": "TPJB01", "initiator": "Pad Flutter",
         "diagnosis": "Pad oscillation due to low preload or light load",
         "conditions": [("H_V_ratio", ">=", 0.9), ("H_V_ratio", "<=", 1.1)],
         "severity_base": 0.6},
        {"rule_id": "TPJB02", "initiator": "Preload Loss",
         "diagnosis": "Reduced pad preload allowing excessive shaft motion",
         "conditions": [("H_V_ratio", ">=", 1.3), ("A_H_ratio", "<", 0.3)],
         "severity_base": 0.7},
        {"rule_id": "TPJB03", "initiator": "Pad Pivot Wear",
         "diagnosis": "Pivot point degradation altering pad geometry",
         "conditions": [("kurtosis", ">=", 4.0), ("crest_factor", ">=", 2.5)],
         "severity_base": 0.6},
        {"rule_id": "TPJB04", "initiator": "Oil Starvation",
         "diagnosis": "Insufficient oil flow to pads causing film collapse",
         "conditions": [("temperature", ">=", 75), ("H_V_ratio", ">=", 0.9), ("H_V_ratio", "<=", 1.1)],
         "severity_base": 0.9},
        {"rule_id": "TPJB05", "initiator": "Babbitt Fatigue",
         "diagnosis": "Babbitt overlay fatigue cracking under cyclic load",
         "conditions": [("kurtosis", ">=", 5.0), ("temperature", ">=", 65)],
         "severity_base": 0.8},
        {"rule_id": "TPJB06", "initiator": "Thermal Distortion",
         "diagnosis": "Pad thermal bowing from uneven heat distribution",
         "conditions": [("temperature", ">=", 70), ("A_H_ratio", ">=", 0.7), ("V", ">=", 1.5)],
         "severity_base": 0.5},
        {"rule_id": "TPJB07", "initiator": "Shaft Misalignment",
         "diagnosis": "Misalignment loading pads unevenly",
         "conditions": [("A_H_ratio", ">=", 1.2)],
         "severity_base": 0.6},
        {"rule_id": "TPJB08", "initiator": "Excessive Clearance",
         "diagnosis": "Large clearance ratio causing instability",
         "conditions": [("H_V_ratio", ">=", 2.0)],
         "severity_base": 0.6},
        {"rule_id": "TPJB09", "initiator": "Oil Whip (Severe)",
         "diagnosis": "Cross-coupled stiffness generating forward whirl above 2x threshold",
         "conditions": [("H_V_ratio", ">=", 0.9), ("H_V_ratio", "<=", 1.1), ("kurtosis", ">=", 6.0)],
         "severity_base": 0.9},
        {"rule_id": "TPJB10", "initiator": "Contamination",
         "diagnosis": "Particle contamination in oil scoring pad surface",
         "conditions": [("kurtosis", ">=", 5.0), ("crest_factor", ">=", 3.0)],
         "severity_base": 0.6},
        {"rule_id": "TPJB11", "initiator": "Overload",
         "diagnosis": "Bearing loaded beyond design capacity",
         "conditions": [("H_V_ratio", ">=", 1.4), ("temperature", ">=", 70)],
         "severity_base": 0.7},
        {"rule_id": "TPJB12", "initiator": "Rotor Rub",
         "diagnosis": "Shaft contacting pad or guard during transient",
         "conditions": [("A_H_ratio", ">=", 0.7), ("kurtosis", ">=", 7.0)],
         "severity_base": 0.9},
    ]


def _build_dc_motor_rules() -> List[dict]:
    """DC Motor rules (DC01–DC07)."""
    return [
        {"rule_id": "DC01", "initiator": "Commutator Roughness",
         "diagnosis": "Commutator surface wear causing brush bounce and arcing",
         "conditions": [("kurtosis", ">=", 4.0), ("crest_factor", ">=", 2.5)],
         "severity_base": 0.5},
        {"rule_id": "DC02", "initiator": "Brush Wear",
         "diagnosis": "Worn brushes causing intermittent contact and sparking",
         "conditions": [("kurtosis", ">=", 5.0), ("H_V_ratio", ">=", 0.9), ("H_V_ratio", "<=", 1.1)],
         "severity_base": 0.6},
        {"rule_id": "DC03", "initiator": "Armature Imbalance",
         "diagnosis": "Unbalanced armature producing radial vibration at 1x",
         "conditions": [("H_V_ratio", ">=", 1.2), ("A_H_ratio", "<", 0.3)],
         "severity_base": 0.5},
        {"rule_id": "DC04", "initiator": "Field Winding Fault",
         "diagnosis": "Asymmetric field causing electromagnetic unbalance",
         "conditions": [("H_V_ratio", ">=", 2.0)],
         "severity_base": 0.7},
        {"rule_id": "DC05", "initiator": "Bearing Fault",
         "diagnosis": "Motor bearing defect generating broadband vibration",
         "conditions": [("kurtosis", ">=", 6.0), ("crest_factor", ">=", 3.0)],
         "severity_base": 0.7},
        {"rule_id": "DC06", "initiator": "Misalignment",
         "diagnosis": "Shaft misalignment loading axial direction",
         "conditions": [("A_H_ratio", ">=", 1.3)],
         "severity_base": 0.6},
        {"rule_id": "DC07", "initiator": "Commutator Eccentricity",
         "diagnosis": "Out-of-round commutator causing periodic brush lift",
         "conditions": [("H_V_ratio", ">=", 1.5), ("kurtosis", ">=", 4.0)],
         "severity_base": 0.6},
    ]


def _build_belt_rules() -> List[dict]:
    """Belt Drive rules (B01–B05)."""
    return [
        {"rule_id": "B01", "initiator": "Belt Tension Incorrect",
         "diagnosis": "Improper belt tension causing slip or excessive load",
         "conditions": [("H_V_ratio", ">=", 1.3)],
         "severity_base": 0.5},
        {"rule_id": "B02", "initiator": "Belt Wear / Cracking",
         "diagnosis": "Belt surface degradation generating impulses at belt frequency",
         "conditions": [("kurtosis", ">=", 4.0), ("crest_factor", ">=", 2.0)],
         "severity_base": 0.6},
        {"rule_id": "B03", "initiator": "Sheave Misalignment",
         "diagnosis": "Pulley misalignment causing axial belt walk and wear",
         "conditions": [("A_H_ratio", ">=", 1.2)],
         "severity_base": 0.5},
        {"rule_id": "B04", "initiator": "Sheave Wear",
         "diagnosis": "Worn pulley groove altering belt contact geometry",
         "conditions": [("H_V_ratio", ">=", 1.4), ("kurtosis", ">=", 3.5)],
         "severity_base": 0.5},
        {"rule_id": "B05", "initiator": "Belt Resonance",
         "diagnosis": "Belt span natural frequency excited by running speed",
         "conditions": [("H", ">=", 2.0), ("H_V_ratio", ">=", 2.5)],
         "severity_base": 0.7},
    ]


def _build_chain_rules() -> List[dict]:
    """Chain Drive rules (C01–C04)."""
    return [
        {"rule_id": "C01", "initiator": "Chain Wear / Elongation",
         "diagnosis": "Link wear causing pitch elongation and meshing impacts",
         "conditions": [("kurtosis", ">=", 4.0)],
         "severity_base": 0.5},
        {"rule_id": "C02", "initiator": "Chain Tension Incorrect",
         "diagnosis": "Improper tension causing chain slap or excessive load",
         "conditions": [("H_V_ratio", ">=", 1.3), ("kurtosis", ">=", 3.5)],
         "severity_base": 0.5},
        {"rule_id": "C03", "initiator": "Sprocket Wear",
         "diagnosis": "Worn sprocket teeth causing irregular meshing",
         "conditions": [("kurtosis", ">=", 5.0), ("crest_factor", ">=", 2.5)],
         "severity_base": 0.6},
        {"rule_id": "C04", "initiator": "Chain Misalignment",
         "diagnosis": "Sprocket misalignment causing lateral chain loading",
         "conditions": [("A_H_ratio", ">=", 1.2)],
         "severity_base": 0.5},
    ]


# Initialise rules DB
RULES_DB["afb"] = _build_afb_rules()
RULES_DB["journal"] = _build_journal_rules()
RULES_DB["tpjb"] = _build_tpjb_rules()
RULES_DB["coupling"] = _build_coupling_rules()
RULES_DB["ac_motor"] = _build_ac_motor_rules()
RULES_DB["dc_motor"] = _build_dc_motor_rules()
RULES_DB["foundation"] = _build_foundation_rules()
RULES_DB["gears"] = _build_gear_rules()
RULES_DB["fluid_flow"] = _build_fluid_flow_rules()
RULES_DB["belts"] = _build_belt_rules()
RULES_DB["chains"] = _build_chain_rules()
RULES_DB["shafts"] = _build_shaft_rules()


def _compute_derived(metrics: Dict[str, float]) -> Dict[str, float]:
    """Add derived ratio metrics."""
    m = dict(metrics)
    H = m.get("H", 0.001)
    V = m.get("V", 0.001)
    A = m.get("A", 0.001)
    eps = 1e-9
    m["H_V_ratio"] = H / max(V, eps)
    m["V_H_ratio"] = V / max(H, eps)
    m["A_H_ratio"] = A / max(H, eps)
    m["A_V_ratio"] = A / max(V, eps)
    m["V_A_ratio"] = V / max(A, eps)
    return m


def _eval_condition(value: float, op: str, threshold: float) -> bool:
    if op == ">=":
        return value >= threshold
    elif op == "<=":
        return value <= threshold
    elif op == ">":
        return value > threshold
    elif op == "<":
        return value < threshold
    elif op == "==":
        return abs(value - threshold) < 1e-9
    return False


def run(request: ModuleBRequest) -> ModuleBResponse:
    t0 = time.perf_counter()
    try:
        component = request.component.lower()
        rules = RULES_DB.get(component, [])
        derived = _compute_derived(request.metrics)

        matched: List[MatchedRule] = []

        for rule in rules:
            conditions = rule["conditions"]
            or_conditions = rule.get("or_conditions", [])
            all_met = True
            triggered = []

            for (metric_key, op, thresh) in conditions:
                val = derived.get(metric_key, 0.0)
                if _eval_condition(val, op, thresh):
                    triggered.append({
                        "expr": metric_key, "op": op,
                        "threshold": thresh, "value": round(val, 4)
                    })
                else:
                    all_met = False
                    break

            # Check OR conditions if AND conditions didn't match
            if not all_met and or_conditions:
                for (metric_key, op, thresh) in or_conditions:
                    val = derived.get(metric_key, 0.0)
                    if _eval_condition(val, op, thresh):
                        all_met = True
                        triggered = [{"expr": metric_key, "op": op,
                                      "threshold": thresh, "value": round(val, 4)}]
                        break

            if all_met and triggered:
                matched.append(MatchedRule(
                    rule_id=rule["rule_id"],
                    initiator=rule["initiator"],
                    diagnosis=rule["diagnosis"],
                    score=rule["severity_base"],
                    triggered_conditions=triggered,
                ))

        # Confidence = highest matched rule severity
        confidence = max((m.score for m in matched), default=0.0)

        elapsed = (time.perf_counter() - t0) * 1000
        return ModuleBResponse(
            component=component,
            num_matches=len(matched),
            matched_rules=matched,
            confidence=round(confidence, 4),
            execution_time_ms=round(elapsed, 2),
        )
    except Exception as e:
        elapsed = (time.perf_counter() - t0) * 1000
        structlog.get_logger(__name__).error("module_error", module="B", error=str(e), exc_info=True)
        return ModuleBResponse(
            execution_time_ms=round(elapsed, 2),
            component=request.component,
            num_matches=0,
            confidence=0.0,
        )
