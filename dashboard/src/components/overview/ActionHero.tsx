import type { PlanItem } from '../../types/rapid-ai'

interface Props {
  items: PlanItem[]
  visible: boolean
}

const windowMeta: Record<string, { color: string; bg: string; border: string; icon: string; urgency: number }> = {
  'Immediate': {
    color: '#ef4444',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: '!',
    urgency: 4,
  },
  '24 hours': {
    color: '#f97316',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: '~',
    urgency: 3,
  },
  '7 days': {
    color: '#eab308',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: '+',
    urgency: 2,
  },
  'Next shutdown': {
    color: '#38bdf8',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    icon: 's',
    urgency: 1,
  },
}

function defaultWindow(window: string) {
  return windowMeta[window] ?? {
    color: '#94a3b8',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    icon: '·',
    urgency: 0,
  }
}

interface ActionCardProps {
  item: PlanItem
  index: number
  isHero: boolean
  visible: boolean
}

function ActionCard({ item, index, isHero, visible }: ActionCardProps) {
  const meta = defaultWindow(item.window)

  return (
    <div
      className={`
        flex flex-col gap-2 rounded-xl border p-4 transition-all duration-300
        ${meta.bg} ${meta.border}
        ${isHero
          ? 'min-h-[120px]'
          : 'opacity-80 hover:opacity-100'
        }
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
      `}
      style={{
        transitionDelay: `${index * 60}ms`,
        transitionProperty: 'opacity, transform',
      }}
    >
      {/* Rank + window */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Urgency icon */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
            aria-hidden="true"
          >
            {meta.icon}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>
            {item.window}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-600">{item.action_id}</span>
      </div>

      {/* Title */}
      <div className="font-semibold text-sm text-slate-100 leading-snug">
        {item.action_title}
      </div>

      {/* Justification */}
      {isHero && (
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
          {item.justification}
        </p>
      )}

      {/* Priority bar */}
      <div className="flex items-center gap-2 mt-auto">
        <div className="flex-1 h-1 bg-slate-700/60 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${item.priority_score}%`,
              backgroundColor: meta.color,
            }}
          />
        </div>
        <span className="text-[9px] font-mono" style={{ color: meta.color }}>
          P={item.priority_score.toFixed(0)}
        </span>
      </div>
    </div>
  )
}

/**
 * Top-3 action cards displayed as hero elements.
 * Sorted by priority score descending.
 */
export default function ActionHero({ items, visible }: Props) {
  if (!items || items.length === 0) return null

  const sorted = [...items].sort((a, b) => b.priority_score - a.priority_score)
  const top3 = sorted.slice(0, 3)
  const remaining = sorted.slice(3)

  return (
    <div>
      {/* Header */}
      <div
        className={`
          flex items-center justify-between mb-3
          transition-all duration-300
          ${visible ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Action Plan
        </div>
        <div className="text-[10px] text-slate-600">
          {items.length} total action{items.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Top 3 hero cards */}
      <div
        className={`
          grid gap-3
          ${top3.length === 1 ? 'grid-cols-1' : top3.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}
        `}
      >
        {top3.map((item, i) => (
          <ActionCard
            key={item.action_id}
            item={item}
            index={i}
            isHero={true}
            visible={visible}
          />
        ))}
      </div>

      {/* Remaining actions (compact) */}
      {remaining.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {remaining.map((item, i) => (
            <ActionCard
              key={item.action_id}
              item={item}
              index={i + 3}
              isHero={false}
              visible={visible}
            />
          ))}
        </div>
      )}
    </div>
  )
}
