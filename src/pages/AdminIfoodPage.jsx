import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api.js";
import PageHeader from "../components/PageHeader.jsx";

// Integração iFood: os pedidos de lá entram na cozinha do duBob e as
// mudanças de status feitas aqui voltam para o iFood.
const errorMessage = (error, fallback) =>
  error?.response?.data?.error?.message ?? error?.response?.data?.message ?? fallback;

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--";

export default function AdminIfoodPage() {
  const queryClient = useQueryClient();
  // Só o que a pessoa alterou; o resto vem da configuração salva
  const [edits, setEdits] = useState({});
  const [lojas, setLojas] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-ifood"],
    queryFn: async () => (await api.get("/admin/ifood")).data?.data,
    refetchInterval: 15_000,
  });

  const form = data?.config
    ? {
        clientId: data.config.clientId ?? "",
        clientSecret: "",
        merchantId: data.config.merchantId ?? "",
        autoConfirmar: data.config.autoConfirmar ?? true,
        ...edits,
      }
    : null;
  const setForm = (next) => setEdits(next);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-ifood"] });

  const salvar = useMutation({
    mutationFn: async (payload) => (await api.put("/admin/ifood", payload)).data?.data,
    onSuccess: (_data, payload) => {
      toast.success(
        payload.ativo === true
          ? "Pedidos do iFood ligados."
          : payload.ativo === false
            ? "Pedidos do iFood desligados."
            : "Configuração salva.",
      );
      setEdits({});
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, "Erro ao salvar.")),
  });

  const testar = useMutation({
    mutationFn: async () => (await api.post("/admin/ifood/testar")).data?.data,
    onSuccess: (result) => {
      setLojas(result?.lojas ?? null);
      toast.success(result?.aviso ?? "Conexão com o iFood funcionando.");
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível conectar ao iFood.")),
  });

  const salvarConfig = () =>
    salvar.mutate({
      clientId: form.clientId,
      merchantId: form.merchantId,
      autoConfirmar: form.autoConfirmar,
      ...(form.clientSecret.trim() ? { clientSecret: form.clientSecret.trim() } : {}),
    });

  const ativo = Boolean(data?.config?.ativo);
  const polling = data?.polling;

  return (
    <main className="min-h-screen text-gray-900">
      <PageHeader
        backTo="/admin"
        title="iFood"
        subtitle="Pedidos do iFood chegam direto na cozinha do duBob."
      />

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-8">
        {isLoading || !form ? (
          <p className="text-sm text-smoke">Carregando...</p>
        ) : (
          <>
            {/* Liga/desliga e situação da consulta */}
            <section className="ui-card flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-secondary">
                  Receber pedidos do iFood
                </p>
                <p className="mt-1 text-2xl font-black text-primary">
                  {ativo ? "Ligado" : "Desligado"}
                </p>
                {ativo && (
                  <p className="mt-2 text-sm text-smoke">
                    Última consulta: {formatDateTime(polling?.ultimaConsulta)} · Último pedido:{" "}
                    {formatDateTime(polling?.ultimoPedido)}
                  </p>
                )}
                {polling?.ultimoErro && (
                  <p className="mt-2 text-sm font-bold text-red-600">⚠ {polling.ultimoErro}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={testar.isPending || !data.config.clientSecretConfigurado}
                  onClick={() => testar.mutate()}
                  className="ui-btn ui-btn-outline"
                >
                  {testar.isPending ? "Testando..." : "Testar conexão"}
                </button>
                <button
                  type="button"
                  disabled={salvar.isPending}
                  onClick={() => salvar.mutate({ ativo: !ativo })}
                  className={`ui-btn ${ativo ? "ui-btn-danger" : "ui-btn-primary"}`}
                >
                  {ativo ? "Desligar" : "Ligar"}
                </button>
              </div>
            </section>

            <section className="ui-card p-5">
              <h2 className="font-display text-lg font-bold text-primary">
                Últimos eventos recebidos do iFood
              </h2>
              {polling?.eventos?.length ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {polling.eventos.map((evento, index) => (
                    <li key={`${evento.em}-${index}`} className="flex flex-wrap gap-2">
                      <span className="text-smoke">{formatDateTime(evento.em)}</span>
                      <strong>{evento.codigo}</strong>
                      <code className="rounded bg-gray-100 px-2 py-0.5 text-xs">{evento.pedido}</code>
                      <span
                        className={
                          evento.resultado === "ok" ? "text-emerald-700" : "font-bold text-red-600"
                        }
                      >
                        {evento.resultado}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-smoke">
                  Nenhum evento desde que o servidor iniciou. Gere um pedido de teste no portal do
                  iFood e aguarde até 30 segundos.
                </p>
              )}
            </section>

            {lojas && (
              <section className="ui-card p-5">
                <h2 className="font-display text-lg font-bold text-primary">
                  Lojas que o app enxerga
                </h2>
                {lojas.length === 0 ? (
                  <p className="mt-2 text-sm text-smoke">
                    Nenhuma loja vinculada. Autorize o app no Portal do Parceiro iFood.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm">
                    {lojas.map((loja) => (
                      <li key={loja.id} className="flex flex-wrap items-center gap-2">
                        <strong>{loja.nome}</strong>
                        <code className="rounded bg-gray-100 px-2 py-0.5 text-xs">{loja.id}</code>
                        <button
                          type="button"
                          className="text-xs font-bold text-secondary underline"
                          onClick={() => setForm({ ...form, merchantId: loja.id })}
                        >
                          Usar esta
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="ui-card space-y-4 p-5">
                <h2 className="font-display text-xl font-bold text-primary">Credenciais do app</h2>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-smoke">
                    Client ID
                  </span>
                  <input
                    className="ui-input"
                    autoComplete="off"
                    value={form.clientId}
                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-smoke">
                    Client Secret
                  </span>
                  <input
                    className="ui-input"
                    type="password"
                    autoComplete="off"
                    placeholder={
                      data.config.clientSecretConfigurado
                        ? `Salvo (${data.config.clientSecretMascarado}). Deixe vazio para manter.`
                        : "Cole o Client Secret"
                    }
                    value={form.clientSecret}
                    onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-smoke">
                    Merchant ID (ID da loja)
                  </span>
                  <input
                    className="ui-input"
                    autoComplete="off"
                    value={form.merchantId}
                    onChange={(e) => setForm({ ...form, merchantId: e.target.value })}
                  />
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={form.autoConfirmar}
                    onChange={(e) => setForm({ ...form, autoConfirmar: e.target.checked })}
                  />
                  <span className="text-sm">
                    <strong>Confirmar pedidos automaticamente</strong>
                    <span className="block text-smoke">
                      Desligado, o pedido só é confirmado quando a cozinha começa o preparo. O
                      iFood cancela pedidos não confirmados em poucos minutos.
                    </span>
                  </span>
                </label>
                <button
                  type="button"
                  disabled={salvar.isPending}
                  onClick={salvarConfig}
                  className="ui-btn ui-btn-primary"
                >
                  Salvar
                </button>
              </section>

              <section className="ui-card space-y-3 p-5 text-sm">
                <h2 className="font-display text-xl font-bold text-primary">Como funciona</h2>
                <ol className="list-decimal space-y-2 pl-5">
                  <li>
                    Crie um app no <strong>Portal do Desenvolvedor iFood</strong> e copie o Client
                    ID e o Client Secret.
                  </li>
                  <li>Autorize o app no Portal do Parceiro da loja e cole o Merchant ID aqui.</li>
                  <li>
                    Ligue a integração. A cada 30 segundos o duBob busca pedidos novos — isso
                    também mantém a loja aberta no iFood.
                  </li>
                  <li>
                    O pedido aparece na <strong>Cozinha Delivery</strong>. Ao mover para
                    Preparando, Pronto ou Saiu, o iFood é avisado.
                  </li>
                  <li>
                    Para o item cair no produto certo, use o <strong>código PDV</strong> do item no
                    iFood igual ao ID do produto aqui (ou o mesmo nome). Sem par, ele aparece com o
                    nome do iFood.
                  </li>
                </ol>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
