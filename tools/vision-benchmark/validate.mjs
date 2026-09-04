const SCHEMA_KEYS = Object.freeze({
  root: ['schema_version', 'result_status', 'scene_type', 'sources', 'assemblies', 'spatial_relations', 'unassigned_dimensions', 'visible_text', 'warnings'],
  source: ['image_id', 'description'],
  assembly: ['assembly_id', 'kind', 'confidence', 'source_image_ids', 'order_reference_image_id', 'overall_dimensions', 'appliances', 'modules'],
  module: ['module_id', 'tier', 'order', 'module_type', 'role', 'role_confidence', 'boundary_status', 'boundary_confidence', 'source_image_ids', 'dimensions', 'appliances', 'visible_features', 'evidence'],
  dimension: ['status', 'value_mm', 'raw_text', 'source_image_ids', 'candidates', 'evidence'],
  candidate: ['value_mm', 'raw_text', 'source_image_id'],
  relation: ['subject_module_id', 'relation', 'object_module_id', 'confidence', 'source_image_ids', 'evidence'],
  evidence: ['source_image_id', 'type', 'raw_text', 'description'],
  appliance: ['type', 'confidence', 'source_image_ids', 'evidence'],
  feature: ['type', 'confidence', 'source_image_ids', 'evidence'],
  text: ['text', 'source_image_id', 'confidence'],
  warning: ['code', 'message', 'source_image_ids'],
  unassignedDimension: ['status', 'value_mm', 'raw_text', 'source_image_ids', 'candidates', 'reason'],
});

const ENUMS = Object.freeze({
  resultStatus: ['OK', 'INSUFFICIENT_VISUAL_DATA', 'NOT_SUPPORTED_SCENE'],
  sceneType: ['KITCHEN'],
  assemblyKind: ['LINEAR_RUN', 'ISLAND', 'PENINSULA', 'OTHER'],
  tier: ['BASE', 'WALL', 'TALL', 'OTHER', 'UNKNOWN'],
  moduleType: ['BASE_CABINET', 'WALL_CABINET', 'TALL_CABINET', 'APPLIANCE_SLOT', 'CUSTOM_CABINET', 'UNKNOWN'],
  role: ['GENERAL_STORAGE', 'DRAWER_CABINET', 'SINK_BASE', 'DISHWASHER_SLOT', 'REFRIGERATOR_HOUSING', 'APPLIANCE_TOWER', 'WALL_STORAGE', 'UNKNOWN'],
  appliance: ['COOKTOP', 'OVEN', 'MICROWAVE', 'REFRIGERATOR', 'DISHWASHER', 'HOOD', 'OTHER'],
  feature: ['SINK', 'DRAWER_FRONTS', 'HINGED_DOOR', 'OPEN_NICHE', 'GLASS_FRONT', 'WINDOW', 'OPENING', 'COUNTERTOP', 'OTHER'],
  dimensionStatus: ['EXPLICIT', 'UNKNOWN', 'AMBIGUOUS', 'CONFLICT'],
  unassignedStatus: ['EXPLICIT', 'AMBIGUOUS', 'CONFLICT'],
  boundaryStatus: ['CLEAR', 'PROBABLE', 'UNCERTAIN'],
  relation: ['LEFT_OF', 'RIGHT_OF', 'ABOVE', 'BELOW', 'SAME_HORIZONTAL_SPAN'],
  evidence: ['VISUAL_BOUNDARY', 'VISIBLE_OBJECT', 'DIMENSION_LABEL', 'DIMENSION_CHAIN', 'TEXT_LABEL', 'CROSS_VIEW_MATCH', 'OTHER'],
  warning: ['UNSTABLE_MODULE_ORDER', 'UNCERTAIN_CROSS_VIEW_MATCH', 'UNRESOLVED_CONFLICT', 'INSUFFICIENT_VISUAL_DATA', 'UNSUPPORTED_SCENE', 'UNCERTAIN_MODULE_BOUNDARY', 'UNASSIGNED_DIMENSION', 'CORNER_MODULE_CONNECTS_RUNS', 'OTHER'],
});

