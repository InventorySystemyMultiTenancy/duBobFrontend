import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useTranslation } from "../context/I18nContext.jsx";
import CartProductCard from "./CartProductCard.jsx";

function CartDrawer() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { t } = useTranslation();
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

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-primary/35 backdrop-blur-sm transition-opacity duration-300 ${
          isCartOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={closeCart}
      />

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md transform flex-col border-l border-border-soft bg-accent bg-texture p-4 text-text-main shadow-2xl transition-transform duration-300 ease-in-out sm:p-6 ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border-soft pb-4">
          <h3 className="font-display text-2xl font-black text-primary">
            {t("CART_TITLE", "Seu Carrinho")}
          </h3>
          <button
            type="button"
            onClick={closeCart}
            className="rounded-xl border border-border-soft bg-white px-3 py-2 text-sm font-semibold text-text-muted shadow-sm transition hover:border-secondary/40 hover:text-secondary"
          >
            x {t("CART_CLOSE", "Fechar")}
          </button>
        </div>

        <div className="mt-5 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-4 pr-1">
          {!items.length ? (
            <div className="rounded-2xl border border-dashed border-border-soft bg-white/85 p-6 text-center text-sm text-text-muted shadow-card">
              {t("CART_EMPTY", "Seu carrinho esta vazio.")}
            </div>
          ) : (
            items.map((item) => (
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
              />
            ))
          )}
        </div>

        <footer className="mt-3 border-t border-border-soft bg-white/70 pt-4 sm:pt-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-text-muted">
              <span>{t("CART_SUBTOTAL", "Subtotal")}</span>
              <span>{formatted.subtotal}</span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>{t("CART_FREIGHT", "Frete")}</span>
              <span>{formatted.freight}</span>
            </div>
            <div className="flex justify-between text-lg font-black text-primary">
              <span>{t("CART_TOTAL", "Total")}</span>
              <span className="text-secondary">{formatted.total}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={!total}
            onClick={() => {
              closeCart();
              if (user?.role === "MESA") {
                navigate("/mesa/checkout");
              } else if (!isAuthenticated) {
                navigate("/login?redirect=/checkout");
              } else {
                navigate("/checkout");
              }
            }}
            className={`mt-4 block w-full rounded-2xl px-5 py-4 text-center text-base font-bold transition ${
              total
                ? "bg-secondary text-white shadow-card hover:bg-primary"
                : "cursor-not-allowed bg-border-soft/60 text-text-muted"
            }`}
          >
            {t("CART_BTN_CHECKOUT", "Finalizar Compra")}
          </button>
        </footer>
      </aside>
    </>
  );
}

export default CartDrawer;
