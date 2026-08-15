// GENERATED FILE. DO NOT EDIT.
// Source: docs/stage-7-openrouter-parser/project-input.schema.json.
// Regenerate: python tools/generate_project_input_schema.py
var PROJECT_INPUT_SCHEMA_VERSION = "project-input-v2";
// Canonical business/local validation contract.
var PROJECT_INPUT_SCHEMA = Object.freeze({
  "title": "Project Input Schema",
  "description": "Versioned canonical output contract for the OpenRouter kitchen parser. One version per schema change. Used as the structured output contract and the final local validation gate.",
  "type": "object",
  "properties": {
    "schema_version": {
      "type": "string",
      "enum": [
        "project-input-v2"
      ],
      "description": "Canonical schema version specifier."
    },
    "project_type": {
      "type": "string",
      "enum": [
        "KITCHEN"
      ],
      "description": "MVP project category. Stage 7 accepts kitchen projects only."
    },
    "project": {
      "type": "object",
      "description": "Project-wide metadata.",
      "properties": {
        "name": {
          "type": "object",
          "description": "User-provided project name or description label.",
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": "object",
              "description": "Provenance for a single fact value.",
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              },
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "value",
            "fact_state"
          ],
          "additionalProperties": false
        },
        "notes": {
          "type": "object",
          "description": "Additional user notes.",
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": "object",
              "description": "Provenance for a single fact value.",
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              },
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "value",
            "fact_state"
          ],
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    },
    "client": {
      "type": "object",
      "description": "Client or object context information.",
      "properties": {
        "name": {
          "type": "object",
          "description": "Client name.",
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": "object",
              "description": "Provenance for a single fact value.",
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              },
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "value",
            "fact_state"
          ],
          "additionalProperties": false
        },
        "address": {
          "type": "object",
          "description": "Installation address.",
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": "object",
              "description": "Provenance for a single fact value.",
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              },
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "value",
            "fact_state"
          ],
          "additionalProperties": false
        },
        "phone": {
          "type": "object",
          "description": "Contact phone.",
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": "object",
              "description": "Provenance for a single fact value.",
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              },
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "value",
            "fact_state"
          ],
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    },
    "layout": {
      "type": "object",
      "description": "Requested kitchen geometry and dimensions.",
      "properties": {
        "run_shape": {
          "type": "object",
          "description": "Shape explicitly requested or described by the user; the parser does not design a layout.",
          "properties": {
            "value": {
              "type": "string",
              "enum": [
                "straight",
                "L-shaped",
                "U-shaped",
                "galley",
                "unknown"
              ]
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": "object",
              "description": "Provenance for a single fact value.",
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              },
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "value",
            "fact_state"
          ],
          "additionalProperties": false
        },
        "run_length_mm": {
          "type": "object",
          "description": "Total available length for the run in millimetres.",
          "properties": {
            "value": {
              "type": "integer",
              "minimum": 0,
              "description": "Extracted integer value; 0 is the sentinel for UNKNOWN, CONFLICT, or NOT_APPLICABLE."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": "object",
              "description": "Provenance for a single fact value.",
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              },
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "value",
            "fact_state"
          ],
          "additionalProperties": false
        },
        "zone": {
          "type": "object",
          "description": "Which user-described zone the geometry applies to.",
          "properties": {
            "value": {
              "type": "string",
              "enum": [
                "base",
                "wall",
                "tall",
                "unknown"
              ]
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": "object",
              "description": "Provenance for a single fact value.",
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              },
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "value",
            "fact_state"
          ],
          "additionalProperties": false
        },
        "wall_height_mm": {
          "type": "object",
          "description": "Room height constraint.",
          "properties": {
            "value": {
              "type": "integer",
              "minimum": 0,
              "description": "Extracted integer value; 0 is the sentinel for UNKNOWN, CONFLICT, or NOT_APPLICABLE."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": "object",
              "description": "Provenance for a single fact value.",
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              },
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "value",
            "fact_state"
          ],
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    },
    "modules": {
      "type": "object",
      "description": "Required modules, appliances, and their constraints.",
      "properties": {
        "required_modules": {
          "type": "array",
          "description": "Explicitly requested layout furniture modules or appliance slots. Non-layout surfaces such as countertops are excluded.",
          "items": {
            "type": "object",
            "description": "A single required furniture module or appliance slot supported by the linear layout contract.",
            "properties": {
              "name": {
                "type": "object",
                "description": "Human-readable module or appliance-slot name.",
                "properties": {
                  "value": {
                    "type": "string",
                    "description": "Extracted value or empty string when UNKNOWN."
                  },
                  "fact_state": {
                    "type": "string",
                    "enum": [
                      "KNOWN",
                      "INFERRED",
                      "UNKNOWN",
                      "CONFLICT",
                      "NOT_APPLICABLE"
                    ],
                    "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
                  },
                  "evidence": {
                    "type": "object",
                    "description": "Provenance for a single fact value.",
                    "properties": {
                      "source_type": {
                        "type": "string",
                        "enum": [
                          "TEXT",
                          "IMAGE",
                          "MULTI_SOURCE"
                        ],
                        "description": "Origin modality of the evidence."
                      },
                      "source_ref": {
                        "type": "string",
                        "description": "Text span label, image index, or attachment identifier."
                      },
                      "evidence_note": {
                        "type": "string",
                        "description": "Brief human-readable observation that supports this fact."
                      }
                    },
                    "required": [
                      "source_type",
                      "source_ref",
                      "evidence_note"
                    ],
                    "additionalProperties": false
                  }
                },
                "required": [
                  "value",
                  "fact_state"
                ],
                "additionalProperties": false
              },
              "entity_type": {
                "type": "object",
                "description": "Canonical machine entity type; never a translated free-text label.",
                "properties": {
                  "value": {
                    "type": "string",
                    "enum": [
                      "MODULE",
                      "APPLIANCE_SLOT",
                      "unknown"
                    ]
                  },
                  "fact_state": {
                    "type": "string",
                    "enum": [
                      "KNOWN",
                      "INFERRED",
                      "UNKNOWN",
                      "CONFLICT",
                      "NOT_APPLICABLE"
                    ],
                    "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
                  },
                  "evidence": {
                    "type": "object",
                    "description": "Provenance for a single fact value.",
                    "properties": {
                      "source_type": {
                        "type": "string",
                        "enum": [
                          "TEXT",
                          "IMAGE",
                          "MULTI_SOURCE"
                        ],
                        "description": "Origin modality of the evidence."
                      },
                      "source_ref": {
                        "type": "string",
                        "description": "Text span label, image index, or attachment identifier."
                      },
                      "evidence_note": {
                        "type": "string",
                        "description": "Brief human-readable observation that supports this fact."
                      }
                    },
                    "required": [
                      "source_type",
                      "source_ref",
                      "evidence_note"
                    ],
                    "additionalProperties": false
                  }
                },
                "required": [
                  "value",
                  "fact_state"
                ],
                "additionalProperties": false
              },
              "role_code": {
                "type": "object",
                "description": "Canonical machine role code; unknown classification uses the unknown sentinel.",
                "properties": {
                  "value": {
                    "type": "string",
                    "enum": [
                      "generic_storage",
                      "drawer",
                      "sink",
                      "dishwasher_slot",
                      "oven",
                      "hob",
                      "narrow_cargo",
                      "dish_dryer",
                      "hood",
                      "pantry",
                      "fridge",
                      "unknown"
                    ]
                  },
                  "fact_state": {
                    "type": "string",
                    "enum": [
                      "KNOWN",
                      "INFERRED",
                      "UNKNOWN",
                      "CONFLICT",
                      "NOT_APPLICABLE"
                    ],
                    "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
                  },
                  "evidence": {
                    "type": "object",
                    "description": "Provenance for a single fact value.",
                    "properties": {
                      "source_type": {
                        "type": "string",
                        "enum": [
                          "TEXT",
                          "IMAGE",
                          "MULTI_SOURCE"
                        ],
                        "description": "Origin modality of the evidence."
                      },
                      "source_ref": {
                        "type": "string",
                        "description": "Text span label, image index, or attachment identifier."
                      },
                      "evidence_note": {
                        "type": "string",
                        "description": "Brief human-readable observation that supports this fact."
                      }
                    },
                    "required": [
                      "source_type",
                      "source_ref",
                      "evidence_note"
                    ],
                    "additionalProperties": false
                  }
                },
                "required": [
                  "value",
                  "fact_state"
                ],
                "additionalProperties": false
              },
              "module_class": {
                "type": "object",
                "description": "User-requested class of module (base, wall, tall) or unknown.",
                "properties": {
                  "value": {
                    "type": "string",
                    "enum": [
                      "base",
                      "wall",
                      "tall",
                      "unknown"
                    ]
                  },
                  "fact_state": {
                    "type": "string",
                    "enum": [
                      "KNOWN",
                      "INFERRED",
                      "UNKNOWN",
                      "CONFLICT",
                      "NOT_APPLICABLE"
                    ],
                    "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
                  },
                  "evidence": {
                    "type": "object",
                    "description": "Provenance for a single fact value.",
                    "properties": {
                      "source_type": {
                        "type": "string",
                        "enum": [
                          "TEXT",
                          "IMAGE",
                          "MULTI_SOURCE"
                        ],
                        "description": "Origin modality of the evidence."
                      },
                      "source_ref": {
                        "type": "string",
                        "description": "Text span label, image index, or attachment identifier."
                      },
                      "evidence_note": {
                        "type": "string",
                        "description": "Brief human-readable observation that supports this fact."
                      }
                    },
                    "required": [
                      "source_type",
                      "source_ref",
                      "evidence_note"
                    ],
                    "additionalProperties": false
                  }
                },
                "required": [
                  "value",
                  "fact_state"
                ],
                "additionalProperties": false
              },
              "width_mm": {
                "type": "object",
                "description": "Module width in millimetres.",
                "properties": {
                  "value": {
                    "type": "integer",
                    "minimum": 0,
                    "description": "Extracted integer value; 0 is the sentinel for UNKNOWN, CONFLICT, or NOT_APPLICABLE."
                  },
                  "fact_state": {
                    "type": "string",
                    "enum": [
                      "KNOWN",
                      "INFERRED",
                      "UNKNOWN",
                      "CONFLICT",
                      "NOT_APPLICABLE"
                    ],
                    "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
                  },
                  "evidence": {
                    "type": "object",
                    "description": "Provenance for a single fact value.",
                    "properties": {
                      "source_type": {
                        "type": "string",
                        "enum": [
                          "TEXT",
                          "IMAGE",
                          "MULTI_SOURCE"
                        ],
                        "description": "Origin modality of the evidence."
                      },
                      "source_ref": {
                        "type": "string",
                        "description": "Text span label, image index, or attachment identifier."
                      },
                      "evidence_note": {
                        "type": "string",
                        "description": "Brief human-readable observation that supports this fact."
                      }
                    },
                    "required": [
                      "source_type",
                      "source_ref",
                      "evidence_note"
                    ],
                    "additionalProperties": false
                  }
                },
                "required": [
                  "value",
                  "fact_state"
                ],
                "additionalProperties": false
              },
              "quantity": {
                "type": "object",
                "description": "Number of units required.",
                "properties": {
                  "value": {
                    "type": "integer",
                    "minimum": 0,
                    "description": "Extracted integer value; 0 is the sentinel for UNKNOWN, CONFLICT, or NOT_APPLICABLE."
                  },
                  "fact_state": {
                    "type": "string",
                    "enum": [
                      "KNOWN",
                      "INFERRED",
                      "UNKNOWN",
                      "CONFLICT",
                      "NOT_APPLICABLE"
                    ],
                    "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
                  },
                  "evidence": {
                    "type": "object",
                    "description": "Provenance for a single fact value.",
                    "properties": {
                      "source_type": {
                        "type": "string",
                        "enum": [
                          "TEXT",
                          "IMAGE",
                          "MULTI_SOURCE"
                        ],
                        "description": "Origin modality of the evidence."
                      },
                      "source_ref": {
                        "type": "string",
                        "description": "Text span label, image index, or attachment identifier."
                      },
                      "evidence_note": {
                        "type": "string",
                        "description": "Brief human-readable observation that supports this fact."
                      }
                    },
                    "required": [
                      "source_type",
                      "source_ref",
                      "evidence_note"
                    ],
                    "additionalProperties": false
                  }
                },
                "required": [
                  "value",
                  "fact_state"
                ],
                "additionalProperties": false
              }
            },
            "required": [
              "name",
              "entity_type",
              "role_code",
              "module_class",
              "width_mm",
              "quantity"
            ],
            "additionalProperties": false
          }
        },
        "forbidden_roles": {
          "type": "array",
          "description": "Module roles or types explicitly excluded.",
          "items": {
            "type": "object",
            "description": "A textual fact with certainty and optional evidence.",
            "properties": {
              "value": {
                "type": "string",
                "description": "Extracted value or empty string when UNKNOWN."
              },
              "fact_state": {
                "type": "string",
                "enum": [
                  "KNOWN",
                  "INFERRED",
                  "UNKNOWN",
                  "CONFLICT",
                  "NOT_APPLICABLE"
                ],
                "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
              },
              "evidence": {
                "type": "object",
                "description": "Provenance for a single fact value.",
                "properties": {
                  "source_type": {
                    "type": "string",
                    "enum": [
                      "TEXT",
                      "IMAGE",
                      "MULTI_SOURCE"
                    ],
                    "description": "Origin modality of the evidence."
                  },
                  "source_ref": {
                    "type": "string",
                    "description": "Text span label, image index, or attachment identifier."
                  },
                  "evidence_note": {
                    "type": "string",
                    "description": "Brief human-readable observation that supports this fact."
                  }
                },
                "required": [
                  "source_type",
                  "source_ref",
                  "evidence_note"
                ],
                "additionalProperties": false
              }
            },
            "required": [
              "value",
              "fact_state"
            ],
            "additionalProperties": false
          }
        },
        "preferred_module_order": {
          "type": "array",
          "description": "User-stated preferred order of modules.",
          "items": {
            "type": "object",
            "description": "A textual fact with certainty and optional evidence.",
            "properties": {
              "value": {
                "type": "string",
                "description": "Extracted value or empty string when UNKNOWN."
              },
              "fact_state": {
                "type": "string",
                "enum": [
                  "KNOWN",
                  "INFERRED",
                  "UNKNOWN",
                  "CONFLICT",
                  "NOT_APPLICABLE"
                ],
                "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
              },
              "evidence": {
                "type": "object",
                "description": "Provenance for a single fact value.",
                "properties": {
                  "source_type": {
                    "type": "string",
                    "enum": [
                      "TEXT",
                      "IMAGE",
                      "MULTI_SOURCE"
                    ],
                    "description": "Origin modality of the evidence."
                  },
                  "source_ref": {
                    "type": "string",
                    "description": "Text span label, image index, or attachment identifier."
                  },
                  "evidence_note": {
                    "type": "string",
                    "description": "Brief human-readable observation that supports this fact."
                  }
                },
                "required": [
                  "source_type",
                  "source_ref",
                  "evidence_note"
                ],
                "additionalProperties": false
              }
            },
            "required": [
              "value",
              "fact_state"
            ],
            "additionalProperties": false
          }
        }
      },
      "additionalProperties": false
    },
    "materials": {
      "type": "object",
      "description": "Material and finish preferences.",
      "properties": {
        "countertop_material": {
          "type": "object",
          "description": "Countertop/tabletop material.",
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": "object",
              "description": "Provenance for a single fact value.",
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              },
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "value",
            "fact_state"
          ],
          "additionalProperties": false
        },
        "facade_material": {
          "type": "object",
          "description": "Facade/doors material.",
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": "object",
              "description": "Provenance for a single fact value.",
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              },
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "value",
            "fact_state"
          ],
          "additionalProperties": false
        },
        "facade_color": {
          "type": "object",
          "description": "Facade colour or finish.",
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": "object",
              "description": "Provenance for a single fact value.",
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              },
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "value",
            "fact_state"
          ],
          "additionalProperties": false
        },
        "body_material": {
          "type": "object",
          "description": "Body/carcass material.",
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": "object",
              "description": "Provenance for a single fact value.",
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              },
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "value",
            "fact_state"
          ],
          "additionalProperties": false
        },
        "edge_material": {
          "type": "object",
          "description": "Edge-banding material.",
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": "object",
              "description": "Provenance for a single fact value.",
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              },
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "value",
            "fact_state"
          ],
          "additionalProperties": false
        },
        "hardware_preferences": {
          "type": "array",
          "description": "Preferred hardware brands or types.",
          "items": {
            "type": "object",
            "description": "A textual fact with certainty and optional evidence.",
            "properties": {
              "value": {
                "type": "string",
                "description": "Extracted value or empty string when UNKNOWN."
              },
              "fact_state": {
                "type": "string",
                "enum": [
                  "KNOWN",
                  "INFERRED",
                  "UNKNOWN",
                  "CONFLICT",
                  "NOT_APPLICABLE"
                ],
                "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
              },
              "evidence": {
                "type": "object",
                "description": "Provenance for a single fact value.",
                "properties": {
                  "source_type": {
                    "type": "string",
                    "enum": [
                      "TEXT",
                      "IMAGE",
                      "MULTI_SOURCE"
                    ],
                    "description": "Origin modality of the evidence."
                  },
                  "source_ref": {
                    "type": "string",
                    "description": "Text span label, image index, or attachment identifier."
                  },
                  "evidence_note": {
                    "type": "string",
                    "description": "Brief human-readable observation that supports this fact."
                  }
                },
                "required": [
                  "source_type",
                  "source_ref",
                  "evidence_note"
                ],
                "additionalProperties": false
              }
            },
            "required": [
              "value",
              "fact_state"
            ],
            "additionalProperties": false
          }
        }
      },
      "additionalProperties": false
    },
    "constraints": {
      "type": "object",
      "description": "Budget, timeline, and other project constraints.",
      "properties": {
        "budget_rub": {
          "type": "object",
          "description": "Overall budget in RUB.",
          "properties": {
            "value": {
              "type": "integer",
              "minimum": 0,
              "description": "Extracted integer value; 0 is the sentinel for UNKNOWN, CONFLICT, or NOT_APPLICABLE."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": "object",
              "description": "Provenance for a single fact value.",
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              },
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "value",
            "fact_state"
          ],
          "additionalProperties": false
        },
        "budget_notes": {
          "type": "object",
          "description": "Budget-related context.",
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": "object",
              "description": "Provenance for a single fact value.",
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              },
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "value",
            "fact_state"
          ],
          "additionalProperties": false
        },
        "deadline": {
          "type": "object",
          "description": "Expected completion or delivery date.",
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": "object",
              "description": "Provenance for a single fact value.",
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              },
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "value",
            "fact_state"
          ],
          "additionalProperties": false
        },
        "special_requirements": {
          "type": "array",
          "description": "Other special requirements or constraints.",
          "items": {
            "type": "object",
            "description": "A textual fact with certainty and optional evidence.",
            "properties": {
              "value": {
                "type": "string",
                "description": "Extracted value or empty string when UNKNOWN."
              },
              "fact_state": {
                "type": "string",
                "enum": [
                  "KNOWN",
                  "INFERRED",
                  "UNKNOWN",
                  "CONFLICT",
                  "NOT_APPLICABLE"
                ],
                "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
              },
              "evidence": {
                "type": "object",
                "description": "Provenance for a single fact value.",
                "properties": {
                  "source_type": {
                    "type": "string",
                    "enum": [
                      "TEXT",
                      "IMAGE",
                      "MULTI_SOURCE"
                    ],
                    "description": "Origin modality of the evidence."
                  },
                  "source_ref": {
                    "type": "string",
                    "description": "Text span label, image index, or attachment identifier."
                  },
                  "evidence_note": {
                    "type": "string",
                    "description": "Brief human-readable observation that supports this fact."
                  }
                },
                "required": [
                  "source_type",
                  "source_ref",
                  "evidence_note"
                ],
                "additionalProperties": false
              }
            },
            "required": [
              "value",
              "fact_state"
            ],
            "additionalProperties": false
          }
        }
      },
      "additionalProperties": false
    },
    "missing_questions": {
      "type": "array",
      "description": "Meaningful questions about insufficient data, returned by the parser.",
      "items": {
        "type": "object",
        "description": "A question about missing data that the deterministic flow or UX should surface.",
        "properties": {
          "question_id": {
            "type": "string",
            "description": "Stable machine-readable question identifier."
          },
          "field_path": {
            "type": "string",
            "description": "Dot-notation path to the relevant schema field."
          },
          "question": {
            "type": "string",
            "description": "Human-readable question text."
          },
          "priority": {
            "type": "string",
            "enum": [
              "BLOCKING",
              "IMPORTANT",
              "OPTIONAL"
            ],
            "description": "BLOCKING = deterministic flow cannot proceed without this; IMPORTANT = strongly recommended; OPTIONAL = nice-to-have."
          },
          "reason": {
            "type": "string",
            "description": "Why this information is needed."
          }
        },
        "required": [
          "question_id",
          "field_path",
          "question",
          "priority",
          "reason"
        ],
        "additionalProperties": false
      }
    },
    "evidence": {
      "type": "array",
      "description": "Aggregated source evidence summary for extracted facts.",
      "items": {
        "type": "object",
        "description": "A single source evidence entry summarising observed input.",
        "properties": {
          "source_type": {
            "type": "string",
            "enum": [
              "TEXT",
              "IMAGE",
              "MULTI_SOURCE"
            ]
          },
          "source_ref": {
            "type": "string",
            "description": "Text span label, image index, or attachment identifier."
          },
          "observation": {
            "type": "string",
            "description": "Brief description of what was observed in this source."
          },
          "relevant_fields": {
            "type": "array",
            "description": "Schema field paths informed by this evidence.",
            "items": {
              "type": "string"
            }
          }
        },
        "required": [
          "source_type",
          "observation"
        ],
        "additionalProperties": false
      }
    },
    "parser_metadata": {
      "type": "object",
      "description": "Technical metadata about the parser invocation.",
      "properties": {
        "request_id": {
          "type": "string",
          "description": "Caller-supplied or generated request identifier."
        },
        "parser_schema_version": {
          "type": "string",
          "description": "Version of the schema used for this parse."
        },
        "prompt_version": {
          "type": "string",
          "description": "Version of the parser prompt used."
        },
        "provider": {
          "type": "string",
          "enum": [
            "openrouter"
          ],
          "description": "LLM provider."
        },
        "model_requested": {
          "type": "string",
          "description": "Model slug requested from the provider."
        },
        "model_returned": {
          "type": "string",
          "description": "Model slug actually returned, if the API reports it."
        },
        "parsed_at": {
          "type": "string",
          "format": "date-time",
          "description": "ISO 8601 timestamp of the parse."
        },
        "input_modalities": {
          "type": "array",
          "description": "Modalities present in the input.",
          "items": {
            "type": "string",
            "enum": [
              "text",
              "image"
            ]
          }
        },
        "provider_request_id": {
          "type": "string",
          "description": "Provider-side request/generation ID if available."
        },
        "usage": {
          "type": "object",
          "description": "Token usage reported by the provider.",
          "properties": {
            "prompt_tokens": {
              "type": "integer"
            },
            "completion_tokens": {
              "type": "integer"
            },
            "total_tokens": {
              "type": "integer"
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "request_id",
        "parser_schema_version",
        "prompt_version",
        "provider",
        "model_requested",
        "parsed_at",
        "input_modalities"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "schema_version",
    "project_type",
    "missing_questions",
    "evidence",
    "parser_metadata"
  ],
  "additionalProperties": false,
  "$schema": "https://json-schema.org/draft/2020-12/schema"
});
// Generated OpenRouter/OpenAI strict Structured Outputs transport contract.
var PROJECT_INPUT_OPENROUTER_SCHEMA = Object.freeze({
  "description": "Versioned canonical output contract for the OpenRouter kitchen parser. One version per schema change. Used as the structured output contract and the final local validation gate.",
  "type": "object",
  "required": [
    "schema_version",
    "project_type",
    "project",
    "client",
    "layout",
    "modules",
    "materials",
    "constraints",
    "missing_questions",
    "evidence"
  ],
  "additionalProperties": false,
  "properties": {
    "schema_version": {
      "type": "string",
      "enum": [
        "project-input-v2"
      ],
      "description": "Canonical schema version specifier."
    },
    "project_type": {
      "type": "string",
      "enum": [
        "KITCHEN"
      ],
      "description": "MVP project category. Stage 7 accepts kitchen projects only."
    },
    "project": {
      "type": [
        "object",
        "null"
      ],
      "description": "Project-wide metadata.",
      "additionalProperties": false,
      "properties": {
        "name": {
          "type": [
            "object",
            "null"
          ],
          "description": "User-provided project name or description label.",
          "required": [
            "value",
            "fact_state",
            "evidence"
          ],
          "additionalProperties": false,
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": [
                "object",
                "null"
              ],
              "description": "Provenance for a single fact value.",
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false,
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              }
            }
          }
        },
        "notes": {
          "type": [
            "object",
            "null"
          ],
          "description": "Additional user notes.",
          "required": [
            "value",
            "fact_state",
            "evidence"
          ],
          "additionalProperties": false,
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": [
                "object",
                "null"
              ],
              "description": "Provenance for a single fact value.",
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false,
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              }
            }
          }
        }
      },
      "required": [
        "name",
        "notes"
      ]
    },
    "client": {
      "type": [
        "object",
        "null"
      ],
      "description": "Client or object context information.",
      "additionalProperties": false,
      "properties": {
        "name": {
          "type": [
            "object",
            "null"
          ],
          "description": "Client name.",
          "required": [
            "value",
            "fact_state",
            "evidence"
          ],
          "additionalProperties": false,
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": [
                "object",
                "null"
              ],
              "description": "Provenance for a single fact value.",
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false,
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              }
            }
          }
        },
        "address": {
          "type": [
            "object",
            "null"
          ],
          "description": "Installation address.",
          "required": [
            "value",
            "fact_state",
            "evidence"
          ],
          "additionalProperties": false,
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": [
                "object",
                "null"
              ],
              "description": "Provenance for a single fact value.",
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false,
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              }
            }
          }
        },
        "phone": {
          "type": [
            "object",
            "null"
          ],
          "description": "Contact phone.",
          "required": [
            "value",
            "fact_state",
            "evidence"
          ],
          "additionalProperties": false,
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": [
                "object",
                "null"
              ],
              "description": "Provenance for a single fact value.",
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false,
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              }
            }
          }
        }
      },
      "required": [
        "name",
        "address",
        "phone"
      ]
    },
    "layout": {
      "type": [
        "object",
        "null"
      ],
      "description": "Requested kitchen geometry and dimensions.",
      "additionalProperties": false,
      "properties": {
        "run_shape": {
          "type": [
            "object",
            "null"
          ],
          "description": "Shape explicitly requested or described by the user; the parser does not design a layout.",
          "required": [
            "value",
            "fact_state",
            "evidence"
          ],
          "additionalProperties": false,
          "properties": {
            "value": {
              "type": "string",
              "enum": [
                "straight",
                "L-shaped",
                "U-shaped",
                "galley",
                "unknown"
              ]
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": [
                "object",
                "null"
              ],
              "description": "Provenance for a single fact value.",
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false,
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              }
            }
          }
        },
        "run_length_mm": {
          "type": [
            "object",
            "null"
          ],
          "description": "Total available length for the run in millimetres.",
          "required": [
            "value",
            "fact_state",
            "evidence"
          ],
          "additionalProperties": false,
          "properties": {
            "value": {
              "type": "integer",
              "description": "Extracted integer value; 0 is the sentinel for UNKNOWN, CONFLICT, or NOT_APPLICABLE."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": [
                "object",
                "null"
              ],
              "description": "Provenance for a single fact value.",
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false,
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              }
            }
          }
        },
        "zone": {
          "type": [
            "object",
            "null"
          ],
          "description": "Which user-described zone the geometry applies to.",
          "required": [
            "value",
            "fact_state",
            "evidence"
          ],
          "additionalProperties": false,
          "properties": {
            "value": {
              "type": "string",
              "enum": [
                "base",
                "wall",
                "tall",
                "unknown"
              ]
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": [
                "object",
                "null"
              ],
              "description": "Provenance for a single fact value.",
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false,
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              }
            }
          }
        },
        "wall_height_mm": {
          "type": [
            "object",
            "null"
          ],
          "description": "Room height constraint.",
          "required": [
            "value",
            "fact_state",
            "evidence"
          ],
          "additionalProperties": false,
          "properties": {
            "value": {
              "type": "integer",
              "description": "Extracted integer value; 0 is the sentinel for UNKNOWN, CONFLICT, or NOT_APPLICABLE."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": [
                "object",
                "null"
              ],
              "description": "Provenance for a single fact value.",
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false,
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              }
            }
          }
        }
      },
      "required": [
        "run_shape",
        "run_length_mm",
        "zone",
        "wall_height_mm"
      ]
    },
    "modules": {
      "type": [
        "object",
        "null"
      ],
      "description": "Required modules, appliances, and their constraints.",
      "additionalProperties": false,
      "properties": {
        "required_modules": {
          "type": [
            "array",
            "null"
          ],
          "description": "Explicitly requested layout furniture modules or appliance slots. Non-layout surfaces such as countertops are excluded.",
          "items": {
            "type": "object",
            "description": "A single required furniture module or appliance slot supported by the linear layout contract.",
            "required": [
              "name",
              "entity_type",
              "role_code",
              "module_class",
              "width_mm",
              "quantity"
            ],
            "additionalProperties": false,
            "properties": {
              "name": {
                "type": "object",
                "description": "Human-readable module or appliance-slot name.",
                "required": [
                  "value",
                  "fact_state",
                  "evidence"
                ],
                "additionalProperties": false,
                "properties": {
                  "value": {
                    "type": "string",
                    "description": "Extracted value or empty string when UNKNOWN."
                  },
                  "fact_state": {
                    "type": "string",
                    "enum": [
                      "KNOWN",
                      "INFERRED",
                      "UNKNOWN",
                      "CONFLICT",
                      "NOT_APPLICABLE"
                    ],
                    "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
                  },
                  "evidence": {
                    "type": [
                      "object",
                      "null"
                    ],
                    "description": "Provenance for a single fact value.",
                    "required": [
                      "source_type",
                      "source_ref",
                      "evidence_note"
                    ],
                    "additionalProperties": false,
                    "properties": {
                      "source_type": {
                        "type": "string",
                        "enum": [
                          "TEXT",
                          "IMAGE",
                          "MULTI_SOURCE"
                        ],
                        "description": "Origin modality of the evidence."
                      },
                      "source_ref": {
                        "type": "string",
                        "description": "Text span label, image index, or attachment identifier."
                      },
                      "evidence_note": {
                        "type": "string",
                        "description": "Brief human-readable observation that supports this fact."
                      }
                    }
                  }
                }
              },
              "entity_type": {
                "type": "object",
                "description": "Canonical machine entity type; never a translated free-text label.",
                "required": [
                  "value",
                  "fact_state",
                  "evidence"
                ],
                "additionalProperties": false,
                "properties": {
                  "value": {
                    "type": "string",
                    "enum": [
                      "MODULE",
                      "APPLIANCE_SLOT",
                      "unknown"
                    ]
                  },
                  "fact_state": {
                    "type": "string",
                    "enum": [
                      "KNOWN",
                      "INFERRED",
                      "UNKNOWN",
                      "CONFLICT",
                      "NOT_APPLICABLE"
                    ],
                    "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
                  },
                  "evidence": {
                    "type": [
                      "object",
                      "null"
                    ],
                    "description": "Provenance for a single fact value.",
                    "required": [
                      "source_type",
                      "source_ref",
                      "evidence_note"
                    ],
                    "additionalProperties": false,
                    "properties": {
                      "source_type": {
                        "type": "string",
                        "enum": [
                          "TEXT",
                          "IMAGE",
                          "MULTI_SOURCE"
                        ],
                        "description": "Origin modality of the evidence."
                      },
                      "source_ref": {
                        "type": "string",
                        "description": "Text span label, image index, or attachment identifier."
                      },
                      "evidence_note": {
                        "type": "string",
                        "description": "Brief human-readable observation that supports this fact."
                      }
                    }
                  }
                }
              },
              "role_code": {
                "type": "object",
                "description": "Canonical machine role code; unknown classification uses the unknown sentinel.",
                "required": [
                  "value",
                  "fact_state",
                  "evidence"
                ],
                "additionalProperties": false,
                "properties": {
                  "value": {
                    "type": "string",
                    "enum": [
                      "generic_storage",
                      "drawer",
                      "sink",
                      "dishwasher_slot",
                      "oven",
                      "hob",
                      "narrow_cargo",
                      "dish_dryer",
                      "hood",
                      "pantry",
                      "fridge",
                      "unknown"
                    ]
                  },
                  "fact_state": {
                    "type": "string",
                    "enum": [
                      "KNOWN",
                      "INFERRED",
                      "UNKNOWN",
                      "CONFLICT",
                      "NOT_APPLICABLE"
                    ],
                    "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
                  },
                  "evidence": {
                    "type": [
                      "object",
                      "null"
                    ],
                    "description": "Provenance for a single fact value.",
                    "required": [
                      "source_type",
                      "source_ref",
                      "evidence_note"
                    ],
                    "additionalProperties": false,
                    "properties": {
                      "source_type": {
                        "type": "string",
                        "enum": [
                          "TEXT",
                          "IMAGE",
                          "MULTI_SOURCE"
                        ],
                        "description": "Origin modality of the evidence."
                      },
                      "source_ref": {
                        "type": "string",
                        "description": "Text span label, image index, or attachment identifier."
                      },
                      "evidence_note": {
                        "type": "string",
                        "description": "Brief human-readable observation that supports this fact."
                      }
                    }
                  }
                }
              },
              "module_class": {
                "type": "object",
                "description": "User-requested class of module (base, wall, tall) or unknown.",
                "required": [
                  "value",
                  "fact_state",
                  "evidence"
                ],
                "additionalProperties": false,
                "properties": {
                  "value": {
                    "type": "string",
                    "enum": [
                      "base",
                      "wall",
                      "tall",
                      "unknown"
                    ]
                  },
                  "fact_state": {
                    "type": "string",
                    "enum": [
                      "KNOWN",
                      "INFERRED",
                      "UNKNOWN",
                      "CONFLICT",
                      "NOT_APPLICABLE"
                    ],
                    "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
                  },
                  "evidence": {
                    "type": [
                      "object",
                      "null"
                    ],
                    "description": "Provenance for a single fact value.",
                    "required": [
                      "source_type",
                      "source_ref",
                      "evidence_note"
                    ],
                    "additionalProperties": false,
                    "properties": {
                      "source_type": {
                        "type": "string",
                        "enum": [
                          "TEXT",
                          "IMAGE",
                          "MULTI_SOURCE"
                        ],
                        "description": "Origin modality of the evidence."
                      },
                      "source_ref": {
                        "type": "string",
                        "description": "Text span label, image index, or attachment identifier."
                      },
                      "evidence_note": {
                        "type": "string",
                        "description": "Brief human-readable observation that supports this fact."
                      }
                    }
                  }
                }
              },
              "width_mm": {
                "type": "object",
                "description": "Module width in millimetres.",
                "required": [
                  "value",
                  "fact_state",
                  "evidence"
                ],
                "additionalProperties": false,
                "properties": {
                  "value": {
                    "type": "integer",
                    "description": "Extracted integer value; 0 is the sentinel for UNKNOWN, CONFLICT, or NOT_APPLICABLE."
                  },
                  "fact_state": {
                    "type": "string",
                    "enum": [
                      "KNOWN",
                      "INFERRED",
                      "UNKNOWN",
                      "CONFLICT",
                      "NOT_APPLICABLE"
                    ],
                    "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
                  },
                  "evidence": {
                    "type": [
                      "object",
                      "null"
                    ],
                    "description": "Provenance for a single fact value.",
                    "required": [
                      "source_type",
                      "source_ref",
                      "evidence_note"
                    ],
                    "additionalProperties": false,
                    "properties": {
                      "source_type": {
                        "type": "string",
                        "enum": [
                          "TEXT",
                          "IMAGE",
                          "MULTI_SOURCE"
                        ],
                        "description": "Origin modality of the evidence."
                      },
                      "source_ref": {
                        "type": "string",
                        "description": "Text span label, image index, or attachment identifier."
                      },
                      "evidence_note": {
                        "type": "string",
                        "description": "Brief human-readable observation that supports this fact."
                      }
                    }
                  }
                }
              },
              "quantity": {
                "type": "object",
                "description": "Number of units required.",
                "required": [
                  "value",
                  "fact_state",
                  "evidence"
                ],
                "additionalProperties": false,
                "properties": {
                  "value": {
                    "type": "integer",
                    "description": "Extracted integer value; 0 is the sentinel for UNKNOWN, CONFLICT, or NOT_APPLICABLE."
                  },
                  "fact_state": {
                    "type": "string",
                    "enum": [
                      "KNOWN",
                      "INFERRED",
                      "UNKNOWN",
                      "CONFLICT",
                      "NOT_APPLICABLE"
                    ],
                    "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
                  },
                  "evidence": {
                    "type": [
                      "object",
                      "null"
                    ],
                    "description": "Provenance for a single fact value.",
                    "required": [
                      "source_type",
                      "source_ref",
                      "evidence_note"
                    ],
                    "additionalProperties": false,
                    "properties": {
                      "source_type": {
                        "type": "string",
                        "enum": [
                          "TEXT",
                          "IMAGE",
                          "MULTI_SOURCE"
                        ],
                        "description": "Origin modality of the evidence."
                      },
                      "source_ref": {
                        "type": "string",
                        "description": "Text span label, image index, or attachment identifier."
                      },
                      "evidence_note": {
                        "type": "string",
                        "description": "Brief human-readable observation that supports this fact."
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "forbidden_roles": {
          "type": [
            "array",
            "null"
          ],
          "description": "Module roles or types explicitly excluded.",
          "items": {
            "type": "object",
            "description": "A textual fact with certainty and optional evidence.",
            "required": [
              "value",
              "fact_state",
              "evidence"
            ],
            "additionalProperties": false,
            "properties": {
              "value": {
                "type": "string",
                "description": "Extracted value or empty string when UNKNOWN."
              },
              "fact_state": {
                "type": "string",
                "enum": [
                  "KNOWN",
                  "INFERRED",
                  "UNKNOWN",
                  "CONFLICT",
                  "NOT_APPLICABLE"
                ],
                "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
              },
              "evidence": {
                "type": [
                  "object",
                  "null"
                ],
                "description": "Provenance for a single fact value.",
                "required": [
                  "source_type",
                  "source_ref",
                  "evidence_note"
                ],
                "additionalProperties": false,
                "properties": {
                  "source_type": {
                    "type": "string",
                    "enum": [
                      "TEXT",
                      "IMAGE",
                      "MULTI_SOURCE"
                    ],
                    "description": "Origin modality of the evidence."
                  },
                  "source_ref": {
                    "type": "string",
                    "description": "Text span label, image index, or attachment identifier."
                  },
                  "evidence_note": {
                    "type": "string",
                    "description": "Brief human-readable observation that supports this fact."
                  }
                }
              }
            }
          }
        },
        "preferred_module_order": {
          "type": [
            "array",
            "null"
          ],
          "description": "User-stated preferred order of modules.",
          "items": {
            "type": "object",
            "description": "A textual fact with certainty and optional evidence.",
            "required": [
              "value",
              "fact_state",
              "evidence"
            ],
            "additionalProperties": false,
            "properties": {
              "value": {
                "type": "string",
                "description": "Extracted value or empty string when UNKNOWN."
              },
              "fact_state": {
                "type": "string",
                "enum": [
                  "KNOWN",
                  "INFERRED",
                  "UNKNOWN",
                  "CONFLICT",
                  "NOT_APPLICABLE"
                ],
                "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
              },
              "evidence": {
                "type": [
                  "object",
                  "null"
                ],
                "description": "Provenance for a single fact value.",
                "required": [
                  "source_type",
                  "source_ref",
                  "evidence_note"
                ],
                "additionalProperties": false,
                "properties": {
                  "source_type": {
                    "type": "string",
                    "enum": [
                      "TEXT",
                      "IMAGE",
                      "MULTI_SOURCE"
                    ],
                    "description": "Origin modality of the evidence."
                  },
                  "source_ref": {
                    "type": "string",
                    "description": "Text span label, image index, or attachment identifier."
                  },
                  "evidence_note": {
                    "type": "string",
                    "description": "Brief human-readable observation that supports this fact."
                  }
                }
              }
            }
          }
        }
      },
      "required": [
        "required_modules",
        "forbidden_roles",
        "preferred_module_order"
      ]
    },
    "materials": {
      "type": [
        "object",
        "null"
      ],
      "description": "Material and finish preferences.",
      "additionalProperties": false,
      "properties": {
        "countertop_material": {
          "type": [
            "object",
            "null"
          ],
          "description": "Countertop/tabletop material.",
          "required": [
            "value",
            "fact_state",
            "evidence"
          ],
          "additionalProperties": false,
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": [
                "object",
                "null"
              ],
              "description": "Provenance for a single fact value.",
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false,
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              }
            }
          }
        },
        "facade_material": {
          "type": [
            "object",
            "null"
          ],
          "description": "Facade/doors material.",
          "required": [
            "value",
            "fact_state",
            "evidence"
          ],
          "additionalProperties": false,
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": [
                "object",
                "null"
              ],
              "description": "Provenance for a single fact value.",
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false,
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              }
            }
          }
        },
        "facade_color": {
          "type": [
            "object",
            "null"
          ],
          "description": "Facade colour or finish.",
          "required": [
            "value",
            "fact_state",
            "evidence"
          ],
          "additionalProperties": false,
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": [
                "object",
                "null"
              ],
              "description": "Provenance for a single fact value.",
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false,
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              }
            }
          }
        },
        "body_material": {
          "type": [
            "object",
            "null"
          ],
          "description": "Body/carcass material.",
          "required": [
            "value",
            "fact_state",
            "evidence"
          ],
          "additionalProperties": false,
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": [
                "object",
                "null"
              ],
              "description": "Provenance for a single fact value.",
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false,
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              }
            }
          }
        },
        "edge_material": {
          "type": [
            "object",
            "null"
          ],
          "description": "Edge-banding material.",
          "required": [
            "value",
            "fact_state",
            "evidence"
          ],
          "additionalProperties": false,
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": [
                "object",
                "null"
              ],
              "description": "Provenance for a single fact value.",
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false,
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              }
            }
          }
        },
        "hardware_preferences": {
          "type": [
            "array",
            "null"
          ],
          "description": "Preferred hardware brands or types.",
          "items": {
            "type": "object",
            "description": "A textual fact with certainty and optional evidence.",
            "required": [
              "value",
              "fact_state",
              "evidence"
            ],
            "additionalProperties": false,
            "properties": {
              "value": {
                "type": "string",
                "description": "Extracted value or empty string when UNKNOWN."
              },
              "fact_state": {
                "type": "string",
                "enum": [
                  "KNOWN",
                  "INFERRED",
                  "UNKNOWN",
                  "CONFLICT",
                  "NOT_APPLICABLE"
                ],
                "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
              },
              "evidence": {
                "type": [
                  "object",
                  "null"
                ],
                "description": "Provenance for a single fact value.",
                "required": [
                  "source_type",
                  "source_ref",
                  "evidence_note"
                ],
                "additionalProperties": false,
                "properties": {
                  "source_type": {
                    "type": "string",
                    "enum": [
                      "TEXT",
                      "IMAGE",
                      "MULTI_SOURCE"
                    ],
                    "description": "Origin modality of the evidence."
                  },
                  "source_ref": {
                    "type": "string",
                    "description": "Text span label, image index, or attachment identifier."
                  },
                  "evidence_note": {
                    "type": "string",
                    "description": "Brief human-readable observation that supports this fact."
                  }
                }
              }
            }
          }
        }
      },
      "required": [
        "countertop_material",
        "facade_material",
        "facade_color",
        "body_material",
        "edge_material",
        "hardware_preferences"
      ]
    },
    "constraints": {
      "type": [
        "object",
        "null"
      ],
      "description": "Budget, timeline, and other project constraints.",
      "additionalProperties": false,
      "properties": {
        "budget_rub": {
          "type": [
            "object",
            "null"
          ],
          "description": "Overall budget in RUB.",
          "required": [
            "value",
            "fact_state",
            "evidence"
          ],
          "additionalProperties": false,
          "properties": {
            "value": {
              "type": "integer",
              "description": "Extracted integer value; 0 is the sentinel for UNKNOWN, CONFLICT, or NOT_APPLICABLE."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": [
                "object",
                "null"
              ],
              "description": "Provenance for a single fact value.",
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false,
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              }
            }
          }
        },
        "budget_notes": {
          "type": [
            "object",
            "null"
          ],
          "description": "Budget-related context.",
          "required": [
            "value",
            "fact_state",
            "evidence"
          ],
          "additionalProperties": false,
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": [
                "object",
                "null"
              ],
              "description": "Provenance for a single fact value.",
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false,
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              }
            }
          }
        },
        "deadline": {
          "type": [
            "object",
            "null"
          ],
          "description": "Expected completion or delivery date.",
          "required": [
            "value",
            "fact_state",
            "evidence"
          ],
          "additionalProperties": false,
          "properties": {
            "value": {
              "type": "string",
              "description": "Extracted value or empty string when UNKNOWN."
            },
            "fact_state": {
              "type": "string",
              "enum": [
                "KNOWN",
                "INFERRED",
                "UNKNOWN",
                "CONFLICT",
                "NOT_APPLICABLE"
              ],
              "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
            },
            "evidence": {
              "type": [
                "object",
                "null"
              ],
              "description": "Provenance for a single fact value.",
              "required": [
                "source_type",
                "source_ref",
                "evidence_note"
              ],
              "additionalProperties": false,
              "properties": {
                "source_type": {
                  "type": "string",
                  "enum": [
                    "TEXT",
                    "IMAGE",
                    "MULTI_SOURCE"
                  ],
                  "description": "Origin modality of the evidence."
                },
                "source_ref": {
                  "type": "string",
                  "description": "Text span label, image index, or attachment identifier."
                },
                "evidence_note": {
                  "type": "string",
                  "description": "Brief human-readable observation that supports this fact."
                }
              }
            }
          }
        },
        "special_requirements": {
          "type": [
            "array",
            "null"
          ],
          "description": "Other special requirements or constraints.",
          "items": {
            "type": "object",
            "description": "A textual fact with certainty and optional evidence.",
            "required": [
              "value",
              "fact_state",
              "evidence"
            ],
            "additionalProperties": false,
            "properties": {
              "value": {
                "type": "string",
                "description": "Extracted value or empty string when UNKNOWN."
              },
              "fact_state": {
                "type": "string",
                "enum": [
                  "KNOWN",
                  "INFERRED",
                  "UNKNOWN",
                  "CONFLICT",
                  "NOT_APPLICABLE"
                ],
                "description": "Certainty level of a parsed fact. KNOWN = explicitly stated; INFERRED = limited evidence-based deduction; UNKNOWN = no data; CONFLICT = contradictory sources; NOT_APPLICABLE = consciously irrelevant."
              },
              "evidence": {
                "type": [
                  "object",
                  "null"
                ],
                "description": "Provenance for a single fact value.",
                "required": [
                  "source_type",
                  "source_ref",
                  "evidence_note"
                ],
                "additionalProperties": false,
                "properties": {
                  "source_type": {
                    "type": "string",
                    "enum": [
                      "TEXT",
                      "IMAGE",
                      "MULTI_SOURCE"
                    ],
                    "description": "Origin modality of the evidence."
                  },
                  "source_ref": {
                    "type": "string",
                    "description": "Text span label, image index, or attachment identifier."
                  },
                  "evidence_note": {
                    "type": "string",
                    "description": "Brief human-readable observation that supports this fact."
                  }
                }
              }
            }
          }
        }
      },
      "required": [
        "budget_rub",
        "budget_notes",
        "deadline",
        "special_requirements"
      ]
    },
    "missing_questions": {
      "type": "array",
      "description": "Meaningful questions about insufficient data, returned by the parser.",
      "items": {
        "type": "object",
        "description": "A question about missing data that the deterministic flow or UX should surface.",
        "required": [
          "question_id",
          "field_path",
          "question",
          "priority",
          "reason"
        ],
        "additionalProperties": false,
        "properties": {
          "question_id": {
            "type": "string",
            "description": "Stable machine-readable question identifier."
          },
          "field_path": {
            "type": "string",
            "description": "Dot-notation path to the relevant schema field."
          },
          "question": {
            "type": "string",
            "description": "Human-readable question text."
          },
          "priority": {
            "type": "string",
            "enum": [
              "BLOCKING",
              "IMPORTANT",
              "OPTIONAL"
            ],
            "description": "BLOCKING = deterministic flow cannot proceed without this; IMPORTANT = strongly recommended; OPTIONAL = nice-to-have."
          },
          "reason": {
            "type": "string",
            "description": "Why this information is needed."
          }
        }
      }
    },
    "evidence": {
      "type": "array",
      "description": "Aggregated source evidence summary for extracted facts.",
      "items": {
        "type": "object",
        "description": "A single source evidence entry summarising observed input.",
        "required": [
          "source_type",
          "source_ref",
          "observation",
          "relevant_fields"
        ],
        "additionalProperties": false,
        "properties": {
          "source_type": {
            "type": "string",
            "enum": [
              "TEXT",
              "IMAGE",
              "MULTI_SOURCE"
            ]
          },
          "source_ref": {
            "type": [
              "string",
              "null"
            ],
            "description": "Text span label, image index, or attachment identifier."
          },
          "observation": {
            "type": "string",
            "description": "Brief description of what was observed in this source."
          },
          "relevant_fields": {
            "type": [
              "array",
              "null"
            ],
            "description": "Schema field paths informed by this evidence.",
            "items": {
              "type": "string"
            }
          }
        }
      }
    }
  }
});
