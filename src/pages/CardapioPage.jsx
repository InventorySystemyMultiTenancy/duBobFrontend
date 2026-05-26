import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import CartDrawer from "../components/CartDrawer.jsx";
import ChamarGarcomButton from "../components/ChamarGarcomButton.jsx";
import Navbar from "../components/Navbar.jsx";
import ProductCustomizer from "../components/ProductCustomizer.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";
import { useTranslation } from "../context/I18nContext.jsx";

const fmt = (value) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const getProductPrice = (product) =>
  Number(product?.price ?? product?.basePrice ?? product?.sizes?.[0]?.price ?? 0);

function tProductField(t, productId, field, fallback) {
  const id = String(productId ?? "");
  return t(
    `PRODUCT_${id}_${field}`,
    t(`PRODUCT_${id.toUpperCase()}_${field}`, fallback),
  );
}

function MenuCard({ product, featured }) {
  const [showCustomizer, setShowCustomizer] = useState(false);
  const { t } = useTranslation();
  const productName = tProductField(t, product.id, "NAME", product.name);
  const productDesc = product.description
    ? tProductField(t, product.id, "DESC", product.description)
    : null;

  return (
    <>
      <article
        className="relative flex cursor-pointer overflow-hidden rounded-lg border border-border-soft bg-white shadow-card transition hover:border-secondary/40 hover:shadow-card-hover"
        onClick={() => setShowCustomizer(true)}
      >
        {featured && (
          <span className="absolute left-2 top-2 z-10 rounded bg-secondary px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-widest text-white shadow">
            &#9733; {t("FEATURED_LABEL", "Destaque")}
          </span>
        )}

        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={productName}
            className="h-24 w-24 shrink-0 object-cover sm:h-28 sm:w-28"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center bg-accent text-2xl sm:h-28 sm:w-28">
            &#129481;
          </div>
        )}

        <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
          <div>
            <h3 className="line-clamp-1 font-display text-sm font-black text-primary sm:text-[0.95rem]">
              {productName}
            </h3>
            {productDesc && (
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-text-muted">
                {productDesc}
              </p>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-body text-sm font-black text-secondary">
              {fmt(getProductPrice(product))}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCustomizer(true);
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm transition hover:bg-secondary"
              aria-label="Adicionar"
            >
              +
            </button>
          </div>
        </div>
      </article>

      {showCustomizer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <div
            className="absolute inset-0 bg-primary/60 backdrop-blur-sm"
            onClick={() => setShowCustomizer(false)}
          />
          <div className="relative z-10 w-full max-w-sm">
            <ProductCustomizer
              product={product}
              addonsOptions={product.addons ?? []}
              onClose={() => setShowCustomizer(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

const CATEGORY_ORDER = [
  "acai",
  "açaí",
  "milkshake",
  "milk shake",
  "krekole",
  "premium",
  "especial",
  "complemento",
  "bebida",
  "sobremesa",
];

const MILKSHAKE_LINES = [
  {
    id: "tradicional",
    title: "Milk Shake",
    productId: "db_milkshake_tradicional",
    sizes: [
      { id: "PEQUENA", label: "P", ml: "300 ml", price: 10 },
      { id: "MEDIA", label: "M", ml: "400 ml", price: 13 },
      { id: "GRANDE", label: "G", ml: "500 ml", price: 21 },
      { id: "FAMILIA", label: "MG", ml: "700 ml", price: 22 },
    ],
    flavors: [
      "Abacaxi",
      "Abacaxi com Menta",
      "Acai",
      "Acai com Guarana",
      "Amora",
      "Banana",
      "Banana Caramelizada",
      "Banana com Canela",
      "Baunilha",
      "Beijinho",
      "Bombom",
      "Blue Ice",
      "Brigadeiro",
      "Chocolate",
      "Chocolate Branco",
      "Creme",
      "Creme de Papaya",
      "Cereja",
      "Caramelo",
      "Coco",
      "Coco Queimado",
      "Casadinho",
      "Chocomenta",
      "Chicletes",
      "Doce de Leite",
      "Danoninho",
      "Frutas Vermelhas",
      "Floresta Negra",
      "Goiaba",
      "Iogurte",
      "Kiwi",
      "Laka",
      "Limao Galego",
      "Maca Verde",
      "Mamao Papaya",
      "Menta",
      "Milho Verde",
      "Morango",
      "Mousse de Maracuja",
      "Mousse de Abacaxi",
      "Mousse de Morango",
      "Mousse de Limao",
      "Mousse de Uva",
      "Melao",
      "Napolitano",
      "Passas ao Rum",
      "Pessego",
      "Prestigio",
      "Pinta Lingua Azul",
      "Pinta Lingua Verde",
      "Rum",
      "Refrescante",
      "Sensacao",
      "Sonho de Valsa",
      "Tutti-frutti",
      "Uva",
    ],
  },
  {
    id: "especial",
    title: "Linha Especial",
    productId: "db_milkshake_especial",
    sizes: [
      { id: "PEQUENA", label: "P", ml: "300 ml", price: 13 },
      { id: "MEDIA", label: "M", ml: "400 ml", price: 17 },
      { id: "GRANDE", label: "G", ml: "500 ml", price: 21 },
      { id: "FAMILIA", label: "MG", ml: "700 ml", price: 27 },
    ],
    flavors: [
      "Bis Branco",
      "Bis Preto",
      "Bis Limao",
      "Bis Yogo Frutas Vermelhas",
      "Cafe",
      "Cappucino",
      "Chocolate Meio Amargo",
      "Charger",
      "Choquito Branco",
      "Farinha Lactea",
      "Flocos",
      "Morango com Ovomaltine",
      "Laka Maltine",
      "Leite Ninho",
      "Leite Ninho Trufado",
      "Nescau",
      "Ovomaltine",
      "Pacoquinha",
      "Trufa Branca",
      "Trufa Chocolate",
      "Trufa de Nozes",
      "Trufa de Prestigio",
    ],
  },
  {
    id: "alcoolica",
    title: "Linha Alcoolica",
    productId: "db_milkshake_alcoolico",
    sizes: [
      { id: "PEQUENA", label: "P", ml: "300 ml", price: 13 },
      { id: "MEDIA", label: "M", ml: "400 ml", price: 17 },
      { id: "GRANDE", label: "G", ml: "500 ml", price: 21 },
      { id: "FAMILIA", label: "MG", ml: "700 ml", price: 27 },
    ],
    flavors: [
      "Abacaxi ao Vinho",
      "Amarula",
      "Caipirinha de Limao",
      "Leite Ninho ao Vinho",
      "Morango ao Vinho",
      "Uva ao Vinho",
      "Vodka",
    ],
  },
  {
    id: "premium",
    title: "Linha Premium",
    productId: "db_milkshake_premium",
    sizes: [
      { id: "PEQUENA", label: "P", ml: "300 ml", price: 16 },
      { id: "MEDIA", label: "M", ml: "400 ml", price: 20 },
      { id: "GRANDE", label: "G", ml: "500 ml", price: 25 },
      { id: "FAMILIA", label: "MG", ml: "700 ml", price: 30 },
    ],
    flavors: ["Ferrero Rocher", "Kinder Bueno", "Nutella", "Kinder Ovo", "Kit Kat"],
  },
];

const ACAI_SIZES = [
  { id: "PEQUENA", label: "P", ml: "300 ml", price: 18 },
  { id: "MEDIA", label: "M", ml: "400 ml", price: 20 },
  { id: "GRANDE", label: "G", ml: "500 ml", price: 25 },
  { id: "FAMILIA", label: "MG", ml: "700 ml", price: 35 },
];

const ACAI_FLAVORS = ["Tradicional", "Chocolate", "Trufa Branca", "Iogurte Grego"];

const ACAI_COMPLEMENTS = [
  "Morango",
  "Banana",
  "Kiwi",
  "Leite Condensado",
  "Leite em Po",
  "Ovomaltine",
  "Choco Wafer",
  "Ganache Branco",
  "Ganache Preto",
  "Mini Confete",
  "Granulado",
  "Granola",
  "Cookies Cream",
  "Wafer Branco",
  "Creme de Amendoim",
  "Amendoim Triturado",
  "Creme de Leite Ninho",
  "Choco Wafer Branco",
  "Chocolate com Avela",
];

const CONFIG_CATEGORY_KEYWORDS = [
  "sabor acai",
  "sabor acai",
  "sabor milkshake",
  "complemento acai",
  "complementos acai",
  "adicionais acai",
];

const normalizeText = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const isConfigProduct = (product) =>
  CONFIG_CATEGORY_KEYWORDS.some((keyword) =>
    normalizeText(product?.category).includes(keyword),
  );

function productNamesByCategory(products, categoryNeedle, fallback) {
  const matches = products
    .filter((product) => normalizeText(product.category).includes(categoryNeedle))
    .map((product) => product.name)
    .filter(Boolean);
  return matches.length ? matches : fallback;
}

function sizeDisplayParts(size, fallback = {}) {
  const labelText = size?.label || fallback.label || size?.size || "";
  const parts = String(labelText).split("-").map((part) => part.trim());
  return {
    id: size?.size ?? fallback.id,
    label: parts[0] || fallback.label || size?.size,
    ml: parts.slice(1).join(" - ") || fallback.ml || "",
    price: Number(size?.price ?? fallback.price ?? 0),
  };
}

function sizesFromProduct(products, productId, fallbackSizes) {
  const product = products.find((item) => item.id === productId);
  if (!product?.sizes?.length) return fallbackSizes;
  return product.sizes.map((size, index) =>
    sizeDisplayParts(size, fallbackSizes[index] ?? {}),
  );
}

function buildMilkshakeLines(products) {
  return MILKSHAKE_LINES.map((line) => {
    const categoryNeedle =
      line.id === "tradicional"
        ? "sabor milkshake tradicional"
        : `sabor milkshake ${line.id}`;
    const flavors = productNamesByCategory(products, categoryNeedle, line.flavors);
    return {
      ...line,
      flavors,
      sizes: sizesFromProduct(products, line.productId, line.sizes),
    };
  });
}

function buildAcaiOptions(products) {
  const acaiBase =
    products.find((item) => item.id === "db_acai_copo") ??
    products.find((item) => item.id === "db_acai_tradicional");
  return {
    sizes: acaiBase?.sizes?.length
      ? acaiBase.sizes.map((size, index) =>
          sizeDisplayParts(size, ACAI_SIZES[index] ?? {}),
        )
      : ACAI_SIZES,
    flavors: productNamesByCategory(products, "sabor acai", ACAI_FLAVORS),
    complements: productNamesByCategory(
      products,
      "complemento acai",
      ACAI_COMPLEMENTS,
    ),
  };
}

function CardapioPage() {
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const { addItem, addItems, openCart } = useCart();
  const { t } = useTranslation();

  const { data: mesaOrders = [] } = useQuery({
    queryKey: ["mesa-orders"],
    queryFn: async () => {
      const res = await api.get("/mesa/orders");
      return res.data?.data ?? [];
    },
    enabled: user?.role === "MESA",
    refetchInterval: 30000,
  });

  const pendingTotal =
    user?.role === "MESA"
      ? mesaOrders
          .filter(
            (o) => o.paymentStatus !== "APROVADO" && o.status !== "CANCELADO",
          )
          .reduce((acc, o) => acc + Number(o.total), 0)
      : 0;

  const {
    data: products = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get("/products");
      return res.data?.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: topProducts = [] } = useQuery({
    queryKey: ["top-products"],
    queryFn: async () => {
      const res = await api.get("/products/top?limit=6");
      return res.data?.data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const tCategory = (cat) => {
    const key = `CAT_${(cat ?? "GERAL")
      .toUpperCase()
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_]/g, "")}`;
    return t(key, cat ?? "Geral");
  };

  function getDubobCategoryLabel(category) {
    const raw = String(category ?? "").toLowerCase();
    if (raw.includes("aça") || raw.includes("acai")) return t("CAT_DUBOB_ACAI", "Acai");
    if (raw.includes("milk")) return t("CAT_DUBOB_MILKSHAKES", "Milkshakes");
    if (raw.includes("especial")) return t("CAT_DUBOB_ESPECIAL", "Linha Especial");
    if (raw.includes("premium")) return t("CAT_DUBOB_PREMIUM", "Linha Premium");
    if (raw.includes("alcool") || raw.includes("alco")) return t("CAT_DUBOB_ALCOOLICA", "Linha Alcoolica");
    if (raw.includes("complement") || raw.includes("adicional")) return t("CAT_DUBOB_COMPLEMENTOS", "Complementos");
    if (raw.includes("krekole") || raw.includes("picole")) return t("CAT_DUBOB_KREKOLE", "Krekole");
    if (raw.includes("bebida") || raw.includes("suco") || raw.includes("agua")) return t("CAT_DUBOB_BEBIDAS", "Bebidas");
    return tCategory(category);
  }

  const displayProducts = products.filter((product) => !isConfigProduct(product));

  const rawCategories = Array.from(
    new Set(displayProducts.map((p) => p.category ?? "Geral").filter(Boolean)),
  ).sort((a, b) => {
    const ai = CATEGORY_ORDER.findIndex((k) => a.toLowerCase().includes(k));
    const bi = CATEGORY_ORDER.findIndex((k) => b.toLowerCase().includes(k));
    if (ai === -1 && bi === -1) return a.localeCompare(b, "pt-BR");
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const ALL_LABEL = t("CARDAPIO_CAT_ALL", "Todos");
  const categoryGroups = rawCategories.reduce((acc, rawCategory) => {
    const label = getDubobCategoryLabel(rawCategory);
    acc[label] = [...(acc[label] ?? []), rawCategory];
    return acc;
  }, {});
  const categories = [ALL_LABEL, ...Object.keys(categoryGroups)];
  const normalizedSearch = search.trim().toLowerCase();

  const filtered =
    activeCategory === ALL_LABEL || activeCategory === "Todos"
      ? displayProducts
      : displayProducts.filter((p) =>
          (categoryGroups[activeCategory] ?? [activeCategory]).includes(
            p.category ?? "Geral",
          ),
        );

  const searched = normalizedSearch
    ? filtered.filter((product) =>
        [product.name, product.description, product.category]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(normalizedSearch)),
      )
    : filtered;

  const dailyProducts = displayProducts.filter(
    (product) =>
      Array.isArray(product.availableDays) && product.availableDays.length > 0,
  );
  const topIds = new Set(topProducts.map((p) => p.id));
  const showHomeSections =
    normalizedSearch === "" && activeCategory === ALL_LABEL;

  const handleGuidedAdd = ({ line, flavor, size }) => {
    const product =
      products.find((p) => p.id === line.productId) ||
      products.find((p) => String(p.category ?? "").toLowerCase().includes("milk")) ||
      products[0];

    if (!product?.id) return;

    const name = `${line.title} - ${flavor} ${size.label} (${size.ml})`;
    const observation = `Sabor: ${flavor} | Linha: ${line.title} | Tamanho: ${size.label} ${size.ml}`;

    addItem({
      key: [product.id, line.id, flavor, size.id].join("|"),
      id: product.id,
      nome: name,
      price: size.price,
      addons: [],
      removals: [],
      observation,
      quantity: 1,
      size: size.id,
      payload: {
        productId: product.id,
        size: size.id,
        addonIds: [],
      },
    });
    openCart();
  };

  const milkshakeLines = buildMilkshakeLines(products);
  const acaiOptions = buildAcaiOptions(products);

  const handleAcaiAdd = ({ size, flavor, complements }) => {
    const product =
      products.find((p) => p.id === "db_acai_copo") ||
      products.find((p) => p.id === "db_acai_tradicional") ||
      products.find((p) => normalizeText(p.category).includes("acai no copo")) ||
      products.find((p) => normalizeText(p.name).includes("acai"));
    if (!product?.id) return;

    const extraComplements = complements.length > 4;
    const observation = [
      `Sabor: ${flavor}`,
      `Tamanho: ${size.label} ${size.ml}`,
      `Complementos: ${complements.join(", ") || "nenhum"}`,
      extraComplements ? "Adicional: +4 complementos" : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const cartItems = [
      {
        key: [product.id, "acai", flavor, size.id, complements.join(".")].join("|"),
        id: product.id,
        nome: `Acai ${flavor} ${size.label} (${size.ml})`,
        price: size.price,
        addons: [],
        removals: [],
        observation,
        quantity: 1,
        size: size.id,
        payload: {
          productId: product.id,
          size: size.id,
          addonIds: [],
        },
      },
    ];

    if (extraComplements) {
      const extraProduct =
        products.find((p) => p.id === "db_acai_extra_complementos") ||
        products.find((p) =>
          normalizeText(p.name).includes("adicional 4 complementos"),
        );
      if (extraProduct?.id) {
        cartItems.push({
          key: [extraProduct.id, "acai-extra", complements.slice(4).join(".")].join("|"),
          id: extraProduct.id,
          nome: "Adicional +4 complementos acai",
          price: 5,
          addons: [],
          removals: [],
          observation: `Complementos extras: ${complements.slice(4).join(", ")}`,
          quantity: 1,
          payload: {
            productId: extraProduct.id,
            addonIds: [],
          },
        });
      }
    }

    addItems(cartItems);
    openCart();
  };

  return (
    <main className="min-h-screen bg-accent bg-texture font-body text-text-main">
      <Navbar activeLink="cardapio" />

      <div className="relative overflow-hidden border-b border-secondary/30 bg-primary py-8 text-center text-white">
        <img
          src="/cardapio2.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-primary/70" />
        <p className="relative font-body text-[0.65rem] uppercase tracking-[0.35em] text-gold">
          {t("CARDAPIO_SINCE", "Acai - Milkshake - Krekole")}
        </p>
        <h1 className="relative mt-1 font-display text-3xl font-black text-white sm:text-4xl">
          {t("CARDAPIO_TITLE", "Cardapio Dubob")}
        </h1>
      </div>

      <GuidedMenu
        isProductReady={displayProducts.length > 0}
        milkshakeLines={milkshakeLines}
        acaiOptions={acaiOptions}
        onAddMilkshake={handleGuidedAdd}
        onAddAcai={handleAcaiAdd}
      />

      <div className="sticky top-[73px] z-20 overflow-x-auto border-b border-border-soft bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl px-4 sm:px-8">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors sm:px-5 ${
                activeCategory === cat
                  ? "border-secondary text-secondary"
                  : "border-transparent text-text-muted hover:text-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-8">
        <div className="flex items-center gap-3 rounded-lg border border-border-soft bg-white px-4 py-2.5 shadow-card">
          <span className="text-text-muted">&#128269;</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("CARDAPIO_SEARCH_PH", "Buscar no cardapio...")}
            className="flex-1 bg-transparent text-sm text-text-main outline-none placeholder:text-text-muted/60"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-lg leading-none text-text-muted hover:text-primary"
            >
              &times;
            </button>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
        {!isLoading && !isError && dailyProducts.length > 0 && showHomeSections && (
          <MenuSection
            label={t("CARDAPIO_DAILY_LABEL", "Especial de hoje")}
            title={t("CARDAPIO_DAILY_TITLE", "Especiais do Dia")}
            products={dailyProducts}
            topIds={topIds}
          />
        )}

        {!isLoading && !isError && topProducts.length > 0 && showHomeSections && (
          <MenuSection
            label={t("CARDAPIO_TOP_LABEL", "Favoritos da casa")}
            title={t("CARDAPIO_TOP_TITLE", "Mais Pedidos")}
            products={topProducts}
            featured
            topIds={topIds}
          />
        )}

        {isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg border border-border-soft bg-white/70"
              />
            ))}
          </div>
        )}

        {isError && (
          <p className="py-16 text-center text-text-muted">
            {t("CARDAPIO_ERROR", "Nao foi possivel carregar o cardapio. Tente novamente.")}
          </p>
        )}

        {!isLoading && !isError && searched.length === 0 && (
          <p className="py-16 text-center text-text-muted">
            {normalizedSearch
              ? t("CARDAPIO_EMPTY_SEARCH", "Nenhum item encontrado.")
              : t("CARDAPIO_EMPTY_CAT", "Nenhum item nesta categoria.")}
          </p>
        )}

        {!isLoading && !isError && searched.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {searched.map((product) => (
              <MenuCard
                key={product.id}
                product={product}
                featured={topIds.has(product.id)}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border-soft bg-white py-6 text-center text-xs text-text-muted">
        {t("FOOTER_COPYRIGHT", "Dubob Acai e Milkshake - Desde 2000")}
      </footer>

      {pendingTotal > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3">
          <Link
            to="/mesa/checkout"
            className="flex items-center justify-between gap-3 rounded-lg bg-secondary px-5 py-4 font-semibold text-white shadow-2xl"
          >
            <span className="flex items-center gap-2 text-sm">
              &#128179; {t("CARDAPIO_PAYMENT_PENDING", "Pagamento pendente")}
            </span>
            <span className="text-base font-bold">{fmt(pendingTotal)}</span>
          </Link>
        </div>
      )}

      <CartDrawer />
      <ChamarGarcomButton />
    </main>
  );
}

function MenuSection({ label, title, products, featured = false, topIds }) {
  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-border-soft" />
        <div className="text-center">
          <p className="font-body text-[0.65rem] uppercase tracking-[0.3em] text-secondary">
            {label}
          </p>
          <h2 className="font-display text-xl font-black text-primary">
            {title}
          </h2>
        </div>
        <div className="h-px flex-1 bg-border-soft" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <MenuCard
            key={`${title}-${product.id}`}
            product={product}
            featured={featured || topIds.has(product.id)}
          />
        ))}
      </div>
    </div>
  );
}

function GuidedMenu({
  isProductReady,
  milkshakeLines,
  acaiOptions,
  onAddMilkshake,
  onAddAcai,
}) {
  const [productType, setProductType] = useState(null);
  const [selectedLineId, setSelectedLineId] = useState(milkshakeLines[0].id);
  const [selectedFlavor, setSelectedFlavor] = useState("");
  const [selectedAcaiSize, setSelectedAcaiSize] = useState(null);
  const [selectedAcaiFlavor, setSelectedAcaiFlavor] = useState("");
  const [selectedComplements, setSelectedComplements] = useState([]);

  const selectedLine =
    milkshakeLines.find((line) => line.id === selectedLineId) ??
    milkshakeLines[0];

  const toggleComplement = (complement) => {
    setSelectedComplements((prev) => {
      if (prev.includes(complement)) {
        return prev.filter((item) => item !== complement);
      }
      if (prev.length >= 8) return prev;
      return [...prev, complement];
    });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-secondary">
          Monte seu pedido
        </p>
        <h2 className="mt-1 text-2xl font-black text-primary sm:text-3xl">
          Escolha o produto primeiro
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setProductType("milkshake");
            setSelectedFlavor("");
            setSelectedAcaiSize(null);
            setSelectedAcaiFlavor("");
            setSelectedComplements([]);
          }}
          className={`overflow-hidden rounded-lg border text-left shadow-card transition hover:shadow-card-hover ${
            productType === "milkshake"
              ? "border-secondary bg-white"
              : "border-border-soft bg-white"
          }`}
        >
          <img
            src="/cardapio.png"
            alt="Milk shake Dubob"
            className="h-44 w-full object-cover"
          />
          <div className="p-4">
            <h3 className="text-xl font-black text-primary">Milk shake</h3>
            <p className="mt-1 text-sm text-text-muted">
              Escolha a linha, depois o sabor, depois o tamanho.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setProductType("acai");
            setSelectedFlavor("");
            setSelectedAcaiSize(null);
            setSelectedAcaiFlavor("");
            setSelectedComplements([]);
          }}
          className={`overflow-hidden rounded-lg border text-left shadow-card transition hover:shadow-card-hover ${
            productType === "acai"
              ? "border-secondary bg-white"
              : "border-border-soft bg-white"
          }`}
        >
          <img
            src="/cardapio2.png"
            alt="Acai Dubob"
            className="h-44 w-full object-cover"
          />
          <div className="p-4">
            <h3 className="text-xl font-black text-primary">Acai</h3>
            <p className="mt-1 text-sm text-text-muted">
              Escolha tamanho, sabor e ate 4 complementos inclusos.
            </p>
          </div>
        </button>
      </div>

      {productType === "acai" && (
        <div className="mt-5 rounded-lg border border-border-soft bg-white p-4 shadow-card sm:p-5">
          <div className="grid gap-5 lg:grid-cols-[240px_1fr_300px]">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-secondary">
                1. Tamanho do copo
              </p>
              <div className="space-y-2">
                {acaiOptions.sizes.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setSelectedAcaiSize(size)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left transition ${
                      selectedAcaiSize?.id === size.id
                        ? "border-secondary bg-secondary/10"
                        : "border-border-soft bg-accent/50 hover:border-secondary/40"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-black text-primary">
                        {size.label} - {size.ml}
                      </span>
                    </span>
                    <span className="text-sm font-black text-secondary">
                      {fmt(size.price)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-secondary">
                2. Sabor do acai
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {acaiOptions.flavors.map((flavor) => (
                  <button
                    key={flavor}
                    type="button"
                    disabled={!selectedAcaiSize}
                    onClick={() => setSelectedAcaiFlavor(flavor)}
                    className={`rounded-lg border px-3 py-3 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      selectedAcaiFlavor === flavor
                        ? "border-secondary bg-secondary/10 text-primary"
                        : "border-border-soft bg-accent/50 text-text-muted hover:border-secondary/40 hover:text-primary"
                    }`}
                  >
                    {flavor}
                  </button>
                ))}
              </div>

              <p className="mb-3 mt-5 text-xs font-black uppercase tracking-[0.22em] text-secondary">
                3. Complementos
              </p>
              <div className="grid max-h-[320px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                {acaiOptions.complements.map((complement) => {
                  const selected = selectedComplements.includes(complement);
                  return (
                    <button
                      key={complement}
                      type="button"
                      disabled={!selectedAcaiFlavor}
                      onClick={() => toggleComplement(complement)}
                      className={`rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        selected
                          ? "border-secondary bg-secondary text-white"
                          : "border-border-soft bg-accent/50 text-text-muted hover:border-secondary/40 hover:text-primary"
                      }`}
                    >
                      {complement}
                    </button>
                  );
                })}
              </div>
            </div>

            <aside className="rounded-lg border border-border-soft bg-accent/60 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">
                Resumo
              </p>
              <div className="mt-3 space-y-2 text-sm text-text-muted">
                <p>
                  <strong className="text-primary">Copo:</strong>{" "}
                  {selectedAcaiSize
                    ? `${selectedAcaiSize.label} - ${selectedAcaiSize.ml}`
                    : "Escolha o tamanho"}
                </p>
                <p>
                  <strong className="text-primary">Sabor:</strong>{" "}
                  {selectedAcaiFlavor || "Escolha o sabor"}
                </p>
                <p>
                  <strong className="text-primary">Complementos:</strong>{" "}
                  {selectedComplements.length}/8
                </p>
                <p className="rounded-lg bg-white p-3 text-xs leading-relaxed">
                  Ate 4 complementos inclusos. Do 5 ao 8 adiciona{" "}
                  <strong className="text-secondary">R$ 5,00</strong>.
                </p>
              </div>
              <div className="mt-4 border-t border-border-soft pt-4">
                <p className="text-xs text-text-muted">
                  Total
                </p>
                <p className="text-2xl font-black text-secondary">
                  {fmt(
                    (selectedAcaiSize?.price ?? 0) +
                      (selectedComplements.length > 4 ? 5 : 0),
                  )}
                </p>
              </div>
              <button
                type="button"
                disabled={
                  !isProductReady ||
                  !selectedAcaiSize ||
                  !selectedAcaiFlavor ||
                  selectedComplements.length === 0
                }
                onClick={() =>
                  onAddAcai({
                    size: selectedAcaiSize,
                    flavor: selectedAcaiFlavor,
                    complements: selectedComplements,
                  })
                }
                className="mt-4 w-full rounded-lg bg-primary px-4 py-3 text-sm font-black text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Adicionar acai
              </button>
            </aside>
          </div>
        </div>
      )}

      {productType === "milkshake" && (
        <div className="mt-5 rounded-lg border border-border-soft bg-white p-4 shadow-card sm:p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {milkshakeLines.map((line) => (
              <button
                key={line.id}
                type="button"
                onClick={() => {
                  setSelectedLineId(line.id);
                  setSelectedFlavor("");
                }}
                className={`rounded-lg border px-4 py-2 text-sm font-black transition ${
                  selectedLineId === line.id
                    ? "border-secondary bg-secondary text-white"
                    : "border-border-soft bg-accent text-primary hover:border-secondary/50"
                }`}
              >
                {line.title}
              </button>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-secondary">
                1. Escolha o sabor
              </p>
              <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                {selectedLine.flavors.map((flavor) => (
                  <button
                    key={flavor}
                    type="button"
                    onClick={() => setSelectedFlavor(flavor)}
                    className={`rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition ${
                      selectedFlavor === flavor
                        ? "border-secondary bg-secondary/10 text-primary"
                        : "border-border-soft bg-accent/50 text-text-muted hover:border-secondary/40 hover:text-primary"
                    }`}
                  >
                    {flavor}
                  </button>
                ))}
              </div>
            </div>

            <aside className="rounded-lg border border-border-soft bg-accent/60 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">
                2. Escolha o tamanho
              </p>
              <div className="mt-3 space-y-2">
                {selectedLine.sizes.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    disabled={!selectedFlavor || !isProductReady}
                    onClick={() =>
                      onAddMilkshake({
                        line: selectedLine,
                        flavor: selectedFlavor,
                        size,
                      })
                    }
                    className="flex w-full items-center justify-between rounded-lg border border-border-soft bg-white px-3 py-3 text-left transition hover:border-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>
                      <span className="block text-sm font-black text-primary">
                        {size.label} - {size.ml}
                      </span>
                      <span className="text-xs text-text-muted">
                        {selectedFlavor || "Escolha um sabor antes"}
                      </span>
                    </span>
                    <span className="text-sm font-black text-secondary">
                      {fmt(size.price)}
                    </span>
                  </button>
                ))}
              </div>
              {!isProductReady && (
                <p className="mt-3 text-xs text-red-500">
                  Carregando produtos para liberar o pedido.
                </p>
              )}
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}

export default CardapioPage;
