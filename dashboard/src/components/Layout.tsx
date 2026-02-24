import { NavLink } from 'react-router-dom'
import { useAnalysis } from '../context/AnalysisContext'

interface Props {
  children: React.ReactNode
}

const navItems = [
  { to: '/', label: 'New Analysis', icon: '\u26A1' },
  { to: '/results', label: 'Dashboard', icon: '\uD83D\uDCC8' },
  { to: '/modules', label: 'Module Explorer', icon: '\uD83D\uDD2C' },
  { to: '/reliability', label: 'Reliability', icon: '\uD83D\uDCCA' },
]

export default function Layout({ children }: Props) {
  const { result } = useAnalysis()

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-slate-800">
          <h1 className="text-lg font-bold text-white tracking-tight">
            <span className="text-sky-400">RAPID</span> AI
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
            Condition Intelligence Engine
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Current Analysis Info */}
        {result && (
          <div className="p-3 border-t border-slate-800">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest px-3 mb-2">
              Current Analysis
            </p>
            <div className="px-3 space-y-1">
              <div className="text-sm text-white font-medium">{result.asset_id}</div>
              <div className="text-[10px] text-slate-500">{result.health_stage} &mdash; {result.final_severity_level}</div>
              <div className="text-[10px] text-slate-600 font-mono">{result.trace_id}</div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 text-[10px] text-slate-600 space-y-1.5">
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-slate-500 hover:text-sky-400 transition-colors"
          >
            <span>API Docs (Swagger)</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
          <div>LIVE API MODE</div>
          <div>v1.0.0 &mdash; Physics-Grounded</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
