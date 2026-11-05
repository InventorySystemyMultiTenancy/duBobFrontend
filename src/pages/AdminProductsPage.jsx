import { useState } from "react";
import { cloudinaryImage } from "../lib/cloudinaryImage.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { api } from "../lib/api.js";
import { useTranslation } from "../context/I18nContext.jsx";

import PageHeader from "../components/PageHeader.jsx";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function emptySize() {
  return {
    size: "MEDIA",
    label: "",
    price: "",
    costPrice: "",
  };
}

// Código interno do tamanho (a API usa estes 4) com o nome que o dono entende
const SIZE_OPTIONS = [
  { value: "PEQUENA", label: "P · Pequeno" },
  { value: "MEDIA", label: "M · Médio" },
  { value: "GRANDE", label: "G · Grande" },
  { value: "FAMILIA", label: "MG · Mega" },
];

const WEEKDAY_OPTIONS = [
  { value: "MON", label: "Seg" },
  { value: "TUE", label: "Ter" },
  { value: "WED", label: "Qua" },
  { value: "THU", label: "Qui" },
  { value: "FRI", label: "Sex" },
  { value: "SAT", label: "Sáb" },
  { value: "SUN", label: "Dom" },
];

// Seções do cadastro, na ordem do pedido. kind diz como a seção é mostrada:
// - "product": produto com tamanhos e preços (copo de açaí, linhas de milk shake)
// - "list": itens escolhidos no pedido sem custo extra (sabores, complementos inclusos)
// - "priced": itens cobrados à parte (complementos premium, turbinar milk shake)
const ADMIN_GROUPS = [
  {
    id: "acai",
    label: "Açaí",
    icon: "🍇",
    sections: [
      {
        id: "acai_copo",
        label: "Copo e tamanhos",
        item: "copo",
        kind: "product",
        fixed: true,
        where: "Passo 1 do açaí: os tamanhos P, M, G e MG e o preço de cada um.",
      },
      {
        id: "acai_prontos",
        label: "Copos prontos (sugestões)",
        item: "copo pronto",
        kind: "product",
        where:
          "Depois que o cliente escolhe o tamanho do açaí: copos já montados pela casa, com o preço de cada tamanho. Embaixo aparece o \"Monte o seu\". Escreva na descrição o que vai no copo.",
        category: "acai pronto",
      },
      {
        id: "acai_sabores",
        label: "Sabores",
        item: "sabor",
        kind: "list",
        where: "Passo 2 do açaí: o cliente escolhe 1 sabor.",
        category: "sabor acai",
      },
      {
        id: "acai_sugestoes",
        label: "Sugestão",
        item: "sugestão",
        kind: "priced",
        where:
          "Passo 3 do açaí, ANTES de todos os complementos: sugestões da casa, cada uma com seu preço. Já vêm cadastradas desligadas: defina o preço e ative as que quiser.",
        category: "complemento acai sugestao",
      },
      {
        id: "acai_complementos",
        label: "Complementos inclusos",
        item: "complemento",
        kind: "list",
        where:
          "Passo 3 do açaí: os 4 primeiros complementos escolhidos já estão inclusos no valor do copo.",
        category: "complemento acai",
      },
      {
        id: "acai_complementos_premium",
        label: "Complementos premium",
        item: "complemento premium",
        kind: "priced",
        where:
          "Passo 3 do açaí, em ⭐ Premium: não entram nos 4 inclusos; cada um soma o próprio preço.",
        category: "complemento acai premium",
      },
    ],
  },
  {
    id: "milkshake",
    label: "Milk shake",
    icon: "🥤",
    sections: [
      {
        id: "milkshake_ofertas",
        label: "Ofertas do dia",
        item: "oferta",
        kind: "priced",
        where:
          "Primeira coisa que aparece quando o cliente toca em Milk shake (só se tiver oferta ativa). Ligue o botão Ativo para colocar no ar e desligue para tirar.",
        category: "oferta milkshake",
      },
      {
        id: "milkshake_linhas",
        label: "Linhas e tamanhos",
        item: "linha",
        kind: "product",
        fixed: true,
        where:
          "Passos 1 e 2 do milk shake: as linhas (Tradicional, Especial...) e o preço de cada tamanho.",
      },
      {
        id: "milkshake_tradicional",
        label: "Sabores · Tradicional",
        item: "sabor",
        kind: "list",
        where: "Passo 3 do milk shake, quando o cliente escolhe a linha Tradicional.",
        category: "sabor milkshake tradicional",
      },
      {
        id: "milkshake_especial",
        label: "Sabores · Especial",
        item: "sabor",
        kind: "list",
        where: "Passo 3 do milk shake, na Linha Especial.",
        category: "sabor milkshake especial",
      },
      {
        id: "milkshake_premium",
        label: "Sabores · Premium",
        item: "sabor",
        kind: "list",
        where: "Passo 3 do milk shake, na Linha Premium.",
        category: "sabor milkshake premium",
      },
      {
        id: "milkshake_alcoolico",
        label: "Sabores · Alcoólica",
        item: "sabor",
        kind: "list",
        where: "Passo 3 do milk shake, na Linha Alcoólica.",
        category: "sabor milkshake alcoolico",
      },
      {
        id: "milkshake_complementos",
        label: "Turbinar (adicionais)",
        item: "adicional",
        kind: "priced",
        where:
          "No carrinho, embaixo do milk shake: o cliente pode turbinar e cada adicional soma o próprio preço.",
        category: "complemento milkshake",
      },
    ],
  },
  {
    id: "outros",
    label: "Outros",
    icon: "📦",
    sections: [
      {
        id: "outros",
        label: "Outros produtos",
        item: "produto",
        kind: "product",
        where: "Produtos avulsos (ex.: itens do iFood e cadastros antigos).",
        category: "",
      },
    ],
  },
];

