import { useEffect, useState } from "react";

/* global __APP_VERSION__ */
// Em `npm run dev` não existe version.json, então o aviso fica desligado.
const CURRENT_VERSION =
  typeof __APP_VERSION__ !== "undefined" && import.meta.env.PROD
    ? __APP_VERSION__
    : null;

const CHECK_INTERVAL_MS = 60_000;

async function fetchLatestVersion() {
  const res = await fetch(`/version.json?t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.version ?? null;
}

/**
 * Avisa quem está com a página aberta (motoboy, cozinha, caixa...) que saiu
 * uma versão nova do site, com um botão para recarregar.
 */
function UpdateAvailableBanner() {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    if (!CURRENT_VERSION) return undefined;

    let cancelled = false;
    const check = async () => {
      try {
        const latest = await fetchLatestVersion();
        if (!cancelled && latest && latest !== CURRENT_VERSION) {
          setHasUpdate(true);
        }
      } catch {
        // sem internet ou servidor fora: tenta de novo no próximo ciclo
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };

    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!hasUpdate) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-[9999] flex justify-center px-4">
      <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-2xl bg-gray-900 px-4 py-3 text-white shadow-2xl">
        <p className="text-sm">
          <span className="font-semibold">Nova versão disponível.</span>{" "}
          <span className="opacity-80">Atualize para ver as novidades.</span>
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="shrink-0 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-600"
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}

export default UpdateAvailableBanner;
