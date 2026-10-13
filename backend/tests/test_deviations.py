import pytest
from fastapi.testclient import TestClient
from main import app
from services.deviation_engine import detect_deviations, OFFICIAL_SOP_STEPS
from services.dataset import get_dataset, get_sop_definition
from services.analytics import (
    calculate_summary_metrics,
    calculate_machine_analysis,
    calculate_shift_analysis,
)

client = TestClient(app)


# 1. Test Normal Execution (exact SOP match)
def test_normal_execution_detection():
    steps = ["Material Check", "Assembly", "Calibration", "Inspection", "Packaging"]
    result = detect_deviations("TEST-NORMAL", steps, OFFICIAL_SOP_STEPS)

    assert result.has_deviation is False
    assert len(result.deviation_types) == 0
    assert len(result.missing_steps) == 0
    assert len(result.additional_steps) == 0
    assert len(result.sequence_issues) == 0
    assert "conforms strictly" in result.explanation.lower()


# 2. Test Missing Step
def test_missing_step_detection():
    # Omit "Calibration"
    steps = ["Material Check", "Assembly", "Inspection", "Packaging"]
    result = detect_deviations("TEST-MISSING", steps, OFFICIAL_SOP_STEPS)

    assert result.has_deviation is True
    assert "missing_step" in result.deviation_types
    assert result.missing_steps == ["Calibration"]
    assert len(result.additional_steps) == 0
    assert len(result.sequence_issues) == 0
    assert "Missing 1 step(s): Calibration" in result.explanation


# 3. Test Additional Step
def test_additional_step_detection():
    # Introduce "Manual Adjustment"
    steps = ["Material Check", "Assembly", "Manual Adjustment", "Calibration", "Inspection", "Packaging"]
    result = detect_deviations("TEST-ADDITIONAL", steps, OFFICIAL_SOP_STEPS)

    assert result.has_deviation is True
    assert "additional_step" in result.deviation_types
    assert result.additional_steps == ["Manual Adjustment"]
    assert len(result.missing_steps) == 0
    assert len(result.sequence_issues) == 0
    assert "Additional step(s) recorded: Manual Adjustment" in result.explanation


# 4. Test Incorrect Step Ordering (Sequence Issue)
def test_incorrect_step_ordering():
    # Calibration executed before Assembly
    steps = ["Material Check", "Calibration", "Assembly", "Inspection", "Packaging"]
    result = detect_deviations("TEST-SEQUENCE", steps, OFFICIAL_SOP_STEPS)

    assert result.has_deviation is True
    assert "sequence_issue" in result.deviation_types
    assert len(result.missing_steps) == 0
    assert len(result.additional_steps) == 0
    assert len(result.sequence_issues) > 0
    assert any("Calibration" in issue for issue in result.sequence_issues)


# 5. Test Multiple Deviation Types in One Execution
def test_multiple_deviations_detection():
    # Missing Inspection + Added Manual Adjustment + Calibration before Assembly
    steps = ["Material Check", "Calibration", "Assembly", "Manual Adjustment", "Packaging"]
    result = detect_deviations("TEST-MULTI", steps, OFFICIAL_SOP_STEPS)

    assert result.has_deviation is True
    assert "missing_step" in result.deviation_types
    assert "additional_step" in result.deviation_types
    assert "sequence_issue" in result.deviation_types
    assert "Inspection" in result.missing_steps
    assert "Manual Adjustment" in result.additional_steps


# 6. Test Summary Metric Calculations
def test_summary_metrics_calculation():
    dataset = get_dataset()
    assert len(dataset) >= 100, "Dataset must have at least 100 records"

    metrics = calculate_summary_metrics(dataset)
    assert metrics.total_executions == len(dataset)
    assert metrics.normal_executions + metrics.deviated_executions == metrics.total_executions
    assert metrics.deviation_rate == round((metrics.deviated_executions / metrics.total_executions) * 100, 2)
    assert metrics.missing_step_occurrences >= 0
    assert metrics.additional_step_occurrences >= 0
    assert metrics.sequence_issue_occurrences >= 0
    assert metrics.data_source == "synthetic_simulation"


# 7. Test Machine and Shift Aggregation
def test_machine_and_shift_analysis():
    dataset = get_dataset()
    machine_res = calculate_machine_analysis(dataset)
    shift_res = calculate_shift_analysis(dataset)

    assert len(machine_res) == 4
    total_mch_execs = sum(m.total_executions for m in machine_res)
    assert total_mch_execs == len(dataset)

    for m in machine_res:
        assert m.normal_executions + m.deviated_executions == m.total_executions
        assert 0.0 <= m.deviation_rate <= 100.0

    assert len(shift_res) == 3
    total_shift_execs = sum(s.total_executions for s in shift_res)
    assert total_shift_execs == len(dataset)


# 8. Test API Endpoints
def test_api_endpoints():
    # Health
    r_health = client.get("/api/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "healthy"

    # SOP
    r_sop = client.get("/api/sop")
    assert r_sop.status_code == 200
    sop_data = r_sop.json()
    assert len(sop_data["steps"]) == 5
    assert sop_data["steps"][0] == "Material Check"

    # Executions
    r_execs = client.get("/api/executions")
    assert r_execs.status_code == 200
    exec_data = r_execs.json()
    assert len(exec_data) >= 100

    # Filtered executions
    r_filtered = client.get("/api/executions?machine_id=MCH-01")
    assert r_filtered.status_code == 200
    assert all(e["machine_id"] == "MCH-01" for e in r_filtered.json())

    # Execution Detail
    first_id = exec_data[0]["execution_id"]
    r_detail = client.get(f"/api/executions/{first_id}")
    assert r_detail.status_code == 200
    assert r_detail.json()["execution_id"] == first_id

    # Summary metrics
    r_metrics = client.get("/api/metrics/summary")
    assert r_metrics.status_code == 200
    assert r_metrics.json()["total_executions"] >= 100

    # Deviations
    r_devs = client.get("/api/deviations")
    assert r_devs.status_code == 200
    dev_records = r_devs.json()
    assert all(e["deviation_info"]["has_deviation"] is True for e in dev_records)

    # Machine analysis
    r_mch = client.get("/api/analysis/machines")
    assert r_mch.status_code == 200
    assert len(r_mch.json()) == 4

    # Shift analysis
    r_shift = client.get("/api/analysis/shifts")
    assert r_shift.status_code == 200
    assert len(r_shift.json()) == 3
