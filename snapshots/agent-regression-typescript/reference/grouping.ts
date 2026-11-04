export function groupTotals(rows: readonly { category: string; amountCents: number }[]): Record<string, number> {
  if (!Array.isArray(rows)) throw new TypeError('Expected an array');
  const totals: Record<string, number> = Object.create(null);
  for (const row of rows) {
    if (!row || typeof row.category !== 'string' || row.category.length === 0 || !Number.isSafeInteger(row.amountCents) || row.amountCents < 0) throw new TypeError('Invalid row');
    const total = (totals[row.category] ?? 0) + row.amountCents;
    if (!Number.isSafeInteger(total)) throw new RangeError('Unsafe total');
    totals[row.category] = total;
  }
  return totals;
}
