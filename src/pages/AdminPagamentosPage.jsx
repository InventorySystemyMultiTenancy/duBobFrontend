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
  },
  {
    id: "SUMUP",
    name: "SumUp",
    logo: "SU",
    logoClass: "bg-gray-900 text-white",
  },
];

// Cada canal tem o seu banco: dá para usar SumUp na loja e Mercado Pago no
// delivery, ou o contrário.
const CHANNELS = [
  {
    key: "terminalProvider",
    title: "Maquininha — totem, mesa e caixa",
    descriptions: {
      MERCADO_PAGO: "Cobrança enviada para a maquininha Point.",
      SUMUP:
        "Cobrança enviada para a maquininha SumUp pareada (ou valor digitado nela). O sistema confirma consultando a venda, sem webhook.",
    },
    confirm: (name) =>
      `Trocar as maquininhas (totem, mesa e caixa) para ${name}?\n\nConfira se o "ID da maquininha" de cada mesa e totem é de uma maquininha ${name}.`,
    success: (name) => `Agora as maquininhas cobram pelo ${name}.`,
  },
  {
    key: "onlineProvider",
    title: "Pagamento online — delivery",
    descriptions: {
      MERCADO_PAGO: "Página do Mercado Pago com Pix, crédito e débito.",
      SUMUP:
        "Pix com QR code na própria tela e cartão na página da SumUp. O Pix online precisa estar ativo na conta SumUp.",
    },
    confirm: (name) => `Trocar o pagamento online do delivery para ${name}?`,
    success: (name) => `Agora o delivery cobra pelo ${name}.`,
  },
];

const errorMessage = (error, fallback) =>
  error?.response?.data?.error?.message || fallback;

