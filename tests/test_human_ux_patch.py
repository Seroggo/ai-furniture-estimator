from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path

from tools.generate_human_ux_manifest import DEFAULT_OUTPUT, build_manifest, render_manifest

ROOT = Path(__file__).resolve().parents[1]
CUSTOM_PRICE_SCRIPT = ROOT / "apps-script" / "custom_price.gs"
SETUP_SCRIPT = ROOT / "apps-script" / "setup_system.gs"


class HumanUxPatchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.manifest = build_manifest()

    def test_generated_human_ux_manifest_is_current(self) -> None:
        self.assertEqual(render_manifest(self.manifest), DEFAULT_OUTPUT.read_text(encoding="utf-8"))

    def test_custom_price_has_human_first_visible_contract(self) -> None:
        self.assertEqual("Custom_Price", self.manifest["sheetName"])
        self.assertEqual("Актуальный прайс", self.manifest["title"])
        visible = [column for column in self.manifest["columns"] if column["role"] != "technical"]
        self.assertEqual(
            [
                "Категория", "Наименование", "Ед. изм.", "Цена", "Валюта",
                "Режим цены", "Курс ручной", "Курс текущий", "Цена в ₽",
                "Активна", "Дата обновления", "Комментарий",
            ],
            [column["label"] for column in visible],
        )
        self.assertEqual(4, len([column for column in self.manifest["columns"] if column["role"] == "technical"]))

    def test_human_dropdowns_and_machine_mappings_are_complete(self) -> None:
        self.assertEqual(
            {"MANUAL_RUB", "FX_AUTO", "FX_MANUAL"},
            set(self.manifest["pricingModes"].values()),
        )
        self.assertEqual({"m2", "m", "pcs", "set", "project"}, set(self.manifest["units"].values()))
        for category in ("ЛДСП", "МДФ", "Фасады", "Столешницы", "Кромка", "Фурнитура", "Работы", "Доставка", "Прочее"):
            self.assertIn(category, self.manifest["categories"])

    def _normalize(self, values: dict[str, object], *, fx_rates=None) -> dict[str, object]:
        columns = self.manifest["columns"]
        row = [values.get(column["key"], "") for column in columns]
        script = (
            "const fs=require('fs'),vm=require('vm');"
            "vm.runInThisContext(fs.readFileSync('apps-script/generated/human_ux_manifest.gs','utf8'));"
            "vm.runInThisContext(fs.readFileSync('apps-script/custom_price.gs','utf8'));"
            f"const row={json.dumps(row, ensure_ascii=False)};"
            f"const rates={json.dumps(fx_rates or {'USD': 90, 'EUR': 100, 'CNY': 12}, ensure_ascii=False)};"
            "const result=normalizeCustomPriceRow_(row,3,new Date('2026-08-12T00:00:00Z'),"
            "()=> 'CP_1234567890ABCDEF',rates);"
            "process.stdout.write(JSON.stringify(result));"
        )
        result = subprocess.run(["node", "-e", script], cwd=ROOT, text=True, capture_output=True, check=False)
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        return json.loads(result.stdout)

    def _base(self) -> dict[str, object]:
        return {
            "category": "Фурнитура",
            "display_name": "Петля",
            "unit": "шт",
            "source_price": 100,
            "currency": "RUB",
            "pricing_mode": "Рубли",
            "active": True,
            "comment": "fixture",
        }

    def test_manual_rub_normalization(self) -> None:
        item = self._normalize(self._base())
        self.assertEqual("MANUAL_RUB", item["workingPrice"]["pricing_mode"])
        self.assertEqual(100, item["workingPrice"]["current_price_rub"])
        self.assertEqual("", item["workingPrice"]["source_currency"])
        self.assertEqual("READY", item["workingPrice"]["status"])

    def test_fx_auto_uses_googlefinance_preview_only(self) -> None:
        row = self._base() | {"currency": "USD", "pricing_mode": "По текущему курсу"}
        item = self._normalize(row, fx_rates={"USD": 91.5})
        self.assertEqual("FX_AUTO", item["workingPrice"]["pricing_mode"])
        self.assertEqual("GOOGLEFINANCE", item["workingPrice"]["fx_rate_source"])
        self.assertEqual(9150, item["workingPrice"]["current_price_rub"])

    def test_fx_manual_uses_manual_rate(self) -> None:
        row = self._base() | {
            "currency": "EUR",
            "pricing_mode": "По ручному курсу",
            "manual_fx_rate": 85,
        }
        item = self._normalize(row, fx_rates={"EUR": 99})
        self.assertEqual("FX_MANUAL", item["workingPrice"]["pricing_mode"])
        self.assertEqual("MANUAL", item["workingPrice"]["fx_rate_source"])
        self.assertEqual(8500, item["workingPrice"]["current_price_rub"])

    def test_stable_identity_survives_display_name_change(self) -> None:
        first = self._normalize(self._base())
        renamed = self._base() | {
            "display_name": "Петля с доводчиком",
            "custom_price_id": first["customPriceId"],
            "catalog_item_code": first["catalogItemCode"],
            "price_code": first["priceCode"],
            "working_price_id": first["workingPriceId"],
        }
        second = self._normalize(renamed)
        self.assertEqual(first["customPriceId"], second["customPriceId"])
        self.assertEqual(first["catalogItemCode"], second["catalogItemCode"])
        self.assertEqual(first["priceCode"], second["priceCode"])
        self.assertEqual(first["workingPriceId"], second["workingPriceId"])
        self.assertNotEqual(first["catalog"]["display_name"], second["catalog"]["display_name"])

    def test_invalid_fx_row_is_rejected_before_sync(self) -> None:
        row = self._base() | {"currency": "USD", "pricing_mode": "По текущему курсу"}
        columns = self.manifest["columns"]
        values = [row.get(column["key"], "") for column in columns]
        script = (
            "const fs=require('fs'),vm=require('vm');"
            "vm.runInThisContext(fs.readFileSync('apps-script/generated/human_ux_manifest.gs','utf8'));"
            "vm.runInThisContext(fs.readFileSync('apps-script/custom_price.gs','utf8'));"
            f"try{{normalizeCustomPriceRow_({json.dumps(values, ensure_ascii=False)},3,new Date(),"
            "()=> 'CP_1234567890ABCDEF',{});process.exit(2)}catch(e){process.stdout.write(e.message)}"
        )
        result = subprocess.run(["node", "-e", script], cwd=ROOT, capture_output=True, check=False)
        self.assertEqual(0, result.returncode)
        self.assertIn("текущий курс USD ещё не получен", result.stdout.decode("utf-8"))

    def test_sync_is_explicit_idempotent_and_never_publishes_prices(self) -> None:
        source = CUSTOM_PRICE_SCRIPT.read_text(encoding="utf-8")
        self.assertIn("function syncCustomPrice()", source)
        self.assertIn("upsertObjectRow_(catalogSheet", source)
        self.assertIn("upsertObjectRow_(workingSheet", source)
        self.assertNotIn("upsertObjectRow_(spreadsheet.getSheetByName('Prices')", source)
        self.assertNotIn("function onEdit", source)
        self.assertIn("publishedRowsChanged: 0", source)

    def test_blank_google_checkbox_rows_are_ignored(self) -> None:
        script = (
            "const fs=require('fs'),vm=require('vm');"
            "vm.runInThisContext(fs.readFileSync('apps-script/custom_price.gs','utf8'));"
            "const row=Array(16).fill('');row[9]=false;"
            "process.stdout.write(String(isCustomPriceRowBlank_(row)));"
        )
        result = subprocess.run(["node", "-e", script], cwd=ROOT, text=True, capture_output=True, check=False)
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertEqual("true", result.stdout)

    def test_googlefinance_is_one_call_per_supported_currency_and_preview_only(self) -> None:
        formulas = [entry["formula"] for entry in self.manifest["fxCache"]]
        self.assertEqual(3, len(formulas))
        self.assertTrue(all(formula.count("GOOGLEFINANCE(") == 1 for formula in formulas))
        self.assertTrue(all("," not in formula and ";" not in formula for formula in formulas))
        source = CUSTOM_PRICE_SCRIPT.read_text(encoding="utf-8")
        self.assertIn("fx_rate_current", source)
        self.assertNotIn("Pricebook_Versions", source)

    def test_setup_adds_custom_price_without_replacing_technical_manifest(self) -> None:
        source = SETUP_SCRIPT.read_text(encoding="utf-8")
        self.assertIn("configureCustomPriceSheet_(sheetsByName.Custom_Price)", source)
        self.assertIn("[HUMAN_UX_MANIFEST.sheetName].concat(manifest.sheetOrder)", source)
        self.assertIn("manifest.sheets.forEach", source)
        self.assertNotIn("clearContents", source)

    def test_deferred_sheets_are_contract_only_and_not_physical(self) -> None:
        self.assertNotIn("Calculations", json.dumps(self.manifest, ensure_ascii=False))
        self.assertNotIn("Offer", json.dumps(self.manifest, ensure_ascii=False))
        source = SETUP_SCRIPT.read_text(encoding="utf-8")
        self.assertNotIn("insertSheet('Calculations'", source)
        self.assertNotIn("insertSheet('Offer'", source)

    def test_generator_check_command_passes(self) -> None:
        result = subprocess.run(
            [sys.executable, "tools/generate_human_ux_manifest.py", "--check"],
            cwd=ROOT, text=True, capture_output=True, check=False,
        )
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
