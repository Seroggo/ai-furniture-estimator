'use strict';

function getStage10() {
  return require('./index.js');
}

function getFusion() {
  return require('./fusion.js');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function issue(code, status, message, path, questionId) {
  var rec = {
    code: code,
    status: status,
    message: message,
    path: path || null,
    source_rule: null
  };
  if (questionId) {
    rec.question_id = questionId;
  }
  return rec;
}

function sanitizePathForId(targetPath) {
  var raw = String(targetPath || '').replace(/[^A-Za-z0-9]+/g, '_');
  raw = raw.replace(/^_+|_+$/g, '');
  return raw.length ? raw : 'root';
}

function compareTargetPath(a, b) {
  var pa = String(a.Target_path);
  var pb = String(b.Target_path);
  if (pa < pb) return -1;
  if (pa > pb) return 1;
  return 0;
}

function sortByTargetPath(arr) {
  return arr.slice().sort(compareTargetPath);
}

function compareQuestionId(a, b) {
  var qa = String(a.Question_id);
  var qb = String(b.Question_id);
  if (qa < qb) return -1;
  if (qa > qb) return 1;
  return 0;
}

function sortByQuestionId(arr) {
  return arr.slice().sort(compareQuestionId);
}

function stableSortQuestions(questions) {
  return questions.slice().sort(function (a, b) {
    var byPath = compareTargetPath(a, b);
    if (byPath !== 0) return byPath;
    return compareQuestionId(a, b);
  });
}

function buildDynamicBrief(clarificationResult) {
  var result = {
    Understood: [],
    Defaults_to_confirm: [],
    Questions: [],
    Conflicts: [],
    Blockers: []
  };

  if (!isPlainObject(clarificationResult)) {
    return result;
  }

  if (Array.isArray(clarificationResult.Understood)) {
    result.Understood = sortByTargetPath(
      clarificationResult.Understood.map(function (u) {
        return {
          Target_path: u.Target_path,
          Value: u.Value,
          Selected_evidence_id: u.Selected_evidence_id === undefined ? null : u.Selected_evidence_id
        };
      })
    );
  }

  if (Array.isArray(clarificationResult.Default_candidates)) {
    result.Defaults_to_confirm = sortByTargetPath(
      clarificationResult.Default_candidates.map(function (d) {
        return {
          Target_path: d.Target_path,
          Value: d.Value,
          Evidence_id: d.Evidence_id === undefined ? null : d.Evidence_id
        };
      })
    );
  }

  if (Array.isArray(clarificationResult.Questions)) {
    result.Questions = stableSortQuestions(
      clarificationResult.Questions.map(function (q) {
        return {
          Question_id: q.Question_id,
          Target_path: q.Target_path,
          Reason: q.Reason,
          Current_state: q.Current_state,
          Options: Array.isArray(q.Options) ? q.Options.slice() : []
        };
      })
    );
  }

  if (Array.isArray(clarificationResult.Conflicts)) {
    result.Conflicts = sortByTargetPath(
      clarificationResult.Conflicts.map(function (c) {
        var rec = {
          Target_path: c.Target_path,
          Options: Array.isArray(c.Options) ? c.Options.slice() : [],
          Evidence: Array.isArray(c.Evidence) ? c.Evidence.map(function (e) {
            return { Value: e.Value };
          }) : []
        };
        if (c.Source_ref !== undefined) rec.Source_ref = c.Source_ref;
        if (c.Source_type !== undefined) rec.Source_type = c.Source_type;
        if (c.Evidence_state !== undefined) rec.Evidence_state = c.Evidence_state;
        if (c.Note !== undefined) rec.Note = c.Note;
        return rec;
      })
    );
  }

  if (Array.isArray(clarificationResult.Blockers)) {
    result.Blockers = sortByTargetPath(
      clarificationResult.Blockers.map(function (b) {
        return {
          Target_path: b.Target_path,
          Reason: b.Reason
        };
      })
    );
  }

  return result;
}

function makeEvidenceRef(targetPath, value) {
  var valPart = isNumber(value) ? String(value) : 'v';
  return 'UC_' + sanitizePathForId(targetPath) + '_' + valPart;
}

function makeConfirmationEvidence(targetPath, value, sourceRef) {
  return {
    target_path: targetPath,
    value: value,
    source_type: 'USER_CONFIRMATION',
    confidence: 1.0,
    state: 'ACTIVE',
    source_ref: sourceRef
  };
}

function buildQuestionIndex(brief) {
  var index = {};
  if (!Array.isArray(brief.Questions)) {
    return index;
  }
  for (var i = 0; i < brief.Questions.length; i += 1) {
    var q = brief.Questions[i];
    if (!isNonEmptyString(q.Question_id)) {
      continue;
    }
    index[q.Question_id] = {
      question: q,
      index: i
    };
  }
  return index;
}

function collectConflictOptionsByPath(brief) {
  var map = {};
  if (!Array.isArray(brief.Conflicts)) {
    return map;
  }
  for (var i = 0; i < brief.Conflicts.length; i += 1) {
    var c = brief.Conflicts[i];
    map[c.Target_path] = Array.isArray(c.Options) ? c.Options.slice() : [];
  }
  return map;
}

function collectDefaultsByPath(brief) {
  var map = {};
  if (!Array.isArray(brief.Defaults_to_confirm)) {
    return map;
  }
  for (var i = 0; i < brief.Defaults_to_confirm.length; i += 1) {
    var d = brief.Defaults_to_confirm[i];
    map[d.Target_path] = d;
  }
  return map;
}

function validateAnswers(brief, answers) {
  var issues = [];
  if (!Array.isArray(answers)) {
    issues.push(issue('ANSWERS_INVALID', 'VALIDATION_ERROR', 'Answers must be an array.', '$'));
    return issues;
  }

  var questionIndex = buildQuestionIndex(brief);
  var conflictOptionsByPath = collectConflictOptionsByPath(brief);
  var defaultsByPath = collectDefaultsByPath(brief);

  var seenQuestionIds = {};

  for (var i = 0; i < answers.length; i += 1) {
    var pathBase = 'answers[' + i + ']';
    var ans = answers[i];

    if (!isPlainObject(ans)) {
      issues.push(issue('ANSWER_INVALID', 'VALIDATION_ERROR', 'Answer must be an object.', pathBase));
      continue;
    }

    if (!isNonEmptyString(ans.Question_id)) {
      issues.push(issue('ANSWER_INVALID', 'VALIDATION_ERROR', 'Answer requires a Question_id string.', pathBase + '.Question_id'));
      continue;
    }

    var entry = questionIndex[ans.Question_id];
    if (!entry) {
      issues.push(issue('UNKNOWN_QUESTION_ID', 'VALIDATION_ERROR', 'Question_id does not correspond to any brief question: ' + ans.Question_id, pathBase + '.Question_id', ans.Question_id));
      continue;
    }

    var question = entry.question;

    if (!isNonEmptyString(ans.Target_path)) {
      issues.push(issue('ANSWER_INVALID', 'VALIDATION_ERROR', 'Answer requires a Target_path string.', pathBase + '.Target_path', ans.Question_id));
      continue;
    }

    if (ans.Target_path !== question.Target_path) {
      issues.push(issue('QUESTION_TARGET_MISMATCH', 'VALIDATION_ERROR', 'Answer Target_path does not match the question target_path. Question_id=' + ans.Question_id + ' expected ' + question.Target_path + ' got ' + ans.Target_path, pathBase + '.Target_path', ans.Question_id));
      continue;
    }

    if (!('Value' in ans) || ans.Value === undefined || ans.Value === null) {
      issues.push(issue('ANSWER_VALUE_MISSING', 'VALIDATION_ERROR', 'Answer Value is missing.', pathBase + '.Value', ans.Question_id));
      continue;
    }

    if (!isNumber(ans.Value)) {
      issues.push(issue('ANSWER_VALUE_INVALID', 'VALIDATION_ERROR', 'Answer Value must be a finite number.', pathBase + '.Value', ans.Question_id));
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(seenQuestionIds, ans.Question_id)) {
      issues.push(issue('DUPLICATE_QUESTION_ID', 'VALIDATION_ERROR', 'Duplicate Question_id in answers: ' + ans.Question_id, pathBase + '.Question_id', ans.Question_id));
      continue;
    }
    seenQuestionIds[ans.Question_id] = true;

    var options = question.Options;
    if (options && options.length > 0) {
      var matchedOption = false;
      for (var o = 0; o < options.length; o += 1) {
        if (options[o] === ans.Value) {
          matchedOption = true;
          break;
        }
      }
      if (!matchedOption) {
        issues.push(issue('ANSWER_VALUE_NOT_OPTION', 'VALIDATION_ERROR', 'Answer Value is not among the question options. Value=' + ans.Value + ' options=[' + options.join(', ') + ']', pathBase + '.Value', ans.Question_id));
        continue;
      }
    }

    var conflictOptions = conflictOptionsByPath[ans.Target_path];
    if (conflictOptions && conflictOptions.length > 0) {
      var matchedConflict = false;
      for (var co = 0; co < conflictOptions.length; co += 1) {
        if (conflictOptions[co] === ans.Value) {
          matchedConflict = true;
          break;
        }
      }
      if (!matchedConflict) {
        issues.push(issue('ANSWER_VALUE_NOT_CONFLICT_OPTION', 'VALIDATION_ERROR', 'Answer Value is not among the conflict options. Value=' + ans.Value + ' options=[' + conflictOptions.join(', ') + ']', pathBase + '.Value', ans.Question_id));
        continue;
      }
    }

    var dflt = defaultsByPath[ans.Target_path];
    if (dflt && question.Reason === 'CONFIRMATION_REQUIRED') {
      if (dflt.Value !== ans.Value) {
        issues.push(issue('ANSWER_VALUE_NOT_DEFAULT', 'VALIDATION_ERROR', 'Default confirmation answer must equal the default value. Default=' + dflt.Value + ' got ' + ans.Value, pathBase + '.Value', ans.Question_id));
        continue;
      }
    }
  }

  return issues;
}

function applyConfirmationAnswers(draft, brief, answers) {
  var stage10 = getStage10();
  var fusion = getFusion();

  var draftSnapshot = draft === null || draft === undefined ? null : JSON.stringify(draft);
  var briefSnapshot = brief === null || brief === undefined ? null : JSON.stringify(brief);
  var answersSnapshot = answers === null || answers === undefined ? null : JSON.stringify(answers);

  if (!isPlainObject(draft)) {
    return {
      Ok: false,
      Draft: null,
      Evidence: [],
      Issues: [issue('DRAFT_INVALID', 'VALIDATION_ERROR', 'Input draft must be a valid object.', '$')]
    };
  }

  if (!isPlainObject(brief)) {
    return {
      Ok: false,
      Draft: null,
      Evidence: [],
      Issues: [issue('BRIEF_INVALID', 'VALIDATION_ERROR', 'Input brief must be a valid object.', '$')]
    };
  }

  var validationIssues = validateAnswers(brief, answers);
  if (validationIssues.length > 0) {
    return {
      Ok: false,
      Draft: null,
      Evidence: [],
      Issues: validationIssues
    };
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    var clonedEmpty = clone(draft);
    return {
      Ok: true,
      Draft: clonedEmpty,
      Evidence: [],
      Issues: []
    };
  }

  var evidenceItems = [];
  for (var i = 0; i < answers.length; i += 1) {
    var ans = answers[i];
    var sourceRef = isNonEmptyString(ans.Source_ref) ? ans.Source_ref : makeEvidenceRef(ans.Target_path, ans.Value);
    evidenceItems.push(makeConfirmationEvidence(ans.Target_path, ans.Value, sourceRef));
  }

  var fusionResult = fusion.fuseEvidence(draft, evidenceItems);
  if (!fusionResult.Ok) {
    var mappedIssues = fusionResult.Issues.map(function (it) {
      var rec = {
        code: it.code,
        status: it.status,
        message: it.message,
        path: it.path,
        source_rule: it.source_rule
      };
      return rec;
    });
    return {
      Ok: false,
      Draft: null,
      Evidence: [],
      Issues: mappedIssues
    };
  }

  var finalValidation = stage10.validateDraft(fusionResult.Draft);
  if (finalValidation.length > 0) {
    return {
      Ok: false,
      Draft: null,
      Evidence: [],
      Issues: finalValidation.map(function (it) {
        return {
          code: it.code,
          status: it.status,
          message: it.message,
          path: it.path,
          source_rule: it.source_rule
        };
      })
    };
  }

  if (draftSnapshot !== null && JSON.stringify(draft) !== draftSnapshot) {
    return {
      Ok: false,
      Draft: null,
      Evidence: [],
      Issues: [issue('INPUT_MUTATED', 'VALIDATION_ERROR', 'Input draft was mutated during apply.', '$')]
    };
  }
  if (briefSnapshot !== null && JSON.stringify(brief) !== briefSnapshot) {
    return {
      Ok: false,
      Draft: null,
      Evidence: [],
      Issues: [issue('INPUT_MUTATED', 'VALIDATION_ERROR', 'Input brief was mutated during apply.', '$')]
    };
  }
  if (answersSnapshot !== null && JSON.stringify(answers) !== answersSnapshot) {
    return {
      Ok: false,
      Draft: null,
      Evidence: [],
      Issues: [issue('INPUT_MUTATED', 'VALIDATION_ERROR', 'Input answers were mutated during apply.', '$')]
    };
  }

  return {
    Ok: true,
    Draft: fusionResult.Draft,
    Evidence: evidenceItems,
    Issues: []
  };
}

module.exports = {
  buildDynamicBrief: buildDynamicBrief,
  BuildDynamicBrief: buildDynamicBrief,
  applyConfirmationAnswers: applyConfirmationAnswers,
  ApplyConfirmationAnswers: applyConfirmationAnswers,
  makeEvidenceRef: makeEvidenceRef
};