import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAnalysis } from '../context/AnalysisContext'
import { useRole, ROLE_CONFIGS, type Role } from '../context/RoleContext'
import { healthColor } from '../utils/colors'
import {
  IconBrandMark,
  IconZap,
  IconActivity,
  IconCpu,
  IconLayers,
  IconBarChart,
  IconChevronLeft,
  IconChevronRight,
  IconSettings,
  IconExternalLink,
  IconUser,
  IconLoader,
  IconRefreshCw,
} from './icons/NavIcons'
import { SIGNAL_PRESETS } from '../utils/signalGenerator'
import type { EvaluateRequest } from '../api/evaluate'

interface Props {
  children: React.ReactNode
}

// ── Nav item config ───────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/',            end: true,  viewKey: 'builder' as const,     label: 'New Analysis',    Icon: IconZap },
  { to: '/results',     end: false, viewKey: 'overview' as const,    label: 'Dashboard',       Icon: IconActivity },
  { to: '/brief',       end: false, viewKey: 'brief' as const,       label: 'AI Brief',        Icon: IconCpu },
  { to: '/modules',     end: false, viewKey: 'modules' as const,     label: 'Module Explorer', Icon: IconLayers },
  { to: '/reliability', end: false, viewKey: 'reliability' as const, label: 'Reliability',     Icon: IconBarChart },
]

// ── Role switcher pill ────────────────────────────────────────────────────────

const ROLE_STYLES: Record<Role, { bg: string; text: string; dot: string }> = {
  engineer:  { bg: 'bg-sky-500/10',    text: 'text-sky-400',    dot: 'bg-sky-400' },
  manager:   { bg: 'bg-violet-500/10', text: 'text-violet-400', dot: 'bg-violet-400' },
  executive: { bg: 'bg-amber-500/10',  text: 'text-amber-400',  dot: 'bg-amber-400' },
}

