import type { ModuleTrace } from '../types/rapid-ai'

interface Props {
  trace: ModuleTrace
  totalMs: number
}

const STAGES = [
  { key: 'module0', label: '0: Guard', color: '#3b82f6', stage: 'GUARD' },
  { key: 'moduleA', label: 'A: Features', color: '#22c55e', stage: 'SENSE' },
  { key: 'moduleB', label: 'B: Initiators', color: '#22c55e', stage: 'SENSE' },
  { key: 'moduleBplus', label: 'B+: Trends', color: '#22c55e', stage: 'SENSE' },
  { key: 'moduleBpp', label: 'B++: Entropy', color: '#22c55e', stage: 'SENSE' },
  { key: 'moduleC', label: 'C: Fusion', color: '#eab308', stage: 'FUSE' },
  { key: 'moduleD', label: 'D: Health', color: '#eab308', stage: 'FUSE' },
  { key: 'moduleE', label: 'E: Maint.', color: '#ef4444', stage: 'ACT' },
  { key: 'moduleF', label: 'F: RUL', color: '#ef4444', stage: 'ACT' },
] as const

export default function PipelineTimeline({ trace, totalMs }: Props) {
  return (
    <div className="space-y-1.5">
      {STAGES.map(({ key, label, color }) => {
        const mod = trace[key as keyof ModuleTrace] as any
        const ms = mod?.execution_time_ms || 0
        const pct = totalMs > 0 ? (ms / totalMs) * 100 : 0
        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 w-24 text-right font-mono">{label}</span>
            <div className="flex-1 h-4 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-[10px] text-slate-500 w-16 font-mono">{ms.toFixed(1)} ms</span>
          </div>
        )
      })}
    </div>
  )
}
