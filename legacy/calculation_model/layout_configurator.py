"""Stage 3.3 deterministic straight-run kitchen module configurator.

The module deliberately stops at ordered module/slot selection. It does not
derive parts, materials, hardware, works, or prices.
"""

from __future__ import annotations

import csv
from dataclasses import asdict, dataclass
from functools import lru_cache
from pathlib import Path
from typing import Iterable, Iterator, Mapping, Sequence


VALID_STATUSES = {"VALID", "NO_VALID_LAYOUT", "INVALID_INPUT", "NOT_SUPPORTED"}
SUPPORTED_ZONES = {
    "base": "base_general",
    "wall": "wall_general",
    "tall": "tall_universal",
}
AUTOMATIC_RANKS = {"A", "B", "C"}
RANK_ORDER = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4}
LAYOUT_WIDTH_DIMENSIONS = {"width", "nominal_width"}


def default_market_baseline_path() -> Path:
    """Return the accepted Stage 3.1 market baseline in this repository."""

    return (
        Path(__file__).resolve().parents[2]
        / "source-materials"
        / "kitchen-module-reference-comparison.csv"
    )


@dataclass(frozen=True)
class FillerPolicy:
    """Explicit filler allowance; zero maximum means that filler is disabled."""

    min_width_mm: int = 0
    max_width_mm: int = 0
    location: str = "end"


@dataclass(frozen=True)
class RequiredModule:
    """A mandatory functional module or appliance slot."""

    module_id: str
    role: str
    module_class: str
    width_mm: int
    fixed_position: int | None = None


@dataclass(frozen=True)
class PositionConstraint:
    """Prohibitions applied to one zero-based module/slot position."""

    position: int
    forbidden_roles: tuple[str, ...] = ()
    forbidden_module_classes: tuple[str, ...] = ()
    forbidden_widths_mm: tuple[int, ...] = ()


@dataclass(frozen=True)
class LayoutRequest:
    """Minimal Stage 3.3 input model for a straight kitchen run."""

    run_length_mm: int
    zone: str = "base"
    run_shape: str = "straight"
    required_modules: tuple[RequiredModule, ...] = ()
    position_constraints: tuple[PositionConstraint, ...] = ()
    filler_policy: FillerPolicy = FillerPolicy()
    forbidden_generic_widths_mm: tuple[int, ...] = ()
    explicit_generic_widths_mm: tuple[int, ...] = ()
    min_module_count: int | None = None
    max_module_count: int | None = None


@dataclass(frozen=True)
class MarketRule:
    record_id: str
    module_class: str
    dimension: str
    width_mm: int
    rank: str
    recommended_use: str
    source_ref: str

    @property
    def source_label(self) -> str:
        return f"source-materials/kitchen-module-reference-comparison.csv#{self.record_id}"


@dataclass(frozen=True)
class _ResolvedModule:
    module_id: str
    role: str
    module_class: str
    width_mm: int
    market_rule: MarketRule
    required: bool
    fixed_position: int | None = None


@dataclass(frozen=True)
class LayoutItem:
    position: int
    entity_type: str
    module_id: str
    role: str
    module_class: str
    width_mm: int
    market_rank: str
    rule_source: str
    required: bool


@dataclass(frozen=True)
class Filler:
    width_mm: int
    location: str
    rule_source: str = "explicit_request.filler_policy"


@dataclass(frozen=True)
class LayoutResult:
    status: str
    items: tuple[LayoutItem, ...]
    run_length_mm: int
    occupied_length_mm: int
    remainder_mm: int
    filler: Filler | None
    covered_length_mm: int
    reasons: tuple[str, ...]
    market_source: str
    selection_key: tuple[object, ...] | None = None

    def __post_init__(self) -> None:
        if self.status not in VALID_STATUSES:
            raise ValueError(f"Unsupported result status: {self.status}")

    def as_dict(self) -> dict[str, object]:
        """Return a JSON-serializable, field-stable representation."""

        return asdict(self)


