import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import EstimatedTimeBadge from "../components/EstimatedTimeBadge.jsx";
import {
  getDesktopNotificationsEnabled,
  requestDesktopNotificationPermission,
  setDesktopNotificationsEnabled,
  supportsDesktopNotifications,
} from "../lib/desktopNotifications.js";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { compareOrdersByUrgency, getOrderEta } from "../lib/orderEta.js";
import {
  clearStaffUnreadCount,
  getStaffUnreadCount,
  subscribeToStaffUnreadCount,
} from "../lib/staffAlertsStore.js";
import { useTranslation } from "../context/I18nContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import PageHeader from "../components/PageHeader.jsx";
import {
  clearWaiterCalls,
  getWaiterCalls,
  subscribeToWaiterCalls,
} from "../lib/waiterCallsStore.js";

const currency = (v) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Mesas, atendimento, comandas e cardápio de mesa fora do painel por enquanto
const SHOW_MESAS_E_COMANDAS = false;

function AdminPanelPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  // Cadastros (produtos, usuários, totens, mesas) só o ADMIN pode alterar na API.
  const isAdmin = user?.role === "ADMIN";
  const [now, setNow] = useState(() => Date.now());
  const [unreadCount, setUnreadCount] = useState(() => getStaffUnreadCount());
  const [waiterCalls, setWaiterCalls] = useState(() => getWaiterCalls());
  const [desktopEnabled, setDesktopEnabled] = useState(() =>
    getDesktopNotificationsEnabled(),
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => subscribeToStaffUnreadCount(setUnreadCount), []);
  useEffect(() => subscribeToWaiterCalls(setWaiterCalls), []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-orders-preview"],
    queryFn: async () => {
      const response = await api.get("/orders");
      return response.data?.data || [];
    },
  });

  const currentNow = useMemo(() => new Date(now), [now]);

  // Mesas e comandas com pagamento pendente (derivado da mesma query)
  const pendingPaymentOrders = useMemo(() => {
    if (!data) return [];
    return data.filter(
      (o) =>
        (o.mesaId || o.comandaId) &&
        o.paymentStatus !== "APROVADO" &&
        o.status !== "CANCELADO",
    );
  }, [data]);

  const prioritizedOrders = useMemo(
    () =>
      [...(data ?? [])]
        .sort((firstOrder, secondOrder) =>
          compareOrdersByUrgency(firstOrder, secondOrder, currentNow),
        )
        .slice(0, 5),
    [currentNow, data],
  );
  const overdueCount = useMemo(
    () =>
      (data ?? []).filter((order) => getOrderEta(order, currentNow)?.isOverdue)
        .length,
    [currentNow, data],
  );
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

  const handleClearAlerts = () => {
    clearStaffUnreadCount();
    clearWaiterCalls();
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) {
      return t("ADMIN_PANEL_JUST_NOW", "agora");
    }

    const diffMinutes = Math.max(
      0,
      Math.floor((now - new Date(timestamp).getTime()) / 60000),
    );

    if (diffMinutes < 1) {
      return t("ADMIN_PANEL_JUST_NOW", "agora");
    }

    if (diffMinutes === 1) {
      return t("ADMIN_PANEL_ONE_MINUTE_AGO", "há 1 min");
    }

    return t("ADMIN_PANEL_MINUTES_AGO", "há {{count}} min").replace(
      "{{count}}",
      String(diffMinutes),
    );
  };

  return (
    <main className="min-h-screen text-gray-900">
      <PageHeader
        eyebrow={user?.name ? `Olá, ${user.name.split(" ")[0]}` : undefined}
        title={t("ADMIN_PANEL_TITLE", "Painel Admin")}
        subtitle={t(
          "ADMIN_PANEL_SUBTITLE",
          "Visão operacional para equipe da Dubob.",
        )}
        actions={
          <Link to="/" className="ui-btn ui-btn-on-dark">
            {t("ADMIN_PANEL_BACK_HOME", "← Início")}
          </Link>
        }
      />
      <div className="ui-page">

      {/* Status bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {overdueCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
            </span>
            {t(
              "ADMIN_PANEL_OVERDUE_COUNT",
              "{{count}} pedidos em atraso",
            ).replace("{{count}}", String(overdueCount))}
          </span>
        )}
        {overdueCount === 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-400/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
            ✓ {t("ADMIN_PANEL_NO_DELAYS", "Sem atrasos")}
          </span>
        )}
        {unreadCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-gold/10 px-3 py-1 text-xs font-semibold text-primary">
            🔔{" "}
            {t("ADMIN_PANEL_ALERTS_COUNT", "{{count}} alertas").replace(
              "{{count}}",
              String(unreadCount),
            )}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-xs text-smoke">
          🖥{" "}
          {desktopEnabled
            ? t("ADMIN_PANEL_DESKTOP_ON", "Notificações ativas")
            : t("ADMIN_PANEL_DESKTOP_OFF", "Notificações inativas")}
        </span>
      </div>

      {/* Quick action cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {isAdmin && (
          <Link
            to="/admin/produtos"
            className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-2xl">
              🍔
            </span>
            <div>
              <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
                {t(
                  "ADMIN_PANEL_CARD_PRODUCTS_TITLE",
                  "Gerenciar Produtos",
                )}
              </h2>
              <p className="mt-0.5 text-xs text-smoke">
                {t(
                  "ADMIN_PANEL_CARD_PRODUCTS_DESC",
                  "Cadastrar, editar e desativar itens do cardápio",
                )}
              </p>
            </div>
          </Link>
        )}

        <Link
          to="/admin/vendas"
          className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-500/15 text-2xl">
            📈
          </span>
          <div>
            <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
              {t("ADMIN_PANEL_CARD_SALES_TITLE", "Análise de Vendas")}
            </h2>
            <p className="mt-0.5 text-xs text-smoke">
              {t(
                "ADMIN_PANEL_CARD_SALES_DESC",
                "Receita, ticket médio e itens mais vendidos",
              )}
            </p>
          </div>
        </Link>

        <Link
          to="/cozinha"
          className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-500/15 text-2xl">
            👨‍🍳
          </span>
          <div>
            <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
              {t("ADMIN_PANEL_CARD_KITCHEN_TITLE", "Painel da Cozinha")}
            </h2>
            <p className="mt-0.5 text-xs text-smoke">
              {t(
                "ADMIN_PANEL_CARD_KITCHEN_DESC",
                "Ver pedidos ativos e avançar status",
              )}
            </p>
          </div>
        </Link>

        <Link
          to="/admin/historico"
          className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-2xl">
            📋
          </span>
          <div>
            <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
              {t(
                "ADMIN_PANEL_CARD_HISTORY_TITLE",
                "Histórico de Pedidos",
              )}
            </h2>
            <p className="mt-0.5 text-xs text-smoke">
              {t(
                "ADMIN_PANEL_CARD_HISTORY_DESC",
                "Todos os pedidos, cancelamentos e estornos",
              )}
            </p>
          </div>
        </Link>

        {isAdmin && (
          <Link
            to="/admin/usuarios"
            className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-2xl">
              👤
            </span>
            <div>
              <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
                {t("ADMIN_PANEL_CARD_USERS_TITLE", "Criar Usuário")}
              </h2>
              <p className="mt-0.5 text-xs text-smoke">
                {t(
                  "ADMIN_PANEL_CARD_USERS_DESC",
                  "Cadastrar motoboy, cozinha normal, cozinha delivery ou admin",
                )}
              </p>
            </div>
          </Link>
        )}

        {isAdmin && (
          <Link
            to="/admin/totens"
            className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-lg font-black">
              T
            </span>
            <div>
              <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
                Totens
              </h2>
              <p className="mt-0.5 text-xs text-smoke">
                Cadastrar rotas de totem e vincular maquininhas
              </p>
            </div>
          </Link>
        )}

        {isAdmin && (
          <Link
            to="/admin/promocoes"
            className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-2xl">
              🔥
            </span>
            <div>
              <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
                Promoções
              </h2>
              <p className="mt-0.5 text-xs text-smoke">
                Preço especial por tempo limitado e envio no WhatsApp
              </p>
            </div>
          </Link>
        )}

        {isAdmin && (
          <Link
            to="/admin/whatsapp"
            className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-500/15 text-2xl">
              💬
            </span>
            <div>
              <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
                WhatsApp do delivery
              </h2>
              <p className="mt-0.5 text-xs text-smoke">
                Avisos automáticos de pedido para o cliente
              </p>
            </div>
          </Link>
        )}

        {isAdmin && (
          <Link
            to="/admin/ifood"
            className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-2xl">
              🛵
            </span>
            <div>
              <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
                iFood
              </h2>
              <p className="mt-0.5 text-xs text-smoke">
                Pedidos do iFood direto na cozinha
              </p>
            </div>
          </Link>
        )}

        {isAdmin && (
          <Link
            to="/admin/pagamentos"
            className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-2xl">
              💳
            </span>
            <div>
              <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
                Pagamentos
              </h2>
              <p className="mt-0.5 text-xs text-smoke">
                Escolher o banco das maquininhas (Mercado Pago, SumUp)
              </p>
            </div>
          </Link>
        )}

        <Link
          to="/admin/gastos"
          className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-xl font-black">
            -R$
          </span>
          <div>
            <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
              Gastos
            </h2>
            <p className="mt-0.5 text-xs text-smoke">
              Lançar despesas e acompanhar histórico por data
            </p>
          </div>
        </Link>

        <Link
          to="/caixa"
          className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-2xl">
            R$
          </span>
          <div>
            <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
              Caixa
            </h2>
            <p className="mt-0.5 text-xs text-smoke">
              Baixar pagamentos pendentes de mesas, comandas e entregas
            </p>
          </div>
        </Link>
        {SHOW_MESAS_E_COMANDAS && (
          <>
          <Link
            to="/atendente"
            className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-2xl">
              🧾
            </span>
            <div>
              <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
                Atendimento
              </h2>
              <p className="mt-0.5 text-xs text-smoke">
                Mapa de mesas, lançar pedidos e chamados de garçom
              </p>
            </div>
          </Link>
          <Link
            to="/comandas"
            className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-2xl">
              🎫
            </span>
            <div>
              <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
                Comandas
              </h2>
              <p className="mt-0.5 text-xs text-smoke">
                Abrir comandas, lançar pedidos e dar baixa
              </p>
            </div>
          </Link>
          </>
        )}
        <Link
          to="/cozinha-delivery"
          className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-2xl">
            🛵
          </span>
          <div>
            <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
              Cozinha Delivery
            </h2>
            <p className="mt-0.5 text-xs text-smoke">
              Fila só de entregas e retiradas
            </p>
          </div>
        </Link>
        <Link
          to="/motoboy"
          className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lime-500/15 text-2xl">
            🏍️
          </span>
          <div>
            <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
              Motoboy
            </h2>
            <p className="mt-0.5 text-xs text-smoke">
              Entregas atribuídas e confirmação de pagamento
            </p>
          </div>
        </Link>
        <Link
          to="/tv"
          className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-2xl">
            📺
          </span>
          <div>
            <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
              TV / Telão
            </h2>
            <p className="mt-0.5 text-xs text-smoke">
              Tela de pedidos prontos para o cliente
            </p>
          </div>
        </Link>
        {isAdmin && (
          <>
            {SHOW_MESAS_E_COMANDAS && (
              <Link
                to="/admin/mesas"
                className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-2xl">
                  🪑
                </span>
                <div>
                  <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
                    Mesas
                  </h2>
                  <p className="mt-0.5 text-xs text-smoke">
                    Cadastrar mesas e gerar o QR Code de pedido
                  </p>
                </div>
              </Link>
            )}
            {SHOW_MESAS_E_COMANDAS && (
              <Link
                to="/admin/cardapio-mesa"
                className="group ui-card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-2xl">
                  🔳
                </span>
                <div>
                  <h2 className="font-semibold text-gray-900 group-hover:text-secondary">
                    QR do Cardápio de Mesa
                  </h2>
                  <p className="mt-0.5 text-xs text-smoke">
                    Imprimir QR Codes do cardápio só para visualização
                  </p>
                </div>
              </Link>
            )}
          </>
        )}
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-smoke">
          {t("ADMIN_PANEL_LOADING", "Carregando dados...")}
        </p>
      ) : null}
      {isError ? (
        <p className="mt-6 text-sm text-red-300">
          {t(
            "ADMIN_PANEL_LOAD_ERROR",
            "Falha ao carregar dados do painel.",
          )}
        </p>
      ) : null}

      <section className="mt-6 rounded-3xl shadow-card ring-1 ring-primary/5 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-primary">
              🔔{" "}
              {t("ADMIN_PANEL_WAITER_CALLS_TITLE", "Chamadas de Mesa")}
            </h2>
            <p className="mt-1 text-xs text-smoke">
              {t(
                "ADMIN_PANEL_WAITER_CALLS_DESC",
                "Solicitações recentes de atendimento enviadas pelas mesas.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearAlerts}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-smoke transition hover:border-secondary/30 hover:text-secondary"
          >
            {t("ADMIN_PANEL_CLEAR_WAITER_CALLS", "Limpar chamadas")}
            {waiterCalls.length ? ` (${waiterCalls.length})` : ""}
          </button>
        </div>

        <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {waiterCalls.map((call, index) => (
            <li
              key={`${call.mesaId ?? "mesa"}-${call.timestamp ?? index}`}
              className="rounded-2xl border border-secondary/15 bg-accent/60 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg text-primary">
                    {call?.mesaNumber
                      ? t(
                          "ADMIN_PANEL_TABLE_NUMBER",
                          "Mesa {{number}}",
                        ).replace("{{number}}", String(call.mesaNumber))
                      : t("ADMIN_PANEL_GENERIC_TABLE", "Mesa")}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-secondary">
                    {t(
                      "ADMIN_PANEL_SERVICE_REQUEST",
                      "Atendimento solicitado",
                    )}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-text-muted shadow-sm">
                  {formatRelativeTime(call?.timestamp)}
                </span>
              </div>
            </li>
          ))}
          {!waiterCalls.length ? (
            <li className="rounded-2xl border border-dashed border-border-soft bg-accent/40 p-4 text-sm text-smoke md:col-span-2 xl:col-span-3">
              {t(
                "ADMIN_PANEL_WAITER_CALLS_EMPTY",
                "Nenhuma chamada de mesa registrada por enquanto.",
              )}
            </li>
          ) : null}
        </ul>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Fila Prioritária */}
        <section className="rounded-3xl shadow-card ring-1 ring-primary/5 bg-white p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl text-primary">
              🔥{" "}
              {t(
                "ADMIN_PANEL_PRIORITY_QUEUE_TITLE",
                "Fila Prioritária",
              )}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDesktopToggle}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  desktopEnabled
                    ? "border-primary/10 text-primary hover:bg-primary/5"
                    : "border-gray-200 text-smoke hover:border-secondary/40 hover:text-secondary"
                }`}
              >
                🖥{" "}
                {desktopEnabled
                  ? t("ADMIN_PANEL_DESKTOP_BUTTON_ON", "ligado")
                  : t("ADMIN_PANEL_DESKTOP_BUTTON_OFF", "desligado")}
              </button>
              <button
                type="button"
                onClick={handleClearAlerts}
                className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-smoke transition hover:border-secondary/40 hover:text-secondary"
              >
                {t("ADMIN_PANEL_MARK_ALERTS_READ", "Limpar alertas")}
                {unreadCount ? ` (${unreadCount})` : ""}
              </button>
            </div>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {prioritizedOrders.map((order) => (
              <li
                key={order.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                  getOrderEta(order, currentNow)?.isOverdue
                    ? "border-red-500/40 bg-red-500/5"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    #{order.id.slice(-6).toUpperCase()}
                  </p>
                  <p className="mt-0.5 text-xs text-smoke">
                    {t(`ORDER_STATUS_${order.status}`, order.status)}
                  </p>
                </div>
                <EstimatedTimeBadge compact now={currentNow} order={order} />
              </li>
            ))}
            {!prioritizedOrders.length && !isLoading ? (
              <li className="text-sm text-smoke">
                {t(
                  "ADMIN_PANEL_NO_ORDERS",
                  "Sem pedidos ativos no momento.",
                )}
              </li>
            ) : null}
          </ul>
        </section>

        {/* Mesas e comandas com pagamento pendente */}
        <section className="rounded-3xl border border-amber-400/30 bg-white p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl text-amber-500">
              💳{" "}
              {t(
                "ADMIN_PANEL_PENDING_PAYMENTS_TITLE",
                "Pagamentos Pendentes",
              )}
            </h2>
            {pendingPaymentOrders.length > 0 && (
              <span className="animate-pulse rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                {pendingPaymentOrders.length}
              </span>
            )}
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {pendingPaymentOrders.map((order) => (
              <li
                key={order.id}
                className="rounded-xl border border-amber-400/40 bg-amber-50 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-amber-800">
                    {order.mesa
                      ? (order.mesa.name ??
                        t("ADMIN_PANEL_MESA_LABEL", "Mesa"))
                      : order.comanda
                        ? `Comanda ${order.comanda.number}`
                        : "Comanda"}
                  </p>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    {currency(order.total)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-amber-700">
                  #{order.id.slice(-6).toUpperCase()} ·{" "}
                  {t(
                    `PAYMENT_STATUS_${order.paymentStatus ?? "PENDENTE"}`,
                    order.paymentStatus ?? "PENDENTE",
                  )}
                </p>
              </li>
            ))}
            {!pendingPaymentOrders.length && !isLoading ? (
              <li className="text-sm text-smoke">
                {t(
                  "ADMIN_PANEL_NO_PENDING_PAYMENTS",
                  "Nenhuma mesa ou comanda com pagamento pendente.",
                )}
              </li>
            ) : null}
          </ul>
        </section>
      </div>
      </div>
    </main>
  );
}

export default AdminPanelPage;
