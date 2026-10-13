from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# -------------------------------------------------------------
# Phase 2 Schemas: SOP, Executions, Deviations, Analytics
# -------------------------------------------------------------

class SOPStep(BaseModel):
    step_number: int
    step_name: str
    description: str
    standard_duration_seconds: int


class SOPDefinition(BaseModel):
    sop_id: str
    sop_name: str
    version: str
    description: str
    steps: List[str]
    step_details: List[SOPStep]


class DeviationResult(BaseModel):
    execution_id: str
    has_deviation: bool
    deviation_types: List[str]  # e.g., ["missing_step", "additional_step", "sequence_issue"]
    missing_steps: List[str]
    additional_steps: List[str]
    sequence_issues: List[str]
    expected_steps: List[str]
    actual_steps: List[str]
    explanation: str


class ExecutionRecord(BaseModel):
    execution_id: str
    timestamp: str
    product_id: str
    product_name: str
    machine_id: str
    shift: str
    expected_steps: List[str]
    actual_steps: List[str]
    cycle_time_seconds: int
    defect_detected: bool
    rework_required: bool
    data_source: str = "synthetic_simulation"
    deviation_info: Optional[DeviationResult] = None


class SummaryMetrics(BaseModel):
    total_executions: int
    normal_executions: int
    deviated_executions: int
    deviation_rate: float
    missing_step_occurrences: int
    additional_step_occurrences: int
    sequence_issue_occurrences: int
    avg_cycle_time_seconds: float
    defect_rate: float
    rework_rate: float
    data_source: str = "synthetic_simulation"


class MachineAnalysisItem(BaseModel):
    machine_id: str
    total_executions: int
    normal_executions: int
    deviated_executions: int
    deviation_rate: float
    defect_rate: float
    avg_cycle_time_seconds: float


class ShiftAnalysisItem(BaseModel):
    shift: str
    total_executions: int
    normal_executions: int
    deviated_executions: int
    deviation_rate: float
    defect_rate: float
    avg_cycle_time_seconds: float


# -------------------------------------------------------------
# Phase 3 Schemas: Patterns, Impact, Investigation, Validation, Memory
# -------------------------------------------------------------

class RecurringPatternItem(BaseModel):
    pattern_id: str
    pattern_description: str
    deviation_type: str
    machine_id: str
    shift: str
    occurrence_count: int
    total_group_executions: int
    occurrence_rate: float
    signal_flag: str  # "HIGH_VARIATION", "MODERATE_SIGNAL", "STANDARD_DISTRIBUTION"
    signal_explanation: str


class PatternAnalysisResponse(BaseModel):
    overall_deviation_rate: float
    total_executions: int
    total_deviated: int
    machine_breakdown: List[Dict[str, Any]]
    shift_breakdown: List[Dict[str, Any]]
    type_frequency: Dict[str, int]
    recurring_patterns: List[RecurringPatternItem]
    causation_safeguard: str = "Observed patterns are statistical signals for operational inquiry, not confirmed mechanical or human root causes."


class GroupImpactMetrics(BaseModel):
    group_name: str
    execution_count: int
    avg_cycle_time_seconds: float
    defect_rate_pct: float
    rework_rate_pct: float


class ImpactAnalysisResponse(BaseModel):
    normal_group: GroupImpactMetrics
    deviated_group: GroupImpactMetrics
    cycle_time_diff_seconds: float
    cycle_time_relative_pct: float
    defect_rate_diff_points: float
    rework_rate_diff_points: float
    plain_language_interpretation: str
    sample_size_caveat: str
    data_source: str = "synthetic_simulation"


class InvestigationRequest(BaseModel):
    execution_id: str


class InvestigationResponse(BaseModel):
    execution_id: str
    deviation_summary: str
    machine_and_shift: str
    engine_mode: str  # "Production LLM" | "Deterministic Fallback Engine"
    observed_evidence: List[str]
    possible_hypotheses: List[str]
    recommended_checks: List[str]
    risk_considerations: List[str]
    confidence_and_limitations: str
    prior_historical_decisions: List[Dict[str, Any]]


class ValidationSubmission(BaseModel):
    execution_id: str
    decision: str  # "Validate Improvement" | "Needs Further Investigation" | "Reject / Correct Deviation"
    reviewer: str = Field(..., min_length=2, description="Reviewer name or identifier")
    reason: str = Field(..., min_length=5, description="Required justification or notes")


class ValidationRecord(BaseModel):
    decision_id: str
    execution_id: str
    deviation_signature: str
    machine_id: str
    shift: str
    product_id: str
    decision: str
    reviewer: str
    reason: str
    timestamp: str


class ProcessMemoryMatch(BaseModel):
    execution_id: str
    deviation_signature: str
    has_history: bool
    status: str  # "Previously Validated Variation" | "Requires Further Investigation" | "Previously Rejected" | "No Matching History"
    prior_decisions: List[ValidationRecord]
    matching_rule_explanation: str
