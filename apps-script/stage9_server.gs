/** Stage 9 manager Web App boundary. Canonical Stage 7/8 objects remain server-side. */

var STAGE9_REQUEST_VERSION = 'stage9-request-v1';
var STAGE9_VIEW_VERSION = 'web-app-view-v1';
var STAGE9_MAX_TEXT_LENGTH = 12000;
var STAGE9_MAX_IMAGE_COUNT = 3;
var STAGE9_MAX_IMAGE_BYTES = 4 * 1024 * 1024;
var STAGE9_MAX_AGGREGATE_IMAGE_BYTES = 8 * 1024 * 1024;
var STAGE9_MAX_CLIENT_REF_LENGTH = 180;
var STAGE9_SUPPORTED_IMAGE_MIMES = Object.freeze({
  'image/png': true,
  'image/jpeg': true,
  'image/webp': true
});


function doGet() {
  return HtmlService.createHtmlOutputFromFile('web_app')
    .setTitle('AI Мебельщик — предварительный расчёт')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}


/** The only Stage 9 server function callable by the browser. */
function submitStage9Project(request) {
  var startedAt = Date.now();
  var requestId = 'WEB_' + Utilities.getUuid().replace(/-/g, '').toUpperCase();
  var imageCount = stage9RequestImageCount_(request);
  var response;

  try {
    var validated = stage9ValidateRequest_(request);
    if (!validated.valid) {
      response = stage9ErrorView_(requestId, 'INPUT_ERROR', 'Проверьте исходные данные', validated.message,
        {input_code: validated.code});
      stage9LogSafe_(requestId, response, imageCount, startedAt);
      return response;
    }

    var parserResult = parseProjectInput({
      text: validated.text,
      images: validated.images.map(function (image) {
        return {
          source_ref: image.client_ref,
          mime_type: image.mime_type,
          data: image.base64
        };
      }),
      request_id: requestId
    });

    if (!parserResult || parserResult.status !== 'SUCCESS') {
      var parserCategory = parserResult && typeof parserResult.category === 'string'
        ? parserResult.category : 'UPSTREAM_ERROR';
      response = stage9ErrorView_(requestId, 'PARSER_ERROR', 'Не удалось разобрать описание',
        stage9ParserMessage_(parserCategory), {parser_category: stage9KnownParserCategory_(parserCategory)});
      stage9LogSafe_(requestId, response, imageCount, startedAt);
      return response;
    }

    var calculationResult = calculateProject(parserResult.data, {});
    response = stage9BuildResultView_(requestId, parserResult.data, calculationResult);
    stage9LogSafe_(requestId, response, imageCount, startedAt);
    return response;
  } catch (error) {
    response = stage9ErrorView_(requestId, 'SYSTEM_ERROR', 'Системная ошибка',
      'Расчёт не выполнен. Повторите попытку позже и сообщите специалисту номер запроса.', {});
    stage9LogSafe_(requestId, response, imageCount, startedAt);
    return response;
  }
}


