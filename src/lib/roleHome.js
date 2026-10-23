// Tela inicial de cada perfil — usada no login, no botão "Painel" e na
// página de "sem permissão".
const ROLE_HOME = {
  ADMIN: "/admin",
  FUNCIONARIO: "/admin",
  ATENDENTE: "/atendente",
  COZINHA: "/cozinha",
  COZINHA_DELIVERY: "/cozinha-delivery",
  TV: "/tv",
  MOTOBOY: "/motoboy",
  CLIENTE: "/cardapio",
};

// Mesa que entrou pelo QR "só cardápio" fica presa no cardápio visual.
export const MESA_MODE_VISUAL = "visual";
export const MESA_MODE_PEDIDO = "pedido";

export function getRoleHome(user) {
  if (user?.role === "MESA") {
    return user.mesaMode === MESA_MODE_VISUAL ? "/cardapio-mesa" : "/cardapio";
  }
  return ROLE_HOME[user?.role] ?? "/";
}

const STAFF_HOMES = [
  ...new Set(
    Object.entries(ROLE_HOME)
      .filter(([role]) => role !== "CLIENTE")
      .map(([, home]) => home),
  ),
];

// Para onde ir depois do login. O "?redirect=" é de quem estava logado antes
// (ex.: cozinha saiu e o admin entrou): painel de outro perfil não vale.
export function getPostLoginPath(user, redirectTo) {
  const home = getRoleHome(user);
  if (!redirectTo) return home;
  const path = redirectTo.split(/[?#]/)[0];
  const otherPanel = STAFF_HOMES.some(
    (staffHome) =>
      staffHome !== home &&
      (path === staffHome || path.startsWith(`${staffHome}/`)),
  );
  return otherPanel ? home : redirectTo;
}
