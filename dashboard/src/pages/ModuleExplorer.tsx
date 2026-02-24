import { useState } from 'react'
import type { Scenario } from '../types/rapid-ai'
import HealthBadge from '../components/HealthBadge'
import RadialGauge from '../components/RadialGauge'
import EntropyRadar from '../components/EntropyRadar'
import ActionPlanCard from '../components/ActionPlanCard'
import { severityColor, scoreToColor } from '../utils/colors'
import { pct, fixed } from '../utils/formatters'

interface Props {
  scenario: Scenario
}

const tabs = [
  { id: '0', label: 'Guard' },
  { id: 'A', label: 'Features' },
  { id: 'B', label: 'Initiators' },
  { id: 'B+', label: 'Trends' },
  { id: 'B++', label: 'Entropy' },
  { id: 'C', label: 'Fusion' },
  { id: 'D', label: 'Health' },
  { id: 'E', label: 'Maintenance' },
  { id: 'F', label: 'RUL' },
]

export default function ModuleExplorer({ scenario }: Props) {
  const [active, setActive] = useState('0')
  const trace = scenario.response.module_trace

  return (
    <div className="max-w-7xl space-y-4">
      <h2 className="text-xl font-bold text-white">Module Explorer</h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 p-1 rounded-xl overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              active === tab.id
                ? 'bg-sky-500/20 text-sky-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {tab.id}: {tab.label}
          </button>
        ))}
      </div>

      {/* Module Content */}
      <div className="card min-h-[400px]">
        {active === '0' && trace.module0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Module 0: Data Guard</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="card">
                <div className="card-title">Quality Score</div>
                <div className="text-3xl font-bold text-sky-400">{pct(trace.module0.quality_score)}</div>
              </div>
              <div className="card">
                <div className="card-title">Status</div>
                <div className={`text-3xl font-bold ${trace.module0.block ? 'text-red-400' : 'text-green-400'}`}>
                  {trace.module0.block ? 'BLOCKED' : 'PASS'}
                </div>
              </div>
              <div className="card">
                <div className="card-title">Samples</div>
                <div className="text-3xl font-bold text-white">{trace.module0.metrics.sample_count}</div>
              </div>
            </div>
            <div>
              <div className="card-title">Signal Metrics</div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {Object.entries(trace.module0.metrics).map(([k, v]) => (
                  <div key={k} className="bg-slate-900/50 rounded-lg p-2">
                    <div className="text-[10px] text-slate-500 uppercase">{k}</div>
                    <div className="text-sm font-mono text-white">{typeof v === 'number' ? fixed(v, 3) : v}</div>
                  </div>
                ))}
              </div>
            </div>
            {trace.module0.reasons.length > 0 && (
              <div>
                <div className="card-title">Reasons</div>
                {trace.module0.reasons.map((r, i) => (
                  <div key={i} className="text-sm text-yellow-400">{r}</div>
                ))}
              </div>
            )}
            <div>
              <div className="card-title">Flags</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(trace.module0.flags).map(([k, v]) => (
                  <span key={k} className={`text-xs px-2 py-0.5 rounded-full ${v ? 'bg-red-500/20 text-red-400' : 'bg-slate-700/50 text-slate-500'}`}>
                    {k}: {v ? 'YES' : 'no'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {active === 'A' && trace.moduleA && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Module A: Feature Extraction & Severity</h3>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'RMS', value: trace.moduleA.overall_rms, unit: 'mm/s' },
                { label: 'Peak', value: trace.moduleA.peak, unit: 'mm/s' },
                { label: 'Kurtosis', value: trace.moduleA.kurtosis, unit: '' },
                { label: 'Crest Factor', value: trace.moduleA.crest_factor, unit: '' },
                { label: 'Degradation', value: trace.moduleA.degradation, unit: '' },
              ].map((m) => (
                <div key={m.label} className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-slate-500 uppercase">{m.label}</div>
                  <div className="text-xl font-bold text-white mt-1">{fixed(m.value, 2)}</div>
                  <div className="text-[10px] text-slate-600">{m.unit}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <RadialGauge value={trace.moduleA.severity_score} label="Severity" size={100} />
              <div>
                <span className="text-sm font-bold uppercase" style={{ color: severityColor[trace.moduleA.severity_level] }}>
                  {trace.moduleA.severity_level}
                </span>
                <div className="text-xs text-slate-400 mt-1">Classification: {trace.moduleA.trend_classification}</div>
                {trace.moduleA.ratio_to_baseline && (
                  <div className="text-xs text-slate-400">Baseline ratio: {fixed(trace.moduleA.ratio_to_baseline)}×</div>
                )}
              </div>
            </div>
          </div>
        )}

        {active === 'B' && trace.moduleB && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Module B: Initiator Detection</h3>
            <div className="flex items-center gap-4">
              <div className="card">
                <div className="card-title">Component</div>
                <div className="text-xl font-bold text-white uppercase">{trace.moduleB.component}</div>
              </div>
              <div className="card">
                <div className="card-title">Matches</div>
                <div className="text-xl font-bold text-sky-400">{trace.moduleB.num_matches}</div>
              </div>
              <div className="card">
                <div className="card-title">Confidence</div>
                <div className="text-xl font-bold text-white">{pct(trace.moduleB.confidence)}</div>
              </div>
            </div>
            {trace.moduleB.matched_rules.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 text-xs uppercase border-b border-slate-700">
                      <th className="p-2">Rule</th>
                      <th className="p-2">Initiator</th>
                      <th className="p-2">Diagnosis</th>
                      <th className="p-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trace.moduleB.matched_rules.map((rule) => (
                      <tr key={rule.rule_id} className="border-b border-slate-800">
                        <td className="p-2 font-mono text-sky-400">{rule.rule_id}</td>
                        <td className="p-2 text-white">{rule.initiator}</td>
                        <td className="p-2 text-slate-400">{rule.diagnosis}</td>
                        <td className="p-2 font-bold" style={{ color: scoreToColor(rule.score / 3) }}>{fixed(rule.score)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No fault initiators matched.</p>
            )}
          </div>
        )}

        {active === 'B+' && trace.moduleBplus && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Module B+: Slope Intelligence</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Slope (log)', value: trace.moduleBplus.slope },
                { label: 'Slope Change', value: trace.moduleBplus.slope_change },
                { label: 'NLI', value: trace.moduleBplus.instability_index },
                { label: 'Severity', value: trace.moduleBplus.severity_score },
              ].map((m) => (
                <div key={m.label} className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-slate-500 uppercase">{m.label}</div>
                  <div className="text-xl font-bold font-mono text-white mt-1">{fixed(m.value, 4)}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <HealthBadge stage={trace.moduleBplus.trend_class} size="lg" />
              <span className="text-sm text-slate-400">Trend Classification</span>
            </div>
          </div>
        )}

        {active === 'B++' && trace.moduleBpp && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Module B++: SEDL (Entropy)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <EntropyRadar SE={trace.moduleBpp.SE} TE={trace.moduleBpp.TE} DE={trace.moduleBpp.DE} SI={trace.moduleBpp.SI} />
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Spectral Entropy (SE)', value: trace.moduleBpp.SE },
                  { label: 'Temporal Entropy (TE)', value: trace.moduleBpp.TE },
                  { label: 'Directional Entropy (DE)', value: trace.moduleBpp.DE },
                  { label: 'Entropy Slope (dSE/dt)', value: trace.moduleBpp.dSE_dt },
                  { label: 'Stability Index (SI)', value: trace.moduleBpp.SI },
                ].map((m) => (
                  <div key={m.label} className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">{m.label}</span>
                    <span className="font-mono text-sm text-white">{fixed(m.value, 4)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <HealthBadge stage={trace.moduleBpp.stability_state} size="md" />
              <span className="text-xs text-slate-500 font-mono">
                Rules: {trace.moduleBpp.triggered_rules.join(', ') || 'None'}
              </span>
            </div>
          </div>
        )}

        {active === 'C' && trace.moduleC && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Module C: Fusion (SSI)</h3>
            <div className="flex items-center gap-6">
              <RadialGauge value={trace.moduleC.SSI} label="SSI" size={140} />
              <div>
                <HealthBadge stage={trace.moduleC.system_state} size="lg" />
                <div className="text-sm text-slate-400 mt-2">Profile: {trace.moduleC.profile_id}</div>
                <div className="text-sm text-slate-400">Action: {trace.moduleC.recommended_action}</div>
                <div className="text-sm text-slate-400 mt-1">
                  Contributors: {trace.moduleC.top_contributors.length > 0 ? trace.moduleC.top_contributors.join(', ') : 'None'}
                </div>
              </div>
            </div>
          </div>
        )}

        {active === 'D' && trace.moduleD && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Module D: Health Stage & Escalation</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="card text-center">
                <div className="card-title">Health Stage</div>
                <HealthBadge stage={trace.moduleD.degradation_stage} size="lg" />
              </div>
              <div className="card text-center">
                <div className="card-title">RUL Band</div>
                <div className="text-xl font-bold text-white">{trace.moduleD.rul_band}</div>
              </div>
              <div className="card text-center">
                <div className="card-title">Escalation</div>
                <div className="text-xl font-bold text-sky-400">{trace.moduleD.escalation_level}</div>
              </div>
            </div>
            <div className="text-sm text-slate-400">
              Recommended: {trace.moduleD.recommended_action}
            </div>
          </div>
        )}

        {active === 'E' && trace.moduleE && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Module E: Maintenance Plan</h3>
            <div className="space-y-2">
              {trace.moduleE.plan_items.map((item) => (
                <ActionPlanCard key={item.action_id} item={item} />
              ))}
            </div>
          </div>
        )}

        {active === 'F' && trace.moduleF && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Module F: RUL & Reliability</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'RUL (days)', value: fixed(trace.moduleF.RUL_days) },
                { label: 'P₃₀', value: pct(trace.moduleF.failure_probability_30d) },
                { label: 'Risk Index', value: fixed(trace.moduleF.risk_index) },
                { label: 'Window', value: trace.moduleF.recommended_window },
              ].map((m) => (
                <div key={m.label} className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-slate-500 uppercase">{m.label}</div>
                  <div className="text-lg font-bold text-white mt-1">{m.value}</div>
                </div>
              ))}
            </div>
            {trace.moduleF.reliability_metrics && (
              <div>
                <div className="card-title mt-4">Weibull Reliability Metrics</div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[
                    { label: 'β (base)', value: fixed(trace.moduleF.reliability_metrics.beta_base, 3) },
                    { label: 'β (adjusted)', value: fixed(trace.moduleF.reliability_metrics.beta_adj, 3) },
                    { label: 'η base (hrs)', value: trace.moduleF.reliability_metrics.eta_base_hours.toLocaleString() },
                    { label: 'η adj (hrs)', value: Math.round(trace.moduleF.reliability_metrics.eta_adj_hours).toLocaleString() },
                    { label: 'Bathtub Phase', value: trace.moduleF.reliability_metrics.bathtub_phase.replace('_', ' ') },
                    { label: 'N&H Pattern', value: trace.moduleF.reliability_metrics.nowlan_heap_pattern },
                    { label: 'Hazard Rate', value: trace.moduleF.reliability_metrics.hazard_rate.toExponential(2) },
                    { label: 'Weibull P₃₀', value: pct(trace.moduleF.reliability_metrics.weibull_failure_prob_30d) },
                    { label: 'P-F Position', value: pct(trace.moduleF.reliability_metrics.pf_interval_position) },
                  ].map((m) => (
                    <div key={m.label} className="bg-slate-900/50 rounded-lg p-2">
                      <div className="text-[10px] text-slate-500 uppercase">{m.label}</div>
                      <div className="text-sm font-mono text-white">{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
