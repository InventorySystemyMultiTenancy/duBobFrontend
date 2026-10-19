import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { getRoleHome } from "../lib/roleHome.js";

function ForbiddenPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const switchUser = () => {
    logout();
    navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, {
      replace: true,
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-accent/30 px-6 text-center text-gray-900">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
        <img
          src="/LogoDuBob.png"
          alt="Dubob"
          className="mx-auto h-16 w-auto object-contain"
        />
        <h1 className="mt-6 font-display text-2xl font-bold text-rosso">
          Sem permissão
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Você está logado como <strong>{user?.name}</strong> (
          {user?.role}), e esse perfil não pode abrir{" "}
          <strong>{location.pathname}</strong>.
        </p>
        <div className="mt-6 space-y-2">
          <Link
            to={getRoleHome(user)}
            replace
            className="block w-full rounded-xl bg-rosso py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Ir para a minha tela
          </Link>
          <button
            type="button"
            onClick={switchUser}
            className="w-full rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:border-gray-400"
          >
            Sair e entrar com outro usuário
          </button>
        </div>
      </div>
    </main>
  );
}

export default ForbiddenPage;
