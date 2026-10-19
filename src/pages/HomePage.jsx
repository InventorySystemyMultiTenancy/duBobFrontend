import { Link } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import CartDrawer from "../components/CartDrawer.jsx";
import Navbar from "../components/Navbar.jsx";
import { useTranslation } from "../context/I18nContext.jsx";

const WHATSAPP_NUMBER = String(
  import.meta.env.VITE_DUBOB_WHATSAPP || "5543996714390",
).replace(/\D/g, "");
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

// Alinha a galeria com o conteúdo (max-w-6xl) e deixa as fotos vazarem à direita.
const GALLERY_GUTTER = "max(1.25rem, calc((100vw - 72rem) / 2 + 2rem))";

const GALLERY = [
  { image: "/home/g1.webp", title: "Açaí com frutas e granola" },
  { image: "/home/g2.webp", title: "Milkshakes" },
  { image: "/home/g3.webp", title: "Açaí com morango e banana" },
  { image: "/home/g4.webp", title: "Milkshake com Kinder Bueno" },
  { image: "/home/g5.webp", title: "Açaí e milkshakes" },
  { image: "/home/g6.webp", title: "Milkshake com chocolate" },
  { image: "/home/g7.webp", title: "Açaí no copo" },
  { image: "/home/g8.webp", title: "Milkshake cremoso" },
];

const MENU_BOARDS = [
  { image: "/home/cardapio-acai.webp", title: "Cardápio — Açaí no copo" },
  { image: "/home/cardapio-milkshake.webp", title: "Cardápio — Milkshakes" },
];

const CATEGORIES = [
  {
    to: "/cardapio?tipo=acai",
    image: "/home/acai.webp",
    titleKey: "HOME_CAT_ACAI_TITLE",
    title: "Açaí no copo",
    descKey: "HOME_CAT_ACAI_DESC",
    desc: "Escolha o tamanho, o sabor e 4 complementos inclusos no valor.",
    tags: ["300 ml", "400 ml", "500 ml", "700 ml"],
    ctaKey: "HOME_CAT_ACAI_CTA",
    cta: "Montar meu açaí",
  },
  {
    to: "/cardapio?tipo=milkshake",
    image: "/home/milkshake.webp",
    titleKey: "HOME_CAT_MILK_TITLE",
    title: "Milkshakes",
    descKey: "HOME_CAT_MILK_DESC",
    desc: "Cremosos, do tradicional ao premium — tem até linha alcoólica.",
    tags: ["Tradicional", "Especial", "Premium", "Alcoólica"],
    ctaKey: "HOME_CAT_MILK_CTA",
    cta: "Escolher milkshake",
  },
];

const STEPS = [
  {
    title: "Escolha o copo",
    desc: "Açaí ou milkshake, no tamanho e sabor que você quiser.",
  },
  {
    title: "Turbine",
    desc: "Frutas, cremes, caldas e crocantes. No açaí, 4 já vêm inclusos.",
  },
  {
    title: "Receba ou retire",
    desc: "Entrega na sua casa, retirada no balcão ou direto na mesa.",
  },
];

function ArrowIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 10h11m0 0-4.5-4.5M15 10l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ direction = "right" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={`h-5 w-5 ${direction === "left" ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path
        d="m8 4 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeatureIcon({ type }) {
  const paths = {
    delivery:
      "M3 7h11v8H3zM14 10h3.5l2.5 3v2h-6M7 18.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm11 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z",
    payment: "M3 6.5h18v11H3zM3 10h18M7 14.5h4",
    gift: "M12 8v12M4 12h16v8H4zM3 8h18v4H3zM12 8S10.5 4 8 4.5 7 8 12 8Zm0 0s1.5-4 4-3.5S17 8 12 8Z",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path
        d={paths[type]}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Lightbox({ items, index, onClose, onNavigate }) {
  const item = items[index];
  const hasMany = items.length > 1;

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
      if (hasMany && event.key === "ArrowRight") onNavigate(1);
      if (hasMany && event.key === "ArrowLeft") onNavigate(-1);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [hasMany, onClose, onNavigate]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-white sm:px-6">
        <p className="truncate text-sm font-semibold">
          {item.title}
          {hasMany && (
            <span className="ml-2 text-white/50">
              {index + 1}/{items.length}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Fechar
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 sm:px-16"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={item.image}
          alt={item.title}
          className="max-h-full max-w-full rounded-xl object-contain"
        />
        {hasMany && (
          <>
            <button
              type="button"
              onClick={() => onNavigate(-1)}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30 sm:left-4"
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate(1)}
              aria-label="Próxima foto"
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/30 sm:right-4"
            >
              <ChevronIcon />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function HomePage() {
  const { t } = useTranslation();
  const galleryRef = useRef(null);
  const [lightbox, setLightbox] = useState(null); // { items, index }

  const openLightbox = (items, index) => setLightbox({ items, index });
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const navigateLightbox = useCallback((step) => {
    setLightbox((current) =>
      current
        ? {
            ...current,
            index:
              (current.index + step + current.items.length) %
              current.items.length,
          }
        : current,
    );
  }, []);

  const scrollGallery = (direction) => {
    const track = galleryRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-white font-body text-text-main">
      <Navbar activeLink="home" />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-primary text-white">
        <div
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-secondary/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-accent-dark/25 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold tracking-wide text-white/90">
              <span className="h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
              {t("HOME_TAGLINE", "Desde 2000 · Cornélio Procópio")}
            </span>

            <h1 className="mt-5 font-display text-[2.6rem] font-bold leading-[1.05] sm:text-6xl">
              {t("HOME_HERO_TITLE", "Açaí e milkshake")}
              <span className="block text-gold">
                {t("HOME_HERO_SUBTITLE", "do seu jeito")}
              </span>
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/80">
              {t(
                "HOME_HERO_DESC",
                "Monte seu copo em poucos toques e receba em casa, retire no balcão ou peça direto da mesa.",
              )}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/cardapio"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-gold px-8 py-4 text-base font-extrabold text-primary shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-gold/40"
              >
                {t("HOME_BTN_ORDER", "Fazer meu pedido")}
                <ArrowIcon className="h-5 w-5 transition group-hover:translate-x-1" />
              </Link>
              <button
                type="button"
                onClick={() => openLightbox(MENU_BOARDS, 0)}
                className="inline-flex items-center justify-center rounded-full border-2 border-white/30 px-8 py-4 text-base font-bold text-white transition hover:border-white hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
              >
                {t("HOME_BTN_FLAVORS", "Ver preços e sabores")}
              </button>
            </div>

            <ul className="mt-10 grid gap-3 text-sm font-semibold text-white/85 sm:grid-cols-3">
              <li className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-gold">
                  <FeatureIcon type="delivery" />
                </span>
                Entrega e retirada
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-gold">
                  <FeatureIcon type="payment" />
                </span>
                Pix e cartão
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-gold">
                  <FeatureIcon type="gift" />
                </span>
                4 complementos grátis
              </li>
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-[19rem] sm:max-w-sm lg:max-w-md">
            <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-[2rem] bg-secondary/60" aria-hidden="true" />
            <img
              src="/home/hero.webp"
              alt="Açaí no copo com morango e confeitos"
              width="1000"
              height="1250"
              fetchPriority="high"
              className="relative aspect-[4/5] w-full rounded-[2rem] object-cover shadow-2xl"
            />
            <div className="absolute -bottom-4 -left-3 rounded-2xl bg-white px-4 py-3 text-primary shadow-xl sm:-left-6">
              <p className="font-display text-lg font-semibold leading-none">
                Feito na hora
              </p>
              <p className="mt-1 text-xs font-semibold text-text-muted">
                Do jeitinho que você montou
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categorias ───────────────────────────────────────── */}
      <section className="bg-accent/60 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-bold text-primary sm:text-4xl">
              {t("HOME_FEAT_TITLE", "O que vai ser hoje?")}
            </h2>
            <p className="mt-2 text-base text-text-muted">
              {t("HOME_FEAT_LABEL", "Toque em uma opção para começar a montar.")}
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {CATEGORIES.map((category) => (
              <Link
                key={category.to}
                to={category.to}
                className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-primary/5 transition hover:-translate-y-1 hover:shadow-card-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-secondary/40"
              >
                <div className="relative h-56 overflow-hidden sm:h-64">
                  <img
                    src={category.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-2xl font-semibold text-primary">
                    {t(category.titleKey, category.title)}
                  </h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-text-muted">
                    {t(category.descKey, category.desc)}
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {category.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-primary/80"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-6 inline-flex items-center gap-2 self-start rounded-full bg-secondary px-5 py-3 text-sm font-extrabold text-white transition group-hover:bg-primary">
                    {t(category.ctaKey, category.cta)}
                    <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ────────────────────────────────────── */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="text-center font-display text-3xl font-bold text-primary sm:text-4xl">
            {t("HOME_STEPS_TITLE", "Pedir é simples")}
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative text-center">
                {index < STEPS.length - 1 && (
                  <span
                    className="absolute left-[calc(50%+2.5rem)] right-[calc(-50%+2.5rem)] top-7 hidden border-t-2 border-dashed border-secondary/30 sm:block"
                    aria-hidden="true"
                  />
                )}
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary font-display text-2xl font-bold text-white shadow-glow">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-primary">
                  {step.title}
                </h3>
                <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-text-muted">
                  {step.desc}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Galeria ──────────────────────────────────────────── */}
      <section className="bg-accent/60 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold text-primary sm:text-4xl">
                {t("HOME_GALLERY_TITLE", "Dá uma olhada")}
              </h2>
              <p className="mt-2 text-base text-text-muted">
                {t("HOME_GALLERY_DESC", "Fotos reais dos nossos copos.")}
              </p>
            </div>
            <div className="hidden gap-2 sm:flex">
              <button
                type="button"
                onClick={() => scrollGallery(-1)}
                aria-label="Fotos anteriores"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-primary shadow-card transition hover:bg-primary hover:text-white"
              >
                <ChevronIcon direction="left" />
              </button>
              <button
                type="button"
                onClick={() => scrollGallery(1)}
                aria-label="Próximas fotos"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-primary shadow-card transition hover:bg-primary hover:text-white"
              >
                <ChevronIcon />
              </button>
            </div>
          </div>
        </div>

        <div
          ref={galleryRef}
          className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            paddingInline: GALLERY_GUTTER,
            scrollPaddingInline: GALLERY_GUTTER,
          }}
        >
          {GALLERY.map((item, index) => (
            <button
              key={item.image}
              type="button"
              onClick={() => openLightbox(GALLERY, index)}
              aria-label={`Ampliar foto: ${item.title}`}
              className="group relative w-60 shrink-0 snap-start overflow-hidden rounded-3xl bg-white shadow-card focus:outline-none focus-visible:ring-4 focus-visible:ring-secondary/40 sm:w-72"
            >
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      </section>

      {/* ── Cardápio em imagem ───────────────────────────────── */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-bold text-primary sm:text-4xl">
              {t("HOME_MENU_TITLE", "Preços e sabores")}
            </h2>
            <p className="mt-2 text-base text-text-muted">
              {t(
                "HOME_MENU_DESC",
                "Confira o cardápio completo. Toque para ampliar.",
              )}
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {MENU_BOARDS.map((board, index) => (
              <button
                key={board.image}
                type="button"
                onClick={() => openLightbox(MENU_BOARDS, index)}
                className="group overflow-hidden rounded-3xl bg-white text-left shadow-card ring-1 ring-primary/5 transition hover:-translate-y-1 hover:shadow-card-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-secondary/40"
              >
                <img
                  src={board.image}
                  alt={board.title}
                  loading="lazy"
                  className="aspect-[1266/899] w-full object-cover"
                />
                <span className="flex items-center justify-between px-5 py-4 font-display text-lg font-semibold text-primary">
                  {board.title.replace("Cardápio — ", "")}
                  <span className="text-sm font-bold text-secondary">
                    Ampliar
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chamada final ────────────────────────────────────── */}
      <section className="px-5 pb-14 sm:px-8 sm:pb-20">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-secondary to-primary px-6 py-12 text-center text-white sm:px-12 sm:py-16">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/20 blur-2xl"
            aria-hidden="true"
          />
          <h2 className="relative font-display text-3xl font-bold sm:text-5xl">
            {t("HOME_ABOUT_TITLE", "Bateu vontade?")}
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-base text-white/85 sm:text-lg">
            {t(
              "HOME_ABOUT_LABEL",
              "Monte seu pedido agora. Leva menos de um minuto.",
            )}
          </p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/cardapio"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-8 py-4 text-base font-extrabold text-primary transition hover:-translate-y-0.5 hover:bg-white"
            >
              {t("HOME_BTN_MENU", "Fazer meu pedido")}
              <ArrowIcon />
            </Link>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border-2 border-white/40 px-8 py-4 text-base font-bold text-white transition hover:border-white hover:bg-white/10"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── Rodapé ───────────────────────────────────────────── */}
      <footer className="border-t border-primary/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 py-8 text-sm text-text-muted sm:flex-row sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/LogoDuBob.png"
              alt="Dubob"
              className="h-10 w-auto object-contain"
            />
            <span>
              {t("FOOTER_COPYRIGHT", "Dubob Açaí e Milkshake · desde 2000")}
            </span>
          </div>
          <nav className="flex gap-6 font-semibold text-primary">
            <Link to="/cardapio" className="hover:text-secondary">
              Cardápio
            </Link>
            <Link to="/dashboard" className="hover:text-secondary">
              Meus pedidos
            </Link>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-secondary"
            >
              WhatsApp
            </a>
          </nav>
        </div>
      </footer>

      {lightbox && (
        <Lightbox
          items={lightbox.items}
          index={lightbox.index}
          onClose={closeLightbox}
          onNavigate={navigateLightbox}
        />
      )}

      <CartDrawer />
    </main>
  );
}

export default HomePage;
