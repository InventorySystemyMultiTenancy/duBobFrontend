import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api.js";
import PageHeader from "../components/PageHeader.jsx";

// Produtos que têm preço próprio (bases do milk shake/açaí e complementos pagos).
// Sabores e complementos inclusos não têm preço, então não entram.
const PRICED_CATEGORY = /complemento milkshake|complemento acai premium/i;
const CONFIG_CATEGORY = /sabor |complemento|adicionais/i;

const SIZE_NAMES = { PEQUENA: "P", MEDIA: "M", GRANDE: "G", FAMILIA: "MG" };

const currency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const errorMessage = (error, fallback) =>
  error?.response?.data?.error?.message ?? error?.response?.data?.message ?? fallback;

// <input type="datetime-local"> trabalha no horário local, sem fuso
const toLocalInput = (date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const formatDateTime = (value) =>
  new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

function sizeLabel(size) {
  return size.label || SIZE_NAMES[size.size] || size.size;
}

function promoStatus(promo, now = Date.now()) {
  if (!promo.isActive) return { label: "Pausada", cls: "bg-gray-100 text-gray-700" };
  if (new Date(promo.endsAt).getTime() <= now) return { label: "Encerrada", cls: "bg-gray-100 text-gray-500" };
  if (new Date(promo.startsAt).getTime() > now) return { label: "Agendada", cls: "bg-sky-100 text-sky-800" };
  return { label: "Valendo agora", cls: "bg-green-100 text-green-800" };
}

const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds} segundos`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minuto${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h${rest ? ` ${rest}min` : ""}`;
};

const emptyPromo = () => {
  const start = new Date();
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 4 * 3600 * 1000);
  return {
    id: null,
    title: "",
    productId: "",
    size: "",
    price: "",
    startsAt: toLocalInput(start),
    endsAt: toLocalInput(end),
    isActive: true,
  };
};

const CAMPAIGN_STATUS = {
  ENVIANDO: { label: "Enviando", cls: "bg-amber-100 text-amber-800" },
  CONCLUIDA: { label: "Concluída", cls: "bg-green-100 text-green-800" },
  CANCELADA: { label: "Cancelada", cls: "bg-gray-100 text-gray-600" },
};

