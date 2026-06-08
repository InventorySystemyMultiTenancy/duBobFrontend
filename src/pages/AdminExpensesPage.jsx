import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../lib/api.js";
import { useTranslation } from "../context/I18nContext.jsx";

const todayString = () => new Date().toISOString().slice(0, 10);

const monthStartString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
};

const formatCurrency = (value, locale) =>
  Number(value || 0).toLocaleString(locale || "pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const formatDate = (value, locale) =>
  new Date(value).toLocaleDateString(locale || "pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const emptyForm = () => ({
  name: "",
  category: "",
  amount: "",
  spentAt: todayString(),
  observation: "",
});

export default function AdminExpensesPage() {
  const { locale } = useTranslation();
  const queryClient = useQueryClient();
  const [from, setFrom] = useState(monthStartString);
  const [to, setTo] = useState(todayString);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-expenses", from, to],
    queryFn: async () => {
      const response = await api.get("/admin/expenses", {
        params: { from, to },
      });
      return response.data?.data;
    },
  });

  const expenses = data?.expenses ?? [];
  const summary = data?.summary ?? { total: 0, count: 0, categories: [] };
  const categoryOptions = useMemo(
    () => summary.categories.map((category) => category.name),
    [summary.categories],
  );

  const createExpense = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/admin/expenses", payload);
      return response.data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sales-analytics"] });
      setForm(emptyForm());
      toast.success("Gasto lancado!");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ??
          err?.response?.data?.error?.message ??
          "Nao foi possivel lancar o gasto.",
      );
    },
  });

  const onSubmit = (event) => {
    event.preventDefault();
    createExpense.mutate({
      name: form.name.trim(),
      category: form.category.trim(),
      amount: Number(form.amount),
      spentAt: form.spentAt,
      observation: form.observation.trim() || undefined,
    });
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 font-body text-primary sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-primary">Gastos</h1>
          <p className="mt-1 text-sm text-smoke">
            Lancamentos que descontam direto do lucro no relatorio.
          </p>
        </div>
        <Link
          to="/admin"
          className="rounded-xl border border-border-soft bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:border-secondary/40"
        >
          &larr; Admin
        </Link>
      </header>

      <section className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-border-soft bg-white p-5 shadow-card"
        >
          <h2 className="font-display text-xl text-primary">Novo gasto</h2>
          <div className="mt-4 grid gap-3">
            <label className="text-sm font-semibold text-primary">
              Nome
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
                className="mt-1 w-full rounded-2xl border border-border-soft bg-accent/35 px-4 py-3 text-sm outline-none transition focus:border-secondary/50"
                placeholder="Ex: Compra de refrigerante"
              />
            </label>

            <label className="text-sm font-semibold text-primary">
              Categoria
              <input
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    category: event.target.value,
                  }))
                }
                list="expense-categories"
                required
                className="mt-1 w-full rounded-2xl border border-border-soft bg-accent/35 px-4 py-3 text-sm outline-none transition focus:border-secondary/50"
                placeholder="Ex: Insumos, aluguel, energia"
              />
              <datalist id="expense-categories">
                {categoryOptions.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-primary">
                Valor
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      amount: event.target.value,
                    }))
                  }
                  required
                  className="mt-1 w-full rounded-2xl border border-border-soft bg-accent/35 px-4 py-3 text-sm outline-none transition focus:border-secondary/50"
                  placeholder="0,00"
                />
              </label>

              <label className="text-sm font-semibold text-primary">
                Data
                <input
                  type="date"
                  value={form.spentAt}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      spentAt: event.target.value,
                    }))
                  }
                  required
                  className="mt-1 w-full rounded-2xl border border-border-soft bg-accent/35 px-4 py-3 text-sm outline-none transition focus:border-secondary/50"
                />
              </label>
            </div>

            <label className="text-sm font-semibold text-primary">
              Observacao
              <textarea
                value={form.observation}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    observation: event.target.value,
                  }))
                }
                rows={3}
                className="mt-1 w-full resize-none rounded-2xl border border-border-soft bg-accent/35 px-4 py-3 text-sm outline-none transition focus:border-secondary/50"
                placeholder="Detalhes opcionais do lancamento"
              />
            </label>

            <button
              type="submit"
              disabled={createExpense.isPending}
              className="rounded-2xl bg-secondary px-4 py-3 text-sm font-bold text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createExpense.isPending ? "Salvando..." : "Adicionar gasto"}
            </button>
          </div>
        </form>

        <section className="rounded-3xl border border-border-soft bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl text-primary">
                Historico de lancamentos
              </h2>
              <p className="mt-1 text-sm text-smoke">
                {summary.count} registro(s) no periodo
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-smoke">
                Total
              </p>
              <p className="font-display text-2xl text-red-600">
                {formatCurrency(summary.total, locale)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-smoke">
              De
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="mt-1 w-full rounded-xl border border-border-soft bg-accent/35 px-3 py-2 text-sm text-primary outline-none focus:border-secondary/50"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-widest text-smoke">
              Ate
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="mt-1 w-full rounded-xl border border-border-soft bg-accent/35 px-3 py-2 text-sm text-primary outline-none focus:border-secondary/50"
              />
            </label>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-border-soft">
            {isLoading ? (
              <p className="p-4 text-sm text-smoke">Carregando gastos...</p>
            ) : isError ? (
              <p className="p-4 text-sm text-red-600">
                Nao foi possivel carregar os gastos.
              </p>
            ) : expenses.length === 0 ? (
              <p className="p-4 text-sm text-smoke">
                Nenhum gasto encontrado nesse periodo.
              </p>
            ) : (
              <div className="max-h-[520px] overflow-y-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="sticky top-0 bg-accent text-xs uppercase tracking-widest text-smoke">
                    <tr>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="align-top">
                        <td className="px-4 py-3 text-smoke">
                          {formatDate(expense.spentAt, locale)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-primary">
                            {expense.name}
                          </p>
                          {expense.observation ? (
                            <p className="mt-1 max-w-xs text-xs text-smoke">
                              {expense.observation}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600">
                          {formatCurrency(expense.amount, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
