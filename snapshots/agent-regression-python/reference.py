"""Documented reference answer for acceptance only; graders accept other correct code."""


def validate_order(value):
    if type(value) is not dict or set(value) != {'sku', 'quantity', 'unit_cents'}:
        raise ValueError('Expected exactly sku, quantity and unit_cents')
    sku, quantity, cents = value['sku'], value['quantity'], value['unit_cents']
    if type(sku) is not str or not sku.strip():
        raise ValueError('sku must be a nonempty string')
    if type(quantity) is not int or not 1 <= quantity <= 1000:
        raise ValueError('quantity must be an integer from 1 to 1000')
    if type(cents) is not int or not 0 <= cents <= 1_000_000_000:
        raise ValueError('unit_cents must be an integer from 0 to 1000000000')
    return {'sku': sku, 'quantity': quantity, 'unit_cents': cents}


def allocate_cents(total, weights):
    if type(total) is not int or total < 0 or type(weights) is not list or not weights:
        raise ValueError('Expected nonnegative integer cents and a nonempty weight list')
    if any(type(weight) is not int or weight < 0 for weight in weights) or sum(weights) == 0:
        raise ValueError('Weights must be nonnegative integers with a positive sum')
    denominator = sum(weights)
    parts = [divmod(total * weight, denominator) for weight in weights]
    allocated = [whole for whole, _ in parts]
    for index in sorted(range(len(weights)), key=lambda i: (-parts[i][1], i))[:total-sum(allocated)]:
        allocated[index] += 1
    return allocated


def apply_events(events):
    if type(events) is not list:
        raise ValueError('Expected a list of events')
    seen = {}
    for event in events:
        if type(event) is not dict or set(event) != {'id', 'amount_cents'}:
            raise ValueError('Expected exactly id and amount_cents')
        identifier, amount = event['id'], event['amount_cents']
        if type(identifier) is not str or not identifier.strip() or type(amount) is not int:
            raise ValueError('Expected nonempty event id and integer amount')
        if identifier in seen and seen[identifier] != amount:
            raise ValueError('Conflicting replay')
        seen[identifier] = amount
    return {'balance_cents': sum(seen.values()), 'applied_ids': list(seen)}
