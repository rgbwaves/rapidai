import { scoreToColor } from '../utils/colors'

interface Props {
  value: number
  max?: number
  label: string
  unit?: string
  size?: number
  color?: string
}

export default function RadialGauge({ value, max = 1, label, unit = '', size = 120, color }: Props) {
  const normalized = Math.min(value / max, 1)
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius * 0.75 // 270-degree arc
  const dashOffset = circumference * (1 - normalized)
  const c = color || scoreToColor(normalized)

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          className="gauge-ring"
          stroke="#334155"
          strokeWidth="8"
          strokeDasharray={`${circumference} ${circumference * 0.333}`}
          strokeDashoffset={0}
          transform={`rotate(135 ${size / 2} ${size / 2})`}
        />
        {/* Value arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          className="gauge-ring"
          stroke={c}
          strokeWidth="8"
          strokeDasharray={`${circumference} ${circumference * 0.333}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(135 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.5s ease' }}
        />
        {/* Center text */}
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fill={c} fontSize="20" fontWeight="bold">
          {typeof value === 'number' ? (max <= 1 ? (value * 100).toFixed(0) + '%' : value.toFixed(1)) : value}
        </text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fill="#94a3b8" fontSize="10">
          {unit}
        </text>
      </svg>
      <span className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{label}</span>
    </div>
  )
}
