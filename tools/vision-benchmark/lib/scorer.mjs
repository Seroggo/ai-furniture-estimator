import {validateRawResult} from '../validate.mjs';

export const SCORE_WEIGHTS = Object.freeze({
  assemblies: 5,
  moduleDetection: 30,
  moduleAttributes: 15,
  appliancesFeatures: 15,
  explicitDimensionDetection: 15,
  dimensionBinding: 15,
  spatialRelations: 5,
});

const DIMENSION_FIELDS = Object.freeze(['width_mm', 'height_mm', 'depth_mm']);
const INDEPENDENT_EVIDENCE = new Set(['VISUAL_BOUNDARY', 'VISIBLE_OBJECT', 'CROSS_VIEW_MATCH']);

function list(value) {
  return Array.isArray(value) ? value : [];
}

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalized(value) {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase() : '';
}

function f1(precision, recall) {
  if (precision === 0 && recall === 0) return 1;
  return (2 * precision * recall) / (precision + recall);
}

function multiset(values) {
  const result = new Map();
  for (const value of values) result.set(value, (result.get(value) || 0) + 1);
  return result;
}

function intersectionCount(left, right) {
  let count = 0;
  for (const [key, value] of left) count += Math.min(value, right.get(key) || 0);
  return count;
}

function compareMultiset(candidateValues, goldValues) {
  const candidate = multiset(candidateValues);
  const gold = multiset(goldValues);
  const truePositive = intersectionCount(candidate, gold);
  const precision = candidateValues.length === 0 ? (goldValues.length === 0 ? 1 : 0) : truePositive / candidateValues.length;
  const recall = goldValues.length === 0 ? (candidateValues.length === 0 ? 1 : 0) : truePositive / goldValues.length;
  return {
    true_positive: truePositive,
    false_positive: candidateValues.length - truePositive,
    false_negative: goldValues.length - truePositive,
    precision,
    recall,
    f1: f1(precision, recall),
  };
}

function explicitDimensionValue(container, field) {
  const dimension = record(container?.[field]);
  return dimension.status === 'EXPLICIT' && finiteNumber(dimension.value_mm) !== null ? dimension.value_mm : null;
}

function dimensionSignature(assembly) {
  return DIMENSION_FIELDS.map((field) => explicitDimensionValue(record(assembly?.overall_dimensions), field));
}

function knownDimensionSimilarity(candidate, gold) {
  const left = dimensionSignature(candidate);
  const right = dimensionSignature(gold);
  let known = 0;
  let equal = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== null && right[index] !== null) {
      known += 1;
      if (left[index] === right[index]) equal += 1;
    }
  }
  return known === 0 ? 0 : equal / known;
}

function moduleKey(module) {
  if (!module || typeof module.tier !== 'string' || !Number.isInteger(module.order)) return null;
  return `${normalized(module.tier)}|${module.order}`;
}

function moduleSimilarity(candidate, gold) {
  let score = 0;
  if (candidate?.module_type === gold?.module_type) score += 4;
  if (candidate?.tier === gold?.tier) score += 3;
  if (candidate?.role === gold?.role) score += 4;
  const candidateWidth = explicitDimensionValue(record(candidate?.dimensions), 'width_mm');
  const goldWidth = explicitDimensionValue(record(gold?.dimensions), 'width_mm');
  if (candidateWidth !== null && candidateWidth === goldWidth) score += 3;
  const candidateAppliances = list(candidate?.appliances).map((item) => normalized(item?.type)).sort();
  const goldAppliances = list(gold?.appliances).map((item) => normalized(item?.type)).sort();
  if (JSON.stringify(candidateAppliances) === JSON.stringify(goldAppliances)) score += 2;
  const candidateFeatures = list(candidate?.visible_features).map((item) => normalized(item?.type)).sort();
  const goldFeatures = list(gold?.visible_features).map((item) => normalized(item?.type)).sort();
  if (JSON.stringify(candidateFeatures) === JSON.stringify(goldFeatures)) score += 2;
  return score;
}

