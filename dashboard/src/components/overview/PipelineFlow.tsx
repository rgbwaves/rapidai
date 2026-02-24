import { useEffect, useRef, useState, useCallback } from 'react'
import type { ModuleTrace } from '../../types/rapid-ai'
import { scoreToColor, healthColor } from '../../utils/colors'

interface Props {
  trace: ModuleTrace
  totalMs: number
  visible: boolean
  onNodeClick?: (moduleId: string) => void
}

// Module definitions with layout metadata
interface ModuleDef {
  id: string
  key: keyof ModuleTrace
  label: string
  stage: string
  col: number
  row: number       // row within column (0-indexed)
  rowSpan?: number  // how many rows this node spans (for centering)
}

const MODULE_DEFS: ModuleDef[] = [
  { id: '0',   key: 'module0',    label: 'GUARD',       stage: '0',   col: 0, row: 0 },
  { id: 'A',   key: 'moduleA',    label: 'SENSE',       stage: 'A',   col: 1, row: 0 },
  { id: 'B',   key: 'moduleB',    label: 'INITIATORS',  stage: 'B',   col: 2, row: 0 },
  { id: 'B+',  key: 'moduleBplus',label: 'SLOPE',       stage: 'B+',  col: 2, row: 1 },
  { id: 'B++', key: 'moduleBpp',  label: 'ENTROPY',     stage: 'B++', col: 2, row: 2 },
  { id: 'C',   key: 'moduleC',    label: 'FUSE',        stage: 'C',   col: 3, row: 0 },
  { id: 'D',   key: 'moduleD',    label: 'HEALTH',      stage: 'D',   col: 3, row: 1 },
  { id: 'E',   key: 'moduleE',    label: 'MAINT.',      stage: 'E',   col: 3, row: 2 },
  { id: 'F',   key: 'moduleF',    label: 'RUL',         stage: 'F',   col: 3, row: 3 },
]

// Connections: [sourceId, targetId]
const CONNECTIONS: [string, string][] = [
  ['0', 'A'],
  ['A', 'B'],
  ['A', 'B+'],
  ['A', 'B++'],
  ['B',   'C'],
  ['B+',  'C'],
  ['B++', 'C'],
  ['C', 'D'],
  ['D', 'E'],
  ['E', 'F'],
]

// Layout constants
const NODE_W = 108
const NODE_H = 72
const COL_GAP = 72
const ROW_GAP = 16
const PAD_X = 16
const PAD_Y = 20

function getModuleSeverity(trace: ModuleTrace, key: keyof ModuleTrace): number {
  const mod = trace[key] as Record<string, unknown> | null
  if (!mod) return 0
  // Extract a severity-like score from each module
  if ('quality_score' in mod) return 1 - (mod.quality_score as number)
  if ('severity_score' in mod) return mod.severity_score as number
  if ('SSI' in mod) return mod.SSI as number
  if ('SI' in mod) return 1 - (mod.SI as number)
  if ('risk_index' in mod) return (mod.risk_index as number) / 100
  return 0
}

function getModuleSubtext(trace: ModuleTrace, def: ModuleDef): string[] {
  const mod = trace[def.key] as Record<string, unknown> | null
  if (!mod) return ['—']
  switch (def.id) {
    case '0': {
      const m = mod as { quality_score: number; block: boolean }
      return [`Q: ${(m.quality_score * 100).toFixed(0)}%`, m.block ? 'BLOCKED' : 'PASS']
    }
    case 'A': {
      const m = mod as { overall_rms: number; kurtosis: number }
      return [`RMS ${m.overall_rms.toFixed(2)}`, `Kurt ${m.kurtosis.toFixed(1)}`]
    }
    case 'B': {
      const m = mod as { num_matches: number; component: string }
      return [`${m.num_matches} matches`, m.component?.toUpperCase() ?? '']
    }
    case 'B+': {
      const m = mod as { trend_class: string; slope: number }
      return [m.trend_class, `slope ${m.slope.toFixed(3)}`]
    }
    case 'B++': {
      const m = mod as { stability_state: string; SI: number }
      return [m.stability_state, `SI ${m.SI.toFixed(2)}`]
    }
    case 'C': {
      const m = mod as { SSI: number; system_state: string }
      return [`SSI ${m.SSI.toFixed(2)}`, m.system_state]
    }
    case 'D': {
      const m = mod as { degradation_stage: string; escalation_level: string }
      return [m.degradation_stage, m.escalation_level]
    }
    case 'E': {
      const m = mod as { total_actions: number }
      return [`${m.total_actions} actions`, '']
    }
    case 'F': {
      const m = mod as { RUL_days: number; risk_index: number }
      return [`RUL ${Math.round(m.RUL_days)}d`, `Risk ${m.risk_index.toFixed(0)}`]
    }
    default: return ['']
  }
}

