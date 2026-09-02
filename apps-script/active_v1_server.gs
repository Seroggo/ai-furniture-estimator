/** Active V1 Web App boundary: OpenRouter -> Stage10 -> Construction -> Costing -> Sheets V1. */

var ACTIVE_V1_REQUEST_VERSION = 'active-v1-request-v1';
var ACTIVE_V1_VIEW_VERSION = 'active-v1-view-v1';


function submitActiveV1Project(request) {
  var startedAt = Date.now();
  var requestId = request && request.request_id
    ? String(request.request_id) : 'V1_' + Utilities.getUuid().replace(/-/g, '').toUpperCase();
  try {
    var validation = activeV1ValidateRequest_(request);
    if (!validation.valid) return activeV1ErrorView_(requestId, validation.message, validation.code);
    var spreadsheet = getSheetsV1Spreadsheet_();
    var stageInput;
    var visionModel = null;

    if (request.action === 'START') {
      var images = validation.images.map(function (image) {
        return {source_ref: image.client_ref, mime_type: image.mime_type, data: image.base64};
      });
      var parsed = parseProjectInput({text: validation.text, images: images, request_id: requestId});
      if (!parsed || parsed.status !== 'SUCCESS') {
        return activeV1ErrorView_(requestId, 'Не удалось надёжно разобрать описание.', parsed && parsed.category || 'PARSER_ERROR');
      }
      var draft = activeV1ProjectInputToDraft_(parsed.data, requestId);
      stageInput = {Draft: draft, Evidence: [], Profile: ACTIVE_V1_PROFILE};
      if (images.length) {
        visionModel = getOpenRouterVisionModel_();
        stageInput.Vision = {
          Image_input: {
            source_ref: 'WEB_IMAGES_' + requestId,
            images: images,
            allowed_target_paths: activeV1DimensionPaths_(draft)
          }
        };
      }
    } else {
      stageInput = {Draft: request.draft, Evidence: [], Profile: ACTIVE_V1_PROFILE, Confirmation_answers: request.answers};
    }

    var provider = stageInput.Vision ? {
      analyze: function (imageInput) {
        var response = callOpenRouterVision(imageInput);
        if (!response || response.status !== 'SUCCESS') {
          throw new Error('Vision provider failed: ' + (response && response.category || 'UPSTREAM_ERROR'));
        }
        return response.data;
      }
    } : null;
    var sprMappings = activeV1ReadSprMappings_(spreadsheet);
    var calculationDate = new Date();
    var options = {
      ConstructionDefaults: activeV1ReadRows_(spreadsheet, 'Construction_Defaults'),
      PriceRows: activeV1ReadCustomPriceRows_(spreadsheet, sprMappings),
      CalculationContext: {
        calculation_id: requestId + '_CALC',
        timestamp: calculationDate.toISOString(),
        project_name: stageInput.Draft.project_id,
        manager: 'DEV_MANAGER',
        vision_model: visionModel || getOpenRouterVisionModel_(),
        app_version: ACTIVE_V1_RUNTIME_BUILD.slice(0, 12),
        schema_version: '1.0',
        construction_profile_version: ACTIVE_V1_PROFILE.profile_id
      },
      CostingOptions: {TargetCurrency: 'RUB'}
    };
    if (provider) options.VisionProvider = provider;

    var result = runActiveV1Pipeline({Stage10: stageInput}, options);
    var writeResult = null;
    if ((result.Status === 'COMPLETE' || result.Status === 'PARTIAL') && result.Sheets_bundle) {
      writeResult = writeActiveV1SheetsResult_(spreadsheet, result.Sheets_bundle, sprMappings, calculationDate);
    }
    var view = activeV1ResultView_(requestId, result, writeResult, visionModel);
    console.log('ACTIVE_V1 request_id=' + requestId + ' status=' + view.status +
      ' image_count=' + (validation.images ? validation.images.length : 0) +
      ' elapsed_ms=' + (Date.now() - startedAt));
    return view;
  } catch (error) {
    console.log('ACTIVE_V1 request_id=' + requestId + ' status=ERROR elapsed_ms=' + (Date.now() - startedAt));
    return activeV1ErrorView_(requestId, 'Расчёт не выполнен. Сообщите специалисту номер запроса.', 'SYSTEM_ERROR');
  }
}


