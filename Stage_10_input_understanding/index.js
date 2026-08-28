'use strict';

var EVIDENCE_STATES = ['ACTIVE', 'SUPERSEDED', 'CONFLICTED'];
var EVIDENCE_SOURCE_TYPES = [
  'USER_CONFIRMATION',
  'USER_DIMENSION',
  'USER_TEXT',
  'IMAGE_TEXT',
  'VISION_ENTITY',
  'DEFAULT_CANDIDATE'
];

var DRAFT_CELL_STATES = ['KNOWN', 'MISSING', 'CONFLICT', 'NEEDS_CONFIRMATION'];

var DIMENSION_EVIDENCE_STATES = [
  'EXPLICIT',
  'DERIVED',
  'VISUAL_INFERRED',
  'ALPHA_DEFAULT',
  'MANAGER_CONFIRMED'
];

var FRONT_EVIDENCE_STATES = ['EXPLICIT', 'VISUAL_INFERRED', 'MANAGER_CONFIRMED'];

var MODULE_TYPES = [
  'BASE_CABINET',
  'WALL_CABINET',
  'TALL_CABINET',
  'APPLIANCE_SLOT',
  'CUSTOM_CABINET'
];

var MODULE_ROLES = [
  'GENERAL_STORAGE',
  'DRAWER_CABINET',
  'SINK_BASE',
  'DISHWASHER_SLOT',
  'REFRIGERATOR_HOUSING',
  'APPLIANCE_TOWER',
  'WALL_STORAGE',
  'UNKNOWN'
];

var FRONT_KINDS = ['HINGED_DOOR', 'DRAWER_FRONT', 'APPLIANCE_FRONT', 'FIXED_PANEL', 'UNKNOWN'];
var APPLIANCE_TYPES = ['DISHWASHER', 'OVEN', 'MICROWAVE', 'REFRIGERATOR', 'OTHER'];
var ASSEMBLY_KINDS = ['LINEAR_RUN', 'ISLAND', 'OTHER'];
var OPENING_TYPES = ['WINDOW', 'VOID', 'OTHER'];
var SURFACE_TYPES = ['COUNTERTOP', 'DECORATIVE_CLADDING', 'END_PANEL', 'OTHER'];
var SOURCE_REF_TYPES = ['PDF', 'IMAGE', 'NOTE', 'MANUAL_CONFIRMATION'];

var DRAFT_SCHEMA_VERSION = 'draft-configuration-v1';
var CONFIRMED_SCHEMA_VERSION = 'confirmed-configuration-v1';
var CONFIRMED_STATUS = 'CONFIRMED_FOR_ALPHA';

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

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveNumber(value) {
  return isNumber(value) && value > 0;
}

