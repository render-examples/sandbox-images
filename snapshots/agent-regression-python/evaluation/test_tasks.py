"""Behavioral grader independent of the shipped reference implementation."""
import copy
import importlib.util
import os
from pathlib import Path
import pytest

spec = importlib.util.spec_from_file_location('candidate_tasks', Path(os.environ['CANDIDATE_SOURCE']))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class TestValidation:
    def test_valid(self):
        value = {'sku': 'sku-1', 'quantity': 2, 'unit_cents': 1250}
        before = copy.deepcopy(value)
        result = module.validate_order(value)
        assert result == before and value == before and result is not value

    def test_reject_boolean_and_coercion(self):
        for quantity in [True, '2', 1.5]:
            with pytest.raises(ValueError):
                module.validate_order({'sku': 'sku-1', 'quantity': quantity, 'unit_cents': 1250})
        with pytest.raises(ValueError):
            module.validate_order({'sku': 'sku-1', 'quantity': 2, 'unit_cents': False})

    def test_reject_unknown_missing_and_blank(self):
        for value in [{'sku': 'sku-1', 'quantity': 1, 'unit_cents': 1, 'admin': True},
                      {'sku': 'sku-1', 'quantity': 1},
                      {'sku': '  ', 'quantity': 1, 'unit_cents': 1}]:
            with pytest.raises(ValueError):
                module.validate_order(value)

    def test_bounds(self):
        for quantity, cents in [(0, 1), (-1, 1), (1001, 1), (1, -1), (1, 1_000_000_001)]:
            with pytest.raises(ValueError):
                module.validate_order({'sku': 'sku-1', 'quantity': quantity, 'unit_cents': cents})
        assert module.validate_order({'sku': 'sku-1', 'quantity': 1000, 'unit_cents': 0})['quantity'] == 1000


class TestAllocation:
    def test_single_weight(self):
        assert module.allocate_cents(100, [7]) == [100]

    def test_remainders_and_ties(self):
        weights = [1, 1, 1]
        assert module.allocate_cents(10, weights) == [4, 3, 3]
        assert weights == [1, 1, 1]
        assert module.allocate_cents(11, [1, 2, 3]) == [2, 4, 5]
        assert module.allocate_cents(0, [0, 1]) == [0, 0]

    def test_invalid_weights_and_total(self):
        for total, weights in [(10, [-1, 2]), (10, []), (10, [0, 0]), (True, [1]),
                               (10, [True, 1]), (10, [1.5, 2]), (-1, [1]), ('10', [1])]:
            with pytest.raises(ValueError):
                module.allocate_cents(total, weights)

    def test_large_exact_amount(self):
        total = 9_007_199_254_740_993
        result = module.allocate_cents(total, [1, 1])
        assert result == [4_503_599_627_370_497, 4_503_599_627_370_496]
        assert sum(result) == total and all(type(value) is int for value in result)


class TestLedger:
    def test_unique_events(self):
        events = [{'id': 'first', 'amount_cents': 100}, {'id': 'refund', 'amount_cents': -25}]
        before = copy.deepcopy(events)
        assert module.apply_events(events) == {'balance_cents': 75, 'applied_ids': ['first', 'refund']}
        assert events == before

    def test_duplicate_delivery(self):
        event = {'id': 'same', 'amount_cents': 101}
        assert module.apply_events([event, dict(event)]) == {'balance_cents': 101, 'applied_ids': ['same']}
        assert module.apply_events([]) == {'balance_cents': 0, 'applied_ids': []}

    def test_conflicting_replay(self):
        with pytest.raises(ValueError):
            module.apply_events([{'id': 'same', 'amount_cents': 101}, {'id': 'same', 'amount_cents': 102}])

    def test_invalid_events(self):
        for events in [[{'id': 'x', 'amount_cents': True}], [{'id': '', 'amount_cents': 1}],
                       [{'id': 'x', 'amount_cents': 1, 'extra': 0}], [{}]]:
            with pytest.raises(ValueError):
                module.apply_events(events)
