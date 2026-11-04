"""Synthetic broken tasks. See TASKS.json for the intended behavior."""


def validate_order(value):
    return {'sku': value['sku'], 'quantity': int(value['quantity']), 'unit_cents': int(value['unit_cents'])}


def allocate_cents(total, weights):
    return [int(total * weight / sum(weights)) for weight in weights]


def apply_events(events):
    return {'balance_cents': sum(event['amount_cents'] for event in events),
            'applied_ids': [event['id'] for event in events]}
