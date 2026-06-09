import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";

const VISIBLE_STATUSES = ["PREPARANDO", "PRONTO"];

const STATUS_CONFIG = {
  PREPARANDO: {
    title: "Preparando",
    subtitle: "Seu pedido está em preparo",
    badge: "bg-gold text-primary",
    panel: "border-gold/45 bg-white",
    text: "text-primary",
  },
  PRONTO: {
    title: "Pronto",
    subtitle: "Pode retirar no balcão",
    badge: "bg-secondary text-white",
    panel: "border-secondary/35 bg-white",
    text: "text-secondary",
  },
};

function getOrderCode(order) {
  if (order.mesa?.number) return `MESA ${order.mesa.number}`;
  if (order.comanda?.number) return `COMANDA ${order.comanda.number}`;
  if (order.user?.name) return order.user.name;
  return `PEDIDO ${String(order.id ?? "").slice(-4).toUpperCase()}`;
}

function getOrderDetail(order) {
  if (order.isPickup) return "Retirada";
  if (order.mesaId) return "Mesa";
  if (order.comandaId) return "Comanda";
  return "Entrega";
}

function OrderTile({ order }) {
  const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PREPARANDO;

  return (
    <article
      className={`flex min-h-36 flex-col justify-between rounded-3xl border p-6 shadow-card ${config.panel}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-smoke">
            {getOrderDetail(order)}
          </p>
          <h2
            className={`mt-2 break-words font-display text-4xl font-black leading-none sm:text-5xl ${config.text}`}
          >
            {getOrderCode(order)}
          </h2>
        </div>
        <span
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-black uppercase tracking-widest ${config.badge}`}
        >
          {config.title}
        </span>
      </div>
      <p className="mt-5 text-xl font-bold text-smoke">
        {config.subtitle}
      </p>
    </article>
  );
}

function StatusColumn({ status, orders }) {
  const config = STATUS_CONFIG[status];

  return (
    <section className="flex min-h-0 flex-col">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-5xl font-black leading-none text-primary">
            {config.title}
          </h2>
          <p className="mt-2 text-lg font-semibold text-smoke">
            {config.subtitle}
          </p>
        </div>
        <span className="rounded-2xl border border-border-soft bg-white px-5 py-2 font-display text-4xl font-black text-primary shadow-card">
          {orders.length}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-min gap-4 overflow-hidden">
        {orders.length ? (
          orders.slice(0, 8).map((order) => (
            <OrderTile key={order.id} order={order} />
          ))
        ) : (
          <div className="flex min-h-36 items-center justify-center rounded-3xl border border-border-soft bg-white/70 text-xl font-semibold text-smoke shadow-card">
            Nenhum pedido agora
          </div>
        )}
      </div>
    </section>
  );
}

export default function TVOrdersPage() {
  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ["tv-orders"],
    queryFn: async () => {
      const response = await api.get("/orders");
      return response.data?.data ?? [];
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });

  const visibleOrders = useMemo(
    () =>
      orders
        .filter((order) => VISIBLE_STATUSES.includes(order.status))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [orders],
  );

  const preparing = visibleOrders.filter(
    (order) => order.status === "PREPARANDO",
  );
  const ready = visibleOrders.filter((order) => order.status === "PRONTO");

  return (
    <main className="min-h-screen overflow-hidden bg-texture px-8 py-7 text-primary">
      <header className="mb-7 flex items-center justify-between gap-6">
        <div>
          <p className="text-lg font-black uppercase tracking-[0.32em] text-secondary">
            Acompanhe seu pedido
          </p>
          <h1 className="mt-2 font-display text-6xl font-black leading-none">
            Status dos Pedidos
          </h1>
        </div>
        <div className="rounded-3xl border border-border-soft bg-white px-6 py-4 text-right shadow-card">
          <p className="text-sm font-bold uppercase tracking-widest text-smoke">
            Atualização
          </p>
          <p className="mt-1 text-2xl font-black text-secondary">
            Automática
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="rounded-3xl border border-border-soft bg-white p-8 text-2xl font-semibold text-smoke shadow-card">
          Carregando pedidos...
        </div>
      ) : isError ? (
        <div className="rounded-3xl border border-secondary/30 bg-white p-8 text-2xl font-semibold text-secondary shadow-card">
          Não foi possível carregar os pedidos.
        </div>
      ) : (
        <div className="grid h-[calc(100vh-190px)] min-h-0 gap-7 lg:grid-cols-2">
          <StatusColumn status="PREPARANDO" orders={preparing} />
          <StatusColumn status="PRONTO" orders={ready} />
        </div>
      )}
    </main>
  );
}
