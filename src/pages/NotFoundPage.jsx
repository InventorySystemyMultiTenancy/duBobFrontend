import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-accent/30 px-6 text-center text-gray-900">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <img
          src="/LogoDuBob.png"
          alt="Dubob"
          className="mx-auto h-16 w-auto object-contain"
        />
        <p className="mt-6 text-5xl font-black text-rosso">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold">
          Página não encontrada
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Confira o endereço digitado.
        </p>
        <Link
          to="/"
          replace
          className="mt-6 block w-full rounded-xl bg-rosso py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Voltar para o início
        </Link>
      </div>
    </main>
  );
}

export default NotFoundPage;
