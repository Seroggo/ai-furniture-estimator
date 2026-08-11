# Stage 5 — ручной Google checkpoint

Цель: выполнить уже проверенный локально `setupSystem()` в dedicated DEV workbook:

```text
https://docs.google.com/spreadsheets/d/1begIbLngVMshpAmnn142TozbHWgIAD-QBvKX6y8NNvs/edit
```

До запуска через Google Sheets API подтверждено:

```text
title: AI Furniture Calculation Base — DEV
sheets: один Лист1
Лист1!A1:Z10: пусто
```

## Запуск

1. Открыть workbook под Google-аккаунтом с правом редактирования.
2. Выбрать `Расширения -> Apps Script`.
3. Создать два script-файла и скопировать их без изменений:
   - `schema_manifest.gs` из `apps-script/generated/schema_manifest.gs`;
   - `setup_system.gs` из `apps-script/setup_system.gs`.
4. Сохранить Apps Script project.
5. Выбрать функцию `setupSystem` и нажать `Выполнить`.
6. При первом запуске подтвердить только стандартные разрешения на изменение
   текущей Google-таблицы. Не вводить credentials или tokens в repository files.
7. Убедиться, что execution завершился без ошибки.
8. Снова выбрать `setupSystem` и выполнить второй раз.
9. Убедиться, что второй execution завершился без ошибки.
10. Не добавлять вручную recipe, catalog, working price или published price rows.

## Что сообщить Codex

Сообщить только:

```text
setupSystem first run: PASS
setupSystem second run: PASS
```

После этого Codex должен через авторизованный Google Sheets connector проверить:

- ровно 11 canonical sheets в принятом порядке;
- ровно 136 headers и их точный порядок;
- frozen header rows, formats и validations;
- `Schema_Meta` bootstrap record;
- только допустимые `Reference_Values` enum seeds;
- `MODULE_TO_PARTS_V1 = REQUIRES_EXPERT`;
- пустые production recipe/catalog/working-price/pricebook rows;
- отсутствие duplicate sheets, duplicate headers и data loss после второго запуска;
- создать финальный Google verification artifact и обновить Stage 5 report.

