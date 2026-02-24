/**
 * Narrative Template Engine
 *
 * Transforms structured FullAnalysisResponse data into human-readable sentences.
 * No LLM involved — pure template logic driven by physics-grounded API outputs.
 *
 * Design principle: Language intensity scales with severity and confidence.
 * Every function maps a specific API field to a specific prose register.
 */

import type {
  FullAnalysisResponse,
  SeverityLevel,
  TrendClass,
  StabilityState,
  HealthStage,
  BathtubPhase,
} from '../types/rapid-ai'
import { days } from './formatters'

// ─── Severity-to-Language Maps ──────────────────────────────────────────────

/**
 * How we describe urgency in prose.
 * Drives word choice throughout the narrative — not just labels.
 */
export const severityAdverb: Record<SeverityLevel, string> = {
  normal: 'within expected parameters',
  watch: 'at elevated levels requiring monitoring',
  warning: 'at concerning levels requiring attention',
  alarm: 'at critical levels requiring immediate action',
}

export const severityAdjective: Record<SeverityLevel, string> = {
  normal: 'nominal',
  watch: 'elevated',
  warning: 'concerning',
  alarm: 'critical',
}

export const severityUrgency: Record<SeverityLevel, string> = {
  normal: 'routine',
  watch: 'monitoring',
  warning: 'scheduled',
  alarm: 'urgent',
}

export const severityColor: Record<SeverityLevel, string> = {
  normal: '#22c55e',
  watch: '#eab308',
  warning: '#f97316',
  alarm: '#ef4444',
}

// ─── Health Stage Language ───────────────────────────────────────────────────

export const healthSummary: Record<HealthStage, string> = {
  Healthy: 'operating within normal parameters',
  Degrading: 'showing early signs of degradation',
  Unstable: 'in an unstable condition with active deterioration',
  Critical: 'in a critical condition requiring immediate intervention',
  Blocked: 'unable to be assessed due to data quality issues',
}

export const healthVerb: Record<HealthStage, string> = {
  Healthy: 'is healthy',
  Degrading: 'is degrading',
  Unstable: 'is unstable',
  Critical: 'is critical',
  Blocked: 'could not be assessed',
}

// ─── Trend Classification Language ───────────────────────────────────────────

export const trendDescription: Record<TrendClass, string> = {
  Stable: 'The degradation rate is stable — no acceleration detected.',
  Drift: 'A slow, steady drift is underway. The rate of change is gradual but consistent.',
  Accelerating: 'Degradation is accelerating. The rate of deterioration is increasing.',
  Step: 'A step-change in signal character was detected — a discrete event may have occurred.',
  Chaotic: 'Signal behavior is chaotic, suggesting unstable operating conditions or multiple active faults.',
}

export const trendUrgency: Record<TrendClass, 'low' | 'medium' | 'high' | 'critical'> = {
  Stable: 'low',
  Drift: 'medium',
  Accelerating: 'high',
  Step: 'high',
  Chaotic: 'critical',
}

export const trendArrow: Record<TrendClass, string> = {
  Stable: 'STEADY',
  Drift: 'DRIFTING',
  Accelerating: 'RISING',
  Step: 'STEPPED',
  Chaotic: 'CHAOTIC',
}

// ─── Stability State Language ─────────────────────────────────────────────────

export const stabilityDescription: Record<StabilityState, string> = {
  Stable: 'Entropy analysis confirms stable signal structure. Energy distribution is consistent across spectral, temporal, and directional axes.',
  Drifting: 'Entropy analysis shows a slow drift in signal structure. Energy patterns are shifting, indicating early-stage degradation.',
  Destabilizing: 'The system is destabilizing. Entropy is rising across multiple axes, consistent with worsening fault conditions.',
  Chaotic: 'Entropy analysis indicates chaotic signal behavior. The system has lost structural stability.',
  Critical_Instability: 'Critical instability detected. Entropy readings indicate imminent or active failure conditions.',
}

export const stabilityBadgeColor: Record<StabilityState, string> = {
  Stable: '#22c55e',
  Drifting: '#eab308',
  Destabilizing: '#f97316',
  Chaotic: '#ef4444',
  Critical_Instability: '#ef4444',
}

// ─── Bathtub Phase Language ───────────────────────────────────────────────────

