'use strict';

var core = require('../construction-core/index.js');

function loadStage10() {
  return require('./index.js');
}

var calculateConstructionCore = core.calculateConstructionCore;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function blocked(issues) {
  return {
    Ok: false,
    Confirmed_configuration: null,
    Construction_result: null,
    Issues: Array.isArray(issues) ? clone(issues) : []
  };
}

function runConstructionFromDraft(draft, profile, benchmarkReference) {
  var draftClone = clone(draft);
  var mapped = loadStage10().buildConfirmedConfiguration(draftClone);
  if (!mapped || !mapped.ok) {
    return blocked(mapped ? mapped.issues : []);
  }
  var confirmed = mapped.confirmed;
  if (!confirmed) {
    return blocked(mapped.issues || []);
  }

  var coreResult;
  try {
    coreResult = calculateConstructionCore(confirmed, clone(profile), benchmarkReference === undefined || benchmarkReference === null ? null : clone(benchmarkReference));
  } catch (error) {
    var errorIssues = error && Array.isArray(error.issues) ? clone(error.issues) : [];
    if (!errorIssues.length) {
      errorIssues.push({
        code: error && error.code ? error.code : 'CONSTRUCTION_CORE_ERROR',
        status: 'VALIDATION_ERROR',
        message: error && error.message ? error.message : 'Construction Core execution failed.',
        path: null,
        source_rule: null
      });
    }
    return blocked(errorIssues);
  }

  return {
    Ok: true,
    Confirmed_configuration: clone(confirmed),
    Construction_result: coreResult,
    Issues: []
  };
}

module.exports = {
  runConstructionFromDraft: runConstructionFromDraft,
  RunConstructionFromDraft: runConstructionFromDraft
};