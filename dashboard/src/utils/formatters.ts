export function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

export function fixed(v: number, d = 2): string {
  return v.toFixed(d)
}

export function days(v: number): string {
  if (v < 1) return '< 1 day'
  if (v < 7) return `${Math.round(v)} days`
  if (v < 30) return `${Math.round(v / 7)} weeks`
  if (v < 365) return `${Math.round(v / 30)} months`
  return `${(v / 365).toFixed(1)} years`
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
}
