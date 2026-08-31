// GENERATED FILE. DO NOT EDIT.
// Source: contracts/sheets/SHEETS_V1.json + per-sheet V1 contract files.
// Regenerate: python tools/generate_sheets_v1_manifest.py
var SHEETS_V1_MANIFEST = {
  "manifest_name": "SHEETS_V1",
  "schema_version": "1.0",
  "sheet_order": [
    "Prices",
    "Construction_Defaults",
    "BOM_LAST",
    "CALC_LOG",
    "SYSTEM"
  ],
  "sheets": [
    {
      "sheet_name": "Prices",
      "contract_file": "PRICES_V1.json",
      "order": 1,
      "write_mode": "EDIT",
      "human_editable": true,
      "columns": [
        {
          "name": "category",
          "order": 1,
          "type": "string",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Human-readable price category, e.g. MATERIALS, EDGE, HARDWARE, WORKS.",
          "validation": {
            "enum": [
              "MATERIALS",
              "EDGE",
              "HARDWARE",
              "WORKS",
              "OTHER"
            ]
          }
        },
        {
          "name": "name",
          "order": 2,
          "type": "string",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Human-readable item name.",
          "validation": {
            "min_length": 1,
            "max_length": 200
          }
        },
        {
          "name": "unit",
          "order": 3,
          "type": "string",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Unit of measure, e.g. pcs, m, m2, kg, sheet.",
          "validation": {
            "min_length": 1,
            "max_length": 20
          }
        },
        {
          "name": "price",
          "order": 4,
          "type": "number",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Unit price in the given currency.",
          "validation": {
            "minimum": 0
          }
        },
        {
          "name": "currency",
          "order": 5,
          "type": "string",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "ISO 4217 currency code, e.g. RUB, EUR, USD.",
          "validation": {
            "pattern": "^[A-Z]{3}$"
          }
        },
        {
          "name": "vendor",
          "order": 6,
          "type": "string",
          "required": false,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Vendor or supplier name.",
          "validation": {
            "max_length": 120
          }
        },
        {
          "name": "article",
          "order": 7,
          "type": "string",
          "required": false,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Vendor article / SKU code, human-editable.",
          "validation": {
            "max_length": 80
          }
        },
        {
          "name": "active",
          "order": 8,
          "type": "boolean",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Whether the price row is currently active and used in calculations.",
          "validation": {}
        },
        {
          "name": "notes",
          "order": 9,
          "type": "string",
          "required": false,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Free-text user notes about the price row.",
          "validation": {
            "max_length": 500
          }
        },
        {
          "name": "updated_at",
          "order": 10,
          "type": "string",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Last user edit timestamp (ISO 8601, UTC).",
          "validation": {
            "format": "date-time"
          }
        },
        {
          "name": "item_id",
          "order": 11,
          "type": "string",
          "required": true,
          "human_editable": false,
          "visibility": "HIDDEN",
          "description": "Stable machine identifier of the price row. Used for stable joins; never edited by users.",
          "validation": {
            "min_length": 1,
            "max_length": 64
          }
        }
      ]
    },
    {
      "sheet_name": "Construction_Defaults",
      "contract_file": "CONSTRUCTION_DEFAULTS_V1.json",
      "order": 2,
      "write_mode": "EDIT",
      "human_editable": true,
      "columns": [
        {
          "name": "module_type",
          "order": 1,
          "type": "string",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Module type this default applies to, e.g. carcass, drawer, door.",
          "validation": {
            "min_length": 1,
            "max_length": 80
          }
        },
        {
          "name": "condition",
          "order": 2,
          "type": "string",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Applicability condition (free-text human-readable, e.g. 'standard', 'tall_unit_gt_2000').",
          "validation": {
            "max_length": 120
          }
        },
        {
          "name": "parameter",
          "order": 3,
          "type": "string",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Construction parameter name, e.g. back_insert_thickness_mm, shelf_count.",
          "validation": {
            "min_length": 1,
            "max_length": 120
          }
        },
        {
          "name": "default_value",
          "order": 4,
          "type": [
            "string",
            "number",
            "integer",
            "boolean",
            "null"
          ],
          "required": false,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Default value for the parameter. Nullable only when resolution_mode is REQUIRED_QUESTION.",
          "validation": {}
        },
        {
          "name": "unit",
          "order": 5,
          "type": "string",
          "required": false,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Unit of measure for the default value, e.g. mm, pcs.",
          "validation": {
            "max_length": 20
          }
        },
        {
          "name": "resolution_mode",
          "order": 6,
          "type": "string",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "How the parameter is resolved during input understanding: DEFAULT_CANDIDATE provides a default that may be accepted; REQUIRED_QUESTION forces a clarifying question.",
          "validation": {
            "enum": [
              "DEFAULT_CANDIDATE",
              "REQUIRED_QUESTION"
            ]
          }
        },
        {
          "name": "confirmation_required",
          "order": 7,
          "type": "boolean",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Whether the user must confirm the default before it is applied.",
          "validation": {}
        },
        {
          "name": "active",
          "order": 8,
          "type": "boolean",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Whether the rule is currently active.",
          "validation": {}
        },
        {
          "name": "description",
          "order": 9,
          "type": "string",
          "required": false,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Human-readable description of the default rule.",
          "validation": {
            "max_length": 500
          }
        },
        {
          "name": "rule_id",
          "order": 10,
          "type": "string",
          "required": true,
          "human_editable": false,
          "visibility": "HIDDEN",
          "description": "Stable machine identifier of the default rule. Used for stable joins; never edited by users.",
          "validation": {
            "min_length": 1,
            "max_length": 64
          }
        }
      ]
    },
    {
      "sheet_name": "BOM_LAST",
      "contract_file": "BOM_LAST_V1.json",
      "order": 3,
      "write_mode": "OVERWRITE",
      "human_editable": true,
      "columns": [
        {
          "name": "section",
          "order": 1,
          "type": "string",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "BOM section grouping. Must be one of the defined sections.",
          "validation": {
            "enum": [
              "PARTS",
              "MATERIALS",
              "EDGE",
              "HARDWARE",
              "WORKS",
              "TOTALS"
            ]
          }
        },
        {
          "name": "item_name",
          "order": 2,
          "type": "string",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Human-readable line item name.",
          "validation": {
            "min_length": 1,
            "max_length": 200
          }
        },
        {
          "name": "specification",
          "order": 3,
          "type": "string",
          "required": false,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Human-readable specification (material, color, brand).",
          "validation": {
            "max_length": 300
          }
        },
        {
          "name": "size",
          "order": 4,
          "type": "string",
          "required": false,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Human-readable dimensions string, e.g. '800x600x18 mm'.",
          "validation": {
            "max_length": 120
          }
        },
        {
          "name": "quantity",
          "order": 5,
          "type": "number",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Line item quantity.",
          "validation": {
            "minimum": 0
          }
        },
        {
          "name": "unit",
          "order": 6,
          "type": "string",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Unit of measure, e.g. pcs, m, m2, kg.",
          "validation": {
            "min_length": 1,
            "max_length": 20
          }
        },
        {
          "name": "unit_price",
          "order": 7,
          "type": "number",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Unit price in the calculation currency.",
          "validation": {
            "minimum": 0
          }
        },
        {
          "name": "total",
          "order": 8,
          "type": "number",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Line total = quantity * unit_price.",
          "validation": {
            "minimum": 0
          }
        },
        {
          "name": "comment",
          "order": 9,
          "type": "string",
          "required": false,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Free-text user comment.",
          "validation": {
            "max_length": 500
          }
        },
        {
          "name": "source_module",
          "order": 10,
          "type": "string",
          "required": false,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Human-readable source module that produced the line, e.g. 'carcass-1', 'drawer-2'.",
          "validation": {
            "max_length": 80
          }
        },
        {
          "name": "item_id",
          "order": 11,
          "type": "string",
          "required": true,
          "human_editable": false,
          "visibility": "HIDDEN",
          "description": "Stable machine identifier of the BOM line item.",
          "validation": {
            "min_length": 1,
            "max_length": 64
          }
        },
        {
          "name": "module_id",
          "order": 12,
          "type": "string",
          "required": false,
          "human_editable": false,
          "visibility": "HIDDEN",
          "description": "Stable machine identifier of the source module.",
          "validation": {
            "max_length": 64
          }
        },
        {
          "name": "material_code",
          "order": 13,
          "type": "string",
          "required": false,
          "human_editable": false,
          "visibility": "HIDDEN",
          "description": "Stable machine material code for pricebook joins.",
          "validation": {
            "max_length": 80
          }
        },
        {
          "name": "calculation_id",
          "order": 14,
          "type": "string",
          "required": true,
          "human_editable": false,
          "visibility": "HIDDEN",
          "description": "Stable machine identifier of the calculation that produced this BOM.",
          "validation": {
            "min_length": 1,
            "max_length": 64
          }
        }
      ]
    },
    {
      "sheet_name": "CALC_LOG",
      "contract_file": "CALC_LOG_V1.json",
      "order": 4,
      "write_mode": "APPEND",
      "human_editable": true,
      "columns": [
        {
          "name": "timestamp",
          "order": 1,
          "type": "string",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Calculation timestamp (ISO 8601, UTC).",
          "validation": {
            "format": "date-time"
          }
        },
        {
          "name": "project_name",
          "order": 2,
          "type": "string",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Human-readable project name.",
          "validation": {
            "min_length": 1,
            "max_length": 200
          }
        },
        {
          "name": "manager",
          "order": 3,
          "type": "string",
          "required": false,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Manager or operator name.",
          "validation": {
            "max_length": 120
          }
        },
        {
          "name": "status",
          "order": 4,
          "type": "string",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Calculation status.",
          "validation": {
            "enum": [
              "DRAFT",
              "CONFIRMED",
              "COMPLETED",
              "FAILED",
              "ARCHIVED"
            ]
          }
        },
        {
          "name": "currency",
          "order": 5,
          "type": "string",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "ISO 4217 currency code used for totals.",
          "validation": {
            "pattern": "^[A-Z]{3}$"
          }
        },
        {
          "name": "material_total",
          "order": 6,
          "type": "number",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Materials total in the calculation currency.",
          "validation": {
            "minimum": 0
          }
        },
        {
          "name": "hardware_total",
          "order": 7,
          "type": "number",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Hardware total in the calculation currency.",
          "validation": {
            "minimum": 0
          }
        },
        {
          "name": "work_total",
          "order": 8,
          "type": "number",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Works total in the calculation currency.",
          "validation": {
            "minimum": 0
          }
        },
        {
          "name": "grand_total",
          "order": 9,
          "type": "number",
          "required": true,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Grand total = material_total + hardware_total + work_total.",
          "validation": {
            "minimum": 0
          }
        },
        {
          "name": "vision_model",
          "order": 10,
          "type": "string",
          "required": false,
          "human_editable": true,
          "visibility": "VISIBLE",
          "description": "Human-readable vision model identifier used for input understanding, if any.",
          "validation": {
            "max_length": 80
          }
        },
        {
          "name": "calculation_id",
          "order": 11,
          "type": "string",
          "required": true,
          "human_editable": false,
          "visibility": "HIDDEN",
          "description": "Stable machine identifier of the calculation. Joins to BOM_LAST.calculation_id and SYSTEM.Calculation_id.",
          "validation": {
            "min_length": 1,
            "max_length": 64
          }
        },
        {
          "name": "fx_rate_used",
          "order": 12,
          "type": "number",
          "required": false,
          "human_editable": false,
          "visibility": "HIDDEN",
          "description": "FX rate used for currency conversion, if any. Machine-managed snapshot value.",
          "validation": {
            "minimum": 0
          }
        }
      ]
    },
    {
      "sheet_name": "SYSTEM",
      "contract_file": "SYSTEM_V1.json",
      "order": 5,
      "write_mode": "OVERWRITE",
      "human_editable": false,
      "columns": [
        {
          "name": "Key",
          "order": 1,
          "type": "string",
          "required": true,
          "human_editable": false,
          "visibility": "HIDDEN",
          "description": "System key name. Must be one of allowed_keys.",
          "validation": {}
        },
        {
          "name": "Value",
          "order": 2,
          "type": [
            "string",
            "number",
            "integer",
            "boolean",
            "null"
          ],
          "required": true,
          "human_editable": false,
          "visibility": "HIDDEN",
          "description": "System value. For JSON-bearing keys the value is a serialized JSON string.",
          "validation": {}
        },
        {
          "name": "Value_type",
          "order": 3,
          "type": "string",
          "required": true,
          "human_editable": false,
          "visibility": "HIDDEN",
          "description": "Declared type of the stored value.",
          "validation": {
            "enum": [
              "string",
              "number",
              "integer",
              "boolean",
              "json",
              "null"
            ]
          }
        },
        {
          "name": "Updated_at",
          "order": 4,
          "type": "string",
          "required": true,
          "human_editable": false,
          "visibility": "HIDDEN",
          "description": "Last update timestamp (ISO 8601, UTC).",
          "validation": {
            "format": "date-time"
          }
        }
      ],
      "allowed_keys": [
        {
          "key": "Calculation_id",
          "value_type": "string",
          "description": "Stable machine identifier of the current/last calculation."
        },
        {
          "key": "Timestamp",
          "value_type": "string",
          "description": "ISO 8601 UTC timestamp of the last system update."
        },
        {
          "key": "Status",
          "value_type": "string",
          "description": "Current system/calculation status."
        },
        {
          "key": "Vision_model",
          "value_type": "string",
          "description": "Vision model identifier used for the last input understanding run."
        },
        {
          "key": "Currency",
          "value_type": "string",
          "description": "ISO 4217 currency code used for the last calculation."
        },
        {
          "key": "Fx_rate_used",
          "value_type": "number",
          "description": "FX rate used for currency conversion in the last calculation."
        },
        {
          "key": "Price_snapshot_created_at",
          "value_type": "string",
          "description": "ISO 8601 UTC timestamp when the price snapshot was created."
        },
        {
          "key": "Price_snapshot_json",
          "value_type": "json",
          "description": "Serialized JSON of the price snapshot used for the last calculation."
        },
        {
          "key": "App_version",
          "value_type": "string",
          "description": "Application version that wrote the system state."
        },
        {
          "key": "Schema_version",
          "value_type": "string",
          "description": "Sheets schema version, matching SHEETS_V1.schema_version."
        },
        {
          "key": "Construction_profile_version",
          "value_type": "string",
          "description": "Construction profile version used for the last calculation."
        },
        {
          "key": "Confirmed_configuration_json",
          "value_type": "json",
          "description": "Serialized JSON of the confirmed configuration used for the last calculation."
        },
        {
          "key": "Construction_result_json",
          "value_type": "json",
          "description": "Serialized JSON of the construction result for the last calculation."
        }
      ]
    }
  ]
};
