import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );

const PIN_BASE =
  "display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);font-weight:700;font-size:14px;";

const pinIcon = (content, background) =>
  L.divIcon({
    html: `<div style="${PIN_BASE}background:${background};color:#fff;">${content}</div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });

/**
 * Mapa com a loja, a posição do motoboy (se compartilhada) e os pedidos
 * numerados na mesma ordem dos cards.
 */
function DeliveryMap({
  store,
  motoboyPosition,
  orders,
  numbered = true,
  motoboyLabel = "Você está aqui",
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const motoboyMarkerRef = useRef(null);
  const fittedKeyRef = useRef("");

  // Cria o mapa uma única vez
  useEffect(() => {
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([store?.lat ?? -23.55, store?.lon ?? -46.63], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    // O mapa pode nascer dentro de um painel ainda animando a abertura
    const resizeTimer = setTimeout(() => map.invalidateSize(), 350);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      motoboyMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loja + pedidos
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    if (store) {
      L.marker([store.lat, store.lon], {
        icon: pinIcon("🏪", "#7c3aed"),
      })
        .bindPopup("<strong>Loja</strong>")
        .addTo(layer);
    }

    orders.forEach((order, index) => {
      if (order.deliveryLat == null || order.deliveryLon == null) return;
      const eta = order.travelFromMotoboy ?? order.travel;
      L.marker([order.deliveryLat, order.deliveryLon], {
        icon: pinIcon(numbered ? `${index + 1}` : "🏠", "#dc2626"),
      })
        .bindPopup(
          `<strong>${numbered ? `${index + 1}. ` : ""}${escapeHtml(order.user?.name ?? "Endereço de entrega")}</strong><br/>` +
            `${escapeHtml(order.deliveryAddress)}` +
            (eta ? `<br/><em>~${eta.tempoEstimado} min · ${eta.distanciaKm} km</em>` : ""),
        )
        .addTo(layer);
    });
  }, [store, orders, numbered]);

  // Posição do motoboy (atualiza sem recriar as outras camadas)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!motoboyPosition) {
      motoboyMarkerRef.current?.remove();
      motoboyMarkerRef.current = null;
      return;
    }

    const latLng = [motoboyPosition.lat, motoboyPosition.lon];
    if (motoboyMarkerRef.current) {
      motoboyMarkerRef.current.setLatLng(latLng);
    } else {
      motoboyMarkerRef.current = L.marker(latLng, {
        zIndexOffset: 1000,
        icon: pinIcon("🛵", "#2563eb"),
      })
        .bindPopup(`<strong>${escapeHtml(motoboyLabel)}</strong>`)
        .addTo(map);
    }
  }, [motoboyPosition, motoboyLabel]);

  // Enquadra todos os pontos só quando o conjunto muda (não a cada movimento)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const points = [];
    if (store) points.push([store.lat, store.lon]);
    if (motoboyPosition) points.push([motoboyPosition.lat, motoboyPosition.lon]);
    orders.forEach((order) => {
      if (order.deliveryLat != null && order.deliveryLon != null) {
        points.push([order.deliveryLat, order.deliveryLon]);
      }
    });

    const key = `${orders.map((o) => o.id).join(",")}|${motoboyPosition ? 1 : 0}`;
    if (key === fittedKeyRef.current || points.length === 0) return;
    fittedKeyRef.current = key;

    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(points, { padding: [32, 32], maxZoom: 16 });
    }
  }, [store, orders, motoboyPosition]);

  return (
    <div
      ref={containerRef}
      className="h-72 w-full overflow-hidden rounded-3xl shadow-card ring-1 ring-primary/5 sm:h-80"
      style={{ zIndex: 0 }}
    />
  );
}

export default DeliveryMap;
