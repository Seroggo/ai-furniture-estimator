import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const TEST_DIR = fileURLToPath(new URL('.', import.meta.url));
export const GOLD_PATH = join(TEST_DIR, '..', '..', 'benchmarks', 'vision', 'gold', 'GOLD_VISION_KITCHEN_2025-04-01_V1_5.json');
export const SYNTHETIC_GOLD_PATH = join(TEST_DIR, 'fixtures', 'synthetic', 'gold.json');

export async function loadJson(path = GOLD_PATH) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export function clone(value) {
  return structuredClone(value);
}

export function unknownDimension() {
  return {
    status: 'UNKNOWN',
    value_mm: null,
    raw_text: null,
    source_image_ids: [],
    candidates: [],
    evidence: [],
  };
}

export function explicitDimension(value, sourceImageId, rawText = String(value)) {
  return {
    status: 'EXPLICIT',
    value_mm: value,
    raw_text: rawText,
    source_image_ids: [sourceImageId],
    candidates: [],
    evidence: [
      {
        source_image_id: sourceImageId,
        type: 'DIMENSION_CHAIN',
        raw_text: rawText,
        description: `Visible dimension chain label ${rawText}.`,
      },
    ],
  };
}

export function replaceAllObjectIds(result) {
  const output = clone(result);
  const moduleIds = new Map();
  output.assemblies.forEach((assembly, assemblyIndex) => {
    assembly.assembly_id = `CANDIDATE_ASSEMBLY_${assemblyIndex + 1}`;
    assembly.modules.forEach((module, moduleIndex) => {
      const nextId = `CANDIDATE_MODULE_${assemblyIndex + 1}_${moduleIndex + 1}`;
      moduleIds.set(module.module_id, nextId);
      module.module_id = nextId;
    });
  });
  output.spatial_relations = output.spatial_relations.map((relation) => ({
    ...relation,
    subject_module_id: moduleIds.get(relation.subject_module_id),
    object_module_id: moduleIds.get(relation.object_module_id),
  }));
  return output;
}

export function removeModule(result, moduleId) {
  const output = clone(result);
  output.assemblies = output.assemblies.map((assembly) => ({
    ...assembly,
    modules: assembly.modules.filter((module) => module.module_id !== moduleId),
  }));
  output.spatial_relations = output.spatial_relations.filter((relation) => relation.subject_module_id !== moduleId && relation.object_module_id !== moduleId);
  return output;
}

export function addExtraModule(result, assemblyIndex = 0) {
  const output = clone(result);
  const assembly = output.assemblies[assemblyIndex];
  const source = clone(assembly.modules[0]);
  source.module_id = 'INVENTED_MODULE_99';
  source.order = 99;
  source.role = 'GENERAL_STORAGE';
  source.role_confidence = 0.5;
  source.visible_features = [];
  source.appliances = [];
  source.dimensions = {
    width_mm: unknownDimension(),
    height_mm: unknownDimension(),
    depth_mm: unknownDimension(),
  };
  assembly.modules.push(source);
  return output;
}

export function addInventedAppliance(result, assemblyIndex = 0, moduleIndex = 0) {
  const output = clone(result);
  const module = output.assemblies[assemblyIndex].modules[moduleIndex];
  const appliance = clone(module.appliances[0] || output.assemblies[assemblyIndex].modules.find((item) => item.appliances.length > 0).appliances[0]);
  appliance.type = 'OTHER';
  module.appliances.push(appliance);
  return output;
}

export function addWrongAssignedDimension(result, {assemblyIndex = 0, moduleIndex = 0, field = 'depth_mm', value = 1234, sourceImageId = null} = {}) {
  const output = clone(result);
  const module = output.assemblies[assemblyIndex].modules[moduleIndex];
  const source = sourceImageId || module.source_image_ids[0];
  module.dimensions[field] = explicitDimension(value, source);
  return output;
}

export function replaceDimensionValue(result, {assemblyIndex = 0, moduleIndex = 0, field = 'width_mm', value = 1234} = {}) {
  const output = clone(result);
  const dimension = output.assemblies[assemblyIndex].modules[moduleIndex].dimensions[field];
  dimension.value_mm = value;
  dimension.raw_text = String(value);
  dimension.evidence.forEach((evidence) => {
    evidence.raw_text = String(value);
    evidence.description = `Visible dimension chain label ${value}.`;
  });
  return output;
}

export function omitExplicitDimension(result, options = {}) {
  const output = clone(result);
  const dimension = output.assemblies[options.assemblyIndex || 0].modules[options.moduleIndex || 0].dimensions[options.field || 'width_mm'];
  Object.assign(dimension, unknownDimension());
  return output;
}

export function changeModuleRole(result, {assemblyIndex = 0, moduleIndex = 0, role = 'GENERAL_STORAGE'} = {}) {
  const output = clone(result);
  output.assemblies[assemblyIndex].modules[moduleIndex].role = role;
  return output;
}

export function changeSpatialRelation(result, relation = 'ABOVE') {
  const output = clone(result);
  output.spatial_relations[0].relation = relation;
  return output;
}
