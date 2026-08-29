"""Generate the Stage 5 Apps Script manifest from accepted Stage 4 artifacts."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "legacy") not in sys.path:
    sys.path.insert(0, str(ROOT / "legacy"))
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from calculation_model.calculation_engine import get_rule  # noqa: E402
from tools.validate_sheets_schema import (  # noqa: E402
    DEFAULT_COLUMNS,
    DEFAULT_RELATIONS,
    validate_schema,
)


DEFAULT_OUTPUT = ROOT / "apps-script" / "generated" / "schema_manifest.gs"
SCHEMA_VERSION_ID = "SCHEMA_STAGE4_PRICE_PATCH_V1"
SCHEMA_NAME = "calculation_database"
SCHEMA_VERSION = 1
COMPATIBLE_RUNTIME_VERSION = "stage-5-setup-v1"


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def _stable_token(value: str) -> str:
    token = re.sub(r"[^A-Za-z0-9]+", "_", value).strip("_").upper()
    if not token or not token[0].isalpha():
        token = f"V_{token}"
    return token


def build_manifest(
    columns_path: Path = DEFAULT_COLUMNS,
    relations_path: Path = DEFAULT_RELATIONS,
) -> dict[str, object]:
    """Build one deterministic setup definition from the accepted CSV schema."""

    errors = validate_schema(columns_path, relations_path)
    if errors:
        raise ValueError("Canonical schema is invalid:\n- " + "\n- ".join(errors))

    column_rows = _read_csv(columns_path)
    relation_rows = _read_csv(relations_path)
    sheet_order = list(dict.fromkeys(row["sheet_name"] for row in column_rows))
    sheets: list[dict[str, object]] = []
    for sheet_name in sheet_order:
        rows = sorted(
            (row for row in column_rows if row["sheet_name"] == sheet_name),
            key=lambda row: int(row["column_order"]),
        )
        sheets.append(
            {
                "name": sheet_name,
                "columns": [
                    {
                        "order": int(row["column_order"]),
                        "name": row["column_name"],
                        "dataType": row["data_type"],
                        "required": row["required"] == "true",
                        "unique": row["unique"] == "true",
                        "defaultValue": row["default_value"],
                        "enumValues": row["enum_values"].split("|")
                        if row["enum_values"]
                        else [],
                        "referenceSheet": row["reference_sheet"],
                        "referenceColumn": row["reference_column"],
                        "validation": row["validation"],
                        "description": row["description"],
                    }
                    for row in rows
                ],
            }
        )

    reference_seeds: list[dict[str, object]] = []
    for row in column_rows:
        if not row["enum_values"]:
            continue
        reference_set = f"{row['sheet_name']}.{row['column_name']}"
        for sort_order, code in enumerate(row["enum_values"].split("|"), start=1):
            reference_seeds.append(
                {
                    "reference_value_id": "REF_"
                    + _stable_token(row["sheet_name"])
                    + "_"
                    + _stable_token(row["column_name"])
                    + "_"
                    + _stable_token(code),
                    "reference_set": reference_set,
                    "reference_code": code,
                    "display_name": code,
                    "sort_order": sort_order,
                    "status": "ACTIVE",
                    "provenance": json.dumps(
                        [
                            "archive/stages/stage-4-google-sheets/sheets-columns.csv#"
                            f"{row['sheet_name']}.{row['column_name']}"
                        ],
                        ensure_ascii=False,
                        separators=(",", ":"),
                    ),
                    "notes": "System enum value from accepted Stage 4 schema",
                }
            )

    code_bindings = {
        "QTY_AREA_MM_V1": "stage8QuantityArea_",
        "QTY_EDGE_LENGTH_V1": "stage8QuantityEdge_",
        "QTY_BASIS_ORDER_V1": "stage8QuantityExplicit_",
        "QTY_EXPLICIT_SOURCE_V1": "stage8QuantityExplicit_",
        "COST_UNIT_PRICE_V1": "stage8CalculateCost_",
    }
    seeded_rule_ids = tuple(code_bindings) + ("MODULE_TO_PARTS_V1",)
    calculation_rule_seeds = []
    for rule_id in seeded_rule_ids:
        rule = get_rule(rule_id)
        is_blocking = rule_id == "MODULE_TO_PARTS_V1"
        calculation_rule_seeds.append({
            "rule_version_id": f"{rule.rule_id}:1",
            "rule_id": rule.rule_id,
            "display_name": rule.name,
            "version": 1,
            "scope": rule.scope,
            "rule_status": rule.status,
            "execution_mode": "BLOCKING_STATUS" if is_blocking else "CODE_BINDING",
            "inputs_json": json.dumps(
                rule.inputs, ensure_ascii=False, separators=(",", ":")
            ),
            "outputs_json": json.dumps(
                rule.outputs, ensure_ascii=False, separators=(",", ":")
            ),
            "implementation_ref": "" if is_blocking else code_bindings[rule_id],
            "lifecycle_status": "DRAFT" if is_blocking else "ACTIVE",
            "effective_to": "",
            "provenance": json.dumps(
                rule.provenance, ensure_ascii=False, separators=(",", ":")
            ),
            "notes": rule.notes,
        })

    return {
        "schemaVersionId": SCHEMA_VERSION_ID,
        "schemaName": SCHEMA_NAME,
        "schemaVersion": SCHEMA_VERSION,
        "compatibleRuntimeVersion": COMPATIBLE_RUNTIME_VERSION,
        "sourceArtifacts": [
            "archive/stages/stage-4-google-sheets/sheets-columns.csv",
            "archive/stages/stage-4-google-sheets/sheets-relations.csv",
        ],
        "sheetOrder": sheet_order,
        "sheets": sheets,
        "relations": relation_rows,
        "referenceSeeds": reference_seeds,
        "calculationRuleSeeds": calculation_rule_seeds,
    }


def render_manifest(manifest: dict[str, object]) -> str:
    payload = json.dumps(manifest, ensure_ascii=False, indent=2)
    return (
        "// GENERATED FILE. DO NOT EDIT.\n"
        "// Source: accepted Stage 4 sheets-columns.csv + sheets-relations.csv.\n"
        "// Regenerate: python tools/generate_setup_schema.py\n"
        f"var STAGE5_SCHEMA_MANIFEST = Object.freeze({payload});\n"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--columns", type=Path, default=DEFAULT_COLUMNS)
    parser.add_argument("--relations", type=Path, default=DEFAULT_RELATIONS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    rendered = render_manifest(build_manifest(args.columns, args.relations))
    if args.check:
        if not args.output.is_file() or args.output.read_text(encoding="utf-8") != rendered:
            print(f"STALE: {args.output}")
            return 1
        print(f"CURRENT: {args.output}")
        return 0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(rendered, encoding="utf-8", newline="\n")
    print(f"GENERATED: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
