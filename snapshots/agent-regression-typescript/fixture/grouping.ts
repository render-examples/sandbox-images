export function groupTotals(rows: readonly { category: string; amountCents: number }[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const row of rows) totals[row.category] = row.amountCents;
  return totals;
}