function isNonNegativeNumber(value) {
  return isNumber(value) && value >= 0;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function inEnum(value, allowed) {
  return allowed.indexOf(value) !== -1;
}

function validateEvidenceItem(item, path, errors) {
  if (!isPlainObject(item)) {
    errors.push(issue('EVIDENCE_INVALID', 'VALIDATION_ERROR', 'Evidence item must be an object.', path));
    return;
  }
  if (!isNonEmptyString(item.target_path)) {
    errors.push(issue('EVIDENCE_INVALID', 'VALIDATION_ERROR', 'Evidence item requires a target_path string.', path + '.target_path'));
  }
  if (!isNonEmptyString(item.source_type) || !inEnum(item.source_type, EVIDENCE_SOURCE_TYPES)) {
    errors.push(issue('EVIDENCE_INVALID', 'VALIDATION_ERROR', 'Evidence item has an invalid source_type.', path + '.source_type'));
  }
  if (!isNonEmptyString(item.source_ref)) {
    errors.push(issue('EVIDENCE_INVALID', 'VALIDATION_ERROR', 'Evidence item requires a source_ref string.', path + '.source_ref'));
  }
  if (!isNonEmptyString(item.state) || !inEnum(item.state, EVIDENCE_STATES)) {
    errors.push(issue('EVIDENCE_INVALID', 'VALIDATION_ERROR', 'Evidence item has an invalid state.', path + '.state'));
  }
  if (!isNonNegativeNumber(item.confidence) || item.confidence > 1) {
    errors.push(issue('EVIDENCE_INVALID', 'VALIDATION_ERROR', 'Evidence item confidence must be a number between 0 and 1.', path + '.confidence'));
  }
  if (!('value' in item)) {
    errors.push(issue('EVIDENCE_INVALID', 'VALIDATION_ERROR', 'Evidence item requires a value field (null allowed).', path + '.value'));
  }
}

function validateEvidence(evidence) {
  var errors = [];
  if (!Array.isArray(evidence)) {
    errors.push(issue('EVIDENCE_INVALID', 'VALIDATION_ERROR', 'Evidence must be an array.', '$'));
    return errors;
  }
  for (var i = 0; i < evidence.length; i += 1) {
    validateEvidenceItem(evidence[i], '$[' + i + ']', errors);
  }
  return errors;
}

function fail() {
  return false;
}

function validateDimensionCell(cell, path, errors) {
  if (!isPlainObject(cell)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Dimension must be an object.', path));
    return false;
  }
  if (!isNonEmptyString(cell.state) || !inEnum(cell.state, DRAFT_CELL_STATES)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Dimension has an invalid state.', path + '.state'));
    return false;
  }
  if (cell.state === 'KNOWN') {
    if (!isPositiveNumber(cell.value)) {
      errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'KNOWN dimension requires a positive numeric value.', path + '.value'));
      return false;
    }
    if (!isNonEmptyString(cell.source_ref)) {
      errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'KNOWN dimension requires a source_ref.', path + '.source_ref'));
      return false;
    }
    if (!isNonEmptyString(cell.source_type) || !inEnum(cell.source_type, EVIDENCE_SOURCE_TYPES)) {
      errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'KNOWN dimension has an invalid source_type.', path + '.source_type'));
      return false;
    }
    if (!isNonEmptyString(cell.evidence_state) || !inEnum(cell.evidence_state, DIMENSION_EVIDENCE_STATES)) {
      errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'KNOWN dimension has an invalid evidence_state.', path + '.evidence_state'));
      return false;
    }
    if (!isNonEmptyString(cell.note)) {
      errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'KNOWN dimension requires a note.', path + '.note'));
      return false;
    }
  } else if (cell.state === 'CONFLICT') {
    if (!Array.isArray(cell.options) || cell.options.length < 2) {
      errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'CONFLICT dimension requires at least two options.', path + '.options'));
      return false;
    }
    for (var i = 0; i < cell.options.length; i += 1) {
      if (!isPositiveNumber(cell.options[i])) {
        errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'CONFLICT dimension options must be positive numbers.', path + '.options[' + i + ']'));
        return false;
      }
    }
  }
  return true;
}

function validateFront(front, path, errors) {
  if (!isPlainObject(front)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Front must be an object.', path));
    return;
  }
  if (!isNonEmptyString(front.kind) || !inEnum(front.kind, FRONT_KINDS)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Front has an invalid kind.', path + '.kind'));
  }
  if (!(Number.isInteger(front.count) && front.count >= 1)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Front count must be an integer >= 1.', path + '.count'));
  }
  if (!isNonEmptyString(front.evidence_state) || !inEnum(front.evidence_state, FRONT_EVIDENCE_STATES)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Front has an invalid evidence_state.', path + '.evidence_state'));
  }
}

function validateApplianceSlot(slot, path, errors) {
  if (!isPlainObject(slot)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Appliance slot must be an object.', path));
    return;
  }
  if (!isNonEmptyString(slot.type) || !inEnum(slot.type, APPLIANCE_TYPES)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Appliance slot has an invalid type.', path + '.type'));
  }
}

function validateOptionalPositive(value, path, errors) {
  if (value !== undefined && value !== null && !isPositiveNumber(value)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Value must be a positive number or null.', path));
  }
}

function validateOptionalNonNegative(value, path, errors) {
  if (value !== undefined && value !== null && !isNonNegativeNumber(value)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Value must be a non-negative number or null.', path));
  }
}

