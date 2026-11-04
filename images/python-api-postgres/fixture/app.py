"""Synthetic order quotes against the caller's local Unix-socket database."""
from fastapi import FastAPI, HTTPException, Query
import psycopg
from psycopg.rows import dict_row

app = FastAPI()


@app.get('/orders')
def list_orders():
    with psycopg.connect(row_factory=dict_row) as connection:
        return connection.execute('SELECT id,customer,total_cents FROM orders ORDER BY id').fetchall()


@app.get('/orders/{order_id}/quote')
def quote(order_id: int, discount_percent: int = Query(default=0, ge=0, le=100)):
    with psycopg.connect(row_factory=dict_row) as connection:
        order = connection.execute('SELECT id,total_cents FROM orders WHERE id=%s', (order_id,)).fetchone()
    if order is None:
        raise HTTPException(status_code=404, detail='Order not found')
    cents = order['total_cents']
    discounted = cents * (100 - discount_percent) // 100
    return {'id': order['id'], 'discounted_cents': discounted}
