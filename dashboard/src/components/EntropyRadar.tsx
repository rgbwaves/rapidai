import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts'

interface Props {
  SE: number
  TE: number
  DE: number
  SI: number
}

export default function EntropyRadar({ SE, TE, DE, SI }: Props) {
  const data = [
    { axis: 'SE', value: SE, fullMark: 1 },
    { axis: 'TE', value: TE, fullMark: 1 },
    { axis: 'DE', value: DE, fullMark: 1 },
    { axis: 'SI', value: SI, fullMark: 1 },
  ]

  return (
    <div className="w-full h-48">
      <ResponsiveContainer>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <PolarRadiusAxis angle={90} domain={[0, 1]} tick={false} axisLine={false} />
          <Radar name="Entropy" dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.2} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
