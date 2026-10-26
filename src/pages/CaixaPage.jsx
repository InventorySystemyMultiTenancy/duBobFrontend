import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.js";
import { getRoleHome } from "../lib/roleHome.js";
import { askPaymentMethod } from "../lib/paymentMethodPrompt.js";

import PageHeader from "../components/PageHeader.jsx";
import { getOrderStatusLabel } from "../lib/orderStatus.js";
const currency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function isTotemOrder(order) {
  return (
    order.paymentMethod === "MAQUININHA_TOTEM" ||
    String(order.notes || "").includes("Pedido feito no Totem")
  );
}

const PAYMENT_METHOD_LABEL = {
  DINHEIRO: "💵 Paga em dinheiro",
  PRESENCIAL: "💵 Paga na entrega",
  MAQUININHA_TOTEM: "💳 Maquininha do totem",
  PIX: "Pix online",
};

// Entrega/retirada/totem só vão para a cozinha depois de pagos
function canReleaseToKitchen(order) {
  return (
    !order.mesaId &&
    !order.comandaId &&
    order.paymentMethod !== "PAGAR_DEPOIS" &&
    (order.status === "RECEBIDO" || order.status === "PREPARANDO")
  );
}

function getOrigin(order) {
  if (isTotemOrder(order)) {
    const totem = String(order.notes || "").match(/Totem\s*(\d+)/i);
    return {
      type: "Totem",
      title: totem ? `Totem ${totem[1]}` : "Totem",
      subtitle: order.user?.name ?? "Cliente",
      tone: "bg-indigo-50 text-indigo-800 border-indigo-200",
    };
  }

  if (order.comanda) {
    return {
      type: "Comanda",
      title: `Comanda ${order.comanda.number}`,
      subtitle: order.comanda.name,
      tone: "bg-purple-50 text-purple-800 border-purple-200",
    };
  }

  if (order.mesa) {
    return {
      type: "Mesa",
      title: order.mesa.name ?? `Mesa ${order.mesa.number ?? ""}`.trim(),
      subtitle: order.mesa.number ? `Mesa ${order.mesa.number}` : "Mesa",
      tone: "bg-blue-50 text-blue-800 border-blue-200",
    };
  }

  if (order.isPickup) {
    return {
      type: "Retirada",
      title: "Retirada no local",
      subtitle: order.user?.name ?? "Cliente",
      tone: "bg-amber-50 text-amber-800 border-amber-200",
    };
  }

  if (order.deliveryAddress) {
    return {
      type: "Entrega",
      title: "Entrega",
      subtitle: order.user?.name ?? order.deliveryAddress,
      tone: "bg-green-50 text-green-800 border-green-200",
    };
  }

  return {
    type: "Pedido",
    title: order.user?.name ?? "Pedido",
    subtitle: "Balcao",
    tone: "bg-gray-50 text-gray-800 border-gray-200",
  };
}

