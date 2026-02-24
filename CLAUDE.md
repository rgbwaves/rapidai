# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

RAPID AI is a physics-grounded stability intelligence engine for rotating industrial machinery. It's a commercial REST API that receives vibration/process data and returns health assessments, fault diagnoses, maintenance priorities, RUL estimates, and AI-generated insights. Two components live here:

1. **`rapid_ai_engine/`** — Python/FastAPI backend (the analytical engine)
2. **`dashboard/`** — React/TypeScript frontend (visualization dashboard, currently using mock data)

## Commands

### Backend (FastAPI Engine)

```bash
# Install dependencies
pip install -r rapid_ai_engine/requirements.txt

# Run the API server (two equivalent ways)
python rapid_ai_engine/run_server.py
python -m uvicorn rapid_ai_engine.main:app --host 0.0.0.0 --port 8000 --reload

# Swagger UI at http://localhost:8000/docs
# Health check at http://localhost:8000/health

# Run tests (test directory exists but is currently empty)
python -m pytest rapid_ai_engine/tests/
```

### Dashboard (React/Vite)

```bash
cd dashboard
npm install
npm run dev      # Dev server at http://localhost:5173
npm run build    # tsc && vite build
npm run preview  # Preview production build
```

The Vite dev server proxies `/rapid-ai` and `/health` to `http://localhost:8000`.

## Architecture

### Pipeline: 4-Stage Sequential Processing

The flagship endpoint is `POST /rapid-ai/evaluate` which runs the full pipeline:

```
Module 0 (GUARD) → Module A (SENSE) → [B ∥ B+ ∥ B++] (SENSE, parallel) → C (FUSE) → D (FUSE) → E (ACT) → F (ACT)
```

- **Stage 1 — GUARD:** Module 0 validates data quality. If `block=True`, pipeline aborts early.
- **Stage 2 — SENSE:** Module A extracts features (RMS, peak, kurtosis). Then B (fault pattern matching), B+ (slope/trend), and B++ (entropy/SEDL) run **in parallel** via `ThreadPoolExecutor`.
- **Stage 3 — FUSE:** Module C computes System Stability Index (SSI) via weighted block scores. Module D maps SSI to health stage (Healthy/Degrading/Unstable/Critical).
- **Stage 4 — ACT:** Module E generates prioritized maintenance action plan. Module F computes RUL, failure probability, and Weibull reliability metrics.

### Key Formulas (Cross-Cutting)

- **Effective Severity:** `S_eff = S_fusion × Q_data` (quality-adjusted)
- **Confidence Propagation:** `C_final = Q_data × (1 − ∏(1 − C_i))` where C_i from B, B+, B++
- **Severity Levels:** normal (<0.30), watch (0.30–0.50), warning (0.50–0.80), alarm (≥0.80)
- **SEDL Stability Index:** `SI = 1 − (0.5·SE + 0.3·TE + 0.2·DE)`
- **Module E Priority:** `P = 100 × (0.45·S + 0.25·C + 0.20·K + 0.10·U) × M_safe × R_sp × R_mp`
- **Module F Weibull:** `β_adj = β_base × (1 + 0.8 × S_eff)`, `η_adj = η_base × (1 − 0.6 × SSI)`

### Backend File Structure

- **`main.py`** — FastAPI app, CORS, all route handlers, and the `evaluate()` orchestrator that wires the pipeline
- **`schemas.py`** — All Pydantic models (frozen v1.0 contract): enums, request/response for every module, `FullAnalysisRequest`/`FullAnalysisResponse`
- **`modules/`** — Each module is a single file with a `run(request) -> response` function:
  - `module0_dataguard.py` — 10 data guard checks (DG_001–DG_016), quality scoring via penalty products
  - `moduleA_trend.py` — Signal statistics + severity scoring via logistic/slope
  - `moduleB_initiators.py` — 116 physics-based rules across 12 component types (afb, journal, coupling, gears, etc.). AND-logic on directional ratios
  - `moduleBplus_slope.py` — Log-domain slope regression, trend classification (Stable/Drift/Accelerating/Chaotic/Step)
  - `moduleBpp_sedl.py` — Shannon entropy (spectral, time-domain, directional), stability state rules (SR01–SR05)
  - `moduleC_fusion.py` — Weighted SSI from block scores (BSR001–BSR007), system profiles (pump_train, gearbox_train, fan_train)
  - `moduleD_health.py` — SSI + slope → HealthStage + EscalationLevel
  - `moduleE_maintenance.py` — Priority formula + action catalog (ACT001–ACT008), diagnosis-to-action mapping
  - `moduleF_rul.py` — Three RUL models (linear/accelerating/instability), Weibull reliability (component-specific β/η), bathtub phase, P-F interval
- **`rules/`** — Placeholder for externalized rule data (currently empty)

### Dashboard File Structure

- **React 18 + TypeScript + Vite + Tailwind CSS + Recharts**
- Three pages via react-router-dom: `PipelineDashboard` (main view), `ModuleExplorer` (per-module detail), `ReliabilityView` (Weibull/bathtub/P-F charts)
- Currently driven by **mock data** (`src/api/mockData.ts`) with three scenarios: Healthy, Degrading, Critical
- Types in `src/types/rapid-ai.ts` mirror the backend Pydantic schemas exactly
- Custom Tailwind colors: `rapid-*` (dark theme), `severity-*` (normal/watch/warning/alarm), `health-*` (healthy/degrading/unstable/critical)

### API Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /rapid-ai/evaluate` | **Flagship** — runs full pipeline, returns complete assessment |
| `POST /rapid-ai/module0` through `moduleF` | Individual module endpoints for granular control |
| `GET /health` | Service health check |

### OpenAPI Contract

`RAPID_AI_OpenAPI_v1.yaml` at root — frozen v1.0 API contract. Note: this file predates the current FastAPI implementation and uses slightly different endpoint paths (legacy format). The actual endpoints are defined in `main.py`.

### Domain Knowledge

The `knowledge/` directory contains detailed domain documentation:
- `00_RAPID_AI_System_Overview.md` — Canonical system overview, deployment model, IP boundaries
- `01_GUARD_DataQuality.md` through `04_ACT_MaintenanceAndPrognosis.md` — Stage-by-stage documentation
- `05_Formula_Index.md` — Complete formula reference

## Key Conventions

- All module functions follow the pattern: `def run(request: PydanticModel) -> PydanticModel`
- Schemas are frozen — the `schemas.py` contract should not change without coordinating both backend and frontend types
- Module B's 116 rules are in-code (not externalized) — defined as dicts in builder functions per component type
- The orchestrator uses `asyncio.gather` with `ThreadPoolExecutor` for B/B+/B++ parallelism
- Severity thresholds are consistent everywhere: normal <0.30, watch 0.30–0.50, warning 0.50–0.80, alarm ≥0.80
- Dashboard types (`rapid-ai.ts`) must stay in sync with backend schemas
