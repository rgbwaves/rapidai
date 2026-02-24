/**
 * SSIContributors — compact visual for Chapter 4: System Impact.
 * Shows SSI as a large number with labeled contributor tags.
 * Inline with prose — not a standalone chart.
 */

import { scoreToColor } from '../../utils/colors'

interface Props {
  ssi: number
  contributors: string[]
  systemState: string
}

const blockLabels: Record<string, string> = {
  BSR001: 'Vibration severity',
  BSR002: 'Fault confidence',
  BSR003: 'Trend slope',
  BSR004: 'Entropy stability',
  BSR005: 'Kurtosis',
  BSR006: 'Operational stress',
  BSR007: 'Baseline deviation',
}

function formatContributor(id: string): string {
  return blockLabels[id] ?? id.replace(/_/g, ' ')
}

export default function SSIContributors({ ssi, contributors, systemState }: Props) {
  const color = scoreToColor(ssi)
  const pct = (ssi * 100).toFixed(1)

  return (
    <div className="flex items-start gap-6 p-4 rounded-lg bg-slate-900/50 border border-slate-700/40">
      {/* SSI number */}
      <div className="flex-shrink-0 text-center">
        <div className="text-4xl font-bold font-mono" style={{ color }}>
          {pct}%
        </div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">SSI</div>
        <div className="text-[10px] text-slate-400 mt-0.5 capitalize">{systemState}</div>
      </div>

      {/* Divider */}
      <div className="w-px self-stretch bg-slate-700/50" />

      {/* Contributors */}
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Top contributors</div>
        {contributors.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {contributors.map((c) => (
              <span
                key={c}
                className="text-xs px-2 py-0.5 rounded-md border font-medium"
                style={{
                  backgroundColor: `${color}10`,
                  borderColor: `${color}30`,
                  color,
                }}
              >
                {formatContributor(c)}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-500">No dominant contributors identified</span>
        )}

        {/* SSI bar */}
        <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${ssi * 100}%`,
              backgroundColor: color,
              transition: 'width 0.9s ease-out',
            }}
          />
        </div>
      </div>
    </div>
  )
}
