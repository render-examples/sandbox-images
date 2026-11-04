export function parseOrder(value: unknown) {
  const input = value as { id: string; quantity: number; unitCents: number };
  return { id: input.id, quantity: Number(input.quantity), unitCents: Number(input.unitCents), totalCents: Number(input.quantity) * Number(input.unitCents) };
}
