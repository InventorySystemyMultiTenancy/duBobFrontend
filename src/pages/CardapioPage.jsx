import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import CartDrawer from "../components/CartDrawer.jsx";
import ChamarGarcomButton from "../components/ChamarGarcomButton.jsx";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";
import { useTranslation } from "../context/I18nContext.jsx";
import MilkShake1 from "/milkshake1.png";
import acai1 from "/acai1.png";

const fmt = (value) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });


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

function fallbackOptions(items) {
  return items.map((item) => ({
    id: item,
    name: item,
    imageUrl: "",
  }));
}

function productOptionsByCategory(products, categoryNeedle, fallback) {
  const matches = products
    .filter((product) => normalizeText(product.category).includes(categoryNeedle))
    .map((product) => ({
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl ?? "",
    }))
    .filter((product) => product.name);
  return matches.length ? matches : fallbackOptions(fallback);
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
        : line.id === "alcoolica"
          ? "sabor milkshake alcool"
        : `sabor milkshake ${line.id}`;
    const flavors = productOptionsByCategory(products, categoryNeedle, line.flavors);
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
    flavors: productOptionsByCategory(products, "sabor acai", ACAI_FLAVORS),
    complements: productOptionsByCategory(
      products,
      "complemento acai",
      ACAI_COMPLEMENTS,
    ),
  };
}