function validateStringArray(value, path, errors) {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Value must be an array.', path));
    return;
  }
  for (var i = 0; i < value.length; i += 1) {
    if (!isNonEmptyString(value[i])) {
      errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Items must be non-empty strings.', path + '[' + i + ']'));
    }
  }
}

function validateSourceRef(sourceRef, path, errors) {
  if (!isPlainObject(sourceRef) || !isNonEmptyString(sourceRef.id) || !inEnum(sourceRef.type, SOURCE_REF_TYPES) || !isNonEmptyString(sourceRef.file) || !isNonEmptyString(sourceRef.note)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Source ref requires id, type, file, and note.', path));
  }
}

function validateGlobalDimensions(globalDimensions, errors) {
  if (globalDimensions === undefined || globalDimensions === null) {
    return;
  }
  if (!isPlainObject(globalDimensions)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'global_dimensions must be an object.', '$.global_dimensions'));
    return;
  }
  validateOptionalPositive(globalDimensions.finished_worktop_height_mm, '$.global_dimensions.finished_worktop_height_mm', errors);
  validateOptionalNonNegative(globalDimensions.toe_kick_height_mm, '$.global_dimensions.toe_kick_height_mm', errors);
  validateOptionalNonNegative(globalDimensions.countertop_thickness_mm, '$.global_dimensions.countertop_thickness_mm', errors);
}

function validateModule(module, assemblyIndex, moduleIndex, errors) {
  var path = '$.assemblies[' + assemblyIndex + '].modules[' + moduleIndex + ']';
  if (!isPlainObject(module)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module must be an object.', path));
    return;
  }
  if (!isNonEmptyString(module.id)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module requires an id.', path + '.id'));
  }
  if (!isNonEmptyString(module.module_type) || !inEnum(module.module_type, MODULE_TYPES)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module has an invalid module_type.', path + '.module_type'));
  }
  if (!isNonEmptyString(module.role) || !inEnum(module.role, MODULE_ROLES)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module has an invalid role.', path + '.role'));
  }
  if (!isNonNegativeNumber(module.x_mm)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module requires a non-negative x_mm.', path + '.x_mm'));
  }
  validateOptionalNonNegative(module.y_mm, path + '.y_mm', errors);
  if (module.quantity !== undefined && !(Number.isInteger(module.quantity) && module.quantity >= 1)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module quantity must be an integer >= 1.', path + '.quantity'));
  }
  if (!(Array.isArray(module.fronts))) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module requires a fronts array.', path + '.fronts'));
  } else {
    for (var i = 0; i < module.fronts.length; i += 1) {
      validateFront(module.fronts[i], path + '.fronts[' + i + ']', errors);
    }
  }
  if (!(Array.isArray(module.appliance_slots))) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module requires an appliance_slots array.', path + '.appliance_slots'));
  } else {
    for (var j = 0; j < module.appliance_slots.length; j += 1) {
      validateApplianceSlot(module.appliance_slots[j], path + '.appliance_slots[' + j + ']', errors);
    }
  }
  validateStringArray(module.notes, path + '.notes', errors);
  if (!isPlainObject(module.dimensions)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Module requires a dimensions object.', path + '.dimensions'));
    return;
  }
  validateDimensionCell(module.dimensions.width_mm, path + '.dimensions.width_mm', errors);
  validateDimensionCell(module.dimensions.height_mm, path + '.dimensions.height_mm', errors);
  validateDimensionCell(module.dimensions.depth_mm, path + '.dimensions.depth_mm', errors);
}

function validateOpening(opening, path, errors) {
  if (!isPlainObject(opening) || !isNonEmptyString(opening.id) || !inEnum(opening.type, OPENING_TYPES) || !isNonNegativeNumber(opening.x_mm) || !isPositiveNumber(opening.width_mm)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Opening requires id, type, x_mm, and positive width_mm.', path));
    return;
  }
  validateOptionalPositive(opening.height_mm, path + '.height_mm', errors);
}

function validateSurface(surface, path, errors) {
  if (!isPlainObject(surface) || !isNonEmptyString(surface.id) || !inEnum(surface.type, SURFACE_TYPES) || !isPositiveNumber(surface.width_mm) || !isPositiveNumber(surface.depth_mm) || !isPositiveNumber(surface.thickness_mm)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Surface requires id, type, positive width_mm, depth_mm, and thickness_mm.', path));
    return;
  }
}

