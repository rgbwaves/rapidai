"""
RAPID AI Engine — FastAPI Application
Full pipeline: Module 0 → A → B/B+/B++ (parallel) → C → D → E → F
"""
import time
import uuid
import asyncio
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from typing import Optional, List, Dict

import numpy as np

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    # Module 0
    Module0Request, Module0Response,
    SignalInput, ContextInput,
    # Module A
    ModuleARequest, ModuleAResponse, SignalType, Direction,
    # Module B
    ModuleBRequest, ModuleBResponse,
    # Module B+
    ModuleBPlusRequest, ModuleBPlusResponse,
    # Module B++
    ModuleBPPRequest, ModuleBPPResponse,
    # Module C
    ModuleCRequest, ModuleCResponse, BlockInput, TrendClass,
    # Module D
    ModuleDRequest, ModuleDResponse,
    # Module E
    ModuleERequest, ModuleEResponse,
    # Module F
    ModuleFRequest, ModuleFResponse,
    # Orchestrator
    FullAnalysisRequest, FullAnalysisResponse, ModuleTrace,
    SeverityLevel, HealthStage,
)

from .config import classify_severity, TRIAXIAL_PROXY
from .logging_config import configure_logging

from .modules import (
    module0_dataguard,
    moduleA_trend,
    moduleB_initiators,
    moduleBplus_slope,
    moduleBpp_sedl,
    moduleC_fusion,
    moduleD_health,
    moduleE_maintenance,
    moduleF_rul,
)

# Thread pool for running sync module code in parallel
_executor = ThreadPoolExecutor(max_workers=4)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(json_output=True)
    yield
    _executor.shutdown(wait=False)


