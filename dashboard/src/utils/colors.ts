import type { SeverityLevel, HealthStage, BathtubPhase } from '../types/rapid-ai'

export const severityColor: Record<SeverityLevel, string> = {
  normal: '#22c55e',
  watch: '#eab308',
  warning: '#f97316',
  alarm: '#ef4444',
}

export const healthColor: Record<string, string> = {
  Healthy: '#22c55e',
  Degrading: '#eab308',
  Unstable: '#f97316',
  Critical: '#ef4444',
  Blocked: '#6b7280',
}

export const bathtubColor: Record<BathtubPhase, string> = {
  infant_mortality: '#f97316',
  useful_life: '#22c55e',
  wear_out: '#ef4444',
}

export const severityBg: Record<SeverityLevel, string> = {
  normal: 'bg-green-500/20 text-green-400 border-green-500/30',
  watch: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  warning: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  alarm: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export const healthBg: Record<string, string> = {
  Healthy: 'bg-green-500/20 text-green-400 border-green-500/30',
  Degrading: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Unstable: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  Blocked: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

export function scoreToSeverity(score: number): SeverityLevel {
  if (score >= 0.8) return 'alarm'
  if (score >= 0.5) return 'warning'
  if (score >= 0.3) return 'watch'
  return 'normal'
}

export function scoreToColor(score: number): string {
  return severityColor[scoreToSeverity(score)]
}
