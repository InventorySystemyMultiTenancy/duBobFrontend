import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import toast from "react-hot-toast";
import { api } from "../lib/api.js";
import { askPaymentMethod } from "../lib/paymentMethodPrompt.js";
import {
  getDesktopNotificationsEnabled,
  requestDesktopNotificationPermission,
  setDesktopNotificationsEnabled,
  supportsDesktopNotifications,
} from "../lib/desktopNotifications.js";
import { compareOrdersByUrgency, getOrderEta } from "../lib/orderEta.js";
import { playKitchenAlertTone } from "../lib/playKitchenAlertTone.js";
import {
  clearStaffUnreadCount,
  getStaffUnreadCount,
  subscribeToStaffUnreadCount,
} from "../lib/staffAlertsStore.js";
import {
  clearWaiterCalls,
  dismissWaiterCall,
  getWaiterCalls,
  subscribeToWaiterCalls,
} from "../lib/waiterCallsStore.js";
import { useTranslation } from "../context/I18nContext.jsx";
import { parseItemNotes } from "../lib/itemNotes.js";

const SOUND_STORAGE_KEY = "pc_kitchen_sound_enabled";
const NEW_ORDER_HIGHLIGHT_MS = 20000;

const COLUMNS = [
  {
    key: "AGUARDANDO_PAGAMENTO",
    label: "Aguardando Pagamento",
    virtual: true,
    color: "border-amber-500/40 bg-amber-500/10",
  },
  {
    key: "RECEBIDO",
    label: "Recebido",
    next: "PREPARANDO",
    color: "border-blue-500/40 bg-blue-500/10",
  },
  {
    key: "PREPARANDO",
    label: "Preparando",
    next: "PRONTO",
    color: "border-yellow-500/40 bg-yellow-500/10",
  },
  {
    key: "PRONTO",
    label: "Pronto",
    next: "SAIU_PARA_ENTREGA",
    color: "border-ember/40 bg-ember/10",
  },
  {
    key: "SAIU_PARA_ENTREGA",
    label: "Saiu p/ Entrega",
    next: "ENTREGUE",
    color: "border-green-500/40 bg-green-500/10",
  },
  {
    key: "RETIRADA_PRONTA",
    label: "Retirada no Local",
    virtual: true,
    color: "border-purple-500/40 bg-purple-500/10",
  },
  {
    key: "LEVAR_PARA_MESA",
    label: "Levar para a Mesa",
    virtual: true,
    color: "border-amber-600/40 bg-amber-600/10",
  },
];

const COLUMN_DOT = {
  AGUARDANDO_PAGAMENTO: "bg-amber-500",
  RECEBIDO: "bg-blue-500",
  PREPARANDO: "bg-yellow-400",
  PRONTO: "bg-secondary",
  SAIU_PARA_ENTREGA: "bg-emerald-500",
  RETIRADA_PRONTA: "bg-purple-500",
  LEVAR_PARA_MESA: "bg-orange-500",
};

const scrollToColumn = (key) =>
  document
    .getElementById(`kitchen-col-${key}`)
    ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });

// Real order statuses (for drag/advance logic)
const STAGES = COLUMNS.filter((c) => !c.virtual);

const NEXT_LABEL = {
  RECEBIDO: "Iniciar Preparo",
  PREPARANDO: "Marcar Pronto",
  PRONTO: "Saiu para Entrega",
  SAIU_PARA_ENTREGA: "Marcar Entregue",
};

function getNextStageKey(status, order) {
  if ((order?.mesaId || order?.isPickup) && status === "PREPARANDO") {
    return "SAIU_PARA_ENTREGA";
  }

  return STAGES.find((stage) => stage.key === status)?.next ?? null;
}

function getNextColumnKey(status, order) {
  if (order?.mesaId && status === "PREPARANDO") {
    return "LEVAR_PARA_MESA";
  }

  if (order?.isPickup && status === "PREPARANDO") {
    return "RETIRADA_PRONTA";
  }

  return getNextStageKey(status, order);
}

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

function getTotemLabel(order) {
  const match = String(order?.notes || "").match(/Totem\s*(\d+)/i);
  return match ? `Totem ${match[1]}` : "Totem";
}

function getKitchenOrderTitle(order, t) {
  if (order.mesa) {
    return order.mesa.name ?? `Mesa ${order.mesa.number ?? ""}`.trim();
  }

  if (order.comanda) {
    const number = order.comanda.number
      ? `Comanda ${order.comanda.number}`
      : "Comanda";
    return order.comanda.name ? `${number} - ${order.comanda.name}` : number;
  }

  if (isTotemOrder(order)) {
    return getTotemLabel(order);
  }

  if (order.isPickup) {
    return t("KITCHEN_PICKUP", "Retirada");
  }

  return order.user?.name ?? t("CLIENT_DASHBOARD_CLIENT", "Cliente");
}

function getKitchenOrderSubtitle(order, t) {
  if (order.mesa) {
    return order.mesa.number ? `Mesa ${order.mesa.number}` : "Mesa";
  }

  if (order.comanda) {
    return order.comanda.number ? `Comanda ${order.comanda.number}` : "Comanda";
  }

  if (order.isPickup) {
    return order.user?.name ?? t("CLIENT_DASHBOARD_CLIENT", "Cliente");
  }

  return order.deliveryAddress ?? t("KITCHEN_DELIVERY", "Entrega");
}

function getKitchenItems(order) {
  return order.items ?? [];
}

function hasKitchenItems(order) {
  return getKitchenItems(order).length > 0;
}

function isDeliveryOrPickupOrder(order) {
  return !order?.mesaId && !order?.comandaId && !isTotemOrder(order);
}

function isLocalKitchenOrder(order) {
  return Boolean(order?.mesaId || order?.comandaId) || isTotemOrder(order);
}

function isTotemOrder(order) {
  return (
    order?.paymentMethod === "MAQUININHA_TOTEM" ||
    String(order?.notes || "").includes("Pedido feito no Totem")
  );
}

function isTotemWaitingPayment(order) {
  return (
    order.paymentMethod === "MAQUININHA_TOTEM" &&
    order.paymentStatus === "PENDENTE"
  );
}

