"""
RAPID AI — Canonical Pydantic Schemas (v1.0 Frozen)
All request/response models for Modules 0 through F + Orchestrator.
"""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
import math


# ─── Enumerations ───────────────────────────────────────────────

class SignalType(str, Enum):
    velocity = "velocity"
    acceleration = "acceleration"
    displacement = "displacement"

class Direction(str, Enum):
    H = "H"; V = "V"; A = "A"
    X = "X"; Y = "Y"; Z = "Z"
    RAD = "RAD"; AX = "AX"

class MountType(str, Enum):
    stud = "stud"; adhesive = "adhesive"; magnet = "magnet"
    handheld = "handheld"; pad = "pad"

class Location(str, Enum):
    DE = "DE"; NDE = "NDE"
    GB_IN = "GB_IN"; GB_OUT = "GB_OUT"
    PUMP_DE = "PUMP_DE"; PUMP_NDE = "PUMP_NDE"
    Casing = "Casing"

class StatusLevel(str, Enum):
    passed = "pass"
    warn = "warn"
    fail = "fail"
    block = "block"

class SeverityLevel(str, Enum):
    normal = "normal"
    watch = "watch"
    warning = "warning"
    alarm = "alarm"

class TrendClass(str, Enum):
    Stable = "Stable"
    Drift = "Drift"
    Accelerating = "Accelerating"
    Chaotic = "Chaotic"
    Step = "Step"

class StabilityState(str, Enum):
    Stable = "Stable"
    Drifting = "Drifting"
    Destabilizing = "Destabilizing"
    Chaotic = "Chaotic"
    Critical_Instability = "Critical_Instability"

class SystemState(str, Enum):
    stable = "stable"
    degrading = "degrading"
    unstable = "unstable"
    critical = "critical"
    process_driven = "process-driven"

class HealthStage(str, Enum):
    Healthy = "Healthy"
    Degrading = "Degrading"
    Unstable = "Unstable"
    Critical = "Critical"
    Blocked = "Blocked"  # Data quality blocked pipeline

class EscalationLevel(str, Enum):
    Level_0 = "Level_0"
    Level_1 = "Level_1"
    Level_2 = "Level_2"
    Level_3 = "Level_3"


# ─── Module 0: Data Guard ──────────────────────────────────────

class SignalInput(BaseModel):
    signal_type: SignalType
    direction: Direction
    unit: str
    sampling_rate_hz: int
    values: List[float]

class ContextInput(BaseModel):
    rpm: Optional[float] = None
    temperature_c: Optional[float] = None
    sensor_id: Optional[str] = None
    sensor_range: Optional[str] = None
    mount_type: Optional[MountType] = None
    location: Optional[Location] = None

class Module0Request(BaseModel):
    schema_version: str = "1.0"
    trace_id: Optional[str] = None
    asset_id: str
    timestamp_utc: str
    signal: SignalInput
    context: Optional[ContextInput] = None

class DataGuardFlags(BaseModel):
    flatline: bool = False
    nan_present: bool = False
    clipping_detected: bool = False
    dropout_detected: bool = False
    unit_mismatch: bool = False
    sampling_rate_suspect: bool = False
    short_signal: bool = False
    frequency_invalid: bool = False
    timestamp_gap: bool = False
    outlier_burst: bool = False

class SignalMetrics(BaseModel):
    sample_count: int = 0
    nan_fraction: float = 0.0
    std_dev: float = 0.0
    rms: float = 0.0
    peak: float = 0.0
    crest_factor: float = 0.0
    kurtosis: float = 0.0
    clip_fraction: float = 0.0

class Module0Response(BaseModel):
    schema_version: str = "1.0"
    trace_id: Optional[str] = None
    module: str = "Module0_DataGuard"
    status: StatusLevel = StatusLevel.passed
    block: bool = False
    quality_score: float = 1.0
    flags: DataGuardFlags = Field(default_factory=DataGuardFlags)
    reasons: List[str] = Field(default_factory=list)
    metrics: SignalMetrics = Field(default_factory=SignalMetrics)
    confidence_modifier: float = 1.0
    execution_time_ms: Optional[float] = None


# ─── Module A: Trend Engine ────────────────────────────────────

class ModuleARequest(BaseModel):
    asset_id: str
    machine_type: Optional[str] = "generic"
    signal_type: SignalType
    direction: Direction
    sampling_rate_hz: int = 6400
    values: List[float]
    baseline: Optional[float] = None
    context: Optional[ContextInput] = None

