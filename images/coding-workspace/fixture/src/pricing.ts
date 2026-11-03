export type LineItem = { unitCents: number; quantity: number };

export function totalCents(items: LineItem[]): number {
  for (const item of items) {
    if (!Number.isSafeInteger(item.unitCents) || item.unitCents < 0 ||
        !Number.isSafeInteger(item.quantity) || item.quantity < 0) {
      throw new RangeError("Prices and quantities must be non-negative integers");
    }
  }
  return items.reduce((sum, item) => sum + item.unitCents * item.quantity, 0);
}
