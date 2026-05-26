import { Link } from "react-router-dom";
import CartDrawer from "../components/CartDrawer.jsx";
import Navbar from "../components/Navbar.jsx";
import { useTranslation } from "../context/I18nContext.jsx";

function HomePage() {
  const { t } = useTranslation();

  const highlights = [
    {
      image: "/cardapio2.png",
      titleKey: "HOME_FEAT_1_TITLE",
      titleDefault: "Acai no copo",
      descKey: "HOME_FEAT_1_DESC",
      descDefault:
        "Escolha tamanho, sabor e complementos para montar o acai do seu jeito.",
    },
    {
      image: "/cardapio.png",
      titleKey: "HOME_FEAT_2_TITLE",
      titleDefault: "Milkshakes",
      descKey: "HOME_FEAT_2_DESC",
      descDefault:
        "Linha tradicional, especial, alcoolica e premium com sabores cremosos.",
    },
    {
      image: "/acai.png",
      titleKey: "HOME_FEAT_3_TITLE",
      titleDefault: "Gelado e rapido",
      descKey: "HOME_FEAT_3_DESC",
      descDefault:
        "Pedidos para retirada, entrega ou mesa com atendimento simples e direto.",
    },
  ];

  return (
    <main className="min-h-screen bg-accent bg-texture font-body text-text-main">
      <Navbar activeLink="home" />

      <section className="relative min-h-[calc(100vh-88px)] overflow-hidden bg-primary text-white">
        <img
          src="/acai.png"
          alt="Acai Dubob"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/70 to-secondary/20" />
        <div className="relative mx-auto flex min-h-[calc(100vh-88px)] max-w-7xl items-center px-5 py-12 sm:px-8">
          <div className="max-w-xl pb-10">
            <img
              src="/LogoDuBob.png"
              alt="Dubob Acai Milkshake Krekole"
              className="mb-8 h-24 w-auto rounded-lg object-contain shadow-glow sm:h-28"
            />
            <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-gold">
              {t("HOME_TAGLINE", "Since 2000 - Acai, milkshake e krekole")}
            </p>
            <h1 className="text-4xl font-black leading-tight sm:text-6xl">
              {t("HOME_HERO_TITLE", "Dubob")}
              <span className="block text-secondary">
                {t("HOME_HERO_SUBTITLE", "gelado do seu jeito")}
              </span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/85">
              {t(
                "HOME_HERO_DESC",
                "Monte seu acai com complementos, escolha seu milkshake favorito e acompanhe tudo pelo cardapio digital.",
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/cardapio"
                className="rounded-lg bg-secondary px-7 py-4 text-sm font-black uppercase tracking-wide text-white shadow-xl transition hover:bg-gold hover:text-primary"
              >
                {t("HOME_BTN_ORDER", "Ver cardapio")}
              </Link>
              <a
                href="#sabores"
                className="rounded-lg border border-white/40 bg-white/10 px-7 py-4 text-sm font-bold uppercase tracking-wide text-white backdrop-blur transition hover:bg-white/20"
              >
                {t("HOME_BTN_FLAVORS", "Sabores")}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="sabores" className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-secondary">
            {t("HOME_FEAT_LABEL", "Escolha, turbine e aproveite")}
          </p>
          <h2 className="mt-2 text-3xl font-black text-primary sm:text-4xl">
            {t("HOME_FEAT_TITLE", "Os favoritos da Dubob")}
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {highlights.map((item) => (
            <article
              key={item.titleKey}
              className="overflow-hidden rounded-lg border border-border-soft bg-white shadow-card"
            >
              <img
                src={item.image}
                alt={t(item.titleKey, item.titleDefault)}
                className="h-48 w-full object-cover"
              />
              <div className="p-5">
                <h3 className="text-lg font-black text-primary">
                  {t(item.titleKey, item.titleDefault)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {t(item.descKey, item.descDefault)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-primary px-5 py-10 text-white sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-gold">
              {t("HOME_ABOUT_LABEL", "Loja de acai e milkshake")}
            </p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              {t("HOME_ABOUT_TITLE", "Cremoso, geladinho e irresistivel")}
            </h2>
          </div>
          <Link
            to="/cardapio"
            className="rounded-lg bg-gold px-7 py-4 text-center text-sm font-black uppercase tracking-wide text-primary transition hover:bg-white"
          >
            {t("HOME_BTN_MENU", "Pedir agora")}
          </Link>
        </div>
      </section>

      <footer className="border-t border-border-soft bg-white py-6 text-center text-xs text-text-muted">
        {t("FOOTER_COPYRIGHT", "Dubob Acai e Milkshake - Desde 2000")}
      </footer>

      <CartDrawer />
    </main>
  );
}

export default HomePage;
