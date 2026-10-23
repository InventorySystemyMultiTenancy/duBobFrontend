import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useTranslation } from "../context/I18nContext.jsx";
import CartProductCard from "./CartProductCard.jsx";
import { api } from "../lib/api.js";
import {
  MILKSHAKE_COMPLEMENT_CATEGORY,
  isMilkshakeCartItem,
  paidComplementOptions,
} from "../lib/paidComplements.js";

function CartDrawer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { t } = useTranslation();
  const isTotemMode = localStorage.getItem("pc_totem_mode") === "true";
  const {
    items,
    isCartOpen,
    closeCart,
    updateItem,
    updateQuantity,
    removeItem,
    formatted,
    total,
  } = useCart();

  // Mesmo cache do cardápio: os complementos do milk shake vêm dos produtos
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await api.get("/products")).data?.data ?? [],
    staleTime: 5 * 60 * 1000,
    enabled: isCartOpen,
  });
  const milkshakeComplements = paidComplementOptions(
    products,
    MILKSHAKE_COMPLEMENT_CATEGORY,
  );

  const itemCount = items.reduce(
    (sum, item) => sum + Number(item.quantity || 1),
    0,
  );

  // Fecha com Esc e trava a rolagem da página enquanto o carrinho está aberto
  useEffect(() => {
    if (!isCartOpen) return undefined;
    const handleKey = (event) => {
      if (event.key === "Escape") closeCart();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [isCartOpen, closeCart]);

  const goToMenu = () => {
    closeCart();
    const menuPath =
      user?.role === "MESA" && user.mesaMode === "visual"
        ? "/cardapio-mesa"
        : "/cardapio";
    if (location.pathname !== menuPath) navigate(menuPath);
  };

  const goToCheckout = () => {
    closeCart();
    if (user?.role === "MESA") {
      navigate("/mesa/checkout");
    } else if (!isAuthenticated) {
      navigate("/login?redirect=/checkout");
    } else {
      navigate("/checkout");
    }
  };

  return (
    <>
      {/* z acima da barra do topo (z-[90]) para nada ficar escondido */}
      <div
        className={`fixed inset-0 z-[95] bg-primary/40 backdrop-blur-sm transition-opacity duration-300 ${
          isCartOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />

      <aside
        className={`fixed right-0 top-0 z-[100] flex h-[100dvh] w-full ${isTotemMode ? "max-w-2xl" : "max-w-md"} transform flex-col bg-white text-text-main shadow-2xl transition-transform duration-300 ease-in-out sm:rounded-l-[2rem] ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={t("CART_TITLE", "Seu carrinho")}
        aria-hidden={!isCartOpen}
      >
        <header className="relative overflow-hidden bg-primary px-5 py-5 text-white sm:rounded-tl-[2rem] sm:px-6">
          <div
            className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-secondary/40 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-bold">
                {t("CART_TITLE", "Seu carrinho")}
              </h3>
              <p className="text-sm font-semibold text-white/70">
                {itemCount === 0
                  ? "Nenhum item ainda"
                  : `${itemCount} ${itemCount === 1 ? "item" : "itens"}`}
              </p>
            </div>
            <button
              type="button"
              onClick={closeCart}
              aria-label={t("CART_CLOSE", "Fechar")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain bg-accent/50 px-5 py-5 sm:px-6">
          {!items.length ? (
            <div className="flex h-full flex-col items-center justify-center px-2 text-center">
              <span
                className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl shadow-card"
                aria-hidden="true"
              >
                🥤
              </span>
              <p className="mt-5 font-display text-2xl font-semibold text-primary">
                {t("CART_EMPTY", "Seu carrinho está vazio")}
              </p>
              <p className="mt-2 max-w-xs text-sm text-text-muted">
                Monte seu açaí ou milkshake e ele aparece aqui.
              </p>
              <button
                type="button"
                onClick={goToMenu}
                className="ui-btn ui-btn-primary ui-btn-lg mt-6"
              >
                Ver cardápio
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <CartProductCard
                  key={item.key}
                  item={item}
                  onQuantityChange={(quantity) =>
                    updateQuantity(item.key, quantity)
                  }
                  onRemove={() => removeItem(item.key)}
                  onObservationChange={(observation) =>
                    updateItem(item.key, { observation })
                  }
                  big={isTotemMode}
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
              <button
                type="button"
                onClick={goToMenu}
                className="ui-btn ui-btn-ghost w-full"
              >
                + Adicionar mais itens
              </button>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <footer className="border-t border-primary/10 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-text-muted">
                <span>{t("CART_SUBTOTAL", "Subtotal")}</span>
                <span>{formatted.subtotal}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>{t("CART_FREIGHT", "Frete")}</span>
                <span>{formatted.freight}</span>
              </div>
              <div className="flex justify-between pt-1 font-display text-xl font-bold text-primary">
                <span>{t("CART_TOTAL", "Total")}</span>
                <span className="text-secondary">{formatted.total}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={!total}
              onClick={goToCheckout}
              className="ui-btn ui-btn-primary ui-btn-lg mt-4 w-full"
            >
              {isTotemMode
                ? "Ir para pagamento"
                : t("CART_BTN_CHECKOUT", "Finalizar pedido")}
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}

export default CartDrawer;
