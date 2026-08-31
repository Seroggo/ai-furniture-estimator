'use strict';

var SUPPORTED_OPERATORS = ['EQ', 'NE', 'LT', 'LTE', 'GT', 'GTE', 'IN', 'NOT_IN'];
var RESOLUTION_MODES = ['DEFAULT_CANDIDATE', 'REQUIRED_QUESTION'];

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value, key) {
  return value !== null && value !== undefined && Object.prototype.hasOwnProperty.call(value, key);
}

function isPresent(value) {
  return value !== undefined && value !== null;
}

function unwrapCell(value) {
  if (!isPlainObject(value) || !hasOwn(value, 'state')) return value;
  return hasOwn(value, 'value') ? value.value : undefined;
}

function pathTokens(path) {
  var tokens = [];
  var expression = /([^.\[\]]+)|\[(\d+)\]/g;
  var match;
  while ((match = expression.exec(String(path || ''))) !== null) {
    tokens.push(match[2] === undefined ? match[1] : Number(match[2]));
  }
  return tokens;
}

function readPath(value, path) {
  var current = value;
  var tokens = pathTokens(path);
  for (var i = 0; i < tokens.length; i += 1) {
    if (current === null || current === undefined || !hasOwn(current, tokens[i])) return undefined;
    current = current[tokens[i]];
  }
  return unwrapCell(current);
}

function readModulePath(module_, path) {
  var direct = readPath(module_, path);
  if (direct !== undefined) return direct;
  if (isPlainObject(module_) && isPlainObject(module_.dimensions) && hasOwn(module_.dimensions, path)) {
    return unwrapCell(module_.dimensions[path]);
  }
  if (isPlainObject(module_) && isPlainObject(module_.construction) && hasOwn(module_.construction, path)) {
    return unwrapCell(module_.construction[path]);
  }
  return undefined;
}

function stableValue(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stableValue);
  var sorted = {};
  Object.keys(value).sort().forEach(function (key) {
    sorted[key] = stableValue(value[key]);
  });
  return sorted;
}

function valueKey(value) {
  return JSON.stringify(stableValue(value));
}

function compare(left, operator, right) {
  if (operator === 'EQ') return left === right;
  if (operator === 'NE') return left !== right;
  if (operator === 'LT') return left < right;
  if (operator === 'LTE') return left <= right;
  if (operator === 'GT') return left > right;
  if (operator === 'GTE') return left >= right;
  if (operator === 'IN') return Array.isArray(right) && right.some(function (item) { return item === left; });
  if (operator === 'NOT_IN') return Array.isArray(right) && !right.some(function (item) { return item === left; });
  return false;
}

function parseCondition(condition) {
  if (condition === undefined || condition === null || condition === '') return null;
  if (typeof condition === 'string') {
    try {
      return JSON.parse(condition);
    } catch (error) {
      return false;
    }
  }
  return condition;
}

function conditionMatches(condition, module_) {
  var parsed = parseCondition(condition);
  if (parsed === null) return true;
  if (!isPlainObject(parsed) || !Array.isArray(parsed.all)) return false;

  for (var i = 0; i < parsed.all.length; i += 1) {
    var clause = parsed.all[i];
    if (!isPlainObject(clause) || typeof clause.path !== 'string' ||
      SUPPORTED_OPERATORS.indexOf(clause.op) === -1 || !hasOwn(clause, 'value')) {
      return false;
    }
    var actual = readModulePath(module_, clause.path);
    if (actual === undefined || !compare(actual, clause.op, clause.value)) return false;
  }
  return true;
}

function isActive(row) {
  return !!row && (row.active === true || row.active === 'TRUE' || row.active === 'true' || row.active === 1);
}

function cellIsExplicit(value) {
  if (!isPlainObject(value) || !hasOwn(value, 'state')) return isPresent(value);
  return value.state === 'KNOWN' && isPresent(value.value);
}

function moduleParameterIsExplicit(module_, parameter) {
  if (!isPlainObject(module_)) return false;
  if (hasOwn(module_, parameter) && cellIsExplicit(module_[parameter])) return true;
  if (isPlainObject(module_.construction) && hasOwn(module_.construction, parameter)) {
    return cellIsExplicit(module_.construction[parameter]);
  }
  return false;
}

/*
 * The approved policy names SINK_BASE, DRAWER_BASE, and APPLIANCE_SPECIAL as
 * semantic module classes. Stage 10 represents those classes with the actual
 * module_type plus role, so these aliases are only used after exact matching.
 */
function semanticModuleTypeMatches(rowType, module_) {
  if (rowType === 'SINK_BASE') {
    return module_.module_type === 'BASE_CABINET' && module_.role === 'SINK_BASE';
  }
  if (rowType === 'DRAWER_BASE') {
    return module_.module_type === 'BASE_CABINET' && module_.role === 'DRAWER_CABINET';
  }
  if (rowType === 'APPLIANCE_SPECIAL') {
    return module_.module_type === 'APPLIANCE_SLOT' ||
      module_.role === 'DISHWASHER_SLOT' ||
      module_.role === 'APPLIANCE_TOWER' ||
      module_.role === 'REFRIGERATOR_HOUSING';
  }
  return false;
}

function conditionValue(row) {
  if (hasOwn(row, 'Condition_json')) return row.Condition_json;
  if (hasOwn(row, 'condition_json')) return row.condition_json;
  return null;
}

function sourceRefFor(row) {
  return row.rule_id ? 'DEFAULT_' + String(row.rule_id) : 'DEFAULT_RULE';
}

function targetPathFor(assemblyIndex, moduleIndex, parameter) {
  return '$.assemblies[' + assemblyIndex + '].modules[' + moduleIndex + '].construction.' + parameter;
}