const OBJECT_EXISTENCE_EVIDENCE = new Set(['VISUAL_BOUNDARY', 'VISIBLE_OBJECT', 'CROSS_VIEW_MATCH']);
const DIMENSION_ONLY_EVIDENCE = new Set(['DIMENSION_LABEL', 'DIMENSION_CHAIN']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function checkExactKeys(value, expected, path, errors) {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.join('\u0000') === wanted.join('\u0000')) return true;
  const missing = wanted.filter((key) => !actual.includes(key));
  const unexpected = actual.filter((key) => !expected.includes(key));
  if (missing.length) errors.push(`${path} missing fields: ${missing.join(', ')}`);
  if (unexpected.length) errors.push(`${path} has unsupported fields: ${unexpected.join(', ')}`);
  return false;
}

function checkArray(value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return false;
  }
  return true;
}

function checkString(value, path, errors, {nonEmpty = false} = {}) {
  if (typeof value !== 'string' || (nonEmpty && value.length === 0)) {
    errors.push(`${path} must be ${nonEmpty ? 'a non-empty ' : 'a '}string`);
    return false;
  }
  return true;
}

function checkNumber(value, path, errors, {confidence = false, integer = false} = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value) || (integer && !Number.isInteger(value))) {
    errors.push(`${path} must be a finite${integer ? ' integer' : ''} number`);
    return false;
  }
  if (confidence && (value < 0 || value > 1)) errors.push(`${path} must be between 0 and 1`);
  return true;
}

function checkEnum(value, path, allowed, errors) {
  if (!allowed.includes(value)) {
    errors.push(`${path} must be one of: ${allowed.join(', ')}`);
    return false;
  }
  return true;
}

function checkStringArray(value, path, errors, {nonEmpty = false} = {}) {
  if (!checkArray(value, path, errors)) return false;
  if (nonEmpty && value.length === 0) errors.push(`${path} must not be empty`);
  value.forEach((item, index) => checkString(item, `${path}[${index}]`, errors, {nonEmpty: true}));
  return true;
}

function checkSourceReferences(ids, path, errors, knownSourceIds) {
  if (!Array.isArray(ids) || !knownSourceIds) return;
  ids.forEach((id, index) => {
    if (!knownSourceIds.has(id)) errors.push(`${path}[${index}] references undeclared source ${id}`);
  });
}

function checkEvidence(value, path, errors, sourceIds, knownSourceIds) {
  if (!checkExactKeys(value, SCHEMA_KEYS.evidence, path, errors)) return;
  checkString(value.source_image_id, `${path}.source_image_id`, errors, {nonEmpty: true});
  if (Array.isArray(sourceIds) && !sourceIds.includes(value.source_image_id)) errors.push(`${path}.source_image_id must be listed by its owner`);
  if (knownSourceIds && !knownSourceIds.has(value.source_image_id)) errors.push(`${path}.source_image_id references undeclared source`);
  checkEnum(value.type, `${path}.type`, ENUMS.evidence, errors);
  if (value.raw_text !== null) checkString(value.raw_text, `${path}.raw_text`, errors);
  checkString(value.description, `${path}.description`, errors, {nonEmpty: true});
}

function checkEvidenceArray(value, path, errors, sourceIds, knownSourceIds, {nonEmpty = false} = {}) {
  if (!checkArray(value, path, errors)) return false;
  if (nonEmpty && value.length === 0) errors.push(`${path} must not be empty`);
  value.forEach((item, index) => checkEvidence(item, `${path}[${index}]`, errors, sourceIds, knownSourceIds));
  return true;
}

function checkCandidate(value, path, errors, knownSourceIds) {
  if (!checkExactKeys(value, SCHEMA_KEYS.candidate, path, errors)) return;
  checkNumber(value.value_mm, `${path}.value_mm`, errors);
  checkString(value.raw_text, `${path}.raw_text`, errors, {nonEmpty: true});
  checkString(value.source_image_id, `${path}.source_image_id`, errors, {nonEmpty: true});
  if (knownSourceIds && !knownSourceIds.has(value.source_image_id)) errors.push(`${path}.source_image_id references undeclared source`);
}

function checkCandidates(value, path, errors, knownSourceIds, sourceIds) {
  if (!checkArray(value, path, errors)) return;
  value.forEach((item, index) => {
    checkCandidate(item, `${path}[${index}]`, errors, knownSourceIds);
    if (isObject(item) && Array.isArray(sourceIds) && !sourceIds.includes(item.source_image_id)) errors.push(`${path}[${index}].source_image_id must be listed by its dimension`);
  });
}

