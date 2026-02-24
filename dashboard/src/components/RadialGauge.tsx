// RadialGauge — 270-degree arc gauge with animated fill.
// Sizes: sm (80px), md (120px), lg (160px).
// Respects useRole() for label translation if wired in via prop.

import { scoreToColor } from '../utils/colors'

interface Props {
  value: number
  max?: number
  label: string
  unit?: string
  size?: 'sm' | 'md' | 'lg' | number
  color?: string
  /** When true, animate entrance (use for hero/executive view) */
  animate?: boolean
}

const SIZE_MAP = { sm: 80, md: 120, lg: 160 } as const

export default function RadialGauge({
  value,
  max = 1,
  label,
  unit = '',
  size = 'md',
  color,
  animate = false,
}: Props) {
  const px = typeof size === 'number' ? size : SIZE_MAP[size]
  const strokeWidth = px <= 80 ? 6 : px <= 120 ? 8 : 10
  const radius = (px - strokeWidth * 2) / 2
  // 270-degree arc
  const arcFraction = 0.75
  const circumference = 2 * Math.PI * radius * arcFraction
  const normalized = Math.min(Math.max(value / max, 0), 1)
  const dashOffset = circumference * (1 - normalized)
  const c = color ?? scoreToColor(normalized)

  // Center text sizing
  const valueFontSize = px <= 80 ? 14 : px <= 120 ? 20 : 28
  const labelFontSize = px <= 80 ? 8 : px <= 120 ? 10 : 12
  const unitFontSize  = px <= 80 ? 7 : px <= 120 ? 9 : 11

  const displayValue =
    max <= 1
      ? `${(value * 100).toFixed(0)}%`
      : value.toFixed(max <= 10 ? 2 : 0)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        aria-label={`${label}: ${displayValue}`}
        role="img"
      >
        {/* Track — background arc */}
        <circle
          cx={px / 2}
          cy={px / 2}
          r={radius}
          className="gauge-ring"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference * 0.334}`}
          strokeDashoffset={0}
          transform={`rotate(135 ${px / 2} ${px / 2})`}
        />
        {/* Fill arc */}
        <circle
          cx={px / 2}
          cy={px / 2}
          r={radius}
          className="gauge-ring"
          stroke={c}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference * 0.334}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(135 ${px / 2} ${px / 2})`}
          style={{
            transition: animate
              ? 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.5s ease'
              : 'stroke-dashoffset 0.8s ease-out, stroke 0.5s ease',
            filter: `drop-shadow(0 0 ${strokeWidth}px ${c}60)`,
          }}
        />
        {/* Center value */}
        <text
          x={px / 2}
          y={px / 2 - (unit ? 5 : 2)}
          textAnchor="middle"
          fill={c}
          fontSize={valueFontSize}
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
          className="tabular-nums"
        >
          {displayValue}
        </text>
        {/* Unit (if provided) */}
        {unit && (
          <text
            x={px / 2}
            y={px / 2 + unitFontSize + 2}
            textAnchor="middle"
            fill="#64748b"
            fontSize={unitFontSize}
            fontFamily="JetBrains Mono, monospace"
          >
            {unit}
          </text>
        )}
      </svg>
      {/* Label below gauge */}
      <span
        className="text-label-md uppercase tracking-wider text-slate-400 text-center leading-tight"
        style={{ maxWidth: px }}
      >
        {label}
      </span>
    </div>
  )
}