class MarketBaseline:
    """Validated, read-only view of exact PRIMARY market width rules."""

    REQUIRED_COLUMNS = {
        "record_id",
        "record_type",
        "module_class",
        "dimension",
        "size_value_mm",
        "size_qualifier",
        "rank",
        "recommended_use",
        "source_layer",
        "source_ref",
    }

    def __init__(self, path: Path | str | None = None) -> None:
        self.path = Path(path) if path is not None else default_market_baseline_path()
        self._rules_by_class = self._load()

    def _load(self) -> Mapping[str, tuple[MarketRule, ...]]:
        if not self.path.is_file():
            raise ValueError(f"Market baseline does not exist: {self.path}")

        by_class: dict[str, list[MarketRule]] = {}
        seen_keys: set[tuple[str, int]] = set()
        with self.path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            missing = self.REQUIRED_COLUMNS.difference(reader.fieldnames or ())
            if missing:
                raise ValueError(
                    "Market baseline misses required columns: " + ", ".join(sorted(missing))
                )

            for row in reader:
                if row["record_type"] != "market_baseline":
                    continue
                if row["source_layer"] != "PRIMARY":
                    continue
                if row["dimension"] not in LAYOUT_WIDTH_DIMENSIONS:
                    continue
                if row["size_qualifier"] != "exact" or not row["size_value_mm"]:
                    continue
                try:
                    numeric_width = float(row["size_value_mm"])
                except ValueError as exc:
                    raise ValueError(
                        f"Non-numeric exact width in {row['record_id']}: {row['size_value_mm']}"
                    ) from exc
                if not numeric_width.is_integer() or numeric_width <= 0:
                    raise ValueError(
                        f"Layout width must be a positive integer in {row['record_id']}"
                    )
                width_mm = int(numeric_width)
                rank = _base_rank(row["rank"])
                if rank not in RANK_ORDER:
                    raise ValueError(f"Unsupported market rank in {row['record_id']}: {row['rank']}")
                key = (row["module_class"], width_mm)
                if key in seen_keys:
                    raise ValueError(
                        "Ambiguous exact width rule for "
                        f"{row['module_class']} {width_mm} mm"
                    )
                seen_keys.add(key)
                by_class.setdefault(row["module_class"], []).append(
                    MarketRule(
                        record_id=row["record_id"],
                        module_class=row["module_class"],
                        dimension=row["dimension"],
                        width_mm=width_mm,
                        rank=rank,
                        recommended_use=row["recommended_use"],
                        source_ref=row["source_ref"],
                    )
                )

        if not by_class:
            raise ValueError("Market baseline contains no accepted layout width rules")
        return {
            module_class: tuple(sorted(rules, key=lambda rule: rule.width_mm))
            for module_class, rules in by_class.items()
        }

    def rules_for_class(self, module_class: str) -> tuple[MarketRule, ...]:
        return self._rules_by_class.get(module_class, ())

    def exact_rule(self, module_class: str, width_mm: int) -> MarketRule | None:
        return next(
            (
                rule
                for rule in self.rules_for_class(module_class)
                if rule.width_mm == width_mm
            ),
            None,
        )


