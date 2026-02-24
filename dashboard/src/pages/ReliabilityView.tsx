import type { Scenario } from '../types/rapid-ai'
import WeibullChart from '../components/WeibullChart'
import BathtubCurve from '../components/BathtubCurve'
import HazardRateChart from '../components/HazardRateChart'
import PFDiagram from '../components/PFDiagram'
import { pct, fixed, days } from '../utils/formatters'
import { bathtubColor } from '../utils/colors'

interface Props {
  scenario: Scenario
}

const weibullParams = [
  { component: 'Bearing (AFB)', beta: 1.5, eta: 50000 },
  { component: 'Seal', beta: 1.2, eta: 30000 },
  { component: 'Gear', beta: 2.5, eta: 80000 },
  { component: 'Coupling', beta: 1.8, eta: 60000 },
  { component: 'Motor', beta: 1.3, eta: 70000 },
  { component: 'Impeller', beta: 2.0, eta: 90000 },
  { component: 'Belt', beta: 3.0, eta: 15000 },
  { component: 'Foundation', beta: 1.1, eta: 120000 },
]

const nhPatterns = [
  { pattern: 'A', name: 'Bathtub', pct: '4%', desc: 'Classic three-phase life curve' },
  { pattern: 'B', name: 'Wear-out', pct: '2%', desc: 'Age-related, predictable end-of-life' },
  { pattern: 'C', name: 'Gradual', pct: '5%', desc: 'Slowly increasing failure rate' },
  { pattern: 'D', name: 'Initial spike', pct: '7%', desc: 'Low initial, then constant' },
  { pattern: 'E', name: 'Random', pct: '14%', desc: 'Constant failure rate throughout' },
  { pattern: 'F', name: 'Infant mortality', pct: '68%', desc: 'High early, then constant' },
]

export default function ReliabilityView({ scenario }: Props) {
  const rel = scenario.response.reliability_metrics

  if (!rel) {
    return (
      <div className="max-w-7xl">
        <h2 className="text-xl font-bold text-white mb-4">Reliability Engineering</h2>
        <p className="text-slate-400">No reliability metrics available for this scenario.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Reliability Engineering</h2>
        <div className="flex items-center gap-3">
          <span
            className="px-3 py-1 rounded-full text-sm font-bold border"
            style={{
              color: bathtubColor[rel.bathtub_phase],
              borderColor: bathtubColor[rel.bathtub_phase] + '40',
              backgroundColor: bathtubColor[rel.bathtub_phase] + '15',
            }}
          >
            {rel.bathtub_phase.replace('_', ' ').toUpperCase()}
          </span>
          <span className="text-sm text-slate-400">
            Nowlan & Heap: Pattern {rel.nowlan_heap_pattern}
          </span>
        </div>
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'β (adjusted)', value: fixed(rel.beta_adj, 3) },
          { label: 'η (adj hours)', value: Math.round(rel.eta_adj_hours).toLocaleString() },
          { label: 'Hazard Rate', value: rel.hazard_rate.toExponential(2) },
          { label: 'Weibull P₃₀', value: pct(rel.weibull_failure_prob_30d) },
          { label: 'Weibull RUL', value: rel.weibull_rul_days != null ? days(rel.weibull_rul_days) : 'N/A' },
          { label: 'P-F Position', value: pct(rel.pf_interval_position) },
        ].map((m) => (
          <div key={m.label} className="card text-center">
            <div className="text-[10px] text-slate-500 uppercase">{m.label}</div>
            <div className="text-lg font-bold text-white mt-1 font-mono">{m.value}</div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weibull PDF/CDF/Reliability */}
        <div className="card">
          <div className="card-title">Weibull Distribution (β={fixed(rel.beta_adj, 2)}, η={Math.round(rel.eta_adj_hours)}h)</div>
          <WeibullChart beta={rel.beta_adj} eta={rel.eta_adj_hours} />
        </div>

        {/* Bathtub curve */}
        <div className="card">
          <div className="card-title">Bathtub Curve — Current Phase</div>
          <BathtubCurve currentPhase={rel.bathtub_phase} beta={rel.beta_adj} />
        </div>

        {/* Hazard Rate */}
        <div className="card">
          <div className="card-title">Hazard Rate h(t)</div>
          <HazardRateChart beta={rel.beta_adj} eta={rel.eta_adj_hours} />
        </div>

        {/* P-F Interval */}
        <div className="card">
          <div className="card-title">P-F Interval Position</div>
          <div className="py-8 px-4">
            <PFDiagram position={rel.pf_interval_position} />
          </div>
          <div className="mt-4 text-xs text-slate-400 space-y-1">
            <p>Point P = when SENSE first detects fault signature</p>
            <p>Point F = functional failure (threshold exceedance)</p>
            <p>CBM window = time between P and F to act</p>
          </div>
        </div>
      </div>

      {/* Component Weibull Parameters Table */}
      <div className="card">
        <div className="card-title">Component Weibull Parameters (Baseline)</div>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase border-b border-slate-700">
                <th className="p-2">Component</th>
                <th className="p-2">β (shape)</th>
                <th className="p-2">η (scale, hours)</th>
                <th className="p-2">Failure Mode</th>
              </tr>
            </thead>
            <tbody>
              {weibullParams.map((row) => (
                <tr key={row.component} className="border-b border-slate-800/50">
                  <td className="p-2 text-white font-medium">{row.component}</td>
                  <td className="p-2 font-mono">{row.beta.toFixed(1)}</td>
                  <td className="p-2 font-mono">{row.eta.toLocaleString()}</td>
                  <td className="p-2 text-slate-400">
                    {row.beta < 1 ? 'Infant mortality' : row.beta <= 1.2 ? 'Random' : row.beta <= 2 ? 'Early wear-out' : 'Wear-out'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nowlan & Heap Patterns */}
      <div className="card">
        <div className="card-title">Nowlan & Heap Failure Patterns</div>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase border-b border-slate-700">
                <th className="p-2">Pattern</th>
                <th className="p-2">Name</th>
                <th className="p-2">% of Failures</th>
                <th className="p-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {nhPatterns.map((row) => (
                <tr
                  key={row.pattern}
                  className={`border-b border-slate-800/50 ${rel.nowlan_heap_pattern === row.pattern ? 'bg-sky-500/10' : ''}`}
                >
                  <td className="p-2 font-bold text-sky-400">{row.pattern}</td>
                  <td className="p-2 text-white">{row.name}</td>
                  <td className="p-2 font-mono">{row.pct}</td>
                  <td className="p-2 text-slate-400">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-3">
            82% of failures (D+E+F) are random or infant mortality — time-based replacement is ineffective. Only condition-based monitoring catches them.
          </p>
        </div>
      </div>
    </div>
  )
}