export const bathtubDescription: Record<BathtubPhase, string> = {
  infant_mortality: 'in the early-life (infant mortality) phase — elevated failure risk from installation or manufacturing variability',
  useful_life: 'in the useful-life phase — operating within its expected reliability envelope',
  wear_out: 'entering the wear-out phase — age-related degradation is the dominant failure mode',
}

// ─── Confidence Language ─────────────────────────────────────────────────────

export function confidenceQualifier(confidence: number): string {
  if (confidence >= 0.85) return 'high confidence'
  if (confidence >= 0.65) return 'moderate confidence'
  if (confidence >= 0.45) return 'low confidence'
  return 'inconclusive'
}

export function confidenceQualified(confidence: number): string {
  if (confidence >= 0.85) return 'with high confidence'
  if (confidence >= 0.65) return 'with moderate confidence'
  if (confidence >= 0.45) return 'with limited confidence — additional data is recommended'
  return 'inconclusively — data quality is insufficient for reliable diagnosis'
}

// ─── Quality Score Language ───────────────────────────────────────────────────

export function qualityDescription(score: number): string {
  if (score >= 0.95) return 'excellent — all validation checks passed'
  if (score >= 0.85) return 'good — minor signal anomalies detected but analysis is reliable'
  if (score >= 0.70) return 'acceptable — some data quality penalties applied; results should be interpreted with caution'
  if (score >= 0.50) return 'poor — significant data quality issues reduce analysis confidence'
  return 'insufficient — analysis reliability is severely compromised'
}

// ─── RUL Language ────────────────────────────────────────────────────────────

export function rulNarrative(rulDays: number | null, failureProb30d: number): string {
  if (rulDays === null) return 'Remaining useful life could not be estimated from the current signal.'

  const timeStr = days(rulDays)
  const probPct = (failureProb30d * 100).toFixed(0)

  if (rulDays <= 7) {
    return `Remaining useful life is estimated at ${timeStr}. The 30-day failure probability is ${probPct}%. Immediate intervention is required.`
  }
  if (rulDays <= 30) {
    return `Remaining useful life is estimated at ${timeStr}. The 30-day failure probability is ${probPct}%. Maintenance should be scheduled this period.`
  }
  if (rulDays <= 90) {
    return `Remaining useful life is estimated at ${timeStr}. The 30-day failure probability is ${probPct}%. Maintenance planning should begin.`
  }
  return `Remaining useful life is estimated at ${timeStr}. The 30-day failure probability is ${probPct}%. The asset has sufficient life remaining for planned maintenance scheduling.`
}

// ─── P-F Position Language ────────────────────────────────────────────────────

export function pfPositionNarrative(position: number): string {
  if (position < 0.25)
    return 'The asset is in the early detection window — the P-F interval is long, providing ample time for planned intervention.'
  if (position < 0.55)
    return 'The asset is at the midpoint of the P-F interval — a maintenance window is approaching.'
  if (position < 0.80)
    return 'The asset is in the late P-F interval — the window for planned maintenance is narrowing.'
  return 'The asset is approaching functional failure. The P-F interval is nearly exhausted.'
}

// ─── Chapter 1: Executive Summary ────────────────────────────────────────────

export interface ExecutiveSummary {
  headline: string
  primaryConcern: string
  recommendedAction: string
  timeframe: string
  confidenceStatement: string
}

export function buildExecutiveSummary(r: FullAnalysisResponse): ExecutiveSummary {
  const assetId = r.asset_id
  const health = healthVerb[r.health_stage] ?? `is in ${r.health_stage} condition`
  const b = r.module_trace.moduleB
  const e = r.module_trace.moduleE

  const primaryConcern = b && b.matched_rules.length > 0
    ? `${b.matched_rules[0].diagnosis} on the ${b.component.replace(/_/g, ' ')} subsystem`
    : r.final_severity_level !== 'normal'
      ? `${severityAdjective[r.final_severity_level]} signal conditions without a specific fault pattern match`
      : 'no significant fault patterns detected'

  const topAction = e && e.plan_items.length > 0
    ? e.plan_items[0].action_title
    : r.recommended_action

  const timeframe = r.recommended_window

  const confidence = b?.confidence ?? r.confidence

  return {
    headline: `Asset ${assetId} ${health}. ${healthSummary[r.health_stage].charAt(0).toUpperCase() + healthSummary[r.health_stage].slice(1)}.`,
    primaryConcern,
    recommendedAction: topAction,
    timeframe,
    confidenceStatement: `Diagnosis made ${confidenceQualified(confidence)}.`,
  }
}

