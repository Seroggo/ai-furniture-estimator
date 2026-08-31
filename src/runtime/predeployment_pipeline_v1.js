'use strict';

var stage10Pipeline = require('../input-understanding/pipeline.js');
var defaultsResolver = require('../input-understanding/construction_defaults.js');
var costing = require('../costing/index.js');

var STATUS = {
  NEEDS_CLARIFICATION: 'NEEDS_CLARIFICATION',
  READY: 'READY',
  COMPLETE: 'COMPLETE',
  PARTIAL: 'PARTIAL'
};

function clone(value) {
  if (value === undefined || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clone);
  var output = {};
  Object.keys(value).forEach(function (key) {
    output[key] = clone(value[key]);
  });
  return output;
}

function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function first(value, fallback) { return value === undefined || value === null ? fallback : value; }
function problem(code, message, path) {
  return { code: code, status: 'VALIDATION_ERROR', message: message, path: path || null, source_rule: null };
}

function getTarget(draft, path) {
  var match = /^\$\.assemblies\[(\d+)\]\.modules\[(\d+)\]\.construction\.([A-Za-z0-9_]+)$/.exec(String(path || ''));
  if (!match || !draft || !Array.isArray(draft.assemblies)) return null;
  var assembly = draft.assemblies[Number(match[1])];
  var module_ = assembly && assembly.modules && assembly.modules[Number(match[2])];
  if (!module_) return null;
  if (!isObject(module_.construction)) module_.construction = {};
  return { module: module_, parameter: match[3] };
}

function addDefaultCandidates(draft, resolutions) {
  var output = clone(draft);
  (Array.isArray(resolutions) ? resolutions : []).slice().sort(function (a, b) {
    return String(a.Target_path).localeCompare(String(b.Target_path));
  }).forEach(function (resolution) {
    var target = getTarget(output, resolution.Target_path);
    if (!target || (target.module.construction[target.parameter] && target.module.construction[target.parameter].state === 'KNOWN')) return;
    if (resolution.resolution_mode === 'REQUIRED_QUESTION') {
      target.module.construction[target.parameter] = { state: 'MISSING' };
    } else {
      target.module.construction[target.parameter] = {
        state: 'NEEDS_CONFIRMATION',
        value: clone(resolution.value),
        source_type: 'DEFAULT_CANDIDATE',
        source_ref: resolution.source_ref,
        evidence_state: 'ALPHA_DEFAULT',
        note: resolution.description || 'Construction default candidate.'
      };
    }
  });
  return output;
}

function makeDefaultAnswers(brief, candidates, supplied) {
  var result = Array.isArray(supplied) ? supplied.map(clone) : [];
  var used = {};
  result.forEach(function (answer) { if (answer && answer.Target_path) used[answer.Target_path] = true; });
  (Array.isArray(candidates) ? candidates : []).forEach(function (candidate) {
    if (used[candidate.Target_path]) return;
    var question = (brief && brief.Questions || []).find(function (item) { return item.Target_path === candidate.Target_path; });
    if (!question) return;
    var candidateValue = candidate.Value === undefined ? candidate.value : candidate.Value;
    result.push({ Question_id: question.Question_id, Target_path: question.Target_path, Value: clone(candidateValue) });
    used[candidate.Target_path] = true;
  });
  return result;
}

function alphaCostingResult(constructionResult) {
  var output = clone(constructionResult);
  if (Array.isArray(output.Hardware)) {
    output.Hardware = output.Hardware.filter(function (item) {
      return !(item && item.item === 'DRAWER_MECHANISMS' && item.quantity === null && item.status === 'NOT_IMPLEMENTED');
    });
  }
  return output;
}

