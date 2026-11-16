import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarizeOrders, deliverSummary } from './src/tools.ts';
import { createMockApi } from './mock-api.ts';
const input:unknown = JSON.parse(readFileSync(new URL('input.json', import.meta.url), 'utf8'));
assert.ok(Array.isArray(input));
const transformed = summarizeOrders(input);
const api = createMockApi();
const receipt = await deliverSummary(transformed, 'batch-001', api.transport);
assert.deepEqual(await deliverSummary(transformed, 'batch-001', api.transport), receipt);
const summary = {
  inputRows: input.length, orders: transformed.orderIds.length, totalCents: transformed.totalCents,
  attempts: api.trace.length, deliveries: api.deliveries,
};
console.log(JSON.stringify({ summary, transformed, receipt, trace: api.trace }));
