import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import DeliveryMap from "./DeliveryMap.jsx";

const formatUpdatedAt = (iso) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Mostra ao cliente onde está o motoboy do pedido e quanto falta para chegar.
 * Recebe atualizações em tempo real pelo socket e consulta a API como reserva.
 */
function MotoboyTracker({ order }) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["motoboy-location", order.id], [order.id]);

  const { data: location, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.get(`/orders/${order.id}/motoboy-location`);
      return res.data?.data ?? null;
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const onLocation = (event) => {
      const payload = event.detail;
      if (payload?.orderId !== order.id) return;
      queryClient.setQueryData(queryKey, (prev) => ({
        ...(prev ?? {}),
        ...payload,
      }));
    };

    window.addEventListener("pc:motoboy-location", onLocation);
    return () => window.removeEventListener("pc:motoboy-location", onLocation);
  }, [order.id, queryClient, queryKey]);

  const destLat = order.deliveryLat ?? location?.destination?.lat;
  const destLon = order.deliveryLon ?? location?.destination?.lon;
  const destinationOrder = useMemo(
    () => ({
      id: order.id,
      deliveryLat: destLat,
      deliveryLon: destLon,
      deliveryAddress: order.deliveryAddress,
      user: { name: "Seu endereço" },
    }),
    [order.id, destLat, destLon, order.deliveryAddress],
  );
  const mapOrders = useMemo(() => [destinationOrder], [destinationOrder]);
  const motoboyLat = location?.lat;
  const motoboyLon = location?.lon;
  const motoboyPosition = useMemo(
    () =>
      motoboyLat != null && motoboyLon != null
        ? { lat: motoboyLat, lon: motoboyLon }
        : null,
    [motoboyLat, motoboyLon],
  );

  if (isLoading) return null;

  if (!motoboyPosition) {
    return (
      <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        🛵 Aguardando a localização do motoboy...
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-800">
        <div>
          <p className="text-sm font-semibold">🛵 Motoboy a caminho</p>
          {location.updatedAt && (
            <p className="text-xs opacity-75">
              Atualizado às {formatUpdatedAt(location.updatedAt)}
            </p>
          )}
        </div>
        {location.travel && (
          <div className="text-right">
            <p className="text-lg font-bold">
              ~{location.travel.tempoEstimado} min
            </p>
            <p className="text-xs opacity-75">
              {location.travel.distanciaKm.toLocaleString("pt-BR")} km
            </p>
          </div>
        )}
      </div>
      <DeliveryMap
        motoboyPosition={motoboyPosition}
        orders={mapOrders}
        numbered={false}
        motoboyLabel="Motoboy"
      />
    </div>
  );
}

export default MotoboyTracker;
