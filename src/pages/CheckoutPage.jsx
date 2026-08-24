import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";
import { useTranslation } from "../context/I18nContext.jsx";
import { TOTEM_ID_KEY, TOTEM_NAME_KEY, TOTEM_SLUG_KEY } from "../lib/totemMode.js";

const POLL_INTERVAL_MS = 4000;

const currency = (v) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatCep = (v) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

const isValidEntityId = (value) => String(value || "").trim().length > 0;

const mapItemToApi = (item) => {
  const payload = item.payload || {};
  const productId = payload.productId || item.id;

  if (isValidEntityId(productId)) {
    return {
      productId,
      size: payload.size || item.size || undefined,
      addonIds: (
        payload.addonIds || (item.addons || []).map((addon) => addon.id)
      ).filter(isValidEntityId),
      removedIngredients:
        payload.removedIngredients ||
        (item.removals || []).join(", ") ||
        undefined,
      quantity: item.quantity,
      notes: item.observation || item.notes || undefined,
    };
  }
};

function CheckoutPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useTranslation();
  const { items, subtotal, clearCart } = useCart();
  const isTotemMode = localStorage.getItem("pc_totem_mode") === "true";
  const currentTotemId = localStorage.getItem(TOTEM_ID_KEY);
  const currentTotemSlug = localStorage.getItem(TOTEM_SLUG_KEY);
  const currentTotemName = localStorage.getItem(TOTEM_NAME_KEY);
  const currentTotemPath = currentTotemSlug ? `/${currentTotemSlug}` : "/totem";
  const [paymentMode, setPaymentMode] = useState("online");
  const [waitingOrderId, setWaitingOrderId] = useState(null);
  const [paidTotemOrder, setPaidTotemOrder] = useState(null);
  const pollRef = useRef(null);

  // Address
  const [cep, setCep] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [referencia, setReferencia] = useState("");
  const [rua, setRua] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [notes, setNotes] = useState("");

  // Freight
  const [freight, setFreight] = useState(null);
  const [freightLoading, setFreightLoading] = useState(false);
  const [freightError, setFreightError] = useState("");
  const [, setPollStatus] = useState("PENDENTE");
  const [deliveryType, setDeliveryType] = useState("entrega"); // "entrega" | "retirada"

  // Payment polling
  useEffect(() => {
    if (!waitingOrderId) return;
    const poll = async () => {
      try {
        const res = await api.get(`/orders/${waitingOrderId}`);
        const order = res.data?.data || res.data;
        const status = order?.paymentStatus;
        setPollStatus(status);
        if (status === "APROVADO") {
          clearInterval(pollRef.current);
          clearCart();
          if (isTotemMode) {
            setPaidTotemOrder(order);
            setWaitingOrderId(null);
            return;
          }
          toast.success("Pagamento confirmado! Preparando seu pedido.");
          navigate("/dashboard");
        } else if (status === "RECUSADO") {
          clearInterval(pollRef.current);
          toast.error("Pagamento recusado. Tente novamente.");
          setWaitingOrderId(null);
        }
      } catch {
        // ignore transient errors
      }
    };
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    poll();
    return () => clearInterval(pollRef.current);
  }, [waitingOrderId, clearCart, navigate, isTotemMode]);

  // ViaCEP auto-fill
  const fetchViaCep = useCallback(async (rawCep) => {
    const clean = rawCep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data.erro) {
        setFreightError("CEP não encontrado.");
        return;
      }
      setRua(data.logradouro || "");
      setBairro(data.bairro || "");
      setCidade(data.localidade || "");
      setFreightError("");
    } catch {
      // silent
    }
  }, []);

  const handleCepChange = (e) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);
    setFreight(null);
    if (formatted.replace(/\D/g, "").length === 8) {
      fetchViaCep(formatted);
    }
  };

  const calculateFreight = async () => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      setFreightError("Informe um CEP válido com 8 dígitos.");
      return;
    }
    if (!numero.trim()) {
      setFreightError("Informe o número do endereço.");
      return;
    }
    setFreightLoading(true);
    setFreightError("");
    setFreight(null);
    try {
      const res = await api.post("/delivery/calculate", {
        cep,
        numero: numero.trim(),
        cidade: cidade.trim() || "São Paulo",
        rua: rua.trim() || undefined,
        complemento: complemento.trim() || undefined,
      });
      setFreight(res.data?.data);
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        "Não foi possível calcular o frete. Verifique o endereço.";
      setFreightError(msg);
    } finally {
      setFreightLoading(false);
    }
  };

  const fullAddress =
    deliveryType === "retirada"
      ? "Retirada no local"
      : [rua, numero, complemento, bairro, cidade].filter(Boolean).join(", ");

  const effectiveFreight =
    deliveryType === "retirada"
      ? { valorFreteNumerico: 0, valorFrete: "R$\u00a00,00" }
      : freight;

  const totalWithFreight =
    subtotal + (effectiveFreight?.valorFreteNumerico ?? 0);

  const createOrderMutation = useMutation({
    mutationFn: async (paymentMethod) => {
      const payload = {
        deliveryAddress: fullAddress || "Endereço não informado",
        isPickup: deliveryType === "retirada",
        notes: [notes, referencia ? `Ref: ${referencia}` : ""]
          .filter(Boolean)
          .join(" | "),
        paymentMethod,
        deliveryFee: effectiveFreight?.valorFreteNumerico ?? undefined,
        deliveryLat: effectiveFreight?.lat ?? undefined,
        deliveryLon: effectiveFreight?.lon ?? undefined,
        items: items.map(mapItemToApi).filter(Boolean),
      };

      if (isTotemMode) {
        const totemNumber = currentTotemSlug
          ? currentTotemSlug.replace(/^totem/i, "")
          : "";
        payload.deliveryAddress = "Totem - retirada no local";
        payload.isPickup = true;
        payload.notes = totemNumber
          ? `Pedido feito no Totem ${totemNumber}`
          : "Pedido feito no Totem";
        payload.deliveryFee = 0;
        delete payload.deliveryLat;
        delete payload.deliveryLon;
      }

      console.log("[CheckoutPage] create order payload", {
        paymentMethod,
        itemsCount: payload.items.length,
        firstItem: payload.items[0] ?? null,
        payload,
      });

      const response = await api.post("/orders", payload);
      return response.data?.data || response.data;
    },
  });

  const preferenceMutation = useMutation({
    mutationFn: async (orderId) => {
      const response = await api.post("/payments/preference", { orderId });
      return response.data?.data;
    },
  });

  const terminalMutation = useMutation({
    mutationFn: async (orderId) => {
      const response = await api.post("/totem/payments/terminal", {
        orderId,
        totemId: currentTotemId || undefined,
        totemSlug: currentTotemSlug || undefined,
      });
      return response.data?.data;
    },
  });

  const handleOnlineCheckout = async () => {
    try {
      const order = await createOrderMutation.mutateAsync("PIX");
      const pref = await preferenceMutation.mutateAsync(order.id);
      if (isTotemMode) {
        window.location.assign(pref.initPoint);
        return;
      }
      window.open(pref.initPoint, "_blank", "noopener,noreferrer");
      setWaitingOrderId(order.id);
    } catch (err) {
      const data = err?.response?.data;
      const details = data?.error?.details?.fieldErrors;
      const detailText = details ? JSON.stringify(details) : null;
      console.error("[CheckoutPage] create order failed", {
        status: err?.response?.status,
        data,
      });
      toast.error(
        data?.error?.message
          ? `${data.error.message}${detailText ? `: ${detailText}` : ""}`
          : "Erro ao gerar pagamento. Tente novamente.",
      );
    }
  };

  const handleTotemTerminalCheckout = async () => {
    try {
      const order = await createOrderMutation.mutateAsync("MAQUININHA_TOTEM");
      await terminalMutation.mutateAsync(order.id);
      setWaitingOrderId(order.id);
    } catch (err) {
      const data = err?.response?.data;
      toast.error(
        data?.error?.message ||
          data?.message ||
          "Erro ao enviar cobranca para a maquininha.",
      );
    }
  };

  const handlePresencialCheckout = async () => {
    try {
      await createOrderMutation.mutateAsync("PRESENCIAL");
      toast.success("Pedido confirmado! Aguarde a cobrança presencial.");
      clearCart();
      navigate("/dashboard");
    } catch (err) {
      const data = err?.response?.data;
      const details = data?.error?.details?.fieldErrors;
      const detailText = details ? JSON.stringify(details) : null;
      console.error("[CheckoutPage] presencial order failed", {
        status: err?.response?.status,
        data,
      });
      toast.error(
        data?.error?.message
          ? `${data.error.message}${detailText ? `: ${detailText}` : ""}`
          : "Erro ao criar pedido. Tente novamente.",
      );
    }
  };

  const isLoading =
    createOrderMutation.isPending ||
    preferenceMutation.isPending ||
    terminalMutation.isPending;

  const canConfirm =
    isAuthenticated &&
    items.length > 0 &&
    subtotal > 0 &&
    !isLoading &&
    (isTotemMode || deliveryType === "retirada" || freight !== null);

  if (isTotemMode && paidTotemOrder) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-accent bg-texture px-8 py-10 text-primary">
        <section className="w-full max-w-2xl rounded-2xl border border-border-soft bg-white p-10 text-center shadow-card">
          <p className="text-sm font-black uppercase tracking-[0.32em] text-secondary">
            Pagamento aprovado
          </p>
          <h1 className="mt-3 text-5xl font-black">Pedido recebido</h1>
          <div className="mt-8 rounded-2xl border border-border-soft bg-accent/70 p-6">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-text-muted">
              Numero do pedido
            </p>
            <p className="mt-2 text-6xl font-black text-secondary">
              #{paidTotemOrder.id.slice(-6).toUpperCase()}
            </p>
            <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-text-muted">
              Nome
            </p>
            <p className="mt-2 text-3xl font-black text-primary">
              {user?.name || "Cliente"}
            </p>
          </div>
          <p className="mt-6 text-lg text-text-muted">
            Seu pedido foi enviado para a cozinha.
          </p>
          <button
            type="button"
            onClick={() => {
              logout();
              clearCart();
              navigate(currentTotemPath, { replace: true });
            }}
            className="mt-8 rounded-2xl bg-secondary px-10 py-5 text-xl font-black uppercase tracking-wide text-white transition hover:bg-primary"
          >
            Novo atendimento
          </button>
        </section>
      </main>
    );
  }

  // Waiting for payment screen
  if (waitingOrderId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-ink px-4 text-gray-900">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
            <svg
              className="h-8 w-8 animate-spin text-gold"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          </div>
          <h1 className="mt-5 font-display text-2xl text-gold">
            {isTotemMode
              ? "Aguardando pagamento na maquininha"
              : t("CHECKOUT_WAITING_TITLE", "Aguardando pagamento")}
          </h1>
          {isTotemMode && (
            <p className="mt-2 text-sm text-smoke">
              Finalize o pagamento na maquininha. Assim que aprovar, esta tela
              mostra o numero do pedido.
            </p>
          )}
          <p
            className={`mt-2 text-sm text-smoke ${isTotemMode ? "hidden" : ""}`}
          >
            {t(
              "CHECKOUT_WAITING_DESC",
              "A página do Mercado Pago foi aberta em outra aba. Conclua o pagamento por lá e aguarde a confirmação aqui.",
            )}
          </p>
          <p className="mt-4 rounded-xl bg-gray-50 px-4 py-2 font-mono text-xs text-smoke">
            Pedido: #{waitingOrderId.slice(-8).toUpperCase()}
          </p>
          <p className="mt-3 text-xs text-smoke">
            {t(
              "CHECKOUT_WAITING_UPDATE",
              "Esta página atualiza automaticamente a cada poucos segundos.",
            )}
          </p>
        </div>
      </main>
    );
  }

  if (isTotemMode) {
    return (
      <main className="min-h-screen bg-accent bg-texture px-8 py-10 text-primary">
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col justify-center">
          <div className="mb-8 text-center">
            <p className="text-sm font-black uppercase tracking-[0.32em] text-secondary">
              Pagamento
            </p>
            <h1 className="mt-3 text-5xl font-black">Confira seu pedido</h1>
            <p className="mt-3 text-lg text-text-muted">
              Confirme o carrinho e toque em pagar para enviar a cobranca para
              a maquininha do {currentTotemName || "Totem"}.
            </p>
          </div>

          {!items.length ? (
            <div className="mx-auto w-full max-w-xl rounded-2xl border border-border-soft bg-white p-8 text-center shadow-card">
              <p className="text-xl font-bold text-primary">
                Seu carrinho esta vazio.
              </p>
              <button
                type="button"
                onClick={() => navigate("/cardapio")}
                className="mt-6 rounded-2xl bg-secondary px-8 py-4 text-lg font-black text-white transition hover:bg-primary"
              >
                Voltar ao cardapio
              </button>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
              <section className="rounded-2xl border border-border-soft bg-white p-6 shadow-card">
                <h2 className="text-3xl font-black">Itens escolhidos</h2>
                <div className="mt-5 space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-2xl border border-border-soft bg-accent/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xl font-black text-primary">
                            {item.nome || item.title || "Item"}
                          </p>
                          {(item.observation || item.description) && (
                            <p className="mt-1 text-sm text-text-muted">
                              {item.observation || item.description}
                            </p>
                          )}
                        </div>
                        <span className="rounded-xl bg-secondary px-3 py-1 text-lg font-black text-white">
                          x{item.quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="rounded-2xl border border-border-soft bg-white p-6 shadow-card">
                <h2 className="text-3xl font-black">Resumo</h2>
                <div className="mt-5 space-y-3 text-lg">
                  <div className="flex justify-between text-text-muted">
                    <span>Subtotal</span>
                    <span>{currency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>Retirada</span>
                    <span>R$ 0,00</span>
                  </div>
                  <div className="flex justify-between border-t border-border-soft pt-4 text-2xl font-black text-primary">
                    <span>Total</span>
                    <span className="text-secondary">{currency(subtotal)}</span>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-border-soft bg-accent/70 p-4">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-secondary">
                    Maquininha Mercado Pago
                  </p>
                  <p className="mt-2 text-sm text-text-muted">
                    A cobranca aparece na maquininha cadastrada no painel. O
                    pedido entra na cozinha depois da aprovacao.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!canConfirm}
                  onClick={handleTotemTerminalCheckout}
                  className="mt-6 w-full rounded-2xl bg-secondary px-6 py-5 text-xl font-black uppercase tracking-wide text-white shadow-card transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Enviando para maquininha..." : "Pagar"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/cardapio")}
                  className="mt-3 w-full rounded-2xl border border-border-soft bg-white px-6 py-4 text-lg font-black text-primary transition hover:border-secondary"
                >
                  Voltar e alterar
                </button>
              </aside>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6 text-gray-900 sm:px-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500 transition hover:border-gray-400 hover:text-gray-800"
        >
          {t("BTN_BACK", "← Voltar")}
        </button>
        <h1 className="font-display text-3xl text-gold">Checkout</h1>
      </div>

      {!items.length ? (
        <p className="mt-6 rounded-2xl border border-gray-200 bg-gray-100 p-4 text-sm text-smoke">
          {t("CHECKOUT_EMPTY", "Seu carrinho está vazio.")}
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Address + Freight */}
          <section className="space-y-4">
            <div className="rounded-3xl border border-gold/20 bg-white p-5">
              {/* Tipo de entrega */}
              <div className="mb-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeliveryType("entrega")}
                  className={`flex-1 rounded-2xl border py-3 text-sm font-bold transition ${
                    deliveryType === "entrega"
                      ? "border-rosso bg-rosso text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {t("CHECKOUT_DELIVERY", "🛵 Entrega")}
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType("retirada")}
                  className={`flex-1 rounded-2xl border py-3 text-sm font-bold transition ${
                    deliveryType === "retirada"
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {t("CHECKOUT_PICKUP", "🏠 Retirada no local")}
                </button>
              </div>

              {deliveryType === "retirada" ? (
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-center">
                  <p className="font-bold text-green-800">
                    {t(
                      "CHECKOUT_PICKUP_FREE",
                      "Retirada no local — Frete grátis",
                    )}
                  </p>
                  <p className="mt-1 text-xs text-green-700">
                    Av. Cachoeira Paulista, 17 — CEP 03551-000, São Paulo
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="font-display text-xl text-gold">
                    {t("CHECKOUT_ADDRESS_TITLE", "Endereço de Entrega")}
                  </h2>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {/* CEP */}
                    <div className="col-span-2 sm:col-span-1">
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        {t("CHECKOUT_CEP", "CEP")} *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="00000-000"
                        value={cep}
                        onChange={handleCepChange}
                        maxLength={9}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-gold/60 focus:outline-none"
                      />
                    </div>

                    {/* Número */}
                    <div className="col-span-2 sm:col-span-1">
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        {t("CHECKOUT_NUMBER", "Número")} *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 123"
                        value={numero}
                        onChange={(e) => {
                          setNumero(e.target.value);
                          setFreight(null);
                        }}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-gold/60 focus:outline-none"
                      />
                    </div>

                    {/* Rua */}
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        {t("CHECKOUT_STREET", "Rua")}
                      </label>
                      <input
                        type="text"
                        placeholder="Preenchido automaticamente pelo CEP"
                        value={rua}
                        onChange={(e) => setRua(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-gold/60 focus:outline-none"
                      />
                    </div>

                    {/* Complemento */}
                    <div className="col-span-2 sm:col-span-1">
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        {t("CHECKOUT_COMPLEMENT", "Complemento")}
                      </label>
                      <input
                        type="text"
                        placeholder="Apto, bloco, casa..."
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-gold/60 focus:outline-none"
                      />
                    </div>

                    {/* Bairro */}
                    <div className="col-span-2 sm:col-span-1">
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        {t("CHECKOUT_NEIGHBORHOOD", "Bairro")}
                      </label>
                      <input
                        type="text"
                        placeholder="Preenchido pelo CEP"
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-gold/60 focus:outline-none"
                      />
                    </div>

                    {/* Referência */}
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        {t("CHECKOUT_REFERENCE", "Ponto de referência")}
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: próximo ao mercado, portão azul..."
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-gold/60 focus:outline-none"
                      />
                    </div>

                    {/* Obs */}
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        {t("CHECKOUT_NOTES_LABEL", "Observações do pedido")}
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Ex: sem cebola, borda recheada..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-gold/60 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Calculate freight */}
                  <button
                    type="button"
                    disabled={freightLoading}
                    onClick={calculateFreight}
                    className="mt-4 w-full rounded-2xl bg-rosso py-3 text-sm font-bold text-white transition hover:bg-ember disabled:opacity-50"
                  >
                    {freightLoading
                      ? t("BTN_CALC_FREIGHT_LOADING", "Calculando frete...")
                      : t("BTN_CALC_FREIGHT", "Calcular Frete 🛵")}
                  </button>

                  {freightError && (
                    <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {freightError}
                    </p>
                  )}

                  {freight && (
                    <div className="mt-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
                      <p className="text-sm font-bold text-green-800">
                        Frete: {freight.valorFrete}
                      </p>
                      <p className="mt-0.5 text-xs text-green-700">
                        Distancia: {freight.distanciaKm} km - Tempo estimado: ~
                        {freight.tempoEstimado} min
                      </p>
                      <p
                        className="mt-0.5 text-xs text-green-600 line-clamp-1"
                        title={freight.displayName}
                      >
                        📍 {freight.displayName}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Right: Summary + Payment */}
          <section className="space-y-4">
            <div className="rounded-3xl border border-gold/20 bg-white p-5">
              <h2 className="font-display text-xl text-gold">Resumo</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {items.map((item) => (
                  <li
                    key={item.key}
                    className="flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {item.title}
                      </p>
                      <p className="text-xs text-smoke">{item.description}</p>
                    </div>
                    <p className="shrink-0 font-semibold text-gold">
                      x{item.quantity}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-gray-100 pt-4 space-y-1 text-sm">
                <div className="flex justify-between text-smoke">
                  <span>Subtotal</span>
                  <span>{currency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-smoke">
                  <span>Frete</span>
                  <span
                    className={
                      effectiveFreight ? "font-semibold text-green-700" : ""
                    }
                  >
                    {deliveryType === "retirada"
                      ? "R$ 0,00"
                      : freight
                        ? freight.valorFrete
                        : "— calcule o frete"}
                  </span>
                </div>
                <div className="flex justify-between pt-1 text-base font-bold text-gold">
                  <span>Total</span>
                  <span>{currency(totalWithFreight)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gold/20 bg-white p-5">
              <h2 className="font-display text-xl text-gold">Pagamento</h2>
              <div className="mt-3 flex rounded-2xl border border-gray-200 bg-gray-50 p-1">
                <button
                  type="button"
                  onClick={() => setPaymentMode("online")}
                  className={`flex-1 rounded-xl py-3 text-sm font-semibold transition ${
                    paymentMode === "online"
                      ? "bg-rosso text-white shadow"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  💳 Pagar Online
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("presencial")}
                  className={`flex-1 rounded-xl py-3 text-sm font-semibold transition ${
                    paymentMode === "presencial"
                      ? "bg-white text-gray-900 shadow"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  💵 Pagar na Entrega
                </button>
              </div>

              {paymentMode === "online" ? (
                <div className="mt-3 rounded-2xl border border-gold/20 bg-gray-50 p-4">
                  <img
                    src="https://http2.mlstatic.com/frontend-assets/mp-web-navigation/ui-navigation/6.6.71/mercadopago/logo__large@2x.png"
                    alt="Mercado Pago"
                    className="h-5 w-auto"
                  />
                  <ul className="mt-3 space-y-1 text-xs text-smoke">
                    <li>✅ Pix, crédito, débito aceitos</li>
                    <li>✅ Preparo inicia automaticamente após confirmação</li>
                  </ul>
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
                  <p className="text-xs font-bold text-amber-800">
                    ⚠️ O preparo só inicia após confirmação do pagamento pela
                    equipe.
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    Aceitos: dinheiro, cartão na maquininha.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!canConfirm}
              onClick={
                paymentMode === "online"
                  ? handleOnlineCheckout
                  : handlePresencialCheckout
              }
              className="w-full rounded-2xl bg-rosso px-5 py-4 text-base font-bold text-white shadow-md transition hover:bg-ember disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading
                ? "Processando..."
                : paymentMode === "online"
                  ? "Pagar com Mercado Pago →"
                  : "Confirmar Pedido →"}
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

export default CheckoutPage;
