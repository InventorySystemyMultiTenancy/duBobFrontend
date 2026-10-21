export const TOTEM_MODE_KEY = "pc_totem_mode";
export const TOTEM_ID_KEY = "pc_totem_id";
export const TOTEM_SLUG_KEY = "pc_totem_slug";
export const TOTEM_NAME_KEY = "pc_totem_name";
export const TOTEM_FULLSCREEN_REQUESTED_KEY =
  "pc_totem_fullscreen_requested";

// Pedido esperando pagamento na maquininha. Fica salvo para, se a página
// recarregar ou o totem reiniciar, voltar direto para a tela de espera.
const TOTEM_PENDING_ORDER_KEY = "pc_totem_pending_order";
const TOTEM_PENDING_ORDER_MAX_AGE_MS = 15 * 60 * 1000;

export function saveTotemPendingOrder(orderId) {
  localStorage.setItem(
    TOTEM_PENDING_ORDER_KEY,
    JSON.stringify({ orderId, savedAt: Date.now() }),
  );
}

export function clearTotemPendingOrder() {
  localStorage.removeItem(TOTEM_PENDING_ORDER_KEY);
}

export function getTotemPendingOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(TOTEM_PENDING_ORDER_KEY));
    if (
      saved?.orderId &&
      Date.now() - Number(saved.savedAt) < TOTEM_PENDING_ORDER_MAX_AGE_MS
    ) {
      return saved.orderId;
    }
  } catch {
    // valor inválido: descarta abaixo
  }
  clearTotemPendingOrder();
  return null;
}

export function clearTotemMode() {
  clearTotemPendingOrder();
  localStorage.removeItem(TOTEM_MODE_KEY);
  localStorage.removeItem(TOTEM_ID_KEY);
  localStorage.removeItem(TOTEM_SLUG_KEY);
  localStorage.removeItem(TOTEM_NAME_KEY);
  localStorage.removeItem("pc_totem_voice");
  localStorage.removeItem("pc_token");
  localStorage.removeItem("pc_user");
  sessionStorage.removeItem(TOTEM_FULLSCREEN_REQUESTED_KEY);
  sessionStorage.removeItem("pc_totem_fullscreen_unavailable");
}

// Tela cheia do totem. Navegadores de quiosque (Fully Kiosk) já rodam em tela
// cheia e não aceitam a API de tela cheia — nesses casos o aviso "volte para
// a tela cheia" nunca pode aparecer, senão o totem fica preso nele.
const TOTEM_FULLSCREEN_UNAVAILABLE_KEY = "pc_totem_fullscreen_unavailable";
const FULLSCREEN_REQUEST_TIMEOUT_MS = 1500;
// Avisa o TotemIdleGuard para reavaliar o aviso quando um pedido de tela cheia termina.
export const TOTEM_FULLSCREEN_CHECK_EVENT = "pc_totem_fullscreen_check";
let fullscreenRequestPending = false;

function isKioskBrowser() {
  return (
    typeof window.fully !== "undefined" ||
    /fully|kiosk/i.test(navigator.userAgent)
  );
}

function canRequestFullscreen() {
  return (
    !isKioskBrowser() &&
    document.fullscreenEnabled !== false &&
    typeof document.documentElement.requestFullscreen === "function" &&
    sessionStorage.getItem(TOTEM_FULLSCREEN_UNAVAILABLE_KEY) !== "true"
  );
}

function looksFullscreen() {
  return (
    Boolean(document.fullscreenElement) ||
    Boolean(window.matchMedia?.("(display-mode: fullscreen)").matches) ||
    (window.innerHeight >= window.screen.height - 1 &&
      window.innerWidth >= window.screen.width - 1)
  );
}

export function shouldShowFullscreenPrompt() {
  return !fullscreenRequestPending && canRequestFullscreen() && !looksFullscreen();
}

// Pede tela cheia sem nunca travar: se o aparelho não entrar em tela cheia,
// marca como indisponível e o aviso não volta mais nesta sessão.
export function requestTotemFullscreen() {
  if (!canRequestFullscreen() || document.fullscreenElement) {
    return Promise.resolve();
  }
  fullscreenRequestPending = true;
  let request;
  try {
    // Chamado direto no toque (o navegador exige o gesto do usuário).
    request = Promise.resolve(document.documentElement.requestFullscreen()).catch(
      () => {},
    );
  } catch {
    request = Promise.resolve();
  }
  const timeout = new Promise((resolve) =>
    window.setTimeout(resolve, FULLSCREEN_REQUEST_TIMEOUT_MS),
  );
  return Promise.race([request, timeout]).then(() => {
    fullscreenRequestPending = false;
    if (!document.fullscreenElement) {
      sessionStorage.setItem(TOTEM_FULLSCREEN_UNAVAILABLE_KEY, "true");
    }
    window.dispatchEvent(new Event(TOTEM_FULLSCREEN_CHECK_EVENT));
  });
}

// Enquanto o cliente paga na maquininha, o timeout de inatividade não pode
// voltar o totem para a tela inicial (TotemIdleGuard escuta este evento).
export const TOTEM_PAYMENT_PENDING_EVENT = "pc_totem_payment_pending_change";
let totemPaymentPending = false;

export function isTotemPaymentPending() {
  return totemPaymentPending;
}

export function setTotemPaymentPending(pending) {
  totemPaymentPending = Boolean(pending);
  window.dispatchEvent(new Event(TOTEM_PAYMENT_PENDING_EVENT));
}

export function shouldForceExitTotem() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const isHomePath = path === "/" || path === "";

  return (
    path === "/sair-totem" ||
    path === "/normal" ||
    (isHomePath &&
      (params.get("normal") === "1" || params.get("sairTotem") === "1"))
  );
}
