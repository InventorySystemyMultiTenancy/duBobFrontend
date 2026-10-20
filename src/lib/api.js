import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pc_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Sessão vencida (o cliente expira em 7 dias; a mesa em 12 h): limpa o login
// e manda para a tela certa em vez de deixar a página quebrada.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const sentToken = Boolean(error.config?.headers?.Authorization);
    const isAuthRoute = String(error.config?.url ?? "").startsWith("/auth/");

    if (error.response?.status === 401 && sentToken && !isAuthRoute) {
      let role = null;
      try {
        role = JSON.parse(localStorage.getItem("pc_user") ?? "null")?.role;
      } catch {
        role = null;
      }
      localStorage.removeItem("pc_token");
      localStorage.removeItem("pc_user");

      if (localStorage.getItem("pc_totem_mode") !== "true") {
        const { pathname } = window.location;
        window.location.assign(
          role === "MESA"
            ? "/"
            : `/login?expirou=1&redirect=${encodeURIComponent(pathname)}`,
        );
      }
    }

    return Promise.reject(error);
  },
);

export { api };