function validateAssembly(assembly, index, errors) {
  var path = '$.assemblies[' + index + ']';
  if (!isPlainObject(assembly)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Assembly must be an object.', path));
    return;
  }
  if (!isNonEmptyString(assembly.id)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Assembly requires an id.', path + '.id'));
  }
  if (!isNonEmptyString(assembly.kind) || !inEnum(assembly.kind, ASSEMBLY_KINDS)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Assembly has an invalid kind.', path + '.kind'));
  }
  validateOptionalPositive(assembly.overall_width_mm, path + '.overall_width_mm', errors);
  validateOptionalPositive(assembly.overall_depth_mm, path + '.overall_depth_mm', errors);
  validateOptionalPositive(assembly.finished_height_mm, path + '.finished_height_mm', errors);
  if (!Array.isArray(assembly.modules)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Assembly requires a modules array.', path + '.modules'));
  } else {
    for (var i = 0; i < assembly.modules.length; i += 1) {
      validateModule(assembly.modules[i], index, i, errors);
    }
  }
  if (assembly.openings !== undefined) {
    if (!Array.isArray(assembly.openings)) {
      errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Assembly openings must be an array.', path + '.openings'));
    } else {
      for (var j = 0; j < assembly.openings.length; j += 1) {
        validateOpening(assembly.openings[j], path + '.openings[' + j + ']', errors);
      }
    }
  }
  if (assembly.non_carcass_surfaces !== undefined) {
    if (!Array.isArray(assembly.non_carcass_surfaces)) {
      errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Assembly non_carcass_surfaces must be an array.', path + '.non_carcass_surfaces'));
    } else {
      for (var k = 0; k < assembly.non_carcass_surfaces.length; k += 1) {
        validateSurface(assembly.non_carcass_surfaces[k], path + '.non_carcass_surfaces[' + k + ']', errors);
      }
    }
  }
  validateStringArray(assembly.notes, path + '.notes', errors);
}

function validateDraft(draft) {
  var errors = [];
  if (!isPlainObject(draft)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Draft must be an object.', '$'));
    return errors;
  }
  if (draft.schema_version !== DRAFT_SCHEMA_VERSION) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Draft schema_version must be ' + DRAFT_SCHEMA_VERSION + '.', '$.schema_version'));
  }
  if (!isNonEmptyString(draft.project_id)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Draft requires a project_id.', '$.project_id'));
  }
  if (!isNonEmptyString(draft.construction_profile_id)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Draft requires a construction_profile_id.', '$.construction_profile_id'));
  }
  if (!Array.isArray(draft.source_refs)) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Draft requires a source_refs array.', '$.source_refs'));
  } else {
    for (var i = 0; i < draft.source_refs.length; i += 1) {
      validateSourceRef(draft.source_refs[i], '$.source_refs[' + i + ']', errors);
    }
  }
  validateGlobalDimensions(draft.global_dimensions, errors);
  if (!Array.isArray(draft.assemblies) || draft.assemblies.length < 1) {
    errors.push(issue('DRAFT_STRUCTURE_INVALID', 'VALIDATION_ERROR', 'Draft requires at least one assembly.', '$.assemblies'));
  } else {
    for (var a = 0; a < draft.assemblies.length; a += 1) {
      validateAssembly(draft.assemblies[a], a, errors);
    }
  }
  return errors;
}

function resolveCell(cell, field, path, dimensionEvidence, issues) {
  if (cell.state === 'KNOWN') {
    dimensionEvidence.push({
      field: field,
      source_ref: cell.source_ref,
      state: cell.evidence_state,
      note: cell.note
    });
    return cell.value;
  }
  if (cell.state === 'CONFLICT') {
    issues.push(issue('UNRESOLVED_CONFLICT', 'BLOCKING', 'Dimension has unresolved conflicting values: ' + cell.options.join(', ') + '.', path));
    return undefined;
  }
  if (cell.state === 'NEEDS_CONFIRMATION') {
    issues.push(issue('CONFIRMATION_REQUIRED', 'BLOCKING', 'Dimension value still requires confirmation.', path));
    return undefined;
  }
  return undefined;
}

