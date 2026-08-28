'use strict';

function getStage10() {
  return require('./index.js');
}

function getVision() {
  return require('./vision.js');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
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

var MODULE_DIMENSION_PATTERN = /^assemblies\[(\d+)\]\.modules\[(\d+)\]\.dimensions\.(width_mm|height_mm|depth_mm)$/;
var ASSEMBLY_DIMENSION_PATTERN = /^assemblies\[(\d+)\]\.(overall_width_mm|overall_depth_mm|finished_height_mm)$/;
var GLOBAL_DIMENSION_PATTERN = /^global_dimensions\.(finished_worktop_height_mm|toe_kick_height_mm|countertop_thickness_mm)$/;

function resolvesToDraftCell(targetPath) {
  if (!isNonEmptyString(targetPath)) {
    return false;
  }
  return MODULE_DIMENSION_PATTERN.test(targetPath) ||
    ASSEMBLY_DIMENSION_PATTERN.test(targetPath) ||
    GLOBAL_DIMENSION_PATTERN.test(targetPath);
}

function snapshotInput(input) {
  return JSON.stringify(input);
}

function runStage10Pipeline(input) {
  var stage10 = getStage10();
  var vision = getVision();

  if (!isPlainObject(input)) {
    return {
      Ok: false,
      Evidence: [],
      Draft: null,
      Clarification: null,
      Brief: null,
      Confirmation_result: null,
      Confirmed_configuration: null,
      Construction_result: null,
      Issues: [issue('PIPELINE_INPUT_INVALID', 'VALIDATION_ERROR', 'Pipeline input must be an object.', '$')]
    };
  }

  var draft = input.Draft;
  var inputEvidence = Array.isArray(input.Evidence) ? input.Evidence : [];
  var visionInput = input.Vision;
  var confirmationAnswers = input.Confirmation_answers;
  var profile = input.Profile;
  var benchmarkReference = input.Benchmark_reference;

  var inputSnapshot = snapshotInput(input);

  var issues = [];

  if (!isPlainObject(draft)) {
    issues.push(issue('PIPELINE_DRAFT_MISSING', 'VALIDATION_ERROR', 'Pipeline input requires a Draft object.', '$.Draft'));
    return {
      Ok: false,
      Evidence: [],
      Draft: null,
      Clarification: null,
      Brief: null,
      Confirmation_result: null,
      Confirmed_configuration: null,
      Construction_result: null,
      Issues: issues
    };
  }

  var draftValidation = stage10.validateDraft(draft);
  if (draftValidation.length > 0) {
    return {
      Ok: false,
      Evidence: [],
      Draft: clone(draft),
      Clarification: null,
      Brief: null,
      Confirmation_result: null,
      Confirmed_configuration: null,
      Construction_result: null,
      Issues: draftValidation
    };
  }

  var visionEvidence = [];
  var visionEvidenceErrors = [];

  if (visionInput !== undefined && visionInput !== null) {
    if (!isPlainObject(visionInput)) {
      issues.push(issue('PIPELINE_VISION_INVALID', 'VALIDATION_ERROR', 'Vision must be an object.', '$.Vision'));
    } else {
      var imageInput = visionInput.Image_input;
      var provider = visionInput.Provider;
      if (imageInput === undefined || imageInput === null) {
        issues.push(issue('PIPELINE_VISION_IMAGE_MISSING', 'VALIDATION_ERROR', 'Vision requires Image_input.', '$.Vision.Image_input'));
      } else if (provider === undefined || provider === null) {
        issues.push(issue('PIPELINE_VISION_PROVIDER_MISSING', 'VALIDATION_ERROR', 'Vision requires Provider.', '$.Vision.Provider'));
      } else {
        var visionResult = vision.recognizeImage(imageInput, provider);
        if (visionResult && typeof visionResult.then === 'function') {
          issues.push(issue('PIPELINE_VISION_ASYNC_UNSUPPORTED', 'VALIDATION_ERROR', 'Local pipeline does not support async vision providers.', '$.Vision.Provider'));
        } else if (!visionResult.ok) {
          visionEvidenceErrors = visionResult.errors || [];
          for (var ve = 0; ve < visionEvidenceErrors.length; ve += 1) {
            issues.push({
              code: visionEvidenceErrors[ve].code,
              status: visionEvidenceErrors[ve].status,
              message: visionEvidenceErrors[ve].message,
              path: visionEvidenceErrors[ve].path,
              source_rule: null
            });
          }
        } else {
          visionEvidence = visionResult.evidence || [];
        }
      }
    }

    if (issues.length > 0) {
      return {
        Ok: false,
        Evidence: [],
        Draft: clone(draft),
        Clarification: null,
        Brief: null,
        Confirmation_result: null,
        Confirmed_configuration: null,
        Construction_result: null,
        Issues: issues
      };
    }
  }

  var allEvidence = inputEvidence.slice();
  for (var v = 0; v < visionEvidence.length; v += 1) {
    allEvidence.push(visionEvidence[v]);
  }

  var evidenceValidation = stage10.validateEvidence(allEvidence);
  if (evidenceValidation.length > 0) {
    return {
      Ok: false,
      Evidence: [],
      Draft: clone(draft),
      Clarification: null,
      Brief: null,
      Confirmation_result: null,
      Confirmed_configuration: null,
      Construction_result: null,
      Issues: evidenceValidation
    };
  }

  var fusionEvidence = [];
  var unresolvableEvidence = [];
  for (var f = 0; f < allEvidence.length; f += 1) {
    if (resolvesToDraftCell(allEvidence[f].target_path)) {
      fusionEvidence.push(allEvidence[f]);
    } else {
      unresolvableEvidence.push(allEvidence[f]);
    }
  }

  var fusionResult;
  if (fusionEvidence.length > 0) {
    fusionResult = stage10.fuseEvidence(draft, fusionEvidence);
    if (!fusionResult.Ok) {
      return {
        Ok: false,
        Evidence: allEvidence,
        Draft: clone(draft),
        Clarification: null,
        Brief: null,
        Confirmation_result: null,
        Confirmed_configuration: null,
        Construction_result: null,
        Issues: fusionResult.Issues
      };
    }
  } else {
    fusionResult = { Ok: true, Draft: clone(draft), Issues: [] };
  }

  var fusedDraft = fusionResult.Draft;

  var clarification = stage10.clarifyDraft(fusedDraft);
  var brief = stage10.buildDynamicBrief(clarification);

  var hasBlockers = Array.isArray(brief.Blockers) && brief.Blockers.length > 0;
  var hasQuestions = Array.isArray(brief.Questions) && brief.Questions.length > 0;
  var hasConflicts = Array.isArray(brief.Conflicts) && brief.Conflicts.length > 0;

  var confirmationResult = null;
  var updatedDraft = fusedDraft;
  var confirmationEvidence = [];

  if (confirmationAnswers !== undefined && confirmationAnswers !== null) {
    if (!Array.isArray(confirmationAnswers)) {
      issues.push(issue('PIPELINE_CONFIRMATION_INVALID', 'VALIDATION_ERROR', 'Confirmation_answers must be an array.', '$.Confirmation_answers'));
    } else {
      confirmationResult = stage10.applyConfirmationAnswers(updatedDraft, brief, confirmationAnswers);
      if (!confirmationResult.Ok) {
        return {
          Ok: false,
          Evidence: allEvidence,
          Draft: clone(fusedDraft),
          Clarification: clarification,
          Brief: brief,
          Confirmation_result: confirmationResult,
          Confirmed_configuration: null,
          Construction_result: null,
          Issues: confirmationResult.Issues
        };
      }
      updatedDraft = confirmationResult.Draft;
      confirmationEvidence = confirmationResult.Evidence || [];

      var reclarification = stage10.clarifyDraft(updatedDraft);
      clarification = reclarification;
      brief = stage10.buildDynamicBrief(reclarification);
      hasBlockers = Array.isArray(brief.Blockers) && brief.Blockers.length > 0;
      hasQuestions = Array.isArray(brief.Questions) && brief.Questions.length > 0;
      hasConflicts = Array.isArray(brief.Conflicts) && brief.Conflicts.length > 0;
    }

    if (issues.length > 0) {
      return {
        Ok: false,
        Evidence: allEvidence.concat(confirmationEvidence),
        Draft: clone(updatedDraft),
        Clarification: clarification,
        Brief: brief,
        Confirmation_result: confirmationResult,
        Confirmed_configuration: null,
        Construction_result: null,
        Issues: issues
      };
    }
  }

  var fullEvidence = allEvidence.concat(confirmationEvidence);

  if (hasBlockers || hasQuestions || hasConflicts) {
    return {
      Ok: false,
      Evidence: fullEvidence,
      Draft: clone(updatedDraft),
      Clarification: clarification,
      Brief: brief,
      Confirmation_result: confirmationResult,
      Confirmed_configuration: null,
      Construction_result: null,
      Issues: issues
    };
  }

  var confirmedResult = stage10.buildConfirmedConfiguration(updatedDraft);
  if (!confirmedResult.ok) {
    return {
      Ok: false,
      Evidence: fullEvidence,
      Draft: clone(updatedDraft),
      Clarification: clarification,
      Brief: brief,
      Confirmation_result: confirmationResult,
      Confirmed_configuration: null,
      Construction_result: null,
      Issues: confirmedResult.issues
    };
  }

  var confirmed = confirmedResult.confirmed;

  var constructionResult = null;
  if (profile !== undefined && profile !== null) {
    var constructionAdapter = require('./construction_adapter.js');
    var adapterResult = constructionAdapter.runConstructionFromDraft(updatedDraft, profile, benchmarkReference);
    if (!adapterResult.Ok) {
      return {
        Ok: false,
        Evidence: fullEvidence,
        Draft: clone(updatedDraft),
        Clarification: clarification,
        Brief: brief,
        Confirmation_result: confirmationResult,
        Confirmed_configuration: clone(confirmed),
        Construction_result: null,
        Issues: adapterResult.Issues
      };
    }
    constructionResult = adapterResult.Construction_result;
    issues = adapterResult.Issues || [];
  }

  if (snapshotInput(input) !== inputSnapshot) {
    return {
      Ok: false,
      Evidence: fullEvidence,
      Draft: clone(updatedDraft),
      Clarification: clarification,
      Brief: brief,
      Confirmation_result: confirmationResult,
      Confirmed_configuration: clone(confirmed),
      Construction_result: constructionResult,
      Issues: [issue('PIPELINE_INPUT_MUTATED', 'VALIDATION_ERROR', 'Pipeline input was mutated during execution.', '$')]
    };
  }

  return {
    Ok: true,
    Evidence: fullEvidence,
    Draft: clone(updatedDraft),
    Clarification: clarification,
    Brief: brief,
    Confirmation_result: confirmationResult,
    Confirmed_configuration: clone(confirmed),
    Construction_result: constructionResult,
    Issues: issues
  };
}

module.exports = {
  runStage10Pipeline: runStage10Pipeline,
  RunStage10Pipeline: runStage10Pipeline,
  resolvesToDraftCell: resolvesToDraftCell
};