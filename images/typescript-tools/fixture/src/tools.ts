import { z } from 'zod';

const Order = z.strictObject({
  id: z.string().regex(/^order-[0-9]+$/),
  quantity: z.number().int().min(1).max(1000),
  unitCents: z.number().int().min(0).max(1000000),
});
const Orders = z.array(Order).min(1).max(100);
const Summary = z.strictObject({
  orderIds: z.array(z.string()).max(100),
  totalCents: z.number().int().min(0).max(100000000000),
});
const Receipt = z.strictObject({
  accepted: z.literal(true), receiptId: z.string().min(1),
  totalCents: z.number().int().min(0),
});
export type OrderSummary = z.infer<typeof Summary>;
export type Transport = (request: Request) => Promise<Response>;

/** Validate an external payload, collapse exact duplicates, and reject conflicts. */
export function summarizeOrders(input: unknown): OrderSummary {
  const unique = new Map<string, z.infer<typeof Order>>();
  for (const order of Orders.parse(input)) {
    const previous = unique.get(order.id);
    if (previous && (previous.quantity !== order.quantity || previous.unitCents !== order.unitCents)) {
      throw new Error(`Conflicting duplicate order: ${order.id}`);
    }
    unique.set(order.id, order);
  }
  return Summary.parse({
    orderIds: [...unique.keys()].sort(),
    totalCents: [...unique.values()].reduce((sum, order) => sum + order.quantity * order.unitCents, 0),
  });
}

/** Small fixture adapter: only 429/503 retry, at most three attempts, same key. */
export async function deliverSummary(input: unknown, key: string, transport: Transport) {
  const summary = Summary.parse(input);
  z.string().regex(/^[a-z0-9-]{1,64}$/).parse(key);
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await transport(new Request('https://api.example.invalid/orders/summary', {
      method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': key },
      body: JSON.stringify(summary),
    }));
    if (response.status === 429 || response.status === 503) {
      if (attempt === 3) throw new Error('Retry limit exceeded');
      continue;
    }
    if (!response.ok) throw new Error(`Non-retryable HTTP ${response.status}`);
    const receipt = Receipt.parse(await response.json());
    if (receipt.totalCents !== summary.totalCents) throw new Error('Receipt total mismatch');
    return receipt;
  }
  throw new Error('Unreachable');
}
