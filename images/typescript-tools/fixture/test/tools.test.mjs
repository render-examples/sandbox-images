import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeOrders, deliverSummary } from '../dist/tools.js';
import { createMockApi } from '../mock-api.mjs';
const order = { id: 'order-1', quantity: 2, unitCents: 1250 };
const summary = { orderIds: ['order-1'], totalCents: 2500 };
test('transforms orders and collapses exact duplicate IDs', () => {
  assert.deepEqual(summarizeOrders([order, order]), summary);
});
test('rejects malformed, negative, and unexpected input fields', () => {
  for (const input of [[{ ...order, quantity: '2' }], [{ ...order, unitCents: -1 }], [{ ...order, injected: true }]]) {
    assert.throws(() => summarizeOrders(input));
  }
});
test('rejects conflicting duplicate orders', () => {
  assert.throws(() => summarizeOrders([order, { ...order, quantity: 3 }]), /Conflicting/);
});
test('retries 503 with a stable key and deduplicates a repeated delivery', async () => {
  const api = createMockApi();
  const receipt = await deliverSummary(summary, 'batch-001', api.transport);
  assert.deepEqual(await deliverSummary(summary, 'batch-001', api.transport), receipt);
  assert.equal(api.deliveries, 1);
  assert.deepEqual(api.trace.map(row => row.status), [503, 201, 201]);
  assert.equal(new Set(api.trace.map(row => row.key)).size, 1);
  assert.equal(api.trace[2].duplicate, true);
});
test('bounds retries for persistent rate limits', async () => {
  let attempts = 0;
  await assert.rejects(deliverSummary(summary, 'batch-001', async () => {
    attempts++; return new Response('', { status: 429 });
  }), /Retry limit/);
  assert.equal(attempts, 3);
});
test('does not retry non-retryable HTTP errors', async () => {
  let attempts = 0;
  await assert.rejects(deliverSummary(summary, 'batch-001', async () => {
    attempts++; return new Response('', { status: 400 });
  }), /Non-retryable HTTP 400/);
  assert.equal(attempts, 1);
});
test('rejects malformed and semantically incorrect provider responses', async () => {
  await assert.rejects(deliverSummary(summary, 'batch-001', async () => Response.json({ accepted: 'yes' })));
  await assert.rejects(deliverSummary(summary, 'batch-001', async () => Response.json({ accepted: true, receiptId: 'receipt-1', totalCents: 1 })), /total mismatch/);
});
test('rejects invalid request envelopes before transport', async () => {
  let calls = 0;
  const transport = async () => { calls++; return Response.json({}); };
  await assert.rejects(deliverSummary({ ...summary, totalCents: -1 }, 'batch-001', transport));
  await assert.rejects(deliverSummary(summary, 'bad key', transport));
  assert.equal(calls, 0);
});
