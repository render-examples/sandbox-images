import pytest

from pricing import discounted_cents, total_cents


def test_total():
    assert total_cents([(1250, 2), (750, 1)]) == 3250
    assert total_cents([]) == 0


def test_exact_discount():
    assert discounted_cents(3250, 20) == 2600
    assert discounted_cents(0, 50) == 0


def test_invalid_input():
    with pytest.raises(ValueError):
        discounted_cents(100, 101)
    with pytest.raises(ValueError):
        total_cents([(-1, 2)])
