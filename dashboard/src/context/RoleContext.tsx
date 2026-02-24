import { createContext, useContext, useState, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Role = 'engineer' | 'manager' | 'executive'

export interface RoleConfig {
  id: Role
  label: string
  description: string
  // Navigation — which top-level views are visible
  views: {
    overview: boolean
    brief: boolean
    modules: boolean
    reliability: boolean
    builder: boolean
  }
  // Content detail levels
  display: {
    // Show raw numeric metrics (kurtosis, crest factor, entropy values)
    technicalMetrics: boolean
    // Show per-module breakdown tables
    moduleExplorer: boolean
    // Show raw matched rules table in Module B
    rulesTable: boolean
    // Show signal waveform
    signalWaveform: boolean
    // Show pipeline execution timeline
    pipelineTimeline: boolean
    // Show Weibull reliability engineering page
    reliabilityCharts: boolean
    // Show fleet/multi-asset summary placeholder
    fleetSummary: boolean
    // Hero animations and large display numbers
    heroAnimations: boolean
    // AI insight block
    aiInsight: boolean
    // Action plan (always on)
    actionPlan: boolean
    // Cost/downtime framing on action items
    costFraming: boolean
    // Module trace IDs in action cards
    traceIds: boolean
    // API docs link in footer
    apiDocs: boolean
  }
  // Gauge label mode: 'technical' shows formula names, 'plain' shows English
  gaugeLabels: 'technical' | 'plain'
  // Number of action plan items to show (null = all)
  maxActionItems: number | null
}

// ── Role definitions ─────────────────────────────────────────────────────────

export const ROLE_CONFIGS: Record<Role, RoleConfig> = {
  engineer: {
    id: 'engineer',
    label: 'Engineer',
    description: 'Full technical access — all modules, raw metrics, signal analysis',
    views: {
      overview:    true,
      brief:       true,
      modules:     true,
      reliability: true,
      builder:     true,
    },
    display: {
      technicalMetrics: true,
      moduleExplorer:   true,
      rulesTable:       true,
      signalWaveform:   true,
      pipelineTimeline: true,
      reliabilityCharts: true,
      fleetSummary:     false,
      heroAnimations:   false,
      aiInsight:        true,
      actionPlan:       true,
      costFraming:      false,
      traceIds:         true,
      apiDocs:          true,
    },
    gaugeLabels: 'technical',
    maxActionItems: null,
  },

  manager: {
    id: 'manager',
    label: 'Manager',
    description: 'Operational overview — health, actions, cost framing',
    views: {
      overview:    true,
      brief:       true,
      modules:     false,
      reliability: false,
      builder:     true,
    },
    display: {
      technicalMetrics: false,
      moduleExplorer:   false,
      rulesTable:       false,
      signalWaveform:   false,
      pipelineTimeline: false,
      reliabilityCharts: false,
      fleetSummary:     true,
      heroAnimations:   false,
      aiInsight:        true,
      actionPlan:       true,
      costFraming:      true,
      traceIds:         false,
      apiDocs:          false,
    },
    gaugeLabels: 'plain',
    maxActionItems: 3,
  },

  executive: {
    id: 'executive',
    label: 'Executive',
    description: 'Hero view — key metrics, AI brief, maximum visual impact',
    views: {
      overview:    true,
      brief:       true,
      modules:     false,
      reliability: false,
      builder:     false,
    },
    display: {
      technicalMetrics: false,
      moduleExplorer:   false,
      rulesTable:       false,
      signalWaveform:   false,
      pipelineTimeline: false,
      reliabilityCharts: false,
      fleetSummary:     false,
      heroAnimations:   true,
      aiInsight:        true,
      actionPlan:       true,
      costFraming:      false,
      traceIds:         false,
      apiDocs:          false,
    },
    gaugeLabels: 'plain',
    maxActionItems: 1,
  },
}

// ── Plain-English gauge label map ─────────────────────────────────────────────

export const GAUGE_LABELS_PLAIN: Record<string, string> = {
  Severity:     'Health Risk',
  SSI:          'Stability',
  Confidence:   'Certainty',
  Priority:     'Urgency',
  'Risk Index': 'Risk',
}

// ── Context ───────────────────────────────────────────────────────────────────

interface RoleState {
  role: Role
  config: RoleConfig
  setRole: (role: Role) => void
  canView: (view: keyof RoleConfig['views']) => boolean
  canShow: (feature: keyof RoleConfig['display']) => boolean
  gaugeLabel: (technicalLabel: string) => string
}

const RoleContext = createContext<RoleState | null>(null)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => {
    // Persist role in localStorage so it survives refresh
    const saved = localStorage.getItem('rapid-ai-role')
    if (saved && saved in ROLE_CONFIGS) return saved as Role
    return 'engineer'
  })

  const setRole = useCallback((r: Role) => {
    setRoleState(r)
    localStorage.setItem('rapid-ai-role', r)
  }, [])

  const config = ROLE_CONFIGS[role]

  const canView = useCallback(
    (view: keyof RoleConfig['views']) => config.views[view],
    [config],
  )

  const canShow = useCallback(
    (feature: keyof RoleConfig['display']) => config.display[feature],
    [config],
  )

  const gaugeLabel = useCallback(
    (technicalLabel: string) => {
      if (config.gaugeLabels === 'plain') {
        return GAUGE_LABELS_PLAIN[technicalLabel] ?? technicalLabel
      }
      return technicalLabel
    },
    [config],
  )

  return (
    <RoleContext.Provider value={{ role, config, setRole, canView, canShow, gaugeLabel }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used within RoleProvider')
  return ctx
}