function RoleSwitcher({ collapsed }: { collapsed: boolean }) {
  const { role, setRole, config } = useRole()
  const [open, setOpen] = useState(false)
  const style = ROLE_STYLES[role]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Switch role — current: ${config.label}`}
        title={`Role: ${config.label}`}
        className={`
          flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg
          ${style.bg} ${style.text}
          hover:brightness-110 transition-all duration-150
          text-left text-xs font-semibold uppercase tracking-wider
          min-h-[44px] cursor-pointer
        `}
      >
        {/* Dot indicator */}
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{config.label}</span>
            <IconSettings size={14} className="flex-shrink-0 opacity-60" />
          </>
        )}
      </button>

      {/* Dropdown — appears above, anchored left */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            className="
              absolute bottom-full left-0 mb-2 z-50 w-64
              bg-slate-800 border border-slate-700/60 rounded-xl
              shadow-float p-2
              animate-scale-in
            "
          >
            <p className="text-label-sm uppercase text-slate-500 px-3 pt-1 pb-2 tracking-wider">
              View mode
            </p>
            {(Object.values(ROLE_CONFIGS)).map((rc) => {
              const s = ROLE_STYLES[rc.id]
              const isActive = rc.id === role
              return (
                <button
                  key={rc.id}
                  onClick={() => { setRole(rc.id); setOpen(false) }}
                  className={`
                    flex flex-col gap-0.5 w-full px-3 py-2.5 rounded-lg text-left
                    transition-colors duration-base
                    ${isActive ? `${s.bg} ${s.text}` : 'text-slate-300 hover:bg-slate-700/60'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                    <span className="font-semibold text-sm">{rc.label}</span>
                    {isActive && (
                      <span className={`ml-auto text-label-sm px-1.5 py-0.5 rounded ${s.bg}`}>
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-label-sm text-slate-500 leading-snug pl-4">
                    {rc.description}
                  </p>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Health pulse indicator ────────────────────────────────────────────────────

function HealthIndicator({ collapsed }: { collapsed: boolean }) {
  const { result } = useAnalysis()
  if (!result) return null

  const stage = result.health_stage
  const color = healthColor[stage] ?? healthColor['Blocked']

  return (
    <div
      className={`
        mx-3 mb-3 p-2.5 rounded-lg border
        transition-all duration-slow
      `}
      style={{
        background: `${color}10`,
        borderColor: `${color}30`,
      }}
      title={`${result.asset_id} — ${stage}`}
    >
      <div className="flex items-center gap-2.5">
        {/* Pulsing dot */}
        <div className="relative flex-shrink-0">
          <span
            className="w-2.5 h-2.5 rounded-full block"
            style={{ backgroundColor: color }}
          />
          <span
            className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-pulse-ring"
            style={{ backgroundColor: color }}
          />
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-label-sm font-semibold truncate" style={{ color }}>
              {stage}
            </div>
            <div className="text-label-sm text-slate-500 truncate">
              {result.asset_id}
            </div>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="mt-2 grid grid-cols-2 gap-1">
          <div className="text-center">
            <div className="text-label-sm text-slate-500">RUL</div>
            <div className="font-mono text-xs text-white">
              {result.rul_days != null ? `${Math.round(result.rul_days)}d` : 'N/A'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-label-sm text-slate-500">SSI</div>
            <div className="font-mono text-xs text-white">
              {((result.module_trace.moduleC?.SSI ?? 0) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Command Bar ───────────────────────────────────────────────────────────────
// Persistent strip at the top — asset ID, preset, severity knob, Analyze CTA.

interface CommandBarProps {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}

function CommandBar({ sidebarCollapsed, onToggleSidebar }: CommandBarProps) {
  const navigate = useNavigate()
  const { isLoading, result, runAnalysis } = useAnalysis()

  // Quick-fire values (simplified state for command bar)
  const [assetId, setAssetId] = useState(result?.asset_id ?? 'PUMP-001')
  const [presetId, setPresetId] = useState('healthy')
  const [severity, setSeverity] = useState(0.5)

  async function handleAnalyze() {
    const preset = SIGNAL_PRESETS.find((p) => p.id === presetId)
    if (!preset) return

    // Generate values
    let values: number[]
    if (presetId === 'healthy') {
      values = (preset.generate as () => number[])()
    } else {
      values = (preset.generate as (p: Record<string, unknown>, s: number) => number[])({}, severity)
    }

    const req: EvaluateRequest = {
      schema_version: '1.0',
      asset_id: assetId || 'PUMP-001',
      timestamp_utc: new Date().toISOString(),
      machine_type: 'pump_train_horizontal',
      system_type: 'pump_train_horizontal',
      signal: {
        signal_type: 'velocity',
        direction: 'H',
        unit: 'mm/s',
        sampling_rate_hz: 6400,
        values,
      },
      context: { rpm: 1800, temperature_c: 45 },
      component: 'afb',
      historical_timestamps: [],
      historical_values: [],
      criticality: 0.6,
      failure_threshold: 11.2,
    }

    await runAnalysis(req)
    navigate('/results')
  }

  return (
    <div className="command-bar gap-3">
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="
          w-8 h-8 flex items-center justify-center rounded-lg
          text-slate-400 hover:text-slate-200 hover:bg-slate-700/50
          transition-colors duration-base flex-shrink-0
        "
      >
        {sidebarCollapsed
          ? <IconChevronRight size={16} />
          : <IconChevronLeft size={16} />
        }
      </button>

      {/* Separator */}
      <div className="w-px h-5 bg-slate-700/60 flex-shrink-0" />

      {/* Asset ID */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <label htmlFor="cmd-asset-id" className="text-label-md text-slate-500 uppercase tracking-wider whitespace-nowrap">
          Asset
        </label>
        <input
          id="cmd-asset-id"
          type="text"
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          placeholder="PUMP-001"
          className="cmd-input w-28"
          aria-label="Asset ID"
        />
      </div>

      {/* Separator */}
      <div className="w-px h-5 bg-slate-700/60 flex-shrink-0" />

      {/* Signal preset */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <label htmlFor="cmd-preset" className="text-label-md text-slate-500 uppercase tracking-wider whitespace-nowrap">
          Signal
        </label>
        <select
          id="cmd-preset"
          value={presetId}
          onChange={(e) => setPresetId(e.target.value)}
          className="cmd-select w-36"
          aria-label="Signal preset"
        >
          {SIGNAL_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Severity knob — only visible for non-healthy presets */}
      {presetId !== 'healthy' && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <label htmlFor="cmd-severity" className="text-label-md text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Sev
          </label>
          {/* Visual knob display */}
          <span
            className="text-xs font-mono font-bold tabular-nums"
            style={{
              color: severity >= 0.8 ? '#ef4444'
                   : severity >= 0.5 ? '#f97316'
                   : severity >= 0.3 ? '#eab308'
                   : '#22c55e',
            }}
          >
            {(severity * 100).toFixed(0)}%
          </span>
          <input
            id="cmd-severity"
            type="range"
            min={0.1}
            max={1.0}
            step={0.05}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-20 accent-sky-500"
            aria-label="Severity level"
          />
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Processing indicator when live result exists */}
      {result && !isLoading && (
        <div className="flex items-center gap-1.5 text-label-md text-slate-500 flex-shrink-0">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: healthColor[result.health_stage] ?? '#94a3b8' }}
          />
          <span className="font-mono">{result.execution_time_ms.toFixed(0)}ms</span>
        </div>
      )}

      {/* Analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={isLoading}
        aria-label={isLoading ? 'Analysis running' : 'Run analysis'}
        className={`btn-analyze flex-shrink-0 ${isLoading ? 'loading' : ''}`}
      >
        {isLoading ? (
          <>
            <IconLoader size={14} className="animate-spin" />
            <span>Analyzing</span>
          </>
        ) : (
          <>
            <IconRefreshCw size={14} />
            <span>Analyze</span>
          </>
        )}
      </button>
    </div>
  )
}

// ── Main Layout ───────────────────────────────────────────────────────────────

export default function Layout({ children }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const { canView, canShow } = useRole()

  return (
    <div className="app-shell flex-col">
      {/* Command Bar — always visible across full width */}
      <CommandBar
        sidebarCollapsed={collapsed}
        onToggleSidebar={() => setCollapsed((v) => !v)}
      />

      {/* Below command bar: sidebar + canvas */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside
          className={`sidebar ${collapsed ? 'collapsed' : ''}`}
          aria-label="Main navigation"
        >
          {/* Logo */}
          <div
            className={`
              flex items-center gap-3 px-4 py-4 flex-shrink-0
              border-b border-slate-800/50
              transition-all duration-view
            `}
          >
            <IconBrandMark
              size={22}
              className="text-sky-400 flex-shrink-0"
            />
            {!collapsed && (
              <div className="overflow-hidden">
                <div className="text-sm font-bold text-white tracking-tight leading-none">
                  <span className="text-sky-400">RAPID</span> AI
                </div>
                <div className="text-label-sm text-slate-500 tracking-widest mt-0.5 truncate">
                  Condition Intelligence
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto" aria-label="Primary navigation">
            {NAV_ITEMS.map(({ to, end, viewKey, label, Icon: NavIcon }) => {
              // Hide nav items the current role cannot see
              if (!canView(viewKey)) return null
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'active' : ''}`
                  }
                  title={collapsed ? label : undefined}
                  aria-label={label}
                >
                  <NavIcon className="nav-icon flex-shrink-0" size={18} />
                  <span
                    className={`nav-label ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}
                  >
                    {label}
                  </span>
                </NavLink>
              )
            })}
          </nav>

          {/* Live status panel */}
          <HealthIndicator collapsed={collapsed} />

          {/* Role switcher */}
          <div className="px-2 pb-2 border-t border-slate-800/50 pt-2 flex-shrink-0">
            <RoleSwitcher collapsed={collapsed} />
          </div>

          {/* Footer links — engineer-only */}
          {!collapsed && canShow('apiDocs') && (
            <div className="px-4 pb-4 text-label-sm text-slate-600 space-y-1.5 flex-shrink-0">
              <a
                href="/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-slate-500 hover:text-sky-400 transition-colors"
              >
                <IconExternalLink size={11} />
                <span>Swagger API Docs</span>
              </a>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-breathe" />
                <span>LIVE API</span>
              </div>
              <div className="text-slate-700">v1.0.0 · Physics-Grounded</div>
            </div>
          )}
        </aside>

        {/* ── Canvas ───────────────────────────────────────────────────── */}
        <main
          className="canvas"
          id="main-content"
          tabIndex={-1}
          aria-label="Main content"
        >
          <div className="max-w-7xl mx-auto page-content">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