export default function AdminPromocoesPage() {
  const queryClient = useQueryClient();
  const [promo, setPromo] = useState(emptyPromo);
  const [titulo, setTitulo] = useState("");
  const [mensagens, setMensagens] = useState([""]);
  const [intervalo, setIntervalo] = useState(20);
  const [preview, setPreview] = useState(null);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await api.get("/products")).data?.data ?? [],
    staleTime: 5 * 60 * 1000,
  });
  const { data: promotions = [] } = useQuery({
    queryKey: ["admin-promotions"],
    queryFn: async () => (await api.get("/admin/promotions")).data?.data ?? [],
  });
  const { data: campanhas = [] } = useQuery({
    queryKey: ["admin-campanhas"],
    queryFn: async () => (await api.get("/admin/whatsapp/campanhas")).data?.data ?? [],
    refetchInterval: 10_000,
  });

  const pricedProducts = products
    .filter(
      (p) =>
        p.sizes?.length &&
        (PRICED_CATEGORY.test(normalize(p.category)) || !CONFIG_CATEGORY.test(normalize(p.category))),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  const selectedProduct = pricedProducts.find((p) => p.id === promo.productId);
  const selectedSize = selectedProduct?.sizes?.find((s) => s.size === promo.size);
  const normalPrice = selectedSize?.price ?? selectedProduct?.sizes?.[0]?.price;

  const refreshPromos = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
    queryClient.invalidateQueries({ queryKey: ["active-promotions"] });
  };

  const salvarPromo = useMutation({
    mutationFn: async (payload) =>
      payload.id
        ? api.put(`/admin/promotions/${payload.id}`, payload)
        : api.post("/admin/promotions", payload),
    onSuccess: (_res, payload) => {
      toast.success(payload.id ? "Promoção atualizada." : "Promoção criada.");
      setPromo(emptyPromo());
      refreshPromos();
    },
    onError: (error) => toast.error(errorMessage(error, "Erro ao salvar a promoção.")),
  });

  const removerPromo = useMutation({
    mutationFn: async (id) => api.delete(`/admin/promotions/${id}`),
    onSuccess: () => {
      toast.success("Promoção removida.");
      refreshPromos();
    },
    onError: (error) => toast.error(errorMessage(error, "Erro ao remover.")),
  });

  const verPreview = useMutation({
    mutationFn: async () =>
      (await api.get("/admin/whatsapp/campanhas/preview", { params: { intervalo } })).data
        ?.data,
    onSuccess: setPreview,
    onError: (error) => toast.error(errorMessage(error, "Não foi possível calcular.")),
  });

  const enviar = useMutation({
    mutationFn: async () =>
      (
        await api.post("/admin/whatsapp/campanhas", {
          titulo,
          mensagens,
          intervaloSegundos: Number(intervalo),
        })
      ).data?.data,
    onSuccess: (result) => {
      toast.success(`Envio começou para ${result.destinatarios} pessoas.`);
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["admin-campanhas"] });
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível enviar.")),
  });

  const cancelar = useMutation({
    mutationFn: async (id) => api.post(`/admin/whatsapp/campanhas/${id}/cancelar`),
    onSuccess: () => {
      toast.success("Envio cancelado.");
      queryClient.invalidateQueries({ queryKey: ["admin-campanhas"] });
    },
  });

  const submitPromo = (event) => {
    event.preventDefault();
    salvarPromo.mutate({
      id: promo.id,
      title: promo.title || `${selectedProduct?.name ?? "Promoção"}`,
      productId: promo.productId,
      size: promo.size || null,
      price: Number(String(promo.price).replace(",", ".")),
      startsAt: new Date(promo.startsAt).toISOString(),
      endsAt: new Date(promo.endsAt).toISOString(),
      isActive: promo.isActive,
    });
  };

  const editPromo = (p) =>
    setPromo({
      id: p.id,
      title: p.title,
      productId: p.productId,
      size: p.size ?? "",
      price: String(p.price),
      startsAt: toLocalInput(p.startsAt),
      endsAt: toLocalInput(p.endsAt),
      isActive: p.isActive,
    });

  const ativasAgora = promotions.filter((p) => promoStatus(p).label === "Valendo agora");

  // Monta um texto a partir das promoções que estão valendo
  const usarPromocoesAtivas = () => {
    if (!ativasAgora.length) {
      toast.error("Nenhuma promoção valendo agora.");
      return;
    }
    const linhas = ativasAgora
      .map((p) => {
        const product = products.find((prod) => prod.id === p.productId);
        const size = product?.sizes?.find((s) => s.size === p.size);
        return `• ${p.productName ?? p.title}${size ? ` ${sizeLabel(size)}` : ""} por ${currency(p.price)} (até ${formatDateTime(p.endsAt)})`;
      })
      .join("\n");
    setMensagens([
      `Oi, {nome}! 🔥 Promoção no Dubob:\n${linhas}\nPeça pelo nosso site ou venha na loja! 💜`,
      `{nome}, olha só que promoção boa no Dubob hoje 😋\n${linhas}\nCorre que é por tempo limitado!`,
    ]);
    if (!titulo) setTitulo(ativasAgora[0].title);
  };

  const mensagensValidas = mensagens.filter((m) => m.trim());
  const intervaloBaixo = Number(intervalo) < 15;

  const confirmarEnvio = () => {
    if (!preview) return;
    const ok = window.confirm(
      `Enviar a promoção para ${preview.destinatarios} pessoas?\n\n` +
        `Tempo estimado: ${formatDuration(preview.tempoEstimadoSegundos)} ` +
        `(1 mensagem a cada ~${preview.intervaloSegundos}s).`,
    );
    if (ok) enviar.mutate();
  };

  return (
    <main className="min-h-screen text-gray-900">
      <PageHeader
        backTo="/admin"
        title="Promoções"
        subtitle="Preço especial por tempo limitado e envio para os clientes no WhatsApp."
      />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-8">
        {/* ---------- Preços promocionais ---------- */}
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="ui-card p-5">
            <h2 className="font-display text-xl font-bold text-primary">Preços promocionais</h2>
            <p className="mt-1 text-sm text-smoke">
              O preço muda sozinho no início e volta ao normal no fim. Vale no site, no totem e
              no caixa.
            </p>
            <ul className="mt-4 space-y-2">
              {promotions.length === 0 && (
                <li className="rounded-2xl border-2 border-dashed border-primary/10 p-5 text-center text-sm text-smoke">
                  Nenhuma promoção ainda.
                </li>
              )}
              {promotions.map((p) => {
                const status = promoStatus(p);
                const product = products.find((prod) => prod.id === p.productId);
                const size = product?.sizes?.find((s) => s.size === p.size);
                return (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent/50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-primary">{p.title}</p>
                      <p className="text-sm text-smoke">
                        {p.productName ?? "Produto"}
                        {size ? ` · ${sizeLabel(size)}` : p.size ? "" : " · todos os tamanhos"} ·{" "}
                        <strong className="text-secondary">{currency(p.price)}</strong>
                        {size && (
                          <span className="ml-1 line-through">{currency(size.price)}</span>
                        )}
                      </p>
                      <p className="text-xs text-smoke">
                        {formatDateTime(p.startsAt)} até {formatDateTime(p.endsAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${status.cls}`}>
                        {status.label}
                      </span>
                      <button type="button" onClick={() => editPromo(p)} className="ui-btn ui-btn-sm ui-btn-outline">
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => window.confirm(`Remover "${p.title}"?`) && removerPromo.mutate(p.id)}
                        className="ui-btn ui-btn-sm ui-btn-danger"
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <form onSubmit={submitPromo} className="ui-card h-fit space-y-3 p-5">
            <h3 className="font-display text-lg font-bold text-primary">
              {promo.id ? "Editar promoção" : "Nova promoção"}
            </h3>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-smoke">Produto</span>
              <select
                className="ui-input"
                value={promo.productId}
                onChange={(e) => setPromo({ ...promo, productId: e.target.value, size: "" })}
                required
              >
                <option value="">Escolha...</option>
                {pricedProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {selectedProduct?.sizes?.length > 1 && (
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-smoke">Tamanho</span>
                <select
                  className="ui-input"
                  value={promo.size}
                  onChange={(e) => setPromo({ ...promo, size: e.target.value })}
                >
                  <option value="">Todos os tamanhos</option>
                  {selectedProduct.sizes.map((s) => (
                    <option key={s.size} value={s.size}>
                      {sizeLabel(s)} — {currency(s.price)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-smoke">
                Preço promocional
              </span>
              <input
                className="ui-input"
                inputMode="decimal"
                placeholder="Ex.: 10,00"
                value={promo.price}
                onChange={(e) => setPromo({ ...promo, price: e.target.value })}
                required
              />
              {normalPrice != null && (
                <span className="mt-1 block text-xs text-smoke">
                  Preço normal: {currency(normalPrice)}
                </span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-smoke">Início</span>
                <input
                  type="datetime-local"
                  className="ui-input px-2 text-sm"
                  value={promo.startsAt}
                  onChange={(e) => setPromo({ ...promo, startsAt: e.target.value })}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-smoke">Fim</span>
                <input
                  type="datetime-local"
                  className="ui-input px-2 text-sm"
                  value={promo.endsAt}
                  onChange={(e) => setPromo({ ...promo, endsAt: e.target.value })}
                  required
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-smoke">
                Nome (opcional)
              </span>
              <input
                className="ui-input"
                placeholder="Ex.: Tradicional M por R$ 10"
                value={promo.title}
                onChange={(e) => setPromo({ ...promo, title: e.target.value })}
                maxLength={80}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-primary">
              <input
                type="checkbox"
                className="h-4 w-4 accent-secondary"
                checked={promo.isActive}
                onChange={(e) => setPromo({ ...promo, isActive: e.target.checked })}
              />
              Ativa
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={salvarPromo.isPending} className="ui-btn ui-btn-primary flex-1">
                {salvarPromo.isPending ? "Salvando..." : promo.id ? "Salvar" : "Criar promoção"}
              </button>
              {promo.id && (
                <button type="button" onClick={() => setPromo(emptyPromo())} className="ui-btn ui-btn-outline">
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        {/* ---------- Envio no WhatsApp ---------- */}
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="ui-card space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-primary">Enviar no WhatsApp</h2>
                <p className="mt-1 text-sm text-smoke">
                  Só para quem marcou &quot;Quero receber promoções&quot;. Quem respondeu SAIR nunca
                  recebe. Cada pessoa recebe uma das versões, com o nome dela.
                </p>
              </div>
              <button type="button" onClick={usarPromocoesAtivas} className="ui-btn ui-btn-sm ui-btn-outline">
                Usar promoções ativas
              </button>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-smoke">Título</span>
              <input
                className="ui-input"
                placeholder="Ex.: Promo de sábado"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={80}
              />
            </label>

            {mensagens.map((mensagem, index) => (
              <label key={index} className="block">
                <span className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-smoke">
                  Versão {index + 1}
                  {mensagens.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setMensagens(mensagens.filter((_, i) => i !== index))}
                      className="text-xs font-bold normal-case tracking-normal text-red-500"
                    >
                      remover
                    </button>
                  )}
                </span>
                <textarea
                  rows={4}
                  className="ui-input resize-y"
                  placeholder="Oi, {nome}! Hoje o milk shake M está R$ 10 até as 20h 💜"
                  value={mensagem}
                  onChange={(e) =>
                    setMensagens(mensagens.map((m, i) => (i === index ? e.target.value : m)))
                  }
                  maxLength={1000}
                />
              </label>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-smoke">
              <span>
                Use <strong>{"{nome}"}</strong> para o primeiro nome. O aviso &quot;responda SAIR&quot;
                vai no fim automaticamente.
              </span>
              {mensagens.length < 5 && (
                <button
                  type="button"
                  onClick={() => setMensagens([...mensagens, ""])}
                  className="font-bold text-secondary"
                >
                  + outra versão
                </button>
              )}
            </div>
          </div>

          <div className="ui-card h-fit space-y-4 p-5">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-smoke">
                Intervalo entre mensagens (segundos)
              </span>
              <input
                type="number"
                min={3}
                max={600}
                className="ui-input"
                value={intervalo}
                onChange={(e) => {
                  setIntervalo(e.target.value);
                  setPreview(null);
                }}
              />
              {intervaloBaixo && (
                <span className="mt-1 block text-xs font-bold text-amber-700">
                  ⚠ Intervalo baixo aumenta o risco de o WhatsApp bloquear o número.
                </span>
              )}
            </label>

            <button
              type="button"
              disabled={verPreview.isPending}
              onClick={() => verPreview.mutate()}
              className="ui-btn ui-btn-outline w-full"
            >
              {verPreview.isPending ? "Calculando..." : "Ver quantas pessoas recebem"}
            </button>

            {preview && (
              <div className="space-y-1 rounded-2xl bg-accent/60 p-4">
                <p className="text-3xl font-black text-primary">{preview.destinatarios}</p>
                <p className="text-sm font-bold text-primary">pessoas vão receber</p>
                <p className="text-sm text-smoke">
                  Tempo estimado: <strong>{formatDuration(preview.tempoEstimadoSegundos)}</strong>
                </p>
                <p className="text-xs text-smoke">
                  {preview.aceitaram} aceitaram · {preview.semTelefone} sem celular ·{" "}
                  {preview.sairam} responderam SAIR
                </p>
              </div>
            )}

            <button
              type="button"
              disabled={
                !preview ||
                !preview.destinatarios ||
                !mensagensValidas.length ||
                enviar.isPending
              }
              onClick={confirmarEnvio}
              className="ui-btn ui-btn-primary w-full"
            >
              {enviar.isPending
                ? "Enviando..."
                : preview
                  ? `Enviar para ${preview.destinatarios} pessoas`
                  : "Enviar"}
            </button>
            {!preview && (
              <p className="text-center text-xs text-smoke">
                Veja antes quantas pessoas recebem e o tempo estimado.
              </p>
            )}
          </div>
        </section>

        {campanhas.length > 0 && (
          <section className="ui-card p-5">
            <h2 className="font-display text-xl font-bold text-primary">Envios</h2>
            <ul className="mt-3 divide-y divide-border-soft">
              {campanhas.map((c) => {
                const status = CAMPAIGN_STATUS[c.status] ?? { label: c.status, cls: "bg-gray-100" };
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-bold text-primary">{c.titulo}</p>
                      <p className="text-xs text-smoke">
                        {formatDateTime(c.createdAt)} · {c.enviadas}/{c.total} enviadas
                        {c.erros ? ` · ${c.erros} com erro` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${status.cls}`}>
                        {status.label}
                      </span>
                      {c.status === "ENVIANDO" && (
                        <button
                          type="button"
                          onClick={() =>
                            window.confirm("Cancelar o que ainda não foi enviado?") &&
                            cancelar.mutate(c.id)
                          }
                          className="ui-btn ui-btn-sm ui-btn-danger"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