def compose_layout(
    request: LayoutRequest,
    baseline: MarketBaseline | None = None,
) -> LayoutResult:
    """Compose the best valid layout according to the Stage 3.3 priority tuple.

    Candidate priority, after hard constraints and semantic eligibility, is:
    fewer E/D/C/B rules in that order, smaller filler, fewer explicitly allowed
    D/E generic widths, fewer modules, then a stable ordered item signature.
    """

    market = baseline or MarketBaseline()
    market_source = _display_market_source(market.path)
    validation_error = _validate_request(request)
    if validation_error:
        return _empty_result("INVALID_INPUT", request, market_source, validation_error)
    if request.run_shape != "straight":
        return _empty_result(
            "NOT_SUPPORTED",
            request,
            market_source,
            "Stage 3.3 automatic layout supports straight runs only; corner geometry "
            "requires an explicit system profile.",
        )
    if request.zone not in SUPPORTED_ZONES:
        return _empty_result(
            "NOT_SUPPORTED",
            request,
            market_source,
            f"Unsupported automatic zone: {request.zone}",
        )

    generic_class = SUPPORTED_ZONES[request.zone]
    generic_market_widths = {
        rule.width_mm for rule in market.rules_for_class(generic_class)
    }
    unknown_explicit_widths = set(request.explicit_generic_widths_mm).difference(
        generic_market_widths
    )
    if unknown_explicit_widths:
        return _empty_result(
            "INVALID_INPUT",
            request,
            market_source,
            "Explicit generic width permission has no exact accepted market rule for "
            f"{generic_class}: {sorted(unknown_explicit_widths)}.",
        )
    resolved_required: list[_ResolvedModule] = []
    for requirement in request.required_modules:
        if _class_family(requirement.module_class) != request.zone:
            return _empty_result(
                "NO_VALID_LAYOUT",
                request,
                market_source,
                f"Mandatory {requirement.module_id} uses {requirement.module_class}, "
                f"which is not valid in the {request.zone} zone.",
            )
        rule = market.exact_rule(requirement.module_class, requirement.width_mm)
        if rule is None:
            return _empty_result(
                "NO_VALID_LAYOUT",
                request,
                market_source,
                f"Mandatory {requirement.module_id} has no exact accepted market rule "
                f"for {requirement.module_class} at {requirement.width_mm} mm.",
            )
        if (
            rule.rank == "D"
            and requirement.module_class == generic_class
            and requirement.width_mm not in request.explicit_generic_widths_mm
        ):
            return _empty_result(
                "NO_VALID_LAYOUT",
                request,
                market_source,
                f"Rank D generic rule {rule.record_id} requires exact explicit width "
                "permission or a semantically specialized module_class.",
            )
        if rule.rank == "E" and requirement.width_mm not in request.explicit_generic_widths_mm:
            return _empty_result(
                "NO_VALID_LAYOUT",
                request,
                market_source,
                f"Rank E rule {rule.record_id} requires explicit width permission.",
            )
        resolved_required.append(
            _ResolvedModule(
                module_id=requirement.module_id,
                role=requirement.role,
                module_class=requirement.module_class,
                width_mm=requirement.width_mm,
                market_rule=rule,
                required=True,
                fixed_position=requirement.fixed_position,
            )
        )

    required_width = sum(item.width_mm for item in resolved_required)
    if required_width > request.run_length_mm:
        return _empty_result(
            "NO_VALID_LAYOUT",
            request,
            market_source,
            f"Mandatory modules occupy {required_width} mm, exceeding the "
            f"{request.run_length_mm}-mm run.",
        )

    generic_rules = _eligible_generic_rules(request, market, generic_class)
    capacity = request.run_length_mm - required_width
    candidates: list[
        tuple[tuple[object, ...], tuple[_ResolvedModule, ...], int]
    ] = []
    for widths in _width_combinations(capacity, tuple(rule.width_mm for rule in generic_rules)):
        remainder_mm = capacity - sum(widths)
        if not _filler_allows(request.filler_policy, remainder_mm):
            continue
        if not widths and not resolved_required:
            continue
        rule_by_width = {rule.width_mm: rule for rule in generic_rules}
        generic_modules = tuple(
            _ResolvedModule(
                module_id=f"auto-{index + 1:02d}-{width_mm}",
                role="generic_storage",
                module_class=generic_class,
                width_mm=width_mm,
                market_rule=rule_by_width[width_mm],
                required=False,
            )
            for index, width_mm in enumerate(widths)
        )
        modules = tuple(resolved_required) + generic_modules
        if request.min_module_count is not None and len(modules) < request.min_module_count:
            continue
        if request.max_module_count is not None and len(modules) > request.max_module_count:
            continue
        arranged = _arrange_modules(modules, request.position_constraints)
        if arranged is None:
            continue
        selection_key = _selection_key(arranged, remainder_mm)
        candidates.append((selection_key, arranged, remainder_mm))

    if not candidates:
        return _empty_result(
            "NO_VALID_LAYOUT",
            request,
            market_source,
            "No semantically valid combination satisfies all mandatory modules, "
            "position constraints, accepted widths, and the explicit filler policy.",
        )

    selection_key, arranged, remainder_mm = min(candidates, key=lambda candidate: candidate[0])
    items = tuple(
        LayoutItem(
            position=position,
            entity_type=(
                "APPLIANCE_SLOT" if "slot" in item.module_class else "MODULE"
            ),
            module_id=item.module_id,
            role=item.role,
            module_class=item.module_class,
            width_mm=item.width_mm,
            market_rank=item.market_rule.rank,
            rule_source=item.market_rule.source_label,
            required=item.required,
        )
        for position, item in enumerate(arranged)
    )
    occupied = sum(item.width_mm for item in items)
    filler = (
        Filler(width_mm=remainder_mm, location=request.filler_policy.location)
        if remainder_mm > 0
        else None
    )
    reasons = (
        "All mandatory modules and position constraints are satisfied before optimization.",
        f"Every item uses an exact PRIMARY market rule for its own module_class ({market_source}).",
        "Selection key minimizes E/D/C/B rule counts, then explicit filler, "
        "explicitly permitted low-rank generic widths, module count, and a stable tie-break.",
        (
            f"The {remainder_mm}-mm remainder is represented as filler under the explicit policy."
            if filler
            else "The selected modules occupy the run exactly; no filler was created."
        ),
    )
    return LayoutResult(
        status="VALID",
        items=items,
        run_length_mm=request.run_length_mm,
        occupied_length_mm=occupied,
        remainder_mm=remainder_mm,
        filler=filler,
        covered_length_mm=occupied + (filler.width_mm if filler else 0),
        reasons=reasons,
        market_source=market_source,
        selection_key=selection_key,
    )