function getExecTime(trace: ModuleTrace, key: keyof ModuleTrace): number {
  const mod = trace[key] as Record<string, unknown> | null
  if (!mod || !('execution_time_ms' in mod)) return 0
  return mod.execution_time_ms as number
}

/**
 * Computes absolute pixel positions for each node.
 * Returns a map of moduleId -> { x, y } (top-left corner).
 */
function computeLayout(): Map<string, { x: number; y: number }> {
  // Col 3 has 4 rows, col 2 has 3 rows — these set the grid height
  const colRowCounts = [1, 1, 3, 4]
  const colHeights = colRowCounts.map((rows) => rows * NODE_H + (rows - 1) * ROW_GAP)
  const maxHeight = Math.max(...colHeights)

  const positions = new Map<string, { x: number; y: number }>()

  for (const def of MODULE_DEFS) {
    const colX = PAD_X + def.col * (NODE_W + COL_GAP)
    const colRows = colRowCounts[def.col]
    const colHeight = colRows * NODE_H + (colRows - 1) * ROW_GAP
    const colTopOffset = (maxHeight - colHeight) / 2
    const y = PAD_Y + colTopOffset + def.row * (NODE_H + ROW_GAP)
    positions.set(def.id, { x: colX, y })
  }

  return positions
}

const LAYOUT = computeLayout()

// Total SVG dimensions
const SVG_WIDTH = PAD_X * 2 + 4 * NODE_W + 3 * COL_GAP
const SVG_HEIGHT = (() => {
  let max = 0
  for (const [, pos] of LAYOUT) {
    max = Math.max(max, pos.y + NODE_H)
  }
  return max + PAD_Y
})()

// Generate a cubic bezier path between two node centers
function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1
  const cp1x = x1 + dx * 0.5
  const cp2x = x2 - dx * 0.5
  return `M ${x1} ${y1} C ${cp1x} ${y1} ${cp2x} ${y2} ${x2} ${y2}`
}

// Get the right-center point of a node
function nodeRight(id: string): { x: number; y: number } {
  const pos = LAYOUT.get(id)!
  return { x: pos.x + NODE_W, y: pos.y + NODE_H / 2 }
}

// Get the left-center point of a node
function nodeLeft(id: string): { x: number; y: number } {
  const pos = LAYOUT.get(id)!
  return { x: pos.x, y: pos.y + NODE_H / 2 }
}

interface NodeCardProps {
  def: ModuleDef
  trace: ModuleTrace
  mounted: boolean
  mountDelay: number
  isActive?: boolean
  onClick: (id: string) => void
}

function NodeCard({ def, trace, mounted, mountDelay, isActive, onClick }: NodeCardProps) {
  const pos = LAYOUT.get(def.id)
  if (!pos) return null

  const severity = getModuleSeverity(trace, def.key)
  const color = scoreToColor(severity)
  const execMs = getExecTime(trace, def.key)
  const subtext = getModuleSubtext(trace, def)
  const hasData = trace[def.key] !== null

  const isParallel = def.col === 2

  return (
    <foreignObject
      x={pos.x}
      y={pos.y}
      width={NODE_W}
      height={NODE_H}
      style={{
        transition: `opacity 200ms ease ${mountDelay}ms, transform 200ms ease ${mountDelay}ms`,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'scale(1)' : 'scale(0.85)',
        transformOrigin: `${pos.x + NODE_W / 2}px ${pos.y + NODE_H / 2}px`,
      }}
    >
      <button
        className={`
          w-full h-full rounded-lg border text-left overflow-hidden
          transition-all duration-150 focus:outline-none
          focus-visible:ring-2 focus-visible:ring-sky-400/60
          ${isActive
            ? 'bg-sky-500/15 border-sky-500/50'
            : 'bg-slate-800/90 border-slate-700/60 hover:bg-slate-700/70 hover:border-slate-600'
          }
        `}
        style={{
          boxShadow: hasData && severity > 0.5
            ? `0 0 12px 0 ${color}22`
            : undefined,
        }}
        onClick={() => onClick(def.id)}
        aria-label={`Module ${def.id}: ${def.label}`}
        title={`Module ${def.id}: ${def.label} — click to explore`}
      >
        <div className="px-2 py-1.5 flex flex-col h-full">
          {/* Header row */}
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5">
              {/* Status dot */}
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: hasData ? color : '#475569',
                  boxShadow: hasData && severity > 0.5 ? `0 0 5px 0 ${color}` : undefined,
                }}
              />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {def.id}
              </span>
            </div>
            {isParallel && (
              <span className="text-[8px] text-slate-600 font-mono">∥</span>
            )}
          </div>

          {/* Stage label */}
          <div className="text-[10px] font-semibold text-slate-200 truncate leading-tight">
            {def.label}
          </div>

          {/* Data lines */}
          {hasData && subtext.map((line, i) =>
            line ? (
              <div
                key={i}
                className="text-[9px] text-slate-400 truncate leading-tight"
              >
                {line}
              </div>
            ) : null
          )}

          {/* Exec time */}
          {hasData && execMs > 0 && (
            <div className="text-[8px] font-mono text-slate-600 mt-auto">
              {execMs.toFixed(1)}ms
            </div>
          )}
        </div>
      </button>
    </foreignObject>
  )
}

