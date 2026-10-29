// Número do pedido para mostrar ("#42"): vai de 1 a 1000 e volta ao 1.
// O id do pedido continua único; pedido antigo (sem número) usa o fim do id.
export function orderNumber(order) {
  if (order?.number) return `#${order.number}`;
  const id = String(order?.id ?? order?.orderId ?? "");
  return id ? `#${id.slice(-6).toUpperCase()}` : "#";
}