function assemblySimilarity(candidate, gold) {
  if (candidate?.kind !== gold?.kind) return -1;
  let score = 20 + knownDimensionSimilarity(candidate, gold) * 8;
  const candidateKeys = new Set(list(candidate?.modules).map(moduleKey).filter(Boolean));
  const goldKeys = new Set(list(gold?.modules).map(moduleKey).filter(Boolean));
  for (const key of candidateKeys) if (goldKeys.has(key)) score += 2;
  return score;
}

export function matchAssemblies(candidate, gold) {
  const candidateAssemblies = list(candidate?.assemblies);
  const goldAssemblies = list(gold?.assemblies);
  const usedGold = new Set();
  const matches = [];
  for (let candidateIndex = 0; candidateIndex < candidateAssemblies.length; candidateIndex += 1) {
    const choices = goldAssemblies
      .map((goldAssembly, goldIndex) => ({goldAssembly, goldIndex, score: assemblySimilarity(candidateAssemblies[candidateIndex], goldAssembly)}))
      .filter((choice) => choice.score >= 0 && !usedGold.has(choice.goldIndex))
      .sort((left, right) => right.score - left.score || left.goldIndex - right.goldIndex);
    const best = choices[0];
    if (!best) matches.push({candidate: candidateAssemblies[candidateIndex], gold: null, candidateIndex, goldIndex: null});
    else {
      usedGold.add(best.goldIndex);
      matches.push({candidate: candidateAssemblies[candidateIndex], gold: best.goldAssembly, candidateIndex, goldIndex: best.goldIndex});
    }
  }
  for (let goldIndex = 0; goldIndex < goldAssemblies.length; goldIndex += 1) {
    if (!usedGold.has(goldIndex)) matches.push({candidate: null, gold: goldAssemblies[goldIndex], candidateIndex: null, goldIndex});
  }
  return matches;
}

export function matchModules(candidateAssembly, goldAssembly) {
  const candidateModules = list(candidateAssembly?.modules);
  const goldModules = list(goldAssembly?.modules);
  const goldByKey = new Map();
  for (let goldIndex = 0; goldIndex < goldModules.length; goldIndex += 1) {
    const key = moduleKey(goldModules[goldIndex]);
    if (key === null) continue;
    const bucket = goldByKey.get(key) || [];
    bucket.push(goldIndex);
    goldByKey.set(key, bucket);
  }
  const usedGold = new Set();
  const matches = [];
  for (let candidateIndex = 0; candidateIndex < candidateModules.length; candidateIndex += 1) {
    const candidateModule = candidateModules[candidateIndex];
    const key = moduleKey(candidateModule);
    let selectedGoldIndex = null;
    if (key !== null && goldByKey.has(key)) {
      selectedGoldIndex = (goldByKey.get(key) || []).find((goldIndex) => !usedGold.has(goldIndex)) ?? null;
    } else {
      const choices = goldModules
        .map((goldModule, goldIndex) => ({goldModule, goldIndex, score: moduleSimilarity(candidateModule, goldModule)}))
        .filter((choice) => !usedGold.has(choice.goldIndex) && choice.score > 0)
        .sort((left, right) => right.score - left.score || left.goldIndex - right.goldIndex);
      // Ordered modules are matched by their semantic key. Fallback is only for
      // an unknown order, not for a different declared position.
      if (candidateModule?.order === null) selectedGoldIndex = choices[0]?.goldIndex ?? null;
    }
    if (selectedGoldIndex === null) matches.push({candidate: candidateModule, gold: null, candidateIndex, goldIndex: null});
    else {
      usedGold.add(selectedGoldIndex);
      matches.push({candidate: candidateModule, gold: goldModules[selectedGoldIndex], candidateIndex, goldIndex: selectedGoldIndex});
    }
  }
  for (let goldIndex = 0; goldIndex < goldModules.length; goldIndex += 1) {
    if (!usedGold.has(goldIndex)) matches.push({candidate: null, gold: goldModules[goldIndex], candidateIndex: null, goldIndex});
  }
  return matches;
}

