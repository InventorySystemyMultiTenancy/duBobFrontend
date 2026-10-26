import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import CartDrawer from "../components/CartDrawer.jsx";
import ChamarGarcomButton from "../components/ChamarGarcomButton.jsx";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";
import { useTranslation } from "../context/I18nContext.jsx";
import MilkShake1 from "/milkshake1.png";
import acai1 from "/acai1.png";

import PageHeader from "../components/PageHeader.jsx";
import TotemSideMenu from "../components/TotemSideMenu.jsx";
import {
  ACAI_PREMIUM_CATEGORY,
  paidComplementOptions,
} from "../lib/paidComplements.js";
import {
  spokenList,
  spokenSize,
  useTotemVoice,
} from "../lib/totemVoice.js";
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

// Cadastrado pelo backend ao subir (server.js); o preço vale do banco no pedido.
const ACAI_EXTRA_COMPLEMENTS_ADDON = {
  id: "db_addon_acai_extra_complementos",
  nome: "4 complementos extras",
  price: 5,
};

const CONFIG_CATEGORY_KEYWORDS = [
  "sabor acai",
  "sabor acai",
  "sabor milkshake",
  "complemento acai",
  "complementos acai",
  "adicionais acai",
  "complemento milkshake",
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
      products.filter(
        (product) => !normalizeText(product.category).includes("premium"),
      ),
      "complemento acai",
      ACAI_COMPLEMENTS,
    ),
    // Premium não entra nos 4 inclusos: cada um soma o próprio preço
    premiumComplements: paidComplementOptions(products, ACAI_PREMIUM_CATEGORY),
  };
}

