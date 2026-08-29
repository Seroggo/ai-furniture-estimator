"""Generate shared Stage 3 Python -> Stage 8 Apps Script layout golden fixtures."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "legacy") not in sys.path:
    sys.path.insert(0, str(ROOT / "legacy"))

from calculation_model import FillerPolicy, LayoutRequest, RequiredModule, compose_layout


TARGET = ROOT / "fixtures" / "legacy" / "stage8-layout-golden.json"


SCENARIOS = [
    {
        "name": "rational_combination_with_filler",
        "request": {"run_length_mm": 2650, "filler_policy": {"min_width_mm": 0, "max_width_mm": 50, "location": "end"}},
    },
    {
        "name": "mandatory_dishwasher_slot",
        "request": {
            "run_length_mm": 2400,
            "required_modules": [{"module_id": "dishwasher", "role": "dishwasher_slot", "module_class": "base_dishwasher_slot", "width_mm": 600, "fixed_position": 1}],
        },
    },
    {
        "name": "specialized_width_not_generic",
        "request": {"run_length_mm": 1350, "filler_policy": {"min_width_mm": 0, "max_width_mm": 150, "location": "end"}},
    },
    {
        "name": "explicit_specialized_cargo",
        "request": {
            "run_length_mm": 1350,
            "required_modules": [{"module_id": "cargo", "role": "narrow_cargo", "module_class": "base_narrow_cargo", "width_mm": 150, "fixed_position": None}],
        },
    },
    {"name": "no_valid_layout", "request": {"run_length_mm": 650}},
]


def request_from_json(value: dict[str, object]) -> LayoutRequest:
    filler = value.get("filler_policy", {})
    return LayoutRequest(
        run_length_mm=int(value["run_length_mm"]),
        zone=str(value.get("zone", "base")),
        run_shape=str(value.get("run_shape", "straight")),
        required_modules=tuple(RequiredModule(**item) for item in value.get("required_modules", [])),
        filler_policy=FillerPolicy(**filler),
    )


def projection(result) -> dict[str, object]:
    return {
        "status": result.status,
        "widths_mm": [item.width_mm for item in result.items],
        "module_classes": [item.module_class for item in result.items],
        "roles": [item.role for item in result.items],
        "required": [item.required for item in result.items],
        "market_ranks": [item.market_rank for item in result.items],
        "entity_types": [item.entity_type for item in result.items],
        "occupied_length_mm": result.occupied_length_mm,
        "remainder_mm": result.remainder_mm,
        "filler_width_mm": result.filler.width_mm if result.filler else None,
    }


def render() -> str:
    output = {"fixture_version": "stage8-layout-golden-v1", "reference": "legacy/calculation_model/layout_configurator.py", "scenarios": []}
    for scenario in SCENARIOS:
        result = compose_layout(request_from_json(scenario["request"]))
        output["scenarios"].append({**scenario, "expected": projection(result)})
    return json.dumps(output, ensure_ascii=False, indent=2) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = render()
    if args.check:
        actual = TARGET.read_text(encoding="utf-8") if TARGET.exists() else ""
        if actual != expected:
            raise SystemExit("Stage 8 layout golden fixture is stale")
        print("Stage 8 layout golden fixture is current")
        return
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(expected, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
