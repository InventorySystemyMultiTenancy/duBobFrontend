import { useEffect, useState } from "react";
import StatusLayout from "../components/StatusLayout.jsx";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { api } from "../lib/api.js";
import { useTranslation } from "../context/I18nContext.jsx";
import { TOTEM_SLUG_KEY } from "../lib/totemMode.js";

const TOTEM_DONE_SECONDS = 20;

function CheckoutReturnPage() {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const { t } = useTranslation();
  const isTotemMode = localStorage.getItem("pc_totem_mode") === "true";
  const totemSlug = localStorage.getItem(TOTEM_SLUG_KEY);
  const totemPath = totemSlug ? `/${totemSlug}` : "/totem";
  const navigate = useNavigate();

  const status = searchParams.get("status"); // approved | failure | pending | null
  const orderId = searchParams.get("external_reference");
  const paymentId = searchParams.get("payment_id");

  const isApproved = status === "approved";
  const isPending = status === "pending" || status === "in_process";

  useEffect(() => {
    if (isApproved) {
      clearCart();

      // Confirma explicitamente no backend para cobrir casos onde o webhook
      // chegou com external_reference nulo (bug do Mercado Pago)
      if (orderId && paymentId) {
        api
          .post("/payments/checkout-confirm", { orderId, paymentId })
          .catch((err) =>
            console.warn(
              `[checkout-confirm] ${t("CHECKOUT_RETURN_CONFIRM_ERROR", "Erro ao confirmar")}:`,
              err,
            ),
          );
      }
    }
  }, [isApproved, clearCart, orderId, paymentId, t]);

  // Totem: depois do pagamento a tela volta sozinha para o início
  const autoReturn = isTotemMode && (isApproved || isPending);
  const [secondsLeft, setSecondsLeft] = useState(TOTEM_DONE_SECONDS);
  useEffect(() => {
    if (!autoReturn) return undefined;
    const intervalId = setInterval(
      () => setSecondsLeft((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => clearInterval(intervalId);
  }, [autoReturn]);

  useEffect(() => {
    if (autoReturn && secondsLeft === 0) navigate(totemPath, { replace: true });
  }, [autoReturn, secondsLeft, navigate, totemPath]);

  const autoReturnNote = autoReturn ? (
    <p className="mt-3 text-sm font-bold text-smoke">
      Voltando ao início em {secondsLeft}s
    </p>
  ) : null;

  return (
    <StatusLayout>
      <div>
        {isApproved ? (
          <>
            <div className="text-6xl">🎉</div>
            <h1 className="mt-4 font-display text-3xl text-primary">
              {t("CHECKOUT_RETURN_SUCCESS_TITLE", "Pagamento confirmado!")}
            </h1>
            <p className="mt-2 text-sm text-smoke">
              {t(
                "CHECKOUT_RETURN_SUCCESS_SUBTITLE",
                "Seu pedido foi recebido e já está sendo preparado com carinho.",
              )}
            </p>
            {orderId && (
              <p className="mt-3 rounded-xl bg-gray-50 px-4 py-2 font-mono text-xs text-smoke">
                {t("CHECKOUT_RETURN_ORDER_PREFIX", "Pedido")}: #
                {orderId.slice(-8).toUpperCase()}
              </p>
            )}
            <Link
              to={isTotemMode ? totemPath : "/dashboard"}
              className="mt-6 block rounded-full bg-secondary py-4 font-bold text-white transition hover:bg-ember"
            >
              {isTotemMode
                ? "Novo atendimento"
                : t("CHECKOUT_RETURN_SUCCESS_BUTTON", "Acompanhar meu pedido")}
            </Link>
            {autoReturnNote}
          </>
        ) : isPending ? (
          <>
            <div className="text-6xl">⏳</div>
            <h1 className="mt-4 font-display text-3xl text-primary">
              {t("CHECKOUT_RETURN_PENDING_TITLE", "Pagamento em análise")}
            </h1>
            <p className="mt-2 text-sm text-smoke">
              {t(
                "CHECKOUT_RETURN_PENDING_SUBTITLE",
                "Seu pagamento está sendo processado. Assim que confirmado, o preparo será iniciado.",
              )}
            </p>
            <Link
              to={isTotemMode ? totemPath : "/dashboard"}
              className="mt-6 block rounded-full bg-secondary py-4 font-bold text-white transition hover:bg-ember"
            >
              {isTotemMode
                ? "Voltar ao inicio"
                : t("CHECKOUT_RETURN_PENDING_BUTTON", "Ver meus pedidos")}
            </Link>
            {autoReturnNote}
          </>
        ) : (
          <>
            <div className="text-6xl">❌</div>
            <h1 className="mt-4 font-display text-3xl text-secondary">
              {t("CHECKOUT_RETURN_FAILURE_TITLE", "Pagamento não concluído")}
            </h1>
            <p className="mt-2 text-sm text-smoke">
              {t(
                "CHECKOUT_RETURN_FAILURE_SUBTITLE",
                "Houve um problema com o pagamento. Seu carrinho ainda está salvo.",
              )}
            </p>
            <Link
              to="/checkout"
              className="mt-6 block rounded-full bg-secondary py-4 font-bold text-white transition hover:bg-ember"
            >
              {t("CHECKOUT_RETURN_FAILURE_BUTTON", "Tentar novamente")}
            </Link>
            <Link
              to="/cardapio"
              className="mt-3 block text-sm text-gray-400 hover:text-secondary"
            >
              {t("CHECKOUT_RETURN_BACK_MENU", "Voltar ao cardápio")}
            </Link>
          </>
        )}
      </div>
    </StatusLayout>
  );
}

export default CheckoutReturnPage;
