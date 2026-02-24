import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'

interface Props {
  values: number[]
  samplingRate?: number
  rms?: number
  className?: string
}

export default function SignalWaveform({ values, samplingRate = 6400, rms, className = '' }: Props) {
  const step = Math.max(1, Math.floor(values.length / 500))
  const data = values
    .filter((_, i) => i % step === 0)
    .map((v, i) => ({
      time: ((i * step) / samplingRate * 1000).toFixed(1),
      value: v,
    }))

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 10 }} label={{ value: 'ms', position: 'insideBottomRight', fill: '#64748b', fontSize: 10 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(v: number) => [v.toFixed(3), 'Amplitude']}
          />
          <Line type="monotone" dataKey="value" stroke="#38bdf8" dot={false} strokeWidth={1} />
          {rms !== undefined && (
            <>
              <ReferenceLine y={rms} stroke="#22c55e" strokeDasharray="5 5" label={{ value: `RMS ${rms.toFixed(2)}`, fill: '#22c55e', fontSize: 10 }} />
              <ReferenceLine y={-rms} stroke="#22c55e" strokeDasharray="5 5" />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
