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

/**
 * Triaxial signal set — H, V, A channels with physics-based amplitude ratios.
 * Each fault type produces characteristic directional signatures that Module B
 * uses for initiator rule matching.
 */
export interface TriaxialSignals {
  h: number[]
  v: number[]
  a: number[]
}

/**
 * Generate triaxial (H, V, A) signals for a given preset.
 *
 * Amplitude ratios per fault type (based on vibration physics):
 *   Healthy:      H ≈ V ≈ A (ratios ~1.0) → no ratio-based rules fire
 *   Bearing:      H ≈ V, low A, high kurtosis → AFB03/05/11 fire
 *   Imbalance:    H >> V, low A (H_V ≈ 1.5, A_H ≈ 0.15) → AFB06 fires
 *   Misalignment: A >> H (A_H ≈ 1.5), V moderate → AFB07/AFB14 fire
 *   Looseness:    V >> H (V_H ≈ 1.5), broadband → AFB10 fires
 */
export function generateTriaxial(
  presetId: string,
  severity: number,
  params: Partial<SignalParams> = {},
): TriaxialSignals {
  // Strip amplitude from params so each generator's physics-based amplitude
  // isn't overwritten by DEFAULT_PARAMS.amplitude (2.0). Only pass through
  // samplingRate, duration, noiseLevel.
  const { amplitude: _drop, ...nonAmpParams } = { ...DEFAULT_PARAMS, ...params }
  const p = nonAmpParams as Partial<SignalParams>

  switch (presetId) {
    case 'bearing': {
      // Bearing: H ≈ V (ratio ~1.0), low A — kurtosis/crest fire the rules
      const hAmp = 4.0 + severity * 6.0
      const vAmp = hAmp * (0.9 + severity * 0.05)
      const aAmp = hAmp * (0.3 + severity * 0.1)
      const h = generateBearingDefect({ ...p, amplitude: hAmp }, severity)
      const v = generateBearingDefect({ ...p, amplitude: vAmp }, severity)
      const a = generateHealthy({ ...p, amplitude: aAmp, noiseLevel: 0.2 })
      return { h, v, a }
    }
    case 'imbalance': {
      // Imbalance: H dominant, V lower (H_V ≈ 1.4–1.8), A very low (A_H < 0.3)
      const hAmp = 3.0 + severity * 5.0
      const vScale = 0.55 + (1 - severity) * 0.15  // 0.55–0.70
      const aScale = 0.10 + (1 - severity) * 0.05  // 0.10–0.15
      const h = generateImbalance({ ...p, amplitude: hAmp }, severity)
      const v = generateImbalance({ ...p, amplitude: hAmp * vScale }, severity)
      const a = generateHealthy({ ...p, amplitude: hAmp * aScale, noiseLevel: 0.1 })
      return { h, v, a }
    }
    case 'misalignment': {
      // Misalignment: A dominant (A_H ≈ 1.5–2.0), V moderate
      const hAmp = 3.0 + severity * 4.0
      const vScale = 0.8
      const aScale = 1.5 + severity * 0.5
      const h = generateMisalignment({ ...p, amplitude: hAmp }, severity)
      const v = generateMisalignment({ ...p, amplitude: hAmp * vScale }, severity)
      const a = generateMisalignment({ ...p, amplitude: hAmp * aScale }, severity)
      return { h, v, a }
    }
    case 'looseness': {
      // Looseness: V dominant (V_H ≈ 1.5–1.8), A low
      const hAmp = 2.5 + severity * 5.0
      const vScale = 1.5 + severity * 0.3
      const aScale = 0.2 + severity * 0.1
      const h = generateLooseness({ ...p, amplitude: hAmp }, severity)
      const v = generateLooseness({ ...p, amplitude: hAmp * vScale }, severity)
      const a = generateHealthy({ ...p, amplitude: hAmp * aScale, noiseLevel: 0.3 + severity * 0.3 })
      return { h, v, a }
    }
    default: {
      // Healthy: balanced H ≈ V ≈ A — no ratio-based rules should fire
      const hAmp = (params.amplitude ?? DEFAULT_PARAMS.amplitude)
      const h = generateHealthy({ ...p, amplitude: hAmp })
      const v = generateHealthy({ ...p, amplitude: hAmp * 0.95 })
      const a = generateHealthy({ ...p, amplitude: hAmp * 0.6 })
      return { h, v, a }
    }
  }
}