function CardapioPage() {
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

  const displayProducts = products.filter((product) => !isConfigProduct(product));

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
      `Complementos: ${complements.map((item) => item.name).join(", ") || "nenhum"}`,
      extraComplements ? "Adicional: +4 complementos" : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const cartItems = [
      {
        key: [
          product.id,
          "acai",
          flavor,
          size.id,
          complements.map((item) => item.name).join("."),
        ].join("|"),
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
          key: [
            extraProduct.id,
            "acai-extra",
            complements
              .slice(4)
              .map((item) => item.name)
              .join("."),
          ].join("|"),
          id: extraProduct.id,
          nome: "Adicional +4 complementos acai",
          price: 5,
          addons: [],
          removals: [],
          observation: `Complementos extras: ${complements
            .slice(4)
            .map((item) => item.name)
            .join(", ")}`,
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

      <div className="relative overflow-hidden border-b border-secondary/30 bg-primary py-4 text-center text-white sm:py-5">
        <img
          src="/cardapio2.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-primary/70" />
        <p className="relative font-body text-[0.6rem] uppercase tracking-[0.3em] text-gold">
          {t("CARDAPIO_SINCE", "Acai - Milkshake - Krekole")}
        </p>
        <h1 className="relative mt-0.5 font-display text-2xl font-black text-white sm:text-3xl">
          {t("CARDAPIO_TITLE", "Cardapio Dubob")}
        </h1>
      </div>

      <GuidedMenu
        isProductReady={!isLoading && !isError && displayProducts.length > 0}
        milkshakeLines={milkshakeLines}
        acaiOptions={acaiOptions}
        onAddMilkshake={handleGuidedAdd}
        onAddAcai={handleAcaiAdd}
      />

      {isError && (
        <p className="mx-auto max-w-7xl px-4 pb-8 text-center text-sm text-red-500 sm:px-8">
          {t("CARDAPIO_ERROR", "Nao foi possivel carregar o cardapio. Tente novamente.")}
        </p>
      )}

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

function GuidedMenu({
  isProductReady,
  milkshakeLines,
  acaiOptions,
  onAddMilkshake,
  onAddAcai,
}) {
  const isTotemMode = localStorage.getItem("pc_totem_mode") === "true";
  const [productType, setProductType] = useState(null);
  const [selectedLineId, setSelectedLineId] = useState(milkshakeLines[0].id);
  const [selectedFlavor, setSelectedFlavor] = useState("");
  const [selectedAcaiSize, setSelectedAcaiSize] = useState(null);
  const [selectedAcaiFlavor, setSelectedAcaiFlavor] = useState("");
  const [selectedComplements, setSelectedComplements] = useState([]);
  const milkshakeFlowRef = useRef(null);
  const acaiFlowRef = useRef(null);
  const isTotemProductIntro = isTotemMode && !productType;

  const selectedLine =
    milkshakeLines.find((line) => line.id === selectedLineId) ??
    milkshakeLines[0];

  const toggleComplement = (complement) => {
    setSelectedComplements((prev) => {
      if (prev.some((item) => item.name === complement.name)) {
        return prev.filter((item) => item.name !== complement.name);
      }
      if (prev.length >= 8) return prev;
      return [...prev, complement];
    });
  };

  const scrollToFlow = (ref) => {
    window.setTimeout(() => {
      ref.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  };

  return (
    <section
      className={`mx-auto ${
        isTotemProductIntro
          ? "min-h-[calc(100vh-7.5rem)] max-w-none px-3 py-3 sm:px-4"
          : "max-w-7xl px-4 py-5 sm:px-8"
      }`}
    >
      <div className={isTotemProductIntro ? "sr-only" : "mb-3"}>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-secondary">
          Monte seu pedido
        </p>
        <h2 className="mt-1 text-2xl font-black text-primary sm:text-[1.7rem]">
          Escolha o produto primeiro
        </h2>
      </div>

      <div
        className={`grid gap-5 ${
          isTotemProductIntro
            ? "h-[calc(100vh-8.25rem)] min-h-[620px] grid-rows-2"
            : "md:grid-cols-2"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setProductType("milkshake");
            setSelectedFlavor("");
            setSelectedAcaiSize(null);
            setSelectedAcaiFlavor("");
            setSelectedComplements([]);
            scrollToFlow(milkshakeFlowRef);
          }}
          className={`overflow-hidden rounded-lg border text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover ${
            isTotemProductIntro ? "flex min-h-0 flex-col" : ""
          } ${
            productType === "milkshake"
              ? "border-secondary bg-white"
              : "border-border-soft bg-white"
          }`}
        >
          <img
            src={MilkShake1}
            alt="Milk shake Dubob"
            className={`w-full object-cover ${
              isTotemProductIntro
                ? "min-h-0 flex-1"
                : "h-64 sm:h-72 lg:h-80"
            }`}
          />
          <div className={isTotemProductIntro ? "p-6" : "p-5"}>
            <h3
              className={`font-black text-primary ${
                isTotemProductIntro ? "text-4xl" : "text-2xl"
              }`}
            >
              Milk shake
            </h3>
            <p
              className={`mt-1 leading-relaxed text-text-muted ${
                isTotemProductIntro ? "text-xl" : "text-base"
              }`}
            >
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
            scrollToFlow(acaiFlowRef);
          }}
          className={`overflow-hidden rounded-lg border text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover ${
            isTotemProductIntro ? "flex min-h-0 flex-col" : ""
          } ${
            productType === "acai"
              ? "border-secondary bg-white"
              : "border-border-soft bg-white"
          }`}
        >
          <img
            src={acai1}
            alt="Acai Dubob"
            className={`w-full object-cover ${
              isTotemProductIntro
                ? "min-h-0 flex-1"
                : "h-64 sm:h-72 lg:h-80"
            }`}
          />
          <div className={isTotemProductIntro ? "p-6" : "p-5"}>
            <h3
              className={`font-black text-primary ${
                isTotemProductIntro ? "text-4xl" : "text-2xl"
              }`}
            >
              Acai
            </h3>
            <p
              className={`mt-1 leading-relaxed text-text-muted ${
                isTotemProductIntro ? "text-xl" : "text-base"
              }`}
            >
              Escolha tamanho, sabor e ate 4 complementos inclusos.
            </p>
          </div>
        </button>
      </div>

      {productType === "acai" && (
        <div
          ref={acaiFlowRef}
          className="mt-5 scroll-mt-24 rounded-lg border border-border-soft bg-white p-4 shadow-card sm:p-5"
        >
          <div
            className={`grid gap-5 ${
              isTotemMode ? "" : "lg:grid-cols-[240px_1fr_300px]"
            }`}
          >
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-secondary">
                1. Tamanho do copo
              </p>
              <div
                className={`grid gap-2 ${
                  isTotemMode ? "sm:grid-cols-2 xl:grid-cols-4" : ""
                }`}
              >
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
                  <FlavorOptionButton
                    key={flavor.id}
                    option={flavor}
                    selected={selectedAcaiFlavor === flavor.name}
                    disabled={!selectedAcaiSize}
                    fallbackImage={acai1}
                    large={isTotemMode}
                    onClick={() => setSelectedAcaiFlavor(flavor.name)}
                  />
                ))}
              </div>

              <p className="mb-3 mt-5 text-xs font-black uppercase tracking-[0.22em] text-secondary">
                3. Complementos
              </p>
              <div
                className={`grid gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3 ${
                  isTotemMode ? "max-h-[32vh]" : "max-h-[320px]"
                }`}
              >
                {acaiOptions.complements.map((complement) => {
                  const selected = selectedComplements.some(
                    (item) => item.name === complement.name,
                  );
                  return (
                    <FlavorOptionButton
                      key={complement.id}
                      option={complement}
                      selected={selected}
                      disabled={!selectedAcaiFlavor}
                      fallbackImage={acai1}
                      large={isTotemMode}
                      onClick={() => toggleComplement(complement)}
                    />
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
        <div
          ref={milkshakeFlowRef}
          className="mt-5 scroll-mt-24 rounded-lg border border-border-soft bg-white p-4 shadow-card sm:p-5"
        >
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

          <div
            className={`grid gap-5 ${
              isTotemMode ? "" : "lg:grid-cols-[1fr_320px]"
            }`}
          >
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-secondary">
                1. Escolha o sabor
              </p>
              <div
                className={`grid gap-2 overflow-y-auto pr-1 sm:grid-cols-2 ${
                  isTotemMode ? "max-h-[42vh] xl:grid-cols-3" : "max-h-[420px] xl:grid-cols-3"
                }`}
              >
                {selectedLine.flavors.map((flavor) => (
                  <FlavorOptionButton
                    key={flavor.id}
                    option={flavor}
                    selected={selectedFlavor === flavor.name}
                    fallbackImage={MilkShake1}
                    large={isTotemMode}
                    onClick={() => setSelectedFlavor(flavor.name)}
                  />
                ))}
              </div>
            </div>

            <aside className="rounded-lg border border-border-soft bg-accent/60 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-secondary">
                2. Escolha o tamanho
              </p>
              <div
                className={`mt-3 grid gap-2 ${
                  isTotemMode ? "sm:grid-cols-2 xl:grid-cols-4" : ""
                }`}
              >
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

function FlavorOptionButton({
  option,
  selected,
  disabled = false,
  fallbackImage,
  large = false,
  onClick,
}) {
  const imageUrl = option.imageUrl || fallbackImage;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`overflow-hidden rounded-lg border text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? "border-secondary bg-secondary/10 text-primary"
          : "border-border-soft bg-accent/50 text-text-muted hover:border-secondary/40 hover:text-primary"
      }`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={option.name}
          className={`w-full object-cover ${large ? "h-56" : "h-32"}`}
          onError={(event) => {
            if (fallbackImage && event.currentTarget.src !== fallbackImage) {
              event.currentTarget.src = fallbackImage;
              return;
            }
          }}
        />
      ) : (
        <div className={`w-full bg-accent-dark/40 ${large ? "h-56" : "h-32"}`} />
      )}
      <span
        className={`block px-4 font-black leading-tight ${
          large ? "py-5 text-2xl" : "py-3 text-sm"
        }`}
      >
        {option.name}
      </span>
    </button>
  );
}

export default CardapioPage;
