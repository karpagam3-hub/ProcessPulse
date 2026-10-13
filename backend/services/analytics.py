"""
Manufacturing Analytics Calculation Service
Calculates summary metrics, machine breakdowns, shift breakdowns,
pattern analysis, and impact comparisons.
"""

from typing import List, Dict, Any
from schemas import (
    SummaryMetrics,
    MachineAnalysisItem,
    ShiftAnalysisItem,
    ExecutionRecord,
    RecurringPatternItem,
    PatternAnalysisResponse,
    GroupImpactMetrics,
    ImpactAnalysisResponse,
)


def calculate_summary_metrics(executions: List[ExecutionRecord]) -> SummaryMetrics:
    total = len(executions)
    if total == 0:
        return SummaryMetrics(
            total_executions=0,
            normal_executions=0,
            deviated_executions=0,
            deviation_rate=0.0,
            missing_step_occurrences=0,
            additional_step_occurrences=0,
            sequence_issue_occurrences=0,
            avg_cycle_time_seconds=0.0,
            defect_rate=0.0,
            rework_rate=0.0,
            data_source="synthetic_simulation",
        )

    deviated = [e for e in executions if e.deviation_info and e.deviation_info.has_deviation]
    normal = [e for e in executions if not (e.deviation_info and e.deviation_info.has_deviation)]

    missing_count = sum(1 for e in executions if e.deviation_info and "missing_step" in e.deviation_info.deviation_types)
    additional_count = sum(1 for e in executions if e.deviation_info and "additional_step" in e.deviation_info.deviation_types)
    sequence_count = sum(1 for e in executions if e.deviation_info and "sequence_issue" in e.deviation_info.deviation_types)

    avg_cycle_time = sum(e.cycle_time_seconds for e in executions) / total
    defects = sum(1 for e in executions if e.defect_detected)
    reworks = sum(1 for e in executions if e.rework_required)

    return SummaryMetrics(
        total_executions=total,
        normal_executions=len(normal),
        deviated_executions=len(deviated),
        deviation_rate=round((len(deviated) / total) * 100, 2),
        missing_step_occurrences=missing_count,
        additional_step_occurrences=additional_count,
        sequence_issue_occurrences=sequence_count,
        avg_cycle_time_seconds=round(avg_cycle_time, 1),
        defect_rate=round((defects / total) * 100, 2),
        rework_rate=round((reworks / total) * 100, 2),
        data_source="synthetic_simulation",
    )


def calculate_machine_analysis(executions: List[ExecutionRecord]) -> List[MachineAnalysisItem]:
    machines = sorted(list(set(e.machine_id for e in executions)))
    results: List[MachineAnalysisItem] = []

    for m in machines:
        group = [e for e in executions if e.machine_id == m]
        total = len(group)
        if total == 0:
            continue
        deviated = sum(1 for e in group if e.deviation_info and e.deviation_info.has_deviation)
        defects = sum(1 for e in group if e.defect_detected)
        avg_time = sum(e.cycle_time_seconds for e in group) / total

        results.append(
            MachineAnalysisItem(
                machine_id=m,
                total_executions=total,
                normal_executions=total - deviated,
                deviated_executions=deviated,
                deviation_rate=round((deviated / total) * 100, 2),
                defect_rate=round((defects / total) * 100, 2),
                avg_cycle_time_seconds=round(avg_time, 1),
            )
        )

    return results


def calculate_shift_analysis(executions: List[ExecutionRecord]) -> List[ShiftAnalysisItem]:
    shift_order = ["Morning", "Afternoon", "Night"]
    shifts = [s for s in shift_order if any(e.shift == s for e in executions)]
    results: List[ShiftAnalysisItem] = []

    for s in shifts:
        group = [e for e in executions if e.shift == s]
        total = len(group)
        if total == 0:
            continue
        deviated = sum(1 for e in group if e.deviation_info and e.deviation_info.has_deviation)
        defects = sum(1 for e in group if e.defect_detected)
        avg_time = sum(e.cycle_time_seconds for e in group) / total

        results.append(
            ShiftAnalysisItem(
                shift=s,
                total_executions=total,
                normal_executions=total - deviated,
                deviated_executions=deviated,
                deviation_rate=round((deviated / total) * 100, 2),
                defect_rate=round((defects / total) * 100, 2),
                avg_cycle_time_seconds=round(avg_time, 1),
            )
        )

    return results


