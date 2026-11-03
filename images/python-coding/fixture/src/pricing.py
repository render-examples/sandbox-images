"""Integer-cent pricing for a synthetic shop. See TASK.md for the known defect."""


def total_cents(lines: list[tuple[int, int]]) -> int:
    if any(type(price) is not int or type(count) is not int or price < 0 or count < 0
           for price, count in lines):
        raise ValueError("Expected non-negative integer prices and quantities")
    return sum(price * count for price, count in lines)


def discounted_cents(cents: int, percent: int) -> int:
    if type(cents) is not int or type(percent) is not int or cents < 0 or not 0 <= percent <= 100:
        raise ValueError("Expected non-negative integer cents and a 0..100 integer discount")
    return cents * (100 - percent) // 100