const normalizeText = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

function getFlavorCategoryNeedle(notes) {
  const linhaMatch = notes.match(/Linha:\s*([^|]+)/i);
  if (linhaMatch) {
    const linha = normalizeText(linhaMatch[1]);
    if (linha.includes("especial")) return "sabor milkshake especial";
    if (linha.includes("alcool")) return "sabor milkshake alcool";
    if (linha.includes("premium")) return "sabor milkshake premium";
    return "sabor milkshake tradicional";
  }
  if (/tamanho:/i.test(notes)) return "sabor acai";
  return null;
}

function getFlavorImage(item, products) {
  const notes = String(item?.notes || "");
  const flavorMatch = notes.match(/Sabor:\s*([^|]+)/i);
  if (!flavorMatch || !products?.length) return "";

  const flavorName = normalizeText(flavorMatch[1]);
  const categoryNeedle = getFlavorCategoryNeedle(notes);
  if (!categoryNeedle) return "";

  const match = products.find(
    (p) =>
      normalizeText(p.category).includes(categoryNeedle) &&
      normalizeText(p.name) === flavorName,
  );

  return match?.imageUrl || "";
}

function getProductImage(item, products = []) {
  return (
    getFlavorImage(item, products) ||
    item?.product?.imageUrl ||
    item?.product?.image ||
    item?.product?.photo ||
    item?.imageUrl ||
    item?.image ||
    ""
  );
}

function getKitchenItemTitle(item, t) {
  const notes = String(item?.notes || "");
  const flavorMatch = notes.match(/Sabor:\s*([^|]+)/i);
  const fallback = item.product?.name ?? t("CLIENT_DASHBOARD_ITEM", "Item");
  if (!flavorMatch) return fallback;

  const flavor = flavorMatch[1].trim();
  const linhaMatch = notes.match(/Linha:\s*([^|]+)/i);
  const base = linhaMatch ? linhaMatch[1].trim() : fallback;
  return `${base} - ${flavor}`;
}

function toKitchenAlertText(value) {
  if (!value) return "";

  if (Array.isArray(value)) {
    return value
      .map((entry) =>
        typeof entry === "string"
          ? entry
          : (entry?.name ?? entry?.label ?? entry?.title ?? ""),
      )
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object") {
    return Object.values(value).filter(Boolean).join(", ");
  }

  return String(value);
}