export function matchResultStructures(candidate, gold) {
  const assemblies = matchAssemblies(candidate, gold);
  const modulesByAssembly = new Map();
  assemblies.forEach((assemblyMatch, index) => {
    modulesByAssembly.set(index, matchModules(assemblyMatch.candidate || {}, assemblyMatch.gold || {}));
  });
  return {assemblies, modulesByAssembly};
}

function assemblyMetric(matches) {
  const candidateCount = matches.filter((match) => match.candidate).length;
  const goldCount = matches.filter((match) => match.gold).length;
  const truePositive = matches.filter((match) => match.candidate && match.gold && match.candidate.kind === match.gold.kind).length;
  const precision = candidateCount === 0 ? (goldCount === 0 ? 1 : 0) : truePositive / candidateCount;
  const recall = goldCount === 0 ? (candidateCount === 0 ? 1 : 0) : truePositive / goldCount;
  return {true_positive: truePositive, candidate_count: candidateCount, gold_count: goldCount, precision, recall, f1: f1(precision, recall)};
}

function moduleDetectionMetric(matches) {
  const candidateCount = matches.filter((match) => match.candidate).length;
  const goldCount = matches.filter((match) => match.gold).length;
  const truePositive = matches.filter((match) => match.candidate && match.gold).length;
  const precision = candidateCount === 0 ? (goldCount === 0 ? 1 : 0) : truePositive / candidateCount;
  const recall = goldCount === 0 ? (candidateCount === 0 ? 1 : 0) : truePositive / goldCount;
  return {true_positive: truePositive, candidate_count: candidateCount, gold_count: goldCount, precision, recall, f1: f1(precision, recall)};
}

function moduleAttributeMetric(matches) {
  const fields = ['module_type', 'tier', 'role'];
  const fieldMetrics = {};
  for (const field of fields) {
    const candidateCount = matches.filter((match) => match.candidate).length;
    const goldCount = matches.filter((match) => match.gold).length;
    const truePositive = matches.filter((match) => match.candidate && match.gold && match.candidate[field] === match.gold[field]).length;
    const precision = candidateCount === 0 ? (goldCount === 0 ? 1 : 0) : truePositive / candidateCount;
    const recall = goldCount === 0 ? (candidateCount === 0 ? 1 : 0) : truePositive / goldCount;
    fieldMetrics[field] = {true_positive: truePositive, candidate_count: candidateCount, gold_count: goldCount, precision, recall, f1: f1(precision, recall)};
  }
  return {fields: fieldMetrics, f1: fields.reduce((sum, field) => sum + fieldMetrics[field].f1, 0) / fields.length};
}

function assemblyCanonicalKey(assemblyMatch, index, side) {
  if (assemblyMatch.gold) return `gold:${assemblyMatch.goldIndex}`;
  return `${side}:${index}`;
}

function moduleCanonicalKey(assemblyMatch, assemblyIndex, moduleMatch, side) {
  const module = side === 'gold' ? moduleMatch.gold : moduleMatch.candidate;
  const assemblyKey = assemblyCanonicalKey(assemblyMatch, assemblyIndex, side);
  return `${assemblyKey}|${moduleKey(module) || `index:${side === 'gold' ? moduleMatch.goldIndex : moduleMatch.candidateIndex}`}`;
}

