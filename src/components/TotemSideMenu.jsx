import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useCart } from "../context/CartContext.jsx";
import { TOTEM_SLUG_KEY } from "../lib/totemMode.js";

/**
 * Menu lateral do totem: botão hambúrguer ao lado do logo que abre uma aba
 * pela esquerda com Voltar, as seções do pedido e Sair.
 * Props:
 *   sections: [{ id, title, items: [{ id, label, hint?, active?, half?, disabled?, onSelect }] }]
 *     half: ocupa meia largura (ex.: linhas do milk shake lado a lado)
 *   canGoBack / onBack: volta um passo no pedido
 */
export default function TotemSideMenu({ sections, canGoBack, onBack }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { clearCart, closeCart } = useCart();
  const [open, setOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const close = () => {
    setOpen(false);
    setConfirmExit(false);
  };

  const handleExit = () => {
    close();
    logout();
    clearCart();
    closeCart();
    const slug = localStorage.getItem(TOTEM_SLUG_KEY);
    navigate(slug ? `/${slug}` : "/totem", { replace: true });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-24 top-4 z-[70] flex h-16 w-16 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/40 bg-secondary shadow-card transition hover:bg-primary"
        aria-label="Abrir menu"
      >
        <span className="h-1 w-8 rounded-full bg-white" />
        <span className="h-1 w-8 rounded-full bg-white" />
        <span className="h-1 w-8 rounded-full bg-white" />
      </button>

      <div
        className={`fixed inset-0 z-[72] bg-primary/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={close}
        aria-hidden="true"
      />

      <aside
        className={`fixed left-0 top-0 z-[73] flex h-[100dvh] w-full max-w-sm transform flex-col bg-white text-primary shadow-2xl transition-transform duration-300 ease-in-out sm:rounded-r-[2rem] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between bg-primary px-6 py-5 text-white sm:rounded-tr-[2rem]">
          <img
            src="/LogoDuBob.png"
            alt="Dubob"
            className="h-14 w-auto rounded-xl"
            draggable="false"
          />
          <button
            type="button"
            onClick={close}
            className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 text-3xl font-black transition hover:bg-white/20"
            aria-label="Fechar menu"
          >
            ×
          </button>
        </div>

        <div className="px-5 pt-5">
          <button
            type="button"
            disabled={!canGoBack}
            onClick={() => {
              onBack();
              close();
            }}
            className="flex w-full items-center gap-3 rounded-2xl border-2 border-primary/15 bg-white px-5 py-4 text-xl font-black text-primary transition hover:border-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden="true">←</span> Voltar
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {sections.map((section) => (
            <div key={section.id}>
              <p className="mb-2 px-1 text-xs font-black uppercase tracking-[0.24em] text-secondary">
                {section.title}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => {
                      item.onSelect();
                      close();
                    }}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-base font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      item.half ? "" : "col-span-2"
                    } ${
                      item.active
                        ? "bg-secondary text-white"
                        : "bg-accent/70 text-primary hover:bg-secondary/10"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.hint ? (
                      <span
                        className={`ml-3 truncate text-sm font-semibold ${
                          item.active ? "text-white/85" : "text-text-muted"
                        }`}
                      >
                        {item.hint}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border-soft px-5 py-5">
          {confirmExit ? (
            <div className="space-y-3">
              <p className="text-center text-lg font-black">
                Sair e cancelar o pedido?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmExit(false)}
                  className="w-1/2 rounded-2xl border-2 border-primary/15 px-4 py-4 text-lg font-black text-primary transition hover:border-secondary"
                >
                  Não
                </button>
                <button
                  type="button"
                  onClick={handleExit}
                  className="w-1/2 rounded-2xl bg-secondary px-4 py-4 text-lg font-black text-white transition hover:bg-primary"
                >
                  Sim, sair
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmExit(true)}
              className="w-full rounded-2xl bg-primary px-5 py-4 text-xl font-black uppercase tracking-wide text-white transition hover:bg-secondary"
            >
              Sair
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