def _validate_request(request: LayoutRequest) -> str | None:
    if isinstance(request.run_length_mm, bool) or not isinstance(request.run_length_mm, int):
        return "run_length_mm must be an integer."
    if request.run_length_mm <= 0:
        return "run_length_mm must be positive."
    filler = request.filler_policy
    if (
        not isinstance(filler.min_width_mm, int)
        or not isinstance(filler.max_width_mm, int)
        or filler.min_width_mm < 0
        or filler.max_width_mm < 0
        or filler.min_width_mm > filler.max_width_mm
    ):
        return "Filler bounds must be non-negative integers with min <= max."
    if filler.max_width_mm == 0 and filler.min_width_mm != 0:
        return "A zero filler maximum disables filler and requires a zero minimum."
    if filler.location not in {"start", "end"}:
        return "Filler location must be 'start' or 'end'."

    module_ids = [module.module_id for module in request.required_modules]
    if len(module_ids) != len(set(module_ids)):
        return "Required module_id values must be unique."
    fixed_positions = [
        module.fixed_position
        for module in request.required_modules
        if module.fixed_position is not None
    ]
    if len(fixed_positions) != len(set(fixed_positions)):
        return "Two mandatory modules cannot use the same fixed position."
    for module in request.required_modules:
        if not module.module_id or not module.role or not module.module_class:
            return "Required modules need non-empty id, role, and module_class."
        if not isinstance(module.width_mm, int) or module.width_mm <= 0:
            return f"Required module {module.module_id} must have a positive integer width."
        if module.fixed_position is not None and module.fixed_position < 0:
            return f"Required module {module.module_id} has a negative fixed position."

    constraint_positions = [rule.position for rule in request.position_constraints]
    if len(constraint_positions) != len(set(constraint_positions)):
        return "Position constraints must use unique positions."
    if any(position < 0 for position in constraint_positions):
        return "Position constraint positions must be non-negative."
    if set(request.forbidden_generic_widths_mm).intersection(
        request.explicit_generic_widths_mm
    ):
        return "A generic width cannot be both forbidden and explicitly permitted."
    for field_name, widths in (
        ("forbidden_generic_widths_mm", request.forbidden_generic_widths_mm),
        ("explicit_generic_widths_mm", request.explicit_generic_widths_mm),
    ):
        if any(not isinstance(width, int) or width <= 0 for width in widths):
            return f"{field_name} must contain positive integer widths."
    if request.min_module_count is not None and request.min_module_count < 0:
        return "min_module_count must be non-negative."
    if request.max_module_count is not None and request.max_module_count < 0:
        return "max_module_count must be non-negative."
    if (
        request.min_module_count is not None
        and request.max_module_count is not None
        and request.min_module_count > request.max_module_count
    ):
        return "min_module_count cannot exceed max_module_count."
    return None


def _eligible_generic_rules(
    request: LayoutRequest,
    market: MarketBaseline,
    generic_class: str,
) -> tuple[MarketRule, ...]:
    forbidden = set(request.forbidden_generic_widths_mm)
    explicit = set(request.explicit_generic_widths_mm)
    available = market.rules_for_class(generic_class)
    return tuple(
        rule
        for rule in available
        if rule.width_mm not in forbidden
        and (rule.rank in AUTOMATIC_RANKS or rule.width_mm in explicit)
    )