function activeV1ValidateRequest_(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) return {valid: false, code: 'REQUEST_SHAPE', message: 'Запрос должен быть объектом.'};
  if (request.request_version !== ACTIVE_V1_REQUEST_VERSION) return {valid: false, code: 'REQUEST_VERSION', message: 'Версия запроса не поддерживается.'};
  if (request.action === 'START') {
    var legacy = stage9ValidateRequest_({request_version: STAGE9_REQUEST_VERSION, text: request.text, images: request.images});
    if (!legacy.valid) return legacy;
    return {valid: true, text: legacy.text, images: legacy.images};
  }
  if (request.action === 'CONFIRM') {
    if (!request.draft || typeof request.draft !== 'object' || !Array.isArray(request.answers)) {
      return {valid: false, code: 'CONFIRMATION_SHAPE', message: 'Ответы на уточнения имеют неверный формат.'};
    }
    return {valid: true, images: []};
  }
  return {valid: false, code: 'ACTION', message: 'Действие запроса не поддерживается.'};
}


function activeV1ReadRows_(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error('Missing Sheets V1 tab: ' + sheetName);
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) return [];
  var values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  var headers = values.shift().map(String);
  return values.filter(function (row) {
    return row.some(function (value) { return value !== '' && value !== null; });
  }).map(function (row) {
    var record = {};
    headers.forEach(function (header, index) { record[header] = row[index]; });
    return record;
  });
}


function activeV1ReadCustomPriceRows_(spreadsheet, mappings) {
  var customSheet = activeV1RequireSheet_(spreadsheet, 'Custom_Price');
  var customValues = activeV1ReadTable_(customSheet, 'Custom_Price', 1, 13);
  var sprMappings = mappings || activeV1ReadSprMappings_(spreadsheet);
  var rows = [];

  customValues.rows.forEach(function (row, offset) {
    var rowNumber = customValues.dataStartRow + offset;
    if (activeV1RowBlank_(row)) return;
    var categoryHuman = activeV1Text_(row[0]);
    var name = activeV1Text_(row[1]);
    var unitHuman = activeV1Text_(row[2]);
    var price = activeV1Number_(row[8]);
    var itemId = activeV1Text_(row[12]);
    var missing = [];
    if (!categoryHuman) missing.push('Категория');
    if (!name) missing.push('Наименование');
    if (!unitHuman) missing.push('Ед. изм.');
    if (price === null || price < 0) missing.push('Цена в ₽');
    if (!itemId) missing.push('Item_id');
    if (missing.length) {
      throw new Error('Custom_Price!' + rowNumber + ': missing or invalid required value(s): ' + missing.join(', '));
    }
    rows.push({
      category: activeV1SprMap_(sprMappings, 'price_category', categoryHuman, 'HUMAN_TO_MACHINE', 'Custom_Price!' + rowNumber + '!Категория'),
      name: name,
      unit: activeV1SprMap_(sprMappings, 'unit', unitHuman, 'HUMAN_TO_MACHINE', 'Custom_Price!' + rowNumber + '!Ед. изм.'),
      price: price,
      currency: 'RUB',
      vendor: null,
      article: null,
      active: true,
      notes: activeV1Text_(row[11]) || null,
      updated_at: row[10] || null,
      item_id: itemId
    });
  });
  return rows;
}


function activeV1ReadSprMappings_(spreadsheet) {
  var sprSheet = activeV1RequireSheet_(spreadsheet, 'spr');
  var sprValues = activeV1ReadTable_(sprSheet, 'spr', 1, 5);
  return activeV1BuildSprMappings_(sprValues.rows);
}


function activeV1RequireSheet_(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error('Missing Active V1 tab: ' + sheetName);
  return sheet;
}


function activeV1ReadTable_(sheet, sheetName, headerRow, width) {
  var lastRow = sheet.getLastRow();
  var actualHeaders = sheet.getRange(headerRow, 1, 1, width).getDisplayValues()[0];
  var expected = sheetName === 'Custom_Price'
    ? ['Категория', 'Наименование', 'Ед. изм.', 'Цена', 'Валюта', 'Режим цены', 'Курс ручной', 'Курс текущий', 'Цена в ₽', 'По умолчанию', 'Дата обновления', 'Комментарий', 'item_id']
    : ['type', 'human_value', 'machine_value', 'direction', 'comment'];
  if (JSON.stringify(actualHeaders) !== JSON.stringify(expected)) {
    throw new Error('Incompatible headers in ' + sheetName + ': expected ' + expected.join('|') + ', got ' + actualHeaders.join('|'));
  }
  return {
    dataStartRow: headerRow + 1,
    rows: lastRow > headerRow ? sheet.getRange(headerRow + 1, 1, lastRow - headerRow, width).getValues() : []
  };
}


