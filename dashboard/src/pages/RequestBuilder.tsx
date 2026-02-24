import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnalysis } from '../context/AnalysisContext'
import { SIGNAL_PRESETS, generateHealthy } from '../utils/signalGenerator'
import type { EvaluateRequest } from '../api/evaluate'
import SignalWaveform from '../components/SignalWaveform'

const MACHINE_TYPES = ['pump_train_horizontal', 'gearbox_train', 'fan_train', 'generic']
const COMPONENTS = ['afb', 'journal', 'tpjb', 'coupling', 'ac_motor', 'gears', 'seal', 'shaft', 'belts', 'chains', 'dc_motor', 'impeller']
const SIGNAL_TYPES = ['velocity', 'acceleration', 'displacement']
const DIRECTIONS = ['H', 'V', 'A']
const UNITS: Record<string, string> = { velocity: 'mm/s', acceleration: 'g', displacement: 'um' }

export default function RequestBuilder() {
  const navigate = useNavigate()
  const { runAnalysis, isLoading } = useAnalysis()

  // Machine config
  const [assetId, setAssetId] = useState('PUMP-001')
  const [machineType, setMachineType] = useState(MACHINE_TYPES[0])
  const [component, setComponent] = useState(COMPONENTS[0])
  const [criticality, setCriticality] = useState(3)
  const [failureThreshold, setFailureThreshold] = useState(11.2)
  const [operatingHours, setOperatingHours] = useState(8760)

  // Signal config
  const [signalType, setSignalType] = useState(SIGNAL_TYPES[0])
  const [direction, setDirection] = useState(DIRECTIONS[0])
  const [samplingRate, setSamplingRate] = useState(6400)

  // Signal generator
  const [selectedPreset, setSelectedPreset] = useState<string>(SIGNAL_PRESETS[0].id)
  const [severity, setSeverity] = useState(0.5)
  const [previewValues, setPreviewValues] = useState<number[]>(() => generateHealthy())

  function generateSignal(presetId: string, sev: number): number[] {
    const preset = SIGNAL_PRESETS.find((p) => p.id === presetId)
    if (!preset) return generateHealthy({ samplingRate })
    if (preset.id === 'healthy') return (preset.generate as (p?: Partial<import('../utils/signalGenerator').SignalParams>) => number[])({ samplingRate })
    return (preset.generate as (p: Partial<import('../utils/signalGenerator').SignalParams>, s: number) => number[])({ samplingRate }, sev)
  }

  function handlePresetChange(presetId: string) {
    setSelectedPreset(presetId)
    setPreviewValues(generateSignal(presetId, severity))
  }

  function handleSeverityChange(newSev: number) {
    setSeverity(newSev)
    setPreviewValues(generateSignal(selectedPreset, newSev))
  }

  async function handleSubmit() {
    const values = generateSignal(selectedPreset, severity)

    const request: EvaluateRequest = {
      schema_version: '1.0',
      asset_id: assetId,
      timestamp_utc: new Date().toISOString(),
      machine_type: machineType,
      system_type: machineType,
      signal: {
        signal_type: signalType,
        direction,
        unit: UNITS[signalType] || 'mm/s',
        sampling_rate_hz: samplingRate,
        values,
      },
      context: {
        rpm: 1800,
        temperature_c: 45,
      },
      component,
      historical_timestamps: [],
      historical_values: [],
      criticality,
      failure_threshold: failureThreshold,
    }

    await runAnalysis(request)
    navigate('/results')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Request Builder</h2>
        <p className="text-sm text-slate-400 mt-1">
          Configure and send a vibration analysis request to the RAPID AI engine.
        </p>
      </div>

      {/* Machine Configuration */}
      <div className="card">
        <div className="card-title">Machine Configuration</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Asset ID</label>
            <input
              type="text"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Machine Type</label>
            <select
              value={machineType}
              onChange={(e) => setMachineType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500"
            >
              {MACHINE_TYPES.map((mt) => (
                <option key={mt} value={mt}>{mt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Component</label>
            <select
              value={component}
              onChange={(e) => setComponent(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500"
            >
              {COMPONENTS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Criticality: {criticality}
            </label>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={criticality}
              onChange={(e) => setCriticality(Number(e.target.value))}
              className="w-full accent-sky-500"
            />
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>1 (Low)</span>
              <span>5 (Critical)</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Failure Threshold</label>
            <input
              type="number"
              value={failureThreshold}
              onChange={(e) => setFailureThreshold(Number(e.target.value))}
              step={0.1}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Operating Hours</label>
            <input
              type="number"
              value={operatingHours}
              onChange={(e) => setOperatingHours(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Signal Configuration */}
      <div className="card">
        <div className="card-title">Signal Configuration</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Signal Type</label>
            <select
              value={signalType}
              onChange={(e) => setSignalType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500"
            >
              {SIGNAL_TYPES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500"
            >
              {DIRECTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Sampling Rate (Hz)</label>
            <input
              type="number"
              value={samplingRate}
              onChange={(e) => setSamplingRate(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Unit: {UNITS[signalType] || 'mm/s'}
        </div>
      </div>

      {/* Signal Generator */}
      <div className="card">
        <div className="card-title">Signal Generator</div>
        <div className="flex flex-wrap gap-2 mt-3">
          {SIGNAL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetChange(preset.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedPreset === preset.id
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {SIGNAL_PRESETS.find((p) => p.id === selectedPreset)?.description}
        </p>

        {selectedPreset !== 'healthy' && (
          <div className="mt-3">
            <label className="block text-xs text-slate-400 mb-1">
              Severity: {severity.toFixed(2)}
            </label>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={severity}
              onChange={(e) => handleSeverityChange(Number(e.target.value))}
              className="w-full accent-sky-500"
            />
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>Mild</span>
              <span>Severe</span>
            </div>
          </div>
        )}

        {/* Signal preview */}
        <div className="mt-4">
          <div className="text-xs text-slate-400 mb-1">Signal Preview ({previewValues.length} samples)</div>
          <SignalWaveform values={previewValues} samplingRate={samplingRate} />
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors ${
          isLoading
            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
            : 'bg-sky-500 hover:bg-sky-400 text-white'
        }`}
      >
        {isLoading ? 'Analyzing...' : 'Run Analysis'}
      </button>
    </div>
  )
}
