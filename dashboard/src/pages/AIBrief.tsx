import { useNavigate } from 'react-router-dom'
import { useAnalysis } from '../context/AnalysisContext'
import {
  buildExecutiveSummary,
  buildFindingsSummary,
  buildTrendingSummary,
  buildSystemImpactSummary,
  buildPrognosisSummary,
  severityColor,
  confidenceQualifier,
} from '../utils/narrative'
import { healthColor } from '../utils/colors'
import ChapterBlock from '../components/brief/ChapterBlock'
import NarrativeParagraph from '../components/brief/NarrativeParagraph'
import EvidenceBadge from '../components/brief/EvidenceBadge'
import TrendArrow from '../components/brief/TrendArrow'
import SSIContributors from '../components/brief/SSIContributors'
import RULTimeline from '../components/brief/RULTimeline'
import MiniBar from '../components/brief/MiniBar'
import ActionItem from '../components/brief/ActionItem'
import type { TrendClass, StabilityState } from '../types/rapid-ai'

export default function AIBrief() {
  const navigate = useNavigate()
  const { result, isLoading, error, request, runAnalysis } = useAnalysis()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-slate-700" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-sky-400 border-t-transparent animate-spin" />
        </div>
        <p className="text-slate-300 font-semibold">Generating intelligence brief...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 max-w-md mx-auto text-center">
        <div className="text-red-400 text-lg font-bold mb-1">Analysis Failed</div>
        <p className="text-slate-400 text-sm">{error}</p>
        <div className="flex gap-3">
          <button onClick={() => request && runAnalysis(request)} className="btn-primary">Retry</button>
          <button onClick={() => navigate('/')} className="btn-ghost">New Analysis</button>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 max-w-sm mx-auto text-center">
        <div className="w-20 h-20 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5" aria-hidden>
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
            <rect x="9" y="9" width="6" height="6" />
            <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
            <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
          </svg>
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg mb-1">No Analysis Yet</h3>
          <p className="text-slate-500 text-sm leading-relaxed">
            Run an analysis to generate an AI intelligence brief.
          </p>
        </div>
        <button onClick={() => navigate('/')} className="btn-primary">Run Analysis</button>
      </div>
    )
  }

  // Build all narrative chapters
  const exec = buildExecutiveSummary(result)
  const findings = buildFindingsSummary(result)
  const trending = buildTrendingSummary(result)
  const impact = buildSystemImpactSummary(result)
  const prognosis = buildPrognosisSummary(result)

  const accent = healthColor[result.health_stage] ?? '#94a3b8'
  const sevColor = severityColor[result.final_severity_level] ?? '#94a3b8'
  const actionItems = result.module_trace.moduleE?.plan_items ?? []

  const reliability = result.reliability_metrics ?? result.module_trace.moduleF?.reliability_metrics ?? null

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Report header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            RAPID AI Intelligence Brief
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${accent}20`, color: accent }}
          >
            {result.health_stage}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white leading-snug">{exec.headline}</h1>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{result.asset_id}</span>
          <span className="text-slate-700">|</span>
          <span>{new Date().toLocaleString()}</span>
          <span className="text-slate-700">|</span>
          <span className="font-mono">{result.trace_id}</span>
        </div>
      </div>

      {/* Chapter 1: Executive Summary */}
      <ChapterBlock
        number={1}
        title="Executive Summary"
        summary={exec.headline}
        accentColor={accent}
        defaultExpanded={true}
      >
        <NarrativeParagraph label="Primary Concern">
          {exec.primaryConcern}
        </NarrativeParagraph>
        <NarrativeParagraph label="Recommended Action">
          {exec.recommendedAction}{' '}
          <EvidenceBadge label="Window" value={exec.timeframe} color={accent} variant="chip" />
        </NarrativeParagraph>
        <NarrativeParagraph label="Confidence" muted>
          {exec.confidenceStatement}{' '}
          <MiniBar value={result.confidence} label={confidenceQualifier(result.confidence)} width={60} color="#38bdf8" />
        </NarrativeParagraph>
      </ChapterBlock>

      {/* Chapter 2: What We Found */}
      <ChapterBlock
        number={2}
        title="What We Found"
        summary={findings.hasFaults ? 'Fault patterns detected in signal analysis' : 'No fault patterns matched'}
        accentColor={sevColor}
        defaultExpanded={true}
      >
        <NarrativeParagraph label="Data Quality">
          {findings.dataQuality}{' '}
          <MiniBar
            value={result.module_trace.module0?.quality_score ?? 1}
            label="Quality"
            width={60}
          />
        </NarrativeParagraph>
        <NarrativeParagraph label="Signal Profile">
          {findings.signalProfile}
        </NarrativeParagraph>
        <NarrativeParagraph label="Fault Analysis">
          {findings.faultFinding}
        </NarrativeParagraph>
      </ChapterBlock>

      {/* Chapter 3: How It's Trending */}
      <ChapterBlock
        number={3}
        title="How It's Trending"
        summary={trending.trendStatement}
        accentColor={accent}
      >
        <div className="flex items-center gap-3 mb-2">
          <TrendArrow trend={trending.trendClass as TrendClass} />
          <EvidenceBadge
            label="Stability"
            value={trending.stabilityState}
            color={accent}
            variant="chip"
          />
        </div>
        <NarrativeParagraph label="Trend Analysis">
          {trending.trendStatement} {trending.slopeContext}
        </NarrativeParagraph>
        <NarrativeParagraph label="Entropy Analysis">
          {trending.stabilityStatement}
        </NarrativeParagraph>
      </ChapterBlock>

      {/* Chapter 4: System Impact */}
      <ChapterBlock
        number={4}
        title="System Impact"
        summary={`SSI: ${(impact.ssi * 100).toFixed(0)}% — ${impact.systemState}`}
        accentColor={accent}
      >
        <SSIContributors
          ssi={impact.ssi}
          contributors={impact.topContributors}
          systemState={impact.systemState}
        />
        <NarrativeParagraph label="Health Classification">
          {impact.healthStatement}
        </NarrativeParagraph>
        {impact.escalationStatement && (
          <NarrativeParagraph label="Escalation" muted>
            {impact.escalationStatement}
          </NarrativeParagraph>
        )}
      </ChapterBlock>

      {/* Chapter 5: Recommended Actions */}
      {actionItems.length > 0 && (
        <ChapterBlock
          number={5}
          title="Recommended Actions"
          summary={`${actionItems.length} prioritized action${actionItems.length !== 1 ? 's' : ''}`}
          accentColor={accent}
          defaultExpanded={true}
        >
          <div className="space-y-3">
            {actionItems
              .sort((a, b) => b.priority_score - a.priority_score)
              .map((item) => (
                <ActionItem key={item.action_id} item={item} accentColor={accent} />
              ))}
          </div>
        </ChapterBlock>
      )}

      {/* Chapter 6: Prognosis */}
      <ChapterBlock
        number={6}
        title="Prognosis"
        summary={prognosis.overallOutlook}
        accentColor={accent}
      >
        {reliability && (
          <RULTimeline
            pfPosition={reliability.pf_interval_position}
            rulDays={result.rul_days}
            bathtubPhase={reliability.bathtub_phase}
          />
        )}
        <NarrativeParagraph label="Remaining Useful Life">
          {prognosis.rulStatement}
        </NarrativeParagraph>
        <NarrativeParagraph label="P-F Interval">
          {prognosis.pfStatement}
        </NarrativeParagraph>
        <NarrativeParagraph label="Reliability Model" muted>
          {prognosis.weibullStatement}
        </NarrativeParagraph>
        {prognosis.bathtubStatement && (
          <NarrativeParagraph label="Lifecycle Position" muted>
            {prognosis.bathtubStatement}
          </NarrativeParagraph>
        )}
        {prognosis.nowlanStatement && (
          <NarrativeParagraph label="Reliability Pattern" muted>
            {prognosis.nowlanStatement}
          </NarrativeParagraph>
        )}
      </ChapterBlock>

      {/* Report footer */}
      <div className="border-t border-slate-700/40 pt-4 pb-8 text-center text-xs text-slate-600">
        <p>Generated by RAPID AI Condition Intelligence Engine v{result.schema_version}</p>
        <p className="mt-0.5">
          Pipeline execution: {result.execution_time_ms.toFixed(1)}ms | Confidence: {(result.confidence * 100).toFixed(1)}%
        </p>
      </div>
    </div>
  )
}
