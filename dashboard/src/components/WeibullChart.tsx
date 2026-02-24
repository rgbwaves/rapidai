import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'

interface Props {
  beta: number
  eta: number
  currentHours?: number
}

function weibullPDF(t: number, beta: number, eta: number): number {
  if (t <= 0) return 0
  return (beta / eta) * Math.pow(t / eta, beta - 1) * Math.exp(-Math.pow(t / eta, beta))
}

function weibullCDF(t: number, beta: number, eta: number): number {
  if (t <= 0) return 0
  return 1 - Math.exp(-Math.pow(t / eta, beta))
}

function weibullReliability(t: number, beta: number, eta: number): number {
  if (t <= 0) return 1
  return Math.exp(-Math.pow(t / eta, beta))
}

export default function WeibullChart({ beta, eta, currentHours = 0 }: Props) {
  const maxT = eta * 2
  const step = maxT / 100
  const data = []

  for (let t = step; t <= maxT; t += step) {
    data.push({
      t: Math.round(t),
      pdf: weibullPDF(t, beta, eta),
      cdf: weibullCDF(t, beta, eta),
      reliability: weibullReliability(t, beta, eta),
    })
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="t" tick={{ fill: '#94a3b8', fontSize: 10 }} label={{ value: 'Hours', position: 'insideBottom', offset: -5, fill: '#94a3b8' }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          {currentHours > 0 && <ReferenceLine x={currentHours} stroke="#f97316" strokeDasharray="5 5" label={{ value: 'Now', fill: '#f97316', fontSize: 10 }} />}
          <Line type="monotone" dataKey="reliability" name="R(t)" stroke="#22c55e" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="cdf" name="F(t)" stroke="#ef4444" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="pdf" name="f(t)" stroke="#38bdf8" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