function checkDimension(value, path, errors, knownSourceIds, {unassigned = false} = {}) {
  const expected = unassigned ? SCHEMA_KEYS.unassignedDimension : SCHEMA_KEYS.dimension;
  if (!checkExactKeys(value, expected, path, errors)) return;
  const statuses = unassigned ? ENUMS.unassignedStatus : ENUMS.dimensionStatus;
  checkEnum(value.status, `${path}.status`, statuses, errors);
  if (value.value_mm !== null) checkNumber(value.value_mm, `${path}.value_mm`, errors);
  if (value.raw_text !== null) checkString(value.raw_text, `${path}.raw_text`, errors);
  const hasSources = checkStringArray(value.source_image_ids, `${path}.source_image_ids`, errors, {nonEmpty: unassigned || value.status !== 'UNKNOWN'});
  checkSourceReferences(value.source_image_ids, `${path}.source_image_ids`, errors, knownSourceIds);
  checkCandidates(value.candidates, `${path}.candidates`, errors, knownSourceIds, value.source_image_ids);
  if (!unassigned) checkEvidenceArray(value.evidence, `${path}.evidence`, errors, value.source_image_ids, knownSourceIds, {nonEmpty: value.status === 'EXPLICIT'});
  if (unassigned) checkString(value.reason, `${path}.reason`, errors, {nonEmpty: true});

  if (value.status === 'UNKNOWN') {
    if (value.value_mm !== null) errors.push(`${path}: UNKNOWN must have value_mm null`);
    if (value.raw_text !== null) errors.push(`${path}: UNKNOWN must have raw_text null`);
    if (hasSources && value.source_image_ids.length !== 0) errors.push(`${path}: UNKNOWN must have no source_image_ids`);
    if (Array.isArray(value.candidates) && value.candidates.length !== 0) errors.push(`${path}: UNKNOWN must have no candidates`);
  }
  if (value.status === 'EXPLICIT') {
    if (value.value_mm === null || typeof value.value_mm !== 'number' || !Number.isFinite(value.value_mm)) errors.push(`${path}: EXPLICIT must have numeric value_mm`);
    if (value.raw_text === null) errors.push(`${path}: EXPLICIT must have raw_text`);
    if (Array.isArray(value.candidates) && value.candidates.length !== 0) errors.push(`${path}: EXPLICIT must have no candidates`);
    if (!unassigned && Array.isArray(value.evidence) && value.evidence.length === 0) errors.push(`${path}: EXPLICIT must have evidence`);
  }
  if (value.status === 'AMBIGUOUS') {
    if (value.value_mm !== null) errors.push(`${path}: AMBIGUOUS must have value_mm null`);
    if (Array.isArray(value.candidates) && value.candidates.length === 0) errors.push(`${path}: AMBIGUOUS must have candidates`);
  }
  if (value.status === 'CONFLICT') {
    if (value.value_mm !== null) errors.push(`${path}: CONFLICT must have value_mm null`);
    if (value.raw_text !== null && !unassigned) errors.push(`${path}: CONFLICT must have raw_text null`);
    if (Array.isArray(value.candidates) && value.candidates.length < 2) errors.push(`${path}: CONFLICT must have at least two candidates`);
  }
  if (unassigned && value.status === 'EXPLICIT' && Array.isArray(value.candidates) && value.candidates.length !== 0) errors.push(`${path}: EXPLICIT unassigned dimension must have no candidates`);
}

function checkAppliance(value, path, errors, knownSourceIds) {
  if (!checkExactKeys(value, SCHEMA_KEYS.appliance, path, errors)) return;
  checkEnum(value.type, `${path}.type`, ENUMS.appliance, errors);
  checkNumber(value.confidence, `${path}.confidence`, errors, {confidence: true});
  const hasSources = checkStringArray(value.source_image_ids, `${path}.source_image_ids`, errors, {nonEmpty: true});
  checkSourceReferences(value.source_image_ids, `${path}.source_image_ids`, errors, knownSourceIds);
  if (hasSources) checkEvidenceArray(value.evidence, `${path}.evidence`, errors, value.source_image_ids, knownSourceIds, {nonEmpty: true});
}