function OrderCard({
  order,
  onAdvance,
  advancing,
  now,
  isFresh,
  dragging,
  onDragStart,
  onDragEnd,
  onConfirmPayment,
  onPayLater,
  confirmingPayment,
  onCancel,
  cancelling,
  motoboys = [],
  onAssignMotoboy,
  assigningMotoboy,
  onConfirmDelivery,
  confirmingDelivery,
  largeMode = false,
  products = [],
}) {
  const { t } = useTranslation();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [deliveryCodeInput, setDeliveryCodeInput] = useState("");
  const needsCodeConfirm =
    order.status === "SAIU_PARA_ENTREGA" &&
    !order.isPickup &&
    !order.mesaId &&
    !!onConfirmDelivery;
  const nextStatus = getNextStageKey(order.status, order);
  const hasNext = !!nextStatus && !onConfirmPayment && !needsCodeConfirm;
  const eta = getOrderEta(order, now);
  const isPaymentPending = order.paymentStatus === "PENDENTE";
  const kitchenItems = getKitchenItems(order);

  const advanceLabel = advancing
    ? t("KITCHEN_UPDATING", "Atualizando...")
    : order.mesaId && order.status === "PREPARANDO"
      ? t("KITCHEN_ADVANCE_TO_TABLE", "Levar para a Mesa")
      : order.isPickup && order.status === "PREPARANDO"
        ? t("KITCHEN_READY_PICKUP", "Pronto p/ Retirada")
        : order.mesaId && order.status === "PRONTO"
          ? t("KITCHEN_ADVANCE_TO_TABLE", "Levar para a Mesa")
          : order.mesaId && order.status === "SAIU_PARA_ENTREGA"
            ? t("KITCHEN_DELIVERED_AT_TABLE", "Entregue na Mesa")
            : order.isPickup && order.status === "PRONTO"
              ? t("KITCHEN_READY_PICKUP", "Pronto p/ Retirada")
              : order.isPickup && order.status === "SAIU_PARA_ENTREGA"
                ? t("KITCHEN_MARK_PICKED_UP", "Marcar Retirado")
                : t(`KITCHEN_NEXT_${order.status}`, NEXT_LABEL[order.status]);

  const orderCode = `#${order.id.slice(-6).toUpperCase()}`;
  const title = getKitchenOrderTitle(order, t);
  const subtitle = getKitchenOrderSubtitle(order, t);
  const typeChip = isTotemOrder(order)
    ? { label: `🖥️ ${getTotemLabel(order)}`, cls: "bg-indigo-100 text-indigo-800" }
    : order.mesa
      ? { label: `🪑 Mesa ${order.mesa.number}`, cls: "bg-amber-100 text-amber-800" }
      : order.comanda
        ? { label: `🎫 Comanda ${order.comanda.number}`, cls: "bg-emerald-100 text-emerald-800" }
        : order.isPickup
          ? { label: `🛍️ ${t("KITCHEN_PICKUP", "Retirada")}`, cls: "bg-purple-100 text-purple-800" }
          : { label: `🛵 ${t("KITCHEN_DELIVERY", "Entrega")}`, cls: "bg-sky-100 text-sky-800" };
  const chip = largeMode
    ? "rounded-full px-3 py-1.5 text-sm font-extrabold"
    : "rounded-full px-3 py-1 text-sm font-extrabold";

  return (
    <article
      draggable={hasNext && !advancing}
      onDragStart={() => onDragStart(order)}
      onDragEnd={onDragEnd}
      className={`rounded-3xl bg-white shadow-card transition-all duration-200 ${
        largeMode ? "p-5" : "p-5"
      } ${
        isFresh
          ? "ring-4 ring-gold"
          : eta?.isOverdue
            ? "ring-2 ring-red-400"
            : "ring-1 ring-primary/5"
      } ${dragging ? "cursor-grabbing opacity-60" : hasNext ? "cursor-grab" : "cursor-default"}`}
    >
      {/* Cabeçalho: quem é e quando chegou */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className={`break-words font-display font-semibold leading-tight text-primary ${
              largeMode ? "text-3xl" : "text-2xl"
            }`}
          >
            {title}
          </h3>
          {subtitle && subtitle !== title && (
            <p
              className={`mt-0.5 break-words font-semibold text-text-muted ${
                largeMode ? "text-lg" : "text-base"
              }`}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p
            className={`font-display font-bold leading-none text-primary ${
              largeMode ? "text-3xl" : "text-2xl"
            }`}
          >
            {formatTime(order.createdAt)}
          </p>
          <p className="mt-1 text-xs font-bold tracking-wide text-text-muted">
            {orderCode}
          </p>
        </div>
      </div>

      {/* Etiquetas */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {isFresh && (
          <span className={`${chip} animate-pulse bg-gold text-primary`}>
            ✨ {t("KITCHEN_NEW_ORDER", "Novo pedido")}
          </span>
        )}
        <span className={`${chip} ${typeChip.cls}`}>{typeChip.label}</span>
        {eta && !eta.isFinal && (
          <span
            className={`${chip} ${
              eta.isOverdue
                ? "bg-red-600 text-white"
                : eta.elapsedMinutes >= 20
                  ? "bg-amber-100 text-amber-800"
                  : "bg-accent text-primary"
            }`}
          >
            ⏱ {eta.elapsedMinutes} min
          </span>
        )}
        {isPaymentPending && !onConfirmPayment && (
          <span className={`${chip} bg-amber-100 text-amber-800`}>
            💰 {t("KITCHEN_PAYMENT_PENDING", "Pag. pendente")}
          </span>
        )}
      </div>

      {/* Itens */}
      <ul className={`mt-4 ${largeMode ? "space-y-4" : "space-y-3"}`}>
        {kitchenItems.map((item) => {
          const { fields, complements, observation } = parseItemNotes(item.notes);
          const image = largeMode ? getProductImage(item, products) : "";
          const addons = toKitchenAlertText(item.addons);
          const removals = toKitchenAlertText(item.removedIngredients);
          return (
            <li
              key={item.id}
              className={`rounded-2xl bg-accent/60 ${largeMode ? "p-4" : "p-3"}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex shrink-0 items-center justify-center rounded-full bg-secondary font-display font-bold text-white ${
                    largeMode ? "h-12 min-w-12 px-2 text-2xl" : "h-10 min-w-10 px-2 text-lg"
                  }`}
                >
                  {item.quantity}×
                </span>
                <p
                  className={`min-w-0 flex-1 break-words font-extrabold leading-snug text-primary ${
                    largeMode ? "text-2xl" : "text-xl"
                  }`}
                >
                  {getKitchenItemTitle(item, t)}
                </p>
                {image && (
                  <img
                    src={image}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                )}
              </div>

              {fields.length > 0 && (
                <dl
                  className={`mt-2.5 grid gap-x-3 gap-y-1 ${
                    largeMode ? "text-lg" : "text-lg"
                  }`}
                >
                  {fields.map((field) => (
                    <div key={field.label} className="flex gap-1.5">
                      <dt className="text-text-muted">{field.label}:</dt>
                      <dd className="font-bold text-primary">{field.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {complements.length > 0 && (
                <div className="mt-2.5">
                  <p
                    className={`mb-1 font-bold uppercase tracking-wide text-text-muted ${
                      largeMode ? "text-sm" : "text-xs"
                    }`}
                  >
                    Complementos
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {complements.map((name) => (
                      <li
                        key={name}
                        className={`rounded-full bg-white font-bold text-primary ring-1 ring-primary/10 ${
                          largeMode ? "px-3 py-1 text-base" : "px-3 py-1 text-sm"
                        }`}
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {addons && (
                <p className={`mt-2 font-bold text-secondary ${largeMode ? "text-lg" : "text-base"}`}>
                  + {addons}
                </p>
              )}
              {removals && (
                <p className={`mt-1 font-bold text-red-600 ${largeMode ? "text-lg" : "text-base"}`}>
                  Sem: {removals}
                </p>
              )}
              {observation && (
                <p
                  className={`mt-2.5 rounded-xl border-2 border-amber-300 bg-amber-100 font-extrabold text-amber-900 ${
                    largeMode ? "px-3 py-2 text-lg" : "px-3 py-2 text-base"
                  }`}
                >
                  ⚠ {observation}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {order.notes && !isTotemOrder(order) && (
        <p
          className={`mt-3 rounded-xl border-2 border-amber-300 bg-amber-100 font-extrabold text-amber-900 ${
            largeMode ? "px-3 py-2 text-lg" : "px-3 py-2 text-base"
          }`}
        >
          ⚠ Obs. do pedido: {toKitchenAlertText(order.notes)}
        </p>
      )}

      {/* Pagamento pendente (totem) */}
      {onConfirmPayment && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={confirmingPayment}
            onClick={() => onConfirmPayment(order.id)}
            className={`ui-btn ui-btn-success ${largeMode ? "ui-btn-lg" : ""}`}
          >
            {confirmingPayment
              ? "..."
              : t("KITCHEN_CONFIRM_PAYMENT_BTN", "✅ Confirmar Pgto")}
          </button>
          <button
            type="button"
            disabled={confirmingPayment}
            onClick={() => onPayLater(order.id)}
            className={`ui-btn border-2 border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 ${
              largeMode ? "ui-btn-lg" : ""
            }`}
          >
            {confirmingPayment
              ? "..."
              : t("KITCHEN_PAY_LATER_BTN", "⏳ Pagar Depois")}
          </button>
        </div>
      )}

      {/* Próxima etapa */}
      {hasNext && (
        <button
          type="button"
          disabled={advancing}
          onClick={() => onAdvance(order.id, nextStatus)}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 font-extrabold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 disabled:opacity-50 ${
            largeMode ? "min-h-16 px-5 py-4 text-2xl" : "min-h-14 px-4 py-3 text-lg"
          }`}
        >
          {advanceLabel}
          {!advancing && <span aria-hidden="true">→</span>}
        </button>
      )}

      {/* Código de entrega */}
      {needsCodeConfirm && (
        <div className="mt-4">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
            {t("KITCHEN_DELIVERY_CODE_SECTION", "📍 Código do cliente")}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={deliveryCodeInput}
              onChange={(e) =>
                setDeliveryCodeInput(
                  e.target.value.replace(/\D/g, "").slice(0, 4),
                )
              }
              placeholder="0000"
              className="ui-input w-24 text-center text-lg font-bold tracking-widest"
            />
            <button
              type="button"
              disabled={deliveryCodeInput.length !== 4 || confirmingDelivery}
              onClick={() => {
                onConfirmDelivery(order.id, deliveryCodeInput);
                setDeliveryCodeInput("");
              }}
              className="ui-btn ui-btn-success flex-1"
            >
              {confirmingDelivery
                ? t("KITCHEN_CONFIRMING_DELIVERY", "Confirmando...")
                : t("KITCHEN_CONFIRM_DELIVERY_BTN", "✓ Confirmar Entrega")}
            </button>
          </div>
        </div>
      )}

      {/* Motoboy — só entregas */}
      {!order.isPickup &&
        !order.mesaId &&
        onAssignMotoboy &&
        motoboys.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
              🛵 Motoboy
            </p>
            <select
              value={order.assignedMotoboyId ?? ""}
              onChange={(e) =>
                e.target.value && onAssignMotoboy(order.id, e.target.value)
              }
              disabled={assigningMotoboy}
              className={`ui-input py-2 ${
                order.assignedMotoboyId ? "" : "border-amber-300 bg-amber-50"
              }`}
            >
              {!order.assignedMotoboyId && (
                <option value="">
                  {t("KITCHEN_SELECT_MOTOBOY", "Selecionar motoboy...")}
                </option>
              )}
              {motoboys.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}

      {/* Cancelar */}
      {onCancel &&
        (confirmCancel ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-red-50 px-3 py-2">
            <span className="flex-1 text-xs font-semibold text-red-700">
              {t(
                "KITCHEN_CANCEL_CONFIRM_TEXT",
                "Cancelar pedido #{{id}}?",
              ).replace("{{id}}", order.id.slice(-6).toUpperCase())}
            </span>
            <button
              type="button"
              disabled={cancelling}
              onClick={() => {
                setConfirmCancel(false);
                onCancel(order.id);
              }}
              className="ui-btn ui-btn-sm ui-btn-danger"
            >
              {cancelling ? "..." : t("YES", "Sim")}
            </button>
            <button
              type="button"
              onClick={() => setConfirmCancel(false)}
              className="ui-btn ui-btn-sm ui-btn-outline"
            >
              {t("NO", "Não")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={cancelling || advancing || confirmingPayment}
            onClick={() => setConfirmCancel(true)}
            className="mt-2 w-full py-1.5 text-xs font-bold text-red-500 transition hover:text-red-700 disabled:opacity-40"
          >
            {cancelling
              ? t("KITCHEN_CANCELLING", "Cancelando...")
              : t("KITCHEN_CANCEL_ORDER_BTN", "Cancelar pedido")}
          </button>
        ))}
    </article>
  );
}

function KitchenPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const isNormalKitchenUser = user?.role === "COZINHA";
  const isDeliveryKitchenUser = user?.role === "COZINHA_DELIVERY";
  const location = useLocation();
  const isKitchenUser = isNormalKitchenUser || isDeliveryKitchenUser;
  const isPreparationOnlyKitchen = isNormalKitchenUser;
  const canLoadMotoboys = [
    "ADMIN",
    "FUNCIONARIO",
    "COZINHA",
    "COZINHA_DELIVERY",
  ].includes(user?.role);
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get("/products");
      return res.data?.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const [now, setNow] = useState(() => Date.now());
  const [latestAlert, setLatestAlert] = useState(null);
  const [freshOrderIds, setFreshOrderIds] = useState([]);
  const [unreadCount, setUnreadCount] = useState(() => getStaffUnreadCount());
  const [waiterCalls, setWaiterCalls] = useState(() => getWaiterCalls());
  const [desktopEnabled, setDesktopEnabled] = useState(() =>
    getDesktopNotificationsEnabled(),
  );
  const [draggedOrder, setDraggedOrder] = useState(null);
  const [activeDropStage, setActiveDropStage] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const cached = localStorage.getItem(SOUND_STORAGE_KEY);
    return cached === null ? true : cached === "true";
  });
  const effectiveSoundEnabled = isKitchenUser || soundEnabled;
  const previousOverdueIdsRef = useRef([]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (isKitchenUser) {
      localStorage.setItem(SOUND_STORAGE_KEY, "true");
      setDesktopNotificationsEnabled(true);
      return;
    }

    localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled));
  }, [isKitchenUser, soundEnabled]);

  const handleDesktopToggle = async () => {
    if (!supportsDesktopNotifications()) {
      return;
    }

    if (desktopEnabled) {
      setDesktopNotificationsEnabled(false);
      setDesktopEnabled(false);
      return;
    }

    const permission = await requestDesktopNotificationPermission();
    const granted = permission === "granted";
    setDesktopNotificationsEnabled(granted);
    setDesktopEnabled(granted);
  };

  const handleDragStart = (order) => {
    setDraggedOrder({
      id: order.id,
      status: order.status,
      nextStatus: getNextStageKey(order.status, order),
      dropColumnKey: getNextColumnKey(order.status, order),
    });
  };

  const handleDragEnd = () => {
    setDraggedOrder(null);
    setActiveDropStage(null);
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/dashboard");
  };

  const handleClearAlerts = () => {
    clearStaffUnreadCount();
    clearWaiterCalls();
  };

  const handleDismissWaiterCall = (call, index) => {
    dismissWaiterCall({ ...call, index });
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) {
      return t("KITCHEN_JUST_NOW", "agora");
    }

    const diffMinutes = Math.max(
      0,
      Math.floor((now - new Date(timestamp).getTime()) / 60000),
    );

    if (diffMinutes < 1) {
      return t("KITCHEN_JUST_NOW", "agora");
    }

    if (diffMinutes === 1) {
      return t("KITCHEN_ONE_MINUTE_AGO", "há 1 min");
    }

    return t("KITCHEN_MINUTES_AGO", "há {{count}} min").replace(
      "{{count}}",
      String(diffMinutes),
    );
  };

  useEffect(() => subscribeToStaffUnreadCount(setUnreadCount), []);
  useEffect(() => subscribeToWaiterCalls(setWaiterCalls), []);

  useEffect(() => {
    const timeouts = new Map();

    const handleOrderCreated = (event) => {
      const payload = event.detail;

      setLatestAlert({
        orderId: payload.orderId,
        timestamp: Date.now(),
      });

      setFreshOrderIds((current) => {
        const next = current.filter((orderId) => orderId !== payload.orderId);
        return [payload.orderId, ...next];
      });

      if (effectiveSoundEnabled) {
        playKitchenAlertTone("new-order");
      }

      const previousTimeout = timeouts.get(payload.orderId);
      if (previousTimeout) {
        window.clearTimeout(previousTimeout);
      }

      const timeoutId = window.setTimeout(() => {
        setFreshOrderIds((current) =>
          current.filter((orderId) => orderId !== payload.orderId),
        );
        timeouts.delete(payload.orderId);
      }, NEW_ORDER_HIGHLIGHT_MS);

      timeouts.set(payload.orderId, timeoutId);
    };

    window.addEventListener("pc:order-created", handleOrderCreated);

    return () => {
      window.removeEventListener("pc:order-created", handleOrderCreated);
      for (const timeoutId of timeouts.values()) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [effectiveSoundEnabled]);

  useEffect(() => {
    const handleRealtimeReconnected = () => {
      if (effectiveSoundEnabled) {
        playKitchenAlertTone("reconnected");
      }
    };

    window.addEventListener(
      "pc:realtime-reconnected",
      handleRealtimeReconnected,
    );

    return () => {
      window.removeEventListener(
        "pc:realtime-reconnected",
        handleRealtimeReconnected,
      );
    };
  }, [effectiveSoundEnabled]);

  const {
    data: orders = [],
    isLoading,
    isError,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["kitchen-orders"],
    queryFn: async () => {
      const res = await api.get("/orders");
      return res.data?.data ?? [];
    },
    refetchInterval: 120_000,
  });

  const {
    mutate: advance,
    variables: advancingVars,
    isPending,
  } = useMutation({
    mutationFn: async ({ orderId, status }) => {
      const res = await api.patch(`/orders/${orderId}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
      toast.success(t("KITCHEN_STATUS_UPDATED", "Status atualizado"));
    },
    onError: () =>
      toast.error(t("KITCHEN_STATUS_ERROR", "Falha ao atualizar status")),
  });

  const { data: motoboys = [] } = useQuery({
    queryKey: ["motoboys"],
    queryFn: async () => {
      const res = await api.get("/admin/motoboys");
      return res.data?.data ?? [];
    },
    staleTime: 60_000,
    enabled: canLoadMotoboys,
  });

  const visibleOrders = useMemo(() => {
    const roleFiltered =
      user?.role === "MOTOBOY"
        ? orders.filter((o) => o.assignedMotoboyId === user.id)
        : isDeliveryKitchenUser
          ? orders.filter(isDeliveryOrPickupOrder)
          : isNormalKitchenUser
            ? orders.filter(isLocalKitchenOrder)
            : orders;

    return roleFiltered
      .filter((order) => !isTotemWaitingPayment(order))
      .map((order) => ({
        ...order,
        items: getKitchenItems(order),
      }))
      .filter(hasKitchenItems);
  }, [isDeliveryKitchenUser, isNormalKitchenUser, orders, user]);

  const {
    mutate: assignMotoboy,
    variables: assignVars,
    isPending: isAssigning,
  } = useMutation({
    mutationFn: async ({ orderId, motoboyId }) => {
      await api.patch(`/orders/${orderId}/assign-motoboy`, { motoboyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
      toast.success(t("KITCHEN_MOTOBOY_ASSIGNED", "Motoboy atribuído"));
    },
    onError: () =>
      toast.error(t("KITCHEN_MOTOBOY_ERROR", "Falha ao atribuir motoboy")),
  });

  const {
    mutate: confirmDelivery,
    variables: deliveryConfirmVars,
    isPending: isConfirmingDelivery,
  } = useMutation({
    mutationFn: async ({ orderId, code }) => {
      await api.post(`/orders/${orderId}/confirm-delivery`, { code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
      toast.success(
        t("KITCHEN_DELIVERY_CONFIRMED_TOAST", "Entrega confirmada!"),
      );
    },
    onError: (err) => {
      const msg = err.response?.data?.message ?? "Código inválido";
      toast.error(msg);
    },
  });

  const {
    mutate: cancelOrder,
    variables: cancelVars,
    isPending: isCancelling,
  } = useMutation({
    mutationFn: async (orderId) => {
      const res = await api.patch(`/orders/${orderId}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
      toast.success(t("KITCHEN_ORDER_CANCELLED", "Pedido cancelado"));
    },
    onError: () =>
      toast.error(t("KITCHEN_CANCEL_ERROR", "Falha ao cancelar pedido")),
  });

  const {
    mutate: setPaymentStatus,
    variables: paymentVars,
    isPending: isPaymentPending,
  } = useMutation({
    mutationFn: async ({
      orderId,
      paymentStatus,
      paymentMethod,
      advanceTo,
      payLater,
    }) => {
      await api.patch(`/orders/${orderId}/payment-status`, {
        paymentStatus,
        ...(paymentMethod ? { paymentMethod } : {}),
        ...(payLater ? { payLater: true } : {}),
      });
      if (advanceTo) {
        await api.patch(`/orders/${orderId}/status`, { status: advanceTo });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
      toast.success(t("KITCHEN_UPDATED_SUCCESS", "Atualizado com sucesso"));
    },
    onError: () => toast.error(t("KITCHEN_UPDATE_ERROR", "Falha ao atualizar")),
  });

  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--";
  const currentNow = useMemo(() => new Date(now), [now]);
  const overdueCount = useMemo(
    () =>
      visibleOrders.filter((order) => getOrderEta(order, currentNow)?.isOverdue)
        .length,
    [currentNow, visibleOrders],
  );
  const overdueIds = useMemo(
    () =>
      visibleOrders
        .filter((order) => getOrderEta(order, currentNow)?.isOverdue)
        .map((order) => order.id),
    [currentNow, visibleOrders],
  );
  const getColumnOrders = useCallback(
    (columnKey) => {
      if (columnKey === "AGUARDANDO_PAGAMENTO") {
        // Mesa orders never ficam aqui — vão direto pro status real
        return visibleOrders.filter(
          (o) =>
            (o.status === "RECEBIDO" || o.status === "PREPARANDO") &&
            o.paymentStatus === "PENDENTE" &&
            o.paymentMethod !== "PAGAR_DEPOIS" &&
            o.paymentMethod !== "MAQUININHA_TOTEM" &&
            !o.mesaId,
        );
      }
      if (columnKey === "SAIU_PARA_ENTREGA") {
        // Só entregas normais (não mesa, não retirada)
        return visibleOrders.filter(
          (o) => o.status === "SAIU_PARA_ENTREGA" && !o.isPickup && !o.mesaId,
        );
      }
      if (columnKey === "RETIRADA_PRONTA") {
        return visibleOrders.filter(
          (o) => o.status === "SAIU_PARA_ENTREGA" && o.isPickup,
        );
      }
      if (columnKey === "LEVAR_PARA_MESA") {
        return visibleOrders.filter(
          (o) => o.status === "SAIU_PARA_ENTREGA" && !!o.mesaId,
        );
      }
      return visibleOrders.filter((o) => o.status === columnKey);
    },
    [visibleOrders],
  );

  const handleConfirmPayment = useCallback(
    async (orderId) => {
      const paymentMethod = await askPaymentMethod({
        title: "Confirmar pagamento",
        text: "Escolha a forma de pagamento recebida.",
      });
      if (!paymentMethod) return;
      setPaymentStatus({
        orderId,
        paymentStatus: "APROVADO",
        paymentMethod,
      });
    },
    [setPaymentStatus],
  );

  const stageCounts = useMemo(
    () =>
      COLUMNS.map((col) => ({
        ...col,
        count: getColumnOrders(col.key).length,
      })),
    [getColumnOrders],
  );
  const previousStageCountsRef = useRef({});
  const [changedStageKeys, setChangedStageKeys] = useState([]);

  useEffect(() => {
    const previousIds = previousOverdueIdsRef.current;
    const newOverdueIds = overdueIds.filter(
      (orderId) => !previousIds.includes(orderId),
    );

    if (newOverdueIds.length && effectiveSoundEnabled) {
      playKitchenAlertTone("overdue");
      toast.error(
        t(
          "KITCHEN_OVERDUE_ALERT",
          "{{count}} pedido(s) entraram em atraso",
        ).replace("{{count}}", String(newOverdueIds.length)),
      );
    }

    previousOverdueIdsRef.current = overdueIds;
  }, [overdueIds, effectiveSoundEnabled, t]);

  useEffect(() => {
    const changedKeys = stageCounts
      .filter(
        (stage) => previousStageCountsRef.current[stage.key] !== undefined,
      )
      .filter(
        (stage) => previousStageCountsRef.current[stage.key] !== stage.count,
      )
      .map((stage) => stage.key);

    if (changedKeys.length) {
      setChangedStageKeys(changedKeys);
      const timeoutId = window.setTimeout(() => {
        setChangedStageKeys([]);
      }, 1400);

      previousStageCountsRef.current = Object.fromEntries(
        stageCounts.map((stage) => [stage.key, stage.count]),
      );

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    previousStageCountsRef.current = Object.fromEntries(
      stageCounts.map((stage) => [stage.key, stage.count]),
    );
  }, [stageCounts]);

  const visibleColumnKeys = isPreparationOnlyKitchen
    ? ["PREPARANDO"]
    : isDeliveryKitchenUser
      ? [
          "RECEBIDO",
          "PREPARANDO",
          "PRONTO",
          "RETIRADA_PRONTA",
          "SAIU_PARA_ENTREGA",
        ]
      : user?.role === "ATENDENTE"
        ? ["LEVAR_PARA_MESA"]
        : user?.role === "FUNCIONARIO"
          ? [
              "AGUARDANDO_PAGAMENTO",
              "PRONTO",
              "SAIU_PARA_ENTREGA",
              "RETIRADA_PRONTA",
            ]
          : null;
  const visibleColumns = visibleColumnKeys
    ? COLUMNS.filter((column) => visibleColumnKeys.includes(column.key))
    : COLUMNS;
  const visibleStageCounts = stageCounts.filter((stage) =>
    visibleColumns.some((column) => column.key === stage.key),
  );
  const showStageSummary = !isPreparationOnlyKitchen;
  const showWaiterCalls = !isKitchenUser;
  const showHeaderDetails = !isPreparationOnlyKitchen;
  const kitchenPreparationOrders = useMemo(() => {
    if (!isPreparationOnlyKitchen) return [];

    return [
      ...getColumnOrders("RECEBIDO"),
      ...getColumnOrders("PREPARANDO"),
    ].sort((a, b) => compareOrdersByUrgency(a, b, currentNow));
  }, [currentNow, getColumnOrders, isPreparationOnlyKitchen]);

  if (isPreparationOnlyKitchen) {
    return (
      <main className="min-h-screen text-gray-900">
        <header className="sticky top-0 z-30 bg-primary text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <img
                src="/LogoDuBob.png"
                alt="Dubob"
                className="h-10 w-10 rounded-xl object-contain"
              />
              <div>
                <h1 className="font-display text-xl font-bold leading-tight sm:text-2xl">
                  {t("KITCHEN_TITLE", "Cozinha")}
                </h1>
                <p className="text-xs font-bold text-gold">
                  {kitchenPreparationOrders.length}{" "}
                  {kitchenPreparationOrders.length === 1
                    ? "pedido em preparo"
                    : "pedidos em preparo"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-xs font-bold text-white/80">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                </span>
                {t("KITCHEN_LIVE", "Ao vivo")}
              </span>
              <button
                type="button"
                onClick={logout}
                className="ui-btn ui-btn-sm ui-btn-on-dark"
              >
                Sair
              </button>
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-6">
        {!isLoading && !isError && (
          <>
            {kitchenPreparationOrders.length === 0 ? (
              <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center text-center">
                <div className="rounded-[2rem] border-2 border-dashed border-primary/20 bg-white/70 px-6 py-10 sm:px-10">
                  <p className="font-display text-3xl font-bold text-primary sm:text-5xl">
                    Sem pedidos no momento
                  </p>
                  <p className="mt-4 text-lg font-bold text-text-muted sm:text-2xl">
                    A cozinha está aguardando novos pedidos.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {kitchenPreparationOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    now={currentNow}
                    products={products}
                    isFresh={freshOrderIds.includes(order.id)}
                    dragging={false}
                    advancing={isPending && advancingVars?.orderId === order.id}
                    onDragStart={() => {}}
                    onDragEnd={() => {}}
                    onAdvance={(orderId, status) =>
                      advance({ orderId, status })
                    }
                    largeMode
                  />
                ))}
              </div>
            )}
          </>
        )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-gray-900">
      <header className="sticky top-0 z-30 bg-primary text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/LogoDuBob.png"
              alt="Dubob"
              className="h-9 w-9 shrink-0 rounded-xl object-contain"
            />
            <h1 className="font-display text-xl font-bold leading-tight sm:text-2xl">
              {isDeliveryKitchenUser || location.pathname === "/cozinha-delivery"
                ? "Cozinha Delivery"
                : t("KITCHEN_TITLE", "Cozinha")}
            </h1>
            <span className="flex items-center gap-1.5 text-xs font-bold text-white/80">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
              {t("KITCHEN_LIVE", "Ao vivo")}
            </span>
            {showHeaderDetails && (
              <span className="hidden text-xs text-white/60 lg:inline">
                atualizado às {lastUpdate}
              </span>
            )}
            {showHeaderDetails && overdueCount > 0 && (
              <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
                {t(
                  "KITCHEN_OVERDUE_COUNT",
                  "{{count}} pedidos em atraso",
                ).replace("{{count}}", String(overdueCount))}
              </span>
            )}
            {showHeaderDetails && unreadCount > 0 && (
              <span className="rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-primary">
                {t(
                  "KITCHEN_UNREAD_ALERTS",
                  "{{count}} novos alertas não lidos",
                ).replace("{{count}}", String(unreadCount))}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGoBack}
              className="ui-btn ui-btn-sm ui-btn-on-dark"
            >
              {t("BTN_BACK", "Voltar")}
            </button>
            <button
              type="button"
              onClick={handleClearAlerts}
              className="ui-btn ui-btn-sm ui-btn-on-dark"
            >
              {t("KITCHEN_CLEAR_ALERTS", "Limpar alertas")}
              {unreadCount ? ` (${unreadCount})` : ""}
            </button>
            <button
              type="button"
              onClick={handleDesktopToggle}
              title="Notificações na área de trabalho"
              className={`ui-btn ui-btn-sm border-2 ${
                desktopEnabled
                  ? "border-gold bg-gold text-primary"
                  : "border-white/25 text-white hover:border-white"
              }`}
            >
              {desktopEnabled ? "Desktop ligado" : "Desktop desligado"}
            </button>
            <button
              type="button"
              onClick={() => setSoundEnabled((current) => !current)}
              title="Som de novo pedido"
              className={`ui-btn ui-btn-sm border-2 ${
                soundEnabled
                  ? "border-gold bg-gold text-primary"
                  : "border-white/25 text-white hover:border-white"
              }`}
            >
              {soundEnabled ? "🔔 Som ligado" : "🔕 Som desligado"}
            </button>
          </div>
        </div>
      </header>
      <div className="w-full px-4 py-5 sm:px-6">

      {showStageSummary && (
        <nav
          className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Etapas"
        >
          {visibleStageCounts.map((stage) => {
            const changed = changedStageKeys.includes(stage.key);
            return (
              <button
                key={stage.key}
                type="button"
                onClick={() => scrollToColumn(stage.key)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-card ring-1 transition ${
                  changed
                    ? "scale-105 bg-gold text-primary ring-gold"
                    : "bg-white text-primary ring-primary/5 hover:ring-secondary/40"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${COLUMN_DOT[stage.key] ?? "bg-gray-400"}`}
                  aria-hidden="true"
                />
                {t(`KITCHEN_COLUMN_${stage.key}`, stage.label)}
                <span className="rounded-full bg-accent px-2 py-0.5 font-display text-sm">
                  {stage.count}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {showWaiterCalls &&
        (waiterCalls.length === 0 ? (
          <p className="mb-5 flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-text-muted ring-1 ring-primary/5">
            🛎 {t("KITCHEN_WAITER_CALLS_EMPTY", "Nenhum chamado de mesa agora.")}
          </p>
        ) : (
          <section className="mb-5 rounded-3xl bg-gold/20 p-4 ring-2 ring-gold">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-primary">
                🛎 {t("KITCHEN_WAITER_CALLS_TITLE", "Chamadas de mesa")} (
                {waiterCalls.length})
              </h2>
              <button
                type="button"
                onClick={handleClearAlerts}
                className="ui-btn ui-btn-sm ui-btn-outline"
              >
                {t("KITCHEN_CLEAR_WAITER_CALLS", "Limpar chamadas")}
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {waiterCalls.map((call, index) => (
                <article
                  key={`${call.mesaId ?? "mesa"}-${call.timestamp ?? index}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-card"
                >
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold text-primary">
                      {call?.mesaNumber
                        ? t("KITCHEN_TABLE_NUMBER", "Mesa {{number}}").replace(
                            "{{number}}",
                            String(call.mesaNumber),
                          )
                        : t("KITCHEN_GENERIC_TABLE", "Mesa")}
                    </p>
                    <p className="text-xs font-semibold text-text-muted">
                      {formatRelativeTime(call?.timestamp)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDismissWaiterCall(call, index)}
                    className="ui-btn ui-btn-sm ui-btn-success"
                  >
                    Atendido
                  </button>
                </article>
              ))}
            </div>
          </section>
        ))}

      {latestAlert ? (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl bg-gold px-4 py-3 text-sm text-primary shadow-card">
          <div>
            <p className="font-semibold">
              {t(
                "KITCHEN_NEW_ORDER_ARRIVED",
                "Novo pedido {{id}} chegou na fila",
              ).replace(
                "{{id}}",
                `#${latestAlert.orderId.slice(-6).toUpperCase()}`,
              )}
            </p>
            <p className="text-xs text-primary">
              {t(
                "KITCHEN_HIGHLIGHT_SECONDS",
                "Destaque ativo por {{seconds}} segundos.",
              ).replace(
                "{{seconds}}",
                String(Math.floor(NEW_ORDER_HIGHLIGHT_MS / 1000)),
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLatestAlert(null)}
            className="rounded-full border border-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/5"
          >
            {t("BTN_CLOSE", "Fechar")}
          </button>
        </div>
      ) : null}

      {isLoading && (
        <div className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 rounded-3xl bg-white/70" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-300">
          {t("KITCHEN_LOAD_ERROR", "Falha ao carregar pedidos.")}
        </p>
      )}

      {/* Kanban columns */}
      {!isLoading && !isError && (
        <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:scroll-px-6 sm:px-6">
          {visibleColumns.map((col) => {
            const isVirtual = col.virtual;
            const stageOrders = getColumnOrders(col.key).sort((a, b) =>
              compareOrdersByUrgency(a, b, currentNow),
            );
            const canDropHere = draggedOrder?.dropColumnKey === col.key;
            const isDropActive = activeDropStage === col.key && canDropHere;

            return (
              <section
                key={col.key}
                onDragOver={(event) => {
                  if (!canDropHere) return;
                  event.preventDefault();
                  setActiveDropStage(col.key);
                }}
                onDragLeave={() => {
                  if (activeDropStage === col.key) setActiveDropStage(null);
                }}
                onDrop={() => {
                  if (!draggedOrder || draggedOrder.dropColumnKey !== col.key) {
                    handleDragEnd();
                    return;
                  }
                  advance({
                    orderId: draggedOrder.id,
                    status: draggedOrder.nextStatus,
                  });
                  handleDragEnd();
                }}
                id={`kitchen-col-${col.key}`}
                className={`flex w-[88vw] max-w-[28rem] shrink-0 snap-start flex-col rounded-3xl bg-white/60 p-3 ring-1 transition-all duration-200 sm:w-[26rem] ${
                  visibleColumns.length <= 3 ? "lg:max-w-none lg:flex-1" : ""
                } ${
                  isDropActive
                    ? "bg-gold/20 ring-2 ring-gold"
                    : canDropHere
                      ? "ring-2 ring-dashed ring-gold/50"
                      : "ring-primary/5"
                }`}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-primary">
                    <span
                      className={`h-3 w-3 rounded-full ${COLUMN_DOT[col.key] ?? "bg-gray-400"}`}
                      aria-hidden="true"
                    />
                    {t(`KITCHEN_COLUMN_${col.key}`, col.label)}
                  </h2>
                  <span className="rounded-full bg-primary px-2.5 py-0.5 font-display text-sm font-bold text-white">
                    {stageOrders.length}
                  </span>
                </div>

                {isDropActive ? (
                  <div className="mb-3 rounded-2xl border border-secondary/50 bg-gold/10 px-3 py-2 text-center text-xs font-semibold text-primary">
                    {t(
                      "KITCHEN_DROP_TO_STAGE",
                      "Solte aqui para mover para {{stage}}",
                    ).replace(
                      "{{stage}}",
                      t(`KITCHEN_COLUMN_${col.key}`, col.label),
                    )}
                  </div>
                ) : null}

                <div className="space-y-3">
                  {stageOrders.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-primary/10 p-6 text-center text-sm font-semibold text-text-muted">
                      {t("KITCHEN_NO_ORDER", "Nenhum pedido")}
                    </div>
                  ) : (
                    stageOrders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        now={currentNow}
                        products={products}
                        isFresh={freshOrderIds.includes(order.id)}
                        dragging={draggedOrder?.id === order.id}
                        advancing={
                          isPending && advancingVars?.orderId === order.id
                        }
                        onDragStart={isVirtual ? () => {} : handleDragStart}
                        onDragEnd={handleDragEnd}
                        onAdvance={(orderId, status) =>
                          advance({ orderId, status })
                        }
                        onConfirmPayment={
                          isVirtual && col.key === "AGUARDANDO_PAGAMENTO"
                            ? handleConfirmPayment
                            : undefined
                        }
                        onPayLater={
                          isVirtual && col.key === "AGUARDANDO_PAGAMENTO"
                            ? (orderId) =>
                                setPaymentStatus({
                                  orderId,
                                  paymentStatus: "PENDENTE",
                                  payLater: true,
                                })
                            : undefined
                        }
                        confirmingPayment={
                          isPaymentPending && paymentVars?.orderId === order.id
                        }
                        onCancel={cancelOrder}
                        cancelling={isCancelling && cancelVars === order.id}
                        motoboys={motoboys}
                        onAssignMotoboy={
                          !order.isPickup && !order.mesaId
                            ? (orderId, motoboyId) =>
                                assignMotoboy({ orderId, motoboyId })
                            : undefined
                        }
                        assigningMotoboy={
                          isAssigning && assignVars?.orderId === order.id
                        }
                        onConfirmDelivery={
                          !order.isPickup && !order.mesaId
                            ? (orderId, code) =>
                                confirmDelivery({ orderId, code })
                            : undefined
                        }
                        confirmingDelivery={
                          isConfirmingDelivery &&
                          deliveryConfirmVars?.orderId === order.id
                        }
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {!isLoading && !isError && orders.length === 0 && (
        <p className="mt-10 text-center text-smoke">
          {t("KITCHEN_NO_ACTIVE_ORDERS", "Sem pedidos ativos no momento.")}
        </p>
      )}
      </div>
    </main>
  );
}

export default KitchenPage;
