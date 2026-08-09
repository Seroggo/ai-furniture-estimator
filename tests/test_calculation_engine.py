from __future__ import annotations

import csv
import json
import unittest
from decimal import Decimal
from pathlib import Path

from calculation_model import (
    RULE_REGISTRY,
    RULE_STATUSES,
    ComponentCost,
    LayoutRequest,
    PriceInput,
    area_quantity_item,
    calculate_cost,
    compose_layout,
    edge_quantity_item,
    explicit_quantity_item,
    legacy_detail_cost,
    resolve_module_parts,
    summarize_component_costs,
)


ROOT = Path(__file__).resolve().parents[1]
NORMALIZED_ITEMS = ROOT / "stages" / "02-normalization" / "normalized-items.csv"
COMPONENTS = ROOT / "stages" / "02-normalization" / "components.csv"
PROJECTS = ROOT / "stages" / "02-normalization" / "projects.csv"


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def _raw_decimal(value: str) -> Decimal:
    cleaned = (
        value.strip()
        .replace("\N{NO-BREAK SPACE}", "")
        .replace(" ", "")
        .replace("р.", "")
        .replace("р", "")
        .replace(",", ".")
    )
    return Decimal(cleaned or "0")


class CalculationEngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.items = _read_csv(NORMALIZED_ITEMS)
        cls.components = _read_csv(COMPONENTS)
        cls.projects = _read_csv(PROJECTS)
        cls.items_by_id = {row["item_id"]: row for row in cls.items}

    def _historical_price(
        self,
        item,
        *,
        unit_price: str,
        provenance: str,
    ) -> PriceInput:
        return PriceInput(
            price_code=item.price_code,
            unit_price=Decimal(unit_price),
            unit=item.unit,
            price_context="historical_fixture",
            provenance=(provenance,),
            currency=None,
        )

    def test_rule_registry_is_complete_and_machine_valid(self) -> None:
        self.assertEqual(len(RULE_REGISTRY), len({rule.rule_id for rule in RULE_REGISTRY}))
        self.assertEqual(
            set(RULE_STATUSES),
            {"CONFIRMED", "DERIVED", "PROVISIONAL", "REQUIRES_EXPERT", "NOT_SUPPORTED"},
        )
        for rule in RULE_REGISTRY:
            self.assertIn(rule.status, RULE_STATUSES)
            self.assertTrue(rule.provenance)
            self.assertTrue(rule.inputs)
            self.assertTrue(rule.outputs)

    def test_l1_legacy_area_and_material_cost_on_accepted_row(self) -> None:
        evidence = self.items_by_id["I-20240801-08B059D9084607F4"]
        raw = json.loads(evidence["source_value_raw"])
        item = area_quantity_item(
            item_id=evidence["item_id"],
            item_type="material",
            length_mm=raw["C5"],
            width_mm=raw["D5"],
            quantity=raw["E5"],
            price_code="legacy:material:AGT-white",
            provenance=(
                "stages/02-normalization/normalized-items.csv#"
                "I-20240801-08B059D9084607F4",
            ),
        )
        result = calculate_cost(
            item,
            self._historical_price(
                item,
                unit_price=evidence["historical_unit_price"],
                provenance="Кукня_01.08.24.xls!Расчет!H5",
            ),
        )

        self.assertEqual(Decimal("1.70748"), item.quantity)
        self.assertEqual(Decimal(evidence["area_m2"]), item.quantity)
        self.assertEqual(Decimal("6829.92"), result.cost)
        self.assertEqual(Decimal(evidence["historical_line_cost"]), result.cost)

    def test_l2_legacy_edge_quantity_and_cost_on_accepted_row(self) -> None:
        evidence = self.items_by_id["I-20240801-1F98E37988169EF3"]
        raw = json.loads(evidence["source_value_raw"])
        item = edge_quantity_item(
            item_id=evidence["item_id"],
            length_mm=raw["C5"],
            width_mm=raw["D5"],
            quantity=raw["E5"],
            edge_length_count=raw["F5"],
            edge_width_count=raw["G5"],
            price_code="legacy:edge:AGT-white",
            provenance=(
                "stages/02-normalization/normalized-items.csv#"
                "I-20240801-1F98E37988169EF3",
            ),
        )
        result = calculate_cost(
            item,
            self._historical_price(
                item,
                unit_price=evidence["historical_unit_price"],
                provenance="Кукня_01.08.24.xls!Расчет!I5",
            ),
        )

        self.assertEqual(Decimal("9.252"), item.quantity)
        self.assertEqual(Decimal("1850.4"), result.cost)
        self.assertEqual(Decimal(evidence["historical_line_cost"]), result.cost)

    def test_l3_legacy_area_work_on_accepted_row(self) -> None:
        evidence = self.items_by_id["I-20240801-182021CDB6CFBD9F"]
        raw = json.loads(evidence["source_value_raw"])
        item = area_quantity_item(
            item_id=evidence["item_id"],
            item_type="work",
            length_mm=raw["C5"],
            width_mm=raw["D5"],
            quantity=raw["E5"],
            price_code="legacy:area-work:AGT-white",
            provenance=(
                "stages/02-normalization/normalized-items.csv#"
                "I-20240801-182021CDB6CFBD9F",
            ),
        )
        result = calculate_cost(
            item,
            self._historical_price(
                item,
                unit_price=evidence["historical_unit_price"],
                provenance="Кукня_01.08.24.xls!Расчет!L5",
            ),
        )

        self.assertEqual(Decimal("1.70748"), item.quantity)
        self.assertEqual(Decimal("0"), result.unit_price)
        self.assertEqual(Decimal(evidence["historical_line_cost"]), result.cost)

    def test_l4_replays_all_legacy_rows_and_confirmed_project_total(self) -> None:
        legacy_rows: dict[str, list[dict[str, str]]] = {}
        for row in self.items:
            if row["project_id"] == "P-2024-08-01":
                legacy_rows.setdefault(row["source_row_or_range"], []).append(row)

        detail_costs = []
        for row_number in range(5, 80):
            source_range = f"B{row_number}:P{row_number}"
            rows = legacy_rows[source_range]
            raw = json.loads(rows[0]["source_value_raw"])
            values = {
                column: _raw_decimal(raw[f"{column}{row_number}"])
                for column in "CDEFG"
            }
            material_evidence = next(
                row
                for row in rows
                if row["item_category_normalized"] == "material"
                and row["canonical_unit"] == "m2"
            )
            edge_evidence = next(
                row
                for row in rows
                if row["item_category_normalized"] == "material"
                and row["canonical_unit"] == "m"
            )
            area_work_evidence = next(
                row
                for row in rows
                if row["item_category_normalized"] == "work"
                and row["canonical_unit"] == "m2"
            )
            edge_work_evidence = next(
                row
                for row in rows
                if row["item_category_normalized"] == "work"
                and row["canonical_unit"] == "m"
            )
            subtotal_evidence = next(
                row for row in rows if row["item_category_normalized"] == "subtotal"
            )
            provenance = (f"stages/02-normalization/normalized-items.csv#{source_range}",)
            area_material = area_quantity_item(
                item_id=material_evidence["item_id"],
                item_type="material",
                length_mm=values["C"],
                width_mm=values["D"],
                quantity=values["E"],
                price_code=f"{source_range}:material",
                provenance=provenance,
            )
            area_work = area_quantity_item(
                item_id=area_work_evidence["item_id"],
                item_type="work",
                length_mm=values["C"],
                width_mm=values["D"],
                quantity=values["E"],
                price_code=f"{source_range}:area-work",
                provenance=provenance,
            )
            edge_material = edge_quantity_item(
                item_id=edge_evidence["item_id"],
                length_mm=values["C"],
                width_mm=values["D"],
                quantity=values["E"],
                edge_length_count=values["F"],
                edge_width_count=values["G"],
                price_code=f"{source_range}:edge",
                provenance=provenance,
            )
            edge_work = edge_quantity_item(
                item_id=edge_work_evidence["item_id"],
                item_type="work",
                length_mm=values["C"],
                width_mm=values["D"],
                quantity=values["E"],
                edge_length_count=values["F"],
                edge_width_count=values["G"],
                price_code=f"{source_range}:edge-work",
                provenance=provenance,
            )
            material_cost = calculate_cost(
                area_material,
                self._historical_price(
                    area_material,
                    unit_price=material_evidence["historical_unit_price"],
                    provenance=f"Кукня_01.08.24.xls!Расчет!H{row_number}",
                ),
            )
            edge_cost = calculate_cost(
                edge_material,
                self._historical_price(
                    edge_material,
                    unit_price=edge_evidence["historical_unit_price"],
                    provenance=f"Кукня_01.08.24.xls!Расчет!I{row_number}",
                ),
            )
            works = (
                calculate_cost(
                    area_work,
                    self._historical_price(
                        area_work,
                        unit_price=area_work_evidence["historical_unit_price"],
                        provenance=f"Кукня_01.08.24.xls!Расчет!L{row_number}",
                    ),
                ),
                calculate_cost(
                    edge_work,
                    self._historical_price(
                        edge_work,
                        unit_price=edge_work_evidence["historical_unit_price"],
                        provenance=f"Кукня_01.08.24.xls!Расчет!N{row_number}",
                    ),
                ),
            )
            detail = legacy_detail_cost(
                detail_id=f"legacy-detail-{row_number}",
                material_cost=material_cost,
                edge_cost=edge_cost,
                work_costs=works,
                j2_multiplier="1",
                k2_divisor="0",
                provenance=(f"Кукня_01.08.24.xls!Расчет!P{row_number}",),
            )
            self.assertEqual(
                Decimal(subtotal_evidence["historical_line_cost"]),
                detail.cost,
                source_range,
            )
            detail_costs.append(detail.cost)

        explicit_costs = []
        for row_number in range(115, 130):
            source_range = f"F{row_number}:P{row_number}"
            rows = legacy_rows[source_range]
            subtotal_evidence = next(
                row for row in rows if row["item_category_normalized"] == "subtotal"
            )
            row_costs = []
            for evidence in rows:
                if evidence["item_category_normalized"] == "subtotal":
                    continue
                item = explicit_quantity_item(
                    item_id=evidence["item_id"],
                    item_type=evidence["item_category_normalized"],
                    quantity=evidence["calculated_quantity"],
                    unit=evidence["canonical_unit"] or "source_unit_unconfirmed",
                    price_code=f"{source_range}:{evidence['item_id']}",
                    provenance=(
                        "stages/02-normalization/normalized-items.csv#"
                        f"{evidence['item_id']}",
                    ),
                )
                row_costs.append(
                    calculate_cost(
                        item,
                        self._historical_price(
                            item,
                            unit_price=evidence["historical_unit_price"],
                            provenance=f"Кукня_01.08.24.xls!Расчет!{source_range}",
                        ),
                    ).cost
                )
            self.assertEqual(
                Decimal(subtotal_evidence["historical_line_cost"]),
                sum(row_costs, Decimal("0")),
                source_range,
            )
            explicit_costs.extend(row_costs)

        replayed_total = sum(detail_costs + explicit_costs, Decimal("0"))
        project = next(row for row in self.projects if row["project_id"] == "P-2024-08-01")
        total_item = self.items_by_id["I-20240801-FA25C071357DA0CF"]
        self.assertEqual(Decimal("362372.7313"), replayed_total)
        self.assertEqual(Decimal(project["historical_total"]), replayed_total)
        self.assertEqual(Decimal(total_item["historical_line_cost"]), replayed_total)

    def test_b1_basis_order_quantity_and_component_subtotal(self) -> None:
        line = self.items_by_id["I-20250401-41D922772AA010DF"]
        item = explicit_quantity_item(
            item_id=line["item_id"],
            item_type=line["item_category_normalized"],
            quantity=line["order_quantity"],
            unit=line["canonical_unit"],
            price_code="basis:edge-19x1",
            rule_id="QTY_BASIS_ORDER_V1",
            provenance=("Кухня_01.04.25.xlsx!Лист1!F6",),
            component_id=line["component_id"],
        )
        result = calculate_cost(
            item,
            self._historical_price(
                item,
                unit_price=line["historical_unit_price"],
                provenance="Кухня_01.04.25.xlsx!Лист1!G6",
            ),
        )
        self.assertEqual(Decimal("130"), item.quantity)
        self.assertEqual(Decimal("3770"), result.cost)

        component_id = "C-20250401-EAA592D37C08BD2F"
        component_rows = [
            row
            for row in self.items
            if row["component_id"] == component_id
            and row["item_category_normalized"] != "subtotal"
        ]
        costs = []
        for row in component_rows:
            component_item = explicit_quantity_item(
                item_id=row["item_id"],
                item_type=row["item_category_normalized"],
                quantity=row["order_quantity"],
                unit=row["canonical_unit"],
                price_code=f"basis:{row['item_id']}",
                rule_id="QTY_BASIS_ORDER_V1",
                provenance=(f"Кухня_01.04.25.xlsx!Лист1!{row['source_row_or_range']}",),
                component_id=component_id,
                alternative_group_id="A-20250401-9C993C8AC1FC06A6",
            )
            costs.append(
                calculate_cost(
                    component_item,
                    self._historical_price(
                        component_item,
                        unit_price=row["historical_unit_price"],
                        provenance=f"Кухня_01.04.25.xlsx!Лист1!{row['source_row_or_range']}",
                    ),
                ).cost
            )
        component = next(row for row in self.components if row["component_id"] == component_id)
        self.assertEqual(Decimal(component["historical_subtotal"]), sum(costs, Decimal("0")))

    def test_basis_alternatives_remain_separate_without_expert_selection(self) -> None:
        component_ids = {
            "C-20250401-6EC975EB2EAF6B44",
            "C-20250401-EAA592D37C08BD2F",
            "C-20250401-655014B85127E375",
            "C-20250401-6EB83D327C85AC20",
        }
        inputs = []
        for row in self.components:
            if row["component_id"] not in component_ids:
                continue
            inputs.append(
                ComponentCost(
                    component_id=row["component_id"],
                    cost=Decimal(row["historical_subtotal"]),
                    alternative_group_id=row["alternative_group_id"] or None,
                    selection_status=row["selection_status"],
                )
            )

        summary = summarize_component_costs(inputs)

        self.assertEqual("REQUIRES_EXPERT", summary.status)
        self.assertEqual(Decimal("52492.6"), summary.fixed_total)
        self.assertEqual(Decimal("0"), summary.selected_alternative_total)
        self.assertIsNone(summary.total)
        self.assertEqual(3, len(summary.alternatives))
        self.assertEqual(
            {Decimal("126548"), Decimal("73140"), Decimal("35403")},
            {alternative.cost for alternative in summary.alternatives},
        )

    def test_m1_prices_only_an_explicit_medvedev_source_row(self) -> None:
        evidence = self.items_by_id["I-20260116-39E1601AFDA31824"]
        item = explicit_quantity_item(
            item_id=evidence["item_id"],
            item_type=evidence["item_category_normalized"],
            quantity=evidence["calculated_quantity"],
            unit=evidence["canonical_unit"],
            price_code="medvedev:explicit-body-area",
            provenance=("Кухня_16.01.26.xlsx!Лист1!M2",),
            component_id=evidence["component_id"],
        )
        result = calculate_cost(
            item,
            self._historical_price(
                item,
                unit_price=evidence["historical_unit_price"],
                provenance="Кухня_16.01.26.xlsx!Лист1!O2",
            ),
        )

        self.assertEqual(Decimal("39"), item.quantity)
        self.assertEqual(Decimal("103350"), result.cost)
        self.assertEqual(Decimal(evidence["historical_line_cost"]), result.cost)

    def test_q_price_changes_cost_without_changing_quantity_model(self) -> None:
        item = area_quantity_item(
            item_id="price-separation-proof",
            item_type="material",
            length_mm="930",
            width_mm="612",
            quantity="3",
            price_code="material:test",
            provenance=("accepted-fixture:Расчет!C5:E5",),
        )
        first = calculate_cost(
            item,
            PriceInput(
                price_code=item.price_code,
                unit_price=Decimal("4000"),
                unit=item.unit,
                price_context="test-price-A",
                provenance=("test-price-input-A",),
            ),
        )
        second = calculate_cost(
            item,
            PriceInput(
                price_code=item.price_code,
                unit_price=Decimal("5000"),
                unit=item.unit,
                price_context="test-price-B",
                provenance=("test-price-input-B",),
            ),
        )

        self.assertEqual(first.quantity, second.quantity)
        self.assertEqual(item.quantity, first.quantity)
        self.assertNotEqual(first.cost, second.cost)
        self.assertEqual(Decimal("6829.92"), first.cost)
        self.assertEqual(Decimal("8537.4"), second.cost)

    def test_r_module_recipe_returns_requires_expert_and_no_synthetic_bom(self) -> None:
        layout = compose_layout(LayoutRequest(run_length_mm=600))
        self.assertEqual("VALID", layout.status)

        resolution = resolve_module_parts(layout.items[0])

        self.assertEqual("REQUIRES_EXPERT", resolution.status)
        self.assertEqual("MODULE_TO_PARTS_V1", resolution.rule_id)
        self.assertEqual((), resolution.items)
        self.assertTrue(resolution.required_evidence)

    def test_price_code_and_unit_must_match_quantity_item(self) -> None:
        item = explicit_quantity_item(
            item_id="explicit-1",
            item_type="hardware",
            quantity="2",
            unit="pcs",
            price_code="hinge",
            provenance=("test-fixture",),
        )
        wrong_price = PriceInput(
            price_code="other",
            unit_price=Decimal("10"),
            unit="set",
            price_context="test",
            provenance=("test-fixture",),
        )

        with self.assertRaises(ValueError):
            calculate_cost(item, wrong_price)


if __name__ == "__main__":
    unittest.main()