function collectDimensionFacts(result, assemblyMatches, modulesByAssembly, side) {
  const facts = [];
  assemblyMatches.forEach((assemblyMatch, assemblyIndex) => {
    const assembly = side === 'gold' ? assemblyMatch.gold : assemblyMatch.candidate;
    if (!assembly) return;
    const assemblyKey = assemblyCanonicalKey(assemblyMatch, assemblyIndex, side);
    for (const field of DIMENSION_FIELDS) {
      const dimension = record(assembly.overall_dimensions)?.[field];
      if (dimension?.status === 'EXPLICIT' && finiteNumber(dimension.value_mm) !== null) {
        facts.push({scope: 'assembly', assemblyKey, moduleKey: null, field, value_mm: dimension.value_mm, status: dimension.status});
      }
    }
    for (const moduleMatch of modulesByAssembly.get(assemblyIndex) || []) {
      const module = side === 'gold' ? moduleMatch.gold : moduleMatch.candidate;
      if (!module) continue;
      const canonicalKey = moduleCanonicalKey(assemblyMatch, assemblyIndex, moduleMatch, side);
      for (const field of DIMENSION_FIELDS) {
        const dimension = record(module.dimensions)?.[field];
        if (dimension?.status === 'EXPLICIT' && finiteNumber(dimension.value_mm) !== null) {
          facts.push({scope: 'module', assemblyKey, moduleKey: canonicalKey, field, value_mm: dimension.value_mm, status: dimension.status});
        }
      }
    }
  });
  return facts;
}

function unassignedValues(result) {
  return list(result?.unassigned_dimensions).flatMap((dimension) => {
    if (dimension?.status === 'EXPLICIT' && finiteNumber(dimension.value_mm) !== null) return [dimension.value_mm];
    if (dimension?.status === 'AMBIGUOUS' || dimension?.status === 'CONFLICT') return list(dimension.candidates).map((candidate) => candidate?.value_mm).filter((value) => finiteNumber(value) !== null);
    return [];
  });
}

function compareDimensions(candidate, gold, structure) {
  const candidateFacts = collectDimensionFacts(candidate, structure.assemblies, structure.modulesByAssembly, 'candidate');
  const goldFacts = collectDimensionFacts(gold, structure.assemblies, structure.modulesByAssembly, 'gold');
  const candidateUnassigned = unassignedValues(candidate);
  const goldUnassigned = unassignedValues(gold);
  const detection = compareMultiset([...candidateFacts.map((fact) => fact.value_mm), ...candidateUnassigned], [...goldFacts.map((fact) => fact.value_mm), ...goldUnassigned]);
  const assignedDetection = compareMultiset(candidateFacts.map((fact) => fact.value_mm), goldFacts.map((fact) => fact.value_mm));
  const usedGold = new Set();
  const bindingErrors = [];
  for (const fact of candidateFacts) {
    const matchIndex = goldFacts.findIndex((goldFact, index) => {
      if (usedGold.has(index)) return false;
      if (fact.scope !== goldFact.scope || fact.field !== goldFact.field || fact.value_mm !== goldFact.value_mm) return false;
      return fact.scope === 'assembly' ? fact.assemblyKey === goldFact.assemblyKey : fact.moduleKey === goldFact.moduleKey;
    });
    if (matchIndex >= 0) {
      usedGold.add(matchIndex);
      continue;
    }
    const sameTarget = goldFacts.find((goldFact) => fact.scope === goldFact.scope && fact.field === goldFact.field && (fact.scope === 'assembly' ? fact.assemblyKey === goldFact.assemblyKey : fact.moduleKey === goldFact.moduleKey));
    const reason = goldUnassigned.includes(fact.value_mm) && !sameTarget
      ? 'gold_unassigned_value_bound_to_target'
      : sameTarget
        ? 'numeric_value_differs_from_gold_target'
        : 'numeric_value_not_supported_by_gold_target';
    bindingErrors.push({candidate: fact, gold: sameTarget || null, reason});
  }
  const missed = goldFacts.filter((_, index) => !usedGold.has(index));
  const precision = candidateFacts.length === 0 ? (goldFacts.length === 0 ? 1 : 0) : (candidateFacts.length - bindingErrors.length) / candidateFacts.length;
  const recall = goldFacts.length === 0 ? (candidateFacts.length === 0 ? 1 : 0) : (goldFacts.length - missed.length) / goldFacts.length;
  const goldUnassignedCounts = multiset(goldUnassigned);
  const candidateUnassignedCounts = multiset(candidateUnassigned);
  const unassignedMisses = [];
  for (const [value, count] of goldUnassignedCounts) {
    const candidateCount = candidateUnassignedCounts.get(value) || 0;
    for (let index = candidateCount; index < count; index += 1) unassignedMisses.push(Number(value));
  }
  const candidateToGoldModuleId = new Map();
  for (const moduleMatches of structure.modulesByAssembly.values()) {
    for (const moduleMatch of moduleMatches) if (moduleMatch.candidate && moduleMatch.gold) candidateToGoldModuleId.set(moduleMatch.candidate.module_id, moduleMatch.gold.module_id);
  }
  return {
    detection: {...detection, assigned: assignedDetection},
    binding: {precision, recall, f1: f1(precision, recall), errors: bindingErrors, missed, wrongAssignedNumericDimensions: bindingErrors},
    unsupportedNumericDimensions: bindingErrors,
    goldUnassignedMisses: unassignedMisses,
    candidate: {assigned: candidateFacts, unassigned: candidateUnassigned},
    gold: {assigned: goldFacts, unassigned: goldUnassigned},
    candidateToGoldModuleId,
  };
}

