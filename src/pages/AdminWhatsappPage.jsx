import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api.js";
import PageHeader from "../components/PageHeader.jsx";

// Avisos automáticos de WhatsApp do delivery (Evolution API).
const ETAPAS = [
  {
    id: "CONFIRMADO",
    label: "Pedido confirmado",
    hint: "Quando o pagamento é aprovado ou o caixa libera para a cozinha.",
  },
  {
    id: "SAIU",
    label: "Saiu para entrega",
    hint: "Com o nome do motoboy e o código de entrega.",
  },
  { id: "ENTREGUE", label: "Entregue", hint: "Agradecimento depois da entrega." },
  { id: "CANCELADO", label: "Cancelado", hint: "Quando o pedido é cancelado." },
];

const ESTADOS = {
  open: { label: "Conectado", cls: "bg-green-100 text-green-800" },
  connecting: { label: "Aguardando o QR Code", cls: "bg-amber-100 text-amber-800" },
  close: { label: "Desconectado", cls: "bg-red-100 text-red-700" },
  inexistente: { label: "Ainda não conectado", cls: "bg-gray-100 text-gray-700" },
  erro: { label: "Evolution API indisponível", cls: "bg-red-100 text-red-700" },
};

const STATUS_MENSAGEM = {
  FILA: "Na fila",
  ENVIANDO: "Enviando",
  ENVIADO: "Enviada",
  ERRO: "Erro",
  DESCARTADA: "Descartada",
};

const errorMessage = (error, fallback) =>
  error?.response?.data?.error?.message ?? error?.response?.data?.message ?? fallback;

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--";