function resolveNullableCell(cell, field, path, dimensionEvidence, issues) {
  if (cell.state === 'KNOWN') {
    dimensionEvidence.push({
      field: field,
      source_ref: cell.source_ref,
      state: cell.evidence_state,
      note: cell.note
    });
    return cell.value;
  }
  if (cell.state === 'CONFLICT') {
    issues.push(issue('UNRESOLVED_CONFLICT', 'BLOCKING', 'Dimension has unresolved conflicting values: ' + cell.options.join(', ') + '.', path));
    return null;
  }
  if (cell.state === 'NEEDS_CONFIRMATION') {
    issues.push(issue('CONFIRMATION_REQUIRED', 'BLOCKING', 'Dimension value still requires confirmation.', path));
    return null;
  }
  if (cell.state === 'MISSING') {
    dimensionEvidence.push({
      field: field,
      source_ref: 'NONE',
      state: 'DERIVED',
      note: 'Value is missing; emitted as null without applying a default.'
    });
    return null;
  }
  return null;
}

function mapModule(module, assemblyIndex, moduleIndex, issues) {
  var basePath = '$.assemblies[' + assemblyIndex + '].modules[' + moduleIndex + ']';
  var dimensionEvidence = [];
  var width = resolveCell(module.dimensions.width_mm, 'width_mm', basePath + '.dimensions.width_mm', dimensionEvidence, issues);
  var height = resolveNullableCell(module.dimensions.height_mm, 'height_mm', basePath + '.dimensions.height_mm', dimensionEvidence, issues);
  var depth = resolveNullableCell(module.dimensions.depth_mm, 'depth_mm', basePath + '.dimensions.depth_mm', dimensionEvidence, issues);
  if (width === undefined) {
    issues.push(issue('MISSING_REQUIRED_VALUE', 'BLOCKING', 'Module width_mm is required and must be resolved before confirmation.', basePath + '.dimensions.width_mm'));
    width = null;
  }
  var mapped = {
    id: module.id,
    module_type: module.module_type,
    role: module.role,
    x_mm: module.x_mm,
    y_mm: module.y_mm === undefined ? null : module.y_mm,
    width_mm: width,
    height_mm: height,
    depth_mm: depth,
    dimension_evidence: dimensionEvidence,
    fronts: clone(module.fronts),
    appliance_slots: clone(module.appliance_slots)
  };
  if (Number.isInteger(module.quantity)) {
    mapped.quantity = module.quantity;
  }
  if (module.notes !== undefined) {
    mapped.notes = clone(module.notes);
  }
  return mapped;
}

function mapAssembly(assembly, index, issues) {
  var mapped = {
    id: assembly.id,
    kind: assembly.kind,
    overall_width_mm: assembly.overall_width_mm === undefined ? null : assembly.overall_width_mm,
    overall_depth_mm: assembly.overall_depth_mm === undefined ? null : assembly.overall_depth_mm,
    finished_height_mm: assembly.finished_height_mm === undefined ? null : assembly.finished_height_mm,
    modules: []
  };
  for (var i = 0; i < assembly.modules.length; i += 1) {
    mapped.modules.push(mapModule(assembly.modules[i], index, i, issues));
  }
  var openings = [];
  if (Array.isArray(assembly.openings)) {
    openings = clone(assembly.openings);
  }
  mapped.openings = openings;
  var surfaces = [];
  if (Array.isArray(assembly.non_carcass_surfaces)) {
    surfaces = clone(assembly.non_carcass_surfaces);
  }
  mapped.non_carcass_surfaces = surfaces;
  if (assembly.notes !== undefined) {
    mapped.notes = clone(assembly.notes);
  }
  return mapped;
}

