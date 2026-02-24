# RAPID AI — Zen Architecture & Production Dashboard Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform RAPID AI from a working prototype into a production-grade condition monitoring platform — clean backend architecture following the Zen of Python, live API-driven dashboard with client-generated payloads.

**Architecture:** Two parallel work streams. Backend: extract shared config, externalize rules to YAML, introduce PipelineContext to eliminate manual wiring, add structured logging and specific exceptions, decompose long functions. Dashboard: replace mock data with live API client, add Request Builder page with signal generator, add signal waveform and pipeline timeline visualizations, refactor ModuleExplorer monolith.

**Tech Stack:** Python 3.13 / FastAPI / Pydantic v2 / structlog / PyYAML | React 18 / TypeScript / Vite / Tailwind CSS / Recharts

---

## Backend Design

### B1. Shared Configuration (`config.py`)

**Problem:** Severity thresholds (0.3/0.5/0.8) duplicated across 5 modules. SSI thresholds duplicated in modules C and D. Weibull coefficients scattered.

**Solution:** Single `rapid_ai_engine/config.py` containing:
- `SEVERITY_THRESHOLDS`: dict mapping SeverityLevel to (min, max) tuples
- `SSI_THRESHOLDS`: dict mapping SystemState to (min, max) tuples
- `WEIBULL_COEFFICIENTS`: alpha_severity, gamma_degradation, R_target
- `SEDL_WEIGHTS`: SE, TE, DE weights
- `classify_severity(score) -> SeverityLevel`: shared classifier function
- `classify_ssi(score) -> SystemState`: shared classifier function

All modules import from config. Remove duplicated constants from modules A, B++, C, D, E.

### B2. Rules Engine — Externalized to YAML

**Problem:** 144 rules hardcoded in Python across modules 0, B, C, E. Can't update without code deploy. No audit trail.

**Solution:**
- `rules/loader.py`: YAML loader with Pydantic validation, startup caching
- `rules/initiators/*.yaml`: One file per component type (afb.yaml, journal.yaml, tpjb.yaml, etc.)
- `rules/dataguard.yaml`: DG_001-DG_016 quality checks
- `rules/block_scores.yaml`: BSR001-BSR007 block score rules
- `rules/actions.yaml`: ACT001-ACT008 action catalog + diagnosis-to-action mapping
- `rules/profiles.yaml`: System type weight profiles (pump_train, gearbox_train, fan_train)

Rule schema validated on load. Rules cached in module-level globals. Existing test behavior preserved.

### B3. PipelineContext — Eliminate Manual Wiring

**Problem:** `main.py` evaluate() manually constructs 9 module requests with magic multipliers (0.85, 0.6). Tight coupling.

**Solution:**
- `PipelineContext` dataclass holding request + all module outputs
- Each module slot populated as pipeline progresses
- Builder methods on context: `context.build_module_b_request()` etc.
- Document or eliminate the V/A proxy multipliers (0.85, 0.6)
- Orchestrator becomes a clean pipeline loop

### B4. Structured Logging (structlog)

**Problem:** Generic `logging.error(f"...")` — not queryable, no structure.

**Solution:**
- Add `structlog` to requirements
- Configure JSON output format
- Each module logs: start, complete (with key metrics), error (with context)
- Pipeline logs: request received, pipeline complete, total timing

### B5. Exception Hierarchy

**Problem:** Bare `except Exception` swallows real bugs.

**Solution:** `rapid_ai_engine/exceptions.py`:
- `RapidAIError(Exception)` — base
- `DataQualityError(RapidAIError)` — Module 0 blocks
- `RuleEvaluationError(RapidAIError)` — rule matching failures
- `PipelineAbortError(RapidAIError)` — pipeline-level failures

Modules raise specific exceptions. Orchestrator catches at pipeline level with structured logging.

### B6. Function Decomposition

**Problem:** `run()` in modules C (70 lines) and F (85 lines) do too much.

**Solution:** Extract to small helpers:
- Module C: `_load_profile()`, `_compute_block_scores()`, `_aggregate_ssi()`, `_apply_gating()`, `_rank_contributions()`
- Module F: `_select_rul_model()`, `_compute_failure_probability()`, `_compute_risk_index()`, `_determine_window()`
- Each helper under 25 lines

### B7. Type-Safe Metrics

**Problem:** Module B uses `metrics: Dict[str, float]` with magic string keys.

**Solution:** Add `TriAxialMetrics` model to schemas:
- Typed fields: h, v, a, kurtosis, crest_factor, temperature
- `.get_ratio(a, b)` method for safe ratio computation
- Replaces dict-based derived metrics in Module B

### B8. Tests Updated

All 111 existing tests must keep passing. New tests for:
- Config module (threshold classification)
- YAML rule loading
- PipelineContext builder methods
- Exception handling paths

