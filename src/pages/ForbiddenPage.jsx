import { Link, useLocation, useNavigate } from "react-router-dom";
import StatusLayout from "../components/StatusLayout.jsx";
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
    <StatusLayout>
      <div>
        <img
          src="/LogoDuBob.png"
          alt="Dubob"
          className="mx-auto h-16 w-auto object-contain"
        />
        <h1 className="mt-6 font-display text-3xl font-bold text-primary">
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
            className="ui-btn ui-btn-primary ui-btn-lg w-full"
          >
            Ir para a minha tela
          </Link>
          <button
            type="button"
            onClick={switchUser}
            className="ui-btn ui-btn-outline w-full"
          >
            Sair e entrar com outro usuário
          </button>
        </div>
      </div>
    </StatusLayout>
  );
}

export default ForbiddenPage;
