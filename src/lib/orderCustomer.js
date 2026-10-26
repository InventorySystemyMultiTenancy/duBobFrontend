// Pedido lançado pelo caixa no balcão: o dono do pedido é quem lançou, e o
// nome do cliente vem nas notas ("Pedido no Caixa | Cliente: Maria").
export function isCounterOrder(order) {
  return String(order?.notes || "").includes("Pedido no Caixa");
}

export function getCustomerName(order) {
  const match = String(order?.notes || "").match(/Cliente:\s*([^|]+)/i);
  return match ? match[1].trim() : (order?.user?.name ?? "");
}