---

## Dashboard Design

### D1. API Client Layer

**Replace:** `src/api/mockData.ts` (374 lines of mock data)
**With:**
- `src/api/client.ts` — fetch wrapper with base URL from env, error handling, timeout
- `src/api/evaluate.ts` — `evaluateAsset(payload): Promise<FullAnalysisResponse>`
- `src/api/modules.ts` — individual module endpoint calls (optional)

Base URL configured via `VITE_API_URL` env var, defaults to `http://localhost:8000`.

### D2. Request Builder Page

**New page:** `src/pages/RequestBuilder.tsx`

Sections:
1. **Machine Configuration** — machine type dropdown, component selector, criticality slider (0-1), failure threshold input, operating hours
2. **Signal Configuration** — signal type (velocity/acceleration/displacement), direction (H/V/A), unit (mm/s, g, um), sampling rate
3. **Signal Source** — toggle between:
   - **Upload:** drag-and-drop CSV/JSON with signal values
   - **Generate:** preset selector + parameter sliders
4. **Submit** — builds FullAnalysisRequest, calls API, navigates to results

### D3. Signal Generator

**New utility:** `src/utils/signalGenerator.ts`

Presets:
- `healthy(samplingRate, duration)` — clean sine wave, low noise
- `bearingDefect(samplingRate, duration, severity)` — impulse train at BPFO/BPFI frequencies + noise
- `imbalance(samplingRate, duration, severity)` — 1x dominant with harmonics
- `misalignment(samplingRate, duration, severity)` — 2x dominant, axial component
- `looseness(samplingRate, duration, severity)` — sub-harmonics + broadband
- `custom(params)` — user-defined amplitude, frequencies, noise level

Each returns `number[]` of signal values ready for the API payload.

### D4. Signal Waveform Visualization

**New component:** `src/components/SignalWaveform.tsx`

- Time-domain plot of the submitted signal (Recharts LineChart)
- Shows RMS as horizontal reference line
- Shows peak as annotation
- Downsampled for display if >1000 points

Added to PipelineDashboard results view.

### D5. ModuleExplorer Refactor

**Split 332-line monolith** into:
- `src/components/modules/Module0Tab.tsx`
- `src/components/modules/ModuleATab.tsx`
- `src/components/modules/ModuleBTab.tsx` (with expandable rule match rows)
- `src/components/modules/ModuleBplusTab.tsx`
- `src/components/modules/ModuleBppTab.tsx`
- `src/components/modules/ModuleCTab.tsx`
- `src/components/modules/ModuleDTab.tsx`
- `src/components/modules/ModuleETab.tsx`
- `src/components/modules/ModuleFTab.tsx`

ModuleExplorer becomes a thin tab container importing these.

### D6. Pipeline Execution Timeline

**New component:** `src/components/PipelineTimeline.tsx`

Horizontal bar chart showing each module's execution time (from module_trace). Color-coded by stage (GUARD=blue, SENSE=green, FUSE=yellow, ACT=red). Shows parallel execution of B/B+/B++.

### D7. Confidence Waterfall

**New component:** `src/components/ConfidenceWaterfall.tsx`

Bar chart showing how confidence builds through the pipeline: data_quality → B confidence → B+ confidence → B++ confidence → final fused confidence.

### D8. Routing & State Management

**Updated routing:**
- `/` or `/build` → RequestBuilder (home page)
- `/results` → PipelineDashboard (after analysis)
- `/explore` → ModuleExplorer
- `/reliability` → ReliabilityView

**State:** React Context (`AnalysisContext`) holding:
- `analysisResult: FullAnalysisResponse | null`
- `requestPayload: FullAnalysisRequest | null`
- `isLoading: boolean`
- `error: string | null`

### D9. Loading & Error States

- Skeleton loaders on PipelineDashboard while API responds
- Error boundary with retry button
- Toast notifications for API errors
- Disabled submit button during loading

### D10. Layout Updates

- Sidebar nav updated: Build | Dashboard | Explorer | Reliability
- Remove scenario selector (replaced by Request Builder)
- Add "New Analysis" button in header to return to builder
- Show current asset_id and timestamp in header when viewing results

---

## Execution Strategy

Two parallel work streams:

**Stream 1 — Backend (tasks B1-B8):**
Config extraction → Rules engine → PipelineContext → Logging → Exceptions → Decomposition → Typed metrics → Tests

**Stream 2 — Dashboard (tasks D1-D10):**
API client → Request Builder → Signal generator → Waveform → ModuleExplorer split → Timeline → Waterfall → Routing → States → Layout

Streams are independent — backend changes don't affect dashboard (same API contract). All 111 existing tests must keep passing.
