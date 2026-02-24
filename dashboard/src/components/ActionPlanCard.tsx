import type { PlanItem } from '../types/rapid-ai'

interface Props {
  item: PlanItem
}

const windowColors: Record<string, string> = {
  'Immediate': 'bg-red-500/20 text-red-400',
  '24 hours': 'bg-orange-500/20 text-orange-400',
  '7 days': 'bg-yellow-500/20 text-yellow-400',
  'Next shutdown': 'bg-slate-500/20 text-slate-400',
}

export default function ActionPlanCard({ item }: Props) {
  const windowClass = windowColors[item.window] || 'bg-slate-500/20 text-slate-400'

  return (
    <div className="card flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-sky-400">
        {item.rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm text-slate-200 truncate">{item.action_title}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${windowClass}`}>
            {item.window}
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-1">{item.justification}</p>
        <p className="text-[10px] text-slate-500">Verify: {item.verification}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-slate-600 font-mono">{item.action_id}</span>
        </div>
      </div>
    </div>
  )
}
