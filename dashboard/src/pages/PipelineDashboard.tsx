import type { Scenario } from '../types/rapid-ai'
import HealthBadge from '../components/HealthBadge'
import RadialGauge from '../components/RadialGauge'
import ActionPlanCard from '../components/ActionPlanCard'
import InsightBlock from '../components/InsightBlock'
import PFDiagram from '../components/PFDiagram'
import { scoreToColor, severityColor } from '../utils/colors'
import { days, pct, fixed } from '../utils/formatters'

interface Props {
  scenario: Scenario
}

export default function PipelineDashboard({ scenario }: Props) {
  const r = scenario.response
  const trace = r.module_trace
  const rel = r.reliability_metrics

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{r.asset_id}</h2>
          <p className="text-sm text-slate-400 mt-1">{scenario.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <HealthBadge stage={r.health_stage} size="lg" />
          <span className="text-xs text-slate-500 font-mono">{r.trace_id}</span>
        </div>
      </div>

      {/* Top gauges row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card flex flex-col items-center">
          <RadialGauge value={r.final_severity_score} label="Severity" />
          <span className="text-[10px] mt-1 font-semibold uppercase" style={{ color: severityColor[r.final_severity_level] }}>
            {r.final_severity_level}
          </span>
        </div>
        <div className="card flex flex-col items-center">
          <RadialGauge value={trace.moduleC?.SSI || 0} label="SSI" />
          <span className="text-[10px] mt-1 text-slate-400">{trace.moduleC?.system_state}</span>
        </div>
        <div className="card flex flex-col items-center">
          <RadialGauge value={r.confidence} label="Confidence" color="#38bdf8" />
        </div>
        <div className="card flex flex-col items-center">
          <RadialGauge value={trace.moduleE?.plan_items[0]?.priority_score || 0} max={100} label="Priority" />
          <span className="text-[10px] mt-1 text-slate-400">{r.recommended_window}</span>
        </div>
        <div className="card flex flex-col items-center">
          <RadialGauge value={r.risk_index} max={100} label="Risk Index" />
        </div>
      </div>

      {/* RUL + Failure Probability + Reliability row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* RUL */}
        <div className="card">
          <div className="card-title">Remaining Useful Life</div>
          <div className="text-3xl font-bold" style={{ color: scoreToColor(r.final_severity_score) }}>
            {r.rul_days != null ? days(r.rul_days) : 'N/A'}
          </div>
          <div className="text-sm text-slate-400 mt-1">
            {r.rul_days != null ? `${r.rul_days} days` : ''}
          </div>
          {/* RUL progress bar */}
          {r.rul_days != null && (
            <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, (r.rul_days / 365) * 100)}%`,
                  backgroundColor: scoreToColor(r.final_severity_score),
                }}
              />
            </div>
          )}
        </div>

        {/* Failure Probability */}
        <div className="card">
          <div className="card-title">30-Day Failure Probability</div>
          <div className="text-3xl font-bold" style={{ color: scoreToColor(trace.moduleF?.failure_probability_30d || 0) }}>
            {pct(trace.moduleF?.failure_probability_30d || 0)}
          </div>
          {rel && (
            <div className="mt-2 text-xs text-slate-400 space-y-1">
              <div>Weibull P₃₀: {pct(rel.weibull_failure_prob_30d)}</div>
              <div>Hazard rate: {rel.hazard_rate.toExponential(2)}</div>
            </div>
          )}
        </div>

        {/* P-F Position */}
        <div className="card">
          <div className="card-title">P-F Interval Position</div>
          {rel ? (
            <>
              <PFDiagram position={rel.pf_interval_position} />
              <div className="mt-3 flex justify-between text-xs text-slate-400">
                <span>Phase: {rel.bathtub_phase.replace('_', ' ')}</span>
                <span>N&H: Pattern {rel.nowlan_heap_pattern}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">No reliability data</p>
          )}
        </div>
      </div>

      {/* AI Insight */}
      <InsightBlock text={scenario.ai_insight} severity={r.final_severity_level} />

      {/* Action Plan */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Action Plan ({trace.moduleE?.total_actions || 0} actions)
        </h3>
        <div className="space-y-2">
          {trace.moduleE?.plan_items.map((item) => (
            <ActionPlanCard key={item.action_id} item={item} />
          ))}
        </div>
      </div>

      {/* Pipeline Timing */}
      <div className="card">
        <div className="card-title">Pipeline Execution</div>
        <div className="text-sm text-slate-300">
          Total: {fixed(r.execution_time_ms, 1)} ms — Data Quality: {pct(trace.module0?.quality_score || 1)}
        </div>
      </div>
    </div>
  )
}
