/**
 * TrendArrow — compact inline trend indicator.
 * Arrow icon + classification label, sized to sit inline with body text.
 */

import type { TrendClass } from '../../types/rapid-ai'
import { trendArrow } from '../../utils/narrative'

const trendColor: Record<TrendClass, string> = {
  Stable: '#22c55e',
  Drift: '#eab308',
  Accelerating: '#f97316',
  Step: '#f97316',
  Chaotic: '#ef4444',
}

const trendIcon: Record<TrendClass, string> = {
  Stable: '→',
  Drift: '↗',
  Accelerating: '↑',
  Step: '⤴',
  Chaotic: '↯',
}

interface Props {
  trend: TrendClass
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export default function TrendArrow({ trend, showLabel = true, size = 'md' }: Props) {
  const color = trendColor[trend]
  const icon = trendIcon[trend]
  const label = trendArrow[trend]

  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'
  const iconSize = size === 'sm' ? 'text-sm' : 'text-base'

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold align-middle ${textSize}`}
      style={{
        backgroundColor: `${color}15`,
        color,
        border: `1px solid ${color}30`,
      }}
    >
      <span className={`${iconSize} leading-none`}>{icon}</span>
      {showLabel && <span>{label}</span>}
    </span>
  )
}
