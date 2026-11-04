import asyncio
import httpx
from app import app


def get(path):
    async def request():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://testserver') as client:
            return await client.get(path)
    return asyncio.run(request())


def test_seeded_orders():
    response = get('/orders')
    assert response.status_code == 200
    assert response.json() == [
        {'id': 1, 'customer': 'Acme', 'total_cents': 2500},
        {'id': 2, 'customer': 'Orbit', 'total_cents': 750},
        {'id': 3, 'customer': 'Penny', 'total_cents': 101},
    ]


def test_whole_cent_discount():
    assert get('/orders/1/quote?discount_percent=20').json() == {'id': 1, 'discounted_cents': 2000}


def test_missing_order():
    assert get('/orders/999/quote').status_code == 404


def test_invalid_discount():
    assert get('/orders/1/quote?discount_percent=101').status_code == 422
