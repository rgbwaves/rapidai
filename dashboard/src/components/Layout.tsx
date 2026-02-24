import { NavLink } from 'react-router-dom'
import type { Scenario } from '../types/rapid-ai'

interface Props {
  children: React.ReactNode
  scenarios: Scenario[]
  activeScenario: string
  onScenarioChange: (id: string) => void
}

const navItems = [
  { to: '/', label: 'Pipeline Dashboard', icon: '⚡' },
  { to: '/modules', label: 'Module Explorer', icon: '🔬' },
  { to: '/reliability', label: 'Reliability View', icon: '📊' },
]

const scenarioIcons: Record<string, string> = {
  healthy: '🟢',
  degrading: '🟡',
  critical: '🔴',
}

export default function Layout({ children, scenarios, activeScenario, onScenarioChange }: Props) {
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

        {/* Scenario Selector */}
        <div className="p-3 border-t border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest px-3 mb-2">
            Scenario
          </p>
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => onScenarioChange(s.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                activeScenario === s.id
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>{scenarioIcons[s.id] || '⚪'}</span>
              {s.name}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 text-[10px] text-slate-600">
          <div>MOCK MODE</div>
          <div className="mt-1">v1.0.0 — Physics-Grounded</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
