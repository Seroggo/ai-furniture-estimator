"""Generate the Apps Script Human UX manifest from its explicit UX contract."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "docs" / "human-ux-patch" / "custom-price-schema.json"
DEFAULT_OUTPUT = ROOT / "apps-script" / "generated" / "human_ux_manifest.gs"


def build_manifest(source: Path = DEFAULT_SOURCE) -> dict[str, object]:
    manifest = json.loads(source.read_text(encoding="utf-8"))
    columns = manifest.get("columns", [])
    keys = [column.get("key") for column in columns]
    labels = [column.get("label") for column in columns]
    if manifest.get("sheetName") != "Custom_Price":
        raise ValueError("Human UX contract must define Custom_Price")
    if manifest.get("headerRow") != 2 or manifest.get("dataStartRow") != 3:
        raise ValueError("Custom_Price must use title row 1, header row 2 and data from row 3")
    if len(columns) != 16 or len(set(keys)) != len(keys) or len(set(labels)) != len(labels):
        raise ValueError("Custom_Price must define 16 unique columns")
    required = {
        "category", "display_name", "unit", "source_price", "currency",
        "pricing_mode", "manual_fx_rate", "current_fx_rate",
        "current_price_rub", "active", "updated_at", "comment",
        "custom_price_id", "catalog_item_code", "price_code", "working_price_id",
    }
    if set(keys) != required:
        raise ValueError("Custom_Price column keys differ from the accepted UX contract")
    if set(manifest.get("pricingModes", {}).values()) != {"MANUAL_RUB", "FX_AUTO", "FX_MANUAL"}:
        raise ValueError("All accepted pricing modes must be mapped")
    if set(manifest.get("units", {}).values()) != {"m2", "m", "pcs", "set", "project"}:
        raise ValueError("Human units must map to the accepted machine unit vocabulary")
    for entry in manifest.get("fxCache", []):
        formula = entry.get("formula", "")
        if not formula.startswith('=GOOGLEFINANCE("CURRENCY:') or "," in formula or ";" in formula:
            raise ValueError("FX cache formulas must be one-argument and locale-neutral")
    return manifest


def render_manifest(manifest: dict[str, object]) -> str:
    payload = json.dumps(manifest, ensure_ascii=False, indent=2)
    return (
        "// GENERATED FILE. DO NOT EDIT.\n"
        "// Source: docs/human-ux-patch/custom-price-schema.json.\n"
        "// Regenerate: python tools/generate_human_ux_manifest.py\n"
        f"var HUMAN_UX_MANIFEST = Object.freeze({payload});\n"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = render_manifest(build_manifest(args.source))
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