function activeV1BuildSprMappings_(rows) {
  var mappings = {};
  rows.forEach(function (row, offset) {
    if (activeV1RowBlank_(row)) return;
    var type = activeV1Text_(row[0]);
    var human = activeV1Text_(row[1]);
    var machine = activeV1Text_(row[2]);
    var direction = activeV1Text_(row[3]).toUpperCase();
    var rowNumber = offset + 2;
    if (!type || !human || !machine) {
      throw new Error('spr!' + rowNumber + ': type, human_value, and machine_value are required.');
    }
    if (['HUMAN_TO_MACHINE', 'MACHINE_TO_HUMAN', 'BOTH'].indexOf(direction) === -1) {
      throw new Error('spr!' + rowNumber + ': unsupported direction ' + JSON.stringify(direction) + '.');
    }
    if (direction === 'HUMAN_TO_MACHINE' || direction === 'BOTH') {
      activeV1AddSprMapping_(mappings, type, 'HUMAN_TO_MACHINE', human, machine, rowNumber);
    }
    if (direction === 'MACHINE_TO_HUMAN' || direction === 'BOTH') {
      activeV1AddSprMapping_(mappings, type, 'MACHINE_TO_HUMAN', machine, human, rowNumber);
    }
  });
  return mappings;
}


function activeV1AddSprMapping_(mappings, type, direction, key, value, rowNumber) {
  var mappingKey = type + '\\u0000' + direction + '\\u0000' + key;
  if (mappings[mappingKey] && mappings[mappingKey].value !== value) {
    throw new Error('spr!' + rowNumber + ': ambiguous mapping for type=' + type + ', direction=' + direction + ', value=' + JSON.stringify(key) + '.');
  }
  mappings[mappingKey] = {value: value, row: rowNumber};
}


function activeV1SprMap_(mappings, type, value, direction, source) {
  var key = type + '\\u0000' + direction + '\\u0000' + value;
  if (!mappings[key]) {
    throw new Error(source + ': missing spr mapping for type=' + type + ', direction=' + direction + ', value=' + JSON.stringify(value) + '.');
  }
  return mappings[key].value;
}


function activeV1RowBlank_(row) {
  return row.every(function (value) { return value === '' || value === null || value === false; });
}


function activeV1Text_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}


function activeV1Number_(value) {
  if (value === '' || value === null || value === undefined || typeof value === 'boolean') return null;
  var number = Number(value);
  return isFinite(number) ? number : null;
}


function activeV1FactValue_(fact, fallback) {
  return fact && fact.fact_state === 'KNOWN' ? fact.value : fallback;
}


function activeV1DimensionCell_(fact) {
  if (fact && fact.fact_state === 'KNOWN' && typeof fact.value === 'number' && fact.value > 0) {
    var evidence = fact.evidence || {};
    return {
      state: 'KNOWN',
      value: fact.value,
      source_ref: evidence.source_ref || 'WEB_TEXT',
      source_type: evidence.source_type === 'IMAGE' ? 'IMAGE_TEXT' : 'USER_TEXT',
      evidence_state: 'EXPLICIT',
      note: evidence.evidence_note || 'Explicit manager input parsed by OpenRouter.'
    };
  }
  if (fact && fact.fact_state === 'INFERRED' && typeof fact.value === 'number' && fact.value > 0) {
    return {
      state: 'NEEDS_CONFIRMATION',
      value: fact.value,
      source_ref: fact.evidence && fact.evidence.source_ref || 'PARSER_INFERENCE',
      source_type: 'DEFAULT_CANDIDATE',
      evidence_state: 'VISUAL_INFERRED',
      note: fact.evidence && fact.evidence.evidence_note || 'Parser inference requires manager confirmation.'
    };
  }
  return {state: 'MISSING'};
}


