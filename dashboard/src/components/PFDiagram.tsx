interface Props {
  position: number  // 0–1
}

export default function PFDiagram({ position }: Props) {
  const pctPos = Math.min(1, Math.max(0, position)) * 100

  const posColor =
    position < 0.3 ? '#22c55e' :
    position < 0.6 ? '#eab308' :
    position < 0.85 ? '#f97316' : '#ef4444'

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>P (Detectable Fault)</span>
        <span>F (Functional Failure)</span>
      </div>
      <div className="relative h-8 bg-slate-700/50 rounded-full overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 rounded-full"
          style={{ background: 'linear-gradient(to right, #22c55e20, #eab30820, #f9731620, #ef444420)' }}
        />
        {/* Position marker */}
        <div
          className="absolute top-0 h-full w-1 rounded-full transition-all duration-700"
          style={{ left: `${pctPos}%`, backgroundColor: posColor }}
        />
        <div
          className="absolute -top-5 text-[10px] font-bold transition-all duration-700"
          style={{ left: `${pctPos}%`, color: posColor, transform: 'translateX(-50%)' }}
        >
          {(position * 100).toFixed(0)}%
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
        <span>CBM window</span>
        <span>P-F Interval</span>
        <span>Failure</span>
      </div>
    </div>
  )
}