# --------------------------------------------------------------------------
# Phase 3 Analytics: Pattern Analysis & Impact Analysis
# --------------------------------------------------------------------------

def calculate_pattern_analysis(executions: List[ExecutionRecord]) -> PatternAnalysisResponse:
    total = len(executions)
    if total == 0:
        return PatternAnalysisResponse(
            overall_deviation_rate=0.0,
            total_executions=0,
            total_deviated=0,
            machine_breakdown=[],
            shift_breakdown=[],
            type_frequency={"missing_step": 0, "additional_step": 0, "sequence_issue": 0},
            recurring_patterns=[],
        )

    deviated = [e for e in executions if e.deviation_info and e.deviation_info.has_deviation]
    overall_dev_rate = round((len(deviated) / total) * 100, 2)

    # Machine breakdown
    mch_items = calculate_machine_analysis(executions)
    machine_breakdown = [m.model_dump() for m in mch_items]

    # Shift breakdown
    shift_items = calculate_shift_analysis(executions)
    shift_breakdown = [s.model_dump() for s in shift_items]

    # Deviation type frequencies
    missing_freq = sum(1 for e in executions if e.deviation_info and "missing_step" in e.deviation_info.deviation_types)
    added_freq = sum(1 for e in executions if e.deviation_info and "additional_step" in e.deviation_info.deviation_types)
    sequence_freq = sum(1 for e in executions if e.deviation_info and "sequence_issue" in e.deviation_info.deviation_types)
    type_frequency = {
        "missing_step": missing_freq,
        "additional_step": added_freq,
        "sequence_issue": sequence_freq,
    }

    # Discover recurring patterns across (Machine, Shift) intersections
    machines = sorted(list(set(e.machine_id for e in executions)))
    shifts = ["Morning", "Afternoon", "Night"]
    recurring_patterns: List[RecurringPatternItem] = []

    pattern_counter = 1
    for m in machines:
        for s in shifts:
            sub = [e for e in executions if e.machine_id == m and e.shift == s]
            if len(sub) < 3:
                continue
            sub_deviated = [e for e in sub if e.deviation_info and e.deviation_info.has_deviation]
            rate = round((len(sub_deviated) / len(sub)) * 100, 1)

            # Determine dominant deviation type in this group
            sub_missing = sum(1 for e in sub if e.deviation_info and "missing_step" in e.deviation_info.deviation_types)
            sub_added = sum(1 for e in sub if e.deviation_info and "additional_step" in e.deviation_info.deviation_types)
            sub_seq = sum(1 for e in sub if e.deviation_info and "sequence_issue" in e.deviation_info.deviation_types)

            dominant_type = "None"
            if sub_added >= sub_missing and sub_added >= sub_seq and sub_added > 0:
                dominant_type = "additional_step (Manual Adjustment)"
            elif sub_missing >= sub_added and sub_missing >= sub_seq and sub_missing > 0:
                dominant_type = "missing_step (Calibration/Inspection)"
            elif sub_seq > 0:
                dominant_type = "sequence_issue"

            # Signal flag rules
            if rate > (overall_dev_rate * 1.25) and len(sub_deviated) >= 4:
                signal_flag = "HIGH_VARIATION"
                signal_expl = f"Deviation rate ({rate}%) exceeds factory baseline ({overall_dev_rate}%) by over 25%. Signal warrants focused review."
            elif rate > overall_dev_rate and len(sub_deviated) >= 2:
                signal_flag = "MODERATE_SIGNAL"
                signal_expl = f"Deviation rate ({rate}%) is moderately above baseline ({overall_dev_rate}%)."
            else:
                signal_flag = "STANDARD_DISTRIBUTION"
                signal_expl = f"Variation frequency ({rate}%) is within standard operating dispersion limits."

            recurring_patterns.append(
                RecurringPatternItem(
                    pattern_id=f"PAT-{pattern_counter:03d}",
                    pattern_description=f"{m} / {s} Shift Operational Cluster",
                    deviation_type=dominant_type,
                    machine_id=m,
                    shift=s,
                    occurrence_count=len(sub_deviated),
                    total_group_executions=len(sub),
                    occurrence_rate=rate,
                    signal_flag=signal_flag,
                    signal_explanation=signal_expl,
                )
            )
            pattern_counter += 1

    # Sort patterns with HIGH_VARIATION first
    recurring_patterns.sort(key=lambda p: (0 if p.signal_flag == "HIGH_VARIATION" else 1, -p.occurrence_rate))

    return PatternAnalysisResponse(
        overall_deviation_rate=overall_dev_rate,
        total_executions=total,
        total_deviated=len(deviated),
        machine_breakdown=machine_breakdown,
        shift_breakdown=shift_breakdown,
        type_frequency=type_frequency,
        recurring_patterns=recurring_patterns,
        causation_safeguard="Observed patterns are statistical signals for operational inquiry, not confirmed mechanical or human root causes.",
    )


