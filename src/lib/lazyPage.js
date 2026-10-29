import { lazy } from "react";

// Depois de um deploy novo, os arquivos antigos das páginas somem da Vercel.
// Se a tela aberta tentar baixar um deles, recarrega uma vez para pegar a
// versão nova em vez de quebrar.
const RELOAD_KEY = "pc_lazy_page_reloaded";

export function lazyPage(load) {
  return lazy(() =>
    load()
      .then((module) => {
        sessionStorage.removeItem(RELOAD_KEY);
        return module;
      })
      .catch((error) => {
        if (!sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, "1");
          window.location.reload();
          return new Promise(() => {});
        }
        throw error;
      }),
  );
}
