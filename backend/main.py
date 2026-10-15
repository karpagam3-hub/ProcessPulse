"""
ProcessPulse - Manufacturing Process Intelligence & Improvement System
Backend Entrypoint & API Endpoints
"""

import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from database import get_db, init_db
from schemas import (
    SOPDefinition,
    ExecutionRecord,
    SummaryMetrics,
    MachineAnalysisItem,
    ShiftAnalysisItem,
    PatternAnalysisResponse,
    ImpactAnalysisResponse,
    InvestigationRequest,
    InvestigationResponse,
    ValidationSubmission,
    ValidationRecord,
    ProcessMemoryMatch,
)
from services.dataset import get_dataset, get_sop_definition
from services.analytics import (
    calculate_summary_metrics,
    calculate_machine_analysis,
    calculate_shift_analysis,
    calculate_pattern_analysis,
    calculate_impact_analysis,
)
from services.process_memory import (
    save_validation_decision,
    get_all_decisions,
    match_process_memory,
)
from services.investigation import generate_investigation

# Load environment configuration
load_dotenv()

# Initialize SQLite database
init_db()

app = FastAPI(
    title="ProcessPulse API",
    description="Manufacturing Process Intelligence & Improvement System API",
    version="1.0.0",
)

# Enable CORS for local development on any localhost port
app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    llm_configured: bool
    mode: str


@app.get("/api/health", response_model=HealthResponse, tags=["System"])
def health_check():
    """Health check endpoint to verify system status and configuration."""
    api_key_present = bool(os.getenv("LLM_API_KEY", "").strip())
    return HealthResponse(
        status="healthy",
        service="ProcessPulse Intelligence Engine",
        version="1.0.0",
        llm_configured=api_key_present,
        mode="Production LLM" if api_key_present else "Deterministic Fallback Engine",
    )


# -------------------------------------------------------------
# Phase 2 Endpoints: SOP, Executions, Deviations, Analytics
# -------------------------------------------------------------

@app.get("/api/sop", response_model=SOPDefinition, tags=["SOP"])
def get_official_sop():
    """Return the official Standard Operating Procedure (SOP) definition and ordered steps."""
    return get_sop_definition()


@app.get("/api/executions", response_model=List[ExecutionRecord], tags=["Executions"])
def list_executions(
    machine_id: Optional[str] = Query(None, description="Filter by machine ID (e.g. MCH-01)"),
    shift: Optional[str] = Query(None, description="Filter by shift (e.g. Morning, Afternoon, Night)"),
    has_deviation: Optional[bool] = Query(None, description="Filter by deviation status (true/false)"),
):
    """
    Return simulated manufacturing execution records.
    Supports optional filters for machine_id, shift, and has_deviation.
    """
    records = get_dataset()
    if machine_id:
        records = [r for r in records if r.machine_id == machine_id]
    if shift:
        records = [r for r in records if r.shift == shift]
    if has_deviation is not None:
        records = [
            r for r in records
            if (r.deviation_info.has_deviation if r.deviation_info else False) == has_deviation
        ]
    return records


@app.get("/api/executions/{execution_id}", response_model=ExecutionRecord, tags=["Executions"])
def get_execution_detail(execution_id: str):
    """Return a single execution record and its detected deviation details."""
    dataset = get_dataset()
    for record in dataset:
        if record.execution_id.lower() == execution_id.lower():
            return record
    raise HTTPException(status_code=404, detail=f"Execution with ID '{execution_id}' not found.")


@app.get("/api/metrics/summary", response_model=SummaryMetrics, tags=["Metrics"])
def get_metrics_summary():
    """Return calculated summary metrics across all executions."""
    dataset = get_dataset()
    return calculate_summary_metrics(dataset)


@app.get("/api/deviations", response_model=List[ExecutionRecord], tags=["Deviations"])
def list_deviations():
    """Return all execution records that exhibited one or more SOP deviations."""
    dataset = get_dataset()
    return [r for r in dataset if r.deviation_info and r.deviation_info.has_deviation]


@app.get("/api/analysis/machines", response_model=List[MachineAnalysisItem], tags=["Analysis"])
def get_machine_analysis():
    """Group executions by machine and calculate deviation and defect rates."""
    dataset = get_dataset()
    return calculate_machine_analysis(dataset)