function stage9ValidateRequest_(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    return stage9Invalid_('REQUEST_SHAPE', 'Запрос должен быть объектом.');
  }
  if (!stage9HasOnlyKeys_(request, ['request_version', 'text', 'images'])) {
    return stage9Invalid_('UNKNOWN_PROPERTY', 'Запрос содержит неизвестное поле.');
  }
  if (request.request_version !== STAGE9_REQUEST_VERSION) {
    return stage9Invalid_('REQUEST_VERSION', 'Версия запроса не поддерживается.');
  }
  if (typeof request.text !== 'string' || request.text.trim().length === 0) {
    return stage9Invalid_('TEXT_REQUIRED', 'Добавьте текстовое описание кухни.');
  }
  if (request.text.length > STAGE9_MAX_TEXT_LENGTH) {
    return stage9Invalid_('TEXT_TOO_LONG', 'Описание слишком длинное. Максимум — 12 000 символов.');
  }
  if (!Array.isArray(request.images)) {
    return stage9Invalid_('IMAGES_SHAPE', 'Список изображений имеет неверный формат.');
  }
  if (request.images.length > STAGE9_MAX_IMAGE_COUNT) {
    return stage9Invalid_('TOO_MANY_IMAGES', 'Можно приложить не более 3 изображений.');
  }

  var aggregateBytes = 0;
  var normalizedImages = [];
  for (var i = 0; i < request.images.length; i++) {
    var image = request.images[i];
    if (!image || typeof image !== 'object' || Array.isArray(image) ||
        !stage9HasOnlyKeys_(image, ['client_ref', 'mime_type', 'base64'])) {
      return stage9Invalid_('IMAGE_SHAPE', 'Изображение ' + (i + 1) + ' имеет неверный формат.');
    }
    if (typeof image.client_ref !== 'string' || image.client_ref.trim().length === 0 ||
        image.client_ref.length > STAGE9_MAX_CLIENT_REF_LENGTH) {
      return stage9Invalid_('IMAGE_REFERENCE', 'Некорректное имя изображения ' + (i + 1) + '.');
    }
    if (!STAGE9_SUPPORTED_IMAGE_MIMES[image.mime_type]) {
      return stage9Invalid_('UNSUPPORTED_MIME',
        'Поддерживаются только PNG, JPEG и WebP. Проверьте изображение ' + (i + 1) + '.');
    }
    if (typeof image.base64 !== 'string' || image.base64.length === 0 || image.base64.length % 4 !== 0) {
      return stage9Invalid_('INVALID_BASE64', 'Изображение ' + (i + 1) + ' повреждено или имеет неверный формат.');
    }
    var decodedBytes = stage9DecodedBase64Bytes_(image.base64);
    if (decodedBytes > STAGE9_MAX_IMAGE_BYTES) {
      return stage9Invalid_('IMAGE_TOO_LARGE', 'Размер одного изображения не должен превышать 4 МБ.');
    }
    if (!stage9IsValidBase64_(image.base64)) {
      return stage9Invalid_('INVALID_BASE64', 'Изображение ' + (i + 1) + ' повреждено или имеет неверный формат.');
    }
    aggregateBytes += decodedBytes;
    if (aggregateBytes > STAGE9_MAX_AGGREGATE_IMAGE_BYTES) {
      return stage9Invalid_('IMAGES_TOO_LARGE', 'Общий размер изображений не должен превышать 8 МБ.');
    }
    normalizedImages.push({
      client_ref: image.client_ref.trim(),
      mime_type: image.mime_type,
      base64: image.base64
    });
  }

  return {valid: true, text: request.text.trim(), images: normalizedImages};
}


function stage9Invalid_(code, message) {
  return {valid: false, code: code, message: message};
}


function stage9HasOnlyKeys_(value, allowed) {
  var keys = Object.keys(value);
  for (var i = 0; i < keys.length; i++) {
    if (allowed.indexOf(keys[i]) === -1) return false;
  }
  for (var j = 0; j < allowed.length; j++) {
    if (!Object.prototype.hasOwnProperty.call(value, allowed[j])) return false;
  }
  return true;
}


function stage9IsValidBase64_(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length % 4 !== 0) return false;
  var padding = value.slice(-2) === '==' ? 2 : value.slice(-1) === '=' ? 1 : 0;
  var body = padding ? value.slice(0, -padding) : value;
  if (body.indexOf('=') !== -1 || /[^A-Za-z0-9+\/]/.test(body)) return false;
  return padding === 0 || (padding === 1 && body.length % 4 === 3) || (padding === 2 && body.length % 4 === 2);
}


function stage9DecodedBase64Bytes_(value) {
  var padding = value.slice(-2) === '==' ? 2 : value.slice(-1) === '=' ? 1 : 0;
  return value.length / 4 * 3 - padding;
}


function stage9RequestImageCount_(request) {
  return request && Array.isArray(request.images) ? request.images.length : 0;
}


