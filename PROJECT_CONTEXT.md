# AI Мебельщик — PROJECT_CONTEXT

## 1. Назначение

AI Мебельщик — MVP-система предварительного расчёта кухонной мебели.

Единственная категория MVP:

```text
Кухни
```

Базовый принцип:

```text
LLM понимает и структурирует вход.
Детерминированный код проверяет, конфигурирует и рассчитывает.
Google Sheets хранит master data, рабочие цены и результаты.
```

LLM:

- не является источником цен;
- не рассчитывает итоговую стоимость;
- не изобретает production module recipes;
- не заменяет deterministic validation/calculation.

---

## 2. Канонический план

```text
0. Репозиторий и Wiki
1. Аудит исходных файлов
2. Нормализация эталонов
3. Расчётная модель
4. Схема Google Sheets
5. setupSystem()
6. Apps Script baseline + clasp
Human UX Patch
7. OpenRouter parser
8. Расчётное ядро
9. Web App
10. База КП и персональный дашборд
11. PDF
12. Технический E2E
13. Backtest ±10%
14. Ограниченный пилот
```

Human UX Patch — accepted corrective baseline между Stage 6 и Stage 7, а не отдельная
новая продуктовая фаза.

---

## 3. Статус

```text
Stage 0 — ACCEPTED
Stage 1 — ACCEPTED
Stage 2 — ACCEPTED WITH DEBT
Stage 3 — ACCEPTED / CLOSED
Stage 4 — ACCEPTED / CLOSED
Stage 4 Price Patch — ACCEPTED / CLOSED
Stage 5 — ACCEPTED / CLOSED
Stage 6 — ACCEPTED / CLOSED
Human UX Patch — ACCEPTED / CLOSED

Текущий этап — Stage 7
```

Git baseline после Human UX Patch:

```text
branch: main
HEAD: fb9b9e0
working tree: clean
Git push: NO
```

Перед любой работой проверить фактический HEAD и working tree.

---

## 4. Accepted calculation baseline

### Layout

```text
calculation_model/layout_configurator.py
tests/test_layout_configurator.py
```

Принципы:

```text
hard constraints > optimisation
A/B/C → automatic generic candidates
D → specialized / explicit only
E → not automatic
filler → separate entity
NO_VALID_LAYOUT → explicit
arbitrary custom widths → forbidden
L/U/corners → NOT_SUPPORTED without system profile
```

`STUDIO_STANDARD` не доказан.

### Quantity / cost

```text
calculation_model/calculation_engine.py
tests/test_calculation_engine.py
```

Принцип:

```text
quantity model × published pricebook = cost
```

Historical prices — только fixtures/evidence.

Открытый expert debt:

```text
MODULE_TO_PARTS_V1 = REQUIRES_EXPERT
Basis alternative selection = REQUIRES_EXPERT
order coefficients / rounding = REQUIRES_EXPERT
hidden Medvedev logic = REQUIRES_EXPERT / NOT_SUPPORTED
legacy J2/K2 semantics = REQUIRES_EXPERT
```

Synthetic BOM запрещён.

---

## 5. Google Sheets baseline

Accepted technical contract:

```text
11 technical sheets
136 technical columns
9 relations
```

Technical sheets:

```text
Schema_Meta
System_Config
Module_Size_Rules
Module_Recipes
Module_Recipe_Items
Catalog_Items
spr_price
Pricebook_Versions
Prices
Calculation_Rules
Reference_Values
```

Source of truth:

```text
docs/stage-4-google-sheets/sheets-columns.csv
docs/stage-4-google-sheets/sheets-relations.csv
```

Physical DEV workbook после Human UX Patch:

```text
12 sheets total
= Custom_Price + 11 technical sheets
```

---

## 6. Accepted Human UX baseline

Human-facing сейчас:

```text
Custom_Price → Актуальный прайс
```

Future Stage 10 contracts:

```text
Calculations → Реестр расчётов
Offer        → Коммерческое предложение
```

`Calculations` и `Offer` физически сейчас не существуют.

Pricing flow:

