from __future__ import annotations

import unittest

from calculation_model import (
    FillerPolicy,
    LayoutRequest,
    MarketBaseline,
    PositionConstraint,
    RequiredModule,
    compose_layout,
)


class LayoutConfiguratorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.baseline = MarketBaseline()

    def compose(self, request: LayoutRequest):
        return compose_layout(request, self.baseline)

    def test_case_a_prefers_stronger_2600_combination_with_explicit_filler(self) -> None:
        result = self.compose(
            LayoutRequest(
                run_length_mm=2650,
                filler_policy=FillerPolicy(max_width_mm=50),
            )
        )

        self.assertEqual("VALID", result.status)
        self.assertEqual([800, 600, 600, 600], [item.width_mm for item in result.items])
        self.assertEqual(2600, result.occupied_length_mm)
        self.assertEqual(50, result.remainder_mm)
        self.assertIsNotNone(result.filler)
        self.assertEqual(50, result.filler.width_mm)
        self.assertNotIn("FILLER", [item.entity_type for item in result.items])

    def test_case_b_mandatory_dishwasher_slot_has_absolute_priority(self) -> None:
        result = self.compose(
            LayoutRequest(
                run_length_mm=2400,
                required_modules=(
                    RequiredModule(
                        module_id="dishwasher",
                        role="dishwasher_slot",
                        module_class="base_dishwasher_slot",
                        width_mm=600,
                        fixed_position=1,
                    ),
                ),
            )
        )

        self.assertEqual("VALID", result.status)
        self.assertEqual(2400, result.occupied_length_mm)
        dishwasher = result.items[1]
        self.assertEqual("dishwasher", dishwasher.module_id)
        self.assertEqual("APPLIANCE_SLOT", dishwasher.entity_type)
        self.assertTrue(dishwasher.required)
        self.assertEqual("A", dishwasher.market_rank)
        self.assertTrue(dishwasher.rule_source.endswith("#MKT-030"))

    def test_case_c_specialized_width_is_not_automatic_generic_storage(self) -> None:
        result = self.compose(
            LayoutRequest(
                run_length_mm=1350,
                filler_policy=FillerPolicy(max_width_mm=150),
            )
        )

        self.assertEqual("VALID", result.status)
        self.assertEqual([600, 600], [item.width_mm for item in result.items])
        self.assertEqual(150, result.filler.width_mm)
        self.assertNotIn("base_narrow_cargo", [item.module_class for item in result.items])

    def test_case_d_explicit_cargo_uses_specialized_market_class(self) -> None:
        result = self.compose(
            LayoutRequest(
                run_length_mm=1350,
                required_modules=(
                    RequiredModule(
                        module_id="cargo",
                        role="narrow_cargo",
                        module_class="base_narrow_cargo",
                        width_mm=150,
                    ),
                ),
            )
        )

        self.assertEqual("VALID", result.status)
        cargo = next(item for item in result.items if item.module_id == "cargo")
        self.assertEqual("base_narrow_cargo", cargo.module_class)
        self.assertEqual(150, cargo.width_mm)
        self.assertEqual("D", cargo.market_rank)
        self.assertTrue(cargo.rule_source.endswith("#MKT-044"))

    def test_case_e_returns_no_valid_layout_without_inventing_width(self) -> None:
        result = self.compose(LayoutRequest(run_length_mm=650))

        self.assertEqual("NO_VALID_LAYOUT", result.status)
        self.assertEqual((), result.items)
        self.assertIsNone(result.filler)
        self.assertEqual(0, result.occupied_length_mm)

    def test_case_f_same_input_is_deterministic(self) -> None:
        request = LayoutRequest(
            run_length_mm=2650,
            filler_policy=FillerPolicy(max_width_mm=50),
        )

        outputs = [self.compose(request).as_dict() for _ in range(10)]

        self.assertTrue(all(output == outputs[0] for output in outputs[1:]))

    def test_filler_limit_is_explicit_and_not_universal_50(self) -> None:
        exact_only = self.compose(LayoutRequest(run_length_mm=650))
        forty_allowed = self.compose(
            LayoutRequest(
                run_length_mm=650,
                filler_policy=FillerPolicy(max_width_mm=40),
            )
        )
        fifty_allowed = self.compose(
            LayoutRequest(
                run_length_mm=650,
                filler_policy=FillerPolicy(max_width_mm=50),
            )
        )

        self.assertEqual("NO_VALID_LAYOUT", exact_only.status)
        self.assertEqual("NO_VALID_LAYOUT", forty_allowed.status)
        self.assertEqual("VALID", fifty_allowed.status)
        self.assertEqual(50, fifty_allowed.filler.width_mm)

    def test_position_prohibition_is_a_hard_constraint(self) -> None:
        result = self.compose(
            LayoutRequest(
                run_length_mm=1200,
                required_modules=(
                    RequiredModule(
                        module_id="dishwasher",
                        role="dishwasher_slot",
                        module_class="base_dishwasher_slot",
                        width_mm=600,
                        fixed_position=0,
                    ),
                ),
                position_constraints=(
                    PositionConstraint(position=0, forbidden_roles=("dishwasher_slot",)),
                ),
            )
        )

        self.assertEqual("NO_VALID_LAYOUT", result.status)

    def test_position_search_can_reorder_generic_modules(self) -> None:
        result = self.compose(
            LayoutRequest(
                run_length_mm=1400,
                position_constraints=(
                    PositionConstraint(position=0, forbidden_widths_mm=(800,)),
                ),
            )
        )

        self.assertEqual("VALID", result.status)
        self.assertEqual([600, 800], [item.width_mm for item in result.items])

    def test_module_classes_are_not_mixed_between_zones(self) -> None:
        result = self.compose(
            LayoutRequest(
                run_length_mm=1200,
                zone="base",
                required_modules=(
                    RequiredModule(
                        module_id="hood",
                        role="hood",
                        module_class="wall_hood",
                        width_mm=600,
                    ),
                ),
            )
        )

        self.assertEqual("NO_VALID_LAYOUT", result.status)
        self.assertIn("not valid in the base zone", result.reasons[0])

    def test_primary_market_layer_is_used_and_qwen_supplement_is_not_promoted(self) -> None:
        widths = [rule.width_mm for rule in self.baseline.rules_for_class("wall_general")]

        self.assertIn(200, widths)
        self.assertNotIn(150, widths)

    def test_rank_d_generic_width_needs_exact_explicit_permission(self) -> None:
        automatic = self.compose(
            LayoutRequest(
                run_length_mm=150,
                filler_policy=FillerPolicy(max_width_mm=150),
            )
        )
        explicit = self.compose(
            LayoutRequest(run_length_mm=150, explicit_generic_widths_mm=(150,))
        )

        self.assertEqual("NO_VALID_LAYOUT", automatic.status)
        self.assertEqual("VALID", explicit.status)
        self.assertEqual(150, explicit.items[0].width_mm)
        self.assertEqual("D", explicit.items[0].market_rank)

    def test_rank_d_required_generic_width_still_needs_semantic_permission(self) -> None:
        requirement = RequiredModule(
            module_id="narrow-generic",
            role="generic_storage",
            module_class="base_general",
            width_mm=150,
        )

        rejected = self.compose(
            LayoutRequest(run_length_mm=150, required_modules=(requirement,))
        )
        permitted = self.compose(
            LayoutRequest(
                run_length_mm=150,
                required_modules=(requirement,),
                explicit_generic_widths_mm=(150,),
            )
        )

        self.assertEqual("NO_VALID_LAYOUT", rejected.status)
        self.assertEqual("VALID", permitted.status)

    def test_unknown_explicit_generic_width_is_invalid_input(self) -> None:
        result = self.compose(
            LayoutRequest(run_length_mm=600, explicit_generic_widths_mm=(333,))
        )

        self.assertEqual("INVALID_INPUT", result.status)
        self.assertIn("no exact accepted market rule", result.reasons[0])

    def test_unknown_mandatory_width_is_not_invented(self) -> None:
        result = self.compose(
            LayoutRequest(
                run_length_mm=1333,
                required_modules=(
                    RequiredModule(
                        module_id="custom",
                        role="generic_storage",
                        module_class="base_general",
                        width_mm=1333,
                    ),
                ),
            )
        )

        self.assertEqual("NO_VALID_LAYOUT", result.status)
        self.assertIn("no exact accepted market rule", result.reasons[0])

    def test_corner_run_is_honestly_not_supported(self) -> None:
        result = self.compose(LayoutRequest(run_length_mm=2400, run_shape="corner"))

        self.assertEqual("NOT_SUPPORTED", result.status)
        self.assertIn("explicit system profile", result.reasons[0])

    def test_invalid_filler_policy_is_reported(self) -> None:
        result = self.compose(
            LayoutRequest(
                run_length_mm=2400,
                filler_policy=FillerPolicy(min_width_mm=100, max_width_mm=50),
            )
        )

        self.assertEqual("INVALID_INPUT", result.status)

    def test_required_modules_cannot_be_dropped_to_meet_module_count(self) -> None:
        result = self.compose(
            LayoutRequest(
                run_length_mm=1200,
                max_module_count=1,
                required_modules=(
                    RequiredModule(
                        module_id="dishwasher",
                        role="dishwasher_slot",
                        module_class="base_dishwasher_slot",
                        width_mm=600,
                    ),
                    RequiredModule(
                        module_id="cargo",
                        role="narrow_cargo",
                        module_class="base_narrow_cargo",
                        width_mm=150,
                    ),
                ),
                filler_policy=FillerPolicy(max_width_mm=450),
            )
        )

        self.assertEqual("NO_VALID_LAYOUT", result.status)


if __name__ == "__main__":
    unittest.main()
