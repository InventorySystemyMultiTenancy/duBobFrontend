// O status SAIU_PARA_ENTREGA é reaproveitado para retirada ("pronto para
// retirar") e para mesa ("levando à mesa"), então o texto depende do tipo.

const DEFAULT_LABELS = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  RECEBIDO: "Recebido",
  PREPARANDO: "Preparando",
  PRONTO: "Pronto",
  SAIU_PARA_ENTREGA: "Saiu para entrega",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

const PICKUP_LABELS = {
  PRONTO: "Pronto para retirada",
  SAIU_PARA_ENTREGA: "Pronto para retirada",
  ENTREGUE: "Retirado",
};

const TABLE_LABELS = {
  SAIU_PARA_ENTREGA: "Levando à mesa",
};

const getOrderKind = (order) =>
  order?.isPickup ? "PICKUP" : order?.mesaId || order?.mesa ? "TABLE" : null;

/**
 * Texto do status levando em conta se o pedido é entrega, retirada ou mesa.
 * Se `t` for passado, usa a chave de tradução correspondente.
 */
export function getOrderStatusLabel(order, t) {
  const status = order?.status;
  if (!status) return "";

  const kind = getOrderKind(order);
  const specific =
    kind === "PICKUP"
      ? PICKUP_LABELS[status]
      : kind === "TABLE"
        ? TABLE_LABELS[status]
        : undefined;

  const key = specific
    ? `ORDER_STATUS_${kind}_${status}`
    : `ORDER_STATUS_${status}`;
  const fallback =
    specific ?? DEFAULT_LABELS[status] ?? status.replace(/_/g, " ");

  return t ? t(key, fallback) : fallback;
}

/** Etapas da linha do tempo do pedido, conforme o tipo. */
export function getOrderTrackerSteps(order) {
  const kind = getOrderKind(order);

  if (kind === "PICKUP") {
    // A cozinha pula PRONTO e vai direto para SAIU_PARA_ENTREGA na retirada
    return [
      { keys: ["RECEBIDO"], label: "Recebido" },
      { keys: ["PREPARANDO"], label: "Preparando" },
      { keys: ["PRONTO", "SAIU_PARA_ENTREGA"], label: "Pronto para retirada" },
      { keys: ["ENTREGUE"], label: "Retirado" },
    ];
  }

  if (kind === "TABLE") {
    return [
      { keys: ["RECEBIDO"], label: "Recebido" },
      { keys: ["PREPARANDO"], label: "Preparando" },
      { keys: ["PRONTO", "SAIU_PARA_ENTREGA"], label: "Levando à mesa" },
      { keys: ["ENTREGUE"], label: "Entregue" },
    ];
  }

  return [
    { keys: ["RECEBIDO"], label: "Recebido" },
    { keys: ["PREPARANDO"], label: "Preparando" },
    { keys: ["PRONTO"], label: "Pronto" },
    { keys: ["SAIU_PARA_ENTREGA"], label: "Saiu para entrega" },
    { keys: ["ENTREGUE"], label: "Entregue" },
  ];
}