function ProviderCard({ provider, description, active, configured, onSelect, disabled }) {
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
          {description}
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
      queryClient.invalidateQueries({ queryKey: ["admin-sumup-operators"] });
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

function LoginBox({ login, onClose }) {
  const copy = async (value, label) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="font-display text-xl text-gray-900">
          Login da maquininha {login.name}
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Na maquininha SumUp, saia da conta atual e entre com este usuário.
          Cada maquininha precisa de um usuário diferente.
        </p>
        <div className="mt-4 space-y-2">
          {[
            ["Usuário", login.email],
            ["Senha", login.password],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-3"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase text-gray-400">
                  {label}
                </p>
                <p className="break-all font-mono text-sm text-gray-900">{value}</p>
              </div>
              <button
                type="button"
                onClick={() => copy(value, label)}
                className="shrink-0 rounded-full bg-gold/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-gold/20"
              >
                Copiar
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-full border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:border-gray-400"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

// Pareamento do reader: com ele o totem/caixa manda a cobrança direto para a
// tela da maquininha; sem ele o cliente digita o valor nela.
// Readers conectados à conta SumUp (Cloud API).
function useAccountReaders(enabled = true) {
  return useQuery({
    queryKey: ["admin-sumup-readers"],
    queryFn: async () =>
      (await api.get("/admin/settings/payment/sumup/readers")).data?.data ?? [],
    enabled,
    retry: false,
  });
}

// Lista o que está pareado na conta e permite esquecer uma maquininha
// (por exemplo, a que "conecta sozinha" sem mostrar código).
function SumUpAccountReaders() {
  const queryClient = useQueryClient();
  const { data: operators = [] } = useQuery({
    queryKey: ["admin-sumup-operators"],
    queryFn: async () =>
      (await api.get("/admin/settings/payment/sumup/operators")).data?.data ?? [],
  });
  const { data: readers = [], isLoading, isError, error, refetch, isFetching } =
    useAccountReaders();

  const forgetMutation = useMutation({
    mutationFn: (readerId) =>
      api.delete(`/admin/settings/payment/sumup/readers/${readerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sumup-readers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sumup-operators"] });
      toast.success(
        "Esquecida na conta. Agora no aparelho: Menu → Conexões → API → Desconectar.",
        { duration: 8000 },
      );
    },
    onError: (err) => toast.error(errorMessage(err, "Erro ao esquecer a maquininha.")),
  });

  const handleForget = (reader) => {
    const ok = window.confirm(
      `Esquecer "${reader.name || reader.id}" na conta SumUp?\n\nDepois desconecte no aparelho: Menu → Conexões → API → Desconectar.`,
    );
    if (ok) forgetMutation.mutate(reader.id);
  };

  return (
    <div className="ui-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">
            Maquininhas conectadas na conta
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Tudo que está pareado na Cloud API desta conta SumUp. Se a
            maquininha conecta sem mostrar código e não aparece aqui, ela está
            pareada em outra conta SumUp: esqueça por lá e desconecte no
            aparelho.
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
        <p className="mt-4 text-sm text-gray-400">Consultando a SumUp...</p>
      ) : null}
      {isError ? (
        <p className="mt-4 text-sm text-red-400">
          {errorMessage(error, "Falha ao consultar a SumUp.")}
        </p>
      ) : null}
      {!isLoading && !isError && !readers.length ? (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
          Nenhuma maquininha pareada nesta conta.
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {readers.map((reader) => {
          const linked = operators.find((item) => item.readerId === reader.id);
          return (
            <div
              key={reader.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {reader.name || "Maquininha"}
                  {reader.status ? (
                    <span className="ml-2 text-[10px] font-normal text-gray-400">
                      {reader.status}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 break-all font-mono text-[11px] text-gray-500">
                  {reader.id}
                  {reader.serial ? ` · serial ${reader.serial}` : ""}
                </p>
                <p className="text-[11px] text-gray-500">
                  {linked ? `Usada por: ${linked.name}` : "Não vinculada a nenhuma maquininha"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleForget(reader)}
                disabled={forgetMutation.isPending}
                className="shrink-0 rounded-full border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-400 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
              >
                Esquecer
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReaderPairing({ operator }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const url = `/admin/settings/payment/sumup/operators/${operator.id}/reader`;

  const onDone = (message) => {
    queryClient.invalidateQueries({ queryKey: ["admin-sumup-operators"] });
    setCode("");
    setOpen(false);
    toast.success(message);
  };

  const { data: accountReaders = [] } = useAccountReaders(open);

  const pairMutation = useMutation({
    mutationFn: (payload) => api.post(url, payload),
    onSuccess: () => onDone("Maquininha pareada. A cobrança agora vai direto para ela."),
    onError: (err) => toast.error(errorMessage(err, "Erro ao parear a maquininha.")),
  });

  const unpairMutation = useMutation({
    mutationFn: () => api.delete(url),
    onSuccess: () => onDone("Pareamento removido."),
    onError: (err) => toast.error(errorMessage(err, "Erro ao remover o pareamento.")),
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!code.trim()) return toast.error("Digite o código que aparece na maquininha.");
    pairMutation.mutate({ pairingCode: code.trim() });
  };

  if (operator.readerId && !open) {
    return (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-green-50 px-3 py-2">
        <p className="text-[11px] text-green-700">
          ✓ Cobrança enviada direto para a maquininha
          <span className="ml-1 font-mono text-green-600/70">{operator.readerId}</span>
        </p>
        <span className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[11px] font-semibold text-green-700 underline"
          >
            Parear de novo
          </button>
          <button
            type="button"
            disabled={unpairMutation.isPending}
            onClick={() => {
              if (window.confirm("Remover o pareamento? O cliente passará a digitar o valor na maquininha.")) {
                unpairMutation.mutate();
              }
            }}
            className="text-[11px] font-semibold text-red-400 underline disabled:opacity-50"
          >
            Remover
          </button>
        </span>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2">
        <p className="text-[11px] text-amber-700">
          Sem pareamento: o cliente digita o valor na maquininha.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[11px] font-semibold text-amber-800 underline"
        >
          Parear para enviar a cobrança
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-xl bg-gray-50 p-3">
      {accountReaders.length ? (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-gray-700">
            Já está conectada à conta? Escolha:
          </p>
          <div className="flex flex-wrap gap-2">
            {accountReaders.map((reader) => (
              <button
                key={reader.id}
                type="button"
                disabled={pairMutation.isPending}
                onClick={() => pairMutation.mutate({ readerId: reader.id })}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-left text-[11px] font-semibold text-gray-700 hover:border-secondary disabled:opacity-50"
              >
                {reader.name || "Maquininha"}
                {reader.serial ? (
                  <span className="ml-1 font-mono font-normal text-gray-400">
                    {reader.serial}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <p className="text-[11px] text-gray-600">
        Ou pareie uma nova: com a maquininha deslogada, Menu → Conexões →
        conecte no Wi-Fi → API → Conectar. Digite o código que aparecer (vale 5
        minutos). Se ela conectar sem mostrar código, já está pareada em alguma
        conta: veja em “Maquininhas conectadas na conta” abaixo.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          autoFocus
          placeholder="Código de pareamento"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white px-3 py-2 font-mono text-sm uppercase focus:border-secondary focus:outline-none"
        />
        <button
          type="submit"
          disabled={pairMutation.isPending}
          className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {pairMutation.isPending ? "Pareando..." : "Parear"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-400"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function SumUpOperators() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [login, setLogin] = useState(null);

  const {
    data: operators = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-sumup-operators"],
    queryFn: async () =>
      (await api.get("/admin/settings/payment/sumup/operators")).data?.data ?? [],
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-sumup-operators"] });

  const createMutation = useMutation({
    mutationFn: async (payload) =>
      (await api.post("/admin/settings/payment/sumup/operators", payload)).data
        ?.data,
    onSuccess: (operator) => {
      invalidate();
      setName("");
      setLogin(operator);
    },
    onError: (err) => toast.error(errorMessage(err, "Erro ao criar a maquininha.")),
  });

  const loginMutation = useMutation({
    mutationFn: async (operator) => {
      const response = await api.get(
        `/admin/settings/payment/sumup/operators/${operator.id}/login`,
      );
      return { name: operator.name, ...response.data?.data };
    },
    onSuccess: setLogin,
    onError: (err) => toast.error(errorMessage(err, "Erro ao buscar o login.")),
  });

  const deleteMutation = useMutation({
    mutationFn: (operator) =>
      api.delete(`/admin/settings/payment/sumup/operators/${operator.id}`),
    onSuccess: () => {
      invalidate();
      toast.success("Maquininha removida.");
    },
    onError: (err) => toast.error(errorMessage(err, "Erro ao remover.")),
  });

  const handleCreate = (event) => {
    event.preventDefault();
    if (!name.trim()) return toast.error("Dê um nome para a maquininha.");
    createMutation.mutate({ name: name.trim() });
  };

  const handleDelete = (operator) => {
    const ok = window.confirm(
      `Remover "${operator.name}"? O usuário continua na conta SumUp.`,
    );
    if (ok) deleteMutation.mutate(operator);
  };

  const copyEmail = async (email) => {
    await navigator.clipboard.writeText(email);
    toast.success("Usuário copiado. Cole no “ID da maquininha” da mesa ou do totem.");
  };

  return (
    <div className="ui-card p-5">
      <h2 className="font-semibold text-gray-900">Maquininhas SumUp</h2>
      <p className="mt-0.5 text-xs text-gray-500">
        Cada maquininha fica logada com um usuário SumUp próprio. É por ele que
        o sistema sabe de qual maquininha veio cada venda (cartão ou Pix). Cole
        o usuário no campo “ID da maquininha” da mesa ou do totem.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-400">Carregando maquininhas...</p>
      ) : null}
      {isError ? (
        <p className="mt-4 text-sm text-red-400">Falha ao carregar maquininhas.</p>
      ) : null}
      {!isLoading && !isError && !operators.length ? (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
          Nenhuma maquininha criada ainda.
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {operators.map((operator) => (
          <div key={operator.id} className="rounded-2xl border border-gray-200 p-3">
            <p className="text-sm font-semibold text-gray-900">{operator.name}</p>
            <p className="mt-0.5 break-all font-mono text-[11px] text-gray-500">
              {operator.email}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyEmail(operator.email)}
                className="rounded-full bg-gold/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-gold/20"
              >
                Copiar usuário
              </button>
              <button
                type="button"
                onClick={() => loginMutation.mutate(operator)}
                disabled={loginMutation.isPending}
                className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-400 disabled:opacity-50"
              >
                Ver login
              </button>
              <button
                type="button"
                onClick={() => handleDelete(operator)}
                disabled={deleteMutation.isPending}
                className="rounded-full border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-400 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
              >
                Remover
              </button>
            </div>
            <ReaderPairing operator={operator} />
          </div>
        ))}
      </div>

      <form
        onSubmit={handleCreate}
        className="mt-5 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4"
      >
        <div>
          <p className="text-sm font-semibold text-gray-800">Nova maquininha</p>
          <p className="mt-0.5 text-[11px] text-gray-500">
            O sistema cria o usuário na sua conta SumUp e mostra o login para
            entrar na maquininha. A API key precisa da permissão members.write.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            maxLength={60}
            placeholder="Nome (ex: Totem 1)"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-secondary focus:outline-none"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {createMutation.isPending ? "Criando..." : "Criar maquininha"}
          </button>
        </div>
      </form>

      {login ? <LoginBox login={login} onClose={() => setLogin(null)} /> : null}
    </div>
  );
}

function ChannelSection({ channel, settings }) {
  const queryClient = useQueryClient();
  const current = settings[channel.key];

  const mutation = useMutation({
    mutationFn: async (provider) =>
      (await api.put("/admin/settings/payment", { [channel.key]: provider })).data,
    onSuccess: (_data, provider) => {
      queryClient.invalidateQueries({ queryKey: ["admin-payment-settings"] });
      const name = PROVIDERS.find((item) => item.id === provider)?.name;
      toast.success(channel.success(name));
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Erro ao trocar o banco.")),
  });

  const select = (provider) => {
    if (provider.id === current) return;
    if (window.confirm(channel.confirm(provider.name))) mutation.mutate(provider.id);
  };

  const isConfigured = (id) =>
    id === "SUMUP" ? settings.sumup.configured : settings.mercadoPago.configured;

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {channel.title}
      </h2>
      {PROVIDERS.map((provider) => (
        <ProviderCard
          key={provider.id}
          provider={provider}
          description={channel.descriptions[provider.id]}
          active={current === provider.id}
          configured={isConfigured(provider.id)}
          disabled={mutation.isPending}
          onSelect={() => select(provider)}
        />
      ))}
    </section>
  );
}

function AdminPagamentosPage() {
  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ["admin-payment-settings"],
    queryFn: async () =>
      (await api.get("/admin/settings/payment")).data?.data ?? null,
  });

  const usesMercadoPago =
    settings?.terminalProvider === "MERCADO_PAGO" ||
    settings?.onlineProvider === "MERCADO_PAGO";

  return (
    <main className="min-h-screen text-gray-900">
      <PageHeader
        backTo="/admin"
        backLabel="Painel Admin"
        title="Pagamentos"
        subtitle="Escolha o banco da maquininha e o banco do pagamento online."
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
            {CHANNELS.map((channel) => (
              <ChannelSection key={channel.key} channel={channel} settings={settings} />
            ))}

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              <p className="font-semibold">Fica sempre no Mercado Pago</p>
              <p className="mt-1">
                O Pix pelo QR code no tablet da mesa continua no Mercado Pago,
                qualquer que seja o banco escolhido acima.
              </p>
            </div>

            {usesMercadoPago ? (
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
            {settings.sumup.configured ? <SumUpOperators /> : null}
            {settings.sumup.configured ? <SumUpAccountReaders /> : null}
          </>
        ) : null}
      </div>
    </main>
  );
}

export default AdminPagamentosPage;