class ModuleAResponse(BaseModel):
    module: str = "ModuleA_TrendEngine"
    overall_rms: float = 0.0
    peak: float = 0.0
    kurtosis: float = 0.0
    crest_factor: float = 0.0
    baseline: Optional[float] = None
    ratio_to_baseline: Optional[float] = None
    degradation: float = 0.0
    severity_score: float = 0.0
    severity_level: SeverityLevel = SeverityLevel.normal
    trend_classification: str = "unknown"
    rule_ids_triggered: List[str] = Field(default_factory=list)
    execution_time_ms: Optional[float] = None


# ─── Module B: Initiator Rules ─────────────────────────────────

class ModuleBRequest(BaseModel):
    asset_id: str
    component: str  # afb, journal, tpjb, coupling, ac_motor, etc.
    metrics: Dict[str, float]  # H, V, A, kurtosis, crest_factor, temperature, HF, etc.

class MatchedRule(BaseModel):
    rule_id: str
    initiator: str
    diagnosis: str
    score: float
    triggered_conditions: List[Dict[str, Any]] = Field(default_factory=list)

class ModuleBResponse(BaseModel):
    module: str = "ModuleB_Initiators"
    component: str = ""
    num_matches: int = 0
    matched_rules: List[MatchedRule] = Field(default_factory=list)
    confidence: float = 0.0
    execution_time_ms: Optional[float] = None


# ─── Module B+: Slope Intelligence ─────────────────────────────

class ModuleBPlusRequest(BaseModel):
    asset_id: str
    parameter: str = "overall_rms_velocity"
    timestamps: List[str]
    values: List[float]
    window_n_points: int = 3
    context: Optional[ContextInput] = None

class ModuleBPlusResponse(BaseModel):
    module: str = "ModuleBPlus_SlopeIntelligence"
    slope: float = 0.0
    slope_change: float = 0.0
    instability_index: float = 0.0
    trend_class: TrendClass = TrendClass.Stable
    severity_score: float = 0.0
    execution_time_ms: Optional[float] = None


# ─── Module B++: SEDL ──────────────────────────────────────────

class ModuleBPPRequest(BaseModel):
    asset_id: str
    metrics: Optional[Dict[str, float]] = None  # SE, TE, DE, dSE_dt
    spectra: Optional[Dict[str, List[float]]] = None  # H, V, A spectra
    window_days: int = 7

class ModuleBPPResponse(BaseModel):
    module: str = "ModuleBPP_SEDL"
    SE: float = 0.0
    TE: float = 0.0
    DE: float = 0.0
    dSE_dt: float = 0.0
    SI: float = 1.0
    stability_state: StabilityState = StabilityState.Stable
    severity_level: SeverityLevel = SeverityLevel.normal
    triggered_rules: List[str] = Field(default_factory=list)
    execution_time_ms: Optional[float] = None


# ─── Module C: Fusion (SSI) ────────────────────────────────────

class BlockInput(BaseModel):
    B_match_score: float = 0.0
    Bplus_trend_class: TrendClass = TrendClass.Stable
    Bplus_confidence: float = 0.0
    process_correlation: float = 0.0

class ModuleCRequest(BaseModel):
    system_type: str  # pump_train_horizontal, gearbox_train, fan_train
    profile_id: Optional[str] = None
    blocks: Dict[str, BlockInput]  # block_name -> scores
    stability_state: Optional[StabilityState] = None  # From B++ for gating

class ModuleCResponse(BaseModel):
    module: str = "ModuleC_Fusion"
    system_type: str = ""
    profile_id: str = ""
    SSI: float = 0.0
    system_state: SystemState = SystemState.stable
    top_contributors: List[str] = Field(default_factory=list)
    recommended_action: str = "monitor"
    execution_time_ms: Optional[float] = None


# ─── Module D: Health Stage ────────────────────────────────────

class ModuleDRequest(BaseModel):
    SSI: float
    SSI_slope: float = 0.0
    system_state: Optional[str] = None

class ModuleDResponse(BaseModel):
    module: str = "ModuleD_FaultMechanism"
    degradation_stage: HealthStage = HealthStage.Healthy
    rul_band: str = "> 6 months"
    escalation_level: EscalationLevel = EscalationLevel.Level_0
    recommended_action: str = "Continue monitoring"
    execution_time_ms: Optional[float] = None


