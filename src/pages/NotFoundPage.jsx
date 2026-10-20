import { Link } from "react-router-dom";
import StatusLayout from "../components/StatusLayout.jsx";

function NotFoundPage() {
  return (
    <StatusLayout>
      <div>
        <img
          src="/LogoDuBob.png"
          alt="Dubob"
          className="mx-auto h-16 w-auto object-contain"
        />
        <p className="mt-6 font-display text-6xl font-bold text-secondary">404</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-primary">
          Página não encontrada
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Confira o endereço digitado.
        </p>
        <Link
          to="/"
          replace
          className="ui-btn ui-btn-primary ui-btn-lg mt-6 w-full"
        >
          Voltar para o início
        </Link>
      </div>
    </StatusLayout>
  );
}

export default NotFoundPage;