def _width_combinations(capacity: int, widths: tuple[int, ...]) -> Iterator[tuple[int, ...]]:
    """Yield each non-increasing width multiset once, including the empty set."""

    ordered = tuple(sorted(set(widths), reverse=True))

    def visit(index: int, remaining: int, current: tuple[int, ...]) -> Iterator[tuple[int, ...]]:
        if index == len(ordered):
            yield current
            return
        width = ordered[index]
        for count in range(remaining // width, -1, -1):
            yield from visit(
                index + 1,
                remaining - count * width,
                current + (width,) * count,
            )

    yield from visit(0, capacity, ())


def _filler_allows(policy: FillerPolicy, remainder_mm: int) -> bool:
    if remainder_mm == 0:
        return True
    if policy.max_width_mm == 0:
        return False
    return policy.min_width_mm <= remainder_mm <= policy.max_width_mm


def _arrange_modules(
    modules: Sequence[_ResolvedModule],
    constraints: Sequence[PositionConstraint],
) -> tuple[_ResolvedModule, ...] | None:
    size = len(modules)
    constraint_by_position = {constraint.position: constraint for constraint in constraints}
    if any(position >= size for position in constraint_by_position):
        return None

    slots: list[_ResolvedModule | None] = [None] * size
    remaining: list[_ResolvedModule] = []
    for module in modules:
        if module.fixed_position is None:
            remaining.append(module)
            continue
        if module.fixed_position >= size or slots[module.fixed_position] is not None:
            return None
        if not _position_allows(module, constraint_by_position.get(module.fixed_position)):
            return None
        slots[module.fixed_position] = module

    remaining.sort(key=_module_sort_key)

    @lru_cache(maxsize=None)
    def fill(
        position: int,
        remaining_tuple: tuple[_ResolvedModule, ...],
    ) -> tuple[_ResolvedModule, ...] | None:
        if position == size:
            return () if not remaining_tuple else None
        fixed = slots[position]
        if fixed is not None:
            tail = fill(position + 1, remaining_tuple)
            return None if tail is None else (fixed,) + tail

        previous_key: tuple[object, ...] | None = None
        for index, module in enumerate(remaining_tuple):
            module_key = _module_sort_key(module)
            if module_key == previous_key:
                continue
            previous_key = module_key
            if not _position_allows(module, constraint_by_position.get(position)):
                continue
            tail = fill(
                position + 1,
                remaining_tuple[:index] + remaining_tuple[index + 1 :],
            )
            if tail is not None:
                return (module,) + tail
        return None

    return fill(0, tuple(remaining))


def _position_allows(
    module: _ResolvedModule,
    constraint: PositionConstraint | None,
) -> bool:
    if constraint is None:
        return True
    return (
        module.role not in constraint.forbidden_roles
        and module.module_class not in constraint.forbidden_module_classes
        and module.width_mm not in constraint.forbidden_widths_mm
    )


def _selection_key(
    arranged: Sequence[_ResolvedModule],
    remainder_mm: int,
) -> tuple[object, ...]:
    rank_counts = tuple(
        sum(item.market_rule.rank == rank for item in arranged)
        for rank in ("E", "D", "C", "B")
    )
    explicit_low_rank_generic_count = sum(
        not item.required and item.market_rule.rank in {"D", "E"} for item in arranged
    )
    stable_signature = tuple(
        (
            item.module_class,
            item.role,
            -item.width_mm,
            item.market_rule.record_id,
            item.module_id,
        )
        for item in arranged
    )
    return (
        *rank_counts,
        remainder_mm,
        explicit_low_rank_generic_count,
        len(arranged),
        stable_signature,
    )


def _module_sort_key(module: _ResolvedModule) -> tuple[object, ...]:
    return (
        0 if module.required else 1,
        module.module_class,
        module.role,
        -module.width_mm,
        module.market_rule.record_id,
        module.module_id,
    )


def _class_family(module_class: str) -> str | None:
    for family in SUPPORTED_ZONES:
        if module_class.startswith(f"{family}_"):
            return family
    return None


def _base_rank(rank: str) -> str:
    return rank.strip().upper().split("-")[0].split("/")[0]


def _display_market_source(path: Path) -> str:
    canonical = default_market_baseline_path().resolve()
    try:
        if path.resolve() == canonical:
            return "source-materials/kitchen-module-reference-comparison.csv"
    except OSError:
        pass
    return str(path)


def _empty_result(
    status: str,
    request: LayoutRequest,
    market_source: str,
    reason: str,
) -> LayoutResult:
    return LayoutResult(
        status=status,
        items=(),
        run_length_mm=request.run_length_mm,
        occupied_length_mm=0,
        remainder_mm=request.run_length_mm,
        filler=None,
        covered_length_mm=0,
        reasons=(reason,),
        market_source=market_source,
    )
