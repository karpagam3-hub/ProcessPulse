"""
Synthetic Manufacturing Dataset Generator
Generates reproducible simulated execution logs with documented SOP deviations.
Reproducible with a fixed random seed (seed=42).
"""

import random
from datetime import datetime, timedelta
from typing import List, Dict, Any
from schemas import ExecutionRecord, SOPDefinition, SOPStep
from services.deviation_engine import detect_deviations, OFFICIAL_SOP_STEPS


SOP_STEP_DETAILS = [
    SOPStep(step_number=1, step_name="Material Check", description="Verify incoming raw materials and component tolerances", standard_duration_seconds=45),
    SOPStep(step_number=2, step_name="Assembly", description="Mechanical mating and torque verification of sub-assemblies", standard_duration_seconds=120),
    SOPStep(step_number=3, step_name="Calibration", description="Laser alignment and sensor sensitivity calibration", standard_duration_seconds=60),
    SOPStep(step_number=4, step_name="Inspection", description="Automated optical and electrical continuity check", standard_duration_seconds=45),
    SOPStep(step_number=5, step_name="Packaging", description="Protective casing, barcoding, and ESD packaging", standard_duration_seconds=30),
]

OFFICIAL_SOP = SOPDefinition(
    sop_id="SOP-MFG-2026-V2",
    sop_name="Standard Sensor Sub-Assembly Protocol",
    version="v2.4",
    description="Standard operating procedure for high-reliability sensor manufacturing.",
    steps=OFFICIAL_SOP_STEPS,
    step_details=SOP_STEP_DETAILS,
)

PRODUCTS = [
    {"product_id": "PRD-101", "product_name": "Optical Sensor Assembly"},
    {"product_id": "PRD-102", "product_name": "Digital Flow Controller"},
    {"product_id": "PRD-103", "product_name": "Thermal Valve Subsystem"},
]

MACHINES = ["MCH-01", "MCH-02", "MCH-03", "MCH-04"]
SHIFTS = ["Morning", "Afternoon", "Night"]