function ownedAppliances(result, structure, side) {
  const records = [];
  structure.assemblies.forEach((assemblyMatch, assemblyIndex) => {
    const assembly = side === 'gold' ? assemblyMatch.gold : assemblyMatch.candidate;
    if (!assembly) return;
    const assemblyOwner = `assembly:${assemblyCanonicalKey(assemblyMatch, assemblyIndex, side)}`;
    for (const appliance of list(assembly.appliances)) records.push({key: `${assemblyOwner}|${normalized(appliance?.type)}`, owner: assemblyOwner, type: appliance?.type});
    for (const moduleMatch of structure.modulesByAssembly.get(assemblyIndex) || []) {
      const module = side === 'gold' ? moduleMatch.gold : moduleMatch.candidate;
      if (!module) continue;
      const owner = `module:${moduleCanonicalKey(assemblyMatch, assemblyIndex, moduleMatch, side)}`;
      for (const appliance of list(module.appliances)) records.push({key: `${owner}|${normalized(appliance?.type)}`, owner, type: appliance?.type});
    }
  });
  return records;
}

function ownedFeatures(result, structure, side) {
  const records = [];
  structure.assemblies.forEach((assemblyMatch, assemblyIndex) => {
    const assembly = side === 'gold' ? assemblyMatch.gold : assemblyMatch.candidate;
    if (!assembly) return;
    for (const moduleMatch of structure.modulesByAssembly.get(assemblyIndex) || []) {
      const module = side === 'gold' ? moduleMatch.gold : moduleMatch.candidate;
      if (!module) continue;
      const owner = `module:${moduleCanonicalKey(assemblyMatch, assemblyIndex, moduleMatch, side)}`;
      for (const feature of list(module.visible_features)) records.push({key: `${owner}|${normalized(feature?.type)}`, owner, type: feature?.type});
    }
  });
  return records;
}

function compareOwnedRecords(candidateRecords, goldRecords) {
  const goldBuckets = new Map();
  for (const goldRecord of goldRecords) {
    const bucket = goldBuckets.get(goldRecord.key) || [];
    bucket.push(goldRecord);
    goldBuckets.set(goldRecord.key, bucket);
  }
  const used = new Set();
  const invented = [];
  for (const candidateRecord of candidateRecords) {
    const matching = (goldBuckets.get(candidateRecord.key) || []).find((goldRecord) => !used.has(goldRecord));
    if (matching) used.add(matching);
    else invented.push({owner: candidateRecord.owner, type: candidateRecord.type});
  }
  const missing = goldRecords.filter((goldRecord) => !used.has(goldRecord)).map((item) => ({owner: item.owner, type: item.type}));
  const matched = goldRecords.length - missing.length;
  const precision = candidateRecords.length === 0 ? (goldRecords.length === 0 ? 1 : 0) : matched / candidateRecords.length;
  const recall = goldRecords.length === 0 ? (candidateRecords.length === 0 ? 1 : 0) : matched / goldRecords.length;
  return {candidate_count: candidateRecords.length, gold_count: goldRecords.length, matched, precision, recall, f1: f1(precision, recall), missing, invented};
}

