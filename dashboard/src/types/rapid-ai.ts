// ─── Enumerations ──────────────────────────────────────────

export type SeverityLevel = 'normal' | 'watch' | 'warning' | 'alarm'
export type TrendClass = 'Stable' | 'Drift' | 'Accelerating' | 'Chaotic' | 'Step'
export type StabilityState = 'Stable' | 'Drifting' | 'Destabilizing' | 'Chaotic' | 'Critical_Instability'
export type SystemState = 'stable' | 'degrading' | 'unstable' | 'critical' | 'process-driven'
export type HealthStage = 'Healthy' | 'Degrading' | 'Unstable' | 'Critical' | 'Blocked'
export type BathtubPhase = 'infant_mortality' | 'useful_life' | 'wear_out'

// ─── Module Responses ──────────────────────────────────────

export interface Module0Response {
  module: string
  status: string
  block: boolean
  quality_score: number
  flags: Record<string, boolean>
  reasons: string[]
  metrics: {
    sample_count: number
    nan_fraction: number
    std_dev: number
    rms: number
    peak: number
    crest_factor: number
    kurtosis: number
    clip_fraction: number
  }
}

export interface ModuleAResponse {
  module: string
  overall_rms: number
  peak: number
  kurtosis: number
  crest_factor: number
  baseline: number | null
  ratio_to_baseline: number | null
  degradation: number
  severity_score: number
  severity_level: SeverityLevel
  trend_classification: string
}

export interface MatchedRule {
  rule_id: string
  initiator: string
  diagnosis: string
  score: number
  triggered_conditions: Array<{ expr: string; op: string; threshold: number; value: number }>
}

export interface ModuleBResponse {
  module: string
  component: string
  num_matches: number
  matched_rules: MatchedRule[]
  confidence: number
}

export interface ModuleBPlusResponse {
  module: string
  slope: number
  slope_change: number
  instability_index: number
  trend_class: TrendClass
  severity_score: number
}

export interface ModuleBPPResponse {
  module: string
  SE: number
  TE: number
  DE: number
  dSE_dt: number
  SI: number
  stability_state: StabilityState
  severity_level: SeverityLevel
  triggered_rules: string[]
}

export interface ModuleCResponse {
  module: string
  system_type: string
  profile_id: string
  SSI: number
  system_state: SystemState
  top_contributors: string[]
  recommended_action: string
}

export interface ModuleDResponse {
  module: string
  degradation_stage: HealthStage
  rul_band: string
  escalation_level: string
  recommended_action: string
}

export interface PlanItem {
  rank: number
  priority_score: number
  window: string
  action_id: string
  action_title: string
  justification: string
  verification: string
}

export interface ModuleEResponse {
  module: string
  plan_items: PlanItem[]
  total_actions: number
}

export interface ReliabilityMetrics {
  beta_base: number
  beta_adj: number
  eta_base_hours: number
  eta_adj_hours: number
  hazard_rate: number
  bathtub_phase: BathtubPhase
  pf_interval_position: number
  weibull_failure_prob_30d: number
  weibull_rul_days: number | null
  nowlan_heap_pattern: string
}

export interface ModuleFResponse {
  module: string
  RUL_days: number
  failure_probability_30d: number
  confidence: number
  risk_index: number
  recommended_window: string
  reliability_metrics: ReliabilityMetrics | null
}

// ─── Full Pipeline Response ────────────────────────────────

export interface ReportIssue {
  rule_id: string
  initiator: string
  diagnosis: string
  confidence_pct: number
  evidence: string[]
}

export interface AnalysisReport {
  likelihood_pct: number
  likelihood_text: string
  degradation_index: number
  degradation_text: string
  rul_days: number | null
  stability_state: string
  health_stage: string
  severity_level: string
  risk_index: number
  recommended_action: string
  recommended_window: string
  issues: ReportIssue[]
  summary: string
}

export interface ModuleTrace {
  module0: Module0Response | null
  moduleA: ModuleAResponse | null
  moduleB: ModuleBResponse | null
  moduleBplus: ModuleBPlusResponse | null
  moduleBpp: ModuleBPPResponse | null
  moduleC: ModuleCResponse | null
  moduleD: ModuleDResponse | null
  moduleE: ModuleEResponse | null
  moduleF: ModuleFResponse | null
}

export interface FullAnalysisResponse {
  schema_version: string
  trace_id: string
  asset_id: string
  final_severity_level: SeverityLevel
  final_severity_score: number
  confidence: number
  health_stage: HealthStage
  rul_days: number | null
  risk_index: number
  recommended_action: string
  recommended_window: string
  reliability_metrics: ReliabilityMetrics | null
  report: AnalysisReport | null
  module_trace: ModuleTrace
  execution_time_ms: number
}

// ─── Scenario (for mock data) ──────────────────────────────

export interface Scenario {
  id: string
  name: string
  description: string
  response: FullAnalysisResponse
  ai_insight: string
}
