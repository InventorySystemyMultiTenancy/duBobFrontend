import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { TOTEM_SLUG_KEY } from "../lib/totemMode.js";

function PrivateRoute({ allowedRoles = [] }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    if (localStorage.getItem("pc_totem_mode") === "true") {
      const totemSlug = localStorage.getItem(TOTEM_SLUG_KEY);
      return <Navigate to={totemSlug ? `/${totemSlug}` : "/totem"} replace />;
    }

    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (allowedRoles.length && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default PrivateRoute;
