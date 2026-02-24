import type { FullAnalysisResponse } from '../../types/rapid-ai'
import type { EvaluateRequest } from '../../api/evaluate'
import SignalWaveform from '../SignalWaveform'

interface Props {
  result: FullAnalysisResponse
  request: EvaluateRequest | null
  visible: boolean
}

const trendColors: Record<string, string> = {
  Stable: '#22c55e',
  Drift: '#eab308',
  Accelerating: '#f97316',
  Chaotic: '#ef4444',
  Step: '#a855f7',
}

const stateColors: Record<string, string> = {
  Stable: '#22c55e',
  Drifting: '#eab308',
  Destabilizing: '#f97316',
  Chaotic: '#ef4444',
  Critical_Instability: '#ef4444',
}

/**
 * Bottom strip: compact signal waveform + quick stats grid.
 */
export default function BottomStrip({ result, request, visible }: Props) {
  const trace = result.module_trace
  const qualityScore = trace.module0?.quality_score ?? 1
  const rulesMatched = trace.moduleB?.num_matches ?? 0
  const trendClass = trace.moduleBplus?.trend_class ?? 'Stable'
  const stabilityState = trace.moduleBpp?.stability_state ?? 'Stable'
  const component = trace.moduleB?.component ?? 'N/A'
  const sampleCount = trace.module0?.metrics.sample_count ?? 0
  const kurtosis = trace.moduleA?.kurtosis ?? 0

  const hasSignal = request?.signal?.values && request.signal.values.length > 0

  return (
    <div
      className={`
        grid gap-3 transition-all duration-400
        ${hasSignal ? 'grid-cols-5' : 'grid-cols-1'}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
      style={{ transitionProperty: 'opacity, transform' }}
    >
      {/* Signal waveform thumbnail */}
      {hasSignal && (
        <div className="card col-span-2">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
            Signal
            <span className="ml-2 font-mono text-slate-600">
              {request!.signal.signal_type} · {request!.signal.direction} · {(request!.signal.sampling_rate_hz / 1000).toFixed(1)}kHz
            </span>
          </div>
          <SignalWaveform
            values={request!.signal.values}
            samplingRate={request!.signal.sampling_rate_hz}
            rms={trace.moduleA?.overall_rms}
            className="h-24"
          />
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className={`card ${hasSignal ? 'col-span-3' : 'col-span-1'}`}>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Quick Stats
        </div>
        <div className="grid grid-cols-3 gap-x-4 gap-y-3">
          <StatCell
            label="Data Quality"
            value={`${(qualityScore * 100).toFixed(1)}%`}
            color={qualityScore > 0.9 ? '#22c55e' : qualityScore > 0.7 ? '#eab308' : '#ef4444'}
          />
          <StatCell
            label="Rules Matched"
            value={`${rulesMatched} / 116`}
            color={rulesMatched > 3 ? '#ef4444' : rulesMatched > 1 ? '#eab308' : '#22c55e'}
          />
          <StatCell
            label="Component"
            value={component.toUpperCase()}
            color="#38bdf8"
          />
          <StatCell
            label="Trend"
            value={trendClass}
            color={trendColors[trendClass] ?? '#94a3b8'}
          />
          <StatCell
            label="Stability"
            value={stabilityState.replace('_', ' ')}
            color={stateColors[stabilityState] ?? '#94a3b8'}
          />
          <StatCell
            label="Kurtosis"
            value={kurtosis.toFixed(2)}
            color={kurtosis > 4 ? '#f97316' : '#94a3b8'}
          />
          <StatCell
            label="Samples"
            value={sampleCount.toLocaleString()}
            color="#94a3b8"
          />
          <StatCell
            label="Schema"
            value={result.schema_version}
            color="#475569"
          />
          <StatCell
            label="Escalation"
            value={trace.moduleD?.escalation_level ?? 'N/A'}
            color="#94a3b8"
          />
        </div>
      </div>
    </div>
  )
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-[9px] font-semibold uppercase tracking-widest text-slate-600 mb-0.5">
        {label}
      </div>
      <div className="text-xs font-semibold font-mono" style={{ color }}>
        {value}
      </div>
    </div>
  )
}