function activeV1ProjectInputToDraft_(input, requestId) {
  var layout = input.layout || {};
  var required = input.modules && Array.isArray(input.modules.required_modules)
    ? input.modules.required_modules : [];
  var moduleSpecs = required.length ? required : [{
    module_class: {value: activeV1FactValue_(layout.zone, 'base'), fact_state: 'KNOWN'},
    role_code: {value: 'generic_storage', fact_state: 'KNOWN'},
    width_mm: layout.run_length_mm,
    quantity: {value: 1, fact_state: 'KNOWN'}
  }];
  var modules = [];
  var x = 0;
  moduleSpecs.forEach(function (spec, specIndex) {
    var quantity = Number(activeV1FactValue_(spec.quantity, 1)) || 1;
    for (var count = 0; count < quantity; count++) {
      var roleCode = activeV1FactValue_(spec.role_code || spec.role, 'generic_storage');
      var classCode = activeV1FactValue_(spec.module_class, activeV1FactValue_(layout.zone, 'base'));
      var mapping = activeV1ModuleMapping_(roleCode, classCode);
      var widthCell = activeV1DimensionCell_(spec.width_mm);
      var width = widthCell.value || 0;
      modules.push({
        id: 'WEB_MOD_' + String(specIndex + 1) + '_' + String(count + 1),
        module_type: mapping.module_type,
        role: mapping.role,
        x_mm: x,
        y_mm: 0,
        quantity: 1,
        dimensions: {width_mm: widthCell, height_mm: {state: 'MISSING'}, depth_mm: {state: 'MISSING'}},
        fronts: mapping.fronts,
        appliance_slots: mapping.appliance_slots,
        notes: ['Adapted from project-input-v2 role ' + roleCode + '.']
      });
      x += width;
    }
  });
  var runWidth = activeV1FactValue_(layout.run_length_mm, null);
  return {
    schema_version: 'draft-configuration-v1',
    project_id: 'web-' + String(requestId).toLowerCase(),
    construction_profile_id: ACTIVE_V1_PROFILE.profile_id,
    source_refs: [{id: 'WEB_TEXT', type: 'NOTE', file: 'web-request', note: 'Manager request parsed by OpenRouter.'}],
    global_dimensions: {},
    assemblies: [{
      id: 'WEB_ASSEMBLY_1',
      kind: activeV1FactValue_(layout.run_shape, 'straight') === 'straight' ? 'LINEAR_RUN' : 'OTHER',
      overall_width_mm: typeof runWidth === 'number' && runWidth > 0 ? runWidth : undefined,
      modules: modules,
      openings: [],
      non_carcass_surfaces: [],
      notes: ['Active V1 Web adapter.']
    }]
  };
}


function activeV1ModuleMapping_(roleCode, classCode) {
  var moduleType = classCode === 'wall' ? 'WALL_CABINET' : classCode === 'tall' ? 'TALL_CABINET' : 'BASE_CABINET';
  var role = 'GENERAL_STORAGE';
  var fronts = [{kind: 'HINGED_DOOR', count: 1, evidence_state: 'EXPLICIT'}];
  var slots = [];
  if (roleCode === 'drawer') {
    role = 'DRAWER_CABINET';
    fronts = [{kind: 'DRAWER_FRONT', count: 1, evidence_state: 'EXPLICIT'}];
  } else if (roleCode === 'sink') {
    role = 'SINK_BASE';
  } else if (roleCode === 'dishwasher_slot') {
    moduleType = 'APPLIANCE_SLOT'; role = 'DISHWASHER_SLOT'; fronts = []; slots = [{type: 'DISHWASHER'}];
  } else if (roleCode === 'fridge') {
    moduleType = 'APPLIANCE_SLOT'; role = 'REFRIGERATOR_HOUSING'; fronts = []; slots = [{type: 'REFRIGERATOR'}];
  } else if (roleCode === 'oven' || roleCode === 'hob' || roleCode === 'hood') {
    role = 'APPLIANCE_TOWER'; slots = [{type: roleCode === 'oven' ? 'OVEN' : 'OTHER'}];
  } else if (roleCode === 'dish_dryer') {
    moduleType = 'WALL_CABINET'; role = 'WALL_STORAGE';
  } else if (roleCode === 'pantry') {
    moduleType = 'TALL_CABINET';
  }
  return {module_type: moduleType, role: role, fronts: fronts, appliance_slots: slots};
}


