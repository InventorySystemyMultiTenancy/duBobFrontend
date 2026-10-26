import { Navigate, Route, Routes, useParams } from "react-router-dom";
import AdminPanelPage from "./pages/AdminPanelPage.jsx";
import AdminProductsPage from "./pages/AdminProductsPage.jsx";
import AdminProductsHubPage from "./pages/AdminProductsHubPage.jsx";
import AtendentePanel from "./pages/AtendentePanel.jsx";
import AdminOrderHistoryPage from "./pages/AdminOrderHistoryPage.jsx";
import AdminUsersPage from "./pages/AdminUsersPage.jsx";
import AdminMesasPage from "./pages/AdminMesasPage.jsx";
import AdminTotensPage from "./pages/AdminTotensPage.jsx";
import AdminPagamentosPage from "./pages/AdminPagamentosPage.jsx";
import AdminWhatsappPage from "./pages/AdminWhatsappPage.jsx";
import AdminExpensesPage from "./pages/AdminExpensesPage.jsx";
import SalesAnalyticsPage from "./pages/SalesAnalyticsPage.jsx";
import CardapioPage from "./pages/CardapioPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import CheckoutReturnPage from "./pages/CheckoutReturnPage.jsx";
import ClientDashboardPage from "./pages/ClientDashboardPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import TotemPage from "./pages/TotemPage.jsx";
import KitchenPage from "./pages/KitchenPage.jsx";
import TVOrdersPage from "./pages/TVOrdersPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import MotoboyPage from "./pages/MotoboyPage.jsx";
import MesaAccessPage from "./pages/MesaAccessPage.jsx";
import MesaCheckoutPage from "./pages/MesaCheckoutPage.jsx";
import MesaCardapioPage from "./pages/MesaCardapioPage.jsx";
import AdminMesaCardapioPage from "./pages/AdminMesaCardapioPage.jsx";
import ComandasPage from "./pages/ComandasPage.jsx";
import ComandaSummaryPage from "./pages/ComandaSummaryPage.jsx";
import CaixaPage from "./pages/CaixaPage.jsx";
import CaixaNovoPedidoPage from "./pages/CaixaNovoPedidoPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import PrivateRoute from "./routes/PrivateRoute.jsx";
import { clearTotemMode, TOTEM_SLUG_KEY } from "./lib/totemMode.js";
import { useAuth } from "./hooks/useAuth.js";
import { MESA_MODE_VISUAL } from "./lib/roleHome.js";

function HomeEntry() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("normal") === "1" || params.get("sairTotem") === "1") {
    clearTotemMode();
    return <HomePage />;
  }

  if (localStorage.getItem("pc_totem_mode") === "true") {
    const totemSlug = localStorage.getItem(TOTEM_SLUG_KEY);
    return <Navigate to={totemSlug ? `/${totemSlug}` : "/totem"} replace />;
  }

  return <HomePage />;
}

function ExitTotemEntry() {
  clearTotemMode();
  window.dispatchEvent(new Event("pc_totem_mode_change"));
  window.dispatchEvent(new Event("pc_totem_fullscreen_request_change"));

  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }

  return <Navigate to="/" replace />;
}

// Só /totem1, /totem2... abrem o totem; qualquer outro endereço é 404.
function TotemSlugEntry() {
  const { totemSlug } = useParams();
  if (!/^totem\d+$/i.test(totemSlug ?? "")) {
    return <NotFoundPage />;
  }
  return <TotemPage />;
}