function buildConfirmedConfiguration(draft) {
  var structuralErrors = validateDraft(draft);
  if (structuralErrors.length) {
    return { ok: false, confirmed: null, issues: structuralErrors };
  }
  var issues = [];
  var confirmed = {
    schema_version: CONFIRMED_SCHEMA_VERSION,
    project_id: draft.project_id,
    status: CONFIRMED_STATUS,
    units: 'mm',
    construction_profile_id: draft.construction_profile_id,
    source_refs: clone(draft.source_refs),
    global_dimensions: {},
    assemblies: []
  };
  if (isPlainObject(draft.global_dimensions)) {
    confirmed.global_dimensions = {
      finished_worktop_height_mm: draft.global_dimensions.finished_worktop_height_mm === undefined ? null : draft.global_dimensions.finished_worktop_height_mm,
      toe_kick_height_mm: draft.global_dimensions.toe_kick_height_mm === undefined ? null : draft.global_dimensions.toe_kick_height_mm,
      countertop_thickness_mm: draft.global_dimensions.countertop_thickness_mm === undefined ? null : draft.global_dimensions.countertop_thickness_mm
    };
  }
  for (var i = 0; i < draft.assemblies.length; i += 1) {
    confirmed.assemblies.push(mapAssembly(draft.assemblies[i], i, issues));
  }
  if (issues.length) {
    return { ok: false, confirmed: null, issues: issues };
  }
  return { ok: true, confirmed: confirmed, issues: issues };
}

function sanitizePathForId(targetPath) {
  var raw = String(targetPath || '').replace(/[^A-Za-z0-9]+/g, '_');
  raw = raw.replace(/^_+|_+$/g, '');
  return raw.length ? raw : 'root';
}

function makeQuestionId(targetPath, reason) {
  return 'q_' + sanitizePathForId(targetPath) + '_' + String(reason || '').toLowerCase();
}

function isRequiredDimension(targetPath) {
  return String(targetPath).indexOf('.dimensions.width_mm') !== -1 &&
    String(targetPath).indexOf('.modules[') !== -1;
}

function reasonForState(state) {
  if (state === 'MISSING') {
    return 'MISSING_REQUIRED_VALUE';
  }
  if (state === 'CONFLICT') {
    return 'UNRESOLVED_CONFLICT';
  }
  if (state === 'NEEDS_CONFIRMATION') {
    return 'CONFIRMATION_REQUIRED';
  }
  return null;
}

function compareTargetPath(a, b) {
  var pa = String(a.Target_path);
  var pb = String(b.Target_path);
  if (pa < pb) {
    return -1;
  }
  if (pa > pb) {
    return 1;
  }
  return 0;
}

function sortByTargetPath(arr) {
  return arr.slice().sort(compareTargetPath);
}

