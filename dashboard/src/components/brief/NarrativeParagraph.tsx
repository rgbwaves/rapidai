/**
 * NarrativeParagraph — the core text element of the AI Brief.
 *
 * Renders report-quality prose with optional sub-label and
 * inline evidence slots rendered as children.
 */

interface Props {
  children: React.ReactNode
  label?: string
  muted?: boolean
}

export default function NarrativeParagraph({ children, label, muted = false }: Props) {
  return (
    <div className="space-y-1">
      {label && (
        <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          {label}
        </span>
      )}
      <p
        className={`text-sm leading-relaxed ${muted ? 'text-slate-400' : 'text-slate-200'}`}
        style={{ lineHeight: '1.75' }}
      >
        {children}
      </p>
    </div>
  )
}
