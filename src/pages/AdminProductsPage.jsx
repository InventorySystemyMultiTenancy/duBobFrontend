import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { api } from "../lib/api.js";
import { useTranslation } from "../context/I18nContext.jsx";

const emptyForm = (initialValues = {}) => ({
  name: "",
  description: "",
  imageUrl: "",
  category: "",
  availableDays: [],
  ...initialValues,
  sizes: initialValues.sizes ?? [emptySize()],
});

function getPrimarySize(product) {
  return product?.sizes?.[0] ?? null;
}

function emptySize() {
  return {
    size: "MEDIA",
    label: "",
    price: "",
    costPrice: "",
  };
}

const SIZE_OPTIONS = [
  { value: "PEQUENA", label: "PEQUENA" },
  { value: "MEDIA", label: "MEDIA" },
  { value: "GRANDE", label: "GRANDE" },
  { value: "FAMILIA", label: "FAMILIA" },
];

// Traducao automatica de produtos
const WEEKDAY_OPTIONS = [
  { value: "MON", label: "Seg" },
  { value: "TUE", label: "Ter" },
  { value: "WED", label: "Qua" },
  { value: "THU", label: "Qui" },
  { value: "FRI", label: "Sex" },
  { value: "SAT", label: "Sab" },
  { value: "SUN", label: "Dom" },
];

const GUIDED_ADMIN_SECTIONS = [
  {
    id: "all",
    label: "Tudo",
    description: "Todos os cadastros do sistema.",
  },
  {
    id: "bases",
    label: "Bases e tamanhos",
    description: "Produtos base usados para calcular valor e enviar o pedido.",
    preset: { category: "Base cardapio" },
  },
  {
    id: "milkshake_tradicional",
    label: "Sabores milk shake",
    description: "Sabores da linha tradicional do milk shake.",
    preset: {
      category: "sabor milkshake tradicional",
      sizes: [{ ...emptySize(), label: "Config", price: "0" }],
    },
  },
  {
    id: "milkshake_especial",
    label: "Linha especial",
    description: "Sabores da linha especial.",
    preset: {
      category: "sabor milkshake especial",
      sizes: [{ ...emptySize(), label: "Config", price: "0" }],
    },
  },
  {
    id: "milkshake_premium",
    label: "Linha premium",
    description: "Sabores premium.",
    preset: {
      category: "sabor milkshake premium",
      sizes: [{ ...emptySize(), label: "Config", price: "0" }],
    },
  },
  {
    id: "milkshake_alcoolico",
    label: "Linha alcoolica",
    description: "Sabores alcoolicos.",
    preset: {
      category: "sabor milkshake alcoolico",
      sizes: [{ ...emptySize(), label: "Config", price: "0" }],
    },
  },
  {
    id: "acai_sabores",
    label: "Sabores acai",
    description: "Sabores que aparecem depois do tamanho do acai.",
    preset: {
      category: "sabor acai",
      sizes: [{ ...emptySize(), label: "Config", price: "0" }],
    },
  },
  {
    id: "acai_complementos",
    label: "Complementos",
    description: "Complementos selecionaveis na montagem do acai.",
    preset: {
      category: "complemento acai",
      sizes: [{ ...emptySize(), label: "Config", price: "0" }],
    },
  },
];

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
  acai_complementos: [
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
  ],
};

const BASE_PRODUCT_IDS = new Set([
  "db_milkshake_tradicional",
  "db_milkshake_especial",
  "db_milkshake_alcoolico",
  "db_milkshake_premium",
  "db_acai_copo",
  "db_acai_tradicional",
  "db_acai_extra_complementos",
]);

const normalizeText = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function isConfigCategory(category) {
  const normalized = normalizeText(category);
  return (
    normalized.includes("sabor ") ||
    normalized.includes("complemento") ||
    normalized.includes("adicionais")
  );
}

