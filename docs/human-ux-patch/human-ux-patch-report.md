# Human UX Patch — Report

## Status

```text
COMPLETE
```

## Problem

Accepted Stage 4–6 baseline machine-oriented и не предоставляет менеджеру
понятный рабочий интерфейс актуальных цен.

## Human vs machine model

Добавляется upstream `Custom_Price`, не меняющий 11-sheet / 136-column technical
contract. `Calculations` и `Offer` зафиксированы только как Stage 10 UX contracts.

## Custom_Price UX

Физический лист с русским title, 12 human-visible fields, dropdowns, formats,
filter, frozen rows, editable/calculated colors и hidden technical identity.

## Custom_Price → spr_price adapter

Explicit `syncCustomPrice()` валидирует human rows и idempotently upsert-ит
managed `Catalog_Items` / `spr_price`. Invalid input блокирует sync; missing rows
деактивируются. Immutable `Prices` не изменяются.

## Pricing / FX / GOOGLEFINANCE

Поддержаны `MANUAL_RUB`, `FX_AUTO`, `FX_MANUAL`. Hidden cache делает по одному
locale-neutral `GOOGLEFINANCE` call для USD/EUR/CNY; это working preview only.

## Stable IDs

`custom_price_id`, `catalog_item_code`, `price_code`, `working_price_id`
генерируются системой, скрыты и сохраняются при rename.

## setupSystem changes

Human UX manifest генерируется из `custom-price-schema.json`. `setupSystem()`
добавляет/восстанавливает `Custom_Price`, не очищая user rows. Stage 5 safety
guards и technical manifest сохраняются.

## Calculations deferred contract

Сквозной `calculation_no`, отдельные `project_id`/`quote_id`, human search/display
по номеру, адресу и клиенту. Физический sheet не создаётся.

## Offer deferred contract

Selector расчёта и ORIGINAL/CURRENT_REPRICE display contract. Физический sheet и
export runtime не создаются.

## Tests

- Stage 6 Node checks: `9/9 PASS`;
- Stage 5/4/3 plus Human UX Python regressions: `74/74 PASS`;
- technical schema manifest: `CURRENT`;
- Human UX manifest: `CURRENT`;
- Apps Script syntax checks: `PASS`;
- Python compile: `PASS`;
- `git diff --check`: `PASS`.

The live zero-row smoke exposed and then closed one Google-specific regression:
blank checkbox cells are returned as `false`. `isCustomPriceRowBlank_()` now
treats that value as blank, with a dedicated regression test.

## Google / clasp verification

- existing bound Script ID suffix: `...HvYv52`, auth/status `PASS`;
- fresh preflight snapshot before each remote write: `PASS`;
- initial remote state: 3 expected Stage 6 files, unknown files `0`;
- final preflight: only `custom_price.gs` differed, push scope exactly 5 files;
- controlled clasp pushes: `PASS`, no `--force`;
- final round trip: all 5 files `SAME`, unknown remote files `0`;
- DEV workbook: `AI Furniture Calculation Base — DEV`, locale `ru_RU`;
- final `setupSystem()` smoke: `PASS` (`12:24:13–12:24:42`);
- repeated setup idempotency smoke: `PASS`;
- empty `syncCustomPrice()` smoke: `PASS` (`12:24:59–12:25:02`);
- physical sheets: `Custom_Price` + 11 canonical technical sheets = 12;
- `Custom_Price`: first sheet, 2 frozen rows, 12 visible human fields,
  dropdowns/checkboxes/formats/filter and hidden technical/FX fields verified;
- working FX cache: USD/EUR/CNY formulas evaluated successfully under `ru_RU`;
- `Catalog_Items` and `spr_price`: no production rows auto-created;
- `Prices` / `Pricebook_Versions`: no publication performed;
- physical `Calculations` / `Offer`: absent as required.

## Deferred scope

Stage 7, Quote DB, physical Calculations/Offer, PDF/XLSX generator, Web App,
CURRENT_REPRICE runtime, publication automation and CI/CD not started.

## Git

- branch: `main`;
- baseline: `152b96a`;
- commits: `8e8719b`, `9717843`, `7073644`, `749dd1d`, plus final report commit;
- working tree: clean after final report commit;
- push: NO.
