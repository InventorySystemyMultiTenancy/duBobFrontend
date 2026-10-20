import { Link } from "react-router-dom";

/**
 * Cabeçalho padrão das páginas internas (faixa roxa, igual ao topo da Home).
 * - backTo/backLabel: link de voltar (opcional)
 * - eyebrow: texto pequeno acima do título (opcional)
 * - actions: botões à direita (use ui-btn ui-btn-on-dark / ui-btn-accent)
 * - children: conteúdo extra dentro da faixa (ex.: números, abas)
 * - wide: usa largura maior (telas operacionais como cozinha)
 */
export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  backTo,
  backLabel = "Voltar",
  actions,
  children,
  wide = false,
}) {
  const container = wide
    ? "max-w-[96rem] px-4 sm:px-6"
    : "max-w-6xl px-5 sm:px-8";

  return (
    <header className="relative overflow-hidden bg-primary text-white">
      <div
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-secondary/35 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 right-0 h-72 w-72 rounded-full bg-accent-dark/20 blur-3xl"
        aria-hidden="true"
      />
      <div className={`relative mx-auto w-full ${container} py-6 sm:py-8`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {backTo && (
              <Link
                to={backTo}
                className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/85 transition hover:bg-white/20"
              >
                <span aria-hidden="true">←</span> {backLabel}
              </Link>
            )}
            {eyebrow && (
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
                {eyebrow}
              </p>
            )}
            <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1.5 max-w-2xl text-sm text-white/75 sm:text-base">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
        </div>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </header>
  );
}