function CardapioPage() {
  const { user } = useAuth();
  const { addItem, openCart } = useCart();
  const { t } = useTranslation();
  const isTotemMode = localStorage.getItem("pc_totem_mode") === "true";

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
      products.find(
        (p) => !isConfigProduct(p) && normalizeText(p.category).includes("milk"),
      );

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
    return [product.id, line.id, flavor, size.id].join("|");
  };

  const milkshakeLines = buildMilkshakeLines(products);
  const acaiOptions = buildAcaiOptions(products);

  const handleAcaiAdd = ({ size, flavor, complements, premium = [] }) => {
    const product =
      products.find((p) => p.id === "db_acai_copo") ||
      products.find((p) => p.id === "db_acai_tradicional") ||
      products.find(
        (p) => !isConfigProduct(p) && normalizeText(p.category).includes("acai no copo"),
      ) ||
      products.find(
        (p) => !isConfigProduct(p) && normalizeText(p.name).includes("acai"),
      );
    if (!product?.id) return;

    // Do 5º ao 8º complemento cobra +R$ 5,00 como adicional do mesmo item
    // (um produto só no carrinho e no pedido).
    const extraComplements = complements.length > 4;
    const complementNames = complements.map((item) => item.name);
    const observation = [
      `Sabor: ${flavor}`,
      `Tamanho: ${size.label} ${size.ml}`,
      `Complementos: ${complementNames.join(", ") || "nenhum"}`,
    ].join(" | ");
    const extraAddon = [
      ...(extraComplements ? [ACAI_EXTRA_COMPLEMENTS_ADDON] : []),
      ...premium.map((item) => ({ id: item.id, nome: item.name, price: item.price })),
    ];
    const key = [
      product.id,
      "acai",
      flavor,
      size.id,
      complementNames.join("."),
      premium.map((item) => item.name).join("."),
    ].join("|");

    addItem({
      key,
      id: product.id,
      nome: `Acai ${flavor} ${size.label} (${size.ml})`,
      price: size.price,
      addons: extraAddon,
      removals: [],
      observation,
      quantity: 1,
      size: size.id,
      payload: {
        productId: product.id,
        size: size.id,
        addonIds: extraAddon.map((addon) => addon.id),
      },
    });
    openCart();
    return key;
  };

  return (
    <main className="min-h-screen font-body text-text-main">
      <Navbar activeLink="cardapio" />

      {!isTotemMode && (
        <PageHeader
          eyebrow={t("CARDAPIO_SINCE", "Açaí · Milkshake · Krekole")}
          title={t("CARDAPIO_TITLE", "Monte seu pedido")}
          subtitle="Escolha açaí ou milkshake e siga os passos. Leva menos de um minuto."
        />
      )}

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

      {!isTotemMode && (
        <footer className="border-t border-border-soft bg-white py-6 text-center text-xs text-text-muted">
          {t("FOOTER_COPYRIGHT", "Dubob Acai e Milkshake - Desde 2000")}
        </footer>
      )}

      {pendingTotal > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3">
          <Link
            to="/mesa/checkout"
            className="flex items-center justify-between gap-3 rounded-full bg-secondary px-5 py-4 font-semibold text-white shadow-2xl"
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

// Passo a passo do pedido: cada tela mostra só uma etapa.
const PRODUCT_STEPS = {
  milkshake: [
    { id: "linha", label: "Linha", title: "Escolha a linha" },
    { id: "tamanho", label: "Tamanho", title: "Escolha o tamanho" },
    { id: "sabor", label: "Sabor", title: "Escolha o sabor" },
  ],
  acai: [
    { id: "tamanho", label: "Tamanho", title: "Escolha o tamanho do copo" },
    { id: "sabor", label: "Sabor", title: "Escolha o sabor do açaí" },
    { id: "complementos", label: "Complementos", title: "Escolha os complementos" },
  ],
};

function GuidedMenu({
  isProductReady,
  milkshakeLines,
  acaiOptions,
  onAddMilkshake,
  onAddAcai,
}) {
  const isTotemMode = localStorage.getItem("pc_totem_mode") === "true";
  // ?tipo=acai | ?tipo=milkshake (links da home) já abre o fluxo escolhido
  const [searchParams] = useSearchParams();
  const initialType = ["acai", "milkshake"].includes(searchParams.get("tipo"))
    ? searchParams.get("tipo")
    : null;
  const [productType, setProductType] = useState(initialType);
  const [step, setStep] = useState(
    initialType ? PRODUCT_STEPS[initialType][0].id : null,
  );
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [selectedMilkshakeSize, setSelectedMilkshakeSize] = useState(null);
  const [selectedFlavor, setSelectedFlavor] = useState("");
  const [selectedAcaiSize, setSelectedAcaiSize] = useState(null);
  const [selectedAcaiFlavor, setSelectedAcaiFlavor] = useState("");
  const [selectedComplements, setSelectedComplements] = useState([]);
  const [selectedPremium, setSelectedPremium] = useState([]);
  const [justAdded, setJustAdded] = useState(false);
  const {
    items: cartItems,
    updateQuantity,
    removeItem,
    closeCart,
    isCartOpen,
    backAction,
    setBackAction,
  } = useCart();
  const isTotemProductIntro = isTotemMode && !productType;

  const selectedLine =
    milkshakeLines.find((line) => line.id === selectedLineId) ??
    milkshakeLines[0];
  const steps = productType ? PRODUCT_STEPS[productType] : [];
  const stepIndex = steps.findIndex((item) => item.id === step);
  const currentStep = steps[stepIndex];

  const toggleComplement = (complement) => {
    setSelectedComplements((prev) => {
      if (prev.some((item) => item.name === complement.name)) {
        return prev.filter((item) => item.name !== complement.name);
      }
      if (prev.length >= 8) return prev;
      return [...prev, complement];
    });
  };

  const togglePremium = (complement) => {
    setSelectedPremium((prev) =>
      prev.some((item) => item.id === complement.id)
        ? prev.filter((item) => item.id !== complement.id)
        : [...prev, complement],
    );
  };

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const resetSelections = () => {
    setSelectedLineId(null);
    setSelectedMilkshakeSize(null);
    setSelectedFlavor("");
    setSelectedAcaiSize(null);
    setSelectedAcaiFlavor("");
    setSelectedComplements([]);
    setSelectedPremium([]);
  };

  // Só deixa ir para uma etapa se as anteriores já foram escolhidas.
  const isStepReachable = (type, stepId) => {
    if (stepId === PRODUCT_STEPS[type][0].id) return true;
    if (productType !== type) return false;
    if (type === "acai") {
      if (stepId === "sabor") return Boolean(selectedAcaiSize);
      return Boolean(selectedAcaiSize && selectedAcaiFlavor);
    }
    if (stepId === "tamanho") return Boolean(selectedLineId);
    return Boolean(selectedLineId && selectedMilkshakeSize);
  };

  const startProduct = (type) => {
    setJustAdded(false);
    setProductType(type);
    resetSelections();
    setStep(PRODUCT_STEPS[type][0].id);
    scrollTop();
  };

  const goToStep = (type, stepId) => {
    if (productType !== type) {
      startProduct(type);
      return;
    }
    if (!isStepReachable(type, stepId)) return;
    setStep(stepId);
    scrollTop();
  };

  // Voltar vai para a etapa anterior; na primeira, volta para a escolha do produto.
  const goBack = () => {
    if (stepIndex > 0) setStep(steps[stepIndex - 1].id);
    else setProductType(null);
    scrollTop();
  };

  // Depois de colocar no carrinho, recomeça na escolha do produto. O "Voltar"
  // do carrinho tira esse item e reabre a etapa com o que estava escolhido.
  const finishItem = (itemKey, restore) => {
    setJustAdded(true);
    setProductType(null);
    resetSelections();
    scrollTop();
    if (itemKey) {
      setBackAction({
        type: restore.type,
        run: () => undoLastItem({ itemKey, restore }),
      });
    }
  };

  const cartItemsRef = useRef(cartItems);
  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

  const undoLastItem = useCallback(
    ({ itemKey, restore }) => {
      const item = cartItemsRef.current.find((entry) => entry.key === itemKey);
      // Mesmo item já estava no carrinho: só tira a unidade que acabou de entrar
      if (item?.quantity > 1) updateQuantity(itemKey, item.quantity - 1);
      else removeItem(itemKey);
      setJustAdded(false);
      setProductType(restore.type);
      setStep(restore.step);
      setSelectedLineId(restore.lineId ?? null);
      setSelectedMilkshakeSize(restore.milkshakeSize ?? null);
      setSelectedFlavor("");
      setSelectedAcaiSize(restore.acaiSize ?? null);
      setSelectedAcaiFlavor(restore.acaiFlavor ?? "");
      setSelectedComplements(restore.complements ?? []);
      setSelectedPremium(restore.premium ?? []);
      closeCart();
      scrollTop();
    },
    [closeCart, removeItem, updateQuantity],
  );

  const pickLine = (lineId) => {
    if (productType !== "milkshake") {
      setProductType("milkshake");
      resetSelections();
    }
    if (lineId !== selectedLineId) {
      setSelectedMilkshakeSize(null);
      setSelectedFlavor("");
    }
    setSelectedLineId(lineId);
    setStep("tamanho");
    scrollTop();
  };

  const pickMilkshakeSize = (size) => {
    setSelectedMilkshakeSize(size);
    setSelectedFlavor("");
    setStep("sabor");
    scrollTop();
  };

  // Tocar no sabor já coloca o milk shake no carrinho.
  const pickMilkshakeFlavor = (flavor) => {
    setSelectedFlavor(flavor.name);
    const itemKey = onAddMilkshake({
      line: selectedLine,
      flavor: flavor.name,
      size: selectedMilkshakeSize,
    });
    finishItem(itemKey, {
      type: "milkshake",
      step: "sabor",
      lineId: selectedLineId,
      milkshakeSize: selectedMilkshakeSize,
    });
  };

  const pickAcaiSize = (size) => {
    setSelectedAcaiSize(size);
    setStep("sabor");
    scrollTop();
  };

  const pickAcaiFlavor = (flavor) => {
    setSelectedAcaiFlavor(flavor.name);
    setStep("complementos");
    scrollTop();
  };

  const addAcai = () => {
    const itemKey = onAddAcai({
      size: selectedAcaiSize,
      flavor: selectedAcaiFlavor,
      complements: selectedComplements,
      premium: selectedPremium,
    });
    finishItem(itemKey, {
      type: "acai",
      step: "complementos",
      acaiSize: selectedAcaiSize,
      acaiFlavor: selectedAcaiFlavor,
      complements: selectedComplements,
      premium: selectedPremium,
    });
  };

  const sizeHint = (size) => (size ? `${size.label} - ${size.ml}` : "");

  const totemMenuSections = [
    {
      id: "milkshake",
      title: "Milk shake",
      items: [
        ...milkshakeLines.map((line) => ({
          id: `linha-${line.id}`,
          label: line.title,
          half: true,
          active: productType === "milkshake" && selectedLineId === line.id,
          onSelect: () => pickLine(line.id),
        })),
        {
          id: "milkshake-tamanho",
          label: "Tamanho",
          hint: productType === "milkshake" ? sizeHint(selectedMilkshakeSize) : "",
          active: productType === "milkshake" && step === "tamanho",
          disabled: !isStepReachable("milkshake", "tamanho"),
          onSelect: () => goToStep("milkshake", "tamanho"),
        },
        {
          id: "milkshake-sabor",
          label: "Sabor",
          active: productType === "milkshake" && step === "sabor",
          disabled: !isStepReachable("milkshake", "sabor"),
          onSelect: () => goToStep("milkshake", "sabor"),
        },
      ],
    },
    {
      id: "acai",
      title: "Açaí",
      items: PRODUCT_STEPS.acai.map((item) => ({
        id: `acai-${item.id}`,
        label: item.label,
        hint:
          productType !== "acai"
            ? ""
            : item.id === "tamanho"
              ? sizeHint(selectedAcaiSize)
              : item.id === "sabor"
                ? selectedAcaiFlavor
                : selectedComplements.length
                  ? `${selectedComplements.length}/8`
                  : "",
        active: productType === "acai" && step === item.id,
        disabled: !isStepReachable("acai", item.id),
        onSelect: () => goToStep("acai", item.id),
      })),
    },
  ];

  const stepSubtitle =
    productType === "milkshake"
      ? step === "linha"
        ? "Toque em uma opção."
        : step === "tamanho"
          ? `${selectedLine.title}. Toque no tamanho.`
          : `${selectedLine.title}, ${sizeHint(selectedMilkshakeSize)}. Toque no sabor para colocar no carrinho.`
      : step === "tamanho"
        ? "Toque no tamanho."
        : step === "sabor"
          ? `Copo ${sizeHint(selectedAcaiSize)}. Toque no sabor.`
          : `Toque para marcar ou desmarcar. 4 estão inclusos; do 5º ao 8º custa R$ 5,00 a mais.${
              acaiOptions.premiumComplements.length
                ? " Premium é cobrado à parte."
                : ""
            }`;

  const extraComplements = selectedComplements.length > 4;
  const premiumTotal = selectedPremium.reduce((sum, item) => sum + item.price, 0);
  const acaiTotal =
    (selectedAcaiSize?.price ?? 0) + (extraComplements ? 5 : 0) + premiumTotal;
  const complementsChosen = selectedComplements.length + selectedPremium.length;

  // Resumo à direita: o que já foi escolhido em cada etapa.
  const summaryRows =
    productType === "acai"
      ? [
          { label: "Produto", value: "Açaí" },
          { label: "Copo", value: sizeHint(selectedAcaiSize), active: step === "tamanho" },
          { label: "Sabor", value: selectedAcaiFlavor, active: step === "sabor" },
        ]
      : [
          { label: "Produto", value: "Milk shake" },
          {
            label: "Linha",
            value: selectedLineId ? selectedLine.title : "",
            active: step === "linha",
          },
          {
            label: "Tamanho",
            value: sizeHint(selectedMilkshakeSize),
            active: step === "tamanho",
          },
          { label: "Sabor", value: selectedFlavor, active: step === "sabor" },
        ];
  const summaryTotal =
    productType === "acai"
      ? selectedAcaiSize
        ? acaiTotal
        : null
      : (selectedMilkshakeSize?.price ?? null);
  const big = isTotemMode;

  // Voz do totem (só fala se o admin ligou a voz deste totem).
  const voicePrompt = !isTotemMode
    ? ""
    : !productType
      ? justAdded
        ? // Milk shake recém-colocado: quem fala é o carrinho (turbinar)
          isCartOpen && backAction?.type === "milkshake"
          ? ""
          : "Pronto, está no carrinho. Quer pedir mais alguma coisa? Milk shake ou açaí?"
        : "Você quer milk shake ou açaí?"
      : productType === "milkshake"
        ? step === "linha"
          ? `Qual linha de milk shake? ${spokenList(milkshakeLines.map((line) => line.title))}.`
          : step === "tamanho"
            ? `Qual o tamanho? ${selectedLine.sizes.map(spokenSize).join(". ")}.`
            : "Agora toque no sabor para colocar no carrinho."
        : step === "tamanho"
          ? `Qual o tamanho do copo? ${acaiOptions.sizes.map(spokenSize).join(". ")}.`
          : step === "sabor"
            ? `Qual o sabor do açaí? ${spokenList(acaiOptions.flavors.map((flavor) => flavor.name))}.`
            : "Escolha os complementos. Quatro estão inclusos. Depois toque em colocar no carrinho.";
  useTotemVoice(voicePrompt);

  return (
    <section
      className={`mx-auto ${
        isTotemProductIntro
          ? "min-h-screen max-w-none px-3 pb-3 pt-24 sm:px-4"
          : isTotemMode
            ? "max-w-7xl px-4 pb-32 pt-24 sm:px-8"
            : "max-w-7xl px-4 py-5 sm:px-8"
      }`}
    >
      {isTotemMode && productType && (
        // Faixa atrás do logo e do menu para o conteúdo rolado não ficar por baixo deles.
        <div className="fixed inset-x-0 top-0 z-[65] h-24 bg-white/80 shadow-sm backdrop-blur-md" />
      )}
      {isTotemMode && (
        <TotemSideMenu
          sections={totemMenuSections}
          canGoBack={Boolean(productType)}
          onBack={goBack}
        />
      )}

      {!productType ? (
        <>
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
                ? "h-[calc(100vh-6.75rem)] min-h-[620px] grid-rows-2"
                : "md:grid-cols-2"
            }`}
          >
            <ProductChoiceButton
              image={MilkShake1}
              alt="Milk shake Dubob"
              title="Milk shake"
              description="Escolha a linha, depois o tamanho, depois o sabor."
              large={isTotemProductIntro}
              onClick={() => startProduct("milkshake")}
            />
            <ProductChoiceButton
              image={acai1}
              alt="Acai Dubob"
              title="Acai"
              description="Escolha tamanho, sabor e ate 4 complementos inclusos."
              large={isTotemProductIntro}
              onClick={() => startProduct("acai")}
            />
          </div>
        </>
      ) : (
        <div
          className={
            big
              ? "flex min-h-[calc(100vh-7.5rem)] flex-col rounded-3xl bg-white p-5 shadow-card sm:p-8"
              : "rounded-lg border border-border-soft bg-white p-4 shadow-card sm:p-6"
          }
        >
          {/* Voltar e "Passo X de Y" na mesma linha; etapas centralizadas embaixo. */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={goBack}
                className={`flex items-center gap-3 font-black text-primary transition active:scale-95 ${
                  big
                    ? "rounded-2xl border-4 border-primary/20 bg-white px-8 py-5 text-3xl hover:border-secondary"
                    : "rounded-lg border-2 border-primary/15 bg-white px-4 py-2 text-sm hover:border-secondary"
                }`}
              >
                <span aria-hidden="true">←</span> Voltar
              </button>
              <p
                className={`text-right font-bold text-primary/75 ${big ? "text-2xl" : "text-xs"}`}
              >
                {productType === "acai" ? "Açaí" : "Milk shake"} · Passo{" "}
                {stepIndex + 1} de {steps.length}
              </p>
            </div>

            <div>
              <ol className={`flex flex-wrap gap-2 ${big ? "justify-center" : ""}`}>
                {steps.map((item, index) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={!isStepReachable(productType, item.id)}
                      onClick={() => goToStep(productType, item.id)}
                      className={`rounded-full font-black transition disabled:cursor-not-allowed disabled:opacity-35 ${
                        big ? "px-5 py-3 text-xl" : "px-3 py-1 text-xs"
                      } ${
                        item.id === step
                          ? "bg-secondary text-white"
                          : index < stepIndex
                            ? "bg-primary/10 text-primary"
                            : "bg-accent text-primary"
                      }`}
                    >
                      {index < stepIndex ? "✓ " : `${index + 1}. `}
                      {item.label}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className={big ? "mb-6 mt-6 text-center" : "mb-5 mt-5"}>
            <h2
              className={`font-black leading-tight text-primary ${
                big ? "text-5xl" : "text-2xl"
              }`}
            >
              {currentStep?.title}
            </h2>
            <p
              className={`mt-2 font-semibold text-primary/75 ${
                big ? "text-2xl" : "text-sm"
              }`}
            >
              {stepSubtitle}
            </p>
          </div>

          {!isProductReady && (
            <p className={`mb-4 font-bold text-red-600 ${big ? "text-xl" : "text-sm"}`}>
              Carregando produtos para liberar o pedido...
            </p>
          )}

          {/* Opções à esquerda; à direita, o resumo do que já foi escolhido. */}
          <div
            className={
              big
                ? "grid grid-cols-[minmax(0,1fr)_13rem] gap-4 sm:grid-cols-[minmax(0,1fr)_16rem] lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-6 landscape:flex-1 portrait:my-auto"
                : "grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]"
            }
          >
            <div className="flex min-w-0 flex-col">
              {productType === "milkshake" && step === "linha" && (
                <div className={fewOptionsGrid(big)}>
                  {milkshakeLines.map((line) => (
                    <OptionTile
                      key={line.id}
                      big={big}
                      fill
                      title={line.title}
                      image={
                        big
                          ? ""
                          : line.flavors.find((flavor) => flavor.imageUrl)?.imageUrl ||
                            MilkShake1
                      }
                      detail={`${line.flavors.length} sabores`}
                      price={`a partir de ${fmt(Math.min(...line.sizes.map((size) => size.price)))}`}
                      selected={selectedLineId === line.id}
                      onClick={() => pickLine(line.id)}
                    />
                  ))}
                </div>
              )}

              {productType === "milkshake" && step === "tamanho" && (
                <div className={fewOptionsGrid(big, true)}>
                  {selectedLine.sizes.map((size) => (
                    <OptionTile
                      key={size.id}
                      big={big}
                      fill
                      title={size.label}
                      detail={size.ml}
                      price={fmt(size.price)}
                      selected={selectedMilkshakeSize?.id === size.id}
                      disabled={!isProductReady}
                      onClick={() => pickMilkshakeSize(size)}
                    />
                  ))}
                </div>
              )}

              {productType === "milkshake" && step === "sabor" && (
                <div className={manyOptionsGrid(big)}>
                  {selectedLine.flavors.map((flavor) => (
                    <OptionTile
                      key={flavor.id}
                      big={big}
                      title={flavor.name}
                      image={flavor.imageUrl || (big ? "" : MilkShake1)}
                      selected={selectedFlavor === flavor.name}
                      disabled={!isProductReady}
                      onClick={() => pickMilkshakeFlavor(flavor)}
                    />
                  ))}
                </div>
              )}

              {productType === "acai" && step === "tamanho" && (
                <div className={fewOptionsGrid(big, true)}>
                  {acaiOptions.sizes.map((size) => (
                    <OptionTile
                      key={size.id}
                      big={big}
                      fill
                      title={size.label}
                      detail={size.ml}
                      price={fmt(size.price)}
                      selected={selectedAcaiSize?.id === size.id}
                      onClick={() => pickAcaiSize(size)}
                    />
                  ))}
                </div>
              )}

              {productType === "acai" && step === "sabor" && (
                <div
                  className={
                    acaiOptions.flavors.length <= 4
                      ? fewOptionsGrid(big)
                      : manyOptionsGrid(big)
                  }
                >
                  {acaiOptions.flavors.map((flavor) => (
                    <OptionTile
                      key={flavor.id}
                      big={big}
                      fill={acaiOptions.flavors.length <= 4}
                      title={flavor.name}
                      image={flavor.imageUrl || (big ? "" : acai1)}
                      selected={selectedAcaiFlavor === flavor.name}
                      onClick={() => pickAcaiFlavor(flavor)}
                    />
                  ))}
                </div>
              )}

              {productType === "acai" && step === "complementos" && (
                <div className={manyOptionsGrid(big)}>
                  {acaiOptions.complements.map((complement) => {
                    const selected = selectedComplements.some(
                      (item) => item.name === complement.name,
                    );
                    return (
                      <OptionTile
                        key={complement.id}
                        big={big}
                        title={complement.name}
                        image={complement.imageUrl || (big ? "" : acai1)}
                        selected={selected}
                        disabled={!selected && selectedComplements.length >= 8}
                        onClick={() => toggleComplement(complement)}
                      />
                    );
                  })}
                </div>
              )}

              {productType === "acai" &&
                step === "complementos" &&
                acaiOptions.premiumComplements.length > 0 && (
                  <div className={big ? "mt-8" : "mt-6"}>
                    <h3
                      className={`font-black text-primary ${big ? "text-3xl" : "text-xl"}`}
                    >
                      ⭐ Complementos premium
                    </h3>
                    <p
                      className={`mb-4 font-bold text-text-muted ${big ? "text-xl" : "text-sm"}`}
                    >
                      Não entram nos 4 inclusos: cada um é cobrado à parte.
                    </p>
                    <div className={manyOptionsGrid(big)}>
                      {acaiOptions.premiumComplements.map((complement) => (
                        <OptionTile
                          key={complement.id}
                          big={big}
                          title={complement.name}
                          price={`+ ${fmt(complement.price)}`}
                          image={complement.imageUrl || (big ? "" : acai1)}
                          selected={selectedPremium.some(
                            (item) => item.id === complement.id,
                          )}
                          onClick={() => togglePremium(complement)}
                        />
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <OrderSummary
              big={big}
              rows={summaryRows}
              complements={productType === "acai" ? selectedComplements : null}
              premium={productType === "acai" ? selectedPremium : null}
              total={summaryTotal}
            />
          </div>

          {productType === "acai" && step === "complementos" && (
            <ConfirmBar
              big={big}
              summary={
                complementsChosen
                  ? `${selectedComplements.length} de 8 escolhidos${
                      extraComplements ? " (inclui + R$ 5,00)" : ""
                    }${
                      selectedPremium.length
                        ? ` + ${selectedPremium.length} premium`
                        : ""
                    }`
                  : "Escolha pelo menos 1 complemento"
              }
              detail={`Copo ${sizeHint(selectedAcaiSize)} · ${selectedAcaiFlavor}`}
              total={fmt(acaiTotal)}
              disabled={!isProductReady || complementsChosen === 0}
              onConfirm={addAcai}
            />
          )}
        </div>
      )}
    </section>
  );
}

// Até 4 opções: ocupam o resto da tela em 2x2. Rótulos curtos (P, M, G, MG)
// ficam 4 lado a lado com a tela deitada; nomes longos continuam 2x2.
const fewOptionsGrid = (big, shortLabels = false) =>
  big
    ? `grid grid-cols-2 gap-4 sm:gap-5 landscape:flex-1 landscape:auto-rows-fr ${
        shortLabels
          ? "landscape:grid-cols-4"
          : "max-[899px]:portrait:grid-cols-1" // nomes longos em tela em pé estreita
      }`
    : "grid grid-cols-2 gap-4 xl:grid-cols-4";

// Listas longas (sabores, complementos): cartões grandes com rolagem da página.
const manyOptionsGrid = (big) =>
  big
    ? "grid content-start grid-cols-1 gap-4 sm:gap-5 min-[900px]:grid-cols-2 xl:grid-cols-3"
    : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3";

function OptionTile({
  title,
  detail,
  price,
  image,
  selected,
  disabled = false,
  big = false,
  fill = false,
  onClick,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={`relative flex flex-col overflow-hidden transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
        fill ? "" : "text-left"
      } ${
        big ? "rounded-3xl border-4" : "rounded-2xl border-2 shadow-sm hover:shadow-card"
      } ${
        selected
          ? "border-secondary bg-secondary/10"
          : "border-primary/10 bg-accent/50 hover:border-secondary/50"
      } ${
        fill && !big
          ? `items-stretch text-center ${image ? "" : "min-h-40 justify-center"}`
          : fill
          ? `items-center justify-center text-center landscape:h-full ${
              String(title).length <= 3
                ? "portrait:aspect-[4/5]"
                : "portrait:min-h-36 min-[900px]:portrait:aspect-[4/5]"
            }`
          : ""
      }`}
    >
      {selected && (
        <span
          className={`absolute right-3 top-3 z-10 flex items-center justify-center rounded-full bg-secondary font-black text-white shadow-lg ${
            big ? "h-14 w-14 text-3xl" : "h-8 w-8 text-base"
          }`}
          aria-hidden="true"
        >
          ✓
        </span>
      )}
      {image ? (
        <img
          src={image}
          alt=""
          className={`w-full object-cover ${
            fill && big ? "min-h-0 flex-1" : big ? "h-44" : fill ? "h-40" : "h-32"
          }`}
        />
      ) : null}
      <span
        className={`flex flex-col ${
          image ? "" : "flex-1 justify-center"
        } ${
          fill ? "w-full items-center text-center" : ""
        } ${
          big
            ? fill
              ? "gap-1 px-3 py-4 min-[900px]:px-6 min-[900px]:py-6"
              : "gap-1 px-6 py-6"
            : fill
              ? "gap-1 px-4 py-5"
              : "gap-0.5 px-4 py-3"
        } ${
          big && !fill && !image ? "min-h-32" : ""
        } ${selected && !fill ? (big ? "pr-20" : "pr-12") : ""}`}
      >
        <span
          className={`max-w-full break-words font-black leading-tight text-primary ${
            !big
              ? fill
                ? String(title).length <= 3
                  ? "text-4xl"
                  : "text-xl"
                : "text-base"
              : fill && String(title).length <= 3
                ? "whitespace-nowrap text-5xl min-[900px]:text-6xl landscape:text-5xl" // P, M, G, MG
                : fill
                  ? "text-3xl sm:text-4xl landscape:text-3xl"
                  : "text-2xl sm:text-3xl"
          }`}
        >
          {title}
        </span>
        {detail && (
          <span
            className={`font-bold text-primary/70 ${
              big ? (fill ? "text-xl min-[900px]:text-2xl" : "text-xl") : fill ? "text-sm" : "text-xs"
            }`}
          >
            {detail}
          </span>
        )}
        {price && (
          <span
            className={`font-black text-secondary ${
              big ? (fill ? "mt-2 whitespace-nowrap text-2xl min-[900px]:text-3xl" : "text-2xl") : fill ? "mt-1 text-lg" : "text-sm"
            }`}
          >
            {price}
          </span>
        )}
      </span>
    </button>
  );
}

// Coluna da direita: o que o cliente já escolheu (complementos numerados).
function OrderSummary({ big, rows, complements, premium, total }) {
  const included = 4;
  const slots = complements
    ? Math.max(included, Math.min(8, complements.length))
    : 0;

  return (
    <aside
      className={`h-fit self-start rounded-3xl border-2 border-primary/10 bg-accent/60 ${
        big ? "sticky top-28 p-4 sm:p-5" : "sticky top-24 hidden p-4 lg:block"
      }`}
    >
      <p
        className={`font-black uppercase tracking-[0.2em] text-secondary ${
          big ? "text-base" : "text-xs"
        }`}
      >
        Seu pedido
      </p>
      <dl className={big ? "mt-3 space-y-3" : "mt-3 space-y-2"}>
        {rows.map((row) => (
          <div
            key={row.label}
            className={`rounded-2xl px-3 py-2 ${row.active ? "bg-white ring-2 ring-secondary" : ""}`}
          >
            <dt className={`font-bold text-primary/60 ${big ? "text-base" : "text-xs"}`}>
              {row.label}
            </dt>
            <dd
              className={`break-words font-black ${big ? "text-xl" : "text-sm"} ${
                row.value ? "text-primary" : "text-primary/30"
              }`}
            >
              {row.value || "—"}
            </dd>
          </div>
        ))}
      </dl>

      {complements && (
        <div className={big ? "mt-3 px-3" : "mt-2 px-3"}>
          <p className={`font-bold text-primary/60 ${big ? "text-base" : "text-xs"}`}>
            Complementos ({complements.length}/8)
          </p>
          <ol className={big ? "mt-1 space-y-1" : "mt-1 space-y-0.5"}>
            {Array.from({ length: slots }, (_, index) => {
              const item = complements[index];
              return (
                <li
                  key={index}
                  className={`flex gap-2 break-words ${big ? "text-lg" : "text-sm"}`}
                >
                  <span className="font-black text-secondary">{index + 1}:</span>
                  <span className={item ? "font-bold text-primary" : "text-primary/30"}>
                    {item ? item.name : "—"}
                    {item && index >= included ? (
                      <span className="ml-1 text-xs font-black text-secondary">+</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>
          {complements.length > included && (
            <p className={`mt-1 font-bold text-secondary ${big ? "text-sm" : "text-xs"}`}>
              + R$ 5,00 pelos extras
            </p>
          )}
          {premium?.length > 0 && (
            <ul className={big ? "mt-2 space-y-1" : "mt-1 space-y-0.5"}>
              {premium.map((item) => (
                <li
                  key={item.id}
                  className={`flex justify-between gap-2 font-bold text-primary ${big ? "text-lg" : "text-sm"}`}
                >
                  <span className="break-words">⭐ {item.name}</span>
                  <span className="shrink-0 text-secondary">+ {fmt(item.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {total != null && (
        <div className="mt-4 border-t-2 border-primary/10 px-3 pt-3">
          <p className={`font-bold text-primary/60 ${big ? "text-base" : "text-xs"}`}>Total</p>
          <p className={`font-black text-secondary ${big ? "text-3xl" : "text-xl"}`}>
            {fmt(total)}
          </p>
        </div>
      )}
    </aside>
  );
}

// Barra fixa embaixo com o resumo e o botão de colocar no carrinho.
// No totem fica centralizada e esconde o carrinho flutuante enquanto aparece,
// para nada ficar por cima do botão.
function ConfirmBar({ big, summary, detail, total, disabled, onConfirm }) {
  useEffect(() => {
    if (!big) return undefined;
    document.body.classList.add("totem-confirm-bar-open");
    return () => document.body.classList.remove("totem-confirm-bar-open");
  }, [big]);

  return (
    <div
      className={`sticky bottom-0 z-[60] mt-6 flex border-t-2 border-primary/10 bg-white/95 backdrop-blur ${
        big
          ? "-mx-5 flex-col items-center gap-4 px-5 py-5 text-center sm:-mx-8 sm:px-8"
          : "-mx-4 flex-wrap items-center justify-between gap-4 px-4 py-3 sm:-mx-6 sm:px-6"
      }`}
    >
      <div className="min-w-0">
        <p className={`font-black text-primary ${big ? "text-2xl" : "text-sm"}`}>
          {summary}
        </p>
        {detail && (
          <p className={`font-semibold text-primary/70 ${big ? "text-xl" : "text-xs"}`}>
            {detail}
          </p>
        )}
      </div>
      <div
        className={`flex items-center gap-5 ${big ? "w-full max-w-3xl justify-center" : ""}`}
      >
        <p className={`font-black text-secondary ${big ? "text-4xl" : "text-xl"}`}>
          {total}
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={onConfirm}
          className={`rounded-2xl bg-secondary font-black text-white shadow-card transition active:scale-95 hover:bg-primary disabled:cursor-not-allowed disabled:bg-primary/25 ${
            big ? "flex-1 px-8 py-6 text-3xl" : "px-5 py-3 text-sm"
          }`}
        >
          Colocar no carrinho
        </button>
      </div>
    </div>
  );
}

function ProductChoiceButton({ image, alt, title, description, large, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`overflow-hidden rounded-lg border border-border-soft bg-white text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover ${
        large ? "flex min-h-0 flex-col" : ""
      }`}
    >
      <img
        src={image}
        alt={alt}
        className={`w-full object-cover ${
          large ? "min-h-0 flex-1" : "h-64 sm:h-72 lg:h-80"
        }`}
      />
      <div className={large ? "p-6" : "p-5"}>
        <h3
          className={`font-black text-primary ${large ? "text-4xl" : "text-2xl"}`}
        >
          {title}
        </h3>
        <p
          className={`mt-1 leading-relaxed text-text-muted ${
            large ? "text-xl" : "text-base"
          }`}
        >
          {description}
        </p>
      </div>
    </button>
  );
}

export default CardapioPage;
