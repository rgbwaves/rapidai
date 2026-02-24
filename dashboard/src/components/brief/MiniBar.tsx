/**
 * MiniBar — compact horizontal progress bar.
 * Used inline inside narrative to show a score at a glance.
 */

import { scoreToColor } from '../../utils/colors'

interface Props {
  value: number      // 0-1
  max?: number
  color?: string
  width?: number
  label?: string
}

export default function MiniBar({ value, max = 1, color, width = 80, label }: Props) {
  const normalized = Math.min(value / max, 1)
  const fill = color ?? scoreToColor(normalized)
  const pct = (normalized * 100).toFixed(0)

  return (
    <span
      className="inline-flex items-center gap-1.5 align-middle"
      title={label ?? `${pct}%`}
    >
      <span
        className="inline-block rounded-full overflow-hidden align-middle"
        style={{ width, height: 6, backgroundColor: '#334155' }}
      >
        <span
          className="block h-full rounded-full"
          style={{
            width: `${normalized * 100}%`,
            backgroundColor: fill,
            transition: 'width 0.8s ease-out',
          }}
        />
      </span>
      <span className="text-[11px] font-mono font-bold" style={{ color: fill }}>
        {pct}%
      </span>
    </span>
  )
}
