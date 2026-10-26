import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api.js";

// Ações do iFood no card da cozinha: pedido agendado, pedido de cancelamento
// do cliente (aceitar/recusar) e cancelar pela loja com um motivo do iFood.
const errorMessage = (error, fallback) =>
  error?.response?.data?.error?.message ?? error?.response?.data?.message ?? fallback;

const formatDateTime = (value) =>
  new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatTime = (value) =>
  new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const DISPUTE_LABELS = {
  CANCELLATION: "O cliente pediu para cancelar o pedido",
  PARTIAL_CANCELLATION: "O cliente pediu para cancelar parte do pedido",
  PROPOSED_AMOUNT_REFUND: "O cliente pediu reembolso de parte do valor",
};

export default function IfoodOrderPanel({ order, canCancel = false, largeMode = false }) {
  const queryClient = useQueryClient();
  const meta = order.externalPayload ?? {};
  const disputa = meta.disputa;
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelCode, setCancelCode] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });

  const motivos = useQuery({
    queryKey: ["ifood-cancel-reasons", order.id],
    queryFn: async () =>
      (await api.get(`/ifood/orders/${order.id}/motivos-cancelamento`)).data?.data ?? [],
    enabled: cancelOpen,
    staleTime: 30_000,
  });

  const responder = useMutation({
    mutationFn: async (payload) =>
      (await api.post(`/ifood/orders/${order.id}/disputa`, payload)).data?.data,
    onSuccess: (_data, payload) => {
      toast.success(payload.aceitar ? "Cancelamento aceito." : "Cancelamento recusado.");
      setRejecting(false);
      setRejectReason("");
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível responder ao iFood.")),
  });

  const cancelar = useMutation({
    mutationFn: async () => {
      const motivo = motivos.data?.find((m) => m.codigo === cancelCode)?.descricao;
      return (await api.post(`/ifood/orders/${order.id}/cancelar`, { codigo: cancelCode, motivo }))
        .data?.data;
    },
    onSuccess: () => {
      toast.success("Cancelamento enviado ao iFood.");
      setCancelOpen(false);
      setCancelCode("");
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, "Não foi possível cancelar no iFood.")),
  });

  const text = largeMode ? "text-lg" : "text-base";

  return (
    <>
      {meta.agendadoPara && (
        <p className={`mt-3 rounded-xl bg-amber-100 px-3 py-2 font-extrabold text-amber-900 ${text}`}>
          📅 Agendado p/ {formatDateTime(meta.agendadoPara)}
        </p>
      )}

      {disputa && (
        <div className="mt-3 rounded-2xl border-2 border-red-400 bg-red-50 p-3">
          <p className={`font-extrabold text-red-800 ${text}`}>
            ⚠ {DISPUTE_LABELS[disputa.acao] ?? "O cliente pediu cancelamento"}
          </p>
          {disputa.mensagem && <p className="mt-1 text-sm text-red-800">“{disputa.mensagem}”</p>}
          {disputa.expiraEm && (
            <p className="mt-1 text-xs font-bold text-red-700">
              Responda até {formatTime(disputa.expiraEm)}
              {disputa.aoExpirar === "ACCEPT_CANCELLATION" ? " — sem resposta, o iFood cancela." : "."}
            </p>
          )}
          {rejecting ? (
            <div className="mt-2 space-y-2">
              <input
                className="ui-input"
                placeholder="Motivo da recusa (ex.: pedido já saiu para entrega)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!rejectReason.trim() || responder.isPending}
                  onClick={() => responder.mutate({ aceitar: false, motivo: rejectReason })}
                  className="ui-btn ui-btn-sm ui-btn-danger flex-1"
                >
                  Recusar
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting(false)}
                  className="ui-btn ui-btn-sm ui-btn-outline"
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={responder.isPending}
                onClick={() => responder.mutate({ aceitar: true })}
                className="ui-btn ui-btn-sm ui-btn-danger flex-1"
              >
                Aceitar cancelamento
              </button>
              <button
                type="button"
                disabled={responder.isPending}
                onClick={() => setRejecting(true)}
                className="ui-btn ui-btn-sm ui-btn-outline flex-1"
              >
                Recusar
              </button>
            </div>
          )}
        </div>
      )}

      {meta.cancelamento && (
        <p className="mt-3 rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700">
          ⏳ Cancelamento enviado ao iFood, aguardando confirmação...
        </p>
      )}
      {meta.cancelamentoFalhou && (
        <p className="mt-3 rounded-xl bg-red-100 px-3 py-2 text-sm font-bold text-red-700">
          ⚠ {meta.cancelamentoFalhou}
        </p>
      )}

      {canCancel &&
        !meta.cancelamento &&
        (cancelOpen ? (
          <div className="mt-3 space-y-2 rounded-2xl bg-red-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-red-700">
              Motivo do cancelamento (iFood)
            </p>
            {motivos.isLoading ? (
              <p className="text-sm text-red-700">Carregando motivos...</p>
            ) : motivos.isError ? (
              <p className="text-sm font-bold text-red-700">
                {errorMessage(motivos.error, "Não foi possível buscar os motivos.")}
              </p>
            ) : motivos.data?.length ? (
              <select
                className="ui-input py-2"
                value={cancelCode}
                onChange={(e) => setCancelCode(e.target.value)}
              >
                <option value="">Escolha o motivo...</option>
                {motivos.data.map((m) => (
                  <option key={m.codigo} value={m.codigo}>
                    {m.descricao}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm font-bold text-red-700">
                O iFood não permite cancelar esse pedido agora.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!cancelCode || cancelar.isPending}
                onClick={() => cancelar.mutate()}
                className="ui-btn ui-btn-sm ui-btn-danger flex-1"
              >
                {cancelar.isPending ? "..." : "Cancelar no iFood"}
              </button>
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                className="ui-btn ui-btn-sm ui-btn-outline"
              >
                Voltar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="mt-2 w-full py-1.5 text-xs font-bold text-red-500 transition hover:text-red-700"
          >
            Cancelar pedido
          </button>
        ))}
    </>
  );
}