// Itens em categorias que o cardápio não usa (não aparecem para o cliente).
const ORPHAN_SECTION = {
  id: "fora",
  label: "Fora do cardápio",
  item: "item",
  kind: "list",
  where:
    "Estes itens estão numa categoria que o cardápio não usa, então NÃO aparecem para o cliente. Em Editar, escolha em \"Onde aparece\" a seção certa, ou desative.",
};

const ALL_SECTIONS = [
  ...ADMIN_GROUPS.flatMap((group) =>
    group.sections.map((section) => ({ ...section, group })),
  ),
  ORPHAN_SECTION,
];
// "Nova sugestão", "Nova linha", "Novo complemento"
const newLabel = (item) => `${/(a|ão)$/.test(item) ? "Nova" : "Novo"} ${item}`;

const sectionById = (id) =>
  ALL_SECTIONS.find((section) => section.id === id) ?? ALL_SECTIONS[0];

// Seções que podem ser escolhidas em "Onde aparece" (as fixas não)
const MOVABLE_SECTIONS = ALL_SECTIONS.filter(
  (section) => section.category !== undefined && !section.fixed,
);

// Links antigos (?secao=bases, ?secao=all) continuam funcionando
const LEGACY_SECTION_IDS = { bases: "acai_copo", all: "acai_copo" };

const ACAI_BASE_IDS = new Set(["db_acai_copo", "db_acai_tradicional"]);
const MILKSHAKE_BASE_IDS = new Set([
  "db_milkshake_tradicional",
  "db_milkshake_especial",
  "db_milkshake_alcoolico",
  "db_milkshake_premium",
]);

// "Importar padrão": nomes sugeridos para seções ainda vazias
const DEFAULT_SECTION_IMPORTS = {
  milkshake_tradicional: [
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
  milkshake_especial: [
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
  milkshake_alcoolico: [
    "Abacaxi ao Vinho",
    "Amarula",
    "Caipirinha de Limao",
    "Leite Ninho ao Vinho",
    "Morango ao Vinho",
    "Uva ao Vinho",
    "Vodka",
  ],
  milkshake_premium: [
    "Ferrero Rocher",
    "Kinder Bueno",
    "Nutella",
    "Kinder Ovo",
    "Kit Kat",
  ],
  acai_sabores: ["Tradicional", "Chocolate", "Trufa Branca", "Iogurte Grego"],
  // Inclusos no valor do copo; os demais complementos são premium
  acai_complementos: [
    "Leite Condensado",
    "Leite em Po",
    "Granola",
    "Amendoim Triturado",
    "Granulado",
    "Cobertura de Chocolate",
    "Cobertura de Morango",
    "Cobertura de Caramelo",
    "Banana",
  ],
};

const normalizeText = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const fmt = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function isConfigCategory(category) {
  const normalized = normalizeText(category);
  return (
    normalized.includes("sabor ") ||
    normalized.includes("complemento") ||
    normalized.includes("adicionais")
  );
}

// Em qual seção o produto aparece. Usa as mesmas regras do cardápio
// (CardapioPage), para o admin mostrar só o que o cliente realmente vê.
function sectionIdOfProduct(product) {
  const category = normalizeText(product.category);
  if (ACAI_BASE_IDS.has(product.id)) return "acai_copo";
  if (MILKSHAKE_BASE_IDS.has(product.id)) return "milkshake_linhas";
  if (category.includes("acai pronto")) return "acai_prontos";
  if (category.includes("sabor milkshake tradicional")) return "milkshake_tradicional";
  if (category.includes("sabor milkshake especial")) return "milkshake_especial";
  if (category.includes("sabor milkshake premium")) return "milkshake_premium";
  if (category.includes("sabor milkshake alcool")) return "milkshake_alcoolico";
  if (category.includes("sabor acai")) return "acai_sabores";
  if (category.includes("complemento acai premium")) return "acai_complementos_premium";
  if (category.includes("complemento acai sugestao")) return "acai_sugestoes";
  if (category.includes("complemento acai")) return "acai_complementos";
  if (category.includes("complemento milkshake")) return "milkshake_complementos";
  if (category.includes("oferta milkshake")) return "milkshake_ofertas";
  if (!isConfigCategory(product.category)) return "outros";
  return "fora";
}

function formatAvailableDays(days) {
  if (!Array.isArray(days) || days.length === 0) return "Todos os dias";
  const labelByValue = Object.fromEntries(
    WEEKDAY_OPTIONS.map((day) => [day.value, day.label]),
  );
  return days.map((day) => labelByValue[day] ?? day).join(", ");
}

function sizeLabel(size) {
  return (
    size.label ||
    SIZE_OPTIONS.find((option) => option.value === size.size)?.label ||
    size.size
  );
}

function tProductField(t, productId, field, fallback) {
  const id = String(productId ?? "");
  const upperValue = t(`PRODUCT_${id.toUpperCase()}_${field}`, fallback);
  return t(`PRODUCT_${id}_${field}`, upperValue);
}

// Ações de um produto (ativar/desativar, excluir, salvar preço) usadas nas linhas e cartões
function useProductActions(product) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-products"] });

  const toggleActive = useMutation({
    mutationFn: async () => {
      if (product.isActive) {
        await api.delete(`/admin/products/${product.id}`);
      } else {
        await api.patch(`/admin/products/${product.id}/restore`);
      }
    },
    onSuccess: () => {
      refresh();
      toast.success(product.isActive ? "Desativado: não aparece mais no cardápio." : "Ativado: já aparece no cardápio.");
    },
    onError: () => toast.error(t("ADMIN_PRODUCTS_STATUS_ERROR", "Falha ao alterar status")),
  });

  const deleteProduct = useMutation({
    mutationFn: async () => {
      await api.delete(`/admin/products/${product.id}/permanent`);
    },
    onSuccess: () => {
      refresh();
      toast.success("Excluído.");
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.error?.message || "Falha ao excluir. Desative para esconder do cardápio.",
      );
    },
  });

  const confirmDelete = async () => {
    const result = await Swal.fire({
      title: `Excluir "${product.name}"?`,
      text: "Remove o cadastro de vez. Itens que já foram vendidos não podem ser excluídos (desative em vez disso).",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
    });
    if (result.isConfirmed) deleteProduct.mutate();
  };

  // Preço de item cobrado à parte = preço do primeiro tamanho
  const savePrice = useMutation({
    mutationFn: async (price) => {
      const first = product.sizes?.[0] ?? {};
      await api.put(`/admin/products/${product.id}`, {
        category: product.category,
        sizes: [
          {
            size: first.size ?? "PEQUENA",
            label: first.label || "Adicional",
            price: Number(price),
            ...(first.costPrice != null ? { costPrice: Number(first.costPrice) } : {}),
          },
        ],
      });
    },
    onSuccess: () => {
      refresh();
      toast.success("Preço salvo.");
    },
    onError: (error) =>
      toast.error(error?.response?.data?.message || "Não foi possível salvar o preço."),
  });

  // "Mais pedido" (sabores do milk shake): rank = posição no topo; null tira
  const setFeatured = useMutation({
    mutationFn: async (featuredRank) => {
      await api.put(`/admin/products/${product.id}`, {
        category: product.category,
        featuredRank,
      });
    },
    onSuccess: (_data, featuredRank) => {
      refresh();
      toast.success(featuredRank ? "Agora está nos mais pedidos." : "Saiu dos mais pedidos.");
    },
    onError: () => toast.error("Não foi possível mudar os mais pedidos."),
  });

  return { toggleActive, confirmDelete, deleteProduct, savePrice, setFeatured };
}

