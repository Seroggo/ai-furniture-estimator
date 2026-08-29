"""Validate the Stage 4 machine-readable Google Sheets schema artifacts."""

from __future__ import annotations

import argparse
import csv
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_COLUMNS = ROOT / "archive" / "stages" / "stage-4-google-sheets" / "sheets-columns.csv"
DEFAULT_RELATIONS = ROOT / "archive" / "stages" / "stage-4-google-sheets" / "sheets-relations.csv"

COLUMN_FIELDS = (
    "sheet_name",
    "column_order",
    "column_name",
    "data_type",
    "required",
    "unique",
    "default_value",
    "enum_values",
    "reference_sheet",
    "reference_column",
    "validation",
    "description",
)
RELATION_FIELDS = (
    "relation_id",
    "from_sheet",
    "from_column",
    "to_sheet",
    "to_column",
    "cardinality",
    "required",
    "validation_policy",
    "description",
)
ALLOWED_DATA_TYPES = {"string", "integer", "decimal", "boolean", "date", "datetime", "json"}
ALLOWED_BOOLEANS = {"true", "false"}
ALLOWED_CARDINALITIES = {"many_to_one", "one_to_many", "one_to_one", "optional_many_to_one"}

PRICE_PATCH_SHEETS = {
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
}
PRICING_MODES = {"MANUAL_RUB", "FX_AUTO", "FX_MANUAL"}
SPR_PRICE_COLUMNS = {
    "working_price_id": ("string", "true", "true"),
    "price_code": ("string", "true", "true"),
    "catalog_item_code": ("string", "true", "false"),
    "display_name": ("string", "true", "false"),
    "unit": ("string", "true", "false"),
    "pricing_mode": ("string", "true", "false"),
    "source_currency": ("string", "false", "false"),
    "source_price": ("decimal", "false", "false"),
    "fx_rate_source": ("string", "false", "false"),
    "fx_rate_manual": ("decimal", "false", "false"),
    "fx_rate_current": ("decimal", "false", "false"),
    "fx_rate_used_preview": ("decimal", "false", "false"),
    "current_price_rub": ("decimal", "true", "false"),
    "status": ("string", "true", "false"),
    "source_ref": ("string", "false", "false"),
    "updated_at": ("datetime", "true", "false"),
    "notes": ("string", "false", "false"),
}
PUBLISHED_PROVENANCE_COLUMNS = {
    "source_currency": "string",
    "source_price": "decimal",
    "fx_rate_used": "decimal",
    "fx_rate_source": "string",
    "price_derivation_mode": "string",
}


def _read_csv(path: Path, required_fields: tuple[str, ...], label: str) -> tuple[list[dict[str, str]], list[str]]:
    errors: list[str] = []
    if not path.is_file():
        return [], [f"{label}: file does not exist: {path}"]
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        actual = tuple(reader.fieldnames or ())
        missing = [field for field in required_fields if field not in actual]
        extra = [field for field in actual if field not in required_fields]
        if missing:
            errors.append(f"{label}: missing required schema fields: {', '.join(missing)}")
        if extra:
            errors.append(f"{label}: unknown schema fields: {', '.join(extra)}")
        rows = list(reader)
    if not rows:
        errors.append(f"{label}: no schema rows")
    return rows, errors