# ─── Module E: Maintenance Plan ────────────────────────────────

class ModuleERequest(BaseModel):
    asset_id: str
    severity_score: float = 0.5
    confidence: float = 0.7
    criticality: float = 0.6
    urgency: float = 0.5
    safety_flag: bool = False
    spares_ready: bool = True
    manpower_ready: bool = True
    diagnosis: Optional[str] = None
    component: Optional[str] = None

class PlanItem(BaseModel):
    rank: int
    priority_score: float
    window: str
    action_id: str
    action_title: str
    justification: str
    verification: str

class ModuleEResponse(BaseModel):
    module: str = "ModuleE_MaintenancePlan"
    plan_items: List[PlanItem] = Field(default_factory=list)
    total_actions: int = 0
    execution_time_ms: Optional[float] = None


# ─── Module F: RUL & Probability ───────────────────────────────

class BathtubPhase(str, Enum):
    infant_mortality = "infant_mortality"
    useful_life = "useful_life"
    wear_out = "wear_out"

class ModuleFRequest(BaseModel):
    asset_id: str
    severity_score: float
    confidence: float
    slope_log: float
    slope_change: float = 0.0
    instability_index_NLI: float = 0.0
    criticality: float = 0.6
    current_value: float
    failure_threshold: float
    # Reliability inputs (optional — defaults to bearing)
    component_type: str = "bearing"
    operating_hours: float = 0.0
    SSI: float = 0.0
    baseline_value: Optional[float] = None

class ReliabilityMetrics(BaseModel):
    """Weibull-based reliability metrics from condition-adjusted model."""
    beta_base: float = 1.0
    beta_adj: float = 1.0
    eta_base_hours: float = 50000.0
    eta_adj_hours: float = 50000.0
    hazard_rate: float = 0.0
    bathtub_phase: BathtubPhase = BathtubPhase.useful_life
    pf_interval_position: float = 0.0
    weibull_failure_prob_30d: float = 0.0
    weibull_rul_days: Optional[float] = None
    nowlan_heap_pattern: str = "E"

class ModuleFResponse(BaseModel):
    module: str = "ModuleF_Governance"
    RUL_days: float = 0.0
    failure_probability_30d: float = 0.0
    confidence: float = 0.0
    risk_index: float = 0.0
    recommended_window: str = "Planned"
    reliability_metrics: Optional[ReliabilityMetrics] = None
    execution_time_ms: Optional[float] = None


# ─── Orchestrator: Full Pipeline ───────────────────────────────

class FullAnalysisRequest(BaseModel):
    """Single unified request that drives the entire pipeline."""
    schema_version: str = "1.0"
    trace_id: Optional[str] = None
    asset_id: str
    timestamp_utc: str
    machine_type: str = "generic"
    system_type: str = "pump_train_horizontal"
    signal: SignalInput
    context: Optional[ContextInput] = None
    # Module B needs component type
    component: str = "afb"
    # Module B+ needs historical time series
    historical_timestamps: Optional[List[str]] = None
    historical_values: Optional[List[float]] = None
    # Module F needs these
    criticality: float = 0.6
    failure_threshold: float = 8.0

class ModuleTrace(BaseModel):
    module0: Optional[Module0Response] = None
    moduleA: Optional[ModuleAResponse] = None
    moduleB: Optional[ModuleBResponse] = None
    moduleBplus: Optional[ModuleBPlusResponse] = None
    moduleBpp: Optional[ModuleBPPResponse] = None
    moduleC: Optional[ModuleCResponse] = None
    moduleD: Optional[ModuleDResponse] = None
    moduleE: Optional[ModuleEResponse] = None
    moduleF: Optional[ModuleFResponse] = None

class FullAnalysisResponse(BaseModel):
    schema_version: str = "1.0"
    trace_id: Optional[str] = None
    asset_id: str = ""
    final_severity_level: SeverityLevel = SeverityLevel.normal
    final_severity_score: float = 0.0
    confidence: float = 0.0
    health_stage: HealthStage = HealthStage.Healthy
    rul_days: Optional[float] = None
    risk_index: float = 0.0
    recommended_action: str = "Continue monitoring"
    recommended_window: str = "Planned"
    reliability_metrics: Optional[ReliabilityMetrics] = None
    module_trace: ModuleTrace = Field(default_factory=ModuleTrace)
    execution_time_ms: Optional[float] = None
