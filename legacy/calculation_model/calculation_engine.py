"""Stage 3.4 deterministic quantity and cost calculation layer.

The module keeps quantity derivation separate from price input. Historical
prices are supplied by callers (the tests use accepted normalization rows as
evidence fixtures); this module contains no current or historical pricebook.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Iterable

from .layout_configurator import LayoutItem


RULE_STATUSES = (
    "CONFIRMED",
    "DERIVED",
    "PROVISIONAL",
    "REQUIRES_EXPERT",
    "NOT_SUPPORTED",
)


@dataclass(frozen=True)
class CalculationRule:
    rule_id: str
    name: str
    scope: str
    status: str
    inputs: tuple[str, ...]
    outputs: tuple[str, ...]
    provenance: tuple[str, ...]
    notes: str

    def __post_init__(self) -> None:
        if self.status not in RULE_STATUSES:
            raise ValueError(f"Unsupported rule status: {self.status}")
        if not self.rule_id or not self.name or not self.scope:
            raise ValueError("Rules require id, name, and scope")
        if not self.inputs or not self.outputs or not self.provenance:
            raise ValueError(f"Rule {self.rule_id} lacks an auditable contract")


RULE_REGISTRY = (
    CalculationRule(
        rule_id="QTY_AREA_MM_V1",
        name="Rectangular item area",
        scope="Explicit legacy/medvedev detail dimensions",
        status="CONFIRMED",
        inputs=("length_mm", "width_mm", "quantity"),
        outputs=("area_m2",),
        provenance=(
            "stages/01-audit/source-audit.md#1-площадь-детали",
            "stages/02-normalization/normalized-items.csv#I-20240801-08B059D9084607F4",
            "stages/02-normalization/normalized-items.csv#P-2026-01-16:Лист1!I2",
        ),
        notes="area_m2 = length_mm * width_mm * quantity * 0.000001",
    ),
    CalculationRule(
        rule_id="QTY_EDGE_LENGTH_V1",
        name="Legacy processed edge length",
        scope="Explicit legacy detail rows with length/width edge counts",
        status="CONFIRMED",
        inputs=(
            "length_mm",
            "width_mm",
            "quantity",
            "edge_length_count",
            "edge_width_count",
        ),
        outputs=("edge_length_m",),
        provenance=(
            "stages/01-audit/source-audit.md#3-кромка",
            "stages/02-normalization/normalized-items.csv#I-20240801-1F98E37988169EF3",
        ),
        notes="Edge flags are source values; their production selection is not inferred.",
    ),
    CalculationRule(
        rule_id="QTY_BASIS_ORDER_V1",
        name="Explicit Basis order quantity",
        scope="Literal order_quantity in accepted Basis rows",
        status="CONFIRMED",
        inputs=("order_quantity",),
        outputs=("quantity",),
        provenance=(
            "stages/01-audit/source-audit.md#7-компонентные-суммы-базис",
            "stages/02-normalization/normalized-items.csv#I-20250401-41D922772AA010DF",
        ),
        notes="Does not derive order quantity, coefficient, or rounding.",
    ),
    CalculationRule(
        rule_id="QTY_EXPLICIT_SOURCE_V1",
        name="Explicit source quantity",
        scope="Literal quantities already present in accepted source rows",
        status="CONFIRMED",
        inputs=("source_quantity", "source_unit"),
        outputs=("quantity", "unit"),
        provenance=(
            "stages/02-normalization/validation-report.md#границы-закрытого-этапа-2",
            "stages/02-normalization/normalized-items.csv#I-20260116-39E1601AFDA31824",
        ),
        notes="Does not infer hidden parts, hardware, quantities, or unit conversions.",
    ),
    CalculationRule(
        rule_id="COST_UNIT_PRICE_V1",
        name="Quantity multiplied by supplied unit price",
        scope="Compatible calculation item and explicit price input",
        status="CONFIRMED",
        inputs=("quantity", "unit", "price_code", "unit_price"),
        outputs=("cost",),
        provenance=(
            "stages/01-audit/source-audit.md#2-стоимость-материала",
            "stages/01-audit/source-audit.md#7-компонентные-суммы-базис",
            "stages/02-normalization/normalized-items.csv#I-20260116-39E1601AFDA31824",
        ),
        notes="The caller owns price context; no pricebook is embedded here.",
    ),
    CalculationRule(
        rule_id="COST_LEGACY_DETAIL_V1",
        name="Legacy detail cost aggregation",
        scope="Historical legacy replay with explicit J2/K2 inputs",
        status="CONFIRMED",
        inputs=(
            "material_cost",
            "edge_cost",
            "work_costs",
            "j2_multiplier",
            "k2_divisor",
        ),
        outputs=("detail_cost",),
        provenance=(
            "stages/01-audit/source-audit.md#5-стоимость-детали-в-старой-модели",
            "stages/02-normalization/normalized-items.csv#I-20240801-556F1ECCD93C1D36",
        ),
        notes=(
            "Observed J2=1 and K2=0 are evidence inputs, not production defaults; "
            "their business semantics remain unresolved."
        ),
    ),
    CalculationRule(
        rule_id="BASIS_ALTERNATIVE_SELECTION_V1",
        name="Basis alternative selection",
        scope="Alternative component groups without an accepted selection",
        status="REQUIRES_EXPERT",
        inputs=("alternative_group_id", "component_selection_status"),
        outputs=("selected_component_id",),
        provenance=(
            "stages/01-audit/issues-register.md#A-04-нет-общего-итога-и-выбранного-варианта-в-компонентных-книгах",
            "stages/02-normalization/components.csv#A-20250401-9C993C8AC1FC06A6",
        ),
        notes="Unknown alternatives stay separate and prevent a combined total.",
    ),
    CalculationRule(
        rule_id="MODULE_TO_PARTS_V1",
        name="Ordered module to parts recipe",
        scope="All Stage 3.3 LayoutItem module classes",
        status="REQUIRES_EXPERT",
        inputs=("module_role", "module_class", "module_width_mm"),
        outputs=("parts", "materials", "hardware", "works"),
        provenance=(
            "docs/stage-3-calculation-model/stage-3.2-report.md#unresolved",
            "docs/stage-3-calculation-model/stage-3.3-report.md#неподдерживаемые-случаи",
            "stages/02-normalization/validation-report.md#границы-закрытого-этапа-2",
        ),
        notes="No repeatable role/class/width -> complete BOM mapping is accepted.",
    ),
    CalculationRule(
        rule_id="MEDVEDEV_HIDDEN_LOGIC_V1",
        name="Inference of hidden Medvedev parts and hardware",
        scope="Missing or implicit Medvedev production content",
        status="NOT_SUPPORTED",
        inputs=("project_description", "visible_items"),
        outputs=("hidden_parts", "hidden_hardware"),
        provenance=(
            "stages/01-audit/issues-register.md#A-06-экспертные-решения-не-формализованы",
            "stages/02-normalization/exceptions.csv#P-2026-01-16:expert_rule_missing",
        ),
        notes="Only explicit accepted source rows may enter calculation.",
    ),
)

_RULES_BY_ID = {rule.rule_id: rule for rule in RULE_REGISTRY}
if len(_RULES_BY_ID) != len(RULE_REGISTRY):
    raise ValueError("Rule ids must be unique")


def get_rule(rule_id: str) -> CalculationRule:
    try:
        return _RULES_BY_ID[rule_id]
    except KeyError as exc:
        raise ValueError(f"Unknown calculation rule: {rule_id}") from exc


def _decimal(value: Decimal | int | str) -> Decimal:
    try:
        result = value if isinstance(value, Decimal) else Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError(f"Invalid decimal value: {value!r}") from exc
    if not result.is_finite():
        raise ValueError(f"Decimal value must be finite: {value!r}")
    return result


def _non_negative(value: Decimal | int | str, field_name: str) -> Decimal:
    result = _decimal(value)
    if result < 0:
        raise ValueError(f"{field_name} must be non-negative")
    return result


@dataclass(frozen=True)
class CalculationItem:
    item_id: str
    item_type: str
    quantity: Decimal
    unit: str
    price_code: str
    rule_id: str
    rule_status: str
    provenance: tuple[str, ...]
    dimensions_mm: tuple[tuple[str, Decimal], ...] = ()
    component_id: str | None = None
    alternative_group_id: str | None = None

    def __post_init__(self) -> None:
        if not self.item_id or not self.item_type or not self.unit or not self.price_code:
            raise ValueError("Calculation items require ids, type, unit, and price code")
        if self.quantity < 0 or not self.quantity.is_finite():
            raise ValueError("Calculation item quantity must be finite and non-negative")
        rule = get_rule(self.rule_id)
        if self.rule_status != rule.status:
            raise ValueError(f"Rule status mismatch for {self.rule_id}")
        if not self.provenance:
            raise ValueError("Calculation item provenance is required")


@dataclass(frozen=True)
class PriceInput:
    price_code: str
    unit_price: Decimal
    unit: str
    price_context: str
    provenance: tuple[str, ...]
    currency: str | None = None

    def __post_init__(self) -> None:
        if not self.price_code or not self.unit or not self.price_context:
            raise ValueError("Price inputs require code, unit, and context")
        if self.unit_price < 0 or not self.unit_price.is_finite():
            raise ValueError("Unit price must be finite and non-negative")
        if not self.provenance:
            raise ValueError("Price provenance is required")


@dataclass(frozen=True)
class CostResult:
    item_id: str
    quantity: Decimal
    unit: str
    price_code: str
    unit_price: Decimal
    cost: Decimal
    quantity_rule_id: str
    pricing_rule_id: str
    rule_status: str
    quantity_provenance: tuple[str, ...]
    price_provenance: tuple[str, ...]
    price_context: str
    currency: str | None


@dataclass(frozen=True)
class LegacyDetailCost:
    detail_id: str
    material_cost: Decimal
    edge_cost: Decimal
    work_costs: tuple[Decimal, ...]
    j2_multiplier: Decimal
    k2_divisor: Decimal
    cost: Decimal
    rule_id: str
    rule_status: str
    provenance: tuple[str, ...]


@dataclass(frozen=True)
class ComponentCost:
    component_id: str
    cost: Decimal
    alternative_group_id: str | None = None
    selection_status: str = "not_applicable"

    def __post_init__(self) -> None:
        if not self.component_id:
            raise ValueError("component_id is required")
        if self.cost < 0 or not self.cost.is_finite():
            raise ValueError("Component cost must be finite and non-negative")
        if self.selection_status not in {
            "not_applicable",
            "selected",
            "not_selected",
            "selection_unknown",
        }:
            raise ValueError(f"Unsupported selection status: {self.selection_status}")
        if self.alternative_group_id is None and self.selection_status != "not_applicable":
            raise ValueError("Only grouped alternatives may carry a selection status")
        if self.alternative_group_id is not None and self.selection_status == "not_applicable":
            raise ValueError("Grouped alternatives require a selection status")


@dataclass(frozen=True)
class ComponentCostSummary:
    status: str
    fixed_total: Decimal
    selected_alternative_total: Decimal
    total: Decimal | None
    alternatives: tuple[ComponentCost, ...]
    rule_id: str | None
    reasons: tuple[str, ...]


@dataclass(frozen=True)
class ModulePartsResolution:
    module_id: str
    module_class: str
    width_mm: int
    status: str
    rule_id: str
    items: tuple[CalculationItem, ...]
    reason: str
    required_evidence: tuple[str, ...]


def area_quantity_item(
    *,
    item_id: str,
    item_type: str,
    length_mm: Decimal | int | str,
    width_mm: Decimal | int | str,
    quantity: Decimal | int | str,
    price_code: str,
    provenance: tuple[str, ...],
    component_id: str | None = None,
) -> CalculationItem:
    length = _non_negative(length_mm, "length_mm")
    width = _non_negative(width_mm, "width_mm")
    count = _non_negative(quantity, "quantity")
    area = length * width * count * Decimal("0.000001")
    rule = get_rule("QTY_AREA_MM_V1")
    return CalculationItem(
        item_id=item_id,
        item_type=item_type,
        quantity=area,
        unit="m2",
        price_code=price_code,
        rule_id=rule.rule_id,
        rule_status=rule.status,
        provenance=provenance,
        dimensions_mm=(("length", length), ("width", width), ("count", count)),
        component_id=component_id,
    )


def edge_quantity_item(
    *,
    item_id: str,
    length_mm: Decimal | int | str,
    width_mm: Decimal | int | str,
    quantity: Decimal | int | str,
    edge_length_count: Decimal | int | str,
    edge_width_count: Decimal | int | str,
    price_code: str,
    provenance: tuple[str, ...],
    component_id: str | None = None,
    item_type: str = "edge",
) -> CalculationItem:
    length = _non_negative(length_mm, "length_mm")
    width = _non_negative(width_mm, "width_mm")
    count = _non_negative(quantity, "quantity")
    length_edges = _non_negative(edge_length_count, "edge_length_count")
    width_edges = _non_negative(edge_width_count, "edge_width_count")
    edge_length = (
        length * count * length_edges + width * count * width_edges
    ) * Decimal("0.001")
    rule = get_rule("QTY_EDGE_LENGTH_V1")
    return CalculationItem(
        item_id=item_id,
        item_type=item_type,
        quantity=edge_length,
        unit="m",
        price_code=price_code,
        rule_id=rule.rule_id,
        rule_status=rule.status,
        provenance=provenance,
        dimensions_mm=(
            ("length", length),
            ("width", width),
            ("count", count),
            ("length_edges", length_edges),
            ("width_edges", width_edges),
        ),
        component_id=component_id,
    )


def explicit_quantity_item(
    *,
    item_id: str,
    item_type: str,
    quantity: Decimal | int | str,
    unit: str,
    price_code: str,
    provenance: tuple[str, ...],
    rule_id: str = "QTY_EXPLICIT_SOURCE_V1",
    component_id: str | None = None,
    alternative_group_id: str | None = None,
) -> CalculationItem:
    if rule_id not in {"QTY_EXPLICIT_SOURCE_V1", "QTY_BASIS_ORDER_V1"}:
        raise ValueError(f"Rule {rule_id} is not an explicit quantity rule")
    rule = get_rule(rule_id)
    return CalculationItem(
        item_id=item_id,
        item_type=item_type,
        quantity=_non_negative(quantity, "quantity"),
        unit=unit,
        price_code=price_code,
        rule_id=rule.rule_id,
        rule_status=rule.status,
        provenance=provenance,
        component_id=component_id,
        alternative_group_id=alternative_group_id,
    )


def calculate_cost(item: CalculationItem, price: PriceInput) -> CostResult:
    """Apply a caller-supplied compatible price without modifying quantity."""

    if item.price_code != price.price_code:
        raise ValueError(
            f"Price code mismatch: item={item.price_code}, price={price.price_code}"
        )
    if item.unit != price.unit:
        raise ValueError(f"Unit mismatch: item={item.unit}, price={price.unit}")
    rule = get_rule("COST_UNIT_PRICE_V1")
    return CostResult(
        item_id=item.item_id,
        quantity=item.quantity,
        unit=item.unit,
        price_code=item.price_code,
        unit_price=price.unit_price,
        cost=item.quantity * price.unit_price,
        quantity_rule_id=item.rule_id,
        pricing_rule_id=rule.rule_id,
        rule_status=rule.status,
        quantity_provenance=item.provenance,
        price_provenance=price.provenance,
        price_context=price.price_context,
        currency=price.currency,
    )


def legacy_detail_cost(
    *,
    detail_id: str,
    material_cost: CostResult,
    edge_cost: CostResult,
    work_costs: Iterable[CostResult],
    j2_multiplier: Decimal | int | str,
    k2_divisor: Decimal | int | str,
    provenance: tuple[str, ...],
) -> LegacyDetailCost:
    """Replay the accepted legacy aggregation with explicit evidence inputs."""

    if not detail_id or not provenance:
        raise ValueError("Legacy aggregation requires detail id and provenance")
    multiplier = _non_negative(j2_multiplier, "j2_multiplier")
    divisor = _non_negative(k2_divisor, "k2_divisor")
    works = tuple(work_costs)
    work_values = tuple(result.cost for result in works)
    value = (material_cost.cost + edge_cost.cost + sum(work_values, Decimal("0"))) * multiplier
    if divisor != 0:
        value /= divisor
    rule = get_rule("COST_LEGACY_DETAIL_V1")
    return LegacyDetailCost(
        detail_id=detail_id,
        material_cost=material_cost.cost,
        edge_cost=edge_cost.cost,
        work_costs=work_values,
        j2_multiplier=multiplier,
        k2_divisor=divisor,
        cost=value,
        rule_id=rule.rule_id,
        rule_status=rule.status,
        provenance=provenance,
    )


def summarize_component_costs(
    components: Iterable[ComponentCost],
) -> ComponentCostSummary:
    """Keep unresolved alternatives separate instead of adding every variant."""

    entries = tuple(components)
    ids = [entry.component_id for entry in entries]
    if len(ids) != len(set(ids)):
        raise ValueError("Component ids must be unique")
    fixed = tuple(entry for entry in entries if entry.alternative_group_id is None)
    alternatives = tuple(
        sorted(
            (entry for entry in entries if entry.alternative_group_id is not None),
            key=lambda entry: (entry.alternative_group_id or "", entry.component_id),
        )
    )
    fixed_total = sum((entry.cost for entry in fixed), Decimal("0"))
    if not alternatives:
        return ComponentCostSummary(
            status="CONFIRMED",
            fixed_total=fixed_total,
            selected_alternative_total=Decimal("0"),
            total=fixed_total,
            alternatives=(),
            rule_id=None,
            reasons=("No alternative component group is present.",),
        )

    selected_total = Decimal("0")
    unresolved_groups: list[str] = []
    groups = sorted({entry.alternative_group_id for entry in alternatives})
    for group_id in groups:
        group = tuple(
            entry for entry in alternatives if entry.alternative_group_id == group_id
        )
        selected = tuple(entry for entry in group if entry.selection_status == "selected")
        if len(selected) > 1:
            raise ValueError(f"Alternative group {group_id} has multiple selected variants")
        if not selected:
            unresolved_groups.append(group_id or "")
            continue
        selected_total += selected[0].cost

    if unresolved_groups:
        rule = get_rule("BASIS_ALTERNATIVE_SELECTION_V1")
        return ComponentCostSummary(
            status=rule.status,
            fixed_total=fixed_total,
            selected_alternative_total=selected_total,
            total=None,
            alternatives=alternatives,
            rule_id=rule.rule_id,
            reasons=(
                "No combined total was produced because these alternative groups lack "
                f"an accepted selection: {', '.join(unresolved_groups)}.",
            ),
        )
    return ComponentCostSummary(
        status="CONFIRMED",
        fixed_total=fixed_total,
        selected_alternative_total=selected_total,
        total=fixed_total + selected_total,
        alternatives=alternatives,
        rule_id=None,
        reasons=("Exactly one accepted component was selected in every alternative group.",),
    )


def resolve_module_parts(item: LayoutItem) -> ModulePartsResolution:
    """Refuse to synthesize a BOM for a Stage 3.3 layout item."""

    rule = get_rule("MODULE_TO_PARTS_V1")
    return ModulePartsResolution(
        module_id=item.module_id,
        module_class=item.module_class,
        width_mm=item.width_mm,
        status=rule.status,
        rule_id=rule.rule_id,
        items=(),
        reason=(
            "No accepted repeatable mapping connects this module role/class/width "
            "to a complete set of parts, materials, edge, hardware, and works."
        ),
        required_evidence=(
            "module role/class/width linked to stable part identifiers",
            "part dimensions and quantities across repeatable projects",
            "material, edge, hardware, and work rules with source provenance",
            "furniture-expert acceptance of the recipe and its variants",
        ),
    )