// ─── Chapter 2: What We Found ─────────────────────────────────────────────────

export interface FindingsSummary {
  dataQuality: string
  signalProfile: string
  faultFinding: string
  hasFaults: boolean
}

export function buildFindingsSummary(r: FullAnalysisResponse): FindingsSummary {
  const m0 = r.module_trace.module0
  const mA = r.module_trace.moduleA
  const mB = r.module_trace.moduleB

  const dataQuality = m0
    ? `Signal quality is ${qualityDescription(m0.quality_score)} (score: ${(m0.quality_score * 100).toFixed(0)}%).`
    : 'Signal quality data not available.'

  const signalProfile = mA
    ? `Vibration RMS is ${mA.overall_rms.toFixed(3)} mm/s with a kurtosis of ${mA.kurtosis.toFixed(2)} — ${
        mA.kurtosis > 4
          ? 'elevated kurtosis indicates impulsive content consistent with bearing or gear faults'
          : mA.kurtosis > 2
          ? 'mild kurtosis elevation suggests minor signal irregularities'
          : 'kurtosis is nominal, consistent with smooth operation'
      }. Overall severity is ${severityAdjective[mA.severity_level]}.`
    : 'Feature extraction data not available.'

  const hasFaults = !!(mB && mB.matched_rules.length > 0)

  const faultFinding = hasFaults && mB
    ? `${mB.num_matches} fault pattern${mB.num_matches !== 1 ? 's' : ''} matched on the ${mB.component.replace(/_/g, ' ')} subsystem. The primary finding is ${mB.matched_rules[0].diagnosis} (${mB.matched_rules[0].initiator}), identified ${confidenceQualified(mB.confidence)}.`
    : mB
    ? `No fault patterns matched in the ${mB.component.replace(/_/g, ' ')} subsystem. The physics-based rule engine found no signatures meeting threshold conditions.`
    : 'Fault pattern analysis not available.'

  return { dataQuality, signalProfile, faultFinding, hasFaults }
}

// ─── Chapter 3: Trending ──────────────────────────────────────────────────────

export interface TrendingSummary {
  trendStatement: string
  trendClass: TrendClass
  slopeContext: string
  stabilityStatement: string
  stabilityState: StabilityState
  overallConcern: 'low' | 'medium' | 'high' | 'critical'
}

export function buildTrendingSummary(r: FullAnalysisResponse): TrendingSummary {
  const mBp = r.module_trace.moduleBplus
  const mBpp = r.module_trace.moduleBpp

  const trendClass: TrendClass = mBp?.trend_class ?? 'Stable'
  const stabilityState: StabilityState = mBpp?.stability_state ?? 'Stable'

  const slopeContext = mBp
    ? mBp.slope > 0.05
      ? `The log-domain slope is ${mBp.slope.toFixed(4)}, indicating a measurable upward trend in severity.`
      : mBp.slope < -0.05
      ? `The log-domain slope is ${mBp.slope.toFixed(4)}, indicating the condition may be improving or was recently disturbed.`
      : `The log-domain slope is ${mBp.slope.toFixed(4)}, consistent with a flat or near-stable trajectory.`
    : ''

  return {
    trendStatement: trendDescription[trendClass],
    trendClass,
    slopeContext,
    stabilityStatement: mBpp ? stabilityDescription[stabilityState] : 'Entropy analysis not available.',
    stabilityState,
    overallConcern: trendUrgency[trendClass],
  }
}

// ─── Chapter 4: System Impact ─────────────────────────────────────────────────

export interface SystemImpactSummary {
  ssiStatement: string
  ssi: number
  systemState: string
  healthStatement: string
  escalationStatement: string
  topContributors: string[]
}

