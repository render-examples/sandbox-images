import assert from 'node:assert/strict';
import test from 'node:test';
import { totalCents } from '../dist/pricing.js';

test('sums integer-cent line items', () => {
  assert.equal(totalCents([{unitCents: 1250, quantity: 2}, {unitCents: 750, quantity: 1}]), 3250);
});
test('empty orders and zero quantities cost zero', () => {
  assert.equal(totalCents([]), 0);
  assert.equal(totalCents([{unitCents: 1250, quantity: 0}]), 0);
});
test('rejects invalid inputs', () => {
  assert.throws(() => totalCents([{unitCents: -1, quantity: 1}]), RangeError);
  assert.throws(() => totalCents([{unitCents: 100, quantity: 1.5}]), RangeError);
});