function Thumb({ product, size = "h-16 w-16" }) {
  const [failed, setFailed] = useState(false);
  return product.imageUrl && !failed ? (
    <img
      src={cloudinaryImage(product.imageUrl, 160)}
      alt=""
      className={`${size} shrink-0 rounded-xl object-cover`}
      onError={() => setFailed(true)}
    />
  ) : (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-xl bg-accent text-2xl font-black text-primary/50`}
      aria-hidden="true"
    >
      {String(product.name ?? "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

// requirePrice: item cobrado à parte só pode ser ativado com preço
function ActiveSwitch({ product, actions, requirePrice = false }) {
  const on = product.isActive;
  const hasPrice = Number(product.sizes?.[0]?.price) > 0;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={actions.toggleActive.isPending}
      onClick={() => {
        if (!on && requirePrice && !hasPrice) {
          toast.error("Defina o preço primeiro e toque em Salvar; depois ative.");
          return;
        }
        actions.toggleActive.mutate();
      }}
      title={on ? "Aparece no cardápio. Toque para esconder." : "Escondido. Toque para mostrar no cardápio."}
      className="flex shrink-0 items-center gap-2 disabled:opacity-50"
    >
      <span
        className={`relative h-8 w-14 rounded-full transition ${on ? "bg-green-500" : "bg-gray-300"}`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
            on ? "left-7" : "left-1"
          }`}
        />
      </span>
      <span className={`w-16 text-left text-sm font-bold ${on ? "text-green-700" : "text-gray-500"}`}>
        {on ? "Ativo" : "Oculto"}
      </span>
    </button>
  );
}

function RowActions({ product, actions, onEdit, extra }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {extra}
      <button
        type="button"
        onClick={() => onEdit(product)}
        className="rounded-full border border-primary/15 px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/5"
      >
        Editar
      </button>
      {!product.isActive && (
        <button
          type="button"
          disabled={actions.deleteProduct.isPending}
          onClick={actions.confirmDelete}
          className="rounded-full border border-red-200 px-5 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
        >
          Excluir
        </button>
      )}
    </div>
  );
}