function checkFeature(value, path, errors, knownSourceIds) {
  if (!checkExactKeys(value, SCHEMA_KEYS.feature, path, errors)) return;
  checkEnum(value.type, `${path}.type`, ENUMS.feature, errors);
  checkNumber(value.confidence, `${path}.confidence`, errors, {confidence: true});
  const hasSources = checkStringArray(value.source_image_ids, `${path}.source_image_ids`, errors, {nonEmpty: true});
  checkSourceReferences(value.source_image_ids, `${path}.source_image_ids`, errors, knownSourceIds);
  if (hasSources) checkEvidenceArray(value.evidence, `${path}.evidence`, errors, value.source_image_ids, knownSourceIds, {nonEmpty: true});
}

function declareId(value, path, errors, declaredObjectIds) {
  if (typeof value !== 'string') return;
  if (declaredObjectIds.has(value)) errors.push(`${path} duplicate declared object ID: ${value}`);
  declaredObjectIds.add(value);
}

function checkModule(value, path, errors, knownSourceIds, declaredObjectIds) {
  if (!checkExactKeys(value, SCHEMA_KEYS.module, path, errors)) return;
  checkString(value.module_id, `${path}.module_id`, errors, {nonEmpty: true});
  declareId(value.module_id, `${path}.module_id`, errors, declaredObjectIds);
  checkEnum(value.tier, `${path}.tier`, ENUMS.tier, errors);
  if (value.order !== null) checkNumber(value.order, `${path}.order`, errors, {integer: true});
  checkEnum(value.module_type, `${path}.module_type`, ENUMS.moduleType, errors);
  checkEnum(value.role, `${path}.role`, ENUMS.role, errors);
  checkNumber(value.role_confidence, `${path}.role_confidence`, errors, {confidence: true});
  checkEnum(value.boundary_status, `${path}.boundary_status`, ENUMS.boundaryStatus, errors);
  checkNumber(value.boundary_confidence, `${path}.boundary_confidence`, errors, {confidence: true});
  const hasSources = checkStringArray(value.source_image_ids, `${path}.source_image_ids`, errors, {nonEmpty: true});
  checkSourceReferences(value.source_image_ids, `${path}.source_image_ids`, errors, knownSourceIds);
  if (!isObject(value.dimensions)) errors.push(`${path}.dimensions must be an object`);
  else for (const field of ['width_mm', 'height_mm', 'depth_mm']) checkDimension(value.dimensions[field], `${path}.dimensions.${field}`, errors, knownSourceIds);
  const appliancesValid = checkArray(value.appliances, `${path}.appliances`, errors);
  if (appliancesValid) value.appliances.forEach((item, index) => checkAppliance(item, `${path}.appliances[${index}]`, errors, knownSourceIds));
  const featuresValid = checkArray(value.visible_features, `${path}.visible_features`, errors);
  if (featuresValid) value.visible_features.forEach((item, index) => checkFeature(item, `${path}.visible_features[${index}]`, errors, knownSourceIds));
  if (hasSources) checkEvidenceArray(value.evidence, `${path}.evidence`, errors, value.source_image_ids, knownSourceIds, {nonEmpty: true});
  if (hasSources && Array.isArray(value.evidence) && !value.evidence.some((item) => OBJECT_EXISTENCE_EVIDENCE.has(item?.type))) {
    errors.push(`${path} must have independent object-existence evidence; dimension-only evidence is insufficient`);
  }
}