function stage9ErrorView_(requestId, responseKind, title, message, technicalReference) {
  return {
    view_version: STAGE9_VIEW_VERSION,
    request_id: requestId,
    response_kind: responseKind,
    display_status: 'ERROR',
    title: title,
    message: message,
    understood_summary: [],
    missing_questions: [],
    calculation_status: null,
    blockers: [],
    warnings: [],
    layout_summary: null,
    cost_summary: null,
    technical_reference: technicalReference || {}
  };
}


function stage9BuildResultView_(requestId, projectInput, calculationResult) {
  var status = calculationResult && calculationResult.status;
  var statusView = stage9CalculationStatusView_(status);
  return {
    view_version: STAGE9_VIEW_VERSION,
    request_id: requestId,
    response_kind: 'RESULT',
    display_status: statusView.display_status,
    title: statusView.title,
    message: statusView.message,
    understood_summary: stage9UnderstoodSummary_(projectInput),
    missing_questions: stage9MissingQuestions_(projectInput && projectInput.missing_questions),
    calculation_status: status,
    blockers: stage9Diagnostics_(calculationResult && calculationResult.blockers),
    warnings: stage9Diagnostics_(calculationResult && calculationResult.warnings),
    layout_summary: stage9LayoutSummary_(calculationResult && calculationResult.layout),
    cost_summary: stage9CostSummary_(calculationResult),
    technical_reference: {
      input_schema_version: stage9SafeText_(projectInput && projectInput.schema_version, 80),
      result_schema_version: stage9SafeText_(calculationResult && calculationResult.result_schema_version, 80),
      calculation_model_version: stage9SafeText_(calculationResult && calculationResult.calculation_model_version, 80)
    }
  };
}


function stage9CalculationStatusView_(status) {
  var views = {
    SUCCESS: ['CALCULATED', 'Расчёт готов', 'Детерминированный расчёт успешно выполнен.'],
    INPUT_NOT_READY: ['CLARIFICATION_REQUIRED', 'Нужно уточнение', 'Дополните описание по вопросам ниже и отправьте его заново.'],
    NOT_SUPPORTED: ['BUSINESS_BLOCKER', 'Сценарий пока не поддерживается', 'Для этого проекта автоматический расчёт пока недоступен.'],
    NO_VALID_LAYOUT: ['BUSINESS_BLOCKER', 'Не удалось подобрать компоновку', 'При указанных ограничениях допустимая компоновка не найдена.'],
    REQUIRES_EXPERT: ['BUSINESS_BLOCKER', 'Требуется эксперт', 'Компоновка определена, но для продолжения нужен подтверждённый экспертный рецепт.'],
    PRICEBOOK_NOT_AVAILABLE: ['BUSINESS_BLOCKER', 'Нет опубликованного прайса', 'Для даты расчёта нет подходящей опубликованной версии прайса.'],
    PRICE_NOT_FOUND: ['BUSINESS_BLOCKER', 'Не найдена цена', 'В опубликованном прайсе отсутствует одна или несколько требуемых цен.'],
    UNIT_MISMATCH: ['BUSINESS_BLOCKER', 'Не совпадают единицы измерения', 'Цена и рассчитанное количество используют разные единицы измерения.'],
    MASTER_DATA_INVALID: ['BUSINESS_BLOCKER', 'Нужно проверить справочники', 'Расчёт остановлен из-за противоречия в мастер-данных.']
  };
  var selected = views[status];
  if (!selected) throw new Error('Unknown Stage 8 status.');
  return {display_status: selected[0], title: selected[1], message: selected[2]};
}


