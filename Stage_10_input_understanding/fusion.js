'use strict';

function getStage10() {
  return require('./index.js');
}

var SOURCE_PRIORITY_ORDER = [
  'USER_CONFIRMATION',
  'USER_DIMENSION',
  'USER_TEXT',
  'IMAGE_TEXT',
  'VISION_ENTITY',
  'DEFAULT_CANDIDATE'
];

var SOURCE_PRIORITY_MAP = {};
for (var p = 0; p < SOURCE_PRIORITY_ORDER.length; p += 1) {
  SOURCE_PRIORITY_MAP[SOURCE_PRIORITY_ORDER[p]] = p + 1;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function issue(code, status, message, path) {
  return {
    code: code,
    status: status,
    message: message,
    path: path || null,
    source_rule: null
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveNumber(value) {
  return isNumber(value) && value > 0;
}

function normalizeTargetPath(targetPath) {
  if (typeof targetPath !== 'string') {
    return '';
  }
  var path = targetPath.trim();
  if (path.indexOf('$.') === 0) {
    path = path.slice(2);
  }
  return path;
}

function extractNumericValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (isPlainObject(value) && typeof value.value === 'number' && Number.isFinite(value.value)) {
    var unit = value.unit;
    if (unit === 'mm' || !unit) {
      return value.value;
    }
    if (unit === 'cm') {
      return value.value * 10;
    }
    if (unit === 'm') {
      return value.value * 1000;
    }
    return value.value;
  }
  if (typeof value === 'string') {
    var parsed = Number(value.trim());
    if (Number.isFinite(parsed) && value.trim() !== '') {
      return parsed;
    }
  }
  return null;
}

function parseTargetPath(targetPath) {
  var normalized = normalizeTargetPath(targetPath);
  var moduleDimMatch = /^assemblies\[(\d+)\]\.modules\[(\d+)\]\.dimensions\.(width_mm|height_mm|depth_mm)$/.exec(normalized);
  if (moduleDimMatch) {
    return {
      type: 'MODULE_DIMENSION',
      assemblyIndex: parseInt(moduleDimMatch[1], 10),
      moduleIndex: parseInt(moduleDimMatch[2], 10),
      dimensionKey: moduleDimMatch[3],
      normalizedPath: normalized
    };
  }

  var globalDimMatch = /^global_dimensions\.(finished_worktop_height_mm|toe_kick_height_mm|countertop_thickness_mm)$/.exec(normalized);
  if (globalDimMatch) {
    return {
      type: 'GLOBAL_DIMENSION',
      fieldKey: globalDimMatch[1],
      normalizedPath: normalized
    };
  }

  var assemblyOverallMatch = /^assemblies\[(\d+)\]\.(overall_width_mm|overall_depth_mm|finished_height_mm)$/.exec(normalized);
  if (assemblyOverallMatch) {
    return {
      type: 'ASSEMBLY_DIMENSION',
      assemblyIndex: parseInt(assemblyOverallMatch[1], 10),
      fieldKey: assemblyOverallMatch[2],
      normalizedPath: normalized
    };
  }

  return null;
}

function resolveCellLocation(draft, parsed) {
  if (!parsed) {
    return null;
  }

  if (parsed.type === 'MODULE_DIMENSION') {
    if (!draft.assemblies || !draft.assemblies[parsed.assemblyIndex]) {
      return null;
    }
    var assembly = draft.assemblies[parsed.assemblyIndex];
    if (!assembly.modules || !assembly.modules[parsed.moduleIndex]) {
      return null;
    }
    var module_ = assembly.modules[parsed.moduleIndex];
    if (!module_.dimensions || !isPlainObject(module_.dimensions[parsed.dimensionKey])) {
      return null;
    }
    return {
      kind: 'DIMENSION_CELL',
      get: function () {
        return module_.dimensions[parsed.dimensionKey];
      },
      set: function (newCell) {
        module_.dimensions[parsed.dimensionKey] = newCell;
      }
    };
  }

  return null;
}

function compareEvidenceDeterministically(a, b) {
  var normA = normalizeTargetPath(a.target_path);
  var normB = normalizeTargetPath(b.target_path);
  if (normA < normB) return -1;
  if (normA > normB) return 1;

  var pA = SOURCE_PRIORITY_MAP[a.source_type] || 999;
  var pB = SOURCE_PRIORITY_MAP[b.source_type] || 999;
  if (pA < pB) return -1;
  if (pA > pB) return 1;

  var refA = String(a.source_ref || '');
  var refB = String(b.source_ref || '');
  if (refA < refB) return -1;
  if (refA > refB) return 1;

  var strValA = JSON.stringify(a.value !== undefined ? a.value : null);
  var strValB = JSON.stringify(b.value !== undefined ? b.value : null);
  if (strValA < strValB) return -1;
  if (strValA > strValB) return 1;

  var confA = typeof a.confidence === 'number' ? a.confidence : 0;
  var confB = typeof b.confidence === 'number' ? b.confidence : 0;
  if (confB !== confA) {
    return confB - confA;
  }

  return 0;
}

function sortedUniqueNumbers(values) {
  var seen = {};
  var out = [];
  for (var i = 0; i < values.length; i += 1) {
    var v = values[i];
    if (isNumber(v) && !Object.prototype.hasOwnProperty.call(seen, v)) {
      seen[v] = true;
      out.push(v);
    }
  }
  out.sort(function (x, y) { return x - y; });
  return out;
}

function fuseEvidence(draft, evidenceItems) {
  var stage10 = getStage10();

  if (!isPlainObject(draft)) {
    return {
      Ok: false,
      Draft: null,
      Issues: [issue('DRAFT_INVALID', 'VALIDATION_ERROR', 'Input draft must be a valid object.', '$')]
    };
  }

  var draftValidation = stage10.validateDraft(draft);
  if (draftValidation.length > 0) {
    return {
      Ok: false,
      Draft: null,
      Issues: draftValidation
    };
  }

  if (!Array.isArray(evidenceItems)) {
    return {
      Ok: false,
      Draft: null,
      Issues: [issue('EVIDENCE_INVALID', 'VALIDATION_ERROR', 'evidenceItems must be an array.', '$')]
    };
  }

  var evidenceValidation = stage10.validateEvidence(evidenceItems);
  if (evidenceValidation.length > 0) {
    return {
      Ok: false,
      Draft: null,
      Issues: evidenceValidation
    };
  }

  var clonedDraft = clone(draft);
  var issues = [];

  var sortedEvidence = evidenceItems.slice().sort(compareEvidenceDeterministically);

  var evidenceByTarget = {};
  var targetPathList = [];

  for (var i = 0; i < sortedEvidence.length; i += 1) {
    var ev = sortedEvidence[i];
    var parsed = parseTargetPath(ev.target_path);
    if (!parsed) {
      issues.push(issue('UNKNOWN_TARGET_PATH', 'VALIDATION_ERROR', 'Unknown or unresolvable target_path: ' + ev.target_path, 'evidence[' + i + '].target_path'));
      continue;
    }

    var location = resolveCellLocation(clonedDraft, parsed);
    if (!location) {
      issues.push(issue('TARGET_PATH_NOT_FOUND', 'VALIDATION_ERROR', 'target_path does not resolve to an existing draft cell: ' + ev.target_path, 'evidence[' + i + '].target_path'));
      continue;
    }

    var normPath = parsed.normalizedPath;
    if (!evidenceByTarget[normPath]) {
      evidenceByTarget[normPath] = {
        parsed: parsed,
        location: location,
        items: []
      };
      targetPathList.push(normPath);
    }
    evidenceByTarget[normPath].items.push(ev);
  }

  if (issues.length > 0) {
    return {
      Ok: false,
      Draft: null,
      Issues: issues
    };
  }

  targetPathList.sort();

  for (var t = 0; t < targetPathList.length; t += 1) {
    var targetKey = targetPathList[t];
    var group = evidenceByTarget[targetKey];
    var items = group.items;
    var location = group.location;

    var highestPriorityRank = 999;
    for (var j = 0; j < items.length; j += 1) {
      var r = SOURCE_PRIORITY_MAP[items[j].source_type] || 999;
      if (r < highestPriorityRank) {
        highestPriorityRank = r;
      }
    }

    var highestPriorityItems = [];
    for (var k = 0; k < items.length; k += 1) {
      var itemRank = SOURCE_PRIORITY_MAP[items[k].source_type] || 999;
      if (itemRank === highestPriorityRank) {
        highestPriorityItems.push(items[k]);
      }
    }

    var numericValues = [];
    for (var h = 0; h < highestPriorityItems.length; h += 1) {
      var numVal = extractNumericValue(highestPriorityItems[h].value);
      if (numVal !== null) {
        numericValues.push(numVal);
      }
    }

    var uniqueValues = sortedUniqueNumbers(numericValues);
    var primaryItem = highestPriorityItems[0];
    var primarySourceType = primaryItem.source_type;

    if (uniqueValues.length === 1) {
      var chosenValue = uniqueValues[0];
      if (primarySourceType === 'DEFAULT_CANDIDATE') {
        location.set({
          state: 'NEEDS_CONFIRMATION',
          value: chosenValue,
          source_type: 'DEFAULT_CANDIDATE',
          source_ref: primaryItem.source_ref,
          evidence_state: 'ALPHA_DEFAULT',
          note: 'Default candidate from ' + primaryItem.source_ref
        });
      } else {
        var evidenceState = 'EXPLICIT';
        if (primarySourceType === 'USER_CONFIRMATION') {
          evidenceState = 'MANAGER_CONFIRMED';
        } else if (primarySourceType === 'VISION_ENTITY') {
          evidenceState = 'VISUAL_INFERRED';
        }

        location.set({
          state: 'KNOWN',
          value: chosenValue,
          source_ref: primaryItem.source_ref,
          source_type: primarySourceType,
          evidence_state: evidenceState,
          note: 'Fused value from ' + primarySourceType
        });
      }
    } else if (uniqueValues.length > 1) {
      location.set({
        state: 'CONFLICT',
        options: uniqueValues,
        source_ref: primaryItem.source_ref,
        source_type: primarySourceType,
        evidence_state: 'EXPLICIT',
        note: 'Conflicting values at priority ' + primarySourceType + ': ' + uniqueValues.join(', ')
      });
    }
  }

  var existingSourceRefIds = {};
  if (Array.isArray(clonedDraft.source_refs)) {
    for (var s = 0; s < clonedDraft.source_refs.length; s += 1) {
      existingSourceRefIds[clonedDraft.source_refs[s].id] = true;
    }
  } else {
    clonedDraft.source_refs = [];
  }

  for (var e = 0; e < sortedEvidence.length; e += 1) {
    var refId = sortedEvidence[e].source_ref;
    if (refId && !existingSourceRefIds[refId]) {
      var refType = 'NOTE';
      if (sortedEvidence[e].source_type === 'USER_CONFIRMATION') {
        refType = 'MANUAL_CONFIRMATION';
      } else if (sortedEvidence[e].source_type === 'IMAGE_TEXT' || sortedEvidence[e].source_type === 'VISION_ENTITY') {
        refType = 'IMAGE';
      }
      clonedDraft.source_refs.push({
        id: refId,
        type: refType,
        file: refId,
        note: 'Fused evidence source: ' + sortedEvidence[e].source_type
      });
      existingSourceRefIds[refId] = true;
    }
  }

  return {
    Ok: true,
    Draft: clonedDraft,
    Issues: []
  };
}

module.exports = {
  SOURCE_PRIORITY_ORDER: SOURCE_PRIORITY_ORDER,
  SOURCE_PRIORITY_MAP: SOURCE_PRIORITY_MAP,
  fuseEvidence: fuseEvidence,
  FuseEvidence: fuseEvidence
};