export function buildSystemImpactSummary(r: FullAnalysisResponse): SystemImpactSummary {
  const mC = r.module_trace.moduleC
  const mD = r.module_trace.moduleD

  const ssi = mC?.SSI ?? r.final_severity_score
  const ssiPct = (ssi * 100).toFixed(0)

  const ssiStatement = mC
    ? `The System Stability Index (SSI) is ${ssiPct}%, placing the asset in a ${mC.system_state} system state.${
        mC.top_contributors.length > 0
          ? ` The dominant contributors to system instability are: ${mC.top_contributors.join(', ')}.`
          : ''
      }`
    : `System Stability Index is ${ssiPct}%.`

  const healthStatement = mD
    ? `Health classification is ${mD.degradation_stage}, with escalation level ${mD.escalation_level}. RUL band assessment: ${mD.rul_band}.`
    : `Health stage is ${r.health_stage}.`

  const escalationStatement = mD?.escalation_level
    ? escalationNarrative(mD.escalation_level)
    : ''

  return {
    ssiStatement,
    ssi,
    systemState: mC?.system_state ?? r.health_stage.toLowerCase(),
    healthStatement,
    escalationStatement,
    topContributors: mC?.top_contributors ?? [],
  }
}

function escalationNarrative(level: string): string {
  const map: Record<string, string> = {
    None: 'No escalation required. Continue routine monitoring.',
    Low: 'Low escalation — schedule maintenance at next opportunity.',
    Moderate: 'Moderate escalation — plan maintenance within the recommended window.',
    High: 'High escalation — prioritize maintenance; delay increases risk.',
    Critical: 'Critical escalation — immediate action is required to prevent failure.',
  }
  return map[level] ?? `Escalation level: ${level}.`
}

// ─── Chapter 6: Prognosis ─────────────────────────────────────────────────────

export interface PrognosisSummary {
  rulStatement: string
  pfStatement: string
  weibullStatement: string
  bathtubStatement: string
  nowlanStatement: string
  overallOutlook: string
}

export function buildPrognosisSummary(r: FullAnalysisResponse): PrognosisSummary {
  const mF = r.module_trace.moduleF
  const rel = r.reliability_metrics ?? mF?.reliability_metrics ?? null

  const rulStatement = rulNarrative(r.rul_days, mF?.failure_probability_30d ?? 0)

  const pfStatement = rel
    ? pfPositionNarrative(rel.pf_interval_position)
    : 'P-F interval position not available.'

  const weibullStatement = rel
    ? `Weibull reliability analysis uses shape parameter β=${rel.beta_adj.toFixed(2)} (adjusted from base β=${rel.beta_base.toFixed(2)}), reflecting the current severity load. Characteristic life has been reduced to ${Math.round(rel.eta_adj_hours).toLocaleString()} hours from a baseline of ${rel.eta_base_hours.toLocaleString()} hours.`
    : 'Weibull reliability parameters not available.'

  const bathtubStatement = rel
    ? `The asset is ${bathtubDescription[rel.bathtub_phase]}.`
    : ''

  const nowlanStatement = rel
    ? `Nowlan-Heap reliability pattern ${rel.nowlan_heap_pattern} — ${nowlanPatternDescription(rel.nowlan_heap_pattern)}`
    : ''

  const overallOutlook = buildOutlook(r, rel)

  return {
    rulStatement,
    pfStatement,
    weibullStatement,
    bathtubStatement,
    nowlanStatement,
    overallOutlook,
  }
}

function nowlanPatternDescription(pattern: string): string {
  const map: Record<string, string> = {
    A: 'bathtub — infant mortality followed by constant rate then wear-out',
    B: 'wear-out — increasing failure rate with age',
    C: 'fatigue — gradually increasing failure rate from onset',
    D: 'initial break-in with stable long-term rate',
    E: 'constant (random) failure rate throughout life',
    F: 'infant mortality decreasing to constant rate — age is not the dominant risk factor',
  }
  return map[pattern] ?? `pattern ${pattern}`
}

function buildOutlook(r: FullAnalysisResponse, rel: FullAnalysisResponse['reliability_metrics']): string {
  if (r.health_stage === 'Critical') {
    return 'The overall prognosis is unfavorable. Without immediate intervention, functional failure is likely within the estimated RUL window.'
  }
  if (r.health_stage === 'Unstable') {
    return 'The prognosis is guarded. The asset is deteriorating and the trajectory requires close monitoring and timely maintenance to prevent escalation to critical condition.'
  }
  if (r.health_stage === 'Degrading') {
    return 'The prognosis is manageable with planned maintenance. Degradation is present but the asset retains useful life if intervention occurs within the recommended window.'
  }
  return 'The prognosis is favorable. The asset is operating within normal parameters and no immediate intervention is required.'
}
