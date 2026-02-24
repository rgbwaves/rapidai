/**
 * Signal Generator — creates realistic vibration signals for API testing.
 */

function randn(): number {
  const u1 = Math.random()
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

function sine(freq: number, t: number): number {
  return Math.sin(2 * Math.PI * freq * t)
}

export interface SignalParams {
  samplingRate: number
  duration: number
  amplitude: number
  noiseLevel: number
}

const DEFAULT_PARAMS: SignalParams = {
  samplingRate: 6400,
  duration: 1.0,
  amplitude: 2.0,
  noiseLevel: 0.3,
}

export function generateHealthy(params: Partial<SignalParams> = {}): number[] {
  const p = { ...DEFAULT_PARAMS, ...params }
  const n = Math.floor(p.samplingRate * p.duration)
  const dt = 1 / p.samplingRate
  return Array.from({ length: n }, (_, i) => {
    const t = i * dt
    return p.amplitude * sine(50, t) + p.noiseLevel * randn()
  })
}

export function generateBearingDefect(params: Partial<SignalParams> = {}, severity = 0.5): number[] {
  const p = { ...DEFAULT_PARAMS, amplitude: 4.0 + severity * 6.0, noiseLevel: 0.5 + severity, ...params }
  const n = Math.floor(p.samplingRate * p.duration)
  const dt = 1 / p.samplingRate
  const bpfo = 120
  return Array.from({ length: n }, (_, i) => {
    const t = i * dt
    const base = p.amplitude * sine(50, t)
    const defect = severity * 3.0 * sine(bpfo, t) * (1 + 0.5 * sine(50, t))
    const impulse = Math.random() < (severity * 0.02) ? severity * 8.0 * randn() : 0
    return base + defect + impulse + p.noiseLevel * randn()
  })
}

export function generateImbalance(params: Partial<SignalParams> = {}, severity = 0.5): number[] {
  const p = { ...DEFAULT_PARAMS, amplitude: 3.0 + severity * 5.0, ...params }
  const n = Math.floor(p.samplingRate * p.duration)
  const dt = 1 / p.samplingRate
  return Array.from({ length: n }, (_, i) => {
    const t = i * dt
    const onex = p.amplitude * sine(30, t)
    const twox = p.amplitude * 0.2 * sine(60, t)
    return onex + twox + p.noiseLevel * randn()
  })
}

export function generateMisalignment(params: Partial<SignalParams> = {}, severity = 0.5): number[] {
  const p = { ...DEFAULT_PARAMS, amplitude: 3.0 + severity * 4.0, ...params }
  const n = Math.floor(p.samplingRate * p.duration)
  const dt = 1 / p.samplingRate
  return Array.from({ length: n }, (_, i) => {
    const t = i * dt
    const onex = p.amplitude * 0.4 * sine(30, t)
    const twox = p.amplitude * sine(60, t)
    const threex = p.amplitude * 0.3 * sine(90, t)
    return onex + twox + threex + p.noiseLevel * randn()
  })
}

export function generateLooseness(params: Partial<SignalParams> = {}, severity = 0.5): number[] {
  const p = { ...DEFAULT_PARAMS, amplitude: 2.5 + severity * 5.0, ...params }
  const n = Math.floor(p.samplingRate * p.duration)
  const dt = 1 / p.samplingRate
  return Array.from({ length: n }, (_, i) => {
    const t = i * dt
    const half = p.amplitude * 0.6 * sine(15, t)
    const onex = p.amplitude * sine(30, t)
    const harmonics = p.amplitude * 0.3 * sine(60, t) + p.amplitude * 0.2 * sine(90, t)
    return half + onex + harmonics + (p.noiseLevel + severity) * randn()
  })
}

export const SIGNAL_PRESETS = [
  { id: 'healthy', name: 'Healthy Baseline', generate: generateHealthy, description: 'Clean signal, low noise' },
  { id: 'bearing', name: 'Bearing Defect', generate: generateBearingDefect, description: 'BPFO/BPFI impulse pattern' },
  { id: 'imbalance', name: 'Imbalance', generate: generateImbalance, description: '1x dominant vibration' },
  { id: 'misalignment', name: 'Misalignment', generate: generateMisalignment, description: '2x dominant, axial' },
  { id: 'looseness', name: 'Looseness', generate: generateLooseness, description: 'Sub-harmonics + broadband' },
] as const
