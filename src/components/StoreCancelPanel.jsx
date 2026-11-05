import { useState } from "react";

// Recusar/cancelar um pedido do próprio site na cozinha (parecido com o do
// iFood): escolhe o motivo e avisa se o dinheiro volta sozinho ou não.
const MOTIVOS = [
  "Produto em falta",
  "Loja sem tempo de preparo agora",
  "Endereço fora da área de entrega",
  "Pedido duplicado",
  "Cliente pediu para cancelar",
];
const OUTRO = "__outro__";

const PROVEDORES = { MERCADO_PAGO: "Mercado Pago", SUMUP: "SumUp" };

const FORMAS = {
  DINHEIRO: "dinheiro",
  PAGAR_DEPOIS: "pagar depois",
  CREDITO: "cartão de crédito",
  DEBITO: "cartão de débito",
  PIX: "PIX",
  MAQUININHA_TOTEM: "maquininha",
};

const brl = (value) =>
  Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function RefundNotice({ order }) {
  const valor = brl(order.total);
  if (order.estorno?.tipo === "AUTOMATICO") {
    return (
      <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
        💸 Pago online. {valor} volta para o cliente automaticamente
        {PROVEDORES[order.estorno.provedor] ? ` pelo ${PROVEDORES[order.estorno.provedor]}` : ""}.
      </p>
    );
  }
  if (order.paymentStatus === "APROVADO") {
    const forma = FORMAS[order.paymentMethod] ?? "maquininha ou no caixa";
    return (
      <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-900 ring-1 ring-amber-300">
        ⚠ Pago em {forma}: o estorno NÃO é automático. Devolva {valor} ao cliente.
      </p>
    );
  }
  return (
    <p className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700">
      Pedido ainda não pago: não há nada para estornar.
    </p>
  );
}

export default function StoreCancelPanel({
  order,
  recusar = false,
  cancelling = false,
  disabled = false,
  onConfirm,
}) {
  const [open, setOpen] = useState(false);
  const [escolha, setEscolha] = useState("");
  const [outro, setOutro] = useState("");

  const motivo = escolha === OUTRO ? outro.trim() : escolha;
  const acao = recusar ? "Recusar pedido" : "Cancelar pedido";

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled || cancelling}
        onClick={() => setOpen(true)}
        className={
          recusar
            ? "mt-2 w-full rounded-full border-2 border-red-300 py-2.5 text-base font-extrabold text-red-600 transition hover:bg-red-50 disabled:opacity-40"
            : "mt-2 w-full py-1.5 text-xs font-bold text-red-500 transition hover:text-red-700 disabled:opacity-40"
        }
      >
        {cancelling ? "Cancelando..." : acao}
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-2xl bg-red-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-red-700">
        Motivo {recusar ? "da recusa" : "do cancelamento"}
      </p>
      <select
        className="ui-input py-2"
        value={escolha}
        onChange={(e) => setEscolha(e.target.value)}
      >
        <option value="">Escolha o motivo...</option>
        {MOTIVOS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
        <option value={OUTRO}>Outro motivo...</option>
      </select>
      {escolha === OUTRO && (
        <input
          className="ui-input"
          placeholder="Escreva o motivo"
          maxLength={300}
          value={outro}
          onChange={(e) => setOutro(e.target.value)}
        />
      )}
      <RefundNotice order={order} />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!motivo || cancelling}
          onClick={() => onConfirm(motivo)}
          className="ui-btn ui-btn-sm ui-btn-danger flex-1"
        >
          {cancelling ? "..." : acao}
        </button>
        <button
          type="button"
          disabled={cancelling}
          onClick={() => setOpen(false)}
          className="ui-btn ui-btn-sm ui-btn-outline"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}