// Mesa que entrou pelo QR "só cardápio" não tem acesso ao cardápio de pedidos.
function CardapioEntry() {
  const { user } = useAuth();
  if (user?.role === "MESA" && user.mesaMode === MESA_MODE_VISUAL) {
    return <Navigate to="/cardapio-mesa" replace />;
  }
  return <CardapioPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/sair-totem" element={<ExitTotemEntry />} />
      <Route path="/normal" element={<ExitTotemEntry />} />
      <Route path="/" element={<HomeEntry />} />
      <Route path="/totem" element={<TotemPage />} />
      <Route path="/cardapio" element={<CardapioEntry />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/checkout/retorno" element={<CheckoutReturnPage />} />

      {/* Acesso de mesa via QR code (público):
          /mesa/:token          → mesa pode fazer pedido (/cardapio)
          /cardapio-mesa/:token → só cardápio visual + chamar garçom */}
      <Route path="/mesa/:token" element={<MesaAccessPage />} />
      <Route
        path="/cardapio-mesa/:token"
        element={<MesaAccessPage visualOnly />}
      />
      <Route path="/comandas/:token" element={<ComandaSummaryPage />} />

      {/* Cardápio somente leitura da mesa e pagamento da conta da mesa */}
      <Route element={<PrivateRoute allowedRoles={["MESA"]} />}>
        <Route path="/cardapio-mesa" element={<MesaCardapioPage />} />
        <Route path="/mesa/checkout" element={<MesaCheckoutPage />} />
      </Route>

      <Route
        element={
          // Mesmos perfis que a API aceita em POST /api/orders
          <PrivateRoute allowedRoles={["CLIENTE", "ADMIN"]} />
        }
      >
        <Route path="/checkout" element={<CheckoutPage />} />
      </Route>

      <Route element={<PrivateRoute allowedRoles={["CLIENTE"]} />}>
        <Route path="/dashboard" element={<ClientDashboardPage />} />
      </Route>

      <Route
        element={
          <PrivateRoute
            allowedRoles={[
              "COZINHA",
              "ADMIN",
              "FUNCIONARIO",
              "ATENDENTE",
            ]}
          />
        }
      >
        <Route path="/cozinha" element={<KitchenPage />} />
      </Route>

      <Route
        element={
          <PrivateRoute
            allowedRoles={["COZINHA_DELIVERY", "ADMIN", "FUNCIONARIO"]}
          />
        }
      >
        <Route path="/cozinha-delivery" element={<KitchenPage />} />
      </Route>

      <Route
        element={
          <PrivateRoute allowedRoles={["TV", "ADMIN", "FUNCIONARIO"]} />
        }
      >
        <Route path="/tv" element={<TVOrdersPage />} />
      </Route>

      <Route
        element={
          <PrivateRoute allowedRoles={["ADMIN", "FUNCIONARIO", "ATENDENTE"]} />
        }
      >
        <Route path="/comandas" element={<ComandasPage />} />
        <Route path="/caixa" element={<CaixaPage />} />
        <Route path="/caixa/novo-pedido" element={<CaixaNovoPedidoPage />} />
      </Route>

      <Route
        element={
          <PrivateRoute allowedRoles={["ATENDENTE", "ADMIN", "FUNCIONARIO"]} />
        }
      >
        <Route path="/atendente" element={<AtendentePanel />} />
      </Route>

      <Route element={<PrivateRoute allowedRoles={["ADMIN", "FUNCIONARIO"]} />}>
        <Route path="/admin" element={<AdminPanelPage />} />
        <Route path="/admin/vendas" element={<SalesAnalyticsPage />} />
        <Route path="/admin/gastos" element={<AdminExpensesPage />} />
        <Route path="/admin/historico" element={<AdminOrderHistoryPage />} />
      </Route>

      {/* Cadastros: a API só aceita ADMIN */}
      <Route element={<PrivateRoute allowedRoles={["ADMIN"]} />}>
        <Route path="/admin/produtos" element={<AdminProductsHubPage />} />
        <Route path="/admin/produtos/lista" element={<AdminProductsPage />} />
        <Route path="/admin/usuarios" element={<AdminUsersPage />} />
        <Route path="/admin/mesas" element={<AdminMesasPage />} />
        <Route path="/admin/totens" element={<AdminTotensPage />} />
        <Route path="/admin/pagamentos" element={<AdminPagamentosPage />} />
        <Route path="/admin/whatsapp" element={<AdminWhatsappPage />} />
        <Route
          path="/admin/cardapio-mesa"
          element={<AdminMesaCardapioPage />}
        />
      </Route>

      <Route
        element={
          <PrivateRoute allowedRoles={["MOTOBOY", "ADMIN", "FUNCIONARIO"]} />
        }
      >
        <Route path="/motoboy" element={<MotoboyPage />} />
      </Route>

      <Route path="/:totemSlug" element={<TotemSlugEntry />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
