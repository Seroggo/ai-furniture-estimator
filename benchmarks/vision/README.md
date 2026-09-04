# Vision Benchmark

Локальный контур для сравнения Vision-моделей на замороженной задаче V1.5. Он не подключён к Web App, Apps Script, Stage 10, Construction Core или costing.

## Подготовка

Положите файлы в следующие каталоги:

- runtime prompt: `benchmarks/vision/prompt/FURNITURE_VISION_RUNTIME_PROMPT_V1_5_FINAL.md`;
- Gold JSON: `benchmarks/vision/gold/GOLD_VISION_KITCHEN_2025-04-01_V1_5.json`;
- четыре PNG: `benchmarks/vision/images/IMG_01.png` ... `IMG_04.png`;
- модели и их точные OpenRouter IDs: `benchmarks/vision/config/models.json`.

Пятые и последующие изображения в benchmark не используются.

## PowerShell-команды

```powershell
cd C:\Project_all\ai-furniture-estimator

npm run benchmark:vision -- --dry-run
npm run benchmark:vision -- --model qwen3-vl-235b --runs 1
npm run benchmark:vision -- --all --runs 3
npm run benchmark:vision:score
```

`--dry-run` не выполняет network-вызовы и не тратит деньги. Реальный запуск требует ключа в переменной окружения:

```powershell
$env:OPENROUTER_API_KEY = "<your-key>"
```

Также можно использовать локальный `.env`; он не коммитится. Ключ никогда не выводится и не сохраняется в результатах.

## Результаты

Каждая сессия сохраняется в `benchmarks/vision/results/<session-id>/`. Итоговые JSON и Markdown-отчёты находятся в `benchmarks/vision/reports/<session-id>/`.
