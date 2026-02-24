import { useState, useRef, useEffect } from 'react'
import type { FullAnalysisResponse } from '../../types/rapid-ai'
import { scoreToColor, severityColor } from '../../utils/colors'
import { useCountUp } from '../../hooks/useCountUp'
import { days } from '../../utils/formatters'

interface Props {
  result: FullAnalysisResponse
  visible: boolean
  onMetricClick?: (metricId: string, context: MetricContext) => void
}

export interface MetricContext {
  label: string
  value?: string
  interpretation: string
  topContributor?: string
  threshold?: string
  detail?: string
}

interface MetricCardProps {
  id: string
  label: string
  rawValue: number
  displayValue: string
  animTarget: number
  animDecimals: number
  unit?: string
  level: string
  color: string
  barFraction: number
  trend?: string
  delay: number
  visible: boolean
  context: MetricContext
  onMetricClick?: (id: string, ctx: MetricContext) => void
}

function MetricCard({
  id, label, displayValue, animTarget, animDecimals, unit, level, color,
  barFraction, trend, delay, visible, context, onMetricClick,
}: MetricCardProps) {
  const animated = useCountUp(animTarget, { decimals: animDecimals, start: visible })
  const [hovering, setHovering] = useState(false)
  const [tooltipPos, setTooltipPos] = useState<'above' | 'below'>('above')
  const cardRef = useRef<HTMLButtonElement>(null)

  function handleMouseEnter() {
    setHovering(true)
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      setTooltipPos(rect.top > 200 ? 'above' : 'below')
    }
  }

  return (
    <button
      ref={cardRef}
      className={`
        relative card flex flex-col gap-2 text-left w-full
        hover:border-slate-600/80 hover:bg-slate-700/60 focus:outline-none
        focus-visible:ring-2 focus-visible:ring-sky-400/60
        transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
        cursor-pointer
      `}
      style={{ transitionDelay: `${delay}ms`, transitionProperty: 'opacity, transform, background-color, border-color' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovering(false)}
      onClick={() => onMetricClick?.(id, context)}
      aria-label={`${label}: ${displayValue}. ${context.interpretation}`}
    >
      {/* Label */}
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 flex items-center justify-between">
        <span>{label}</span>
        {trend && (
          <span className="text-[9px]" style={{ color }}>
            {trend}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1">
        <span
          className="text-2xl font-bold font-mono tabular-nums leading-none"
          style={{ color }}
        >
          {visible ? animated : '0'}
        </span>
        {unit && (
          <span className="text-[10px] text-slate-500 font-mono">{unit}</span>
        )}
      </div>

      {/* Level label */}
      <div className="text-[10px] font-semibold uppercase" style={{ color }}>
        {level}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: visible ? `${Math.min(barFraction * 100, 100)}%` : '0%',
            backgroundColor: color,
            transitionDelay: `${delay + 300}ms`,
          }}
        />
      </div>

      {/* Tooltip */}
      {hovering && (
        <div
          className={`
            absolute z-50 left-0 right-0 pointer-events-none
            ${tooltipPos === 'above' ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'}
          `}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-left">
            <div className="text-xs font-semibold text-white mb-1.5">{context.label}</div>
            <p className="text-[11px] text-slate-300 leading-relaxed mb-2">{context.interpretation}</p>
            {context.topContributor && (
              <div className="text-[10px] text-slate-400">
                Top contributor: <span className="text-sky-400">{context.topContributor}</span>
              </div>
            )}
            {context.threshold && (
              <div className="text-[10px] text-slate-500 mt-1">{context.threshold}</div>
            )}
            {context.detail && (
              <div className="text-[10px] text-slate-600 mt-1">{context.detail}</div>
            )}
          </div>
        </div>
      )}
    </button>
  )
}

/**
 * Five-metric horizontal strip with animated count-up and hover tooltips.
 */
