# Offer UX contract — deferred to Stage 10

`Offer` — будущая human-facing витрина одного выбранного коммерческого
предложения. Этот patch не создаёт физический sheet, formulas, PDF/XLSX runtime
или Quote DB.

## Selector UX

```text
Расчёт:
[ 000127 | Ленина, 25 | Иванов ▼ ]

Режим цены:
[ На момент расчёта ▼ ]
[ На сейчас         ]
```

Machine mapping:

```text
На момент расчёта → ORIGINAL
На сейчас         → CURRENT_REPRICE
```

## Semantics

`ORIGINAL` показывает сохранённый result snapshot и исходный
`pricebook_version_id`.

`CURRENT_REPRICE` означает только:

```text
тот же quantity/calculation snapshot
+ latest applicable ACTIVE pricebook
```

Он не запускает новый layout, BOM или quantity calculation и не читает
`Custom_Price`, `spr_price` или `GOOGLEFINANCE` напрямую.

## Layout policy

Будущий sheet должен быть print/export-friendly:

- compact project/client header;
- clear line-item table;
- totals and price mode visible;
- stable print area and page breaks;
- пригодность для стандартного `Файл → Скачать → PDF/XLSX`.

Реальная export implementation, CRM workflow и storage остаются Stage 10+.
