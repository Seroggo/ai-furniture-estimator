from __future__ import annotations

import csv
import tempfile
import unittest
from pathlib import Path

from calculation_model.calculation_engine import RULE_STATUSES
from tools.validate_sheets_schema import DEFAULT_COLUMNS, DEFAULT_RELATIONS, validate_schema

SCHEMA_DOC = DEFAULT_COLUMNS.parent / "google-sheets-schema.md"


class SheetsSchemaValidatorTests(unittest.TestCase):
    def _rows(self, path: Path) -> tuple[list[str], list[dict[str, str]]]:
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            return list(reader.fieldnames or ()), list(reader)

    def _write(self, path: Path, fields: list[str], rows: list[dict[str, str]]) -> None:
        with path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)

    def _mutated_errors(self, *, column_mutator=None, relation_mutator=None) -> list[str]:
        column_fields, columns = self._rows(DEFAULT_COLUMNS)
        relation_fields, relations = self._rows(DEFAULT_RELATIONS)
        if column_mutator:
            column_mutator(column_fields, columns)
        if relation_mutator:
            relation_mutator(relation_fields, relations)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            columns_path = root / "columns.csv"
            relations_path = root / "relations.csv"
            self._write(columns_path, column_fields, columns)
            self._write(relations_path, relation_fields, relations)
            return validate_schema(columns_path, relations_path)

    def assertHasError(self, errors: list[str], fragment: str) -> None:
        self.assertTrue(any(fragment in error for error in errors), errors)

    def test_canonical_schema_is_valid(self) -> None:
        self.assertEqual([], validate_schema(DEFAULT_COLUMNS, DEFAULT_RELATIONS))

    def test_canonical_sheets_and_stage_3_statuses_are_preserved(self) -> None:
        _, columns = self._rows(DEFAULT_COLUMNS)
        self.assertEqual(
            {
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
            },
            {row["sheet_name"] for row in columns},
        )
        status_column = next(
            row
            for row in columns
            if row["sheet_name"] == "Calculation_Rules" and row["column_name"] == "rule_status"
        )
        self.assertEqual(set(RULE_STATUSES), set(status_column["enum_values"].split("|")))

    def test_spr_price_contract_and_pricing_modes(self) -> None:
        _, columns = self._rows(DEFAULT_COLUMNS)
        working = {
            row["column_name"]: row for row in columns if row["sheet_name"] == "spr_price"
        }
        self.assertEqual(17, len(working))
        self.assertEqual("true", working["working_price_id"]["unique"])
        self.assertEqual("true", working["price_code"]["unique"])
        self.assertEqual("Catalog_Items", working["price_code"]["reference_sheet"])
        self.assertEqual("Catalog_Items", working["catalog_item_code"]["reference_sheet"])
        self.assertEqual(
            {"MANUAL_RUB", "FX_AUTO", "FX_MANUAL"},
            set(working["pricing_mode"]["enum_values"].split("|")),
        )
        self.assertIn("required_for(FX_MANUAL)", working["fx_rate_manual"]["validation"])
        self.assertIn("required_for(FX_AUTO)", working["fx_rate_current"]["validation"])
        self.assertIn("required_for(FX_AUTO,FX_MANUAL)", working["source_price"]["validation"])
        self.assertIn("blank_for(MANUAL_RUB)", working["source_currency"]["validation"])

    def test_published_prices_capture_immutable_fx_provenance(self) -> None:
        _, columns = self._rows(DEFAULT_COLUMNS)
        prices = {row["column_name"]: row for row in columns if row["sheet_name"] == "Prices"}
        for column in (
            "source_currency",
            "source_price",
            "fx_rate_used",
            "fx_rate_source",
            "price_derivation_mode",
        ):
            self.assertEqual("true", prices[column]["required"], column)
        self.assertEqual(
            {"MANUAL_RUB", "FX_AUTO", "FX_MANUAL"},
            set(prices["price_derivation_mode"]["enum_values"].split("|")),
        )

    def test_publication_and_reprice_policy_is_documented(self) -> None:
        document = SCHEMA_DOC.read_text(encoding="utf-8")
        for contract_text in (
            "spr_price (mutable working current prices)",
            "new immutable Prices rows",
            "GOOGLEFINANCE",
            "ORIGINAL",
            "CURRENT_REPRICE",
            "latest applicable ACTIVE pricebook",
            "не выполняет новый layout, BOM или quantity calculation",
        ):
            self.assertIn(contract_text, document)

    def test_quantity_model_and_pricebook_columns_are_separate(self) -> None:
        _, columns = self._rows(DEFAULT_COLUMNS)
        by_sheet = {
            sheet: {row["column_name"] for row in columns if row["sheet_name"] == sheet}
            for sheet in ("Module_Recipe_Items", "Prices")
        }
        self.assertIn("quantity_rule_id", by_sheet["Module_Recipe_Items"])
        self.assertIn("price_code", by_sheet["Module_Recipe_Items"])
        self.assertNotIn("unit_price", by_sheet["Module_Recipe_Items"])
        self.assertIn("unit_price", by_sheet["Prices"])
        self.assertNotIn("quantity_value", by_sheet["Prices"])

    def test_duplicate_sheet_column_is_detected(self) -> None:
        errors = self._mutated_errors(column_mutator=lambda fields, rows: rows.append(rows[0].copy()))
        self.assertHasError(errors, "duplicate sheet/column")

    def test_duplicate_column_order_is_detected(self) -> None:
        def mutate(fields, rows):
            rows[1]["column_order"] = rows[0]["column_order"]

        self.assertHasError(self._mutated_errors(column_mutator=mutate), "duplicate column order")

    def test_missing_required_schema_field_is_detected(self) -> None:
        def mutate(fields, rows):
            fields.remove("description")
            for row in rows:
                row.pop("description")

        self.assertHasError(self._mutated_errors(column_mutator=mutate), "missing required schema fields")

    def test_missing_reference_target_is_detected(self) -> None:
        def mutate(fields, rows):
            row = next(row for row in rows if row["reference_sheet"])
            row["reference_column"] = "missing_column"

        self.assertHasError(self._mutated_errors(column_mutator=mutate), "reference target does not exist")

    def test_relation_to_missing_column_is_detected(self) -> None:
        def mutate(fields, rows):
            rows[0]["to_column"] = "missing_column"

        self.assertHasError(self._mutated_errors(relation_mutator=mutate), "to column does not exist")

    def test_relation_target_must_be_unique(self) -> None:
        def mutate(fields, rows):
            target = next(
                row
                for row in rows
                if row["sheet_name"] == "Module_Recipes" and row["column_name"] == "recipe_id"
            )
            target["unique"] = "false"

        self.assertHasError(self._mutated_errors(column_mutator=mutate), "reference target is not unique")

    def test_invalid_data_type_is_detected(self) -> None:
        def mutate(fields, rows):
            rows[0]["data_type"] = "money"

        self.assertHasError(self._mutated_errors(column_mutator=mutate), "invalid data type")

    def test_invalid_boolean_is_detected(self) -> None:
        def mutate(fields, rows):
            rows[0]["required"] = "yes"

        self.assertHasError(self._mutated_errors(column_mutator=mutate), "invalid boolean required")

    def test_unknown_cardinality_is_detected(self) -> None:
        def mutate(fields, rows):
            rows[0]["cardinality"] = "lots"

        self.assertHasError(self._mutated_errors(relation_mutator=mutate), "invalid/unknown cardinality")

    def test_entity_without_stable_key_is_detected(self) -> None:
        def mutate(fields, rows):
            for row in rows:
                if row["sheet_name"] == "Schema_Meta" and row["column_name"] == "schema_version_id":
                    row["unique"] = "false"

        self.assertHasError(self._mutated_errors(column_mutator=mutate), "has no unique stable string key")

    def test_missing_spr_price_contract_column_is_detected(self) -> None:
        def mutate(fields, rows):
            rows[:] = [
                row
                for row in rows
                if not (row["sheet_name"] == "spr_price" and row["column_name"] == "current_price_rub")
            ]

        self.assertHasError(
            self._mutated_errors(column_mutator=mutate),
            "spr_price missing required column: current_price_rub",
        )

    def test_invalid_pricing_mode_contract_is_detected(self) -> None:
        def mutate(fields, rows):
            row = next(
                row
                for row in rows
                if row["sheet_name"] == "spr_price" and row["column_name"] == "pricing_mode"
            )
            row["enum_values"] = "MANUAL_RUB|FX_AUTO"

        self.assertHasError(
            self._mutated_errors(column_mutator=mutate),
            "pricing_mode must be MANUAL_RUB|FX_AUTO|FX_MANUAL",
        )

    def test_missing_mode_specific_validation_is_detected(self) -> None:
        def mutate(fields, rows):
            row = next(
                row
                for row in rows
                if row["sheet_name"] == "spr_price" and row["column_name"] == "fx_rate_manual"
            )
            row["validation"] = "number > 0"

        self.assertHasError(
            self._mutated_errors(column_mutator=mutate),
            "fx_rate_manual validation lacks required_for(FX_MANUAL)",
        )

    def test_missing_published_provenance_is_detected(self) -> None:
        def mutate(fields, rows):
            rows[:] = [
                row
                for row in rows
                if not (row["sheet_name"] == "Prices" and row["column_name"] == "fx_rate_used")
            ]

        self.assertHasError(
            self._mutated_errors(column_mutator=mutate),
            "Prices missing immutable provenance column: fx_rate_used",
        )


if __name__ == "__main__":
    unittest.main()
