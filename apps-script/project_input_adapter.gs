/** Deterministic project-input-v1 readiness gate and LayoutRequest adapter. */

var STAGE8_ROLE_MAP_VERSION = 'project-input-role-map-v1';
var STAGE8_ROLE_MAP = {
  generic_storage: {base: 'base_general', wall: 'wall_general', tall: 'tall_universal'},
  drawer: {base: 'base_drawer'},
  sink: {base: 'base_sink'},
  dishwasher_slot: {base: 'base_dishwasher_slot'},
  oven: {base: 'base_oven'},
  hob: {base: 'base_hob'},
  narrow_cargo: {base: 'base_narrow_cargo'},
  dish_dryer: {wall: 'wall_dish_dryer'},
  hood: {wall: 'wall_hood'},
  pantry: {tall: 'tall_pantry'},
  fridge: {tall: 'tall_fridge'}
};


function stage8Diagnostic_(code, stage, fieldPath, message, provenance) {
  return {
    code: code,
    stage: stage,
    field_path: fieldPath || null,
    message: message,
    provenance: provenance || []
  };
}


function factProvenance_(fact) {
  if (!fact || !fact.evidence) return [];
  return [
    fact.evidence.source_type + ':' + fact.evidence.source_ref + ':' + fact.evidence.evidence_note
  ];
}


function requireKnownFact_(fact, path, blockers) {
  if (!fact) {
    blockers.push(stage8Diagnostic_('REQUIRED_FACT_MISSING', 'READINESS', path,
      'Required Project Input fact is absent.', []));
    return false;
  }
  if (fact.fact_state === 'KNOWN') return true;
  var code = fact.fact_state === 'INFERRED' ? 'NEEDS_CONFIRMATION' :
    fact.fact_state === 'CONFLICT' ? 'FACT_CONFLICT' : 'REQUIRED_FACT_UNKNOWN';
  blockers.push(stage8Diagnostic_(code, 'READINESS', path,
    'Required hard fact must be KNOWN; received ' + fact.fact_state + '.', factProvenance_(fact)));
  return false;
}


function adaptProjectInputToLayoutRequest(projectInput) {
  var blockers = [];
  if (!projectInput || projectInput.schema_version !== 'project-input-v1' ||
      projectInput.project_type !== 'KITCHEN') {
    blockers.push(stage8Diagnostic_('PROJECT_INPUT_INVALID', 'READINESS', null,
      'Stage 8 accepts only validated project-input-v1 KITCHEN input.', []));
    return {status: 'INPUT_NOT_READY', blockers: blockers, layoutRequest: null};
  }
  var layout = projectInput.layout || {};
  var shapeReady = requireKnownFact_(layout.run_shape, 'layout.run_shape', blockers);
  var lengthReady = requireKnownFact_(layout.run_length_mm, 'layout.run_length_mm', blockers);
  var zoneReady = requireKnownFact_(layout.zone, 'layout.zone', blockers);
  if (shapeReady && layout.run_shape.value !== 'straight') {
    return {
      status: 'NOT_SUPPORTED',
      blockers: [stage8Diagnostic_('UNSUPPORTED_GEOMETRY', 'ADAPTER', 'layout.run_shape',
        'Automatic Stage 8 layout supports straight runs only.', factProvenance_(layout.run_shape))],
      layoutRequest: null
    };
  }
  if (lengthReady && (!Number.isInteger(layout.run_length_mm.value) || layout.run_length_mm.value <= 0)) {
    blockers.push(stage8Diagnostic_('INVALID_RUN_LENGTH', 'ADAPTER', 'layout.run_length_mm',
      'Run length must be a positive integer.', factProvenance_(layout.run_length_mm)));
  }
  if (zoneReady && ['base', 'wall', 'tall'].indexOf(layout.zone.value) === -1) {
    blockers.push(stage8Diagnostic_('UNSUPPORTED_ZONE', 'ADAPTER', 'layout.zone',
      'Zone must be exactly base, wall, or tall.', factProvenance_(layout.zone)));
  }

  var required = [];
  var modules = (projectInput.modules && projectInput.modules.required_modules) || [];
  modules.forEach(function (module, index) {
    var prefix = 'modules.required_modules[' + index + ']';
    var roleReady = requireKnownFact_(module.role, prefix + '.role', blockers);
    var classReady = requireKnownFact_(module.module_class, prefix + '.module_class', blockers);
    var widthReady = requireKnownFact_(module.width_mm, prefix + '.width_mm', blockers);
    var quantityReady = requireKnownFact_(module.quantity, prefix + '.quantity', blockers);
    if (!roleReady || !classReady || !widthReady || !quantityReady) return;
    var role = module.role.value;
    var family = module.module_class.value;
    var mapping = STAGE8_ROLE_MAP[role];
    if (!mapping || !mapping[family]) {
      blockers.push(stage8Diagnostic_('UNKNOWN_ROLE_ALIAS', 'ADAPTER', prefix + '.role',
        'Role alias has no exact mapping for module class ' + family + '.', factProvenance_(module.role)));
      return;
    }
    if (family !== layout.zone.value) {
      blockers.push(stage8Diagnostic_('MODULE_ZONE_MISMATCH', 'ADAPTER', prefix + '.module_class',
        'Required module class does not belong to the requested layout zone.', factProvenance_(module.module_class)));
      return;
    }
    if (!Number.isInteger(module.width_mm.value) || module.width_mm.value <= 0 ||
        !Number.isInteger(module.quantity.value) || module.quantity.value <= 0) {
      blockers.push(stage8Diagnostic_('INVALID_REQUIRED_MODULE', 'ADAPTER', prefix,
        'Required module width and quantity must be positive integers.',
        factProvenance_(module.width_mm).concat(factProvenance_(module.quantity))));
      return;
    }
    for (var count = 0; count < module.quantity.value; count++) {
      required.push({
        module_id: 'required-' + String(index + 1).padStart(2, '0') + '-' + String(count + 1).padStart(2, '0'),
        role: role,
        module_class: mapping[family],
        width_mm: module.width_mm.value,
        fixed_position: null
      });
    }
  });

  ['forbidden_roles', 'preferred_module_order'].forEach(function (field) {
    var facts = (projectInput.modules && projectInput.modules[field]) || [];
    if (facts.length) {
      blockers.push(stage8Diagnostic_('UNMAPPABLE_CONSTRAINT', 'ADAPTER', 'modules.' + field,
        'project-input-v1 constraint cannot be represented by the accepted LayoutRequest contract.',
        facts.reduce(function (all, fact) { return all.concat(factProvenance_(fact)); }, [])));
    }
  });
  if (blockers.length) return {status: 'INPUT_NOT_READY', blockers: blockers, layoutRequest: null};
  return {
    status: 'READY',
    blockers: [],
    layoutRequest: {
      run_length_mm: layout.run_length_mm.value,
      zone: layout.zone.value,
      run_shape: layout.run_shape.value,
      required_modules: required,
      position_constraints: [],
      filler_policy: {min_width_mm: 0, max_width_mm: 0, location: 'end'},
      forbidden_generic_widths_mm: [],
      explicit_generic_widths_mm: [],
      min_module_count: null,
      max_module_count: null,
      adapter_version: STAGE8_ROLE_MAP_VERSION
    }
  };
}
