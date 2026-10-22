import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api.js";

import PageHeader from "../components/PageHeader.jsx";

const PROVIDERS = [
  {
    id: "MERCADO_PAGO",
    name: "Mercado Pago",
    logo: "MP",
    logoClass: "bg-sky-500/15 text-sky-600",
    description: "Maquininha Point, Pix na mesa e checkout online.",
  },
  {
    id: "SUMUP",
    name: "SumUp",
    logo: "SU",
    logoClass: "bg-gray-900 text-white",
    description: "Maquininha SumUp Solo conectada pela Cloud API.",
  },
];

const errorMessage = (error, fallback) =>
  error?.response?.data?.error?.message || fallback;

function ProviderCard({ provider, active, configured, onSelect, disabled }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition disabled:opacity-60 ${
        active
          ? "border-secondary bg-secondary/5 ring-2 ring-secondary/30"
          : "border-gray-200 bg-white hover:border-gray-400"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black ${provider.logoClass}`}
      >
        {provider.logo}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-900">{provider.name}</span>
          {active ? (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              Em uso
            </span>
          ) : null}
          {configured ? (
            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-600">
              Configurado
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
              Sem credenciais
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs text-gray-500">
          {provider.description}
        </span>
      </span>
    </button>
  );
}

function SumUpCredentials({ sumup }) {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");

  const mutation = useMutation({
    mutationFn: async (sumupApiKey) =>
      (await api.put("/admin/settings/payment", { sumupApiKey })).data,
    onSuccess: (_data, sumupApiKey) => {
      queryClient.invalidateQueries({ queryKey: ["admin-payment-settings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sumup-readers"] });
      setApiKey("");
      toast.success(sumupApiKey ? "API key da SumUp salva." : "API key removida.");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Erro ao salvar a API key.")),
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!apiKey.trim()) return toast.error("Cole a API key da SumUp.");
    mutation.mutate(apiKey.trim());
  };

  return (
    <div className="ui-card p-5">
      <h2 className="font-semibold text-gray-900">Credenciais SumUp</h2>
      <p className="mt-0.5 text-xs text-gray-500">
        Gere a chave no painel da SumUp em Configurações → Para
        desenvolvedores → Chaves de API. O código do comerciante é descoberto
        automaticamente.
      </p>

      {sumup.configured ? (
        <div className="mt-3 grid gap-2 rounded-2xl bg-gray-50 p-3 text-xs sm:grid-cols-2">
          <p>
            <span className="text-gray-500">API key: </span>
            <span className="font-mono">{sumup.apiKeyMasked}</span>
          </p>
          <p>
            <span className="text-gray-500">Comerciante: </span>
            <span className="font-mono">{sumup.merchantCode || "—"}</span>
          </p>
          {sumup.source === "env" ? (
            <p className="text-amber-600 sm:col-span-2">
              Usando a chave do .env do servidor (SUMUP_API_KEY).
            </p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="password"
          autoComplete="off"
          placeholder={sumup.configured ? "Trocar API key (sup_sk_...)" : "sup_sk_..."}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          className="min-w-0 flex-1 rounded-2xl border border-gray-200 px-3 py-2.5 font-mono text-sm focus:border-secondary focus:outline-none"
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? "Validando..." : "Salvar chave"}
        </button>
        {sumup.configured && sumup.source === "painel" ? (
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => {
              if (window.confirm("Remover a API key da SumUp?")) mutation.mutate("");
            }}
            className="rounded-full border border-red-100 px-4 py-2.5 text-sm font-semibold text-red-400 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
          >
            Remover
          </button>
        ) : null}
      </form>
    </div>
  );
}

function SumUpReaders() {
  const queryClient = useQueryClient();
  const [pairing, setPairing] = useState({ pairingCode: "", name: "" });

  const {
    data: readers = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["admin-sumup-readers"],
    queryFn: async () =>
      (await api.get("/admin/settings/payment/sumup/readers")).data?.data ?? [],
    retry: false,
  });

  const pairMutation = useMutation({
    mutationFn: async (payload) =>
      (await api.post("/admin/settings/payment/sumup/readers", payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sumup-readers"] });
      setPairing({ pairingCode: "", name: "" });
      toast.success("Maquininha pareada. Confirme no aparelho se ele pedir.");
    },
    onError: (err) => toast.error(errorMessage(err, "Erro ao parear a maquininha.")),
  });

  const handlePair = (event) => {
    event.preventDefault();
    if (!pairing.pairingCode.trim()) {
      return toast.error("Informe o código que aparece na maquininha.");
    }
    pairMutation.mutate({
      pairingCode: pairing.pairingCode.trim(),
      name: pairing.name.trim(),
    });
  };

  const copyId = async (id) => {
    await navigator.clipboard.writeText(id);
    toast.success("ID copiado. Cole no cadastro da mesa ou do totem.");
  };

  return (
    <div className="ui-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">Maquininhas SumUp</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Use o ID da maquininha no campo “ID da maquininha” de cada mesa e
            totem.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="shrink-0 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-400 disabled:opacity-50"
        >
          {isFetching ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-400">Carregando maquininhas...</p>
      ) : null}
      {isError ? (
        <p className="mt-4 text-sm text-red-400">
          {errorMessage(error, "Falha ao consultar a SumUp.")}
        </p>
      ) : null}
      {!isLoading && !isError && !readers.length ? (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
          Nenhuma maquininha pareada ainda.
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {readers.map((reader) => (
          <div
            key={reader.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 p-3"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    reader.connection?.online ? "bg-green-500" : "bg-gray-300"
                  }`}
                  title={reader.connection?.status}
                />
                {reader.name || "Maquininha"}
                {reader.status && reader.status !== "paired" ? (
                  <span className="text-[10px] font-normal text-amber-600">
                    {reader.status}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 break-all font-mono text-[11px] text-gray-500">
                {reader.id}
              </p>
              {reader.deviceIdentifier ? (
                <p className="font-mono text-[10px] text-gray-400">
                  Serial: {reader.deviceIdentifier}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => copyId(reader.id)}
              className="shrink-0 rounded-full bg-gold/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-gold/20"
            >
              Copiar ID
            </button>
          </div>
        ))}
      </div>

      <form
        onSubmit={handlePair}
        className="mt-5 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4"
      >
        <div>
          <p className="text-sm font-semibold text-gray-800">
            Parear nova maquininha
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Na maquininha: Menu → Conexões → conecte no Wi-Fi → API → Conectar.
            Digite aqui o código que aparecer (vale por 5 minutos).
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="Código de pareamento"
            value={pairing.pairingCode}
            onChange={(event) =>
              setPairing((current) => ({
                ...current,
                pairingCode: event.target.value.toUpperCase(),
              }))
            }
            className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white px-3 py-2.5 font-mono text-sm uppercase focus:border-secondary focus:outline-none"
          />
          <input
            type="text"
            maxLength={60}
            placeholder="Nome (ex: Totem 1)"
            value={pairing.name}
            onChange={(event) =>
              setPairing((current) => ({ ...current, name: event.target.value }))
            }
            className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-secondary focus:outline-none"
          />
          <button
            type="submit"
            disabled={pairMutation.isPending}
            className="rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {pairMutation.isPending ? "Pareando..." : "Parear"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AdminPagamentosPage() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ["admin-payment-settings"],
    queryFn: async () =>
      (await api.get("/admin/settings/payment")).data?.data ?? null,
  });

  const providerMutation = useMutation({
    mutationFn: async (provider) =>
      (await api.put("/admin/settings/payment", { provider })).data,
    onSuccess: (_data, provider) => {
      queryClient.invalidateQueries({ queryKey: ["admin-payment-settings"] });
      const name = PROVIDERS.find((item) => item.id === provider)?.name;
      toast.success(`Agora as maquininhas cobram pelo ${name}.`);
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Erro ao trocar o banco.")),
  });

  const selectProvider = (provider) => {
    if (provider.id === settings?.provider) return;
    const ok = window.confirm(
      `Trocar as maquininhas para ${provider.name}?\n\nConfira se o "ID da maquininha" de cada mesa e totem é de uma maquininha ${provider.name}.`,
    );
    if (ok) providerMutation.mutate(provider.id);
  };

  const isConfigured = (id) =>
    id === "SUMUP" ? settings?.sumup?.configured : settings?.mercadoPago?.configured;

  return (
    <main className="min-h-screen text-gray-900">
      <PageHeader
        backTo="/admin"
        backLabel="Painel Admin"
        title="Pagamentos"
        subtitle="Escolha qual banco cobra nas maquininhas das mesas e totens."
      />
      <div className="ui-page max-w-2xl space-y-5">
        {isLoading ? (
          <p className="text-center text-sm text-gray-400">
            Carregando configuração...
          </p>
        ) : null}
        {isError ? (
          <p className="text-center text-sm text-red-400">
            Falha ao carregar a configuração de pagamento.
          </p>
        ) : null}

        {settings ? (
          <>
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Banco em uso
              </h2>
              {PROVIDERS.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  active={settings.provider === provider.id}
                  configured={isConfigured(provider.id)}
                  disabled={providerMutation.isPending}
                  onSelect={() => selectProvider(provider)}
                />
              ))}
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                <p className="font-semibold">O que muda ao trocar</p>
                <p className="mt-1">
                  A troca vale para a cobrança na maquininha (mesa e totem). O
                  Pix pelo QR code na mesa e o pagamento online do delivery
                  continuam pelo Mercado Pago.
                </p>
              </div>
            </section>

            {settings.provider === "MERCADO_PAGO" ? (
              <div className="ui-card p-5">
                <h2 className="font-semibold text-gray-900">Mercado Pago</h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  As credenciais ficam no servidor (MP_ACCESS_TOKEN). O ID da
                  maquininha Point é cadastrado em cada mesa e totem.
                </p>
                {!settings.mercadoPago.configured ? (
                  <p className="mt-3 text-xs font-semibold text-red-500">
                    MP_ACCESS_TOKEN não está definido no servidor.
                  </p>
                ) : null}
              </div>
            ) : null}

            <SumUpCredentials sumup={settings.sumup} />
            {settings.sumup.configured ? <SumUpReaders /> : null}
          </>
        ) : null}
      </div>
    </main>
  );
}

export default AdminPagamentosPage;
