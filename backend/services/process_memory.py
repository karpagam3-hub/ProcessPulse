"""
Process Knowledge Memory & Deviation Signature Service
Computes stable deviation signatures and matches future executions against
previously recorded managerial decisions stored in SQLite.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session

from database import ValidationDecisionModel
from schemas import (
    ExecutionRecord,
    ValidationSubmission,
    ValidationRecord,
    ProcessMemoryMatch,
)


def compute_deviation_signature(execution: ExecutionRecord) -> str:
    """
    Generate a stable, deterministic deviation signature based on deviation characteristics.
    Does NOT depend on execution ID, machine ID, or timestamp.
    """
    if not execution.deviation_info or not execution.deviation_info.has_deviation:
        return "normal:sop_adherence"

    parts = []
    # Added steps
    for step in sorted(execution.deviation_info.additional_steps):
        parts.append(f"added:{step.replace(' ', '_')}")

    # Missing steps
    for step in sorted(execution.deviation_info.missing_steps):
        parts.append(f"missing:{step.replace(' ', '_')}")

    # Sequence issues
    if execution.deviation_info.sequence_issues:
        for issue in sorted(execution.deviation_info.sequence_issues):
            clean_issue = issue.replace("'", "").replace(" ", "_")
            parts.append(f"seq:{clean_issue[:30]}")

    if not parts:
        return "deviation:unclassified"

    return "+".join(parts)


def save_validation_decision(
    db: Session,
    execution: ExecutionRecord,
    submission: ValidationSubmission
) -> ValidationRecord:
    """
    Store a manager validation decision in persistent SQLite database.
    """
    valid_decisions = [
        "Validate Improvement",
        "Needs Further Investigation",
        "Reject / Correct Deviation"
    ]
    if submission.decision not in valid_decisions:
        raise ValueError(f"Invalid decision '{submission.decision}'. Must be one of {valid_decisions}")

    if not submission.reason or len(submission.reason.strip()) < 5:
        raise ValueError("A clear justification/reason of at least 5 characters is required.")

    sig = compute_deviation_signature(execution)
    decision_id = f"DEC-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)

    record = ValidationDecisionModel(
        decision_id=decision_id,
        execution_id=execution.execution_id,
        deviation_signature=sig,
        machine_id=execution.machine_id,
        shift=execution.shift,
        product_id=execution.product_id,
        decision=submission.decision,
        reviewer=submission.reviewer.strip(),
        reason=submission.reason.strip(),
        created_at=now,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return ValidationRecord(
        decision_id=record.decision_id,
        execution_id=record.execution_id,
        deviation_signature=record.deviation_signature,
        machine_id=record.machine_id,
        shift=record.shift,
        product_id=record.product_id,
        decision=record.decision,
        reviewer=record.reviewer,
        reason=record.reason,
        timestamp=record.created_at.isoformat(),
    )


def get_all_decisions(db: Session) -> List[ValidationRecord]:
    """Retrieve all saved validation decisions from SQLite."""
    rows = db.query(ValidationDecisionModel).order_by(ValidationDecisionModel.created_at.desc()).all()
    return [
        ValidationRecord(
            decision_id=r.decision_id,
            execution_id=r.execution_id,
            deviation_signature=r.deviation_signature,
            machine_id=r.machine_id,
            shift=r.shift,
            product_id=r.product_id,
            decision=r.decision,
            reviewer=r.reviewer,
            reason=r.reason,
            timestamp=r.created_at.isoformat(),
        )
        for r in rows
    ]


def match_process_memory(db: Session, execution: ExecutionRecord) -> ProcessMemoryMatch:
    """
    Check if a matching deviation signature was previously evaluated by a manager.
    Historical decisions provide context, NOT automatic approval.
    """
    sig = compute_deviation_signature(execution)
    if sig == "normal:sop_adherence":
        return ProcessMemoryMatch(
            execution_id=execution.execution_id,
            deviation_signature=sig,
            has_history=False,
            status="No Matching History",
            prior_decisions=[],
            matching_rule_explanation="Execution follows standard SOP exactly; no deviation signature to match.",
        )

    # Query by matching deviation signature
    rows = db.query(ValidationDecisionModel).filter(
        ValidationDecisionModel.deviation_signature == sig
    ).order_by(ValidationDecisionModel.created_at.desc()).all()

    if not rows:
        return ProcessMemoryMatch(
            execution_id=execution.execution_id,
            deviation_signature=sig,
            has_history=False,
            status="No Matching History",
            prior_decisions=[],
            matching_rule_explanation=f"Signature '{sig}' has no recorded manager decisions in SQLite process memory.",
        )

    prior_decisions = [
        ValidationRecord(
            decision_id=r.decision_id,
            execution_id=r.execution_id,
            deviation_signature=r.deviation_signature,
            machine_id=r.machine_id,
            shift=r.shift,
            product_id=r.product_id,
            decision=r.decision,
            reviewer=r.reviewer,
            reason=r.reason,
            timestamp=r.created_at.isoformat(),
        )
        for r in rows
    ]

    # Evaluate memory status
    latest_decision = prior_decisions[0].decision
    if latest_decision == "Validate Improvement":
        status = "Previously Validated Variation"
    elif latest_decision == "Needs Further Investigation":
        status = "Requires Further Investigation"
    else:
        status = "Previously Rejected"

    explanation = (
        f"Matched {len(prior_decisions)} prior manager decision(s) via stable signature '{sig}'. "
        "Historical memory provides operational context and does NOT automatically approve new executions."
    )

    return ProcessMemoryMatch(
        execution_id=execution.execution_id,
        deviation_signature=sig,
        has_history=True,
        status=status,
        prior_decisions=prior_decisions,
        matching_rule_explanation=explanation,
    )
