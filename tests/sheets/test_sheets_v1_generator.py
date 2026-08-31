from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from tools.generate_sheets_v1_manifest import (
    CONTRACTS_DIR,
    DEFAULT_OUTPUT,
    build_manifest,
    render_manifest,
)

ROOT = Path(__file__).resolve().parents[2]
EXPECTED_SHEETS = ["Prices", "Construction_Defaults", "BOM_LAST", "CALC_LOG", "SYSTEM"]


class SheetsV1GeneratorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.manifest = build_manifest()

    def test_manifest_contains_exactly_five_sheets(self) -> None:
        self.assertEqual(EXPECTED_SHEETS, self.manifest["sheet_order"])
        self.assertEqual(EXPECTED_SHEETS, [sheet["sheet_name"] for sheet in self.manifest["sheets"]])
        self.assertEqual([1, 2, 3, 4, 5], [sheet["order"] for sheet in self.manifest["sheets"]])

    def test_contract_file_for_each_sheet_exists(self) -> None:
        declaration = json.loads((CONTRACTS_DIR / "SHEETS_V1.json").read_text(encoding="utf-8"))
        for entry in declaration["sheets"]:
            contract_path = CONTRACTS_DIR / entry["contract_file"]
            self.assertTrue(contract_path.is_file(), f"contract file missing: {contract_path}")
            contract = json.loads(contract_path.read_text(encoding="utf-8"))
            self.assertEqual(entry["sheet_name"], contract["sheet_name"])

    def test_generator_output_is_deterministic(self) -> None:
        first = render_manifest(build_manifest())
        second = render_manifest(build_manifest())
        self.assertEqual(first, second)
        with tempfile.TemporaryDirectory() as tmp:
            output_a = Path(tmp) / "a.gs"
            output_b = Path(tmp) / "b.gs"
            run_a = subprocess.run(
                [sys.executable, "tools/generate_sheets_v1_manifest.py", "--output", str(output_a)],
                cwd=ROOT, text=True, capture_output=True, check=False,
            )
            run_b = subprocess.run(
                [sys.executable, "tools/generate_sheets_v1_manifest.py", "--output", str(output_b)],
                cwd=ROOT, text=True, capture_output=True, check=False,
            )
            self.assertEqual(0, run_a.returncode, run_a.stdout + run_a.stderr)
            self.assertEqual(0, run_b.returncode, run_b.stdout + run_b.stderr)
            self.assertEqual(output_a.read_bytes(), output_b.read_bytes())

    def test_check_passes_after_generation(self) -> None:
        regenerate = subprocess.run(
            [sys.executable, "tools/generate_sheets_v1_manifest.py"],
            cwd=ROOT, text=True, capture_output=True, check=False,
        )
        self.assertEqual(0, regenerate.returncode, regenerate.stdout + regenerate.stderr)
        check = subprocess.run(
            [sys.executable, "tools/generate_sheets_v1_manifest.py", "--check"],
            cwd=ROOT, text=True, capture_output=True, check=False,
        )
        self.assertEqual(0, check.returncode, check.stdout + check.stderr)
        self.assertEqual(render_manifest(self.manifest), DEFAULT_OUTPUT.read_text(encoding="utf-8"))

    def test_check_fails_for_stale_output(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "sheets_v1_manifest.gs"
            regenerate = subprocess.run(
                [sys.executable, "tools/generate_sheets_v1_manifest.py", "--output", str(output)],
                cwd=ROOT, text=True, capture_output=True, check=False,
            )
            self.assertEqual(0, regenerate.returncode, regenerate.stdout + regenerate.stderr)
            current = output.read_text(encoding="utf-8")
            self.assertEqual(render_manifest(self.manifest), current)
            output.write_text("// stale content\n", encoding="utf-8")
            stale = subprocess.run(
                [sys.executable, "tools/generate_sheets_v1_manifest.py", "--check", "--output", str(output)],
                cwd=ROOT, text=True, capture_output=True, check=False,
            )
            self.assertEqual(1, stale.returncode, stale.stdout + stale.stderr)

    def test_generated_apps_script_contains_all_sheet_names(self) -> None:
        text = DEFAULT_OUTPUT.read_text(encoding="utf-8")
        self.assertIn("var SHEETS_V1_MANIFEST =", text)
        for name in EXPECTED_SHEETS:
            self.assertIn(f'"{name}"', text)

    def test_hidden_and_visible_metadata_is_preserved(self) -> None:
        by_name = {sheet["sheet_name"]: sheet for sheet in self.manifest["sheets"]}
        contract_files = {
            "Prices": "PRICES_V1.json",
            "Construction_Defaults": "CONSTRUCTION_DEFAULTS_V1.json",
            "BOM_LAST": "BOM_LAST_V1.json",
            "CALC_LOG": "CALC_LOG_V1.json",
            "SYSTEM": "SYSTEM_V1.json",
        }
        for sheet_name, contract_file in contract_files.items():
            contract = json.loads((CONTRACTS_DIR / contract_file).read_text(encoding="utf-8"))
            expected_visibility = {column["name"]: column["visibility"] for column in contract["columns"]}
            actual_visibility = {column["name"]: column["visibility"] for column in by_name[sheet_name]["columns"]}
            self.assertEqual(expected_visibility, actual_visibility, sheet_name)
        prices = by_name["Prices"]
        hidden = {column["name"] for column in prices["columns"] if column["visibility"] == "HIDDEN"}
        self.assertEqual({"item_id"}, hidden)
        system = by_name["SYSTEM"]
        self.assertTrue(all(column["visibility"] == "HIDDEN" for column in system["columns"]))

    def test_allowed_keys_only_for_system(self) -> None:
        for sheet in self.manifest["sheets"]:
            if sheet["sheet_name"] == "SYSTEM":
                self.assertIn("allowed_keys", sheet)
                self.assertEqual(13, len(sheet["allowed_keys"]))
            else:
                self.assertNotIn("allowed_keys", sheet)


if __name__ == "__main__":
    unittest.main()