function productMatchesAdminSection(product, sectionId) {
  const category = normalizeText(product.category);
  if (sectionId === "all") return true;
  if (sectionId === "bases") {
    return BASE_PRODUCT_IDS.has(product.id) || !isConfigCategory(product.category);
  }
  if (sectionId === "milkshake_tradicional") {
    return category.includes("sabor milkshake tradicional");
  }
  if (sectionId === "milkshake_especial") {
    return category.includes("sabor milkshake especial");
  }
  if (sectionId === "milkshake_premium") {
    return category.includes("sabor milkshake premium");
  }
  if (sectionId === "milkshake_alcoolico") {
    return category.includes("sabor milkshake alcool");
  }
  if (sectionId === "acai_sabores") {
    return (
      category.includes("sabor acai") ||
      category.includes("sabores acai") ||
      category.includes("sabor do acai") ||
      category.includes("sabores do acai")
    );
  }
  if (sectionId === "acai_complementos") {
    return category.includes("complemento acai") || category.includes("adicionais acai");
  }
  return true;
}

function formatAvailableDays(days) {
  if (!Array.isArray(days) || days.length === 0) return "Todos os dias";
  const labelByValue = Object.fromEntries(
    WEEKDAY_OPTIONS.map((day) => [day.value, day.label]),
  );
  return days.map((day) => labelByValue[day] ?? day).join(", ");
}

function isDebugEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("i18n_debug") === "1";
}

function debugLog(...args) {
  if (isDebugEnabled()) {
    console.log("[I18N_DEBUG][AdminProducts]", ...args);
  }
}

function normalizeCategoryKey(cat) {
  return `CAT_${(cat ?? "GERAL")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")}`;
}

function tProductField(t, productId, field, fallback) {
  const id = String(productId ?? "");
  const lowerKey = `PRODUCT_${id}_${field}`;
  const upperKey = `PRODUCT_${id.toUpperCase()}_${field}`;
  const upperValue = t(upperKey, fallback);
  const resolved = t(lowerKey, upperValue);
  debugLog("tProductField", {
    productId: id,
    field,
    lowerKey,
    upperKey,
    resolved,
    fallback,
  });
  return resolved;
}

// Modal de cadastro e edicao