function runPredeploymentPipelineV1(input, options) {
  var opts = options || {};
  var errors = [];
  if (!isObject(input) || !isObject(opts)) return { Status: STATUS.PARTIAL, Stage10: null, Construction_defaults: null, Confirmed_configuration: null, Construction_result: null, Price_snapshot: null, Costing: null, Sheets_bundle: null, Issues: [problem('INVALID_INPUT', 'Input and options must be objects.', '$')] };
  if (!Array.isArray(opts.ConstructionDefaults)) errors.push(problem('CONSTRUCTION_DEFAULTS_INVALID', 'ConstructionDefaults must be an array.', '$.ConstructionDefaults'));
  if (!Array.isArray(opts.PriceRows)) errors.push(problem('PRICE_ROWS_INVALID', 'PriceRows must be an array.', '$.PriceRows'));
  if (opts.VisionProvider && (!isObject(opts.VisionProvider) || typeof opts.VisionProvider.analyze !== 'function')) errors.push(problem('VISION_PROVIDER_INVALID', 'VisionProvider must expose analyze.', '$.VisionProvider'));
  if (errors.length) return { Status: STATUS.PARTIAL, Stage10: null, Construction_defaults: null, Confirmed_configuration: null, Construction_result: null, Price_snapshot: null, Costing: null, Sheets_bundle: null, Issues: errors };

  var source = clone(input.Stage10 || input);
  if (opts.VisionProvider) {
    if (!isObject(source.Vision)) source.Vision = {};
    source.Vision.Provider = opts.VisionProvider;
  }
  var defaults = defaultsResolver.resolveConstructionDefaults(source.Draft, opts.ConstructionDefaults);
  source.Draft = addDefaultCandidates(source.Draft, defaults.Results);
  var userAnswers = Array.isArray(source.Confirmation_answers) ? source.Confirmation_answers : [];
  var stageResult = stage10Pipeline.runStage10Pipeline(source);
  var result = { Status: STATUS.NEEDS_CLARIFICATION, Stage10: stageResult, Construction_defaults: defaults, Confirmed_configuration: null, Construction_result: null, Price_snapshot: null, Costing: null, Sheets_bundle: null, Issues: clone(stageResult.Issues || []) };
  var questionCount = stageResult.Brief && Array.isArray(stageResult.Brief.Questions) ? stageResult.Brief.Questions.length : 0;
  if (!stageResult.Ok && questionCount && (userAnswers.length || defaults.Default_candidates.length)) {
    source.Confirmation_answers = makeDefaultAnswers(stageResult.Brief, defaults.Default_candidates, userAnswers);
    stageResult = stage10Pipeline.runStage10Pipeline(source);
    result.Stage10 = stageResult;
    result.Issues = clone(stageResult.Issues || []);
  }
  if (!stageResult.Ok || !stageResult.Confirmed_configuration || !stageResult.Construction_result) return result;

  result.Confirmed_configuration = clone(stageResult.Confirmed_configuration);
  result.Construction_result = clone(stageResult.Construction_result);
  var constructionForCosting = alphaCostingResult(stageResult.Construction_result);
  var context = clone(first(opts.CalculationContext, input.CalculationContext || {}));
  if (!context.calculation_id && !context.Calculation_id) context.calculation_id = result.Confirmed_configuration.project_id + '_CALC';
  if (!context.timestamp && !context.Timestamp) context.timestamp = '2026-08-31T12:00:00.000Z';
  if (!context.project_name && !context.Project_name) context.project_name = result.Confirmed_configuration.project_id;
  var costingOptions = clone(opts.CostingOptions || {});
  var snapshotOptions = clone(costingOptions);
  snapshotOptions.created_at = first(snapshotOptions.created_at, context.timestamp || context.Timestamp);
  try {
    result.Price_snapshot = costing.buildPriceSnapshot(opts.PriceRows, snapshotOptions);
    result.Costing = costing.calculateCosting(constructionForCosting, result.Price_snapshot, costingOptions);
  } catch (error) {
    result.Status = STATUS.PARTIAL;
    result.Issues.push(problem('COSTING_ERROR', error.message, '$.Costing'));
    return result;
  }
  if (result.Costing.Status !== 'COMPLETE') {
    result.Status = STATUS.PARTIAL;
    return result;
  }
  var bundleContext = clone(context);
  bundleContext.confirmed_configuration = result.Confirmed_configuration;
  bundleContext.construction_result = constructionForCosting;
  result.Sheets_bundle = costing.buildSheetsV1Bundle(bundleContext, result.Costing, result.Price_snapshot);
  result.Status = STATUS.COMPLETE;
  return result;
}

module.exports = { STATUS: STATUS, runPredeploymentPipelineV1: runPredeploymentPipelineV1, RunPredeploymentPipelineV1: runPredeploymentPipelineV1 };