def calculate_impact_analysis(executions: List[ExecutionRecord]) -> ImpactAnalysisResponse:
    normal_group = [e for e in executions if not (e.deviation_info and e.deviation_info.has_deviation)]
    deviated_group = [e for e in executions if e.deviation_info and e.deviation_info.has_deviation]

    n_count = len(normal_group)
    d_count = len(deviated_group)

    # Safe metrics for normal group
    if n_count > 0:
        n_cycle = sum(e.cycle_time_seconds for e in normal_group) / n_count
        n_defect = (sum(1 for e in normal_group if e.defect_detected) / n_count) * 100
        n_rework = (sum(1 for e in normal_group if e.rework_required) / n_count) * 100
    else:
        n_cycle = 0.0
        n_defect = 0.0
        n_rework = 0.0

    # Safe metrics for deviated group
    if d_count > 0:
        d_cycle = sum(e.cycle_time_seconds for e in deviated_group) / d_count
        d_defect = (sum(1 for e in deviated_group if e.defect_detected) / d_count) * 100
        d_rework = (sum(1 for e in deviated_group if e.rework_required) / d_count) * 100
    else:
        d_cycle = 0.0
        d_defect = 0.0
        d_rework = 0.0

    cycle_diff = round(d_cycle - n_cycle, 1)
    cycle_rel_pct = round(((d_cycle - n_cycle) / n_cycle * 100), 2) if n_cycle > 0 else 0.0
    defect_diff_points = round(d_defect - n_defect, 2)
    rework_diff_points = round(d_rework - n_rework, 2)

    # Plain language interpretation
    direction_time = "higher" if cycle_diff > 0 else "lower"
    direction_defect = "higher" if defect_diff_points > 0 else "lower"
    plain_text = (
        f"Executions with detected deviations were associated with a {direction_time} average cycle time "
        f"({abs(cycle_diff)}s difference, {cycle_rel_pct:+.1f}%) and a {abs(defect_diff_points)} percentage-point {direction_defect} defect rate "
        f"in this simulated dataset. Observational differences indicate association, not proof of causation."
    )

    sample_size_caveat = (
        f"Analysis based on {n_count} normal executions and {d_count} deviated executions. "
        "Small subgroup samples require caution before drawing operational conclusions."
    )

    return ImpactAnalysisResponse(
        normal_group=GroupImpactMetrics(
            group_name="Standard SOP Adherence",
            execution_count=n_count,
            avg_cycle_time_seconds=round(n_cycle, 1),
            defect_rate_pct=round(n_defect, 2),
            rework_rate_pct=round(n_rework, 2),
        ),
        deviated_group=GroupImpactMetrics(
            group_name="Process Deviations Observed",
            execution_count=d_count,
            avg_cycle_time_seconds=round(d_cycle, 1),
            defect_rate_pct=round(d_defect, 2),
            rework_rate_pct=round(d_rework, 2),
        ),
        cycle_time_diff_seconds=cycle_diff,
        cycle_time_relative_pct=cycle_rel_pct,
        defect_rate_diff_points=defect_diff_points,
        rework_rate_diff_points=rework_diff_points,
        plain_language_interpretation=plain_text,
        sample_size_caveat=sample_size_caveat,
        data_source="synthetic_simulation",
    )