function ProductModal({
  product,
  onClose,
  existingCategories = [],
  initialValues = {},
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEdit = !!product;

  const [form, setForm] = useState(() => {
    if (!isEdit) return emptyForm(initialValues);
    return {
      name: product.name,
      description: product.description ?? "",
      imageUrl: product.imageUrl ?? "",
      category: product.category ?? "",
      availableDays: Array.isArray(product.availableDays)
        ? product.availableDays
        : [],
      sizes:
        product.sizes?.length > 0
          ? product.sizes.map((size) => ({
              size: size.size ?? "MEDIA",
              label: size.label ?? "",
              price: size.price != null ? String(size.price) : "",
              costPrice:
                size.costPrice != null ? String(size.costPrice) : "",
            }))
          : [emptySize()],
    };
  });

  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: async (payload) => {
      if (isEdit) {
        const res = await api.put(`/admin/products/${product.id}`, payload);
        return res.data;
      }
      const res = await api.post("/admin/products", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(
        isEdit
          ? t("ADMIN_PRODUCTS_UPDATED", "Produto atualizado!")
          : t("ADMIN_PRODUCTS_CREATED", "Produto criado!"),
      );
      onClose();
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ??
          t("ADMIN_PRODUCTS_SAVE_ERROR", "Erro ao salvar produto"),
      );
    },
  });

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Nome obrigatorio";
    if (!form.sizes.length) errs.sizes = "Informe ao menos um tamanho";
    const configItem = isConfigCategory(form.category);
    const usedSizes = new Set();
    form.sizes.forEach((size, index) => {
      if (usedSizes.has(size.size)) errs[`size_${index}`] = "Tamanho repetido";
      usedSizes.add(size.size);
      if (
        size.price === "" ||
        isNaN(Number(size.price)) ||
        Number(size.price) < 0 ||
        (!configItem && Number(size.price) <= 0)
      ) {
        errs[`price_${index}`] = configItem
          ? "Preco invalido"
          : "Preco precisa ser maior que zero";
      }
      if (
        size.costPrice !== "" &&
        (isNaN(Number(size.costPrice)) || Number(size.costPrice) < 0)
      ) {
        errs[`cost_${index}`] = "Custo invalido";
      }
    });
    if (form.imageUrl && !/^https?:\/\/.+/.test(form.imageUrl))
      errs.imageUrl = "URL invalida (deve comecar com http)";
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  const toggleAvailableDay = (day) => {
    setForm((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((value) => value !== day)
        : [...prev.availableDays, day],
    }));
  };

  const updateSizeRow = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.map((size, i) =>
        i === index ? { ...size, ...patch } : size,
      ),
    }));
  };

  const addSizeRow = () => {
    setForm((prev) => {
      const used = new Set(prev.sizes.map((size) => size.size));
      const nextOption =
        SIZE_OPTIONS.find((option) => !used.has(option.value)) ??
        SIZE_OPTIONS[0];
      return {
        ...prev,
        sizes: [...prev.sizes, { ...emptySize(), size: nextOption.value }],
      };
    });
  };

  const removeSizeRow = (index) => {
    setForm((prev) => ({
      ...prev,
      sizes:
        prev.sizes.length > 1
          ? prev.sizes.filter((_, i) => i !== index)
          : prev.sizes,
    }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      category: form.category.trim() || undefined,
      availableDays: form.availableDays,
      waiterOnly: false,
      sizes: form.sizes.map((size) => ({
        size: size.size,
        label: size.label.trim() || undefined,
        price: Number(size.price),
        ...(size.costPrice !== "" ? { costPrice: Number(size.costPrice) } : {}),
      })),
    };
    mutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 my-auto w-full max-w-2xl rounded-3xl border border-border-soft bg-white p-5 shadow-2xl sm:p-6">
        <h2 className="font-display text-2xl text-gold">
          {isEdit
            ? t("ADMIN_PRODUCTS_EDIT_TITLE", "Editar Produto")
            : t("ADMIN_PRODUCTS_NEW_TITLE", "Novo Produto")}
        </h2>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-smoke">
              {t("ADMIN_PRODUCTS_NAME_LABEL", "Nome *")}
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gold/50"
              placeholder={t(
                "ADMIN_PRODUCTS_NAME_PLACEHOLDER",
                "Ex: Calabresa Imperial",
              )}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-smoke">
              {t("ADMIN_PRODUCTS_DESCRIPTION_LABEL", "Descricao")}
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              rows={2}
              className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gold/50"
              placeholder={t(
                "ADMIN_PRODUCTS_DESCRIPTION_PLACEHOLDER",
                "Breve descricao do sabor...",
              )}
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-smoke">
              {t("ADMIN_PRODUCTS_CATEGORY_LABEL", "Categoria")}
            </label>
            <input
              list="category-options"
              value={form.category}
              onChange={(e) =>
                setForm((p) => ({ ...p, category: e.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gold/50"
              placeholder={t(
                "ADMIN_PRODUCTS_CATEGORY_PLACEHOLDER",
                "Ex: Doce, Salgado, Bebidas...",
              )}
            />
            <datalist id="category-options">
              {existingCategories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          {/* Available days */}
          <div>
            <label className="mb-2 block text-xs uppercase tracking-widest text-smoke">
              Dias em que aparece no cardapio
            </label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {WEEKDAY_OPTIONS.map((day) => {
                const checked = form.availableDays.includes(day.value);
                return (
                  <label
                    key={day.value}
                    className={`flex cursor-pointer items-center justify-center rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                      checked
                        ? "border-gold bg-gold/15 text-gold"
                        : "border-gray-200 bg-gray-100 text-gray-700 hover:border-gold/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAvailableDay(day.value)}
                      className="sr-only"
                    />
                    {day.label}
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-smoke">
              Se nao marcar nenhum dia, o produto aparece todos os dias.
            </p>
          </div>

          {/* Image URL */}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-smoke">
              {isConfigCategory(form.category)
                ? "Foto do sabor ou complemento"
                : t("ADMIN_PRODUCTS_IMAGE_URL", "URL da Imagem")}
            </label>
            <input
              value={form.imageUrl}
              onChange={(e) =>
                setForm((p) => ({ ...p, imageUrl: e.target.value }))
              }
              className="w-full rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gold/50"
              placeholder="https://..."
            />
            {errors.imageUrl && (
              <p className="mt-1 text-xs text-red-400">{errors.imageUrl}</p>
            )}
            {form.imageUrl && !errors.imageUrl && (
              <img
                src={form.imageUrl}
                alt="preview"
                className="mt-2 h-20 w-full rounded-2xl object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}
          </div>

          <div className="rounded-2xl border border-border-soft bg-accent/35 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-smoke">
                  Tamanhos e valores
                </p>
                <p className="mt-1 text-xs text-smoke">
                  {isConfigCategory(form.category)
                    ? "Item tecnico do fluxo: pode ficar com valor zero."
                    : "Crie, edite ou remova os tamanhos que aparecem no cardapio."}
                </p>
              </div>
              <button
                type="button"
                onClick={addSizeRow}
                disabled={form.sizes.length >= SIZE_OPTIONS.length}
                className="w-full rounded-xl bg-gold px-4 py-3 text-xs font-bold text-primary shadow-sm transition hover:bg-secondary hover:text-white disabled:opacity-50 sm:w-auto"
              >
                + Tamanho
              </button>
            </div>

            {errors.sizes && (
              <p className="mb-2 text-xs text-red-400">{errors.sizes}</p>
            )}

            <div className="space-y-3">
              {form.sizes.map((sizeRow, index) => (
                <div
                  key={`${sizeRow.size}-${index}`}
                  className="rounded-xl border border-border-soft bg-white p-3 shadow-sm"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[150px_minmax(0,1fr)_120px_120px]">
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-widest text-smoke">
                        Codigo
                      </label>
                      <select
                        value={sizeRow.size}
                        onChange={(e) => updateSizeRow(index, { size: e.target.value })}
                        className="w-full min-w-0 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none focus:border-secondary/50"
                      >
                        {SIZE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {errors[`size_${index}`] && (
                        <p className="mt-1 text-[11px] text-red-400">
                          {errors[`size_${index}`]}
                        </p>
                      )}
                    </div>

                    <div className="min-w-0">
                      <label className="mb-1 block text-[10px] uppercase tracking-widest text-smoke">
                        Nome no cardapio
                      </label>
                      <input
                        value={sizeRow.label}
                        onChange={(e) => updateSizeRow(index, { label: e.target.value })}
                        className="w-full min-w-0 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none focus:border-secondary/50"
                        placeholder="Ex: P - 300 ml"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-widest text-smoke">
                        Venda
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={sizeRow.price}
                        onChange={(e) => updateSizeRow(index, { price: e.target.value })}
                        className="w-full min-w-0 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none focus:border-secondary/50"
                        placeholder="0,00"
                      />
                      {errors[`price_${index}`] && (
                        <p className="mt-1 text-[11px] text-red-400">
                          {errors[`price_${index}`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-widest text-smoke">
                        Custo
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={sizeRow.costPrice}
                        onChange={(e) => updateSizeRow(index, { costPrice: e.target.value })}
                        className="w-full min-w-0 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none focus:border-secondary/50"
                        placeholder="0,00"
                      />
                      {errors[`cost_${index}`] && (
                        <p className="mt-1 text-[11px] text-red-400">
                          {errors[`cost_${index}`]}
                        </p>
                      )}
                    </div>

                  </div>
                  <div className="mt-3 flex justify-end border-t border-border-soft pt-3">
                    <button
                      type="button"
                      onClick={() => removeSizeRow(index)}
                      disabled={form.sizes.length <= 1}
                      className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm text-smoke transition hover:border-gray-400"
            >
              {t("BTN_CANCEL", "Cancelar")}
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 py-3 text-sm font-bold text-[#11161d] transition hover:opacity-90 disabled:opacity-50"
            >
              {mutation.isPending
                ? t("ADMIN_PRODUCTS_SAVING", "Salvando...")
                : isEdit
                  ? t("BTN_SAVE", "Salvar")
                  : t("ADMIN_PRODUCTS_CREATE", "Criar")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProductCard({ product, onEdit }) {
  const { t, locale } = useTranslation();
  const queryClient = useQueryClient();
  const primarySize = getPrimarySize(product);
  const productName = tProductField(t, product.id, "NAME", product.name);
  const productDescription = product.description
    ? tProductField(t, product.id, "DESC", product.description)
    : null;
  const configItem = isConfigCategory(product.category);
  const translatedCategory = product.category
    ? t(normalizeCategoryKey(product.category), product.category)
    : null;

  useEffect(() => {
    debugLog("productCard:render", {
      locale,
      productId: product.id,
      originalName: product.name,
      translatedName: productName,
      translatedDescription: productDescription,
    });
  }, [locale, product.id, product.name, productName, productDescription]);

  const toggleActive = useMutation({
    mutationFn: async () => {
      if (product.isActive) {
        await api.delete(`/admin/products/${product.id}`);
      } else {
        await api.patch(`/admin/products/${product.id}/restore`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(
        product.isActive
          ? t("ADMIN_PRODUCTS_DISABLED", "Produto desativado")
          : t("ADMIN_PRODUCTS_RESTORED", "Produto reativado"),
      );
    },
    onError: () =>
      toast.error(t("ADMIN_PRODUCTS_STATUS_ERROR", "Falha ao alterar status")),
  });

  /*
  const refreshTranslations = null;
  const REAPPLY_TRANSLATIONS = useMutation({
    mutationFn: async () => {
      const baseLocale = "pt-BR";
      console.log(
        "[MUTATION] Iniciando reapplyTranslations com baseLocale:",
        baseLocale,
      );

      const summary = await saveProductTranslations(
        product.id,
        product.name,
        product.description,
        product.category,
        baseLocale,
      );

      console.log("[MUTATION] Summary retornado:", summary);

      if (!summary.total || summary.succeeded === 0) {
        console.error("[MUTATION] Erro - summary.total e 0 ou falsy");
        throw new Error("Translation sync failed");
      }

      console.log("[MUTATION] Sucesso - total:", summary.total);
      return summary;
    },
    onSuccess: ({ succeeded, failed }) => {
      console.log(
        "[MUTATION SUCCESS] succeeded:",
        succeeded,
        "failed:",
        failed,
      );
      refreshTranslations?.();
      if (failed > 0) {
        toast.success(
          t(
            "ADMIN_PRODUCTS_REAPPLY_TRANSLATION_PARTIAL",
            "Traducoes reaplicadas parcialmente ({{ok}} OK, {{fail}} falharam).",
          )
            .replace("{{ok}}", String(succeeded))
            .replace("{{fail}}", String(failed)),
        );
        return;
      }
      toast.success(
        t(
          "ADMIN_PRODUCTS_REAPPLY_TRANSLATION_SUCCESS",
          "Traducoes reaplicadas com sucesso.",
        ),
      );
    },
    onError: (error) => {
      console.error("[MUTATION ERROR]", error);
      toast.error(
        t(
          "ADMIN_PRODUCTS_REAPPLY_TRANSLATION_ERROR",
          "Falha ao reaplicar traducoes.",
        ),
      );
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async () => {
      await api.delete(`/admin/products/${product.id}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(t("ADMIN_PRODUCTS_DELETE_SUCCESS", "Produto excluido."));
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.error?.message ||
          t("ADMIN_PRODUCTS_DELETE_ERROR", "Falha ao excluir produto."),
      );
    },
  });

  const confirmDeleteProduct = async () => {
    const result = await Swal.fire({
      title: t("ADMIN_PRODUCTS_DELETE_CONFIRM_TITLE", "Excluir produto?"),
      text: t(
        "ADMIN_PRODUCTS_DELETE_CONFIRM_TEXT",
        "Essa acao remove o produto definitivamente. Produtos com historico de pedido nao podem ser excluidos.",
      ),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("ADMIN_PRODUCTS_DELETE_CONFIRM", "Sim, excluir"),
      cancelButtonText: t("CANCEL", "Cancelar"),
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
    });

    if (result.isConfirmed) {
      deleteProduct.mutate();
    }
  };

  */

  const deleteProduct = useMutation({
    mutationFn: async () => {
      await api.delete(`/admin/products/${product.id}/permanent`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(t("ADMIN_PRODUCTS_DELETE_SUCCESS", "Produto excluido."));
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.error?.message ||
          t("ADMIN_PRODUCTS_DELETE_ERROR", "Falha ao excluir produto."),
      );
    },
  });

  const confirmDeleteProduct = async () => {
    const result = await Swal.fire({
      title: t("ADMIN_PRODUCTS_DELETE_CONFIRM_TITLE", "Excluir produto?"),
      text: t(
        "ADMIN_PRODUCTS_DELETE_CONFIRM_TEXT",
        "Essa acao remove o produto definitivamente. Produtos com historico de pedido nao podem ser excluidos.",
      ),
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: t("ADMIN_PRODUCTS_DELETE_CONFIRM", "Sim, excluir"),
      cancelButtonText: t("CANCEL", "Cancelar"),
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
    });

    if (result.isConfirmed) {
      deleteProduct.mutate();
    }
  };

  return (
    <article
      className={`rounded-2xl border p-4 transition-all duration-200 ${
        product.isActive
          ? "border-gray-200 bg-lacquer/70"
          : "border-gray-100 bg-gray-50 opacity-50"
      }`}
    >
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={productName}
          className="mb-3 h-32 w-full rounded-xl object-cover"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      ) : (
        <div className="mb-3 flex h-32 w-full items-center justify-center rounded-xl bg-gray-100 text-3xl">
          Sem foto
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-gray-900">
            {productName}
          </h3>
          {productDescription && (
            <p className="mt-0.5 line-clamp-2 text-xs text-smoke">
              {productDescription}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-xl px-2 py-1 text-xs font-bold ${
            product.isActive
              ? "bg-green-500/20 text-green-400"
              : "bg-gray-200 text-smoke"
          }`}
        >
          {product.isActive
            ? t("ADMIN_PRODUCTS_ACTIVE", "Ativo")
            : t("ADMIN_PRODUCTS_INACTIVE", "Inativo")}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {product.sizes?.map((size) => (
          <span
            key={size.id ?? size.size}
            className="rounded-xl bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700"
          >
            {configItem
              ? "Config do fluxo"
              : `${size.label || size.size}: R$ ${Number(size.price).toFixed(2)}`}
          </span>
        ))}
        {primarySize?.costPrice != null && (
          <span className="rounded-xl bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
            Custo R$ {Number(primarySize.costPrice).toFixed(2)}
          </span>
        )}
        {translatedCategory ? (
          <span className="rounded-xl bg-gray-200 px-2 py-0.5 text-xs text-smoke">
            {translatedCategory}
          </span>
        ) : null}
        <span className="rounded-xl bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
          {formatAvailableDays(product.availableDays)}
        </span>
      </div>

      <div
        className={`mt-4 grid gap-2 ${
          product.isActive ? "grid-cols-2" : "grid-cols-3"
        }`}
      >
        <button
          type="button"
          onClick={() => onEdit(product)}
          className="rounded-2xl border border-gold/30 py-2 text-xs font-semibold text-gold transition hover:bg-gold/10"
        >
          {t("EDIT", "Editar")}
        </button>
        <button
          type="button"
          disabled={toggleActive.isPending}
          onClick={() => toggleActive.mutate()}
          className={`rounded-2xl border py-2 text-xs font-semibold transition ${
            product.isActive
              ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
              : "border-green-500/30 text-green-400 hover:bg-green-500/10"
          } disabled:opacity-50`}
        >
          {product.isActive
            ? t("ADMIN_PRODUCTS_DISABLE", "Desativar")
            : t("ADMIN_PRODUCTS_RESTORE", "Ativar")}
        </button>
        {!product.isActive ? (
          <button
            type="button"
            disabled={deleteProduct.isPending}
            onClick={confirmDeleteProduct}
            className="rounded-2xl border border-red-500/40 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            {t("ADMIN_PRODUCTS_DELETE", "Excluir")}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function AdminProductsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null); // null | "new" | product object
  const [activeSection, setActiveSection] = useState("all");

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

  const existingCategories = [
    ...new Set(
      products.map((p) => p.category).filter((c) => c && c !== "Geral"),
    ),
  ];
  const activeSectionConfig =
    GUIDED_ADMIN_SECTIONS.find((section) => section.id === activeSection) ??
    GUIDED_ADMIN_SECTIONS[0];
  const defaultImportNames = DEFAULT_SECTION_IMPORTS[activeSection] ?? [];
  const filteredProducts = products.filter((product) =>
    productMatchesAdminSection(product, activeSection),
  );
  const existingNamesInSection = new Set(
    filteredProducts.map((product) => normalizeText(product.name)),
  );
  const missingDefaultNames = defaultImportNames.filter(
    (name) => !existingNamesInSection.has(normalizeText(name)),
  );
  const sectionCounts = Object.fromEntries(
    GUIDED_ADMIN_SECTIONS.map((section) => [
      section.id,
      products.filter((product) => productMatchesAdminSection(product, section.id))
        .length,
    ]),
  );
  const isNewModal = modal?.mode === "new";
  const importDefaults = useMutation({
    mutationFn: async () => {
      const category = activeSectionConfig.preset?.category;
      if (!category || !missingDefaultNames.length) return;

      for (const name of missingDefaultNames) {
        await api.post("/admin/products", {
          name,
          description: "",
          imageUrl: "",
          category,
          availableDays: [],
          waiterOnly: false,
          sizes: [{ size: "MEDIA", price: 0 }],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Sabores padrao importados!");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.error?.message ??
          err?.response?.data?.message ??
          "Nao foi possivel importar os sabores.",
      );
    },
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 text-gray-900 sm:px-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-gold">
            {t("ADMIN_PRODUCTS_TITLE", "Produtos")}
          </h1>
          <p className="mt-1 text-sm text-smoke">
            {t("ADMIN_PRODUCTS_SUBTITLE", "Gerencie o cardapio da Dubob")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/produtos"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm transition hover:border-gold/30"
          >
            &larr; Produtos
          </Link>
          <button
            type="button"
            onClick={() =>
              setModal({
                mode: "new",
                preset: activeSectionConfig.preset ?? {},
              })
            }
            className="rounded-2xl bg-amber-400 px-4 py-2 text-sm font-bold text-[#11161d] transition hover:bg-amber-300"
          >
            + {t("ADMIN_PRODUCTS_NEW_BUTTON", "Novo Produto")}
          </button>
        </div>
      </header>

      {isLoading && (
        <div className="mt-6 grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-gray-50" />
          ))}
        </div>
      )}

      {isError && (
        <p className="mt-6 text-sm text-red-300">
          {t("ADMIN_PRODUCTS_LOAD_ERROR", "Falha ao carregar produtos.")}
        </p>
      )}

      {!isLoading && !isError && (
        <>
          <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-smoke">
                  Fluxo do cardapio
                </p>
                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  {activeSectionConfig.label}
                </h2>
                <p className="mt-1 text-sm text-smoke">
                  {activeSectionConfig.description}
                </p>
              </div>
              {missingDefaultNames.length > 0 && activeSection !== "all" ? (
                <button
                  type="button"
                  disabled={importDefaults.isPending}
                  onClick={() => importDefaults.mutate()}
                  className="shrink-0 rounded-xl bg-secondary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {importDefaults.isPending
                    ? "Importando..."
                    : `Importar ${missingDefaultNames.length} padrao`}
                </button>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {GUIDED_ADMIN_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    activeSection === section.id
                      ? "border-gold bg-gold/15 text-gold"
                      : "border-gray-200 bg-gray-50 text-gray-800 hover:border-gold/40"
                  }`}
                >
                  <span className="block text-sm font-bold">
                    {section.label}
                  </span>
                  <span className="mt-1 block text-xs text-smoke">
                    {sectionCounts[section.id] ?? 0} itens
                  </span>
                </button>
              ))}
            </div>
          </section>

          <p className="mt-4 text-xs text-smoke">
            {t("ADMIN_PRODUCTS_ACTIVE_COUNT", "{{count}} ativos").replace(
              "{{count}}",
              String(filteredProducts.filter((p) => p.isActive).length),
            )}
            {" - "}
            {t("ADMIN_PRODUCTS_INACTIVE_COUNT", "{{count}} inativos").replace(
              "{{count}}",
              String(filteredProducts.filter((p) => !p.isActive).length),
            )}
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={(p) => setModal(p)}
              />
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-smoke">
                {t("ADMIN_PRODUCTS_EMPTY", "Nenhum produto cadastrado ainda.")}
              </div>
            )}
          </div>
        </>
      )}

      {modal && (
        <ProductModal
          product={isNewModal ? null : modal}
          onClose={() => setModal(null)}
          existingCategories={existingCategories}
          initialValues={isNewModal ? modal.preset : {}}
        />
      )}
    </main>
  );
}

export default AdminProductsPage;