function compareAppliancesAndFeatures(candidate, gold, structure) {
  return {
    appliances: compareOwnedRecords(ownedAppliances(candidate, structure, 'candidate'), ownedAppliances(gold, structure, 'gold')),
    features: compareOwnedRecords(ownedFeatures(candidate, structure, 'candidate'), ownedFeatures(gold, structure, 'gold')),
  };
}

function compareSpatialRelations(candidate, gold, structure) {
  const moduleIdMap = new Map();
  for (const moduleMatches of structure.modulesByAssembly.values()) {
    for (const moduleMatch of moduleMatches) if (moduleMatch.candidate && moduleMatch.gold) moduleIdMap.set(moduleMatch.candidate.module_id, moduleMatch.gold.module_id);
  }
  const normalizeRelation = (relation) => `${moduleIdMap.get(relation?.subject_module_id) || relation?.subject_module_id}|${relation?.relation}|${moduleIdMap.get(relation?.object_module_id) || relation?.object_module_id}`;
  const candidateRelations = list(candidate?.spatial_relations).map(normalizeRelation);
  const goldRelations = list(gold?.spatial_relations).map((relation) => `${relation?.subject_module_id}|${relation?.relation}|${relation?.object_module_id}`);
  const metric = compareMultiset(candidateRelations, goldRelations);
  const goldSet = new Set(goldRelations);
  const candidateSet = new Set(candidateRelations);
  return {...metric, errors: candidateRelations.filter((relation) => !goldSet.has(relation)), missed: goldRelations.filter((relation) => !candidateSet.has(relation))};
}

function collectFalsePositiveModules(structure) {
  const result = [];
  for (const moduleMatches of structure.modulesByAssembly.values()) {
    for (const match of moduleMatches) if (match.candidate && !match.gold) result.push({module_id: match.candidate.module_id, tier: match.candidate.tier, order: match.candidate.order, module_type: match.candidate.module_type, role: match.candidate.role});
  }
  return result;
}

function collectMissingModules(structure) {
  const result = [];
  for (const moduleMatches of structure.modulesByAssembly.values()) {
    for (const match of moduleMatches) if (!match.candidate && match.gold) result.push({module_id: match.gold.module_id, tier: match.gold.tier, order: match.gold.order, module_type: match.gold.module_type, role: match.gold.role});
  }
  return result;
}

function collectIncorrectModuleAttributes(structure) {
  const result = [];
  for (const moduleMatches of structure.modulesByAssembly.values()) {
    for (const match of moduleMatches) {
      if (!match.candidate || !match.gold) continue;
      for (const field of ['module_type', 'tier', 'role']) if (match.candidate[field] !== match.gold[field]) result.push({candidate_module_id: match.candidate.module_id, gold_module_id: match.gold.module_id, field, candidate: match.candidate[field], gold: match.gold[field]});
    }
  }
  return result;
}

function evidenceGroundingMetric(candidate, gold, structure) {
  const candidateEvidence = [];
  const goldEvidence = [];
  for (const moduleMatches of structure.modulesByAssembly.values()) {
    for (const match of moduleMatches) {
      if (match.candidate) candidateEvidence.push(...list(match.candidate.evidence).filter((item) => INDEPENDENT_EVIDENCE.has(item?.type)).map((item) => item.type));
      if (match.gold) goldEvidence.push(...list(match.gold.evidence).filter((item) => INDEPENDENT_EVIDENCE.has(item?.type)).map((item) => item.type));
    }
  }
  return compareMultiset(candidateEvidence, goldEvidence);
}

