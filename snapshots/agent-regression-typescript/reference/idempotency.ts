export function deduplicateOrders(orders: readonly { id: string; totalCents: number }[]) {
  if (!Array.isArray(orders)) throw new TypeError('Expected an array');
  const seen = new Map<string, number>();
  for (const order of orders) {
    if (!order || typeof order.id !== 'string' || order.id.length === 0 || !Number.isSafeInteger(order.totalCents) || order.totalCents < 0) throw new TypeError('Invalid order');
    if (seen.has(order.id) && seen.get(order.id) !== order.totalCents) throw new Error('Conflicting order');
    seen.set(order.id, order.totalCents);
  }
  return [...seen].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([id, totalCents]) => ({ id, totalCents }));
}
