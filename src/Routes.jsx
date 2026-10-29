import { Suspense } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { lazyPage } from "./lib/lazyPage.js";
const AdminPanelPage = lazyPage(() => import("./pages/AdminPanelPage.jsx"));
const AdminProductsPage = lazyPage(
  () => import("./pages/AdminProductsPage.jsx"),
);
const AdminProductsHubPage = lazyPage(
  () => import("./pages/AdminProductsHubPage.jsx"),
);
const AtendentePanel = lazyPage(() => import("./pages/AtendentePanel.jsx"));
const AdminOrderHistoryPage = lazyPage(
  () => import("./pages/AdminOrderHistoryPage.jsx"),
);
const AdminUsersPage = lazyPage(() => import("./pages/AdminUsersPage.jsx"));
const AdminMesasPage = lazyPage(() => import("./pages/AdminMesasPage.jsx"));
const AdminTotensPage = lazyPage(() => import("./pages/AdminTotensPage.jsx"));
const AdminPagamentosPage = lazyPage(
  () => import("./pages/AdminPagamentosPage.jsx"),
);
const AdminWhatsappPage = lazyPage(
  () => import("./pages/AdminWhatsappPage.jsx"),
);
const AdminIfoodPage = lazyPage(() => import("./pages/AdminIfoodPage.jsx"));
const AdminPromocoesPage = lazyPage(
  () => import("./pages/AdminPromocoesPage.jsx"),
);
const AdminExpensesPage = lazyPage(
  () => import("./pages/AdminExpensesPage.jsx"),
);
const SalesAnalyticsPage = lazyPage(
  () => import("./pages/SalesAnalyticsPage.jsx"),
);
import CardapioPage from "./pages/CardapioPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import CheckoutReturnPage from "./pages/CheckoutReturnPage.jsx";
import ClientDashboardPage from "./pages/ClientDashboardPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import TotemPage from "./pages/TotemPage.jsx";
const KitchenPage = lazyPage(() => import("./pages/KitchenPage.jsx"));
const TVOrdersPage = lazyPage(() => import("./pages/TVOrdersPage.jsx"));
import LoginPage from "./pages/LoginPage.jsx";
const MotoboyPage = lazyPage(() => import("./pages/MotoboyPage.jsx"));
import MesaAccessPage from "./pages/MesaAccessPage.jsx";
import MesaCheckoutPage from "./pages/MesaCheckoutPage.jsx";
import MesaCardapioPage from "./pages/MesaCardapioPage.jsx";
const AdminMesaCardapioPage = lazyPage(
  () => import("./pages/AdminMesaCardapioPage.jsx"),
);
const ComandasPage = lazyPage(() => import("./pages/ComandasPage.jsx"));
import ComandaSummaryPage from "./pages/ComandaSummaryPage.jsx";
const CaixaPage = lazyPage(() => import("./pages/CaixaPage.jsx"));
const CaixaNovoPedidoPage = lazyPage(
  () => import("./pages/CaixaNovoPedidoPage.jsx"),
);
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

// Painéis da equipe (admin, caixa, cozinha...) só baixam quando abertos, então
// totem e cardápio carregam um arquivo bem menor.
function PageLoading() {
  return <div className="min-h-screen bg-accent" />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoading />}>
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
              allowedRoles={["COZINHA", "ADMIN", "FUNCIONARIO", "ATENDENTE"]}
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
            <PrivateRoute
              allowedRoles={["ADMIN", "FUNCIONARIO", "ATENDENTE"]}
            />
          }
        >
          <Route path="/comandas" element={<ComandasPage />} />
          <Route path="/caixa" element={<CaixaPage />} />
          <Route path="/caixa/novo-pedido" element={<CaixaNovoPedidoPage />} />
        </Route>

        <Route
          element={
            <PrivateRoute
              allowedRoles={["ATENDENTE", "ADMIN", "FUNCIONARIO"]}
            />
          }
        >
          <Route path="/atendente" element={<AtendentePanel />} />
        </Route>

        <Route
          element={<PrivateRoute allowedRoles={["ADMIN", "FUNCIONARIO"]} />}
        >
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
          <Route path="/admin/ifood" element={<AdminIfoodPage />} />
          <Route path="/admin/promocoes" element={<AdminPromocoesPage />} />
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
    </Suspense>
  );
}

export default AppRoutes;