function visibleTextMetric(candidate, gold) {
  const candidateText = list(candidate?.visible_text).map((item) => `${normalized(item?.text)}|${item?.source_image_id}`);
  const goldText = list(gold?.visible_text).map((item) => `${normalized(item?.text)}|${item?.source_image_id}`);
  return compareMultiset(candidateText, goldText);
}

function duplicatePhysicalAppliances(result) {
  const duplicates = [];
  for (const assembly of list(result?.assemblies)) {
    const assemblyTypes = new Set(list(assembly?.appliances).map((appliance) => normalized(appliance?.type)));
    for (const module of list(assembly?.modules)) {
      for (const appliance of list(module?.appliances)) {
        if (assemblyTypes.has(normalized(appliance?.type))) duplicates.push({assembly_id: assembly.assembly_id, module_id: module.module_id, type: appliance.type});
      }
    }
  }
  return duplicates;
}

function validationErrorDetails(validation) {
  return list(validation?.errors).map((message) => ({message}));
}

export function scoreResult(candidate, gold, {rawText = null, latencyMs = null, usage = null, apiFailure = null} = {}) {
  const candidateValidation = validateRawResult(rawText === null ? JSON.stringify(candidate) : rawText);
  const goldValidation = validateRawResult(JSON.stringify(gold));
  const candidateValue = candidateValidation.value || {};
  const goldValue = goldValidation.value || gold || {};
  const structure = matchResultStructures(candidateValue, goldValue);
  const allModuleMatches = [...structure.modulesByAssembly.values()].flat();
  const dimensions = compareDimensions(candidateValue, goldValue, structure);
  const assemblies = assemblyMetric(structure.assemblies);
  const modules = moduleDetectionMetric(allModuleMatches);
  const attributes = moduleAttributeMetric(allModuleMatches);
  const appliancesFeatures = compareAppliancesAndFeatures(candidateValue, goldValue, structure);
  const spatial = compareSpatialRelations(candidateValue, goldValue, structure);
  const falsePositiveModules = collectFalsePositiveModules(structure);
  const missingModules = collectMissingModules(structure);
  const schemaFailures = candidateValidation.valid ? [] : validationErrorDetails(candidateValidation);
  const hardGateReasons = [];
  if (!candidateValidation.parsed || !candidateValidation.valid) hardGateReasons.push('schema_valid=false');
  if (falsePositiveModules.length > 0) hardGateReasons.push('invented_modules>0');
  if (appliancesFeatures.appliances.invented.length > 0) hardGateReasons.push('invented_appliances>0');
  if (dimensions.unsupportedNumericDimensions.length > 0) hardGateReasons.push('unsupported_or_wrong_assigned_numeric_dimensions>0');
  if (!goldValidation.valid) hardGateReasons.push('gold_schema_valid=false');
  if (apiFailure) hardGateReasons.push('api_failure');

  const weightedMetrics = {
    assemblies: assemblies.f1,
    moduleDetection: modules.f1,
    moduleAttributes: attributes.f1,
    appliancesFeatures: (appliancesFeatures.appliances.f1 + appliancesFeatures.features.f1) / 2,
    explicitDimensionDetection: dimensions.detection.f1,
    dimensionBinding: dimensions.binding.f1,
    spatialRelations: spatial.f1,
  };
  const weightedMetricScores = Object.fromEntries(Object.entries(weightedMetrics).map(([metric, value]) => [metric, Number((value * SCORE_WEIGHTS[metric]).toFixed(4))]));
  const weightedScore = Object.entries(SCORE_WEIGHTS).reduce((sum, [metric, weight]) => sum + weightedMetrics[metric] * weight, 0);
  const textMetric = visibleTextMetric(candidateValue, goldValue);
  const unassignedMetric = compareMultiset(dimensions.candidate.unassigned, dimensions.gold.unassigned);
  return {
    score: Number(weightedScore.toFixed(4)),
    hardGates: {pass: hardGateReasons.length === 0, reasons: hardGateReasons},
    schema_valid: candidateValidation.valid,
    parse_valid: candidateValidation.parsed,
    weighted_metrics: weightedMetrics,
    weighted_metric_scores: weightedMetricScores,
    metric_details: {
      assemblies,
      modules: {detection: modules, attributes},
      appliances_features: appliancesFeatures,
      dimensions,
      spatial_relations: spatial,
    },
    separate_metrics: {
      evidence_grounding_structure: evidenceGroundingMetric(candidateValue, goldValue, structure),
      visible_text_recall: textMetric.recall,
      unassigned_dimensions_recall: unassignedMetric.recall,
      schema_violations: schemaFailures,
      api_failure: apiFailure,
      latency_ms: latencyMs,
      token_usage: usage,
    },
    details: {
      false_positive_modules: falsePositiveModules,
      missing_modules: missingModules,
      incorrect_module_attributes: collectIncorrectModuleAttributes(structure),
      missing_appliances: appliancesFeatures.appliances.missing,
      invented_appliances: appliancesFeatures.appliances.invented,
      missing_visible_features: appliancesFeatures.features.missing,
      invented_visible_features: appliancesFeatures.features.invented,
      dimension_misses: dimensions.binding.missed,
      wrong_bindings: dimensions.binding.wrongAssignedNumericDimensions,
      unsupported_numeric_dimensions: dimensions.unsupportedNumericDimensions,
      unassigned_dimension_misses: dimensions.goldUnassignedMisses,
      spatial_relation_errors: spatial.errors,
      spatial_relation_misses: spatial.missed,
      schema_failures: schemaFailures,
      duplicate_physical_appliances: duplicatePhysicalAppliances(candidateValue),
    },
    validation: {candidate: candidateValidation, gold: goldValidation},
  };
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((left, right) => left - right);
  if (sorted.length === 0) return null;
  if (sorted.length % 2 === 1) return sorted[(sorted.length - 1) / 2];
  return (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
}

export function aggregateRuns(runScores) {
  const scores = runScores.map((run) => Number(run.score)).filter((value) => Number.isFinite(value)).sort((left, right) => left - right);
  const medianScore = median(scores) ?? 0;
  const minScore = scores.length > 0 ? scores[0] : 0;
  const maxScore = scores.length > 0 ? scores[scores.length - 1] : 0;
  const hardGateStatus = runScores.map((run) => run.hardGates?.pass ?? run.hard_gates === true);
  const hardGatesPass = runScores.length > 0 && hardGateStatus.every(Boolean);
  let verdict = 'FAIL';
  if (hardGatesPass && medianScore >= 95 && minScore >= 92) verdict = 'PASS_AUTOMATION_CANDIDATE';
  else if (hardGatesPass && medianScore >= 92) verdict = 'CONDITIONAL_HUMAN_CONFIRMED';
  return {
    run_count: runScores.length,
    scores,
    median_score: Number(medianScore.toFixed(4)),
    min_score: Number(minScore.toFixed(4)),
    max_score: Number(maxScore.toFixed(4)),
    spread: Number((maxScore - minScore).toFixed(4)),
    hard_gates_pass: hardGatesPass,
    hard_gate_status: hardGateStatus,
    verdict,
    median_latency_ms: median(runScores.map((run) => run.separate_metrics?.latency_ms ?? run.latency_ms)),
    median_input_tokens: median(runScores.map((run) => run.separate_metrics?.token_usage?.input_tokens ?? run.token_usage?.input_tokens)),
    median_output_tokens: median(runScores.map((run) => run.separate_metrics?.token_usage?.output_tokens ?? run.token_usage?.output_tokens)),
  };
}