@app.get("/api/analysis/shifts", response_model=List[ShiftAnalysisItem], tags=["Analysis"])
def get_shift_analysis():
    """Group executions by shift and calculate deviation and defect rates."""
    dataset = get_dataset()
    return calculate_shift_analysis(dataset)


# -------------------------------------------------------------
# Phase 3 Endpoints: Patterns, Impact, Investigation, Validation, Memory
# -------------------------------------------------------------

@app.get("/api/analysis/patterns", response_model=PatternAnalysisResponse, tags=["Analysis"])
def get_pattern_analysis():
    """
    Identify recurring deviations by machine, shift, and type.
    Provides transparent signal flags without premature causation claims.
    """
    dataset = get_dataset()
    return calculate_pattern_analysis(dataset)


@app.get("/api/analysis/impact", response_model=ImpactAnalysisResponse, tags=["Analysis"])
def get_impact_analysis():
    """
    Compare standard SOP executions vs deviated executions.
    Calculates cycle time diffs, defect rates, and plain-language interpretations.
    """
    dataset = get_dataset()
    return calculate_impact_analysis(dataset)


@app.post("/api/investigation", response_model=InvestigationResponse, tags=["AI Investigation"])
def request_investigation(
    req: InvestigationRequest,
    db: Session = Depends(get_db)
):
    """
    Generate an evidence-grounded AI investigation report for a selected execution.
    Combines verified metrics, shop-floor context, and SQLite process memory.
    """
    dataset = get_dataset()
    target_exec = next((e for e in dataset if e.execution_id.lower() == req.execution_id.lower()), None)
    if not target_exec:
        raise HTTPException(status_code=404, detail=f"Execution '{req.execution_id}' not found.")

    memory_match = match_process_memory(db, target_exec)
    return generate_investigation(target_exec, dataset, memory_match)


@app.get("/api/validation/pending", response_model=List[ExecutionRecord], tags=["Human Validation"])
def get_pending_validations(db: Session = Depends(get_db)):
    """
    Return all deviated executions pending manager review.
    Shows executions with their current process memory status.
    """
    dataset = get_dataset()
    deviated = [e for e in dataset if e.deviation_info and e.deviation_info.has_deviation]
    return deviated


@app.post("/api/validation", response_model=ValidationRecord, status_code=status.HTTP_201_CREATED, tags=["Human Validation"])
def submit_validation_decision(
    submission: ValidationSubmission,
    db: Session = Depends(get_db)
):
    """
    Submit and persist a manager validation decision in SQLite.
    Requires one of: 'Validate Improvement', 'Needs Further Investigation', 'Reject / Correct Deviation'.
    """
    dataset = get_dataset()
    target_exec = next((e for e in dataset if e.execution_id.lower() == submission.execution_id.lower()), None)
    if not target_exec:
        raise HTTPException(status_code=404, detail=f"Execution '{submission.execution_id}' not found.")

    try:
        record = save_validation_decision(db, target_exec, submission)
        return record
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/validation/history", response_model=List[ValidationRecord], tags=["Human Validation"])
def get_validation_history(db: Session = Depends(get_db)):
    """Retrieve all previously recorded validation decisions from SQLite."""
    return get_all_decisions(db)


@app.get("/api/memory", response_model=List[ValidationRecord], tags=["Process Memory"])
def get_process_memory(db: Session = Depends(get_db)):
    """Retrieve persistent process memory records."""
    return get_all_decisions(db)


@app.get("/api/memory/matches/{execution_id}", response_model=ProcessMemoryMatch, tags=["Process Memory"])
def get_memory_match_for_execution(
    execution_id: str,
    db: Session = Depends(get_db)
):
    """
    Find matching historical decisions for an execution based on its stable deviation signature.
    Provides context without automatic approval.
    """
    dataset = get_dataset()
    target_exec = next((e for e in dataset if e.execution_id.lower() == execution_id.lower()), None)
    if not target_exec:
        raise HTTPException(status_code=404, detail=f"Execution '{execution_id}' not found.")

    return match_process_memory(db, target_exec)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
