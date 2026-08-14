/** Apps Script parity implementation of calculation_model/layout_configurator.py. */

var STAGE8_SUPPORTED_ZONES = {base: 'base_general', wall: 'wall_general', tall: 'tall_universal'};
var STAGE8_AUTOMATIC_RANKS = {A: true, B: true, C: true};


function stage8MarketBaseline_(rows, version) {
  var byClass = {};
  var seen = {};
  rows.forEach(function (row) {
    if (row.source_layer !== 'PRIMARY' || row.size_qualifier !== 'EXACT' ||
        ['WIDTH', 'NOMINAL_WIDTH'].indexOf(row.dimension) === -1) return;
    var width = Number(row.size_value_mm);
    if (!Number.isInteger(width) || width <= 0 || !/^[A-E]$/.test(row.rank)) {
      throw new Error('Invalid Module_Size_Rules row: ' + row.module_rule_id);
    }
    var key = row.module_class + ':' + width;
    if (seen[key]) throw new Error('Ambiguous exact module-size rule: ' + key);
    seen[key] = true;
    var rule = {
      record_id: row.module_rule_id,
      module_class: row.module_class,
      width_mm: width,
      rank: row.rank,
      source_label: 'Module_Size_Rules#' + row.module_rule_id
    };
    if (!byClass[row.module_class]) byClass[row.module_class] = [];
    byClass[row.module_class].push(rule);
  });
  Object.keys(byClass).forEach(function (name) {
    byClass[name].sort(function (a, b) { return a.width_mm - b.width_mm; });
  });
  if (!Object.keys(byClass).length) throw new Error('No accepted module-size rules are available.');
  return {byClass: byClass, version: version || 'unknown'};
}


function stage8RulesForClass_(market, moduleClass) {
  return market.byClass[moduleClass] || [];
}


function stage8ExactRule_(market, moduleClass, width) {
  var rules = stage8RulesForClass_(market, moduleClass).filter(function (rule) {
    return rule.width_mm === width;
  });
  return rules.length === 1 ? rules[0] : null;
}


function stage8EmptyLayout_(status, request, reason, market) {
  return {status: status, items: [], run_length_mm: request.run_length_mm,
    occupied_length_mm: 0, remainder_mm: request.run_length_mm, filler: null,
    covered_length_mm: 0, reasons: [reason], market_source: 'Module_Size_Rules',
    market_data_version: market.version, selection_key: null};
}


function stage8ClassFamily_(moduleClass) {
  var families = ['base', 'wall', 'tall'];
  for (var i = 0; i < families.length; i++) {
    if (moduleClass.indexOf(families[i] + '_') === 0) return families[i];
  }
  return null;
}


function stage8ValidateLayoutRequest_(request) {
  if (!Number.isInteger(request.run_length_mm) || request.run_length_mm <= 0) return 'run_length_mm must be a positive integer.';
  var filler = request.filler_policy;
  if (!filler || !Number.isInteger(filler.min_width_mm) || !Number.isInteger(filler.max_width_mm) ||
      filler.min_width_mm < 0 || filler.max_width_mm < 0 || filler.min_width_mm > filler.max_width_mm) {
    return 'Filler bounds must be non-negative integers with min <= max.';
  }
  if (filler.max_width_mm === 0 && filler.min_width_mm !== 0) return 'Disabled filler requires a zero minimum.';
  if (['start', 'end'].indexOf(filler.location) === -1) return "Filler location must be 'start' or 'end'.";
  var ids = {};
  var positions = {};
  for (var i = 0; i < request.required_modules.length; i++) {
    var module = request.required_modules[i];
    if (!module.module_id || !module.role || !module.module_class || !Number.isInteger(module.width_mm) || module.width_mm <= 0) {
      return 'Required modules need id, role, class, and positive integer width.';
    }
    if (ids[module.module_id]) return 'Required module_id values must be unique.';
    ids[module.module_id] = true;
    if (module.fixed_position !== null && module.fixed_position !== undefined) {
      if (!Number.isInteger(module.fixed_position) || module.fixed_position < 0 || positions[module.fixed_position]) {
        return 'Required fixed positions must be unique non-negative integers.';
      }
      positions[module.fixed_position] = true;
    }
  }
  return null;
}


function stage8WidthCombinations_(capacity, widths) {
  var ordered = Array.from(new Set(widths)).sort(function (a, b) { return b - a; });
  var output = [];
  function visit(index, remaining, current) {
    if (index === ordered.length) { output.push(current.slice()); return; }
    var width = ordered[index];
    for (var count = Math.floor(remaining / width); count >= 0; count--) {
      var next = current.slice();
      for (var i = 0; i < count; i++) next.push(width);
      visit(index + 1, remaining - count * width, next);
    }
  }
  visit(0, capacity, []);
  return output;
}


function stage8PositionAllows_(module, constraint) {
  if (!constraint) return true;
  return (constraint.forbidden_roles || []).indexOf(module.role) === -1 &&
    (constraint.forbidden_module_classes || []).indexOf(module.module_class) === -1 &&
    (constraint.forbidden_widths_mm || []).indexOf(module.width_mm) === -1;
}