function makeResolution(module_, row, assemblyIndex, moduleIndex) {
  var mode = row.resolution_mode;
  if (RESOLUTION_MODES.indexOf(mode) === -1) return null;
  var condition = conditionValue(row);
  if (!conditionMatches(condition, module_)) return null;
  var parsedCondition = parseCondition(condition);
  var sourceRef = sourceRefFor(row);
  var targetPath = targetPathFor(assemblyIndex, moduleIndex, row.parameter);
  return {
    module_id: module_.id === undefined ? null : module_.id,
    assembly_index: assemblyIndex,
    module_index: moduleIndex,
    module_type: row.module_type,
    parameter: row.parameter,
    state: mode === 'REQUIRED_QUESTION' ? 'REQUIRED_QUESTION' : 'DEFAULT_CANDIDATE',
    value: mode === 'REQUIRED_QUESTION' ? null : clone(row.default_value),
    unit: row.unit === undefined ? null : row.unit,
    resolution_mode: mode,
    confirmation_required: row.confirmation_required === true,
    rule_id: row.rule_id === undefined ? null : row.rule_id,
    source_ref: sourceRef,
    condition: row.condition === undefined ? null : row.condition,
    condition_json: parsedCondition === null ? null : clone(parsedCondition),
    description: row.description === undefined ? null : row.description,
    path: targetPath,
    Target_path: targetPath,
    Evidence_id: sourceRef
  };
}

function collectModules(modules) {
  var entries = [];
  if (Array.isArray(modules)) {
    for (var i = 0; i < modules.length; i += 1) {
      entries.push({ module: modules[i], assemblyIndex: 0, moduleIndex: i });
    }
    return entries;
  }
  if (!isPlainObject(modules) || !Array.isArray(modules.assemblies)) return entries;
  for (var a = 0; a < modules.assemblies.length; a += 1) {
    var assembly = modules.assemblies[a];
    if (!assembly || !Array.isArray(assembly.modules)) continue;
    for (var m = 0; m < assembly.modules.length; m += 1) {
      entries.push({ module: assembly.modules[m], assemblyIndex: a, moduleIndex: m });
    }
  }
  return entries;
}

function collectRows(defaultRows) {
  if (!Array.isArray(defaultRows)) return [];
  return defaultRows.map(function (row, index) {
    return { row: row, index: index };
  }).filter(function (entry) {
    return isActive(entry.row);
  }).sort(function (left, right) {
    var leftId = String(left.row.rule_id || '');
    var rightId = String(right.row.rule_id || '');
    if (leftId < rightId) return -1;
    if (leftId > rightId) return 1;
    return left.index - right.index;
  });
}

function applicableRowsForModule(rows, module_) {
  var exact = rows.filter(function (entry) {
    return entry.row.module_type === module_.module_type;
  });
  if (exact.length > 0) return exact;
  return rows.filter(function (entry) {
    return entry.row.module_type !== module_.module_type && semanticModuleTypeMatches(entry.row.module_type, module_);
  });
}

function resolutionSortKey(resolution) {
  return String(resolution.Target_path) + '\u0000' + String(resolution.parameter) + '\u0000' + String(resolution.rule_id || '');
}

/**
 * Resolve active Construction_Defaults rules against the actual Stage 10
 * module shape. Neither argument is mutated. Explicit KNOWN module values
 * always win over policy rows; default candidates are not promoted to KNOWN.
 *
 * @param {Array<Object>|Object} modules Stage 10 modules or a draft object.
 * @param {Array<Object>} defaultRows Rows matching CONSTRUCTION_DEFAULTS_V1.
 * @returns {Object} deterministic candidates and required questions.
 */
function resolveConstructionDefaults(modules, defaultRows) {
  var moduleEntries = collectModules(modules);
  var rows = collectRows(defaultRows);
  var results = [];
  var defaultCandidates = [];
  var requiredQuestions = [];

  for (var m = 0; m < moduleEntries.length; m += 1) {
    var entry = moduleEntries[m];
    var module_ = entry.module || {};
    var applicable = applicableRowsForModule(rows, module_);
    for (var r = 0; r < applicable.length; r += 1) {
      var row = applicable[r].row;
      if (!row.parameter || moduleParameterIsExplicit(module_, row.parameter)) continue;
      var resolution = makeResolution(module_, row, entry.assemblyIndex, entry.moduleIndex);
      if (!resolution) continue;
      results.push(resolution);
      if (resolution.resolution_mode === 'DEFAULT_CANDIDATE') {
        defaultCandidates.push(resolution);
      } else {
        requiredQuestions.push(resolution);
      }
    }
  }

  results.sort(function (left, right) {
    var leftKey = resolutionSortKey(left);
    var rightKey = resolutionSortKey(right);
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  defaultCandidates.sort(function (left, right) {
    return resolutionSortKey(left) < resolutionSortKey(right) ? -1 : resolutionSortKey(left) > resolutionSortKey(right) ? 1 : 0;
  });
  requiredQuestions.sort(function (left, right) {
    return resolutionSortKey(left) < resolutionSortKey(right) ? -1 : resolutionSortKey(left) > resolutionSortKey(right) ? 1 : 0;
  });

  return {
    Results: clone(results),
    Default_candidates: clone(defaultCandidates),
    Required_questions: clone(requiredQuestions)
  };
}

module.exports = {
  SUPPORTED_OPERATORS: SUPPORTED_OPERATORS,
  RESOLUTION_MODES: RESOLUTION_MODES,
  resolveConstructionDefaults: resolveConstructionDefaults,
  ResolveConstructionDefaults: resolveConstructionDefaults,
  conditionMatches: conditionMatches
};