function collectDimensionCells(draft) {
  var cells = [];
  if (!isPlainObject(draft) || !Array.isArray(draft.assemblies)) {
    return cells;
  }
  for (var a = 0; a < draft.assemblies.length; a += 1) {
    var assembly = draft.assemblies[a];
    if (!isPlainObject(assembly) || !Array.isArray(assembly.modules)) {
      continue;
    }
    for (var m = 0; m < assembly.modules.length; m += 1) {
      var module_ = assembly.modules[m];
      if (!isPlainObject(module_) || !isPlainObject(module_.dimensions)) {
        continue;
      }
      var basePath = '$.assemblies[' + a + '].modules[' + m + '].dimensions';
      var dims = module_.dimensions;
      var fields = ['width_mm', 'height_mm', 'depth_mm'];
      for (var f = 0; f < fields.length; f += 1) {
        var field = fields[f];
        var cell = dims[field];
        if (isPlainObject(cell)) {
          cells.push({
            target_path: basePath + '.' + field,
            field: field,
            cell: cell
          });
        }
      }
    }
  }
  return cells;
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

function clarifyDraft(draft) {
  var cells = collectDimensionCells(draft);

  var understood = [];
  var missing = [];
  var conflicts = [];
  var defaultCandidates = [];
  var blockers = [];
  var questions = [];

  for (var i = 0; i < cells.length; i += 1) {
    var entry = cells[i];
    var targetPath = entry.target_path;
    var cell = entry.cell;
    var state = cell.state;
    var required = isRequiredDimension(targetPath);

    if (cell.source_type === 'DEFAULT_CANDIDATE' && cell.value !== undefined && cell.value !== null) {
      defaultCandidates.push({
        Target_path: targetPath,
        Value: cell.value,
        Evidence_id: cell.source_ref || null
      });
    }

    if (state === 'KNOWN') {
      if (isPositiveNumber(cell.value)) {
        understood.push({
          Target_path: targetPath,
          Value: cell.value,
          Selected_evidence_id: cell.source_ref || null
        });
      }
      continue;
    }

    if (state === 'MISSING') {
      missing.push({ Target_path: targetPath });
      if (required) {
        var missingReason = 'MISSING_REQUIRED_VALUE';
        blockers.push({ Target_path: targetPath, Reason: missingReason });
        questions.push({
          Question_id: makeQuestionId(targetPath, missingReason),
          Target_path: targetPath,
          Reason: missingReason,
          Current_state: state,
          Options: []
        });
      }
      continue;
    }

    if (state === 'CONFLICT') {
      var rawOptions = Array.isArray(cell.options) ? cell.options : [];
      var conflictOptions = sortedUniqueNumbers(rawOptions);
      var conflictEvidence = [];
      for (var c = 0; c < conflictOptions.length; c += 1) {
        conflictEvidence.push({ Value: conflictOptions[c] });
      }
      var conflictRecord = {
        Target_path: targetPath,
        Options: conflictOptions,
        Evidence: conflictEvidence
      };
      if (isNonEmptyString(cell.source_ref)) {
        conflictRecord.Source_ref = cell.source_ref;
      }
      if (isNonEmptyString(cell.source_type)) {
        conflictRecord.Source_type = cell.source_type;
      }
      if (isNonEmptyString(cell.evidence_state)) {
        conflictRecord.Evidence_state = cell.evidence_state;
      }
      if (isNonEmptyString(cell.note)) {
        conflictRecord.Note = cell.note;
      }
      conflicts.push(conflictRecord);

      var conflictReason = 'UNRESOLVED_CONFLICT';
      blockers.push({ Target_path: targetPath, Reason: conflictReason });
      questions.push({
        Question_id: makeQuestionId(targetPath, conflictReason),
        Target_path: targetPath,
        Reason: conflictReason,
        Current_state: state,
        Options: conflictOptions
      });
      continue;
    }

    if (state === 'NEEDS_CONFIRMATION') {
      var confirmReason = 'CONFIRMATION_REQUIRED';
      var confirmOptions = [];
      if (cell.source_type === 'DEFAULT_CANDIDATE' && cell.value !== undefined && cell.value !== null) {
        confirmOptions = [cell.value];
      }
      questions.push({
        Question_id: makeQuestionId(targetPath, confirmReason),
        Target_path: targetPath,
        Reason: confirmReason,
        Current_state: state,
        Options: confirmOptions
      });
      if (required) {
        blockers.push({ Target_path: targetPath, Reason: confirmReason });
      }
      continue;
    }
  }

  return {
    Understood: sortByTargetPath(understood),
    Missing: sortByTargetPath(missing),
    Conflicts: sortByTargetPath(conflicts),
    Default_candidates: sortByTargetPath(defaultCandidates),
    Blockers: sortByTargetPath(blockers),
    Questions: sortByTargetPath(questions)
  };
}

var fusion = require('./fusion.js');

module.exports = {
  EVIDENCE_STATES: EVIDENCE_STATES,
  EVIDENCE_SOURCE_TYPES: EVIDENCE_SOURCE_TYPES,
  DRAFT_CELL_STATES: DRAFT_CELL_STATES,
  DIMENSION_EVIDENCE_STATES: DIMENSION_EVIDENCE_STATES,
  DRAFT_SCHEMA_VERSION: DRAFT_SCHEMA_VERSION,
  CONFIRMED_SCHEMA_VERSION: CONFIRMED_SCHEMA_VERSION,
  CONFIRMED_STATUS: CONFIRMED_STATUS,
  validateEvidence: validateEvidence,
  validateDraft: validateDraft,
  buildConfirmedConfiguration: buildConfirmedConfiguration,
  clarifyDraft: clarifyDraft,
  ClarifyDraft: clarifyDraft,
  fuseEvidence: fusion.fuseEvidence,
  FuseEvidence: fusion.fuseEvidence
};