export default function MetricStrip({ result, visible, onMetricClick }: Props) {
  const trace = result.module_trace
  const ssi = trace.moduleC?.SSI ?? 0
  const severity = result.final_severity_score
  const confidence = result.confidence
  const rul = result.rul_days ?? 0
  const risk = result.risk_index

  const ssiColor = scoreToColor(ssi)
  const sevColor = scoreToColor(severity)
  const confColor = '#38bdf8'
  const rulColor = scoreToColor(1 - Math.min(rul / 365, 1))
  const riskColor = scoreToColor(risk / 100)

  const topContrib = trace.moduleC?.top_contributors?.[0] ?? 'Unknown'

  const rulDisplay = rul > 0
    ? rul < 365
      ? `${Math.round(rul)}`
      : `${(rul / 365).toFixed(1)}`
    : '0'
  const rulUnit = rul > 0 && rul >= 365 ? 'yr' : 'days'

  const metrics: MetricCardProps[] = [
    {
      id: 'severity',
      label: 'Severity',
      rawValue: severity,
      displayValue: `${(severity * 100).toFixed(0)}%`,
      animTarget: severity * 100,
      animDecimals: 0,
      unit: '%',
      level: result.final_severity_level,
      color: sevColor,
      barFraction: severity,
      trend: severity > 0.3 ? `+${(severity * 100 - 30).toFixed(0)}% above watch` : undefined,
      delay: 0,
      visible,
      context: {
        label: `Severity Score: ${(severity * 100).toFixed(1)}% (${result.final_severity_level})`,
        interpretation: `Signal severity indicates ${result.final_severity_level.toLowerCase()} operating conditions based on RMS, peak, and kurtosis analysis.`,
        topContributor: trace.moduleA?.trend_classification ?? 'Signal analysis',
        threshold: 'Alarm threshold: 80%. Warning: 50%. Watch: 30%.',
        detail: `${((0.8 - severity) * 100).toFixed(0)}% headroom before alarm state.`,
      },
      onMetricClick,
    },
    {
      id: 'ssi',
      label: 'SSI',
      rawValue: ssi,
      displayValue: `${(ssi * 100).toFixed(0)}%`,
      animTarget: ssi * 100,
      animDecimals: 0,
      unit: '%',
      level: trace.moduleC?.system_state ?? 'stable',
      color: ssiColor,
      barFraction: ssi,
      delay: 50,
      visible,
      context: {
        label: `System Stability Index: ${(ssi * 100).toFixed(1)}%`,
        interpretation: `SSI is the fused health score combining all module outputs. ${trace.moduleC?.system_state === 'degrading' ? 'System is degrading — weighted block scores indicate progressive wear.' : 'Fused assessment of component condition and trending.'}`,
        topContributor: topContrib || 'Fusion analysis',
        threshold: 'SSI 0–0.30: Stable, 0.30–0.50: Degrading, 0.50–0.80: Unstable, ≥0.80: Critical.',
        detail: `Profile: ${trace.moduleC?.profile_id ?? 'N/A'}`,
      },
      onMetricClick,
    },
    {
      id: 'confidence',
      label: 'Confidence',
      rawValue: confidence,
      displayValue: `${(confidence * 100).toFixed(1)}%`,
      animTarget: confidence * 100,
      animDecimals: 1,
      unit: '%',
      level: confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'moderate' : 'low',
      color: confColor,
      barFraction: confidence,
      delay: 100,
      visible,
      context: {
        label: `Analysis Confidence: ${(confidence * 100).toFixed(1)}%`,
        interpretation: `Confidence reflects data quality multiplied by convergence across B, B+, and B++ modules. Higher confidence means more reliable diagnosis.`,
        topContributor: `Data quality: ${((trace.module0?.quality_score ?? 1) * 100).toFixed(0)}%`,
        threshold: 'Confidence = Q_data × (1 − ∏(1 − C_i))',
        detail: `Module B: ${((trace.moduleB?.confidence ?? 0) * 100).toFixed(0)}% match confidence`,
      },
      onMetricClick,
    },
    {
      id: 'rul',
      label: 'RUL',
      rawValue: rul,
      displayValue: days(rul),
      animTarget: rul,
      animDecimals: 0,
      unit: rulUnit,
      level: rul < 14 ? 'critical' : rul < 60 ? 'warning' : rul < 180 ? 'watch' : 'normal',
      color: rulColor,
      barFraction: Math.min(rul / 365, 1),
      delay: 150,
      visible,
      context: {
        label: `Remaining Useful Life: ${days(rul)}`,
        interpretation: `Estimated operational time before maintenance-required threshold is breached. Computed via Weibull reliability model adjusted for current severity.`,
        topContributor: trace.moduleF?.recommended_window ?? 'Linear model',
        threshold: `30-day failure probability: ${((trace.moduleF?.failure_probability_30d ?? 0) * 100).toFixed(1)}%`,
        detail: `Risk index: ${result.risk_index.toFixed(1)} / 100`,
      },
      onMetricClick,
    },
    {
      id: 'risk',
      label: 'Risk Index',
      rawValue: risk,
      displayValue: risk.toFixed(0),
      animTarget: risk,
      animDecimals: 0,
      unit: '/ 100',
      level: risk >= 80 ? 'critical' : risk >= 50 ? 'warning' : risk >= 30 ? 'watch' : 'low',
      color: riskColor,
      barFraction: risk / 100,
      delay: 200,
      visible,
      context: {
        label: `Risk Index: ${risk.toFixed(1)} / 100`,
        interpretation: `Composite risk score weighting severity, confidence, failure probability, and criticality. Drives maintenance window urgency.`,
        topContributor: `Criticality factor applied`,
        threshold: 'Risk ≥80: Immediate. ≥50: 24hr. ≥30: 7 days. <30: Scheduled.',
        detail: result.recommended_window,
      },
      onMetricClick,
    },
  ]

  return (
    <div className="grid grid-cols-5 gap-3">
      {metrics.map((m) => (
        <MetricCard key={m.id} {...m} />
      ))}
    </div>
  )
}
