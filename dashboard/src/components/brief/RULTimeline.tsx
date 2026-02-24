/**
 * RULTimeline — visual representation of P-F interval position for Chapter 6.
 * Shows "where we are now" on a horizontal timeline from
 * Fault Detection (P) to Functional Failure (F).
 * More informative than a bare progress bar — annotated zones.
 */

import { scoreToColor } from '../../utils/colors'

interface Props {
  pfPosition: number       // 0-1
  rulDays: number | null
  bathtubPhase: string
}

const zones = [
  { from: 0, to: 0.33, label: 'CBM Window', color: '#22c55e' },
  { from: 0.33, to: 0.67, label: 'Plan Now', color: '#eab308' },
  { from: 0.67, to: 0.85, label: 'Act Soon', color: '#f97316' },
  { from: 0.85, to: 1, label: 'Critical', color: '#ef4444' },
]

export default function RULTimeline({ pfPosition, rulDays, bathtubPhase }: Props) {
  const posColor = scoreToColor(pfPosition)
  const posLeft = `${Math.min(98, Math.max(1, pfPosition * 100))}%`

  return (
    <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/40 space-y-3">
      {/* Zone bar */}
      <div className="relative">
        {/* Labels above */}
        <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
          <span>P — Detectable Fault</span>
          <span>F — Functional Failure</span>
        </div>

        {/* Track */}
        <div className="relative h-5 rounded-full overflow-hidden flex">
          {zones.map((z) => (
            <div
              key={z.label}
              className="h-full flex items-center justify-center"
              style={{
                width: `${(z.to - z.from) * 100}%`,
                backgroundColor: `${z.color}20`,
                borderRight: z.to < 1 ? `1px solid ${z.color}30` : 'none',
              }}
            >
              <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: z.color }}>
                {z.label}
              </span>
            </div>
          ))}

          {/* Position cursor */}
          <div
            className="absolute top-0 h-full w-0.5"
            style={{
              left: posLeft,
              backgroundColor: posColor,
              boxShadow: `0 0 6px ${posColor}`,
            }}
          />
        </div>

        {/* Position label below cursor */}
        <div
          className="absolute text-[10px] font-bold mt-1"
          style={{ left: posLeft, transform: 'translateX(-50%)', color: posColor, top: '100%', marginTop: 4 }}
        >
          NOW ({(pfPosition * 100).toFixed(0)}%)
        </div>
      </div>

      {/* Spacer for NOW label */}
      <div className="h-4" />

      {/* Stats row */}
      <div className="flex items-center gap-6 pt-1 border-t border-slate-700/40">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">RUL Estimate</div>
          <div className="text-sm font-bold font-mono mt-0.5" style={{ color: posColor }}>
            {rulDays != null ? `${Math.round(rulDays)} days` : 'N/A'}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">P-F Position</div>
          <div className="text-sm font-bold font-mono mt-0.5" style={{ color: posColor }}>
            {(pfPosition * 100).toFixed(0)}%
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">Bathtub Phase</div>
          <div className="text-sm font-bold mt-0.5 text-slate-300 capitalize">
            {bathtubPhase.replace('_', ' ')}
          </div>
        </div>
      </div>
    </div>
  )
}
