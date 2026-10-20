import { Link, useNavigate } from "react-router-dom";

import PageHeader from "../components/PageHeader.jsx";
export default function AdminProductsHubPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-gray-900">
      <PageHeader
        backTo="/admin"
        backLabel="Painel Admin"
        title="Cardápio"
        subtitle="Configure as bases, sabores e complementos usados no fluxo de pedido."
      />
      <div className="ui-page max-w-3xl">
        <div className="grid gap-5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate("/admin/produtos/lista?secao=bases")}
            className="group ui-card flex flex-col items-start gap-3 p-6 text-left transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div>
              <h2 className="font-display text-xl font-semibold text-primary group-hover:text-secondary">
                Fluxo de pedido
              </h2>
              <p className="mt-1 text-sm text-smoke">
                Editar bases de acai e milk shake, sabores, linhas e complementos.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/produtos/lista?secao=all")}
            className="group ui-card flex flex-col items-start gap-3 p-6 text-left transition hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div>
              <h2 className="font-display text-xl font-semibold text-primary group-hover:text-secondary">
                Produtos ativos
              </h2>
              <p className="mt-1 text-sm text-smoke">
                Ativar, desativar ou remover cadastros que aparecem no sistema.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
