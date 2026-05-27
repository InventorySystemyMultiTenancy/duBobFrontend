export const TOTEM_MODE_KEY = "pc_totem_mode";
export const TOTEM_FULLSCREEN_REQUESTED_KEY =
  "pc_totem_fullscreen_requested";

export function clearTotemMode() {
  localStorage.removeItem(TOTEM_MODE_KEY);
  localStorage.removeItem("pc_token");
  localStorage.removeItem("pc_user");
  sessionStorage.removeItem(TOTEM_FULLSCREEN_REQUESTED_KEY);
}

export function shouldForceExitTotem() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  return (
    path === "/sair-totem" ||
    path === "/normal" ||
    params.get("normal") === "1" ||
    params.get("sairTotem") === "1"
  );
}
