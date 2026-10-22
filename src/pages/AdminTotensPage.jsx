import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";

import PageHeader from "../components/PageHeader.jsx";
const EMPTY_FORM = {
  name: "",
  number: "",
  terminalId: "",
  sumupOperatorId: "",
  voiceEnabled: false,
};

// Maquininhas SumUp criadas em Admin → Pagamentos.
function useSumUpOperators() {
  return useQuery({
    queryKey: ["admin-sumup-operators"],
    queryFn: async () =>
      (await api.get("/admin/settings/payment/sumup/operators")).data?.data ?? [],
    retry: false,
  });
}

function TotemModal({ totem, onClose }) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(totem);
  const [form, setForm] = useState(
    isEdit
      ? {
          name: totem.name,
          number: String(totem.number),
          terminalId: totem.terminalId ?? "",
          sumupOperatorId: totem.sumupOperatorId ?? "",
          voiceEnabled: Boolean(totem.voiceEnabled),
        }
      : EMPTY_FORM,
  );

  const set = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));
  const { data: sumupOperators = [] } = useSumUpOperators();

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const response = isEdit
        ? await api.put(`/totens/${totem.id}`, payload)
        : await api.post("/totens", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-totens"] });
      toast.success(isEdit ? "Totem atualizado." : "Totem criado.");
      onClose();
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.error?.message || "Erro ao salvar totem.",
      );
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const number = Number.parseInt(form.number, 10);
    if (!form.name.trim()) return toast.error("Informe o nome do totem.");
    if (!number || number < 1) return toast.error("Numero de totem invalido.");

    const payload = {
      name: form.name.trim(),
      number,
      voiceEnabled: form.voiceEnabled,
    };
    if (form.terminalId.trim()) payload.terminalId = form.terminalId.trim();
    else if (isEdit) payload.terminalId = null;
    if (form.sumupOperatorId) payload.sumupOperatorId = form.sumupOperatorId;
    else if (isEdit) payload.sumupOperatorId = null;

    mutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-4 font-display text-xl text-gray-900">
          {isEdit ? "Editar Totem" : "Novo Totem"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Nome do totem *
            </label>
            <input
              type="text"
              required
              maxLength={100}
              placeholder="Ex: Totem Balcao"
              value={form.name}
              onChange={set("name")}
              className="w-full rounded-2xl border border-gray-200 px-3 py-2.5 text-sm focus:border-secondary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Numero do totem *
            </label>
            <input
              type="number"
              required
              min={1}
              max={999}
              placeholder="Ex: 1"
              value={form.number}
              onChange={set("number")}
              className="w-full rounded-2xl border border-gray-200 px-3 py-2.5 text-sm focus:border-secondary focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-gray-400">
              O numero define a rota: numero 1 vira /totem1.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              ID da maquininha (Mercado Pago)
            </label>
            <input
              type="text"
              maxLength={100}
              placeholder="Ex: PAX_A867EC0ED627"
              value={form.terminalId}
              onChange={set("terminalId")}
              className="w-full rounded-2xl border border-gray-200 px-3 py-2.5 font-mono text-sm focus:border-secondary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Maquininha SumUp
            </label>
            <select
              value={form.sumupOperatorId}
              onChange={set("sumupOperatorId")}
              className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-secondary focus:outline-none"
            >
              <option value="">Nenhuma</option>
              {sumupOperators.map((operator) => (
                <option key={operator.id} value={operator.id}>
                  {operator.name}
                  {operator.readerId ? " · cobrança direto na maquininha" : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-gray-400">
              Usada quando o banco da maquininha é a SumUp. As maquininhas são
              criadas em Admin → Pagamentos.
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 p-3">
            <input
              type="checkbox"
              checked={form.voiceEnabled}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  voiceEnabled: event.target.checked,
                }))
              }
              className="mt-0.5 h-5 w-5 accent-secondary"
            />
            <span>
              <span className="block text-sm font-semibold text-gray-800">
                Voz do totem
              </span>
              <span className="block text-[11px] text-gray-500">
                O totem fala as perguntas do pedido (ex.: "Você quer milk shake
                ou açaí?") e lê os tamanhos e preços.
              </span>
            </span>
          </label>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-full bg-secondary py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:border-gray-400"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TotemCard({ totem, onEdit }) {
  const queryClient = useQueryClient();
  const { data: sumupOperators = [] } = useSumUpOperators();
  const sumupOperator = sumupOperators.find(
    (operator) => operator.id === totem.sumupOperatorId,
  );
  const url = `${window.location.origin}/${totem.slug}`;

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/totens/${totem.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-totens"] });
      toast.success("Totem removido.");
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.error?.message || "Erro ao remover totem.",
      );
    },
  });

  const toggleMutation = useMutation({
    mutationFn: () =>
      api.put(`/totens/${totem.id}`, { isActive: !totem.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-totens"] });
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.error?.message || "Erro ao alterar totem.",
      );
    },
  });

  const voiceMutation = useMutation({
    mutationFn: () =>
      api.put(`/totens/${totem.id}`, { voiceEnabled: !totem.voiceEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-totens"] });
      toast.success(totem.voiceEnabled ? "Voz desligada." : "Voz ligada.");
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.error?.message || "Erro ao alterar a voz.",
      );
    },
  });

  const handleDelete = () => {
    if (!window.confirm(`Remover "${totem.name}"?`)) return;
    deleteMutation.mutate();
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado.");
  };

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        totem.isActive
          ? "border-primary/10 bg-white"
          : "border-gray-200 bg-gray-50 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">
            {totem.name}
            {!totem.isActive ? (
              <span className="ml-2 text-xs font-normal text-gray-400">
                inativo
              </span>
            ) : null}
          </p>
          <p className="text-xs text-gray-500">Totem {totem.number}</p>
          <p className="mt-1 break-all font-mono text-[11px] text-gray-500">
            {url}
          </p>
          {totem.terminalId ? (
            <p className="mt-1 font-mono text-[10px] text-gray-400">
              Mercado Pago: {totem.terminalId}
            </p>
          ) : null}
          {totem.sumupOperatorId ? (
            <p className="mt-1 text-[10px] text-gray-400">
              SumUp: {sumupOperator?.name ?? "maquininha removida"}
              {sumupOperator?.readerId ? " · cobrança direto na maquininha" : ""}
            </p>
          ) : null}
          {!totem.terminalId && !totem.sumupOperatorId ? (
            <p className="mt-1 text-[10px] text-amber-500">
              Sem maquininha vinculada
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={copyUrl}
          className="shrink-0 rounded-full bg-gold/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-gold/20"
        >
          Copiar link
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onEdit(totem)}
          className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-400"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => toggleMutation.mutate()}
          disabled={toggleMutation.isPending}
          className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-400 disabled:opacity-50"
        >
          {totem.isActive ? "Desativar" : "Ativar"}
        </button>
        <button
          type="button"
          onClick={() => voiceMutation.mutate()}
          disabled={voiceMutation.isPending}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
            totem.voiceEnabled
              ? "border-secondary/40 bg-secondary/10 text-secondary"
              : "border-gray-200 text-gray-600 hover:border-gray-400"
          }`}
        >
          {totem.voiceEnabled ? "🔊 Voz ligada" : "🔇 Voz desligada"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="rounded-full border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-400 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
        >
          Remover
        </button>
      </div>
    </div>
  );
}

function AdminTotensPage() {
  const [modal, setModal] = useState(null);
  const {
    data: totens = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-totens"],
    queryFn: async () => {
      const response = await api.get("/totens");
      return response.data?.data ?? [];
    },
  });

  return (
    <main className="min-h-screen text-gray-900">
      <PageHeader
        backTo="/admin"
        backLabel="Painel Admin"
        title="Totens"
        subtitle="Cada totem tem seu endereço (/totem1, /totem2...) e sua maquininha."
        actions={
          <button
            type="button"
            onClick={() => setModal({ type: "create" })}
            className="ui-btn ui-btn-accent"
          >
            + Novo totem
          </button>
        }
      />
      <div className="ui-page max-w-2xl">

      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        <p className="font-semibold">Rotas separadas por totem</p>
        <p className="mt-1">
          Cadastre o numero e a maquininha de cada equipamento. O totem 1 usa
          a rota <code className="font-mono">/totem1</code>, o totem 2 usa{" "}
          <code className="font-mono">/totem2</code>.
        </p>
      </div>

      {isLoading ? (
        <p className="text-center text-sm text-gray-400">
          Carregando totens...
        </p>
      ) : null}
      {isError ? (
        <p className="text-center text-sm text-red-400">
          Falha ao carregar totens.
        </p>
      ) : null}

      {!isLoading && !totens.length ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
          Nenhum totem cadastrado ainda.
        </div>
      ) : null}

      <div className="space-y-3">
        {totens.map((totem) => (
          <TotemCard
            key={totem.id}
            totem={totem}
            onEdit={(current) => setModal({ type: "edit", totem: current })}
          />
        ))}
      </div>

      {modal?.type === "create" ? (
        <TotemModal onClose={() => setModal(null)} />
      ) : null}
      {modal?.type === "edit" ? (
        <TotemModal totem={modal.totem} onClose={() => setModal(null)} />
      ) : null}
      </div>
    </main>
  );
}

export default AdminTotensPage;
