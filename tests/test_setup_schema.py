from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path

from tools.generate_setup_schema import DEFAULT_OUTPUT, build_manifest, render_manifest


ROOT = Path(__file__).resolve().parents[1]
SETUP_SCRIPT = ROOT / "apps-script" / "setup_system.gs"
CANONICAL_SHEETS = [
    "Schema_Meta",
    "System_Config",
    "Module_Size_Rules",
    "Module_Recipes",
    "Module_Recipe_Items",
    "Catalog_Items",
    "spr_price",
    "Pricebook_Versions",
    "Prices",
    "Calculation_Rules",
    "Reference_Values",
]


class SetupSchemaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.manifest = build_manifest()

    def test_manifest_has_exact_canonical_sheet_and_column_order(self) -> None:
        self.assertEqual(CANONICAL_SHEETS, self.manifest["sheetOrder"])
        self.assertEqual(
            CANONICAL_SHEETS,
            [sheet["name"] for sheet in self.manifest["sheets"]],
        )
        columns = [
            (sheet["name"], column["name"])
            for sheet in self.manifest["sheets"]
            for column in sheet["columns"]
        ]
        self.assertEqual(136, len(columns))
        self.assertEqual(136, len(set(columns)))
        for sheet in self.manifest["sheets"]:
            self.assertEqual(
                list(range(1, len(sheet["columns"]) + 1)),
                [column["order"] for column in sheet["columns"]],
            )

    def test_generated_manifest_is_current(self) -> None:
        self.assertTrue(DEFAULT_OUTPUT.is_file())
        self.assertEqual(
            render_manifest(self.manifest),
            DEFAULT_OUTPUT.read_text(encoding="utf-8"),
        )

    def test_validation_references_resolve_to_known_fields(self) -> None:
        known = {
            (sheet["name"], column["name"])
            for sheet in self.manifest["sheets"]
            for column in sheet["columns"]
        }
        for sheet in self.manifest["sheets"]:
            for column in sheet["columns"]:
                if column["referenceSheet"]:
                    self.assertIn(
                        (column["referenceSheet"], column["referenceColumn"]),
                        known,
                    )
                self.assertEqual(len(column["enumValues"]), len(set(column["enumValues"])))

    def test_reference_seed_is_only_schema_defined_enum_data(self) -> None:
        expected = {
            (f"{sheet['name']}.{column['name']}", enum_value)
            for sheet in self.manifest["sheets"]
            for column in sheet["columns"]
            for enum_value in column["enumValues"]
        }
        actual = {
            (row["reference_set"], row["reference_code"])
            for row in self.manifest["referenceSeeds"]
        }
        self.assertEqual(expected, actual)
        self.assertEqual(len(actual), len(self.manifest["referenceSeeds"]))

    def test_accepted_stage3_runtime_rules_are_seeded_from_registry(self) -> None:
        seeds = self.manifest["calculationRuleSeeds"]
        self.assertEqual(6, len(seeds))
        self.assertEqual(
            {
                "QTY_AREA_MM_V1",
                "QTY_EDGE_LENGTH_V1",
                "QTY_BASIS_ORDER_V1",
                "QTY_EXPLICIT_SOURCE_V1",
                "COST_UNIT_PRICE_V1",
                "MODULE_TO_PARTS_V1",
            },
            {seed["rule_id"] for seed in seeds},
        )
        module_seed = next(seed for seed in seeds if seed["rule_id"] == "MODULE_TO_PARTS_V1")
        self.assertEqual("BLOCKING_STATUS", module_seed["execution_mode"])
        self.assertEqual("DRAFT", module_seed["lifecycle_status"])
        executable = [seed for seed in seeds if seed["rule_id"] != "MODULE_TO_PARTS_V1"]
        self.assertTrue(all(seed["execution_mode"] == "CODE_BINDING" for seed in executable))
        self.assertTrue(all(seed["lifecycle_status"] == "ACTIVE" for seed in executable))
        self.assertEqual("REQUIRES_EXPERT", module_seed["rule_status"])

    def test_production_sheets_have_no_seed_data(self) -> None:
        serialized = json.dumps(self.manifest, ensure_ascii=False)
        for forbidden in ("production catalog", "historical_unit_price", "current pricebook"):
            self.assertNotIn(forbidden, serialized.lower())
        self.assertNotIn("catalogSeeds", self.manifest)
        self.assertNotIn("priceSeeds", self.manifest)
        self.assertNotIn("recipeSeeds", self.manifest)

    def test_setup_script_uses_manifest_and_has_safety_guards(self) -> None:
        source = SETUP_SCRIPT.read_text(encoding="utf-8")
        self.assertIn("function setupSystem()", source)
        self.assertIn("STAGE5_SCHEMA_MANIFEST", source)
        self.assertIn("Incompatible headers in non-empty sheet", source)
        self.assertIn("Unknown sheets must be removed manually", source)
        self.assertNotIn("GOOGLEFINANCE(", source)

    def _evaluate_setup_expression(self, expression: str) -> str:
        node_script = (
            "const fs=require('fs');const vm=require('vm');"
            "vm.runInThisContext(fs.readFileSync('apps-script/setup_system.gs','utf8'));"
            f"process.stdout.write(String({expression}));"
        )
        result = subprocess.run(
            ["node", "-e", node_script],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        return result.stdout

    def test_integer_validation_formula_is_locale_neutral_for_russia(self) -> None:
        minimum_one = self._evaluate_setup_expression("integerValidationFormula_(3,1)")
        minimum_zero = self._evaluate_setup_expression("integerValidationFormula_(5,0)")
        self.assertEqual("=ISNUMBER(C2)*(C2=INT(C2))*(C2>=1)=1", minimum_one)
        self.assertEqual("=ISNUMBER(E2)*(E2=INT(E2))*(E2>=0)=1", minimum_zero)
        for formula in (minimum_one, minimum_zero):
            self.assertNotIn(",", formula)
            self.assertNotIn(";", formula)
            self.assertIn("ISNUMBER", formula)
            self.assertIn("=INT(", formula)

    def test_custom_formula_audit_is_controlled(self) -> None:
        source = SETUP_SCRIPT.read_text(encoding="utf-8")
        self.assertEqual(1, source.count("requireFormulaSatisfied("))
        self.assertIn("integerValidationFormula_(column.order, integerMinimum)", source)
        self.assertNotIn("=AND(", source)
        self.assertNotIn("=OR(", source)
        self.assertNotIn("=IF(", source)
        self.assertNotIn("=IFERROR(", source)

    def test_non_integer_strict_validations_are_preserved(self) -> None:
        source = SETUP_SCRIPT.read_text(encoding="utf-8")
        for contract in (
            ".setAllowInvalid(false)",
            "requireValueInList(",
            "requireValueInRange(",
            "requireCheckbox()",
            "requireNumberGreaterThan(0)",
            "requireNumberGreaterThanOrEqualTo(0)",
            "requireDate()",
        ):
            self.assertIn(contract, source)

    def test_generator_check_command_passes(self) -> None:
        result = subprocess.run(
            [sys.executable, "tools/generate_setup_schema.py", "--check"],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
