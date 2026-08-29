// GENERATED FILE. DO NOT EDIT.
// Source: contracts/legacy-apps-script/custom-price-schema.json.
// Regenerate: python tools/generate_human_ux_manifest.py
var HUMAN_UX_MANIFEST = Object.freeze({
  "sheetName": "Custom_Price",
  "title": "Актуальный прайс",
  "description": "Рабочий прайс менеджера. После изменений выполните: AI Furniture → Обновить актуальный прайс.",
  "headerRow": 2,
  "dataStartRow": 3,
  "columns": [
    {
      "key": "category",
      "label": "Категория",
      "role": "editable",
      "width": 150,
      "validation": "category"
    },
    {
      "key": "display_name",
      "label": "Наименование",
      "role": "editable",
      "width": 260
    },
    {
      "key": "unit",
      "label": "Ед. изм.",
      "role": "editable",
      "width": 100,
      "validation": "unit"
    },
    {
      "key": "source_price",
      "label": "Цена",
      "role": "editable",
      "width": 110,
      "format": "0.00"
    },
    {
      "key": "currency",
      "label": "Валюта",
      "role": "editable",
      "width": 90,
      "validation": "currency"
    },
    {
      "key": "pricing_mode",
      "label": "Режим цены",
      "role": "editable",
      "width": 170,
      "validation": "pricingMode"
    },
    {
      "key": "manual_fx_rate",
      "label": "Курс ручной",
      "role": "editable",
      "width": 120,
      "format": "0.0000"
    },
    {
      "key": "current_fx_rate",
      "label": "Курс текущий",
      "role": "calculated",
      "width": 120,
      "format": "0.0000"
    },
    {
      "key": "current_price_rub",
      "label": "Цена в ₽",
      "role": "calculated",
      "width": 120,
      "format": "0.00"
    },
    {
      "key": "active",
      "label": "Активна",
      "role": "editable",
      "width": 90,
      "validation": "boolean"
    },
    {
      "key": "updated_at",
      "label": "Дата обновления",
      "role": "calculated",
      "width": 150,
      "format": "yyyy-mm-dd hh:mm:ss"
    },
    {
      "key": "comment",
      "label": "Комментарий",
      "role": "editable",
      "width": 260
    },
    {
      "key": "custom_price_id",
      "label": "custom_price_id",
      "role": "technical",
      "width": 160
    },
    {
      "key": "catalog_item_code",
      "label": "catalog_item_code",
      "role": "technical",
      "width": 160
    },
    {
      "key": "price_code",
      "label": "price_code",
      "role": "technical",
      "width": 160
    },
    {
      "key": "working_price_id",
      "label": "working_price_id",
      "role": "technical",
      "width": 160
    }
  ],
  "categories": {
    "ЛДСП": "MATERIAL",
    "МДФ": "MATERIAL",
    "Фасады": "MATERIAL",
    "Столешницы": "MATERIAL",
    "Кромка": "EDGE",
    "Фурнитура": "HARDWARE",
    "Работы": "WORK",
    "Доставка": "SERVICE",
    "Прочее": "SERVICE"
  },
  "units": {
    "м²": "m2",
    "пог.м": "m",
    "шт": "pcs",
    "комплект": "set",
    "проект": "project"
  },
  "currencies": [
    "RUB",
    "USD",
    "EUR",
    "CNY"
  ],
  "pricingModes": {
    "Рубли": "MANUAL_RUB",
    "По текущему курсу": "FX_AUTO",
    "По ручному курсу": "FX_MANUAL"
  },
  "fxCache": [
    {
      "currency": "USD",
      "formula": "=GOOGLEFINANCE(\"CURRENCY:USDRUB\")"
    },
    {
      "currency": "EUR",
      "formula": "=GOOGLEFINANCE(\"CURRENCY:EURRUB\")"
    },
    {
      "currency": "CNY",
      "formula": "=GOOGLEFINANCE(\"CURRENCY:CNYRUB\")"
    }
  ]
});
