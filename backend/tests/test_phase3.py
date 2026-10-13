import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal, ValidationDecisionModel
from services.dataset import get_dataset
from services.analytics import calculate_pattern_analysis, calculate_impact_analysis
from services.process_memory import compute_deviation_signature, match_process_memory
from schemas import ValidationSubmission

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    """Ensure a clean test database state for validation tests."""
    db = SessionLocal()
    try:
        db.query(ValidationDecisionModel).delete()
        db.commit()
    finally:
        db.close()


# 1. Test Pattern Aggregation & Deviation Rates
def test_pattern_aggregation_and_rates():
    dataset = get_dataset()
    patterns = calculate_pattern_analysis(dataset)

    assert patterns.total_executions == len(dataset)
    assert patterns.total_deviated > 0
    assert 0.0 <= patterns.overall_deviation_rate <= 100.0
    assert len(patterns.machine_breakdown) == 4
    assert len(patterns.shift_breakdown) == 3
    assert "missing_step" in patterns.type_frequency
    assert "additional_step" in patterns.type_frequency
    assert "sequence_issue" in patterns.type_frequency
    assert len(patterns.recurring_patterns) > 0
    assert "causation_safeguard" in patterns.model_dump()


# 2. Test Impact Calculations for Normal and Deviated Groups
def test_impact_calculations():
    dataset = get_dataset()
    impact = calculate_impact_analysis(dataset)

    assert impact.normal_group.execution_count > 0
    assert impact.deviated_group.execution_count > 0
    assert impact.normal_group.execution_count + impact.deviated_group.execution_count == len(dataset)
    assert impact.normal_group.avg_cycle_time_seconds > 0
    assert impact.deviated_group.avg_cycle_time_seconds > 0
    assert impact.cycle_time_diff_seconds == round(
        impact.deviated_group.avg_cycle_time_seconds - impact.normal_group.avg_cycle_time_seconds, 1
    )
    assert "simulated dataset" in impact.plain_language_interpretation.lower()
    assert "association, not proof of causation" in impact.plain_language_interpretation.lower()


# 3. Test Empty Groups and Zero Denominators in Impact Analysis
def test_impact_calculations_empty_dataset():
    empty_impact = calculate_impact_analysis([])
    assert empty_impact.normal_group.execution_count == 0
    assert empty_impact.deviated_group.execution_count == 0
    assert empty_impact.cycle_time_diff_seconds == 0.0
    assert empty_impact.cycle_time_relative_pct == 0.0


# 4. Test Evidence-Grounded Investigation Output and Fallback Behavior
def test_investigation_endpoint_output():
    # Use EXEC-002 which has additional step "Manual Adjustment"
    response = client.post("/api/investigation", json={"execution_id": "EXEC-002"})
    assert response.status_code == 200
    data = response.json()

    assert data["execution_id"] == "EXEC-002"
    assert data["engine_mode"] in ["Deterministic Fallback Engine", "Production LLM"]
    assert len(data["observed_evidence"]) >= 3
    assert len(data["possible_hypotheses"]) >= 1
    assert any("Hypothesis" in h for h in data["possible_hypotheses"])
    assert len(data["recommended_checks"]) >= 1
    assert len(data["risk_considerations"]) >= 1
    assert "confidence_and_limitations" in data


# 5. Test Invalid Validation Decisions Rejection
def test_invalid_validation_decision():
    payload = {
        "execution_id": "EXEC-002",
        "decision": "Invalid Decision That Should Fail",
        "reviewer": "Manager John",
        "reason": "Testing invalid decision rejection",
    }
    response = client.post("/api/validation", json={**payload})
    assert response.status_code == 400
    assert "Invalid decision" in response.json()["detail"]


# 6. Test Missing Required Justification Rejection
def test_missing_justification_rejection():
    payload = {
        "execution_id": "EXEC-002",
        "decision": "Validate Improvement",
        "reviewer": "Manager John",
        "reason": "   ",  # whitespace only
    }
    response = client.post("/api/validation", json={**payload})
    # Either pydantic validation error (422) or value error (400)
    assert response.status_code in [400, 422]


# 7. Test Successful Validation Persistence in SQLite
def test_successful_validation_persistence():
    payload = {
        "execution_id": "EXEC-002",
        "decision": "Validate Improvement",
        "reviewer": "Quality Lead Sarah",
        "reason": "Operator added manual adjustment compensates for thermal drift effectively.",
    }
    response = client.post("/api/validation", json=payload)
    assert response.status_code == 201
    record = response.json()

    assert record["execution_id"] == "EXEC-002"
    assert record["decision"] == "Validate Improvement"
    assert record["reviewer"] == "Quality Lead Sarah"
    assert record["decision_id"].startswith("DEC-")

    # Verify directly via GET /api/validation/history
    hist_response = client.get("/api/validation/history")
    assert hist_response.status_code == 200
    history = hist_response.json()
    assert len(history) == 1
    assert history[0]["decision_id"] == record["decision_id"]


# 8. Test Matching Historical Decisions to Similar Deviation Signatures
def test_process_memory_signature_matching():
    # 1. Save decision for EXEC-002 (Manual Adjustment added)
    client.post(
        "/api/validation",
        json={
            "execution_id": "EXEC-002",
            "decision": "Validate Improvement",
            "reviewer": "Manager Alex",
            "reason": "Verified that manual adjustment does not damage wiring.",
        },
    )

    # 2. Check process memory for another execution that also has "Manual Adjustment" added
    dataset = get_dataset()
    another_manual_adj = next(
        (
            e for e in dataset
            if e.execution_id != "EXEC-002"
            and e.deviation_info
            and "Manual Adjustment" in e.deviation_info.additional_steps
            and len(e.deviation_info.missing_steps) == 0
            and len(e.deviation_info.sequence_issues) == 0
        ),
        None,
    )

    if another_manual_adj:
        match_res = client.get(f"/api/memory/matches/{another_manual_adj.execution_id}")
        assert match_res.status_code == 200
        match_data = match_res.json()
        assert match_data["has_history"] is True
        assert match_data["status"] == "Previously Validated Variation"
        assert len(match_data["prior_decisions"]) >= 1
        assert "does NOT automatically approve" in match_data["matching_rule_explanation"]


# 9. Test That Normal Execution Has No Deviation Signature to Match
def test_normal_execution_memory_no_history():
    match_res = client.get("/api/memory/matches/EXEC-001")
    assert match_res.status_code == 200
    assert match_res.json()["has_history"] is False


# 10. Test Endpoints for Patterns, Impact, and Memory
def test_phase3_api_endpoints():
    r_patterns = client.get("/api/analysis/patterns")
    assert r_patterns.status_code == 200
    assert r_patterns.json()["total_executions"] == 120

    r_impact = client.get("/api/analysis/impact")
    assert r_impact.status_code == 200
    assert "cycle_time_diff_seconds" in r_impact.json()

    r_pending = client.get("/api/validation/pending")
    assert r_pending.status_code == 200
    assert len(r_pending.json()) > 0

    r_memory = client.get("/api/memory")
    assert r_memory.status_code == 200