function checkAssembly(value, path, errors, knownSourceIds, declaredObjectIds) {
  if (!checkExactKeys(value, SCHEMA_KEYS.assembly, path, errors)) return;
  checkString(value.assembly_id, `${path}.assembly_id`, errors, {nonEmpty: true});
  declareId(value.assembly_id, `${path}.assembly_id`, errors, declaredObjectIds);
  checkEnum(value.kind, `${path}.kind`, ENUMS.assemblyKind, errors);
  checkNumber(value.confidence, `${path}.confidence`, errors, {confidence: true});
  const hasSources = checkStringArray(value.source_image_ids, `${path}.source_image_ids`, errors, {nonEmpty: true});
  checkSourceReferences(value.source_image_ids, `${path}.source_image_ids`, errors, knownSourceIds);
  if (value.order_reference_image_id !== null) {
    checkString(value.order_reference_image_id, `${path}.order_reference_image_id`, errors, {nonEmpty: true});
    if (knownSourceIds && !knownSourceIds.has(value.order_reference_image_id)) errors.push(`${path}.order_reference_image_id references undeclared source`);
    if (hasSources && !value.source_image_ids.includes(value.order_reference_image_id)) errors.push(`${path}.order_reference_image_id must be listed by the assembly`);
  }
  if (!isObject(value.overall_dimensions)) errors.push(`${path}.overall_dimensions must be an object`);
  else for (const field of ['width_mm', 'height_mm', 'depth_mm']) checkDimension(value.overall_dimensions[field], `${path}.overall_dimensions.${field}`, errors, knownSourceIds);
  const appliancesValid = checkArray(value.appliances, `${path}.appliances`, errors);
  if (appliancesValid) value.appliances.forEach((item, index) => checkAppliance(item, `${path}.appliances[${index}]`, errors, knownSourceIds));
  const modulesValid = checkArray(value.modules, `${path}.modules`, errors);
  if (modulesValid) value.modules.forEach((item, index) => checkModule(item, `${path}.modules[${index}]`, errors, knownSourceIds, declaredObjectIds));

  if (appliancesValid && modulesValid) {
    const assemblyTypes = new Set(value.appliances.map((item) => item?.type));
    value.modules.forEach((module, moduleIndex) => {
      arrayOrEmpty(module?.appliances).forEach((appliance, applianceIndex) => {
        if (assemblyTypes.has(appliance?.type)) {
          errors.push(`${path}.modules[${moduleIndex}].appliances[${applianceIndex}] duplicates assembly-level appliance type ${appliance.type} under the owner/type rule`);
        }
      });
    });
  }
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function checkRelation(value, path, errors, knownSourceIds, declaredModuleIds) {
  if (!checkExactKeys(value, SCHEMA_KEYS.relation, path, errors)) return;
  checkString(value.subject_module_id, `${path}.subject_module_id`, errors, {nonEmpty: true});
  checkString(value.object_module_id, `${path}.object_module_id`, errors, {nonEmpty: true});
  if (value.subject_module_id === value.object_module_id) errors.push(`${path} subject and object module IDs must differ`);
  if (declaredModuleIds && !declaredModuleIds.has(value.subject_module_id)) errors.push(`${path}.subject_module_id references missing module ${value.subject_module_id}`);
  if (declaredModuleIds && !declaredModuleIds.has(value.object_module_id)) errors.push(`${path}.object_module_id references missing module ${value.object_module_id}`);
  checkEnum(value.relation, `${path}.relation`, ENUMS.relation, errors);
  checkNumber(value.confidence, `${path}.confidence`, errors, {confidence: true});
  const hasSources = checkStringArray(value.source_image_ids, `${path}.source_image_ids`, errors, {nonEmpty: true});
  checkSourceReferences(value.source_image_ids, `${path}.source_image_ids`, errors, knownSourceIds);
  if (hasSources) checkEvidenceArray(value.evidence, `${path}.evidence`, errors, value.source_image_ids, knownSourceIds, {nonEmpty: true});
}

function checkWarning(value, path, errors, knownSourceIds) {
  if (!checkExactKeys(value, SCHEMA_KEYS.warning, path, errors)) return;
  checkEnum(value.code, `${path}.code`, ENUMS.warning, errors);
  checkString(value.message, `${path}.message`, errors, {nonEmpty: true});
  checkStringArray(value.source_image_ids, `${path}.source_image_ids`, errors);
  checkSourceReferences(value.source_image_ids, `${path}.source_image_ids`, errors, knownSourceIds);
}

function checkText(value, path, errors, knownSourceIds) {
  if (!checkExactKeys(value, SCHEMA_KEYS.text, path, errors)) return;
  checkString(value.text, `${path}.text`, errors, {nonEmpty: true});
  checkString(value.source_image_id, `${path}.source_image_id`, errors, {nonEmpty: true});
  if (knownSourceIds && !knownSourceIds.has(value.source_image_id)) errors.push(`${path}.source_image_id references undeclared source`);
  checkNumber(value.confidence, `${path}.confidence`, errors, {confidence: true});
}

function checkResultStatusInvariants(result, errors) {
  if (result.result_status === 'OK') {
    if (result.scene_type !== 'KITCHEN') errors.push('scene_type must be KITCHEN when result_status is OK');
    return;
  }
  if (result.scene_type !== null) errors.push('scene_type must be null when result_status is not OK');
  for (const field of ['assemblies', 'spatial_relations', 'unassigned_dimensions']) {
    if (!Array.isArray(result[field]) || result[field].length !== 0) errors.push(`${field} must be [] when result_status is not OK`);
  }
  if (!Array.isArray(result.warnings) || result.warnings.length === 0) errors.push('warnings must explain a non-OK result');
}

export function validateResult(result) {
  const errors = [];
  if (!checkExactKeys(result, SCHEMA_KEYS.root, '$', errors)) return {valid: false, errors};
  if (result.schema_version !== '1.5') errors.push('schema_version must equal "1.5"');
  checkEnum(result.result_status, 'result_status', ENUMS.resultStatus, errors);
  if (result.scene_type !== null) checkEnum(result.scene_type, 'scene_type', ENUMS.sceneType, errors);
  checkResultStatusInvariants(result, errors);

  const sourceIds = new Set();
  if (checkArray(result.sources, 'sources', errors)) {
    result.sources.forEach((source, index) => {
      const path = `sources[${index}]`;
      if (!checkExactKeys(source, SCHEMA_KEYS.source, path, errors)) return;
      checkString(source.image_id, `${path}.image_id`, errors, {nonEmpty: true});
      if (sourceIds.has(source.image_id)) errors.push(`${path}.image_id duplicate source ID: ${source.image_id}`);
      sourceIds.add(source.image_id);
      if (source.description !== null) checkString(source.description, `${path}.description`, errors);
    });
  }

  const declaredObjectIds = new Set();
  if (checkArray(result.assemblies, 'assemblies', errors)) result.assemblies.forEach((item, index) => checkAssembly(item, `assemblies[${index}]`, errors, sourceIds, declaredObjectIds));
  const declaredModuleIds = new Set();
  for (const assembly of arrayOrEmpty(result.assemblies)) for (const module of arrayOrEmpty(assembly?.modules)) if (typeof module?.module_id === 'string') declaredModuleIds.add(module.module_id);
  if (checkArray(result.spatial_relations, 'spatial_relations', errors)) result.spatial_relations.forEach((item, index) => checkRelation(item, `spatial_relations[${index}]`, errors, sourceIds, declaredModuleIds));
  if (checkArray(result.unassigned_dimensions, 'unassigned_dimensions', errors)) result.unassigned_dimensions.forEach((item, index) => checkDimension(item, `unassigned_dimensions[${index}]`, errors, sourceIds, {unassigned: true}));
  if (checkArray(result.visible_text, 'visible_text', errors)) result.visible_text.forEach((item, index) => checkText(item, `visible_text[${index}]`, errors, sourceIds));
  if (checkArray(result.warnings, 'warnings', errors)) result.warnings.forEach((item, index) => checkWarning(item, `warnings[${index}]`, errors, sourceIds));

  return {valid: errors.length === 0, errors};
}

export function parseStrictJson(rawText) {
  if (typeof rawText !== 'string') return {valid: false, value: null, error: 'Response is not text'};
  try {
    return {valid: true, value: JSON.parse(rawText), error: null};
  } catch (error) {
    return {valid: false, value: null, error: error.message};
  }
}

export function validateRawResult(rawText) {
  const parsed = parseStrictJson(rawText);
  if (!parsed.valid) return {valid: false, parsed: false, value: null, errors: [`strict JSON parse failed: ${parsed.error}`]};
  const structure = validateResult(parsed.value);
  return {valid: structure.valid, parsed: true, value: parsed.value, errors: structure.errors};
}

export const VISION_ENUMS = ENUMS;
export const VISION_SCHEMA_KEYS = SCHEMA_KEYS;
export const INDEPENDENT_EVIDENCE_TYPES = OBJECT_EXISTENCE_EVIDENCE;
export const DIMENSION_ONLY_EVIDENCE_TYPES = DIMENSION_ONLY_EVIDENCE;
