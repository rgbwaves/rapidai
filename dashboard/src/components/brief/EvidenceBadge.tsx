/**
 * EvidenceBadge — inline pill woven into narrative text.
 * Renders a colored chip with a label and optional value.
 * Small enough to sit mid-sentence without breaking flow.
 */

interface Props {
  label: string
  value?: string | number
  color?: string
  variant?: 'pill' | 'chip' | 'mono'
}

export default function EvidenceBadge({ label, value, color = '#38bdf8', variant = 'pill' }: Props) {
  if (variant === 'mono') {
    return (
      <code
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-800 border border-slate-700 text-slate-300 align-middle"
        style={{ borderColor: `${color}40` }}
      >
        {label}{value !== undefined && <span style={{ color }}>{value}</span>}
      </code>
    )
  }

  if (variant === 'chip') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold align-middle border"
        style={{
          backgroundColor: `${color}15`,
          borderColor: `${color}35`,
          color,
        }}
      >
        {label}
        {value !== undefined && (
          <span className="font-bold">{value}</span>
        )}
      </span>
    )
  }

  // Default: pill
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold align-middle"
      style={{
        backgroundColor: `${color}20`,
        color,
      }}
    >
      {label}
      {value !== undefined && <span>{value}</span>}
    </span>
  )
}