function activeV1DimensionPaths_(draft) {
  var paths = [];
  draft.assemblies.forEach(function (assembly, assemblyIndex) {
    assembly.modules.forEach(function (module, moduleIndex) {
      ['width_mm', 'height_mm', 'depth_mm'].forEach(function (field) {
        paths.push('assemblies[' + assemblyIndex + '].modules[' + moduleIndex + '].dimensions.' + field);
      });
    });
  });
  return paths;
}


function activeV1ResultView_(requestId, result, writeResult, visionModel) {
  var clarification = result.Stage10 && result.Stage10.Brief || {};
  var draft = result.Stage10 && result.Stage10.Draft || null;
  var understoodSummary = draft ? activeV1KnownFacts_(draft) : [];
  var questions = Array.isArray(clarification.Questions) ? clarification.Questions.map(function (question) {
    var options = Array.isArray(question.Options) ? question.Options : [];
    var targetPath = question.Target_path;
    var reason = question.Reason;
    var isCandidate = reason === 'CONFIRMATION_REQUIRED' && options.length > 0;
    return {
      question_id: question.Question_id,
      target_path: targetPath,
      reason: reason,
      options: options,
      default_value: options.length ? options[0] : question.Default_value,
      human_label: activeV1HumanLabel_(targetPath),
      value_kind: isCandidate ? 'CANDIDATE' : 'USER_INPUT'
    };
  }) : [];
  var costing = result.Costing || {};
  var totals = costing.Totals || {};
  return {
    view_version: ACTIVE_V1_VIEW_VERSION,
    request_id: requestId,
    response_kind: result.Status === 'NEEDS_CLARIFICATION' ? 'CLARIFICATION' : 'RESULT',
    status: result.Status,
    title: result.Status === 'NEEDS_CLARIFICATION' ? 'Нужно уточнение' :
      result.Status === 'COMPLETE' ? 'Расчёт готов' : 'Расчёт частично готов',
    message: result.Status === 'NEEDS_CLARIFICATION'
      ? 'Подтвердите предложенные значения или введите свои.'
      : 'Active V1 выполнил Construction Core и Costing.',
    questions: questions,
    default_candidates: clarification.Defaults_to_confirm || [],
    understood_summary: understoodSummary,
    state: result.Status === 'NEEDS_CLARIFICATION' ? {draft: result.Stage10.Draft} : null,
    summary: {
      grand_total: totals.Grand_total === undefined ? null : totals.Grand_total,
      currency: costing.Currency || 'RUB',
      bom_rows: result.Sheets_bundle && result.Sheets_bundle.BOM_LAST ? result.Sheets_bundle.BOM_LAST.length : 0,
      unresolved_rows: Array.isArray(costing.Unresolved_lines) ? costing.Unresolved_lines.length : 0
    },
    technical_reference: {
      runtime_build: ACTIVE_V1_RUNTIME_BUILD.slice(0, 12),
      vision_model: visionModel || getOpenRouterVisionModel_(),
      sheets_write: writeResult ? writeResult.status : 'SKIPPED'
    }
  };
}


function activeV1ErrorView_(requestId, message, code) {
  return {
    view_version: ACTIVE_V1_VIEW_VERSION,
    request_id: requestId,
    response_kind: 'ERROR',
    status: 'ERROR',
    title: 'Ошибка',
    message: message,
    questions: [],
    default_candidates: [],
    understood_summary: [],
    state: null,
    summary: null,
    technical_reference: {error_code: String(code || 'SYSTEM_ERROR')}
  };
}


/** Deterministic human-readable label for a Stage 10 target path.
 *  Machine path is never rewritten here — it is returned separately to the runtime
 *  for Stage 10 confirmation. Add new mappings only; do not change Stage 10 contract. */
function activeV1HumanLabel_(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') return '';
  var match = /^assemblies\[(\d+)\]\.modules\[(\d+)\]\.dimensions\.(width_mm|height_mm|depth_mm)$/.exec(targetPath);
  if (match) {
    var moduleNumber = Number(match[2]) + 1;
    var field = match[3];
    var fieldLabel = field === 'width_mm' ? 'Ширина модуля'
      : field === 'height_mm' ? 'Высота модуля'
      : 'Глубина модуля';
    return fieldLabel + ' ' + moduleNumber + ', мм';
  }
  if (targetPath === 'layout.run_length_mm') return 'Длина стены, мм';
  if (targetPath === 'layout.run_shape') return 'Форма кухни';
  if (targetPath === 'layout.zone') return 'Зона (нижние/верхние/пенал)';
  return '';
}


