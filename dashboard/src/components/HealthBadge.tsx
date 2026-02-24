import { healthBg } from '../utils/colors'

interface Props {
  stage: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
}

export default function HealthBadge({ stage, size = 'md' }: Props) {
  const classes = healthBg[stage] || healthBg.Blocked
  return (
    <span className={`inline-flex items-center font-bold rounded-full border ${classes} ${sizeClasses[size]}`}>
      {stage}
    </span>
  )
}