function formatTime(value) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PendingOrderCard({ order, onPay, onRelease, onCancel, disabled }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const origin = getOrigin(order);
  const methodLabel = PAYMENT_METHOD_LABEL[order.paymentMethod];
  const waitingKitchen = canReleaseToKitchen(order);

  return (
    <article className="rounded-3xl shadow-card ring-1 ring-primary/5 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${origin.tone}`}
            >
              {origin.type}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
              #{order.id.slice(-6).toUpperCase()}
            </span>
            {methodLabel && (
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-800">
                {methodLabel}
              </span>
            )}
          </div>
          <h2 className="mt-3 text-2xl font-black text-primary">
            {origin.title}
          </h2>
          <p className="mt-1 text-sm font-semibold text-gray-500">
            {origin.subtitle} - {formatTime(order.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-widest text-red-500">
            Em aberto
          </p>
          <p className="text-3xl font-black text-red-600">
            {currency(order.total)}
          </p>
          <p className="mt-1 text-xs font-semibold text-gray-500">
            {getOrderStatusLabel(order)}
          </p>
        </div>
      </div>

      <ul className="mt-5 space-y-2">
        {(order.items ?? []).map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-2xl bg-accent/60 px-4 py-3"
          >
            <span className="text-base font-bold text-gray-900">
              {item.quantity}x {item.product?.name ?? item.productName ?? "Item"}
            </span>
            <span className="text-sm font-black text-primary">
              {currency(item.totalPrice)}
            </span>
          </li>
        ))}
      </ul>

      {waitingKitchen && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          ⏳ Ainda não foi para a cozinha: só vai depois do pagamento.
        </p>
      )}

      {order.notes && !isTotemOrder(order) ? (
        <p className="mt-4 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black uppercase text-white">
          Obs: {order.notes}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => onPay(order)}
        disabled={disabled}
        className="mt-5 w-full rounded-full bg-green-600 px-4 py-4 text-lg font-black uppercase text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
      >
        Dar baixa / pago
      </button>
      {/* Totem paga no caixa antes; "paga depois" é para entrega */}
      {waitingKitchen && onRelease && !isTotemOrder(order) && (
        <button
          type="button"
          onClick={() => onRelease(order)}
          disabled={disabled}
          className="mt-2 w-full rounded-full border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm font-black uppercase text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
        >
          Liberar p/ cozinha (paga depois)
        </button>
      )}

      {onCancel &&
        (confirmCancel ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3">
            <span className="flex-1 text-sm font-bold text-red-700">
              Cancelar pedido #{order.id.slice(-6).toUpperCase()}?
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setConfirmCancel(false);
                onCancel(order);
              }}
              className="ui-btn ui-btn-sm ui-btn-danger"
            >
              Sim, cancelar
            </button>
            <button
              type="button"
              onClick={() => setConfirmCancel(false)}
              className="ui-btn ui-btn-sm ui-btn-outline"
            >
              Não
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setConfirmCancel(true)}
            className="mt-2 w-full py-2 text-sm font-bold text-red-500 transition hover:text-red-700 disabled:opacity-40"
          >
            Cancelar pedido
          </button>
        ))}
    </article>
  );
}

