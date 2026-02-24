/**
 * ChapterBlock — collapsible report chapter.
 *
 * Each chapter has:
 * - A numbered header with chapter title
 * - A summary line always visible
 * - Expanded content revealed on click
 * - Left border accent color matching the overall report severity
 * - Scroll-triggered fade-in via IntersectionObserver
 */

import { useState, useRef, useEffect } from 'react'

interface Props {
  number: number
  title: string
  summary: string
  accentColor: string
  defaultExpanded?: boolean
  children: React.ReactNode
}

export default function ChapterBlock({
  number,
  title,
  summary,
  accentColor,
  defaultExpanded = false,
  children,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className="rounded-xl border border-slate-700/50 bg-slate-800/60 overflow-hidden"
      style={{
        borderLeftColor: accentColor,
        borderLeftWidth: 3,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.45s ease-out, transform 0.45s ease-out',
      }}
    >
      {/* Chapter header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-4 p-5 text-left group"
        aria-expanded={expanded}
      >
        {/* Chapter number */}
        <span
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
          style={{ backgroundColor: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40` }}
        >
          {number}
        </span>

        {/* Title + summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Chapter {number}
            </span>
            {/* Expand chevron */}
            <span
              className="text-slate-500 group-hover:text-slate-300 transition-all duration-200 flex-shrink-0"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', display: 'block' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </div>
          <div className="text-base font-semibold text-white mt-0.5 leading-snug">{title}</div>
          <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{summary}</p>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-700/40">
          <div className="pt-4 space-y-4">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