// Linha de item escolhido sem custo extra (sabor, complemento incluso) ou fora do cardápio
// nextRank: quando a seção usa "mais pedidos", a posição que o item ganha ao ser marcado
function ListRow({
  product,
  onEdit,
  onMakePremium,
  nextRank,
  showCategory = false,
  showSection = false,
}) {
  const { t } = useTranslation();
  const actions = useProductActions(product);
  const name = tProductField(t, product.id, "NAME", product.name);
  const days = formatAvailableDays(product.availableDays);
  const section = sectionById(sectionIdOfProduct(product));

  return (
    <div
      className={`min-w-0 rounded-2xl border p-4 transition ${
        product.isActive ? "border-gray-200 bg-white" : "border-dashed border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <Thumb product={product} />
        <div className={`min-w-0 flex-1 ${product.isActive ? "" : "opacity-60"}`}>
          <p className="truncate text-lg font-bold text-gray-900">
            {product.featuredRank != null && nextRank != null && (
              <span className="mr-2 rounded-full bg-orange-100 px-2 py-0.5 text-sm font-black text-orange-700">
                🔥 {product.featuredRank}º
              </span>
            )}
            {name}
          </p>
          <p className="truncate text-sm text-gray-500">
            {showSection && `${section.group ? `${section.group.label} › ` : ""}${section.label} · `}
            {showCategory && `Categoria "${product.category || "sem categoria"}" · `}
            {days}
          </p>
        </div>
        <ActiveSwitch product={product} actions={actions} />
      </div>
      <div className="mt-3 flex justify-end">
      <RowActions
        product={product}
        actions={actions}
        onEdit={onEdit}
        extra={
          nextRank != null ? (
            <button
              type="button"
              disabled={actions.setFeatured.isPending}
              onClick={() =>
                actions.setFeatured.mutate(product.featuredRank != null ? null : nextRank)
              }
              title="Mais pedidos aparecem no topo dos sabores dessa linha"
              className={`rounded-full border px-5 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
                product.featuredRank != null
                  ? "border-orange-300 bg-orange-100 text-orange-700 hover:bg-orange-200"
                  : "border-orange-200 bg-white text-orange-600 hover:bg-orange-50"
              }`}
            >
              {product.featuredRank != null ? "🔥 Tirar dos mais pedidos" : "🔥 Mais pedido"}
            </button>
          ) : onMakePremium && product.isActive ? (
            <button
              type="button"
              onClick={() => onMakePremium(product)}
              title="Passa a ser cobrado à parte, com preço próprio"
              className="rounded-full border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
            >
              ⭐ Tornar premium
            </button>
          ) : null
        }
      />
      </div>
    </div>
  );
}

// Linha de item cobrado à parte, com o preço editável ali mesmo
function PricedRow({ product, onEdit, showSection = false }) {
  const { t } = useTranslation();
  const actions = useProductActions(product);
  const name = tProductField(t, product.id, "NAME", product.name);
  const currentPrice = Number(product.sizes?.[0]?.price ?? 0);
  const [price, setPrice] = useState(currentPrice ? String(currentPrice) : "");
  const dirty = price !== "" && Number(price) !== currentPrice;
  const invalid = price !== "" && !(Number(price) > 0);
  const section = sectionById(sectionIdOfProduct(product));

  return (
    <div
      className={`min-w-0 rounded-2xl border p-4 transition ${
        product.isActive ? "border-gray-200 bg-white" : "border-dashed border-gray-200 bg-gray-50"
      } ${!currentPrice && product.isActive ? "ring-2 ring-amber-300" : ""}`}
    >
      <div className="flex items-center gap-3">
        <Thumb product={product} />
        <div className={`min-w-0 flex-1 ${product.isActive ? "" : "opacity-60"}`}>
          <p className="truncate text-lg font-bold text-gray-900">{name}</p>
          <p className="truncate text-sm text-gray-500">
            {showSection && `${section.group ? `${section.group.label} › ` : ""}${section.label} · `}
{currentPrice
              ? section.id === "milkshake_ofertas"
                ? `Oferta por ${fmt(currentPrice)}`
                : `Cobrado ${fmt(currentPrice)} a mais`
              : "⚠️ Sem preço: não aparece para o cliente"}
          </p>
        </div>
        <ActiveSwitch product={product} actions={actions} requirePrice />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (dirty && !invalid) actions.savePrice.mutate(price);
        }}
      >
        <label className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-2 focus-within:border-secondary">
          <span className="text-sm font-bold text-gray-500">R$</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            aria-label={`Preço de ${name}`}
            placeholder="0,00"
            className="w-24 bg-transparent px-2 py-2.5 text-base font-bold text-gray-900 outline-none"
          />
        </label>
        {dirty && (
          <button
            type="submit"
            disabled={invalid || actions.savePrice.isPending}
            className="rounded-full bg-secondary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary disabled:opacity-50"
          >
            {actions.savePrice.isPending ? "Salvando..." : "Salvar"}
          </button>
        )}
      </form>
      <RowActions product={product} actions={actions} onEdit={onEdit} />
      </div>
    </div>
  );
}

// Cartão de produto com tamanhos e preços (copo de açaí, linhas de milk shake, avulsos)
function ProductCard({ product, onEdit }) {
  const { t } = useTranslation();
  const actions = useProductActions(product);
  const name = tProductField(t, product.id, "NAME", product.name);
  const description = product.description
    ? tProductField(t, product.id, "DESC", product.description)
    : null;

  return (
    <article
      className={`flex min-w-0 flex-col rounded-3xl border p-6 transition ${
        product.isActive ? "border-gray-200 bg-white shadow-card" : "border-dashed border-gray-200 bg-gray-50"
      }`}
    >
      <div className={`flex items-start gap-3 ${product.isActive ? "" : "opacity-60"}`}>
        <Thumb product={product} size="h-24 w-24" />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-2xl font-bold leading-tight text-primary">{name}</h3>
          {description && <p className="mt-1 line-clamp-3 text-sm text-gray-500">{description}</p>}
          <p className="mt-1 text-sm text-gray-400">{formatAvailableDays(product.availableDays)}</p>
        </div>
      </div>

      <table className={`mt-5 w-full text-lg ${product.isActive ? "" : "opacity-60"}`}>
        <thead>
          <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-400">
            <th className="pb-1 font-bold">Tamanho</th>
            <th className="pb-1 text-right font-bold">Preço</th>
            <th className="pb-1 text-right font-bold">Custo</th>
          </tr>
        </thead>
        <tbody>
          {(product.sizes ?? []).map((size) => (
            <tr key={size.id ?? size.size} className="border-t border-gray-100">
              <td className="py-2.5 font-semibold text-gray-800">{sizeLabel(size)}</td>
              <td className="py-2.5 text-right font-bold text-secondary">{fmt(size.price)}</td>
              <td className="py-2.5 text-right text-gray-500">
                {size.costPrice != null ? fmt(size.costPrice) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
        <ActiveSwitch product={product} actions={actions} />
        <RowActions product={product} actions={actions} onEdit={onEdit} />
      </div>
    </article>
  );
}

// Formulário de cadastro e edição. Mostra só os campos que fazem sentido para
// o tipo de item: sabor/complemento incluso (sem preço), item cobrado à parte
// (um preço) ou produto com tamanhos (tabela de preços).
function ProductModal({ product, initialSectionId, onClose }) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(product);
  const startSectionId = initialSectionId ?? (product ? sectionIdOfProduct(product) : "outros");
  const startSection = sectionById(startSectionId);
  const firstSize = product?.sizes?.[0];

  const [form, setForm] = useState(() => ({
    name: product?.name ?? "",
    description: product?.description ?? "",
    imageUrl: product?.imageUrl ?? "",
    sectionId: startSectionId,
    // Categoria livre só para "Outros produtos" e itens fora do cardápio
    category:
      startSection.category !== undefined && startSection.id !== "outros"
        ? startSection.category
        : product?.category ?? "",
    availableDays: Array.isArray(product?.availableDays) ? product.availableDays : [],
    extraPrice:
      startSection.kind === "priced" && Number(firstSize?.price) > 0 ? String(firstSize.price) : "",
    extraCost: firstSize?.costPrice != null ? String(firstSize.costPrice) : "",
    sizes:
      product?.sizes?.length > 0
        ? product.sizes.map((size) => ({
            size: size.size ?? "MEDIA",
            label: size.label ?? "",
            price: size.price != null ? String(size.price) : "",
            costPrice: size.costPrice != null ? String(size.costPrice) : "",
          }))
        : startSection.id === "acai_prontos"
          ? // Copo pronto novo já vem com os 4 tamanhos do açaí
            [
              { ...emptySize(), size: "PEQUENA", label: "P - 300 ml" },
              { ...emptySize(), size: "MEDIA", label: "M - 400 ml" },
              { ...emptySize(), size: "GRANDE", label: "G - 500 ml" },
              { ...emptySize(), size: "FAMILIA", label: "MG - 700 ml" },
            ]
          : [emptySize()],
  }));
  const [errors, setErrors] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);

  const section = sectionById(form.sectionId);
  const kind = section.kind;
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  async function handleImageFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Imagem muito grande (máximo 10 MB).");
      return;
    }

    setUploadingImage(true);
    try {
      const { data } = await api.post("/admin/products/image-upload-signature");
      const sig = data.data;
      const body = new FormData();
      body.append("file", file);
      body.append("api_key", sig.apiKey);
      body.append("timestamp", sig.timestamp);
      body.append("signature", sig.signature);
      body.append("folder", sig.folder);

      // Envio direto ao Cloudinary (fetch puro: sem o token da nossa API).
      const res = await fetch(sig.uploadUrl, { method: "POST", body });
      const result = await res.json();
      if (!res.ok || !result.secure_url) {
        throw new Error(result?.error?.message || "Falha no upload");
      }
      set({ imageUrl: result.secure_url });
      toast.success("Foto enviada!");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Não foi possível enviar a foto.");
    } finally {
      setUploadingImage(false);
    }
  }

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const res = isEdit
        ? await api.put(`/admin/products/${product.id}`, payload)
        : await api.post("/admin/products", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(isEdit ? "Salvo!" : "Cadastrado!");
      onClose();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message ?? "Erro ao salvar.");
    },
  });

  const chooseSection = (sectionId) => {
    const next = sectionById(sectionId);
    set({
      sectionId,
      category: next.id === "outros" ? form.category : next.category ?? form.category,
    });
  };

  const updateSizeRow = (index, patch) =>
    set({ sizes: form.sizes.map((size, i) => (i === index ? { ...size, ...patch } : size)) });

  const addSizeRow = () => {
    const used = new Set(form.sizes.map((size) => size.size));
    const nextOption = SIZE_OPTIONS.find((option) => !used.has(option.value)) ?? SIZE_OPTIONS[0];
    set({ sizes: [...form.sizes, { ...emptySize(), size: nextOption.value }] });
  };

  const removeSizeRow = (index) =>
    set({ sizes: form.sizes.length > 1 ? form.sizes.filter((_, i) => i !== index) : form.sizes });

  const toggleDay = (day) =>
    set({
      availableDays: form.availableDays.includes(day)
        ? form.availableDays.filter((value) => value !== day)
        : [...form.availableDays, day],
    });

  const buildSizes = () => {
    const first = form.sizes[0] ?? emptySize();
    if (kind === "list") {
      return [{ size: first.size || "MEDIA", label: "Config", price: 0 }];
    }
    if (kind === "priced") {
      return [
        {
          size: first.size || "PEQUENA",
          label: "Adicional",
          price: Number(form.extraPrice),
          ...(form.extraCost !== "" ? { costPrice: Number(form.extraCost) } : {}),
        },
      ];
    }
    return form.sizes.map((size) => ({
      size: size.size,
      label: size.label.trim() || undefined,
      price: Number(size.price),
      ...(size.costPrice !== "" ? { costPrice: Number(size.costPrice) } : {}),
    }));
  };

  const validate = () => {
    const errs = {};
    if (form.name.trim().length < 2) errs.name = "Escreva o nome (pelo menos 2 letras).";
    if (kind === "priced" && !(Number(form.extraPrice) > 0)) {
      errs.extraPrice = "Informe o preço cobrado a mais.";
    }
    if (form.extraCost !== "" && Number(form.extraCost) < 0) errs.extraCost = "Custo inválido.";
    if (kind === "product") {
      const used = new Set();
      form.sizes.forEach((size, index) => {
        if (used.has(size.size)) errs[`size_${index}`] = "Tamanho repetido.";
        used.add(size.size);
        if (!(Number(size.price) > 0)) errs[`price_${index}`] = "Preço maior que zero.";
        if (size.costPrice !== "" && Number(size.costPrice) < 0) errs[`cost_${index}`] = "Custo inválido.";
      });
    }
    if (form.imageUrl && !/^https?:\/\/.+/.test(form.imageUrl)) {
      errs.imageUrl = "Link inválido (deve começar com http).";
    }
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      category: form.category.trim() || undefined,
      availableDays: form.availableDays,
      waiterOnly: false,
      sizes: buildSizes(),
    });
  };

  const inputCls =
    "w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-secondary";
  const labelCls = "mb-1 block text-sm font-bold text-gray-800";
  const hintCls = "mt-1 text-xs text-gray-500";
  const errorCls = "mt-1 text-xs font-semibold text-red-500";
  const canMove = !section.fixed;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 my-auto w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
        <p className="text-xs font-bold uppercase tracking-widest text-secondary">
          {section.group ? `${section.group.icon} ${section.group.label} › ` : ""}
          {section.label}
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-primary">
          {isEdit ? `Editar ${section.item}` : newLabel(section.item)}
        </h2>

        <form onSubmit={onSubmit} className="mt-5 space-y-5">
          <div>
            <label className={labelCls} htmlFor="product-name">Nome</label>
            <input
              id="product-name"
              value={form.name}
              onChange={(event) => set({ name: event.target.value })}
              className={inputCls}
              placeholder={kind === "product" ? "Ex.: Açaí no copo" : "Ex.: Morango"}
            />
            {errors.name && <p className={errorCls}>{errors.name}</p>}
          </div>

          {canMove && (
            <div>
              <label className={labelCls} htmlFor="product-section">Onde aparece no pedido</label>
              <select
                id="product-section"
                value={form.sectionId}
                onChange={(event) => chooseSection(event.target.value)}
                className={`${inputCls} ${form.sectionId === "fora" ? "border-amber-400 bg-amber-50" : ""}`}
              >
                {form.sectionId === "fora" && (
                  <option value="fora" disabled>
                    ⚠️ Fora do cardápio: escolha onde aparece
                  </option>
                )}
                {ADMIN_GROUPS.map((group) => (
                  <optgroup key={group.id} label={`${group.icon} ${group.label}`}>
                    {group.sections
                      .filter((s) => MOVABLE_SECTIONS.some((m) => m.id === s.id))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                          {s.kind === "priced" ? " (cobrado à parte)" : ""}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              <p className={hintCls}>{section.where}</p>
              {form.sectionId === "outros" && (
                <div className="mt-2">
                  <input
                    value={form.category}
                    onChange={(event) => set({ category: event.target.value })}
                    className={inputCls}
                    placeholder="Categoria (opcional), ex.: Bebidas"
                  />
                </div>
              )}
            </div>
          )}

          {kind === "priced" && (
            <div className="grid gap-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:grid-cols-2">
              <div>
<label className={labelCls} htmlFor="extra-price">
                  {form.sectionId === "milkshake_ofertas" ? "Preço da oferta" : "Preço cobrado a mais"}
                </label>
                <div className="flex items-center rounded-2xl border border-gray-200 bg-white px-3 focus-within:border-secondary">
                  <span className="text-sm font-bold text-gray-500">R$</span>
                  <input
                    id="extra-price"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={form.extraPrice}
                    onChange={(event) => set({ extraPrice: event.target.value })}
                    className="w-full bg-transparent px-2 py-3 text-sm font-bold text-gray-900 outline-none"
                    placeholder="0,00"
                  />
                </div>
                {errors.extraPrice && <p className={errorCls}>{errors.extraPrice}</p>}
              </div>
              <div>
                <label className={labelCls} htmlFor="extra-cost">
                  Custo <span className="font-normal text-gray-500">(opcional)</span>
                </label>
                <div className="flex items-center rounded-2xl border border-gray-200 bg-white px-3 focus-within:border-secondary">
                  <span className="text-sm font-bold text-gray-500">R$</span>
                  <input
                    id="extra-cost"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={form.extraCost}
                    onChange={(event) => set({ extraCost: event.target.value })}
                    className="w-full bg-transparent px-2 py-3 text-sm text-gray-900 outline-none"
                    placeholder="0,00"
                  />
                </div>
                {errors.extraCost && <p className={errorCls}>{errors.extraCost}</p>}
                <p className={hintCls}>Usado no relatório de lucro.</p>
              </div>
            </div>
          )}

          {kind === "list" && (
            <p className="rounded-2xl bg-accent/60 px-4 py-3 text-sm text-gray-600">
              Sem preço: o cliente escolhe sem pagar a mais.
              {form.sectionId === "acai_complementos" &&
                " Para cobrar à parte, mude \"Onde aparece\" para Complementos premium."}
            </p>
          )}

          {kind === "product" && (
            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-gray-800">Tamanhos e preços</p>
                  <p className="text-xs text-gray-500">Cada linha é um tamanho que o cliente pode escolher.</p>
                </div>
                <button
                  type="button"
                  onClick={addSizeRow}
                  disabled={form.sizes.length >= SIZE_OPTIONS.length}
                  className="shrink-0 rounded-full bg-gold px-4 py-2 text-xs font-bold text-primary transition hover:bg-secondary hover:text-white disabled:opacity-40"
                >
                  + Tamanho
                </button>
              </div>
              <div className="space-y-3">
                {form.sizes.map((sizeRow, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 p-3 sm:grid-cols-[8rem_minmax(0,1fr)_6.5rem_6.5rem_auto] sm:items-end"
                  >
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-600">Tamanho</label>
                      <select
                        value={sizeRow.size}
                        onChange={(event) => updateSizeRow(index, { size: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-white px-2 py-2 text-sm outline-none focus:border-secondary"
                      >
                        {SIZE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {errors[`size_${index}`] && <p className={errorCls}>{errors[`size_${index}`]}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-600">Nome no cardápio</label>
                      <input
                        value={sizeRow.label}
                        onChange={(event) => updateSizeRow(index, { label: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-secondary"
                        placeholder="Ex.: P - 300 ml"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-600">Preço (R$)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={sizeRow.price}
                        onChange={(event) => updateSizeRow(index, { price: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-secondary"
                        placeholder="0,00"
                      />
                      {errors[`price_${index}`] && <p className={errorCls}>{errors[`price_${index}`]}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-gray-600">Custo (R$)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={sizeRow.costPrice}
                        onChange={(event) => updateSizeRow(index, { costPrice: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-secondary"
                        placeholder="opcional"
                      />
                      {errors[`cost_${index}`] && <p className={errorCls}>{errors[`cost_${index}`]}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSizeRow(index)}
                      disabled={form.sizes.length <= 1}
                      aria-label="Remover tamanho"
                      className="col-span-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-500 transition hover:bg-red-50 disabled:opacity-30 sm:col-span-1"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={labelCls}>Foto <span className="font-normal text-gray-500">(opcional)</span></label>
            <div className="flex items-center gap-3">
              {form.imageUrl ? (
                <img
                  src={cloudinaryImage(form.imageUrl, 200)}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  onError={(event) => (event.currentTarget.style.visibility = "hidden")}
                />
              ) : (
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-400">
                  sem foto
                </span>
              )}
              <label
                className={`cursor-pointer rounded-full border border-secondary px-4 py-2 text-sm font-bold text-secondary transition hover:bg-secondary/10 ${
                  uploadingImage ? "pointer-events-none opacity-60" : ""
                }`}
              >
                {uploadingImage ? "Enviando..." : form.imageUrl ? "Trocar foto" : "Enviar foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={handleImageFile}
                />
              </label>
              {form.imageUrl && (
                <button
                  type="button"
                  onClick={() => set({ imageUrl: "" })}
                  className="text-sm font-semibold text-gray-500 underline hover:text-red-500"
                >
                  Remover
                </button>
              )}
            </div>
            {errors.imageUrl && <p className={errorCls}>{errors.imageUrl}</p>}
          </div>

          {(kind === "product" || form.sectionId === "milkshake_ofertas") && (
            <div>
              <label className={labelCls} htmlFor="product-description">
                {form.sectionId === "acai_prontos" ? (
                  "O que vai no copo"
                ) : (
                  <>
                    Descrição <span className="font-normal text-gray-500">(opcional)</span>
                  </>
                )}
              </label>
              <textarea
                id="product-description"
                value={form.description}
                onChange={(event) => set({ description: event.target.value })}
                rows={2}
                className={`${inputCls} resize-none`}
                placeholder={
                  form.sectionId === "acai_prontos"
                    ? "Ex.: Açaí tradicional, leite ninho, morango e Nutella"
                    : ""
                }
              />
            </div>
          )}

          <div>
            <p className={labelCls}>Dias em que aparece</p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map((day) => {
                const checked = form.availableDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    aria-pressed={checked}
                    onClick={() => toggleDay(day.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                      checked
                        ? "border-secondary bg-secondary text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:border-secondary/40"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            <p className={hintCls}>
              {form.availableDays.length
                ? `Aparece só em: ${formatAvailableDays(form.availableDays)}.`
                : "Nenhum dia marcado = aparece todos os dias."}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-gray-200 py-3 text-sm font-bold text-gray-600 transition hover:border-gray-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || uploadingImage}
              className="flex-1 rounded-full bg-secondary py-3 text-sm font-bold text-white transition hover:bg-primary disabled:opacity-50"
            >
              {mutation.isPending ? "Salvando..." : isEdit ? "Salvar" : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Linhas de milk shake usam "mais pedidos" (topo dos sabores no totem e no site)
const FEATURED_SECTIONS = new Set([
  "milkshake_tradicional",
  "milkshake_especial",
  "milkshake_premium",
  "milkshake_alcoolico",
]);

function SectionBody({ section, items: rawItems, onEdit, onMakePremium }) {
  const featurable = FEATURED_SECTIONS.has(section.id);
  // Mais pedidos primeiro, na ordem em que aparecem para o cliente
  const items = featurable
    ? [...rawItems].sort(
        (a, b) =>
          (a.featuredRank ?? Infinity) - (b.featuredRank ?? Infinity) ||
          Number(b.isActive) - Number(a.isActive) ||
          String(a.name).localeCompare(String(b.name), "pt-BR"),
      )
    : rawItems;
  const nextRank = featurable
    ? Math.max(0, ...rawItems.map((item) => item.featuredRank ?? 0)) + 1
    : undefined;
  if (!items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
        Nada cadastrado aqui ainda.
      </div>
    );
  }
  if (section.kind === "product") {
    return (
      <div className="grid gap-5 xl:grid-cols-2">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} onEdit={onEdit} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-2 xl:grid-cols-2">
      {items.map((product) =>
        section.kind === "priced" ? (
          <PricedRow key={product.id} product={product} onEdit={onEdit} />
        ) : (
          <ListRow
            key={product.id}
            product={product}
            onEdit={onEdit}
            nextRank={nextRank}
            showCategory={section.id === "fora"}
            onMakePremium={section.id === "acai_complementos" ? onMakePremium : undefined}
          />
        ),
      )}
    </div>
  );
}

function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [modal, setModal] = useState(null); // { product?, sectionId }
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState(() => {
    const secao = searchParams.get("secao");
    const id = LEGACY_SECTION_IDS[secao] ?? secao;
    return ALL_SECTIONS.some((section) => section.id === id) ? id : "acai_copo";
  });

  const {
    data: products = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await api.get("/admin/products");
      return res.data?.data ?? [];
    },
  });

  const bySection = {};
  for (const product of products) {
    const id = sectionIdOfProduct(product);
    (bySection[id] ??= []).push(product);
  }
  // Ativos primeiro, depois por nome
  const sortItems = (items = []) =>
    [...items].sort(
      (a, b) =>
        Number(b.isActive) - Number(a.isActive) ||
        String(a.name).localeCompare(String(b.name), "pt-BR"),
    );

  const section = sectionById(activeSection);
  const items = sortItems(bySection[section.id]);
  const activeCount = items.filter((product) => product.isActive).length;
  const orphanCount = bySection.fora?.length ?? 0;
  const pricelessCount = (bySection[section.id] ?? []).filter(
    (product) => section.kind === "priced" && product.isActive && !(Number(product.sizes?.[0]?.price) > 0),
  ).length;

  const query = normalizeText(search.trim());
  const searchResults = query
    ? sortItems(products.filter((product) => normalizeText(product.name).includes(query)))
    : [];

  const defaultNames = DEFAULT_SECTION_IMPORTS[section.id] ?? [];
  const existingNames = new Set(items.map((product) => normalizeText(product.name)));
  const missingDefaultNames = defaultNames.filter((name) => !existingNames.has(normalizeText(name)));
  const importDefaults = useMutation({
    mutationFn: async () => {
      for (const name of missingDefaultNames) {
        await api.post("/admin/products", {
          name,
          description: "",
          imageUrl: "",
          category: section.category,
          availableDays: [],
          waiterOnly: false,
          sizes: [{ size: "MEDIA", price: 0, label: "Config" }],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Itens padrão cadastrados!");
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message ?? "Não foi possível cadastrar os itens padrão."),
  });

  const openEdit = (product) => setModal({ product, sectionId: sectionIdOfProduct(product) });
  const openMakePremium = (product) =>
    setModal({ product, sectionId: "acai_complementos_premium" });
  const canAdd = !section.fixed && section.id !== "fora";

  const navButton = (target, count, tone = "") => (
    <button
      key={target.id}
      type="button"
      onClick={() => {
        setActiveSection(target.id);
        setSearch("");
      }}
      className={`flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-base transition ${
        activeSection === target.id && !query
          ? "bg-secondary font-bold text-white"
          : `text-gray-700 hover:bg-gray-100 ${tone}`
      }`}
    >
      <span className="truncate">{target.label}</span>
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
          activeSection === target.id && !query ? "bg-white/20" : "bg-gray-100 text-gray-500"
        }`}
      >
        {count}
      </span>
    </button>
  );

  return (
    <main className="min-h-screen text-gray-900">
      <PageHeader
        backTo="/admin/produtos"
        backLabel="Cardápio"
        wide
        title="Produtos e preços"
        subtitle="Escolha a seção e mude o que precisar. Tudo segue a ordem do pedido no totem e no site."
      />
      <div className="ui-page-wide">
        {isLoading && (
          <div className="mt-6 grid animate-pulse gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-gray-100" />
            ))}
          </div>
        )}

        {isError && <p className="mt-6 text-sm text-red-500">Falha ao carregar os produtos.</p>}

        {!isLoading && !isError && (
          <div className="mt-6 grid items-start gap-8 lg:grid-cols-[20rem_minmax(0,1fr)]">
            <nav className="min-w-0 rounded-3xl bg-white p-3 shadow-card ring-1 ring-primary/5 lg:sticky lg:top-6">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="🔎 Buscar sabor, complemento..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none focus:border-secondary lg:mb-3"
              />
              {/* Celular: seletor compacto em vez da lista inteira */}
              <label className="mt-2 block lg:hidden">
                <span className="sr-only">Mostrar seção</span>
                <select
                  value={activeSection}
                  onChange={(event) => {
                    setActiveSection(event.target.value);
                    setSearch("");
                  }}
                  className="w-full rounded-xl border border-secondary/40 bg-white px-3 py-2.5 text-sm font-bold text-primary outline-none focus:border-secondary"
                >
                  {ADMIN_GROUPS.map((group) => (
                    <optgroup key={group.id} label={`${group.icon} ${group.label}`}>
                      {group.sections.map((target) => (
                        <option key={target.id} value={target.id}>
                          {target.label} ({bySection[target.id]?.length ?? 0})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {orphanCount > 0 && (
                    <option value={ORPHAN_SECTION.id}>
                      ⚠️ {ORPHAN_SECTION.label} ({orphanCount})
                    </option>
                  )}
                </select>
              </label>
              <div className="hidden lg:block">
              {ADMIN_GROUPS.map((group) => (
                <div key={group.id} className="mb-3">
                  <p className="px-4 pb-1 pt-2 text-sm font-black uppercase tracking-widest text-secondary">
                    {group.icon} {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.sections.map((target) =>
                      navButton(target, bySection[target.id]?.length ?? 0),
                    )}
                  </div>
                </div>
              ))}
              {orphanCount > 0 && (
                <div className="border-t border-gray-100 pt-2">
                  {navButton(ORPHAN_SECTION, orphanCount, "font-bold text-amber-700")}
                </div>
              )}
              </div>
            </nav>

            <section className="min-w-0">
              {query ? (
                <>
                  <h2 className="font-display text-2xl font-bold text-primary">
                    Busca: “{search.trim()}”
                  </h2>
                  <p className="mb-4 mt-1 text-sm text-gray-500">
                    {searchResults.length} resultado(s) em todas as seções.
                  </p>
                  {searchResults.length ? (
                    <div className="grid gap-2 xl:grid-cols-2">
                      {searchResults.map((product) =>
                        sectionById(sectionIdOfProduct(product)).kind === "priced" ? (
                          <PricedRow key={product.id} product={product} onEdit={openEdit} showSection />
                        ) : (
                          <ListRow key={product.id} product={product} onEdit={openEdit} showSection />
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
                      Nada encontrado.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black uppercase tracking-widest text-secondary">
                        {section.group ? `${section.group.icon} ${section.group.label}` : "⚠️ Atenção"}
                      </p>
                      <h2 className="font-display text-4xl font-bold text-primary">{section.label}</h2>
                      <p
                        className={`mt-2 max-w-3xl text-base ${
                          section.id === "fora" ? "font-semibold text-amber-700" : "text-gray-500"
                        }`}
                      >
                        {section.where}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-400">
                        {activeCount} ativo(s)
                        {items.length - activeCount > 0 && ` · ${items.length - activeCount} oculto(s)`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {missingDefaultNames.length > 0 && (
                        <button
                          type="button"
                          disabled={importDefaults.isPending}
                          onClick={() => importDefaults.mutate()}
                          title={missingDefaultNames.join(", ")}
                          className="rounded-full border border-secondary px-6 py-3 text-base font-bold text-secondary transition hover:bg-secondary/10 disabled:opacity-50"
                        >
                          {importDefaults.isPending
                            ? "Cadastrando..."
                            : `Cadastrar ${missingDefaultNames.length} padrão`}
                        </button>
                      )}
                      {canAdd && (
                        <button
                          type="button"
                          onClick={() => setModal({ product: null, sectionId: section.id })}
                          className="rounded-full bg-secondary px-6 py-3 text-base font-bold text-white shadow-card transition hover:bg-primary"
                        >
                          + {newLabel(section.item)}
                        </button>
                      )}
                    </div>
                  </div>

                  {pricelessCount > 0 && (
                    <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-base font-semibold text-amber-800">
                      ⚠️ {pricelessCount} item(ns) sem preço não aparecem para o cliente. Digite o preço e toque em Salvar.
                    </p>
                  )}

                  <SectionBody
                    section={section}
                    items={items}
                    onEdit={openEdit}
                    onMakePremium={openMakePremium}
                  />
                </>
              )}
            </section>
          </div>
        )}

        {modal && (
          <ProductModal
            product={modal.product}
            initialSectionId={modal.sectionId}
            onClose={() => setModal(null)}
          />
        )}
      </div>
    </main>
  );
}

export default AdminProductsPage;