export default function CaixaPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [originFilter, setOriginFilter] = useState("TODOS");
  const [comandaSearch, setComandaSearch] = useState("");

  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ["caixa-pending-payments"],
    queryFn: async () =>
      (await api.get("/orders/pending-payments")).data?.data ?? [],
    refetchInterval: 20_000,
  });

  const markPaid = useMutation({
    mutationFn: async ({ orderId, paymentMethod }) =>
      api.patch(`/orders/${orderId}/mark-paid`, { paymentMethod }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caixa-pending-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders-preview"] });
      queryClient.invalidateQueries({ queryKey: ["comandas-open-totals"] });
      toast.success("Pagamento baixado.");
    },
    onError: (error) =>
      toast.error(
        error?.response?.data?.error?.message ?? "Erro ao baixar pagamento.",
      ),
  });

  // Entrega que paga na porta: libera o preparo e o pagamento fica em aberto
  const releaseToKitchen = useMutation({
    mutationFn: async ({ orderId }) =>
      api.patch(`/orders/${orderId}/payment-status`, {
        paymentStatus: "PENDENTE",
        payLater: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caixa-pending-payments"] });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
      toast.success("Pedido liberado para a cozinha.");
    },
    onError: (error) =>
      toast.error(
        error?.response?.data?.error?.message ?? "Erro ao liberar pedido.",
      ),
  });
  // A API só deixa admin e funcionário mudar o pagamento para "pagar depois"
  // e cancelar pedido
  const canRelease = ["ADMIN", "FUNCIONARIO"].includes(user?.role);

  const cancelOrder = useMutation({
    mutationFn: async ({ orderId }) => api.patch(`/orders/${orderId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caixa-pending-payments"] });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
      toast.success("Pedido cancelado.");
    },
    onError: (error) =>
      toast.error(
        error?.response?.data?.error?.message ??
          error?.response?.data?.message ??
          "Erro ao cancelar pedido.",
      ),
  });

  const totals = useMemo(() => {
    const pendingTotal = orders.reduce(
      (sum, order) => sum + Number(order.total ?? 0),
      0,
    );
    return { count: orders.length, pendingTotal };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const normalizedComandaSearch = comandaSearch.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesOrigin =
        originFilter === "TODOS" || getOrigin(order).type === originFilter;

      if (!matchesOrigin) return false;
      if (!normalizedComandaSearch) return true;

      if (!order.comanda) return false;

      const haystack =
        `${order.comanda.name ?? ""} ${order.comanda.number ?? ""}`.toLowerCase();
      return haystack.includes(normalizedComandaSearch);
    });
  }, [comandaSearch, orders, originFilter]);

  const handlePay = async (order) => {
    const paymentMethod = await askPaymentMethod({
      title: `Baixar ${getOrigin(order).title}`,
      text: `Total em aberto: ${currency(order.total)}`,
    });
    if (paymentMethod) {
      markPaid.mutate({ orderId: order.id, paymentMethod });
    }
  };

  const filters = [
    "TODOS",
    "Totem",
    "Mesa",
    "Comanda",
    "Entrega",
    "Retirada",
    "Pedido",
  ];

  return (
    <main className="min-h-screen text-gray-900">
      <PageHeader
        backTo={getRoleHome(user)}
        title="Caixa"
        subtitle="Todos os pedidos em aberto para receber e dar baixa."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/caixa/novo-pedido" className="ui-btn ui-btn-primary">
              + Novo pedido
            </Link>
            <Link to="/comandas" className="ui-btn ui-btn-on-dark">
              Comandas
            </Link>
          </div>
        }
      />
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">

        <section className="mb-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-red-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-widest text-red-500">
              Total em aberto
            </p>
            <p className="mt-1 text-5xl font-black text-red-600">
              {currency(totals.pendingTotal)}
            </p>
          </div>
          <div className="rounded-3xl shadow-card ring-1 ring-primary/5 bg-white p-5">
            <p className="text-sm font-bold uppercase tracking-widest text-smoke">
              Pedidos pendentes
            </p>
            <p className="mt-1 text-5xl font-black text-primary">
              {totals.count}
            </p>
          </div>
        </section>

        <div className="mb-6 space-y-3">
          <input
            type="search"
            value={comandaSearch}
            onChange={(event) => setComandaSearch(event.target.value)}
            placeholder="Pesquisar comanda por nome ou número"
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-secondary"
          />
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setOriginFilter(filter)}
                className={`rounded-full px-4 py-2 text-sm font-black ${
                  originFilter === filter
                    ? "bg-primary text-white"
                    : "border border-gray-200 bg-white text-gray-600"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center font-bold text-gray-500">
            Carregando caixa...
          </div>
        ) : isError ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center font-bold text-red-600">
            Nao foi possivel carregar os pagamentos pendentes.
          </div>
        ) : !filteredOrders.length ? (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white/70 p-16 text-center">
            <p className="text-3xl font-black uppercase text-primary">
              Sem pagamentos pendentes
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Quando tiver totem, mesa, comanda, entrega ou retirada em aberto, vai
              aparecer aqui.
            </p>
          </div>
        ) : (
          <section className="grid gap-4 xl:grid-cols-2">
            {filteredOrders.map((order) => (
              <PendingOrderCard
                key={order.id}
                order={order}
                onPay={handlePay}
                onRelease={
                  canRelease
                    ? (o) => releaseToKitchen.mutate({ orderId: o.id })
                    : undefined
                }
                onCancel={
                  canRelease
                    ? (o) => cancelOrder.mutate({ orderId: o.id })
                    : undefined
                }
                disabled={
                  markPaid.isPending ||
                  releaseToKitchen.isPending ||
                  cancelOrder.isPending
                }
              />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
