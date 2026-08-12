# Human UX Patch — Report

## Status

```text
PARTIAL — LOCAL IMPLEMENTATION IN PROGRESS
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

Pending final local and Google checkpoint results.

## Google / clasp verification

Pending clean local PASS, remote preflight, controlled push, round-trip and DEV
smoke.

## Deferred scope

Stage 7, Quote DB, physical Calculations/Offer, PDF/XLSX generator, Web App,
CURRENT_REPRICE runtime, publication automation and CI/CD not started.

## Git

- branch: `main`;
- baseline: `152b96a`;
- commits: pending;
- working tree: pending final commit;
- push: NO.