export default function AdminWhatsappPage() {
  const queryClient = useQueryClient();
  // Só o que a pessoa alterou; o resto vem da configuração salva
  const [edits, setEdits] = useState({});
  const [qr, setQr] = useState(null);
  const [telefoneTeste, setTelefoneTeste] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-whatsapp"],
    queryFn: async () => (await api.get("/admin/whatsapp")).data?.data,
    refetchInterval: 15_000,
  });

  const form = data?.config
    ? {
        evolutionUrl: data.config.evolutionUrl ?? "",
        instancia: data.config.instancia || "dubob",
        apiKey: "",
        intervaloSegundos: data.config.intervaloSegundos ?? 15,
        etapas: data.config.etapas ?? ["SAIU"],
        ...edits,
      }
    : null;
  const setForm = (next) => setEdits(next);

  const estado = data?.conexao?.estado;
  const conectado = estado === "open";

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-whatsapp"] });

  const salvar = useMutation({
    mutationFn: async (payload) => (await api.put("/admin/whatsapp", payload)).data?.data,
    onSuccess: (_data, payload) => {
      toast.success(
        payload.ativo === true
          ? "Avisos de WhatsApp ligados."
          : payload.ativo === false
            ? "Avisos de WhatsApp desligados."
            : "Configuração salva.",
      );
      setEdits({});
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, "Erro ao salvar.")),
  });

  const conectar = useMutation({
    mutationFn: async () => (await api.post("/admin/whatsapp/conectar")).data?.data,
    onSuccess: (result) => {
      if (result?.estado === "open") toast.success("O número já está conectado.");
      setQr(result?.qrBase64 ? result : null);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível conectar.")),
  });

  const teste = useMutation({
    mutationFn: async () =>
      (await api.post("/admin/whatsapp/teste", { telefone: telefoneTeste })).data?.data,
    onSuccess: () => toast.success("Mensagem de teste enviada."),
    onError: (error) => toast.error(errorMessage(error, "Não foi possível enviar o teste.")),
  });

  const salvarConfig = () =>
    salvar.mutate({
      evolutionUrl: form.evolutionUrl,
      instancia: form.instancia,
      intervaloSegundos: Number(form.intervaloSegundos),
      etapas: form.etapas,
      ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
    });

  const toggleEtapa = (id) =>
    setForm({
      ...form,
      etapas: form.etapas.includes(id)
        ? form.etapas.filter((etapa) => etapa !== id)
        : [...form.etapas, id],
    });

  const ativo = Boolean(data?.config?.ativo);
  const estadoInfo = ESTADOS[estado] ?? (data?.conexao?.configurado ? ESTADOS.erro : null);
  const fila = data?.fila;

  return (
    <main className="min-h-screen text-gray-900">
      <PageHeader
        backTo="/admin"
        title="WhatsApp do delivery"
        subtitle="Avisos automáticos para o cliente: pedido confirmado, saiu para entrega, entregue."
      />

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-8">
        {isLoading || !form ? (
          <p className="text-sm text-smoke">Carregando...</p>
        ) : (
          <>
            {/* Liga/desliga e conexão */}
            <section className="ui-card flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-secondary">
                  Avisos automáticos
                </p>
                <p className="mt-1 text-2xl font-black text-primary">
                  {ativo ? "Ligados" : "Desligados"}
                </p>
                {estadoInfo && (
                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-black ${estadoInfo.cls}`}
                  >
                    WhatsApp: {estadoInfo.label}
                  </span>
                )}
                {fila?.pausa && (
                  <p className="mt-2 text-sm font-bold text-red-600">⚠ {fila.pausa}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={conectar.isPending || !data?.conexao?.configurado}
                  onClick={() => conectar.mutate()}
                  className="ui-btn ui-btn-outline"
                >
                  {conectado ? "Reconectar" : conectar.isPending ? "Gerando QR..." : "Conectar número"}
                </button>
                <button
                  type="button"
                  disabled={salvar.isPending}
                  onClick={() => salvar.mutate({ ativo: !ativo })}
                  className={`ui-btn ${ativo ? "ui-btn-danger" : "ui-btn-primary"}`}
                >
                  {ativo ? "Desligar avisos" : "Ligar avisos"}
                </button>
              </div>
            </section>

            {qr && !conectado && (
              <section className="ui-card flex flex-col items-center gap-3 p-6 text-center">
                <p className="text-lg font-black text-primary">
                  No celular do chip dos avisos: WhatsApp → Aparelhos conectados → Conectar aparelho
                </p>
                <img src={qr.qrBase64} alt="QR Code do WhatsApp" className="h-64 w-64" />
                {qr.pairingCode && (
                  <p className="text-sm text-smoke">
                    Ou use o código: <strong>{qr.pairingCode}</strong>
                  </p>
                )}
                <p className="text-xs text-smoke">
                  Esta tela atualiza sozinha quando o número conectar.
                </p>
              </section>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              {/* Configuração */}
              <section className="ui-card space-y-4 p-5">
                <h2 className="font-display text-xl font-bold text-primary">Evolution API</h2>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-smoke">
                    URL do servidor
                  </span>
                  <input
                    className="ui-input"
                    placeholder="https://evolution.seudominio.com"
                    value={form.evolutionUrl}
                    onChange={(e) => setForm({ ...form, evolutionUrl: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-smoke">
                    Chave (apikey)
                  </span>
                  <input
                    className="ui-input"
                    type="password"
                    autoComplete="off"
                    placeholder={
                      data.config.apiKeyConfigurada
                        ? `Salva (${data.config.apiKeyMascarada}). Deixe vazio para manter.`
                        : "Cole a chave da Evolution"
                    }
                    value={form.apiKey}
                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-smoke">
                      Instância
                    </span>
                    <input
                      className="ui-input"
                      value={form.instancia}
                      onChange={(e) => setForm({ ...form, instancia: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-smoke">
                      Intervalo (segundos)
                    </span>
                    <input
                      className="ui-input"
                      type="number"
                      min={8}
                      max={600}
                      value={form.intervaloSegundos}
                      onChange={(e) => setForm({ ...form, intervaloSegundos: e.target.value })}
                    />
                  </label>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-smoke">
                    Quais avisos enviar
                  </p>
                  <div className="space-y-2">
                    {ETAPAS.map((etapa) => (
                      <label
                        key={etapa.id}
                        className="flex cursor-pointer items-start gap-3 rounded-2xl bg-accent/50 px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-secondary"
                          checked={form.etapas.includes(etapa.id)}
                          onChange={() => toggleEtapa(etapa.id)}
                        />
                        <span>
                          <span className="block font-bold text-primary">{etapa.label}</span>
                          <span className="block text-xs text-smoke">{etapa.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-smoke">
                    Dica: comece só com &quot;Saiu para entrega&quot; na primeira semana para
                    aquecer o número.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={salvar.isPending}
                  onClick={salvarConfig}
                  className="ui-btn ui-btn-primary w-full"
                >
                  {salvar.isPending ? "Salvando..." : "Salvar configuração"}
                </button>
              </section>

              {/* Teste e fila */}
              <section className="space-y-5">
                <div className="ui-card space-y-3 p-5">
                  <h2 className="font-display text-xl font-bold text-primary">Enviar teste</h2>
                  <div className="flex gap-2">
                    <input
                      className="ui-input"
                      placeholder="(11) 98765-4321"
                      value={telefoneTeste}
                      onChange={(e) => setTelefoneTeste(e.target.value)}
                    />
                    <button
                      type="button"
                      disabled={!conectado || !telefoneTeste.trim() || teste.isPending}
                      onClick={() => teste.mutate()}
                      className="ui-btn ui-btn-primary shrink-0"
                    >
                      Enviar
                    </button>
                  </div>
                  {!conectado && (
                    <p className="text-xs text-smoke">Conecte o número para enviar o teste.</p>
                  )}
                </div>

                <div className="ui-card p-5">
                  <h2 className="font-display text-xl font-bold text-primary">Fila de avisos</h2>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl bg-accent/60 p-3">
                      <p className="text-2xl font-black text-primary">{fila?.naFila ?? 0}</p>
                      <p className="text-xs text-smoke">na fila</p>
                    </div>
                    <div className="rounded-2xl bg-green-50 p-3">
                      <p className="text-2xl font-black text-green-700">{fila?.enviadasHoje ?? 0}</p>
                      <p className="text-xs text-smoke">enviadas (24h)</p>
                    </div>
                    <div className="rounded-2xl bg-red-50 p-3">
                      <p className="text-2xl font-black text-red-600">{fila?.errosHoje ?? 0}</p>
                      <p className="text-xs text-smoke">erros (24h)</p>
                    </div>
                  </div>
                  <ul className="mt-4 divide-y divide-border-soft text-sm">
                    {(fila?.recentes ?? []).length === 0 && (
                      <li className="py-3 text-center text-smoke">Nenhum aviso ainda.</li>
                    )}
                    {(fila?.recentes ?? []).map((m) => (
                      <li key={m.id} className="flex items-start justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="font-bold text-primary">
                            #{String(m.orderId).slice(-6).toUpperCase()} ·{" "}
                            {ETAPAS.find((e) => e.id === m.etapa)?.label ?? m.etapa}
                          </p>
                          <p className="text-xs text-smoke">
                            {m.telefone} · {formatDateTime(m.enviadoEm ?? m.createdAt)}
                          </p>
                          {m.erro && <p className="text-xs text-red-600">{m.erro}</p>}
                        </div>
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700">
                          {STATUS_MENSAGEM[m.status] ?? m.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
