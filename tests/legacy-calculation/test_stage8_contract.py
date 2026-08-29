from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator


ROOT = Path(__file__).resolve().parents[2]


class Stage8ContractTests(unittest.TestCase):
    def test_calculation_result_schema_is_canonical_draft_2020_12(self) -> None:
        schema = json.loads(
            (ROOT / "contracts/legacy-apps-script/calculation-result.schema.json").read_text(
                encoding="utf-8"
            )
        )
        Draft202012Validator.check_schema(schema)
        self.assertEqual("calculation-result-v1", schema["properties"]["result_schema_version"]["const"])
        self.assertFalse(schema["additionalProperties"])

    def test_all_stage8_generated_artifacts_are_current(self) -> None:
        for tool in (
            "generate_calculation_result_schema.py",
            "generate_module_size_rules.py",
            "generate_stage8_layout_golden.py",
        ):
            result = subprocess.run(
                [sys.executable, str(ROOT / "tools" / tool), "--check"],
                cwd=ROOT,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(0, result.returncode, result.stdout + result.stderr)

    def test_shared_layout_golden_is_explicitly_python_reference_generated(self) -> None:
        fixture = json.loads(
            (ROOT / "fixtures/legacy/stage8-layout-golden.json").read_text(encoding="utf-8")
        )
        self.assertEqual("legacy/calculation_model/layout_configurator.py", fixture["reference"])
        self.assertEqual(
            {
                "rational_combination_with_filler",
                "mandatory_dishwasher_slot",
                "specialized_width_not_generic",
                "explicit_specialized_cargo",
                "no_valid_layout",
            },
            {scenario["name"] for scenario in fixture["scenarios"]},
        )


if __name__ == "__main__":
    unittest.main()