const PARTICLE_DURATION = 900 // ms per connector

/**
 * A single animated particle traveling along a bezier path.
 */
function Particle({
  pathDef,
  color,
  delay,
  mounted,
}: {
  pathDef: string
  color: string
  delay: number
  mounted: boolean
}) {
  const circleRef = useRef<SVGCircleElement>(null)
  const animRef = useRef<Animation | null>(null)
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    if (!mounted) return
    const circle = circleRef.current
    const path = pathRef.current
    if (!circle || !path) return

    // Use Web Animations API with motion path if supported
    const supportsMotionPath = CSS.supports('offset-path', 'path("M0,0")')

    if (supportsMotionPath) {
      const keyframes = [
        { offsetDistance: '0%', opacity: 0 },
        { offsetDistance: '5%', opacity: 1 },
        { offsetDistance: '95%', opacity: 1 },
        { offsetDistance: '100%', opacity: 0 },
      ]

      const timing: KeyframeAnimationOptions = {
        duration: PARTICLE_DURATION,
        delay,
        iterations: Infinity,
        easing: 'ease-in-out',
      }

      animRef.current = circle.animate(keyframes, timing)
    }

    return () => {
      animRef.current?.cancel()
    }
  }, [mounted, delay])

  return (
    <>
      {/* Hidden path element for motion reference */}
      <path ref={pathRef} d={pathDef} fill="none" stroke="none" />
      <circle
        ref={circleRef}
        r={2.5}
        fill={color}
        opacity={0}
        style={{
          offsetPath: `path("${pathDef}")`,
          offsetDistance: '0%',
        } as React.CSSProperties}
      />
    </>
  )
}

/**
 * Pipeline topology visualization rendered as SVG with animated connectors.
 * Nodes light up sequentially on mount, particles flow along connections.
 */
