# Dashboard Redesign — Mission Control + AI Storytelling

**Date:** 2026-02-24
**Status:** Implemented
**Approach:** Full rewrite — Mission Control aesthetic (SpaceX/Bloomberg feel) with AI narrative layer

## Design Philosophy

The dashboard showcases RAPID AI's physics-grounded condition intelligence capabilities. Three audiences:
- **Engineers** — full technical access, raw metrics, all modules
- **Managers** — operational overview, actions, cost framing
- **Executives/Investors** — hero metrics, AI brief, maximum visual impact

## Architecture

### Shell Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Command Bar — Asset ID, Preset, Severity slider, Analyze CTA   │
├────────┬─────────────────────────────────────────────────────────┤
│        │                                                         │
│  Side  │  Canvas (routed content)                                │
│  bar   │                                                         │
│        │  • Dashboard (Overview)                                 │
│  Nav   │  • AI Brief (Narrative)                                 │
│  items │  • Module Explorer (Engineering)                        │
│        │  • Reliability (Weibull/Bathtub/P-F)                    │
│        │  • New Analysis (Request Builder)                       │
│        │                                                         │
│  Live  │                                                         │
│  status│                                                         │
│        │                                                         │
│  Role  │                                                         │
│  switch│                                                         │
├────────┴─────────────────────────────────────────────────────────┤
```

### Role-Based View Filtering

| View | Engineer | Manager | Executive |
|------|----------|---------|-----------|
| Dashboard | Full metrics + pipeline | Overview + actions | Hero + key metrics |
| AI Brief | Full 6-chapter | Full 6-chapter | Full 6-chapter |
| Module Explorer | All modules + rules | Hidden | Hidden |
| Reliability | Weibull + Bathtub + P-F | Hidden | Hidden |
| New Analysis | Full builder | Quick builder | Hidden |
| API Docs link | Visible | Hidden | Hidden |

Role persisted in localStorage. Switchable via sidebar dropdown.

## Views

### 1. Overview Dashboard (`/results`)

Hero screen. Layout top to bottom:

1. **Health Hero** — Canvas-rendered SSI arc gauge with breathing animation for alarm states. Health stage label, asset context, execution time.
2. **Metric Strip** — 5 animated metric cards (Severity, SSI, Confidence, RUL, Risk Index) with count-up animation, hover tooltips showing interpretation and thresholds.
3. **Pipeline Flow** — SVG topology graph of the 8-module pipeline. Sequential node reveal animation. Animated dashed connectors with particles. Parallel branch bracket for B/B+/B++. Click node to navigate to Module Explorer.
4. **Action Hero** — Top 3 maintenance actions as hero cards, sorted by priority score, color-coded by urgency window.
5. **Bottom Strip** — Signal waveform thumbnail + 9-cell quick stats grid.

Entrance animation: staggered 5-phase reveal over ~1.25s via `useMountPhase()`.

### 2. AI Brief (`/brief`)

6-chapter intelligence report generated entirely from API response data (no LLM):

1. **Executive Summary** — headline, primary concern, recommended action, confidence statement
2. **What We Found** — data quality, signal profile, fault analysis with inline evidence badges
3. **How It's Trending** — trend classification with arrow indicator, entropy analysis, slope context
4. **System Impact** — SSI with contributor tags, health classification, escalation narrative
5. **Recommended Actions** — prioritized action cards with justification, verification, priority bars
6. **Prognosis** — P-F interval timeline visualization, RUL narrative, Weibull parameters, bathtub phase, Nowlan-Heap pattern

Components: `ChapterBlock` (collapsible, scroll-triggered fade-in), `NarrativeParagraph`, `EvidenceBadge` (3 variants), `TrendArrow`, `SSIContributors`, `RULTimeline`, `MiniBar`, `ActionItem`.

Narrative engine (`utils/narrative.ts`) maps every API field to prose with severity-scaled language intensity.

### 3. Module Explorer (`/modules`)

Existing page — stage-grouped per-module detail view. Future: update to new design tokens.

### 4. Reliability View (`/reliability`)

Existing page — Weibull, Bathtub, P-F charts. Future: update to new design tokens.

### 5. Request Builder (`/`)

Full-featured builder for engineers. Command bar provides quick-fire analysis for all roles.

## Design System

### Typography
- **Sans:** Inter (body, labels, headings)
- **Mono:** JetBrains Mono (data values, trace IDs, code)
- Scale: display-lg/md/sm, heading-lg/md/sm, body-lg/md/sm, label-lg/md/sm, data-lg/md/sm

### Colors
- **Surfaces:** 4-level hierarchy (#020617 → #293548)
- **Severity:** normal (#22c55e) / watch (#eab308) / warning (#f97316) / alarm (#ef4444) + dim/glow variants
- **Health:** healthy/degrading/unstable/critical/blocked
- **Chart:** 6-color palette for data visualization
- **Status:** live/idle/processing/error/warning

### Component Primitives
- `.card` / `.card-elevated` / `.card-glass` — 3-tier card hierarchy
- `.badge` + severity/health variants
- `.btn-primary` / `.btn-ghost` / `.btn-danger` / `.btn-analyze`
- `.nav-item` — sidebar nav with active indicator
- `.cmd-input` / `.cmd-select` — command bar inputs
- `.tab-bar` / `.tab-item` — module tabs
- `.data-table` — engineering data tables
- `.skeleton` — loading shimmer

### Animation Tokens
- Entrance: fade-up, scale-in, fade-in, slide-in-left/right
- Status: pulse-ring, breathe
- Data: gauge-fill, count-up
- Loading: shimmer, scan-line
- All animations respect `prefers-reduced-motion`

### Shared Components
- `RadialGauge` — 270-degree arc with animated fill and glow
- `HealthBadge` — universal status pill for all health/severity/trend states
- `SignalWaveform` — canvas waveform renderer
- `NavIcons` — 15 SVG icon components including RAPID AI brand mark

## Files Created/Modified

### New files (23):
- `src/context/RoleContext.tsx` — Role system
- `src/hooks/useCountUp.ts` — Animated number hook
- `src/hooks/useMountPhase.ts` — Staggered entrance hook
- `src/utils/narrative.ts` — Template narrative engine
- `src/components/icons/NavIcons.tsx` — SVG icon library
- `src/components/overview/HealthHero.tsx` — Canvas SSI gauge
- `src/components/overview/MetricStrip.tsx` — 5-metric animated strip
- `src/components/overview/PipelineFlow.tsx` — SVG pipeline topology
- `src/components/overview/ActionHero.tsx` — Priority action cards
- `src/components/overview/BottomStrip.tsx` — Stats grid + waveform
- `src/components/brief/ChapterBlock.tsx` — Collapsible report chapter
- `src/components/brief/NarrativeParagraph.tsx` — Prose text element
- `src/components/brief/EvidenceBadge.tsx` — Inline evidence pill
- `src/components/brief/TrendArrow.tsx` — Trend indicator
- `src/components/brief/SSIContributors.tsx` — SSI breakdown visual
- `src/components/brief/RULTimeline.tsx` — P-F interval timeline
- `src/components/brief/MiniBar.tsx` — Inline progress bar
- `src/components/brief/ActionItem.tsx` — Narrative action card
- `src/pages/OverviewDashboard.tsx` — Mission Control hero screen
- `src/pages/AIBrief.tsx` — 6-chapter intelligence report

### Modified files (6):
- `src/App.tsx` — Updated routing with OverviewDashboard + AIBrief
- `src/components/Layout.tsx` — Command bar, collapsible sidebar, role switcher, health indicator
- `src/components/RadialGauge.tsx` — Refactored with design tokens
- `src/components/HealthBadge.tsx` — Universal status badge
- `src/index.css` — Complete design system CSS
- `tailwind.config.js` — Extended theme with full token system