function stage9UnderstoodSummary_(input) {
  var items = [];
  function addFact(label, fact, suffix) {
    if (!fact || typeof fact !== 'object' || !Object.prototype.hasOwnProperty.call(fact, 'fact_state')) return;
    var value = fact.value;
    var displayValue = value === '' || value === 0 || value === 'unknown' ? 'Не указано' : stage9SafeText_(value, 300);
    if (suffix && displayValue !== 'Не указано') displayValue += suffix;
    items.push({label: label, value: displayValue, fact_state: stage9SafeText_(fact.fact_state, 24)});
  }

  var layout = input && input.layout || {};
  addFact('Форма кухни', layout.run_shape, '');
  addFact('Длина ряда', layout.run_length_mm, ' мм');
  addFact('Зона', layout.zone, '');
  addFact('Высота стены', layout.wall_height_mm, ' мм');
  var materials = input && input.materials || {};
  addFact('Материал столешницы', materials.countertop_material, '');
  addFact('Материал фасадов', materials.facade_material, '');
  addFact('Цвет фасадов', materials.facade_color, '');
  addFact('Материал корпуса', materials.body_material, '');
  var constraints = input && input.constraints || {};
  addFact('Бюджет', constraints.budget_rub, ' ₽');
  addFact('Срок', constraints.deadline, '');

  var modules = input && input.modules && Array.isArray(input.modules.required_modules)
    ? input.modules.required_modules : [];
  for (var i = 0; i < modules.length && items.length < 30; i++) {
    var module = modules[i];
    addFact('Модуль ' + (i + 1) + ': название', module.name, '');
    addFact('Модуль ' + (i + 1) + ': тип', module.entity_type, '');
    addFact('Модуль ' + (i + 1) + ': роль', module.role_code || module.role, '');
    addFact('Модуль ' + (i + 1) + ': класс', module.module_class, '');
    addFact('Модуль ' + (i + 1) + ': ширина', module.width_mm, ' мм');
    addFact('Модуль ' + (i + 1) + ': количество', module.quantity, ' шт.');
  }
  return items.slice(0, 30);
}


function stage9MissingQuestions_(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.slice(0, 20).map(function (question) {
    return {
      question_id: stage9SafeText_(question && question.question_id, 100),
      field_path: stage9SafeText_(question && question.field_path, 180),
      priority: stage9SafeText_(question && question.priority, 24),
      question: stage9SafeText_(question && question.question, 500),
      reason: stage9SafeText_(question && question.reason, 500)
    };
  });
}


function stage9Diagnostics_(diagnostics) {
  if (!Array.isArray(diagnostics)) return [];
  return diagnostics.slice(0, 20).map(function (diagnostic) {
    var code = stage9SafeText_(diagnostic && diagnostic.code, 120);
    return {
      code: code,
      stage: stage9SafeText_(diagnostic && diagnostic.stage, 80),
      field_path: diagnostic && diagnostic.field_path !== null
        ? stage9SafeText_(diagnostic.field_path, 180) : null,
      message: stage9ManagerDiagnosticMessage_(code)
    };
  });
}


function stage9ManagerDiagnosticMessage_(code) {
  var messages = {
    REQUIRED_FACT_MISSING: 'Не хватает обязательного параметра проекта.',
    REQUIRED_FACT_UNKNOWN: 'Нужно уточнить один из обязательных параметров проекта.',
    NEEDS_CONFIRMATION: 'Нужно подтвердить один из распознанных параметров.',
    FACT_CONFLICT: 'Во входных данных обнаружены противоречащие значения.',
    UNKNOWN_ROLE_ALIAS: 'Не удалось однозначно определить тип одного из модулей.',
    UNSUPPORTED_ROLE_CODE: 'Этот тип модуля пока не поддерживается автоматическим расчётом.',
    ENTITY_ROLE_MISMATCH: 'Тип элемента не соответствует его назначению.',
    MODULE_ZONE_MISMATCH: 'Один из модулей не относится к выбранной зоне кухни.',
    INVALID_REQUIRED_MODULE: 'Проверьте размеры и количество обязательного модуля.',
    UNMAPPABLE_CONSTRAINT: 'Одно из ограничений пока нельзя применить автоматически.',
    UNSUPPORTED_GEOMETRY: 'Такая форма кухни пока не поддерживается автоматическим расчётом.',
    NO_VALID_LAYOUT: 'При указанных ограничениях допустимая компоновка не найдена.',
    APPROVED_RECIPE_REQUIRED: 'Для продолжения нужен подтверждённый экспертный рецепт.',
    PRICEBOOK_NOT_AVAILABLE: 'Для расчёта нет подходящего опубликованного прайса.',
    PRICE_NOT_FOUND: 'В опубликованном прайсе отсутствует требуемая цена.',
    UNIT_MISMATCH: 'Единица цены не совпадает с единицей рассчитанного количества.'
  };
  return messages[code] || 'Расчёт остановлен: требуется проверить исходные данные.';
}