export default function PipelineFlow({ trace, totalMs, visible, onNodeClick }: Props) {
  const [mountedNodes, setMountedNodes] = useState(new Set<string>())
  const [activeNode, setActiveNode] = useState<string | null>(null)

  // Sequential node reveal matching pipeline execution order
  const NODE_REVEAL_ORDER = ['0', 'A', 'B', 'B+', 'B++', 'C', 'D', 'E', 'F']
  const REVEAL_DELAYS: Record<string, number> = {
    '0': 0,
    'A': 80,
    'B': 160,
    'B+': 190,
    'B++': 220,
    'C': 340,
    'D': 420,
    'E': 500,
    'F': 580,
  }

  useEffect(() => {
    if (!visible) return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    if (mediaQuery.matches) {
      setMountedNodes(new Set(NODE_REVEAL_ORDER))
      return
    }

    const timers: ReturnType<typeof setTimeout>[] = []
    for (const id of NODE_REVEAL_ORDER) {
      timers.push(
        setTimeout(() => {
          setMountedNodes((prev) => new Set([...prev, id]))
        }, REVEAL_DELAYS[id])
      )
    }

    return () => timers.forEach(clearTimeout)
  }, [visible])

  const handleNodeClick = useCallback((id: string) => {
    setActiveNode((prev) => (prev === id ? null : id))
    // Map module IDs to ModuleExplorer tab IDs
    const tabMap: Record<string, string> = {
      '0': '0', 'A': 'A', 'B': 'B', 'B+': 'B+', 'B++': 'B++',
      'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F',
    }
    onNodeClick?.(tabMap[id] ?? id)
  }, [onNodeClick])

  // Build connections with severity-colored paths
  const connections = CONNECTIONS.map(([srcId, tgtId]) => {
    const src = nodeRight(srcId)
    const tgt = nodeLeft(tgtId)
    const path = bezierPath(src.x, src.y, tgt.x, tgt.y)
    const srcDef = MODULE_DEFS.find((d) => d.id === srcId)!
    const severity = getModuleSeverity(trace, srcDef.key)
    const color = scoreToColor(severity)
    const connId = `${srcId}-${tgtId}`

    return { srcId, tgtId, path, color, connId }
  })

  return (
    <div
      className={`
        transition-all duration-300
        ${visible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Pipeline Execution
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-600">
          <span className="font-mono text-slate-400">{totalMs.toFixed(1)}ms total</span>
          <span>Click node to explore</span>
        </div>
      </div>

      <div className="card p-4 overflow-x-auto">
        <svg
          width={SVG_WIDTH}
          height={SVG_HEIGHT}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          style={{ minWidth: SVG_WIDTH }}
          role="img"
          aria-label="Pipeline execution flow diagram"
        >
          <defs>
            {/* Animated dash pattern for connectors */}
            <style>{`
              @keyframes dash-march {
                from { stroke-dashoffset: 16; }
                to   { stroke-dashoffset: 0; }
              }
              .connector-line {
                animation: dash-march 0.8s linear infinite;
              }
              @media (prefers-reduced-motion: reduce) {
                .connector-line { animation: none; }
              }
            `}</style>
          </defs>

          {/* Stage labels */}
          {[
            { col: 0, label: 'GUARD' },
            { col: 1, label: 'SENSE' },
            { col: 2, label: 'SENSE ∥' },
            { col: 3, label: 'FUSE → ACT' },
          ].map(({ col, label }) => (
            <text
              key={label}
              x={PAD_X + col * (NODE_W + COL_GAP) + NODE_W / 2}
              y={PAD_Y - 8}
              textAnchor="middle"
              fill="#475569"
              fontSize={9}
              fontFamily="ui-monospace, monospace"
              letterSpacing="0.08em"
            >
              {label}
            </text>
          ))}

          {/* Connector lines */}
          {connections.map(({ connId, path, color, srcId }) => (
            <g key={connId}>
              {/* Track (faint background) */}
              <path
                d={path}
                fill="none"
                stroke="#334155"
                strokeWidth={1.5}
                strokeLinecap="round"
                opacity={0.5}
              />
              {/* Animated foreground */}
              {mountedNodes.has(srcId) && (
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeDasharray="6 6"
                  opacity={0.7}
                  className="connector-line"
                />
              )}
              {/* Particle */}
              {mountedNodes.has(srcId) && (
                <Particle
                  pathDef={path}
                  color={color}
                  delay={REVEAL_DELAYS[srcId] + 200}
                  mounted={visible}
                />
              )}
            </g>
          ))}

          {/* Parallel branch bracket */}
          {mountedNodes.has('A') && (
            <>
              {/* Vertical fork line on left of col 2 */}
              {(['B', 'B+', 'B++'] as const).map((id) => {
                const pos = LAYOUT.get(id)!
                return (
                  <line
                    key={`fork-${id}`}
                    x1={pos.x - 12}
                    y1={pos.y + NODE_H / 2}
                    x2={pos.x}
                    y2={pos.y + NODE_H / 2}
                    stroke="#334155"
                    strokeWidth={1}
                    opacity={0.4}
                  />
                )
              })}
              {/* Bracket */}
              {(() => {
                const topY = LAYOUT.get('B')!.y + NODE_H / 2
                const botY = LAYOUT.get('B++')!.y + NODE_H / 2
                const x = LAYOUT.get('B')!.x - 12
                return (
                  <path
                    d={`M ${x} ${topY} L ${x} ${botY}`}
                    fill="none"
                    stroke="#334155"
                    strokeWidth={1.5}
                    opacity={0.4}
                  />
                )
              })()}
              {/* Parallel label */}
              {(() => {
                const topY = LAYOUT.get('B')!.y + NODE_H / 2
                const botY = LAYOUT.get('B++')!.y + NODE_H / 2
                const midY = (topY + botY) / 2
                const x = LAYOUT.get('B')!.x - 22
                return (
                  <text
                    x={x}
                    y={midY + 4}
                    textAnchor="middle"
                    fill="#475569"
                    fontSize={10}
                    fontFamily="ui-monospace, monospace"
                    transform={`rotate(-90, ${x}, ${midY})`}
                  >
                    parallel
                  </text>
                )
              })()}
            </>
          )}

          {/* Module nodes */}
          {MODULE_DEFS.map((def) => (
            <NodeCard
              key={def.id}
              def={def}
              trace={trace}
              mounted={mountedNodes.has(def.id)}
              mountDelay={REVEAL_DELAYS[def.id]}
              isActive={activeNode === def.id}
              onClick={handleNodeClick}
            />
          ))}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700/40 text-[10px] text-slate-600">
          {[
            { color: '#22c55e', label: 'Normal' },
            { color: '#eab308', label: 'Watch' },
            { color: '#f97316', label: 'Warning' },
            { color: '#ef4444', label: 'Alarm' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: color }}
              />
              {label}
            </span>
          ))}
          <span className="ml-auto flex items-center gap-1.5">
            <span className="inline-block w-4 border-t border-dashed border-slate-500" />
            Data flow
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500">∥</span>
            Parallel branch
          </span>
        </div>
      </div>
    </div>
  )
}
