export function deduplicateOrders(orders: readonly { id: string; totalCents: number }[]) {
  return orders.filter((order, index) => orders.findIndex(other => other.id === order.id) === index);
}