function stage9LayoutSummary_(layout) {
  if (!layout || typeof layout !== 'object') return null;
  var items = Array.isArray(layout.items) ? layout.items : [];
  return {
    status: stage9SafeText_(layout.status, 40),
    run_length_mm: stage9NumberOrNull_(layout.run_length_mm),
    occupied_length_mm: stage9NumberOrNull_(layout.occupied_length_mm),
    remainder_mm: stage9NumberOrNull_(layout.remainder_mm),
    item_count: items.length,
    items: items.slice(0, 50).map(function (item) {
      return {
        position: stage9NumberOrNull_(item && item.position),
        role: stage9SafeText_(item && item.role, 120),
        module_class: stage9SafeText_(item && item.module_class, 80),
        width_mm: stage9NumberOrNull_(item && item.width_mm),
        required: Boolean(item && item.required)
      };
    })
  };
}


function stage9CostSummary_(result) {
  if (!result || result.status !== 'SUCCESS') return null;
  var costs = Array.isArray(result.cost_results) ? result.cost_results : [];
  return {
    total: stage9SafeText_(result.total, 80),
    currency: stage9SafeText_(result.currency, 12),
    pricebook_version_id: stage9SafeText_(result.pricebook_version_id, 180),
    item_count: costs.length,
    items: costs.slice(0, 50).map(function (cost) {
      return {
        item_id: stage9SafeText_(cost && cost.item_id, 160),
        quantity: stage9SafeText_(cost && cost.quantity, 80),
        unit: stage9SafeText_(cost && cost.unit, 24),
        unit_price: stage9SafeText_(cost && cost.unit_price, 80),
        cost: stage9SafeText_(cost && cost.cost, 80),
        currency: stage9SafeText_(cost && cost.currency, 12)
      };
    })
  };
}


function stage9SafeText_(value, maxLength) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return '';
  var text = String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  return text.length > maxLength ? text.slice(0, maxLength - 1) + '…' : text;
}


function stage9NumberOrNull_(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}


function stage9KnownParserCategory_(category) {
  var known = ['CONFIG_ERROR', 'AUTH_ERROR', 'RATE_LIMIT', 'UPSTREAM_ERROR', 'TIMEOUT',
    'PARSER_OUTPUT_INVALID', 'INPUT_INVALID'];
  return known.indexOf(category) === -1 ? 'UPSTREAM_ERROR' : category;
}


function stage9ParserMessage_(category) {
  var messages = {
    CONFIG_ERROR: 'Сервис разбора не настроен. Обратитесь к администратору.',
    AUTH_ERROR: 'Сервис разбора временно недоступен из-за ошибки доступа.',
    RATE_LIMIT: 'Сервис занят. Подождите немного и повторите попытку.',
    UPSTREAM_ERROR: 'Сервис разбора временно недоступен. Повторите попытку позже.',
    TIMEOUT: 'Сервис не успел обработать запрос. Повторите попытку.',
    PARSER_OUTPUT_INVALID: 'Описание не удалось привести к надёжной структуре. Уточните формулировку и повторите.',
    INPUT_INVALID: 'Описание или изображения не прошли проверку.'
  };
  return messages[stage9KnownParserCategory_(category)];
}


function stage9LogSafe_(requestId, response, imageCount, startedAt) {
  var modality = imageCount > 0 ? 'text+image' : 'text';
  console.log('STAGE9 request_id=' + requestId +
    ' response_kind=' + response.response_kind +
    ' display_status=' + response.display_status +
    ' calculation_status=' + (response.calculation_status || 'none') +
    ' image_count=' + imageCount +
    ' modality=' + modality +
    ' elapsed_ms=' + (Date.now() - startedAt));
}
