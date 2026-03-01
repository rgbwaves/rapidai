import { useNavigate } from 'react-router-dom'
import { useAnalysis } from '../context/AnalysisContext'
import { useMountPhase } from '../hooks/useMountPhase'
import HealthHero from '../components/overview/HealthHero'
import MetricStrip from '../components/overview/MetricStrip'
import PipelineFlow from '../components/overview/PipelineFlow'
import ActionHero from '../components/overview/ActionHero'
import BottomStrip from '../components/overview/BottomStrip'

/**
 * OverviewDashboard — the hero screen of RAPID AI Mission Control.
 *
 * Layout (top to bottom):
 *   1. Hero Band      — breathing health indicator, SSI ring, asset context
 *   2. Metric Strip   — 5 animated metric cards with tooltips
 *   3. Pipeline Flow  — topology graph with sequential node reveal
 *   4. Action Hero    — top-3 prioritized maintenance actions
 *   5. Bottom Strip   — signal thumbnail + quick stats grid
 *
 * Entrance animation: elements appear in staggered sequence over ~1.4s
 * driven by useMountPhase(). Respects prefers-reduced-motion.
 */
export default function OverviewDashboard() {
  const navigate = useNavigate()
  const { result, request, isLoading, error, runAnalysis } = useAnalysis()
  const phase = useMountPhase()

  // Navigate to Module Explorer with a specific tab active
  function handleNodeClick(moduleId: string) {
    // Store the desired tab in sessionStorage so ModuleExplorer can read it
    sessionStorage.setItem('rapidai:explorer:tab', moduleId)
    navigate('/modules')
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-slate-700" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-sky-400 border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-slate-300 font-semibold">Running RAPID AI pipeline</p>
          <p className="text-slate-500 text-xs mt-1">Physics-grounded analysis in progress...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 max-w-md mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <span className="text-red-400 text-lg font-bold">!</span>
        </div>
        <div>
          <div className="text-red-400 text-lg font-bold mb-1">Analysis Failed</div>
          <p className="text-slate-400 text-sm leading-relaxed">{error}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => request && runAnalysis(request)}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-colors"
          >
            New Analysis
          </button>
        </div>
      </div>
    )
  }

  // Empty state
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 max-w-sm mx-auto text-center">
        <div className="w-20 h-20 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            {/* Abstract pipeline icon */}
            <circle cx="6" cy="18" r="4" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="18" cy="18" r="4" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="30" cy="18" r="4" stroke="#94a3b8" strokeWidth="2" />
            <line x1="10" y1="18" x2="14" y2="18" stroke="#334155" strokeWidth="2" strokeDasharray="2 2" />
            <line x1="22" y1="18" x2="26" y2="18" stroke="#334155" strokeWidth="2" strokeDasharray="2 2" />
          </svg>
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg mb-1">No Analysis Yet</h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            Submit a vibration analysis to see health assessment, pipeline execution, and maintenance actions.
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Run Analysis
        </button>
      </div>
    )
  }

  const trace = result.module_trace
  const actionItems = trace.moduleE?.plan_items ?? []

  return (
    <div className="space-y-5 max-w-7xl">
      {/* 1. Hero Band */}
      <HealthHero
        result={result}
        visible={phase >= 1}
      />

      {/* 1.5 Report Summary */}
      {result.report && phase >= 1 && (
        <div className={`transition-all duration-500 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Analysis Summary</div>
            <p className="text-sm text-slate-300 leading-relaxed mb-3">{result.report.summary}</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Likelihood</div>
                <div className="text-lg font-bold text-white">{result.report.likelihood_pct.toFixed(1)}%</div>
                <div className="text-[10px] text-slate-500">{result.report.likelihood_text}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Degradation</div>
                <div className="text-lg font-bold text-white">{result.report.degradation_index.toFixed(2)}</div>
                <div className="text-[10px] text-slate-500">{result.report.degradation_text}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Top Issue</div>
                {result.report.issues.length > 0 ? (
                  <>
                    <div className="text-sm font-semibold text-white">{result.report.issues[0].initiator}</div>
                    <div className="text-[10px] text-slate-500">{result.report.issues[0].confidence_pct}% confidence</div>
                  </>
                ) : (
                  <div className="text-sm text-slate-500">No faults detected</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Metric Strip */}
      <MetricStrip
        result={result}
        visible={phase >= 2}
        onMetricClick={(_id, _ctx) => {
          // Future: open metric detail drawer
        }}
      />

      {/* 3. Pipeline Flow */}
      <PipelineFlow
        trace={trace}
        totalMs={result.execution_time_ms}
        visible={phase >= 3}
        onNodeClick={handleNodeClick}
      />

      {/* 4. Action Summary */}
      <ActionHero
        items={actionItems}
        visible={phase >= 4}
      />

      {/* 5. Bottom Strip */}
      <BottomStrip
        result={result}
        request={request}
        visible={phase >= 5}
      />
    </div>
  )
}