def validate_schema(columns_path: Path, relations_path: Path) -> list[str]:
    """Return deterministic human-readable errors; an empty list means valid."""

    columns, errors = _read_csv(columns_path, COLUMN_FIELDS, "columns")
    relations, relation_errors = _read_csv(relations_path, RELATION_FIELDS, "relations")
    errors.extend(relation_errors)

    column_keys: set[tuple[str, str]] = set()
    unique_column_keys: set[tuple[str, str]] = set()
    sheets: dict[str, set[str]] = defaultdict(set)
    orders: dict[str, set[int]] = defaultdict(set)
    unique_string_columns: dict[str, list[str]] = defaultdict(list)

    for row_number, row in enumerate(columns, start=2):
        prefix = f"columns row {row_number}"
        missing_values = [field for field in ("sheet_name", "column_order", "column_name", "data_type", "required", "unique", "validation", "description") if not row.get(field, "").strip()]
        if missing_values:
            errors.append(f"{prefix}: empty required values: {', '.join(missing_values)}")

        sheet = row.get("sheet_name", "").strip()
        column = row.get("column_name", "").strip()
        key = (sheet, column)
        if key in column_keys:
            errors.append(f"{prefix}: duplicate sheet/column: {sheet}.{column}")
        column_keys.add(key)
        sheets[sheet].add(column)

        raw_order = row.get("column_order", "").strip()
        try:
            order = int(raw_order)
            if order < 1:
                raise ValueError
            if order in orders[sheet]:
                errors.append(f"{prefix}: duplicate column order {order} in {sheet}")
            orders[sheet].add(order)
        except ValueError:
            errors.append(f"{prefix}: invalid positive column_order: {raw_order!r}")

        data_type = row.get("data_type", "").strip()
        if data_type not in ALLOWED_DATA_TYPES:
            errors.append(f"{prefix}: invalid data type: {data_type!r}")
        for field in ("required", "unique"):
            value = row.get(field, "").strip()
            if value not in ALLOWED_BOOLEANS:
                errors.append(f"{prefix}: invalid boolean {field}: {value!r}")

        if row.get("unique", "").strip() == "true" and data_type == "string":
            unique_string_columns[sheet].append(column)
        if row.get("unique", "").strip() == "true":
            unique_column_keys.add(key)

        reference_sheet = row.get("reference_sheet", "").strip()
        reference_column = row.get("reference_column", "").strip()
        if bool(reference_sheet) != bool(reference_column):
            errors.append(f"{prefix}: reference_sheet and reference_column must be set together")

    for sheet in sorted(sheets):
        expected_orders = set(range(1, len(sheets[sheet]) + 1))
        if orders[sheet] != expected_orders:
            errors.append(f"sheet {sheet}: column orders must be contiguous from 1")
        stable_keys = [
            column
            for column in unique_string_columns[sheet]
            if column.endswith("_id") or column.endswith("_code")
        ]
        if not stable_keys:
            errors.append(f"sheet {sheet}: entity has no unique stable string key")

    for row_number, row in enumerate(columns, start=2):
        reference_sheet = row.get("reference_sheet", "").strip()
        reference_column = row.get("reference_column", "").strip()
        if reference_sheet and (reference_sheet, reference_column) not in column_keys:
            errors.append(
                f"columns row {row_number}: reference target does not exist: "
                f"{reference_sheet}.{reference_column}"
            )
        elif reference_sheet and (reference_sheet, reference_column) not in unique_column_keys:
            errors.append(
                f"columns row {row_number}: reference target is not unique: "
                f"{reference_sheet}.{reference_column}"
            )

    relation_ids: set[str] = set()
    declared_relation_keys: set[tuple[str, str, str, str]] = set()
    for row_number, row in enumerate(relations, start=2):
        prefix = f"relations row {row_number}"
        missing_values = [field for field in RELATION_FIELDS if not row.get(field, "").strip()]
        if missing_values:
            errors.append(f"{prefix}: empty required values: {', '.join(missing_values)}")

        relation_id = row.get("relation_id", "").strip()
        if relation_id in relation_ids:
            errors.append(f"{prefix}: duplicate relation_id: {relation_id}")
        relation_ids.add(relation_id)

        cardinality = row.get("cardinality", "").strip()
        if cardinality not in ALLOWED_CARDINALITIES:
            errors.append(f"{prefix}: invalid/unknown cardinality: {cardinality!r}")
        required = row.get("required", "").strip()
        if required not in ALLOWED_BOOLEANS:
            errors.append(f"{prefix}: invalid boolean required: {required!r}")

        from_key = (row.get("from_sheet", "").strip(), row.get("from_column", "").strip())
        to_key = (row.get("to_sheet", "").strip(), row.get("to_column", "").strip())
        if from_key not in column_keys:
            errors.append(f"{prefix}: from column does not exist: {from_key[0]}.{from_key[1]}")
        if to_key not in column_keys:
            errors.append(f"{prefix}: to column does not exist: {to_key[0]}.{to_key[1]}")
        elif to_key not in unique_column_keys:
            errors.append(f"{prefix}: to column is not unique: {to_key[0]}.{to_key[1]}")
        declared_relation_keys.add((*from_key, *to_key))

    for row_number, row in enumerate(columns, start=2):
        reference_sheet = row.get("reference_sheet", "").strip()
        reference_column = row.get("reference_column", "").strip()
        if not reference_sheet:
            continue
        relation_key = (
            row.get("sheet_name", "").strip(),
            row.get("column_name", "").strip(),
            reference_sheet,
            reference_column,
        )
        if relation_key not in declared_relation_keys:
            errors.append(
                f"columns row {row_number}: reference has no relation declaration: "
                f"{relation_key[0]}.{relation_key[1]} -> {relation_key[2]}.{relation_key[3]}"
            )

    rows_by_key = {
        (row.get("sheet_name", "").strip(), row.get("column_name", "").strip()): row
        for row in columns
    }
    actual_sheets = {row.get("sheet_name", "").strip() for row in columns}
    missing_patch_sheets = sorted(PRICE_PATCH_SHEETS - actual_sheets)
    extra_patch_sheets = sorted(actual_sheets - PRICE_PATCH_SHEETS)
    if missing_patch_sheets:
        errors.append(f"price patch: missing required sheets: {', '.join(missing_patch_sheets)}")
    if extra_patch_sheets:
        errors.append(f"price patch: unexpected sheets: {', '.join(extra_patch_sheets)}")

    for column, expected in SPR_PRICE_COLUMNS.items():
        row = rows_by_key.get(("spr_price", column))
        if row is None:
            errors.append(f"price patch: spr_price missing required column: {column}")
            continue
        actual = tuple(row.get(field, "").strip() for field in ("data_type", "required", "unique"))
        if actual != expected:
            errors.append(
                f"price patch: invalid spr_price contract for {column}: "
                f"expected type/required/unique={expected}, got {actual}"
            )

    pricing_mode = rows_by_key.get(("spr_price", "pricing_mode"))
    if pricing_mode is not None:
        actual_modes = set(pricing_mode.get("enum_values", "").split("|"))
        if actual_modes != PRICING_MODES:
            errors.append("price patch: pricing_mode must be MANUAL_RUB|FX_AUTO|FX_MANUAL")
        if "mode_contract(" not in pricing_mode.get("validation", ""):
            errors.append("price patch: pricing_mode lacks mode-specific field contract")

    mode_validation_tokens = {
        "source_currency": ("required_for(FX_AUTO,FX_MANUAL)", "blank_for(MANUAL_RUB)"),
        "source_price": ("required_for(FX_AUTO,FX_MANUAL)", "blank_for(MANUAL_RUB)"),
        "fx_rate_manual": ("required_for(FX_MANUAL)", "blank_for(MANUAL_RUB,FX_AUTO)"),
        "fx_rate_current": ("required_for(FX_AUTO)", "blank_for(MANUAL_RUB)"),
        "fx_rate_used_preview": ("required_for(FX_AUTO,FX_MANUAL)", "blank_for(MANUAL_RUB)"),
    }
    for column, tokens in mode_validation_tokens.items():
        row = rows_by_key.get(("spr_price", column))
        if row is None:
            continue
        validation = row.get("validation", "")
        for token in tokens:
            if token not in validation:
                errors.append(f"price patch: {column} validation lacks {token}")

    for column, data_type in PUBLISHED_PROVENANCE_COLUMNS.items():
        row = rows_by_key.get(("Prices", column))
        if row is None:
            errors.append(f"price patch: Prices missing immutable provenance column: {column}")
            continue
        if row.get("data_type", "").strip() != data_type or row.get("required", "").strip() != "true":
            errors.append(f"price patch: Prices.{column} must be required {data_type}")

    published_mode = rows_by_key.get(("Prices", "price_derivation_mode"))
    if published_mode is not None and set(published_mode.get("enum_values", "").split("|")) != PRICING_MODES:
        errors.append("price patch: Prices.price_derivation_mode must preserve all pricing modes")

    counts = Counter(errors)
    return sorted(error if count == 1 else f"{error} ({count} occurrences)" for error, count in counts.items())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--columns", type=Path, default=DEFAULT_COLUMNS)
    parser.add_argument("--relations", type=Path, default=DEFAULT_RELATIONS)
    args = parser.parse_args()
    errors = validate_schema(args.columns, args.relations)
    if errors:
        print(f"INVALID: {len(errors)} schema error(s)")
        for error in errors:
            print(f"- {error}")
        return 1
    with args.columns.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    sheet_count = len({row["sheet_name"] for row in rows})
    print(f"VALID: {sheet_count} sheets, {len(rows)} columns")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
