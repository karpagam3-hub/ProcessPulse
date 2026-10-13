"""
Deterministic SOP Deviation Detection Engine
Compares expected SOP sequence with actual shop-floor execution events.
Does NOT use LLMs or heuristic guesses. Pure rule-based, reproducible, and verifiable.
"""

from typing import List, Dict, Any
from schemas import DeviationResult


OFFICIAL_SOP_STEPS = [
    "Material Check",
    "Assembly",
    "Calibration",
    "Inspection",
    "Packaging"
]


def detect_deviations(
    execution_id: str,
    actual_steps: List[str],
    expected_steps: List[str] = None
) -> DeviationResult:
    """
    Deterministically compare actual steps against expected SOP steps.

    Detects:
    1. Missing steps (expected step not executed)
    2. Additional steps (unrecognized step introduced)
    3. Sequence issues (expected steps executed in wrong order)
    """
    if expected_steps is None:
        expected_steps = OFFICIAL_SOP_STEPS

    expected_set = set(expected_steps)
    actual_set = set(actual_steps)

    # 1. Missing steps: in expected but not in actual
    missing_steps = [s for s in expected_steps if s not in actual_set]

    # 2. Additional steps: in actual but not in expected
    additional_steps = [s for s in actual_steps if s not in expected_set]

    # 3. Sequence issues: examine relative order of common SOP steps
    sop_present_in_actual = [s for s in actual_steps if s in expected_set]
    sequence_issues: List[str] = []

    # Map each expected step to its nominal index
    expected_indices = {step: idx for idx, step in enumerate(expected_steps)}

    # Check for inversions in the actual sequence
    for i in range(len(sop_present_in_actual)):
        for j in range(i + 1, len(sop_present_in_actual)):
            step_a = sop_present_in_actual[i]
            step_b = sop_present_in_actual[j]
            idx_a = expected_indices[step_a]
            idx_b = expected_indices[step_b]
            if idx_a > idx_b:
                issue_desc = f"'{step_b}' executed after '{step_a}' (expected order: {step_b} before {step_a})"
                if issue_desc not in sequence_issues:
                    sequence_issues.append(issue_desc)

    deviation_types: List[str] = []
    if missing_steps:
        deviation_types.append("missing_step")
    if additional_steps:
        deviation_types.append("additional_step")
    if sequence_issues:
        deviation_types.append("sequence_issue")

    has_deviation = len(deviation_types) > 0

    # Build human-readable, non-judgmental explanation
    if not has_deviation:
        explanation = "Execution conforms strictly to official SOP standard (all 5 steps in designated order)."
    else:
        parts = []
        if missing_steps:
            parts.append(f"Missing {len(missing_steps)} step(s): {', '.join(missing_steps)}")
        if additional_steps:
            parts.append(f"Additional step(s) recorded: {', '.join(additional_steps)}")
        if sequence_issues:
            parts.append(f"Sequence out of order: {'; '.join(sequence_issues)}")
        explanation = " | ".join(parts)

    return DeviationResult(
        execution_id=execution_id,
        has_deviation=has_deviation,
        deviation_types=deviation_types,
        missing_steps=missing_steps,
        additional_steps=additional_steps,
        sequence_issues=sequence_issues,
        expected_steps=expected_steps,
        actual_steps=actual_steps,
        explanation=explanation,
    )
