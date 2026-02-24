import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { BathtubPhase } from '../types/rapid-ai'

interface Props {
  currentPhase: BathtubPhase
  beta: number
}

export default function BathtubCurve({ currentPhase, beta }: Props) {
  // Generate bathtub curve data
  const data = []
  for (let t = 0; t <= 100; t++) {
    // Composite hazard: infant + random + wearout
    const infant = 2.0 * Math.exp(-0.08 * t)
    const random = 0.3
    const wearout = t > 50 ? 0.005 * Math.pow(t - 50, 1.5) : 0
    const hazard = infant + random + wearout

    let phase: string
    if (t < 20) phase = 'infant_mortality'
    else if (t < 65) phase = 'useful_life'
    else phase = 'wear_out'

    data.push({ t, hazard: Math.round(hazard * 100) / 100, phase })
  }

  // Find current position indicator
  const phasePositions: Record<BathtubPhase, number> = {
    infant_mortality: 10,
    useful_life: 42,
    wear_out: 80,
  }
  const currentPos = phasePositions[currentPhase]

  return (
    <div className="w-full h-48">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="t" tick={{ fill: '#94a3b8', fontSize: 10 }} label={{ value: 'Life %', position: 'insideBottom', offset: -5, fill: '#94a3b8' }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} label={{ value: 'h(t)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
          <defs>
            <linearGradient id="bathtubGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="20%" stopColor="#f97316" />
              <stop offset="25%" stopColor="#22c55e" />
              <stop offset="60%" stopColor="#22c55e" />
              <stop offset="70%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="hazard" stroke="url(#bathtubGrad)" fill="url(#bathtubGrad)" fillOpacity={0.15} strokeWidth={2} />
          <ReferenceLine x={currentPos} stroke="#38bdf8" strokeWidth={2} strokeDasharray="5 5" label={{ value: `NOW (β=${beta.toFixed(2)})`, fill: '#38bdf8', fontSize: 10, position: 'top' }} />
          <ReferenceLine x={20} stroke="#334155" strokeDasharray="2 2" />
          <ReferenceLine x={65} stroke="#334155" strokeDasharray="2 2" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
