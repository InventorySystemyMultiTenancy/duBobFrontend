import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.js";
import { askPaymentMethod } from "../lib/paymentMethodPrompt.js";
import { useTranslation } from "../context/I18nContext.jsx";

import PageHeader from "../components/PageHeader.jsx";
import DeliveryMap from "../components/DeliveryMap.jsx";

const SHARE_LOCATION_KEY = "motoboy-share-location";

const readShareLocation = () => {
  try {
    return localStorage.getItem(SHARE_LOCATION_KEY) === "1";
  } catch {
    return false;
  }
};

const currency = (v) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const itemLabel = (item) => item.product?.name ?? "—";

const formatMinutes = (minutes) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${String(m).padStart(2, "0")}min` : `${h}h`;
};

const getWaitingMinutes = (createdAt, now) =>
  Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60000));

// Mesmo limite de atraso usado em lib/orderEta.js (55 min)
const waitingTone = (minutes) =>
  minutes > 55
    ? "border-red-200 bg-red-50 text-red-700"
    : minutes > 40
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-gray-100 bg-gray-50 text-gray-800";

const getGoogleMapsUrl = (order) => {
  const hasAddress = Boolean(order.deliveryAddress);

  if (hasAddress) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.deliveryAddress)}`;
  }

  if (order.deliveryLat != null && order.deliveryLon != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${order.deliveryLat},${order.deliveryLon}`;
  }

  return "https://www.google.com/maps";
};

const getWazeUrl = (order) => {
  const hasAddress = Boolean(order.deliveryAddress);

  if (hasAddress) {
    return `https://waze.com/ul?q=${encodeURIComponent(order.deliveryAddress)}&navigate=yes`;
  }

  if (order.deliveryLat != null && order.deliveryLon != null) {
    return `https://waze.com/ul?ll=${order.deliveryLat},${order.deliveryLon}&navigate=yes`;
  }

  return "https://waze.com/ul";
};

function MotoboyPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [deliveryCodes, setDeliveryCodes] = useState({});
  const [confirmingByOrderId, setConfirmingByOrderId] = useState({});
  const [markingPaidByOrderId, setMarkingPaidByOrderId] = useState({});
  const [now, setNow] = useState(() => Date.now());
  const [shareLocation, setShareLocation] = useState(readShareLocation);
  const [position, setPosition] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(SHARE_LOCATION_KEY, shareLocation ? "1" : "0");
    } catch {
      // armazenamento indisponível: só não lembra a escolha
    }

    if (!shareLocation) {
      setPosition(null);
      return undefined;
    }

    if (!("geolocation" in navigator)) {
      toast.error("Seu navegador não suporta localização.");
      setShareLocation(false);
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) =>
        setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          toast.error(
            "Permissão de localização negada. Libere nas configurações do navegador.",
          );
          setShareLocation(false);
        } else {
          toast.error("Não foi possível obter sua localização.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [shareLocation]);

  // Envia a posição ao servidor (repassada ao cliente) a cada 15 s,
  // mesmo parado, para o cliente não perder o motoboy de vista
  const positionRef = useRef(null);
  positionRef.current = position;
  const hasPosition = Boolean(position);
  useEffect(() => {
    if (!hasPosition || user?.role !== "MOTOBOY") return undefined;

    const send = () => {
      if (!positionRef.current) return;
      api.post("/motoboy/location", positionRef.current).catch(() => {
        // falha pontual: o próximo envio tenta de novo
      });
    };

    send();
    const id = setInterval(send, 15_000);
    return () => clearInterval(id);
  }, [hasPosition, user?.role]);

  // Arredonda (~100 m) para só recalcular as rotas quando o motoboy se mover
  const origin = position
    ? { lat: position.lat.toFixed(3), lon: position.lon.toFixed(3) }
    : null;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["motoboy-orders", origin?.lat, origin?.lon],
    queryFn: async () => {
      const res = await api.get("/motoboy/orders", {
        params: origin ?? undefined,
      });
      return { orders: res.data?.data ?? [], store: res.data?.store ?? null };
    },
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
  });

  const handleConfirmDelivery = async (orderId) => {
    const code = deliveryCodes[orderId] ?? "";

    setConfirmingByOrderId((prev) => ({ ...prev, [orderId]: true }));

    try {
      await api.post(`/orders/${orderId}/confirm-delivery`, { code });
      setDeliveryCodes((prev) => ({ ...prev, [orderId]: "" }));
      toast.success(
        t("MOTOBOY_DELIVERY_CONFIRMED", "Entrega confirmada com sucesso."),
      );
      refetch();
    } catch (error) {
      const message =
        error?.response?.data?.message ??
        t(
          "MOTOBOY_DELIVERY_CONFIRM_ERROR",
          "Não foi possível confirmar a entrega.",
        );
      toast.error(message);
    } finally {
      setConfirmingByOrderId((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleMarkAsPaid = async (orderId) => {
    const paymentMethod = await askPaymentMethod({
      title: t("MOTOBOY_CONFIRM_PAYMENT_TITLE", "Confirmar pagamento?"),
      text: t(
        "MOTOBOY_CONFIRM_PAYMENT_TEXT",
        "Marque como pago somente após receber o valor do cliente.",
      ),
      confirmButtonText: t(
        "MOTOBOY_CONFIRM_PAYMENT_YES",
        "Sim, marcar como pago",
      ),
      cancelButtonText: t("BTN_CANCEL", "Cancelar"),
    });

    if (!paymentMethod) {
      return;
    }

    setMarkingPaidByOrderId((prev) => ({ ...prev, [orderId]: true }));

    try {
      await api.patch(`/orders/${orderId}/mark-paid`, { paymentMethod });
      toast.success(
        t("MOTOBOY_PAYMENT_MARKED", "Pagamento marcado como aprovado."),
      );
      refetch();
    } catch (error) {
      const message =
        error?.response?.data?.message ??
        t(
          "MOTOBOY_PAYMENT_CONFIRM_ERROR",
          "Não foi possível confirmar o pagamento.",
        );
      toast.error(message);
    } finally {
      setMarkingPaidByOrderId((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const orders = data?.orders ?? [];
  const store = data?.store ?? null;

  return (
    <main className="min-h-screen">
      <PageHeader
        eyebrow={user?.name ? `Olá, ${user.name.split(" ")[0]}` : undefined}
        title={`🛵 ${t("MOTOBOY_TITLE", "Entregas")}`}
        subtitle="Pedidos prontos atribuídos a você."
        actions={
          <>
            <button
              type="button"
              onClick={() => refetch()}
              className="ui-btn ui-btn-accent"
            >
              {t("MOTOBOY_REFRESH", "Atualizar")}
            </button>
            {user?.role === "MOTOBOY" && (
              <button
                type="button"
                onClick={logout}
                className="ui-btn ui-btn-on-dark"
              >
                Sair
              </button>
            )}
          </>
        }
      />
      <div className="ui-page max-w-2xl">

      {isLoading && (
        <p className="mt-8 text-center text-sm text-gray-500">
          {t("MOTOBOY_LOADING", "Carregando...")}
        </p>
      )}

      {isError && (
        <p className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t(
            "MOTOBOY_LOAD_ERROR",
            "Erro ao carregar pedidos. Tente atualizar.",
          )}
        </p>
      )}

      {!isLoading && !isError && orders.length === 0 && (
        <div className="mt-12 text-center">
          <p className="text-4xl">🍕</p>
          <p className="mt-3 text-sm font-semibold text-gray-500">
            {t(
              "MOTOBOY_EMPTY",
              "Nenhum pedido pronto para entrega no momento.",
            )}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {t(
              "MOTOBOY_AUTO_REFRESH_HINT",
              "Esta página atualiza automaticamente a cada 20 segundos.",
            )}
          </p>
        </div>
      )}

      {/* Localização + mapa */}
      <section className="mb-4 space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-card ring-1 ring-primary/5">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {t("MOTOBOY_SHARE_LOCATION", "Compartilhar minha localização")}
            </p>
            <p className="text-xs text-gray-500">
              {shareLocation
                ? position
                  ? t(
                      "MOTOBOY_LOCATION_ON",
                      "Ligado: o cliente do pedido em entrega vê onde você está.",
                    )
                  : t("MOTOBOY_LOCATION_WAITING", "Obtendo sua localização...")
                : t(
                    "MOTOBOY_LOCATION_OFF",
                    "Desligado: tempos calculados a partir da loja.",
                  )}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={shareLocation}
            onClick={() => setShareLocation((prev) => !prev)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${shareLocation ? "bg-emerald-600" : "bg-gray-300"}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${shareLocation ? "left-6" : "left-1"}`}
            />
          </button>
        </div>

        {orders.length > 0 && (
          <DeliveryMap
            store={store}
            motoboyPosition={position}
            orders={orders}
          />
        )}
      </section>

      <div className="space-y-4">
        {orders.map((order, index) => (
          <article
            key={order.id}
            className="rounded-3xl shadow-card ring-1 ring-primary/5 bg-white p-5"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 font-bold text-gray-900">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  {order.user?.name}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {t("MOTOBOY_ORDER_PREFIX", "Pedido")} #
                  {order.id.slice(-8).toUpperCase()}
                </p>
              </div>
              {order.deliveryFee != null && (
                <span className="shrink-0 rounded-xl bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
                  {t("MOTOBOY_DELIVERY_FEE", "Frete")}{" "}
                  {currency(order.deliveryFee)}
                </span>
              )}
            </div>

            {/* Items */}
            <ul className="mt-4 space-y-1">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <span className="text-gray-400">×{item.quantity}</span>
                  <span>{itemLabel(item)}</span>
                </li>
              ))}
            </ul>

            {/* Waiting time + travel estimate */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div
                className={`rounded-2xl border px-4 py-3 ${waitingTone(getWaitingMinutes(order.createdAt, now))}`}
              >
                <p className="text-xs font-semibold opacity-75">
                  {t("MOTOBOY_CUSTOMER_WAITING", "Cliente esperando")}
                </p>
                <p className="mt-1 text-lg font-bold">
                  {formatMinutes(getWaitingMinutes(order.createdAt, now))}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-gray-800">
                <p className="text-xs font-semibold text-gray-500">
                  {order.travelFromMotoboy
                    ? t("MOTOBOY_TRAVEL_FROM_YOU", "De você até o endereço")
                    : t("MOTOBOY_TRAVEL_TIME", "Da loja até o endereço")}
                </p>
                {(order.travelFromMotoboy ?? order.travel) ? (
                  <p className="mt-1 text-lg font-bold">
                    ~
                    {formatMinutes(
                      (order.travelFromMotoboy ?? order.travel).tempoEstimado,
                    )}
                    <span className="ml-1 text-xs font-medium text-gray-500">
                      (
                      {(
                        order.travelFromMotoboy ?? order.travel
                      ).distanciaKm.toLocaleString("pt-BR")}{" "}
                      km)
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-gray-400">
                    {t("MOTOBOY_TRAVEL_UNAVAILABLE", "Indisponível")}
                  </p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold text-gray-500">
                {t("MOTOBOY_ADDRESS", "Endereço")}
              </p>
              <p className="mt-1 text-sm text-gray-800">
                {order.deliveryAddress}
              </p>
            </div>

            {/* Total */}
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {t("MOTOBOY_ORDER_TOTAL", "Total do pedido")}
              </span>
              <span className="font-bold text-gray-900">
                {currency(order.total)}
              </span>
            </div>

            {/* Payment hint for delivery */}
            <div className="mt-3 flex justify-end">
              {order.paymentStatus === "APROVADO" ? (
                <span className="rounded-xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  {t("MOTOBOY_ALREADY_PAID", "Já pago")}
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                    {t(
                      "MOTOBOY_COLLECT_ON_DELIVERY",
                      "Cobrar cliente na entrega",
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleMarkAsPaid(order.id)}
                    disabled={markingPaidByOrderId[order.id]}
                    className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {markingPaidByOrderId[order.id]
                      ? t("MOTOBOY_SAVING", "Salvando...")
                      : t("MOTOBOY_MARK_PAID", "Marcar como pago")}
                  </button>
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            {order.deliveryLat != null && order.deliveryLon != null ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <a
                  href={getGoogleMapsUrl(order)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full border border-blue-200 bg-blue-50 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  {t("MOTOBOY_GOOGLE_MAPS", "Google Maps")}
                </a>
                <a
                  href={getWazeUrl(order)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 py-3 text-sm font-bold text-cyan-700 transition hover:bg-cyan-100"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 2c5.5 0 10 4.5 10 10S17.5 22 12 22 2 17.5 2 12 6.5 2 12 2zm-.8 5v5.2l4 2.4-.8 1.2-4.7-2.8V7h1.5z" />
                  </svg>
                  {t("MOTOBOY_WAZE", "Waze")}
                </a>
              </div>
            ) : (
              <div className="mt-4">
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(order.deliveryAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-blue-200 bg-blue-50 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                >
                  {t(
                    "MOTOBOY_SEARCH_ADDRESS",
                    "Buscar endereço no Google Maps",
                  )}
                </a>
              </div>
            )}

            {/* Delivery confirmation */}
            {order.paymentStatus === "APROVADO" ? (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-semibold text-gray-600">
                  {t(
                    "MOTOBOY_CONFIRM_DELIVERY_CODE",
                    "Confirmar entrega com código",
                  )}
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={deliveryCodes[order.id] ?? ""}
                    onChange={(event) => {
                      const digitsOnly = event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 4);
                      setDeliveryCodes((prev) => ({
                        ...prev,
                        [order.id]: digitsOnly,
                      }));
                    }}
                    placeholder={t("MOTOBOY_CODE_PLACEHOLDER", "Ex.: 1234")}
                    className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 transition focus:ring-2"
                  />
                  <button
                    type="button"
                    disabled={
                      confirmingByOrderId[order.id] ||
                      (deliveryCodes[order.id] ?? "").length !== 4
                    }
                    onClick={() => handleConfirmDelivery(order.id)}
                    className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {confirmingByOrderId[order.id]
                      ? t("MOTOBOY_CONFIRMING", "Confirmando...")
                      : t("MOTOBOY_CONFIRM", "Confirmar")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-medium text-amber-700">
                  {t(
                    "MOTOBOY_MARK_PAID_FIRST",
                    "Para confirmar a entrega, marque o pedido como pago primeiro.",
                  )}
                </p>
              </div>
            )}
          </article>
        ))}
      </div>
      </div>
    </main>
  );
}

export default MotoboyPage;
