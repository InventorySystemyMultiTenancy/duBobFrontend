import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";

// Retirada (totem/balcão) pronta pula o PRONTO e fica em SAIU_PARA_ENTREGA
// esperando o cliente: na TV ela também aparece como pronta.
function getTvStatus(order) {
  if (order.status === "PREPARANDO") return "PREPARANDO";
  if (order.status === "PRONTO") return "PRONTO";
  if (order.status === "SAIU_PARA_ENTREGA" && order.isPickup) return "PRONTO";
  return null;
}

// Mais que isso não cabe nem em TV grande; o resto fica para a próxima atualização
const MAX_TILES = 40;

const STATUS_CONFIG = {
  PREPARANDO: {
    title: "Pedido Preparando",
    subtitle: "Seu pedido está em preparo",
    panel: "border-secondary/50 bg-white",
    text: "text-primary",
  },
  PRONTO: {
    title: "Pedido Pronto",
    subtitle: "Pode retirar no balcão",
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
  const config = STATUS_CONFIG[getTvStatus(order)] ?? STATUS_CONFIG.PREPARANDO;

  return (
    <article
      className={`flex flex-col justify-center rounded-3xl border px-6 py-5 shadow-card ${config.panel}`}
    >
      {/* O status já está no título da coluna: o nome usa a largura toda */}
      <p className="text-sm font-black uppercase tracking-[0.22em] text-smoke">
        {getOrderDetail(order)}
      </p>
      <h2
        className={`mt-2 break-words font-display text-4xl font-black leading-none ${config.text}`}
      >
        {getOrderCode(order)}
      </h2>
    </article>
  );
}

function StatusColumn({ status, orders }) {
  const config = STATUS_CONFIG[status];

  return (
    <section className="flex min-h-0 flex-col">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-bold leading-none text-white sm:text-5xl">
            {config.title}
          </h2>
          <p className="mt-2 text-lg font-semibold text-white/70">
            {config.subtitle}
          </p>
        </div>
        <span className="rounded-full bg-gold px-5 py-1.5 font-display text-2xl font-bold text-primary shadow-lg sm:px-6 sm:py-2 sm:text-4xl">
          {orders.length}
        </span>
      </div>

      {/* TV larga: cada status vira várias colunas de pedidos */}
      <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] content-start gap-4 overflow-hidden">
        {orders.length ? (
          orders.slice(0, MAX_TILES).map((order) => (
            <OrderTile key={order.id} order={order} />
          ))
        ) : (
          <div className="col-span-full flex min-h-36 items-center justify-center rounded-3xl border-2 border-dashed border-white/20 text-xl font-semibold text-white/60">
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
        .filter((order) => getTvStatus(order))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [orders],
  );

  const preparing = visibleOrders.filter(
    (order) => getTvStatus(order) === "PREPARANDO",
  );
  const ready = visibleOrders.filter(
    (order) => getTvStatus(order) === "PRONTO",
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-primary px-4 py-5 text-white sm:px-8 sm:py-7">
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-[30rem] w-[30rem] rounded-full bg-secondary/35 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 right-0 h-[30rem] w-[30rem] rounded-full bg-accent-dark/20 blur-3xl"
        aria-hidden="true"
      />
      <header className="relative mb-6 flex items-center gap-3 sm:gap-5">
        <img
          src="/LogoDuBob.png"
          alt="Dubob"
          className="h-12 w-12 rounded-2xl object-contain shadow-xl sm:h-16 sm:w-16"
        />
        <p className="text-sm font-black uppercase tracking-[0.32em] text-gold sm:text-2xl">
          Acompanhe seu pedido
        </p>
      </header>

      {isLoading ? (
        <div className="rounded-3xl shadow-card ring-1 ring-primary/5 bg-white p-8 text-2xl font-semibold text-smoke">
          Carregando pedidos...
        </div>
      ) : isError ? (
        <div className="rounded-3xl border border-secondary/30 bg-white p-8 text-2xl font-semibold text-secondary shadow-card">
          Não foi possível carregar os pedidos.
        </div>
      ) : (
        <div className="relative grid min-h-0 gap-7 lg:h-[calc(100vh-150px)] lg:grid-cols-2">
          <StatusColumn status="PREPARANDO" orders={preparing} />
          <StatusColumn status="PRONTO" orders={ready} />
        </div>
      )}
    </main>
  );
}
