import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface Props {
  beta: number
  eta: number
  currentHours?: number
}

function hazardRate(t: number, beta: number, eta: number): number {
  if (t <= 0) return 0
  return (beta / eta) * Math.pow(t / eta, beta - 1)
}

export default function HazardRateChart({ beta, eta, currentHours = 0 }: Props) {
  const maxT = eta * 1.5
  const step = maxT / 80
  const data = []

  for (let t = step; t <= maxT; t += step) {
    data.push({
      t: Math.round(t),
      hazard: hazardRate(t, beta, eta),
    })
  }

  return (
    <div className="w-full h-48">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="t" tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
          {currentHours > 0 && <ReferenceLine x={currentHours} stroke="#f97316" strokeDasharray="5 5" label={{ value: 'Now', fill: '#f97316', fontSize: 10 }} />}
          <Line type="monotone" dataKey="hazard" name="h(t)" stroke="#ef4444" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
