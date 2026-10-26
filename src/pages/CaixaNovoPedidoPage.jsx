import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../components/PageHeader.jsx";
import CartProductCard from "../components/CartProductCard.jsx";
import { useCart } from "../context/CartContext.jsx";
import { api } from "../lib/api.js";
import {
  MILKSHAKE_COMPLEMENT_CATEGORY,
  isMilkshakeCartItem,
  paidComplementOptions,
} from "../lib/paidComplements.js";
import { MenuBuilder } from "./CardapioPage.jsx";

const PAYMENT_METHODS = [
  { id: "DINHEIRO", label: "💵 Dinheiro" },
  { id: "CREDITO", label: "💳 Crédito" },
  { id: "DEBITO", label: "💳 Débito" },
  { id: "PIX", label: "⚡ Pix" },
];

const currency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

// Mesmo formato do checkout: o preço é calculado pela API
function toApiItem(item) {
  const payload = item.payload || {};
  return {
    productId: payload.productId || item.id,
    size: payload.size || item.size || undefined,
    addonIds: (payload.addonIds || (item.addons || []).map((addon) => addon.id))
      .filter(Boolean),
    quantity: item.quantity,
    notes: item.observation || item.notes || undefined,
  };
}

// Caixa lança o pedido do cliente no balcão: nome, itens (mesmo passo a passo
// do totem) e forma de pagamento. O pedido já entra pago na cozinha.
export default function CaixaNovoPedidoPage() {
  const queryClient = useQueryClient();
  const {
    items,
    subtotal,
    updateItem,
    updateQuantity,
    removeItem,
    clearCart,
    setCartScope,
  } = useCart();
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [lastOrder, setLastOrder] = useState(null);

  // Carrinho separado do carrinho pessoal de quem está no caixa
  useEffect(() => {
    setCartScope("balcao");
    return () => setCartScope("default");
  }, [setCartScope]);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await api.get("/products")).data?.data ?? [],
    staleTime: 5 * 60 * 1000,
  });
  const milkshakeComplements = paidComplementOptions(
    products,
    MILKSHAKE_COMPLEMENT_CATEGORY,
  );

  const createOrder = useMutation({
    mutationFn: async () =>
      (
        await api.post("/orders/balcao", {
          customerName: customerName.trim(),
          paymentMethod,
          items: items.map(toApiItem),
        })
      ).data?.data,
    onSuccess: (order) => {
      setLastOrder({ id: order?.id ?? "", name: customerName.trim() });
      toast.success("Pedido enviado para a cozinha!");
      clearCart();
      setCustomerName("");
      setPaymentMethod(null);
      queryClient.invalidateQueries({ queryKey: ["caixa-pending-payments"] });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
    },
    onError: (error) =>
      toast.error(
        error?.response?.data?.error?.message ??
          error?.response?.data?.message ??
          "Erro ao lançar o pedido.",
      ),
  });

  const missing = !customerName.trim()
    ? "Digite o nome do cliente"
    : !items.length
      ? "Monte o pedido ao lado"
      : !paymentMethod
        ? "Escolha a forma de pagamento"
        : "";

  return (
    <main className="min-h-screen text-gray-900">
      <PageHeader
        backTo="/caixa"
        title="Novo pedido no balcão"
        subtitle="Digite o nome do cliente, monte o pedido e escolha a forma de pagamento."
      />

      <div className="mx-auto grid max-w-[96rem] gap-6 px-2 py-6 sm:px-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0">
          <MenuBuilder afterAdd={() => {}} />
        </div>

        <aside className="h-fit space-y-4 rounded-3xl bg-white p-5 shadow-card ring-1 ring-primary/5 xl:sticky xl:top-6">
          {lastOrder && (
            <p className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800">
              ✓ Pedido #{lastOrder.id.slice(-6).toUpperCase()} de {lastOrder.name}{" "}
              enviado para a cozinha.
            </p>
          )}

          <div>
            <label
              htmlFor="balcao-cliente"
              className="mb-1 block text-xs font-black uppercase tracking-wide text-secondary"
            >
              Nome do cliente
            </label>
            <input
              id="balcao-cliente"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              maxLength={80}
              placeholder="Ex.: Maria"
              className="ui-input text-lg font-bold"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-secondary">
              Pedido
            </p>
            {items.length ? (
              <div className="space-y-3">
                {items.map((item) => (
                  <CartProductCard
                    key={item.key}
                    item={item}
                    onQuantityChange={(quantity) => updateQuantity(item.key, quantity)}
                    onRemove={() => removeItem(item.key)}
                    onObservationChange={(observation) =>
                      updateItem(item.key, { observation })
                    }
                    complementOptions={
                      isMilkshakeCartItem(item) ? milkshakeComplements : []
                    }
                    onAddonsChange={(addons) =>
                      updateItem(item.key, (current) => ({
                        ...current,
                        addons,
                        payload: {
                          ...current.payload,
                          addonIds: addons.map((addon) => addon.id),
                        },
                      }))
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border-2 border-dashed border-primary/10 p-5 text-center text-sm font-semibold text-text-muted">
                Nenhum item ainda. Monte o pedido ao lado.
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-secondary">
              Forma de pagamento
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  aria-pressed={paymentMethod === method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`rounded-2xl border-2 px-3 py-3 text-base font-black transition ${
                    paymentMethod === method.id
                      ? "border-secondary bg-secondary text-white"
                      : "border-primary/10 bg-white text-primary hover:border-secondary/50"
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border-soft pt-4">
            <span className="text-lg font-black text-primary">Total</span>
            <span className="font-display text-3xl font-bold text-secondary">
              {currency(subtotal)}
            </span>
          </div>

          <button
            type="button"
            disabled={Boolean(missing) || createOrder.isPending}
            onClick={() => createOrder.mutate()}
            className="ui-btn ui-btn-primary ui-btn-lg w-full"
          >
            {createOrder.isPending ? "Enviando..." : "Finalizar pedido"}
          </button>
          {missing && (
            <p className="text-center text-sm font-semibold text-text-muted">{missing}</p>
          )}
        </aside>
      </div>
    </main>
  );
}
