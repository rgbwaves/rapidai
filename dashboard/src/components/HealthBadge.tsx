// HealthBadge — renders a severity or health stage label as a styled pill.
// Uses the badge component classes defined in index.css.

interface Props {
  stage: string
  size?: 'sm' | 'md' | 'lg'
}

const HEALTH_CLASS: Record<string, string> = {
  Healthy:              'badge-health-healthy',
  Degrading:            'badge-health-degrading',
  Unstable:             'badge-health-unstable',
  Critical:             'badge-health-critical',
  Blocked:              'badge-health-blocked',
  // Trend classes (used in Module B+)
  Stable:               'badge-health-healthy',
  Drift:                'badge-health-degrading',
  Accelerating:         'badge-health-unstable',
  Chaotic:              'badge-health-critical',
  Step:                 'badge-health-unstable',
  // Stability states (used in Module B++)
  Drifting:             'badge-health-degrading',
  Destabilizing:        'badge-health-unstable',
  Critical_Instability: 'badge-health-critical',
  // System states
  stable:               'badge-health-healthy',
  degrading:            'badge-health-degrading',
  unstable:             'badge-health-unstable',
  critical:             'badge-health-critical',
  'process-driven':     'badge-health-blocked',
  // Escalation
  normal:               'badge-severity-normal',
  watch:                'badge-severity-watch',
  warning:              'badge-severity-warning',
  alarm:                'badge-severity-alarm',
}

const SIZE_CLASS: Record<NonNullable<Props['size']>, string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs   px-2   py-0.5',
  lg: 'text-sm   px-3   py-1',
}

export default function HealthBadge({ stage, size = 'md' }: Props) {
  const badgeClass = HEALTH_CLASS[stage] ?? 'badge-health-blocked'
  return (
    <span className={`badge ${badgeClass} ${SIZE_CLASS[size]}`}>
      {stage.replace('_', ' ')}
    </span>
  )
}
