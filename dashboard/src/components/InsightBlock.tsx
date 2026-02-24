interface Props {
  text: string
  severity: string
}

const borderColors: Record<string, string> = {
  normal: 'border-green-500/40',
  watch: 'border-yellow-500/40',
  warning: 'border-orange-500/40',
  alarm: 'border-red-500/40',
}

export default function InsightBlock({ text, severity }: Props) {
  const border = borderColors[severity] || borderColors.normal

  return (
    <div className={`card border-l-4 ${border}`}>
      <div className="card-title flex items-center gap-2">
        <span className="text-sky-400">AI</span> Insight
      </div>
      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{text}</p>
    </div>
  )
}
