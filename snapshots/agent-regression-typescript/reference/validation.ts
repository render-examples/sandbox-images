export function parseOrder(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError('Expected a plain object');
  const input = value as Record<string, unknown>;
  if (Object.keys(input).sort().join(',') !== 'id,quantity,unitCents') throw new TypeError('Unexpected fields');
  const { id, quantity, unitCents } = input;
  if (typeof id !== 'string' || id.trim().length === 0 || typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000 || typeof unitCents !== 'number' || !Number.isSafeInteger(unitCents) || unitCents < 0) throw new TypeError('Invalid order');
  const totalCents = quantity * unitCents;
  if (!Number.isSafeInteger(totalCents)) throw new RangeError('Unsafe total');
  return { id: id.trim(), quantity, unitCents, totalCents };
}