function stage8ModuleSortKey_(module) {
  return [module.required ? 0 : 1, module.module_class, module.role, -module.width_mm,
    module.market_rule.record_id, module.module_id];
}


function stage8CompareScalar_(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}


function stage8CompareTuple_(left, right) {
  var length = Math.min(left.length, right.length);
  for (var i = 0; i < length; i++) {
    var a = left[i];
    var b = right[i];
    var comparison = Array.isArray(a) && Array.isArray(b) ? stage8CompareTuple_(a, b) : stage8CompareScalar_(a, b);
    if (comparison) return comparison;
  }
  return stage8CompareScalar_(left.length, right.length);
}


function stage8ArrangeModules_(modules, constraints) {
  var size = modules.length;
  var byPosition = {};
  for (var c = 0; c < constraints.length; c++) {
    if (byPosition[constraints[c].position] || constraints[c].position >= size) return null;
    byPosition[constraints[c].position] = constraints[c];
  }
  var slots = new Array(size).fill(null);
  var remaining = [];
  for (var moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
    var module = modules[moduleIndex];
    if (module.fixed_position === null || module.fixed_position === undefined) { remaining.push(module); continue; }
    if (module.fixed_position >= size || slots[module.fixed_position] || !stage8PositionAllows_(module, byPosition[module.fixed_position])) {
      return null;
    }
    slots[module.fixed_position] = module;
  }
  remaining.sort(function (a, b) { return stage8CompareTuple_(stage8ModuleSortKey_(a), stage8ModuleSortKey_(b)); });
  function fill(position, pool) {
    if (position === size) return pool.length ? null : [];
    if (slots[position]) {
      var fixedTail = fill(position + 1, pool);
      return fixedTail === null ? null : [slots[position]].concat(fixedTail);
    }
    var previousKey = null;
    for (var i = 0; i < pool.length; i++) {
      var key = stage8ModuleSortKey_(pool[i]);
      if (previousKey && stage8CompareTuple_(previousKey, key) === 0) continue;
      previousKey = key;
      if (!stage8PositionAllows_(pool[i], byPosition[position])) continue;
      var tail = fill(position + 1, pool.slice(0, i).concat(pool.slice(i + 1)));
      if (tail !== null) return [pool[i]].concat(tail);
    }
    return null;
  }
  return fill(0, remaining);
}


function stage8SelectionKey_(arranged, remainder) {
  var ranks = ['E', 'D', 'C', 'B'].map(function (rank) {
    return arranged.filter(function (item) { return item.market_rule.rank === rank; }).length;
  });
  var explicitLow = arranged.filter(function (item) {
    return !item.required && ['D', 'E'].indexOf(item.market_rule.rank) !== -1;
  }).length;
  var signature = arranged.map(function (item) {
    return [item.module_class, item.role, -item.width_mm, item.market_rule.record_id, item.module_id];
  });
  return ranks.concat([remainder, explicitLow, arranged.length, signature]);
}


