"""Generate the Apps Script representation of the canonical Project Input schema.

The canonical source of truth is contracts/legacy-apps-script/project-input.schema.json.
This generator resolves all internal $ref/$defs references into one self-contained
JSON Schema object that Apps Script uses for deterministic local validation, plus an
OpenRouter/OpenAI strict Structured Outputs transport representation generated from
the same resolved canonical schema. No manual schema copy exists.
"""

from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "contracts" / "legacy-apps-script" / "project-input.schema.json"
DEFAULT_OUTPUT = ROOT / "apps-script" / "generated" / "project_input_schema.gs"

SCHEMA_VERSION_ENUM = ("project-input-v2",)
ANNOTATION_KEYWORDS = {
    "$schema",
    "$id",
    "title",
    "description",
}
TRANSPORT_ALLOWED_KEYWORDS = {
    "type",
    "properties",
    "required",
    "additionalProperties",
    "items",
    "enum",
    "description",
}


def _dereference(
    node: Any,
    defs: dict[str, Any],
    seen: set[str] | None = None,
) -> Any:
    """Replace every #/$defs/<name> reference with a resolved self-contained copy."""
    if isinstance(node, list):
        return [_dereference(item, defs, seen) for item in node]
    if not isinstance(node, dict):
        return node

    ref = node.get("$ref")
    if isinstance(ref, str) and ref.startswith("#/$defs/"):
        name = ref.split("/")[-1]
        if name not in defs:
            raise ValueError(f"Unresolvable schema reference: {ref}")
        guard = set(seen or ())
        if name in guard:
            raise ValueError(f"Circular schema reference detected: {name}")
        guard.add(name)
        resolved = copy.deepcopy(defs[name])
        for key, value in node.items():
            if key in {"$ref"}:
                continue
            if key in ANNOTATION_KEYWORDS and value is not None:
                resolved[key] = value
        return _dereference(resolved, defs, guard)

    return {key: _dereference(value, defs, seen) for key, value in node.items()}


def _strip_keywords(node: Any) -> Any:
    if isinstance(node, list):
        return [_strip_keywords(item) for item in node]
    if not isinstance(node, dict):
        return node
    cleaned: dict[str, Any] = {}
    for key, value in node.items():
        cleaned[key] = _strip_keywords(value)
    return cleaned


def build_schema(source: Path = DEFAULT_SOURCE) -> dict[str, Any]:
    """Validate the canonical schema and build a resolved self-contained copy."""
    document = json.loads(source.read_text(encoding="utf-8"))
    if document.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
        raise ValueError("Canonical Project Input schema must be JSON Schema draft 2020-12")
    if document.get("type") != "object":
        raise ValueError("Canonical Project Input schema must be an object schema")
    if document.get("additionalProperties") is not False:
        raise ValueError("Canonical Project Input schema must reject additional properties")

    version_enum = (document.get("properties") or {}).get("schema_version", {}).get("enum", [])
    if version_enum != list(SCHEMA_VERSION_ENUM):
        raise ValueError(
            "schema_version enum must be exactly " + ",".join(SCHEMA_VERSION_ENUM)
        )

    defs = document.get("$defs", {})
    required_defs = {
        "FactState",
        "Evidence",
        "TextFact",
        "IntegerFact",
        "LayoutShapeFact",
        "ZoneFact",
        "ModuleClassFact",
        "LayoutEntityTypeFact",
        "RoleCodeFact",
        "RequiredLayoutEntity",
        "MissingQuestion",
        "EvidenceItem",
        "ParserMetadata",
    }
    missing = sorted(required_defs.difference(defs))
    if missing:
        raise ValueError("Canonical schema misses $defs: " + ", ".join(missing))

    resolved = _dereference(document, defs)
    resolved.pop("$defs", None)
    resolved.pop("$id", None)
    resolved.pop("$schema", None)
    cleaned = _strip_keywords(resolved)

    unresolved = _find_refs(cleaned)
    if unresolved:
        raise ValueError("Unresolved references remain: " + ", ".join(unresolved))

    cleaned["$schema"] = "https://json-schema.org/draft/2020-12/schema"
    return cleaned


def _make_nullable(schema: dict[str, Any]) -> dict[str, Any]:
    """Encode a canonical-optional property using the strict-output null convention."""
    nullable = copy.deepcopy(schema)
    schema_type = nullable.get("type")
    if isinstance(schema_type, str):
        nullable["type"] = [schema_type, "null"]
    elif isinstance(schema_type, list) and "null" not in schema_type:
        nullable["type"] = [*schema_type, "null"]
    if isinstance(nullable.get("enum"), list) and None not in nullable["enum"]:
        nullable["enum"].append(None)
    return nullable


def _build_transport_node(node: Any) -> Any:
    """Convert a resolved canonical node to the supported strict-output subset."""
    if isinstance(node, list):
        return [_build_transport_node(item) for item in node]
    if not isinstance(node, dict):
        return node

    cleaned: dict[str, Any] = {}
    for key, value in node.items():
        if key not in TRANSPORT_ALLOWED_KEYWORDS:
            continue
        if key == "properties":
            continue
        cleaned[key] = _build_transport_node(value)

    properties = node.get("properties")
    if isinstance(properties, dict):
        canonical_required = set(node.get("required", []))
        transport_properties: dict[str, Any] = {}
        for name, property_schema in properties.items():
            converted = _build_transport_node(property_schema)
            if name not in canonical_required:
                converted = _make_nullable(converted)
            transport_properties[name] = converted
        cleaned["properties"] = transport_properties
        cleaned["required"] = list(transport_properties)
        cleaned["additionalProperties"] = False
    return cleaned


def build_openrouter_schema(canonical_schema: dict[str, Any]) -> dict[str, Any]:
    """Build the model-owned strict Structured Outputs transport contract."""
    model_schema = copy.deepcopy(canonical_schema)
    model_schema["properties"].pop("parser_metadata", None)
    model_schema["required"] = [
        name for name in model_schema.get("required", []) if name != "parser_metadata"
    ]
    return _build_transport_node(model_schema)


def _find_refs(node: Any, found: list[str] | None = None) -> list[str]:
    if found is None:
        found = []
    if isinstance(node, list):
        for item in node:
            _find_refs(item, found)
    elif isinstance(node, dict):
        for key, value in node.items():
            if key == "$ref":
                found.append(str(value))
            else:
                _find_refs(value, found)
    return found


def render_schema(schema: dict[str, Any]) -> str:
    canonical_payload = json.dumps(schema, ensure_ascii=False, indent=2)
    transport_payload = json.dumps(build_openrouter_schema(schema), ensure_ascii=False, indent=2)
    version = schema["properties"]["schema_version"]["enum"][0]
    return (
        "// GENERATED FILE. DO NOT EDIT.\n"
        "// Source: contracts/legacy-apps-script/project-input.schema.json.\n"
        "// Regenerate: python tools/generate_project_input_schema.py\n"
        f"var PROJECT_INPUT_SCHEMA_VERSION = {json.dumps(version, ensure_ascii=False)};\n"
        "// Canonical business/local validation contract.\n"
        f"var PROJECT_INPUT_SCHEMA = Object.freeze({canonical_payload});\n"
        "// Generated OpenRouter/OpenAI strict Structured Outputs transport contract.\n"
        f"var PROJECT_INPUT_OPENROUTER_SCHEMA = Object.freeze({transport_payload});\n"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    rendered = render_schema(build_schema(args.source))
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