```text
Custom_Price
        ↓ explicit syncCustomPrice()
Catalog_Items + spr_price
        ↓ future explicit publication
Pricebook_Versions + Prices
        ↓
official calculation / quote
```

`Custom_Price` не публикует immutable prices автоматически.

Accepted pricing modes:

```text
MANUAL_RUB
FX_AUTO
FX_MANUAL
```

`GOOGLEFINANCE`:

```text
working preview only
```

Official calculation, ORIGINAL и CURRENT_REPRICE не читают volatile FX cache.

Accepted UX docs:

```text
docs/human-ux-patch/human-ux-contract.md
docs/human-ux-patch/calculations-ux-contract.md
docs/human-ux-patch/offer-ux-contract.md
docs/human-ux-patch/human-ux-patch-report.md
```

---

## 7. Apps Script / clasp baseline

Local Git repository = canonical Apps Script source.

```text
apps-script/
├── appsscript.json
├── setup_system.gs
├── custom_price.gs
├── generated/
│   ├── schema_manifest.gs
│   └── [Human UX generated manifest]
└── [Stage 7 files will be added here]
```

Фактические имена generated Human UX files проверить в repo; не создавать duplicate
только из-за примера выше.

Target:

```text
existing bound DEV Apps Script project
→ AI Furniture Calculation Base — DEV
```

Clasp:

```text
@google/clasp 3.3.0 pinned
```

Remote workflow:

```text
local changes
→ tests
→ clean preflight
→ isolated remote snapshot/diff
→ controlled clasp push
→ round-trip verification
```

Новый Apps Script project не создавать.

Secrets / `.clasp.json` / `.clasprc.json` не коммитить.

---

## 8. Stage 7 — OpenRouter parser

Stage 7 создаёт слой понимания пользовательского входа:

```text
text
+ optional images / sketches / renders
        ↓
OpenRouter
        ↓
strict structured parser output
        ↓
deterministic local validation
        ↓
Project Input JSON
```

Это parser, а не calculation engine.

Stage 7 должен уметь:

- принять свободный русский текст;
- принять optional image input;
- извлечь только явно поддерживаемые project facts;
- отличить explicit fact от inference;
- сохранить неизвестное как unknown/missing;
- вернуть список вопросов/нехватающих данных;
- вернуть structured Project Input JSON;
- записать parser metadata/provenance для воспроизводимости;
- не рассчитывать цену;
- не создавать layout;
- не создавать BOM;
- не публиковать pricebook.

Detailed contract:

```text
docs/stage-7-openrouter-parser/stage-7-context.md
```

---

## 9. OpenRouter integration boundary

OpenRouter используется через стандартный HTTP API из Apps Script.

Security:

```text
OPENROUTER_API_KEY
→ Script Properties / secure runtime property
→ NEVER Google Sheet
→ NEVER Git
→ NEVER logs
```

Model slug — operational config, не secret.

Parser result должен фиксировать:

```text
provider = openrouter
model_requested
model_returned, если доступно
parser_schema_version
prompt_version
parsed_at
```

Выбор модели не должен быть зашит в business schema как вечный стандарт.

---

## 10. Project Input principle

Project Input JSON — контракт между probabilistic parser и deterministic Stage 8.

Главный принцип:

```text
LLM may interpret
but deterministic code decides whether data is usable
```

Parser не должен silently default неизвестные бизнес-параметры.

Допустимые состояния должны позволять выразить:

```text
KNOWN
INFERRED
UNKNOWN
CONFLICT
NOT_APPLICABLE
```

или эквивалентный компактный contract.

Каждое существенное inferred значение должно быть явно отмечено и не превращаться
в hard calculation input без validation/confirmation policy.

---

## 11. Контекстная иерархия

```text
AI_FURNITURE_EXECUTION.md
→ HOW Codex works

PROJECT_CONTEXT.md
→ accepted baseline

stage-X-context.md
→ current task contract

accepted reports/docs
→ factual outcomes

code / JSON schema / CSV / tests
→ canonical technical source
```

Режим по умолчанию:

```text
NORMAL
```

Git push не выполнять без отдельного разрешения.
