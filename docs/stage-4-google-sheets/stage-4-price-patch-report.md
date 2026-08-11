# Stage 4 — Price patch report

## Статус

```text
COMPLETE
```

## Изменение schema

- sheets before: 10;
- sheets after: 11;
- columns before: 114;
- columns after: 136;
- relations before: 7;
- relations after: 9.

Исходные 10 sheets сохранены без удаления. Добавлен только `spr_price`; ценовая
часть `Prices` расширена явным immutable provenance.

## spr_price contract

`spr_price` — mutable working/staging source текущих price inputs и human preview,
но не расчётная истина зафиксированного КП. Контракт содержит 17 колонок, включая:

```text
working_price_id (unique stable row identity)
price_code       (unique stable logical price code)
catalog_item_code -> Catalog_Items
unit
pricing_mode
source_currency / source_price
fx_rate_source / fx_rate_manual / fx_rate_current / fx_rate_used_preview
current_price_rub
status / source_ref / updated_at / notes
```

`display_name` не используется как relation key. Working rows разрешено менять
pricing manager/admin; будущий setup может управлять только определёнными preview
fields. Только полные `READY` rows допускаются к publication validation.

## Pricing modes

- `MANUAL_RUB`: обязательна ручная `current_price_rub`; FX-only inputs пусты.
- `FX_AUTO`: обязательны source currency/price и текущий working FX preview;
  manual rate не используется.
- `FX_MANUAL`: обязательны source currency/price и ручной коммерческий FX rate.

Для FX modes рабочая цена определяется как
`source_price * fx_rate_used_preview`. Mode-specific required/blank invariants
внесены в machine-readable validations и проверяются validator tests.

## Publication boundary

Формализован, но не реализован runtime workflow:

```text
spr_price mutable state
  -> validation
  -> new Pricebook_Versions row
  -> new immutable Prices rows
```

Lifecycle `DRAFT -> ACTIVE -> RETIRED`, half-open effective periods
`[effective_from, effective_to)`, отсутствие overlap и точная фиксация
`pricebook_version_id` сохранены из accepted Stage 4. Новая публикация не
перезаписывает старую версию.

## FX / GOOGLEFINANCE policy

`GOOGLEFINANCE` не реализован. Он зафиксирован только как будущий setup-managed
источник `fx_rate_current` рабочего preview. Произвольные formula strings в
master-data cells запрещены.

Официальный расчёт и КП не читают volatile FX или `spr_price` напрямую. Изменение
working preview влияет на published truth только после явной публикации snapshot.

## Immutable published price provenance

В `Prices` добавлены обязательные фиксированные поля:

```text
source_currency
source_price
fx_rate_used
fx_rate_source
price_derivation_mode
```

Вместе с существующими `unit_price`, `currency`, `price_code`,
`pricebook_version_id` и `provenance` они объясняют итоговую published цену. Для
`MANUAL_RUB` принят единообразный provenance:
`source_currency=RUB`, `source_price=unit_price`, `fx_rate_used=1`,
`fx_rate_source=NOT_APPLICABLE`.

## ORIGINAL / CURRENT_REPRICE contract

- `ORIGINAL` воспроизводит исходную стоимость из зафиксированных
  quantity/input/result snapshots и исходного `pricebook_version_id`.
- `CURRENT_REPRICE` использует тот же quantity/calculation snapshot и последнюю
  applicable `ACTIVE` опубликованную pricebook version.

`CURRENT_REPRICE` не выполняет новый layout, BOM или quantity calculation и не
читает `spr_price`/`GOOGLEFINANCE` напрямую. Preview по неопубликованным ценам
оставлен отдельной будущей функцией вне scope.

## Validation / tests

```text
python tools/validate_sheets_schema.py
-> VALID: 11 sheets, 136 columns

schema validator tests: 20 / 20 PASS
Stage 3 calculation regression: 11 / 11 PASS
Stage 3 layout regression: 18 / 18 PASS
full suite: 49 / 49 PASS
py_compile: PASS
git diff --check: PASS
source-materials diff: отсутствует
stages/02-normalization diff: отсутствует
```

Validator сохраняет все прежние structural checks и дополнительно проверяет:
точный состав 11 sheets, 17-column `spr_price`, stable keys, pricing modes,
mode-specific field contracts и обязательный published FX/source provenance.

## Совместимость с accepted Stage 4

Accepted quantity model, module recipes/expert debt, rule registry, effective
period policy, quote snapshot fields и исходные 10 sheets сохранены. Исходный
`stage-4-report.md` не переписывался. Stage 3 code, historical fixtures,
`source-materials` и accepted normalization datasets не изменялись и не повышались
до production prices.

## Ограничения / deferred implementation

В рамках patch намеренно не создавались и не реализовывались:

- реальный Google Sheet, Google API auth;
- `GOOGLEFINANCE` formulas;
- Apps Script и `setupSystem()`;
- publication workflow runtime;
- `CURRENT_REPRICE` runtime/UI;
- production price rows;
- Stage 5 и любые следующие этапы.

Блокеров корректирующего price contract нет.

## Git

- branch: `main`;
- baseline: `17000b51ef093ed956bdec5fc20f56ba191d2689`;
- context contract: `dc686c9`;
- schema/validator/tests: `3b62505`;
- report: этот финальный docs commit;
- working tree: clean после финального commit;
- push: NO.
