import { useEffect, useRef } from 'react'
import type { FullAnalysisResponse } from '../../types/rapid-ai'
import { healthColor } from '../../utils/colors'
import { fixed } from '../../utils/formatters'

interface Props {
  result: FullAnalysisResponse
  visible: boolean
}

const healthDescriptions: Record<string, string> = {
  Healthy: 'System operating within normal parameters. Continue scheduled monitoring.',
  Degrading: 'Degradation detected and accelerating. Schedule maintenance within recommended window.',
  Unstable: 'System stability compromised. Initiate corrective action immediately.',
  Critical: 'Imminent failure risk. Take machinery offline and act now.',
  Blocked: 'Data quality insufficient for reliable assessment. Verify sensor inputs.',
}

const healthSubtitles: Record<string, string> = {
  Healthy: 'All systems nominal',
  Degrading: 'Condition deteriorating',
  Unstable: 'Stability compromised',
  Critical: 'Failure imminent',
  Blocked: 'Assessment blocked',
}

/**
 * Hero health indicator — the single most important thing on screen.
 * Large SSI ring with breathing animation, health stage, asset context.
 */
export default function HealthHero({ result, visible }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number | null>(null)
  const phaseRef = useRef(0)

  const { health_stage, asset_id, trace_id, recommended_action } = result
  const ssi = result.module_trace.moduleC?.SSI ?? result.final_severity_score
  const color = healthColor[health_stage] ?? '#94a3b8'
  const isAlarm = health_stage === 'Critical' || health_stage === 'Unstable'

  // Draw the SSI arc ring on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const reducedMotion = mediaQuery.matches
    const size = canvas.width

    function draw(glowIntensity: number) {
      const ctx = canvas!.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, size, size)

      const cx = size / 2
      const cy = size / 2
      const radius = size * 0.38
      const strokeW = size * 0.06
      const startAngle = Math.PI * 0.75
      const endAngle = Math.PI * 0.25
      const sweepAngle = (2 * Math.PI * 1.5)
      const fillAngle = startAngle + sweepAngle * Math.min(ssi, 1)

      // Background track
      ctx.beginPath()
      ctx.arc(cx, cy, radius, startAngle, startAngle + sweepAngle)
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.7)'
      ctx.lineWidth = strokeW
      ctx.lineCap = 'round'
      ctx.stroke()

      // Value arc
      if (ssi > 0) {
        if (isAlarm && glowIntensity > 0) {
          ctx.shadowBlur = 20 * glowIntensity
          ctx.shadowColor = color
        }
        ctx.beginPath()
        ctx.arc(cx, cy, radius, startAngle, fillAngle)
        ctx.strokeStyle = color
        ctx.lineWidth = strokeW
        ctx.lineCap = 'round'
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Outer glow ring for alarm states
      if (isAlarm && glowIntensity > 0) {
        const outerRadius = radius + strokeW * 1.2
        ctx.beginPath()
        ctx.arc(cx, cy, outerRadius, startAngle, fillAngle)
        ctx.strokeStyle = color
        ctx.globalAlpha = 0.15 * glowIntensity
        ctx.lineWidth = strokeW * 2.5
        ctx.lineCap = 'round'
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    }

    if (reducedMotion || !isAlarm) {
      draw(isAlarm ? 0.6 : 0)
      return
    }

    // Breathing pulse loop for alarm/unstable
    const period = 2000
    function animate(timestamp: number) {
      phaseRef.current = timestamp
      const t = (timestamp % period) / period
      const glow = 0.4 + 0.6 * Math.sin(t * Math.PI * 2)
      draw(glow)
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [ssi, color, isAlarm])

  const bgTint: Record<string, string> = {
    Healthy: '',
    Degrading: 'bg-yellow-500/[0.03]',
    Unstable: 'bg-orange-500/[0.05]',
    Critical: 'bg-red-500/[0.07]',
    Blocked: '',
  }

  return (
    <div
      className={`
        relative rounded-2xl border border-slate-700/50 p-6
        bg-slate-800/60 backdrop-blur-sm overflow-hidden
        transition-all duration-500
        ${bgTint[health_stage] ?? ''}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
      style={{ transitionProperty: 'opacity, transform' }}
    >
      {/* Critical scanline overlay */}
      {health_stage === 'Critical' && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(239,68,68,0.3) 2px, rgba(239,68,68,0.3) 4px)',
          }}
        />
      )}

      <div className="flex items-center gap-8">
        {/* SSI Ring */}
        <div className="relative flex-shrink-0">
          <canvas
            ref={canvasRef}
            width={148}
            height={148}
            className="block"
          />
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span
              className="text-3xl font-bold font-mono leading-none tabular-nums"
              style={{ color }}
            >
              {fixed(ssi, 2)}
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">SSI</span>
          </div>
        </div>

        {/* Health status + context */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span
              className="text-3xl font-black tracking-tight uppercase"
              style={{ color }}
            >
              {health_stage}
            </span>
            <span
              className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border"
              style={{
                color,
                borderColor: `${color}40`,
                backgroundColor: `${color}15`,
              }}
            >
              {healthSubtitles[health_stage]}
            </span>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed mb-3 max-w-xl">
            {healthDescriptions[health_stage]}
          </p>

          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-200 font-semibold">{asset_id}</span>
            <span className="text-slate-500">
              {result.module_trace.moduleB?.component
                ? result.module_trace.moduleB.component.toUpperCase() + ' · '
                : ''}
              {result.final_severity_level.toUpperCase()}
            </span>
            <span className="text-slate-600 font-mono hidden sm:block">{trace_id}</span>
          </div>

          <div className="mt-2 text-xs text-slate-400 italic">
            {recommended_action}
          </div>
        </div>

        {/* Execution time badge */}
        <div className="flex-shrink-0 text-right hidden lg:block">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest">Pipeline</div>
          <div className="text-xl font-bold font-mono text-slate-300">
            {result.execution_time_ms.toFixed(1)}
            <span className="text-xs font-normal text-slate-600 ml-0.5">ms</span>
          </div>
          <div className="text-[10px] text-slate-600 mt-1">
            {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  )
}