/** Build a list of facts that the system already understood from the current Draft.
 *  Only KNOWN values from fields Stage 10 / Construction Core already populated are used.
 *  No new inference is performed here — if a field is not yet known, it is omitted. */
function activeV1KnownFacts_(draft) {
  var facts = [];
  function pushFact(label, value, factState) {
    if (value === null || value === undefined || value === '') return;
    facts.push({label: label, value: String(value), fact_state: factState || 'KNOWN'});
  }
  if (!draft) return facts;
  var layout = draft.layout_summary || draft.layout || null;
  if (layout) {
    if (layout.run_length_mm !== undefined && layout.run_length_mm !== null) {
      pushFact('Длина стены', layout.run_length_mm + ' мм');
    }
    if (layout.run_shape) {
      var shapeLabel = layout.run_shape === 'straight' ? 'прямая'
        : layout.run_shape === 'l_shape' ? 'Г-образная'
        : layout.run_shape === 'u_shape' ? 'П-образная'
        : layout.run_shape;
      pushFact('Форма кухни', shapeLabel);
    }
    if (layout.zone) {
      var zoneLabel = layout.zone === 'base' ? 'нижние'
        : layout.zone === 'wall' ? 'верхние'
        : layout.zone === 'tall' ? 'пенал'
        : layout.zone;
      pushFact('Зона', zoneLabel);
    }
  }
  var modules = Array.isArray(draft.assemblies) && draft.assemblies[0] && Array.isArray(draft.assemblies[0].modules)
    ? draft.assemblies[0].modules : [];
  modules.forEach(function (module, moduleIndex) {
    var number = moduleIndex + 1;
    var dims = module && module.dimensions || {};
    if (dims.width_mm && dims.width_mm.state === 'KNOWN' && dims.width_mm.value) {
      pushFact('Ширина модуля ' + number, dims.width_mm.value + ' мм');
    }
    var role = module && (module.role || module.module_type);
    if (role) {
      var roleLabel = role === 'BASE_CABINET' ? 'нижний шкаф'
        : role === 'WALL_CABINET' ? 'верхний шкаф'
        : role === 'TALL_CABINET' ? 'пенал'
        : role === 'APPLIANCE_SLOT' ? 'техника'
        : role === 'APPLIANCE_TOWER' ? 'колонна с техникой'
        : role === 'GENERAL_STORAGE' ? 'универсальный шкаф'
        : role === 'DRAWER_CABINET' ? 'ящики'
        : role === 'SINK_BASE' ? 'мойка'
        : role;
      pushFact('Тип модуля ' + number, roleLabel);
    }
  });
  if (draft.project_id) {
    pushFact('ID проекта', draft.project_id);
  }
  return facts;
}


/** Safe deployment smoke helpers for clasp run / Apps Script API execution. */
function activeV1DeploymentInfo() {
  var spreadsheet = getSheetsV1Spreadsheet_();
  var properties = PropertiesService.getScriptProperties();
  return {
    runtime_build: ACTIVE_V1_RUNTIME_BUILD,
    vision_model: getOpenRouterVisionModel_(),
    api_key_configured: !!properties.getProperty('OPENROUTER_API_KEY'),
    spreadsheet_id: spreadsheet.getId(),
    sheets: spreadsheet.getSheets().map(function (sheet) { return sheet.getName(); })
  };
}


function activeV1VisionSmoke() {
  var png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  var result = callOpenRouterVision({
    source_ref: 'VISION_SMOKE_PNG',
    images: [{source_ref: 'VISION_SMOKE_PNG', mime_type: 'image/png', data: png}],
    allowed_target_paths: ['assemblies[0].modules[0].dimensions.width_mm']
  }, {maxRetries: 0});
  return {
    status: result.status,
    http_status: result.httpStatus || null,
    normalized: result.status === 'SUCCESS' && result.data && Array.isArray(result.data.visible_dimensions),
    model: result.modelRequested || null,
    category: result.category || null
  };
}