app = FastAPI(
    title="RAPID AI Engine",
    version="1.0.0",
    description="Physics-grounded condition monitoring for rotating machinery",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Triaxial Helpers ─────────────────────────────────────────

def _extract_triaxial_metrics(
    h_rms: float,
    additional_signals: Optional[List[SignalInput]],
) -> Dict[str, float]:
    """Compute H/V/A RMS values from real signals when available, else proxy."""
    result = {"H": h_rms}
    v_vals = None
    a_vals = None

    if additional_signals:
        for sig in additional_signals:
            direction = sig.direction.value.upper()
            if direction == "V" and sig.values:
                v_vals = sig.values
            elif direction == "A" and sig.values:
                a_vals = sig.values

    if v_vals is not None:
        arr = np.array(v_vals)
        result["V"] = float(np.sqrt(np.mean(arr**2)))
    else:
        result["V"] = h_rms * TRIAXIAL_PROXY["v_from_h"]

    if a_vals is not None:
        arr = np.array(a_vals)
        result["A"] = float(np.sqrt(np.mean(arr**2)))
    else:
        result["A"] = h_rms * TRIAXIAL_PROXY["a_from_h"]

    return result


def _extract_triaxial_spectra(
    h_values: List[float],
    additional_signals: Optional[List[SignalInput]],
) -> Dict[str, List[float]]:
    """Extract raw spectra for H/V/A channels for Module B++."""
    spectra: Dict[str, List[float]] = {
        "H": h_values[:256] if len(h_values) >= 256 else h_values,
        "V": [],
        "A": [],
    }
    if additional_signals:
        for sig in additional_signals:
            direction = sig.direction.value.upper()
            if direction in ("V", "A") and sig.values:
                vals = sig.values[:256] if len(sig.values) >= 256 else sig.values
                spectra[direction] = vals
    return spectra


def _extract_temperature(context: Optional[ContextInput]) -> float:
    """Return temperature from context if available, 0.0 otherwise."""
    if context and context.temperature_c is not None:
        return context.temperature_c
    return 0.0


# ─── Health Check ──────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "engine": "RAPID AI", "version": "1.0.0"}


# ─── Individual Module Endpoints ──────────────────────────────

@app.post("/rapid-ai/module0", response_model=Module0Response)
def run_module0(request: Module0Request):
    return module0_dataguard.run(request)


@app.post("/rapid-ai/moduleA", response_model=ModuleAResponse)
def run_moduleA(request: ModuleARequest):
    return moduleA_trend.run(request)


@app.post("/rapid-ai/moduleB", response_model=ModuleBResponse)
def run_moduleB(request: ModuleBRequest):
    return moduleB_initiators.run(request)


@app.post("/rapid-ai/moduleBplus", response_model=ModuleBPlusResponse)
def run_moduleBplus(request: ModuleBPlusRequest):
    return moduleBplus_slope.run(request)


@app.post("/rapid-ai/moduleBpp", response_model=ModuleBPPResponse)
def run_moduleBpp(request: ModuleBPPRequest):
    return moduleBpp_sedl.run(request)


@app.post("/rapid-ai/moduleC", response_model=ModuleCResponse)
def run_moduleC(request: ModuleCRequest):
    return moduleC_fusion.run(request)


@app.post("/rapid-ai/moduleD", response_model=ModuleDResponse)
def run_moduleD(request: ModuleDRequest):
    return moduleD_health.run(request)


@app.post("/rapid-ai/moduleE", response_model=ModuleEResponse)
def run_moduleE(request: ModuleERequest):
    return moduleE_maintenance.run(request)


@app.post("/rapid-ai/moduleF", response_model=ModuleFResponse)
def run_moduleF(request: ModuleFRequest):
    return moduleF_rul.run(request)


# ─── Full Pipeline Orchestrator ───────────────────────────────

@app.post("/rapid-ai/evaluate", response_model=FullAnalysisResponse)
async def evaluate(request: FullAnalysisRequest):
    """
    Run the entire RAPID AI pipeline:
    Module 0 → A → (B ∥ B+ ∥ B++) → C → D → E → F

    B, B+, B++ run in parallel.
    If Module 0 blocks, pipeline aborts early.
    """
    t0 = time.perf_counter()
    trace_id = request.trace_id or str(uuid.uuid4())

    # ── Input validation ──
    if request.failure_threshold <= 0:
        raise HTTPException(status_code=400, detail="failure_threshold must be positive")
    if not request.signal.values:
        raise HTTPException(status_code=400, detail="signal.values cannot be empty")
    if request.criticality < 0 or request.criticality > 1:
        raise HTTPException(status_code=400, detail="criticality must be between 0 and 1")

    trace = ModuleTrace()
    loop = asyncio.get_event_loop()

    # ────── Module 0: Data Guard ──────
    m0_req = Module0Request(
        schema_version=request.schema_version,
        trace_id=trace_id,
        asset_id=request.asset_id,
        timestamp_utc=request.timestamp_utc,
        signal=request.signal,
        context=request.context,
    )
    m0_resp = await loop.run_in_executor(_executor, module0_dataguard.run, m0_req)
    trace.module0 = m0_resp

    if m0_resp.block:
        # Pipeline aborted — data quality insufficient
        elapsed = (time.perf_counter() - t0) * 1000
        return FullAnalysisResponse(
            schema_version=request.schema_version,
            trace_id=trace_id,
            asset_id=request.asset_id,
            final_severity_level=SeverityLevel.normal,
            final_severity_score=0.0,
            confidence=0.0,
            health_stage=HealthStage.Blocked,
            recommended_action="Fix data quality issues",
            recommended_window="N/A",
            module_trace=trace,
            execution_time_ms=round(elapsed, 2),
        )

    quality = m0_resp.quality_score

    # ────── Module A: Trend Engine ──────
    mA_req = ModuleARequest(
        asset_id=request.asset_id,
        machine_type=request.machine_type,
        signal_type=request.signal.signal_type,
        direction=request.signal.direction,
        sampling_rate_hz=request.signal.sampling_rate_hz,
        values=request.signal.values,
        baseline=None,
        context=request.context,
    )
    mA_resp = await loop.run_in_executor(_executor, moduleA_trend.run, mA_req)
    trace.moduleA = mA_resp

    # ────── B / B+ / B++ in Parallel ──────
    # Module B request — use real triaxial data when available
    triaxial = _extract_triaxial_metrics(mA_resp.overall_rms, request.additional_signals)
    mB_req = ModuleBRequest(
        asset_id=request.asset_id,
        component=request.component,
        metrics={
            **triaxial,
            "kurtosis": mA_resp.kurtosis,
            "crest_factor": mA_resp.crest_factor,
            "temperature": _extract_temperature(request.context),
        },
    )

    # Module B+ request (needs historical data)
    hist_ts = request.historical_timestamps or []
    hist_vals = request.historical_values or []
    mBp_req = ModuleBPlusRequest(
        asset_id=request.asset_id,
        timestamps=hist_ts,
        values=hist_vals,
    )

    # Module B++ request (needs spectra — derive from signal)
    mBpp_req = ModuleBPPRequest(
        asset_id=request.asset_id,
        spectra=_extract_triaxial_spectra(request.signal.values, request.additional_signals),
    )

    # Run in parallel
    mB_future = loop.run_in_executor(_executor, moduleB_initiators.run, mB_req)
    mBp_future = loop.run_in_executor(_executor, moduleBplus_slope.run, mBp_req)
    mBpp_future = loop.run_in_executor(_executor, moduleBpp_sedl.run, mBpp_req)

    mB_resp, mBp_resp, mBpp_resp = await asyncio.gather(
        mB_future, mBp_future, mBpp_future
    )
    trace.moduleB = mB_resp
    trace.moduleBplus = mBp_resp
    trace.moduleBpp = mBpp_resp

    # ────── Module C: Fusion ──────
    # Build block input from B / B+ / B++ results
    b_match = mB_resp.confidence if mB_resp.confidence else 0.0
    bp_trend = mBp_resp.trend_class
    bp_severity = mBp_resp.severity_score
    bpp_si = mBpp_resp.SI

    block_input = BlockInput(
        B_match_score=b_match,
        Bplus_trend_class=bp_trend,
        Bplus_confidence=bp_severity,
        process_correlation=0.0,
    )

    mC_req = ModuleCRequest(
        system_type=request.system_type,
        blocks={request.component: block_input},
        stability_state=mBpp_resp.stability_state,
    )
    mC_resp = await loop.run_in_executor(_executor, moduleC_fusion.run, mC_req)
    trace.moduleC = mC_resp

    # ────── Module D: Health Stage ──────
    mD_req = ModuleDRequest(
        SSI=mC_resp.SSI,
        SSI_slope=mBp_resp.slope,
    )
    mD_resp = await loop.run_in_executor(_executor, moduleD_health.run, mD_req)
    trace.moduleD = mD_resp

    # ────── Effective Severity & Confidence ──────
    # S_eff = S_fusion × Q_data
    s_fusion = mA_resp.severity_score
    s_eff = s_fusion * quality

    # C_final = Q_data × (1 − ∏(1 − C_i))
    c_values = [bp_severity, bpp_si, b_match]
    prod_1_minus = 1.0
    for c in c_values:
        prod_1_minus *= (1.0 - min(1.0, max(0.0, c)))
    c_final = quality * (1.0 - prod_1_minus)

    # ────── Module E: Maintenance Plan ──────
    diagnosis = ""
    if mB_resp.matched_rules:
        diagnosis = mB_resp.matched_rules[0].diagnosis

    mE_req = ModuleERequest(
        asset_id=request.asset_id,
        severity_score=s_eff,
        confidence=c_final,
        criticality=request.criticality,
        urgency=s_eff,
        safety_flag=(mD_resp.degradation_stage == HealthStage.Critical),
        diagnosis=diagnosis,
        component=request.component,
    )
    mE_resp = await loop.run_in_executor(_executor, moduleE_maintenance.run, mE_req)
    trace.moduleE = mE_resp

    # ────── Module F: RUL & Probability ──────
    mF_req = ModuleFRequest(
        asset_id=request.asset_id,
        severity_score=s_eff,
        confidence=c_final,
        slope_log=mBp_resp.slope,
        slope_change=mBp_resp.slope_change,
        instability_index_NLI=mBp_resp.instability_index,
        criticality=request.criticality,
        current_value=mA_resp.overall_rms,
        failure_threshold=request.failure_threshold,
        component_type=request.component,
        SSI=mC_resp.SSI,
    )
    mF_resp = await loop.run_in_executor(_executor, moduleF_rul.run, mF_req)
    trace.moduleF = mF_resp

    # ────── Final severity level ──────
    final_level = classify_severity(s_eff)

    # Recommended action = best from E, window from F
    rec_action = mD_resp.recommended_action
    if mE_resp.plan_items:
        rec_action = mE_resp.plan_items[0].action_title

    elapsed = (time.perf_counter() - t0) * 1000
    return FullAnalysisResponse(
        schema_version=request.schema_version,
        trace_id=trace_id,
        asset_id=request.asset_id,
        final_severity_level=final_level,
        final_severity_score=round(s_eff, 4),
        confidence=round(c_final, 4),
        health_stage=mD_resp.degradation_stage,
        rul_days=mF_resp.RUL_days,
        risk_index=mF_resp.risk_index,
        recommended_action=rec_action,
        recommended_window=mF_resp.recommended_window,
        reliability_metrics=mF_resp.reliability_metrics,
        module_trace=trace,
        execution_time_ms=round(elapsed, 2),
    )