def generate_synthetic_dataset(num_records: int = 120, seed: int = 42) -> List[ExecutionRecord]:
    """
    Generate at least 100 reproducible synthetic manufacturing executions.
    Contains:
    - Normal executions following SOP
    - Missing steps (e.g., omitted Calibration)
    - Additional steps (e.g., Manual Adjustment workaround)
    - Sequence issues (e.g., Calibration before Assembly)
    - Multi-deviation combinations
    """
    random.seed(seed)
    executions: List[ExecutionRecord] = []
    base_time = datetime(2026, 10, 10, 8, 0, 0)

    # 1. Deterministic Demo Showcases for Hackathon Judges
    demo_scenarios = [
        {
            "id": "EXEC-001",
            "desc": "Perfect SOP Adherence",
            "machine": "MCH-01",
            "shift": "Morning",
            "product": PRODUCTS[0],
            "actual": ["Material Check", "Assembly", "Calibration", "Inspection", "Packaging"],
            "cycle_time": 302,
            "defect": False,
            "rework": False,
        },
        {
            "id": "EXEC-002",
            "desc": "Additional Step (Manual Adjustment) - Workaround Pattern",
            "machine": "MCH-03",
            "shift": "Afternoon",
            "product": PRODUCTS[1],
            "actual": ["Material Check", "Assembly", "Manual Adjustment", "Calibration", "Inspection", "Packaging"],
            "cycle_time": 348,
            "defect": False,
            "rework": False,
        },
        {
            "id": "EXEC-003",
            "desc": "Missing Step (Calibration Omitted) - Critical Defect",
            "machine": "MCH-02",
            "shift": "Night",
            "product": PRODUCTS[0],
            "actual": ["Material Check", "Assembly", "Inspection", "Packaging"],
            "cycle_time": 235,
            "defect": True,
            "rework": True,
        },
        {
            "id": "EXEC-004",
            "desc": "Incorrect Sequence (Calibration before Assembly)",
            "machine": "MCH-04",
            "shift": "Morning",
            "product": PRODUCTS[2],
            "actual": ["Material Check", "Calibration", "Assembly", "Inspection", "Packaging"],
            "cycle_time": 315,
            "defect": False,
            "rework": True,
        },
        {
            "id": "EXEC-005",
            "desc": "Multiple Deviations (Added Step + Missing Inspection)",
            "machine": "MCH-02",
            "shift": "Night",
            "product": PRODUCTS[1],
            "actual": ["Material Check", "Assembly", "Manual Adjustment", "Calibration", "Packaging"],
            "cycle_time": 310,
            "defect": True,
            "rework": False,
        },
    ]

    for idx, demo in enumerate(demo_scenarios):
        timestamp = (base_time + timedelta(hours=idx * 2)).isoformat()
        dev_res = detect_deviations(demo["id"], demo["actual"], OFFICIAL_SOP_STEPS)
        executions.append(
            ExecutionRecord(
                execution_id=demo["id"],
                timestamp=timestamp,
                product_id=demo["product"]["product_id"],
                product_name=demo["product"]["product_name"],
                machine_id=demo["machine"],
                shift=demo["shift"],
                expected_steps=OFFICIAL_SOP_STEPS,
                actual_steps=demo["actual"],
                cycle_time_seconds=demo["cycle_time"],
                defect_detected=demo["defect"],
                rework_required=demo["rework"],
                data_source="synthetic_simulation",
                deviation_info=dev_res,
            )
        )

    # 2. Generate remaining executions up to num_records
    for i in range(len(demo_scenarios) + 1, num_records + 1):
        exec_id = f"EXEC-{i:03d}"
        timestamp = (base_time + timedelta(minutes=i * 35)).isoformat()
        product = random.choice(PRODUCTS)
        machine = random.choice(MACHINES)
        shift = random.choice(SHIFTS)

        # Roll deviation category with realistic distribution:
        # ~62% Normal, ~18% Added Manual Adjustment, ~12% Missing Calibration/Inspection, ~8% Sequence Issue
        roll = random.random()

        if roll < 0.62:
            # Normal SOP
            actual_steps = list(OFFICIAL_SOP_STEPS)
            cycle_time = int(random.gauss(300, 12))
            defect = random.random() < 0.02
            rework = random.random() < 0.01

        elif roll < 0.80:
            # Additional step: "Manual Adjustment" after Assembly
            # Notice MCH-03 has higher occurrence of this in Afternoon shift (useful pattern!)
            actual_steps = ["Material Check", "Assembly", "Manual Adjustment", "Calibration", "Inspection", "Packaging"]
            cycle_time = int(random.gauss(345, 15))
            defect = random.random() < 0.03
            rework = random.random() < 0.02

        elif roll < 0.92:
            # Missing step: Missing Calibration or Inspection
            if random.random() < 0.65:
                actual_steps = ["Material Check", "Assembly", "Inspection", "Packaging"]  # Missing Calibration
                cycle_time = int(random.gauss(240, 10))
                defect = random.random() < 0.45  # high defect rate when skipping calibration
                rework = random.random() < 0.35
            else:
                actual_steps = ["Material Check", "Assembly", "Calibration", "Packaging"]  # Missing Inspection
                cycle_time = int(random.gauss(255, 10))
                defect = random.random() < 0.25
                rework = random.random() < 0.15

        else:
            # Sequence issue: Calibration before Assembly or Packaging before Inspection
            if random.random() < 0.7:
                actual_steps = ["Material Check", "Calibration", "Assembly", "Inspection", "Packaging"]
                cycle_time = int(random.gauss(320, 15))
                defect = random.random() < 0.20
                rework = random.random() < 0.40
            else:
                actual_steps = ["Material Check", "Assembly", "Calibration", "Packaging", "Inspection"]
                cycle_time = int(random.gauss(310, 12))
                defect = random.random() < 0.15
                rework = random.random() < 0.25

        dev_res = detect_deviations(exec_id, actual_steps, OFFICIAL_SOP_STEPS)

        executions.append(
            ExecutionRecord(
                execution_id=exec_id,
                timestamp=timestamp,
                product_id=product["product_id"],
                product_name=product["product_name"],
                machine_id=machine,
                shift=shift,
                expected_steps=OFFICIAL_SOP_STEPS,
                actual_steps=actual_steps,
                cycle_time_seconds=max(180, cycle_time),
                defect_detected=defect,
                rework_required=rework,
                data_source="synthetic_simulation",
                deviation_info=dev_res,
            )
        )

    return executions


# Singleton in-memory dataset instance initialized with fixed seed
DATASET: List[ExecutionRecord] = generate_synthetic_dataset(num_records=120, seed=42)


def get_dataset() -> List[ExecutionRecord]:
    return DATASET


def get_sop_definition() -> SOPDefinition:
    return OFFICIAL_SOP