function composeStage8Layout(request, moduleSizeRows, moduleSizeVersion) {
  var market;
  try { market = stage8MarketBaseline_(moduleSizeRows, moduleSizeVersion); }
  catch (error) {
    return {status: 'MASTER_DATA_INVALID', items: [], reasons: [error.message], market_data_version: moduleSizeVersion};
  }
  var validation = stage8ValidateLayoutRequest_(request);
  if (validation) return stage8EmptyLayout_('INVALID_INPUT', request, validation, market);
  if (request.run_shape !== 'straight') return stage8EmptyLayout_('NOT_SUPPORTED', request,
    'Stage 8 automatic layout supports straight runs only; corner geometry requires an explicit system profile.', market);
  if (!STAGE8_SUPPORTED_ZONES[request.zone]) return stage8EmptyLayout_('NOT_SUPPORTED', request,
    'Unsupported automatic zone: ' + request.zone, market);
  var genericClass = STAGE8_SUPPORTED_ZONES[request.zone];
  var explicit = request.explicit_generic_widths_mm || [];
  var genericWidths = stage8RulesForClass_(market, genericClass).map(function (rule) { return rule.width_mm; });
  var unknown = explicit.filter(function (width) { return genericWidths.indexOf(width) === -1; });
  if (unknown.length) return stage8EmptyLayout_('INVALID_INPUT', request,
    'Explicit generic width permission has no exact accepted market rule for ' + genericClass + ': ' + JSON.stringify(unknown) + '.', market);

  var resolvedRequired = [];
  for (var i = 0; i < request.required_modules.length; i++) {
    var requirement = request.required_modules[i];
    if (stage8ClassFamily_(requirement.module_class) !== request.zone) return stage8EmptyLayout_('NO_VALID_LAYOUT', request,
      'Mandatory ' + requirement.module_id + ' uses ' + requirement.module_class + ', which is not valid in the ' + request.zone + ' zone.', market);
    var rule = stage8ExactRule_(market, requirement.module_class, requirement.width_mm);
    if (!rule) return stage8EmptyLayout_('NO_VALID_LAYOUT', request,
      'Mandatory ' + requirement.module_id + ' has no exact accepted market rule for ' + requirement.module_class + ' at ' + requirement.width_mm + ' mm.', market);
    if (rule.rank === 'D' && requirement.module_class === genericClass && explicit.indexOf(requirement.width_mm) === -1) {
      return stage8EmptyLayout_('NO_VALID_LAYOUT', request, 'Rank D generic rule ' + rule.record_id + ' requires exact explicit width permission or a semantically specialized module_class.', market);
    }
    if (rule.rank === 'E' && explicit.indexOf(requirement.width_mm) === -1) return stage8EmptyLayout_('NO_VALID_LAYOUT', request,
      'Rank E rule ' + rule.record_id + ' requires explicit width permission.', market);
    resolvedRequired.push({module_id: requirement.module_id, role: requirement.role,
      module_class: requirement.module_class, width_mm: requirement.width_mm,
      market_rule: rule, required: true, fixed_position: requirement.fixed_position});
  }
  var requiredWidth = resolvedRequired.reduce(function (sum, item) { return sum + item.width_mm; }, 0);
  if (requiredWidth > request.run_length_mm) return stage8EmptyLayout_('NO_VALID_LAYOUT', request,
    'Mandatory modules exceed the requested run length.', market);
  var forbidden = request.forbidden_generic_widths_mm || [];
  var genericRules = stage8RulesForClass_(market, genericClass).filter(function (rule) {
    return forbidden.indexOf(rule.width_mm) === -1 && (STAGE8_AUTOMATIC_RANKS[rule.rank] || explicit.indexOf(rule.width_mm) !== -1);
  });
  var candidates = [];
  var capacity = request.run_length_mm - requiredWidth;
  stage8WidthCombinations_(capacity, genericRules.map(function (rule) { return rule.width_mm; })).forEach(function (widths) {
    var used = widths.reduce(function (sum, width) { return sum + width; }, 0);
    var remainder = capacity - used;
    var filler = request.filler_policy;
    if (remainder !== 0 && (filler.max_width_mm === 0 || remainder < filler.min_width_mm || remainder > filler.max_width_mm)) return;
    if (!widths.length && !resolvedRequired.length) return;
    var ruleByWidth = {};
    genericRules.forEach(function (rule) { ruleByWidth[rule.width_mm] = rule; });
    var generics = widths.map(function (width, index) {
      return {module_id: 'auto-' + String(index + 1).padStart(2, '0') + '-' + width,
        role: 'generic_storage', module_class: genericClass, width_mm: width,
        market_rule: ruleByWidth[width], required: false, fixed_position: null};
    });
    var modules = resolvedRequired.concat(generics);
    if (request.min_module_count !== null && request.min_module_count !== undefined && modules.length < request.min_module_count) return;
    if (request.max_module_count !== null && request.max_module_count !== undefined && modules.length > request.max_module_count) return;
    var arranged = stage8ArrangeModules_(modules, request.position_constraints || []);
    if (!arranged) return;
    candidates.push({key: stage8SelectionKey_(arranged, remainder), arranged: arranged, remainder: remainder});
  });
  if (!candidates.length) return stage8EmptyLayout_('NO_VALID_LAYOUT', request,
    'No semantically valid combination satisfies all mandatory modules, position constraints, accepted widths, and the explicit filler policy.', market);
  candidates.sort(function (a, b) { return stage8CompareTuple_(a.key, b.key); });
  var winner = candidates[0];
  var items = winner.arranged.map(function (item, position) {
    return {position: position, entity_type: item.module_class.indexOf('slot') !== -1 ? 'APPLIANCE_SLOT' : 'MODULE',
      module_id: item.module_id, role: item.role, module_class: item.module_class,
      width_mm: item.width_mm, market_rank: item.market_rule.rank,
      rule_source: item.market_rule.source_label, required: item.required};
  });
  var occupied = items.reduce(function (sum, item) { return sum + item.width_mm; }, 0);
  var fillerResult = winner.remainder > 0 ? {width_mm: winner.remainder,
    location: request.filler_policy.location, rule_source: 'explicit_request.filler_policy'} : null;
  return {status: 'VALID', items: items, run_length_mm: request.run_length_mm,
    occupied_length_mm: occupied, remainder_mm: winner.remainder, filler: fillerResult,
    covered_length_mm: occupied + (fillerResult ? fillerResult.width_mm : 0),
    reasons: ['All mandatory modules and position constraints are satisfied before optimization.',
      'Every item uses an exact PRIMARY Module_Size_Rules row for its own module_class.',
      'Selection minimizes E/D/C/B ranks, filler, explicitly permitted low-rank generic widths, module count, and a stable tie-break.',
      fillerResult ? 'The remainder is represented as filler under the explicit policy.' : 'The selected modules occupy the run exactly; no filler was created.'],
    market_source: 'Module_Size_Rules', market_data_version: market.version, selection_key: winner.key};
}
