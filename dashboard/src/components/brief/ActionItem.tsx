/**
 * ActionItem — narrative-style action card for Chapter 5.
 * Renders a single PlanItem in report prose style rather than a data table.
 * Priority ranking, urgency window, justification, and verification are
 * all readable in a single flow without scan-and-parse overhead.
 */

import { useNavigate } from 'react-router-dom'
import type { PlanItem } from '../../types/rapid-ai'

const windowStyles: Record<string, { bg: string; text: string; border: string }> = {
  Immediate: { bg: '#ef444415', text: '#ef4444', border: '#ef444430' },
  '24 hours': { bg: '#f9731615', text: '#f97316', border: '#f9731630' },
  '7 days': { bg: '#eab30815', text: '#eab308', border: '#eab30830' },
  'Next shutdown': { bg: '#64748b15', text: '#94a3b8', border: '#64748b30' },
}

const rankOrdinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

interface Props {
  item: PlanItem
  accentColor: string
}

export default function ActionItem({ item, accentColor }: Props) {
  const navigate = useNavigate()
  const style = windowStyles[item.window] ?? windowStyles['Next shutdown']

  return (
    <div
      className="rounded-lg border border-slate-700/40 bg-slate-900/50 p-4 cursor-pointer hover:bg-slate-900/80 transition-colors"
      style={{ borderLeftColor: accentColor, borderLeftWidth: 2 }}
      onClick={() => navigate('/modules')}
      title="View in Module Explorer"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate('/modules')}
    >
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-0.5"
          style={{ backgroundColor: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}35` }}
        >
          {item.rank}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center flex-wrap gap-2 mb-1.5">
            <span className="text-sm font-semibold text-white">{item.action_title}</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}
            >
              {item.window}
            </span>
            <span className="text-[10px] text-slate-600 font-mono ml-auto">{item.action_id}</span>
          </div>

          {/* Justification */}
          <p className="text-sm text-slate-300 leading-relaxed mb-2">
            <span className="text-slate-500 text-xs uppercase tracking-wide font-semibold mr-1.5">Why:</span>
            {item.justification}
          </p>

          {/* Verification */}
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="uppercase tracking-wide font-semibold mr-1.5">Verify:</span>
            {item.verification}
          </p>

          {/* Priority score bar */}
          <div className="flex items-center gap-2 mt-2.5">
            <span className="text-[10px] text-slate-600 uppercase tracking-wide">Priority score</span>
            <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${item.priority_score}%`,
                  backgroundColor: accentColor,
                  transition: 'width 0.8s ease-out',
                }}
              />
            </div>
            <span className="text-[10px] font-mono font-bold" style={{ color: accentColor }}>
              {item.priority_score.toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
