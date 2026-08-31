"""Generate the Apps Script SHEETS_V1 manifest from contracts/sheets JSON contracts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACTS_DIR = ROOT / "contracts" / "sheets"
DEFAULT_MANIFEST = CONTRACTS_DIR / "SHEETS_V1.json"
DEFAULT_OUTPUT = ROOT / "apps-script" / "generated" / "sheets_v1_manifest.gs"

EXPECTED_SHEET_COUNT = 5
WRITE_MODES = {"EDIT", "OVERWRITE", "APPEND"}
VISIBILITIES = {"VISIBLE", "HIDDEN"}
MANIFEST_REQUIRED_FIELDS = ("sheet_name", "contract_file", "order", "write_mode", "human_editable")
COLUMN_REQUIRED_FIELDS = ("name", "order", "type", "required", "human_editable", "visibility")


def _load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _column_entry(column: dict, sheet_name: str, errors: list[str]) -> dict:
    for field in COLUMN_REQUIRED_FIELDS:
        if field not in column:
            errors.append(f"{sheet_name}: column is missing required field '{field}'")
            return {}
    visibility = column["visibility"]
    if visibility not in VISIBILITIES:
        errors.append(f"{sheet_name}.{column['name']}: unsupported visibility '{visibility}'")
    entry = {
        "name": column["name"],
        "order": column["order"],
        "type": column["type"],
        "required": column["required"],
        "human_editable": column["human_editable"],
        "visibility": visibility,
    }
    if "description" in column:
        entry["description"] = column["description"]
    validation = column.get("validation")
    if validation is not None:
        entry["validation"] = validation
    return entry


def _sheet_entry(declaration: dict, contracts_dir: Path, errors: list[str]) -> dict | None:
    sheet_name = declaration.get("sheet_name", "<missing>")
    for field in MANIFEST_REQUIRED_FIELDS:
        if field not in declaration:
            errors.append(f"SHEETS_V1 sheet entry is missing required field '{field}'")
            return None
    contract_path = contracts_dir / declaration["contract_file"]
    if not contract_path.is_file():
        errors.append(f"{sheet_name}: contract file not found at {contract_path}")
        return None
    contract = _load_json(contract_path)
    if contract.get("sheet_name") != sheet_name:
        errors.append(f"{sheet_name}: contract sheet_name does not match manifest entry")
    if contract.get("write_mode") != declaration["write_mode"]:
        errors.append(f"{sheet_name}: contract write_mode does not match manifest entry")
    if contract.get("human_editable") != declaration["human_editable"]:
        errors.append(f"{sheet_name}: contract human_editable does not match manifest entry")
    if declaration["write_mode"] not in WRITE_MODES:
        errors.append(f"{sheet_name}: unsupported write_mode '{declaration['write_mode']}'")
    columns = contract.get("columns")
    if not isinstance(columns, list) or not columns:
        errors.append(f"{sheet_name}: contract must define a non-empty columns list")
        return None
    ordered_columns = sorted(columns, key=lambda column: column.get("order", 0))
    orders = [column.get("order") for column in ordered_columns]
    if orders != list(range(1, len(ordered_columns) + 1)):
        errors.append(f"{sheet_name}: column order must be contiguous starting at 1")
    names = [column.get("name") for column in ordered_columns]
    if len(names) != len(set(names)):
        errors.append(f"{sheet_name}: duplicate column names are not allowed")
    entry = {
        "sheet_name": declaration["sheet_name"],
        "contract_file": declaration["contract_file"],
        "order": declaration["order"],
        "write_mode": declaration["write_mode"],
        "human_editable": declaration["human_editable"],
        "columns": [_column_entry(column, sheet_name, errors) for column in ordered_columns],
    }
    if "allowed_keys" in contract:
        entry["allowed_keys"] = contract["allowed_keys"]
    return entry


def build_manifest(manifest_path: Path = DEFAULT_MANIFEST, contracts_dir: Path = CONTRACTS_DIR) -> dict:
    """Build one deterministic SHEETS_V1 manifest from the manifest plus its contract files."""
    manifest = _load_json(manifest_path)
    declarations = manifest.get("sheets")
    errors: list[str] = []
    if not isinstance(declarations, list) or len(declarations) != EXPECTED_SHEET_COUNT:
        errors.append(
            f"SHEETS_V1 must declare exactly {EXPECTED_SHEET_COUNT} sheets; got "
            f"{len(declarations) if isinstance(declarations, list) else 'none'}"
        )
        raise ValueError("SHEETS_V1 manifest is invalid:\n- " + "\n- ".join(errors))
    ordered = sorted(declarations, key=lambda declaration: declaration.get("order", 0))
    orders = [declaration.get("order") for declaration in ordered]
    if orders != list(range(1, EXPECTED_SHEET_COUNT + 1)):
        errors.append("SHEET order values must be contiguous starting at 1")
    names = [declaration.get("sheet_name") for declaration in ordered]
    if len(names) != len(set(names)):
        errors.append("duplicate sheet names are not allowed")
    sheets = [entry for entry in (_sheet_entry(declaration, contracts_dir, errors) for declaration in ordered) if entry]
    if errors:
        raise ValueError("SHEETS_V1 manifest is invalid:\n- " + "\n- ".join(errors))
    return {
        "manifest_name": manifest.get("manifest_name", "SHEETS_V1"),
        "schema_version": manifest.get("schema_version", "1.0"),
        "sheet_order": names,
        "sheets": sheets,
    }


def render_manifest(manifest: dict) -> str:
    payload = json.dumps(manifest, ensure_ascii=False, indent=2)
    return (
        "// GENERATED FILE. DO NOT EDIT.\n"
        "// Source: contracts/sheets/SHEETS_V1.json + per-sheet V1 contract files.\n"
        "// Regenerate: python tools/generate_sheets_v1_manifest.py\n"
        f"var SHEETS_V1_MANIFEST = {payload};\n"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--contracts-dir", type=Path, default=CONTRACTS_DIR)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    rendered = render_manifest(build_manifest(args.manifest, args.contracts_dir))
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