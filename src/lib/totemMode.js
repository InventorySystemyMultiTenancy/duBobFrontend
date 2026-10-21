export const TOTEM_MODE_KEY = "pc_totem_mode";
export const TOTEM_ID_KEY = "pc_totem_id";
export const TOTEM_SLUG_KEY = "pc_totem_slug";
export const TOTEM_NAME_KEY = "pc_totem_name";
export const TOTEM_FULLSCREEN_REQUESTED_KEY =
  "pc_totem_fullscreen_requested";

export function clearTotemMode() {
  localStorage.removeItem(TOTEM_MODE_KEY);
  localStorage.removeItem(TOTEM_ID_KEY);
  localStorage.removeItem(TOTEM_SLUG_KEY);
  localStorage.removeItem(TOTEM_NAME_KEY);
  localStorage.removeItem("pc_token");
  localStorage.removeItem("pc_user");
  sessionStorage.removeItem(TOTEM_FULLSCREEN_REQUESTED_KEY);
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
