import { api } from "./api.js";

/**
 * Trava global contra duplo clique / duplo toque em todas as páginas.
 *
 * - Um segundo toque no mesmo botão em menos de REPEAT_WINDOW_MS é ignorado.
 * - Qualquer toque em menos de GLOBAL_GAP_MS depois do anterior é ignorado:
 *   no duplo toque, o 2º toque não cai no botão da tela seguinte.
 * - Se o toque disparou um envio para a API (POST/PUT/PATCH/DELETE), o botão
 *   continua travado até a resposta chegar — com internet lenta o cliente não
 *   consegue mandar o pedido/pagamento duas vezes.
 * - Botões onde tocar várias vezes seguidas é intencional (+/− de quantidade
 *   no painel) usam data-allow-repeat para ficar de fora.
 */
const REPEAT_WINDOW_MS = 500;
const GLOBAL_GAP_MS = 350;
const MAX_LOCK_MS = 30_000;
const CLICKABLE =
  'button, a[href], [role="button"], input[type="submit"], input[type="button"]';

let lastClickAt = 0;
let pendingWrites = 0;
let lastWriteStartedAt = 0;
const idleWaiters = new Set();

const isWrite = (config) =>
  !["get", "head", "options"].includes(String(config?.method ?? "get").toLowerCase());

function finishWrite(config) {
  if (!config?.__clickGuardWrite) return;
  config.__clickGuardWrite = false;
  pendingWrites = Math.max(0, pendingWrites - 1);
  if (pendingWrites === 0) {
    idleWaiters.forEach((resolve) => resolve());
    idleWaiters.clear();
  }
}

function waitForWrites(callback) {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    idleWaiters.delete(finish);
    callback();
  };
  idleWaiters.add(finish);
  window.setTimeout(finish, MAX_LOCK_MS);
}

function lockElement(element, clickedAt) {
  element.setAttribute("data-click-locked", "true");
  element.setAttribute("aria-busy", "true");

  const release = () => {
    element.removeAttribute("data-click-locked");
    element.removeAttribute("aria-busy");
  };

  window.setTimeout(() => {
    const startedWriteAfterClick = lastWriteStartedAt >= clickedAt;
    if (pendingWrites > 0 && startedWriteAfterClick) {
      waitForWrites(release);
    } else {
      release();
    }
  }, REPEAT_WINDOW_MS);
}

function handleClick(event) {
  const element = event.target?.closest?.(CLICKABLE);
  if (!element || element.closest("[data-allow-repeat]")) return;

  const now = Date.now();
  if (
    element.getAttribute("data-click-locked") === "true" ||
    now - lastClickAt < GLOBAL_GAP_MS
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }

  lastClickAt = now;
  lockElement(element, now);
}

function blockDoubleClick(event) {
  if (event.target?.closest?.("[data-allow-repeat]")) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

let installed = false;

export function installClickGuard() {
  if (installed) return;
  installed = true;

  api.interceptors.request.use((config) => {
    if (isWrite(config)) {
      config.__clickGuardWrite = true;
      pendingWrites += 1;
      lastWriteStartedAt = Date.now();
    }
    return config;
  });
  api.interceptors.response.use(
    (response) => {
      finishWrite(response.config);
      return response;
    },
    (error) => {
      finishWrite(error.config);
      return Promise.reject(error);
    },
  );

  // Fase de captura no document: roda antes dos handlers do React.
  document.addEventListener("click", handleClick, true);
  document.addEventListener("dblclick", blockDoubleClick, true);
}
