import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { api } from "../lib/api.js";
import { useTranslation } from "../context/I18nContext.jsx";
import { getPostLoginPath } from "../lib/roleHome.js";

const INPUT_CLS =
  "ui-input py-4";

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || null;
  const sessionExpired = searchParams.get("expirou") === "1";
  const { login } = useAuth();
  const { t } = useTranslation();

  const [tab, setTab] = useState("login");
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    cpf: "",
    email: "",
    phone: "",
    password: "",
    address: "",
  });

  const handlePostAuth = (data) => {
    login(data);
    toast.success(tab === "login" ? "Login realizado!" : "Conta criada!");
    navigate(getPostLoginPath(data.user, redirectTo));
  };

  const loginMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/auth/login", payload);
      return response.data?.data;
    },
    onSuccess: handlePostAuth,
    onError: () => toast.error("Credenciais inválidas"),
  });

  const registerMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/auth/register", payload);
      return response.data?.data;
    },
    onSuccess: handlePostAuth,
    onError: (err) => {
      const msg = err.response?.data?.message || "Erro ao criar conta";
      toast.error(msg);
    },
  });

  const onLoginSubmit = (e) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const onRegisterSubmit = (e) => {
    e.preventDefault();
    const { name, cpf, email, phone, password, address } = registerForm;
    if (!email && !phone) {
      toast.error("Informe email ou telefone");
      return;
    }
    registerMutation.mutate({
      name,
      cpf: cpf || undefined,
      email: email || undefined,
      phone: phone || undefined,
      password,
      address: address || undefined,
    });
  };

  return (
    <main className="flex min-h-screen bg-white text-gray-900">
      {/* Left — hero */}
      <div className="relative hidden overflow-hidden bg-primary lg:flex lg:w-1/2">
        <img
          src="/home/hero.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/70 to-primary/30" />
        <div className="relative flex w-full flex-col justify-end gap-4 p-12 text-white">
          <img
            src="/LogoDuBob.png"
            alt="Dubob Açaí e Milkshake"
            className="h-20 w-20 rounded-2xl object-contain shadow-2xl"
          />
          <p className="font-display text-5xl font-bold leading-tight">
            {t("LOGIN_TAGLINE_H", "Sabor que marca presença!")}
          </p>
          <p className="max-w-md text-lg text-white/80">
            Entre para acompanhar seus pedidos e pedir de novo com um toque.
          </p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="mb-6 flex justify-center lg:hidden">
            <img
              src="/LogoDuBob.png"
              alt="Dubob Acai e Milkshake"
              className="h-20 w-auto object-contain"
            />
          </div>

          {/* Tabs */}
          <div className="mb-6 flex rounded-full bg-accent p-1">
            <button
              type="button"
              onClick={() => setTab("login")}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition ${
                tab === "login"
                  ? "bg-white text-primary shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t("LOGIN_ENTER", "Entrar")}
            </button>
            <button
              type="button"
              onClick={() => setTab("register")}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition ${
                tab === "register"
                  ? "bg-white text-primary shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t("LOGIN_CREATE_ACCOUNT", "Criar conta")}
            </button>
          </div>

          {tab === "login" ? (
            <>
              {sessionExpired && (
                <p className="mb-4 rounded-2xl bg-gold/20 px-4 py-3 text-sm font-semibold text-primary">
                  Sua sessão expirou. Entre de novo para continuar.
                </p>
              )}
              <h1 className="font-display text-3xl font-bold text-primary">
                {t("LOGIN_TITLE", "Bem-vindo")}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {t(
                  "LOGIN_SUBTITLE",
                "Entre com email, telefone ou CPF para continuar.",
                )}
              </p>
              <form onSubmit={onLoginSubmit} className="mt-6 space-y-4">
                <input
                  type="text"
                  required
                  placeholder={t(
                    "LOGIN_PH_IDENTIFIER",
                    "Email, telefone ou CPF",
                  )}
                  value={loginForm.identifier}
                  onChange={(e) =>
                    setLoginForm((p) => ({ ...p, identifier: e.target.value }))
                  }
                  className={INPUT_CLS}
                />
                <input
                  type="password"
                  required
                  placeholder={t("LOGIN_PH_PASSWORD", "Senha")}
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm((p) => ({ ...p, password: e.target.value }))
                  }
                  className={INPUT_CLS}
                />
                <button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="ui-btn ui-btn-primary ui-btn-lg w-full"
                >
                  {loginMutation.isPending
                    ? t("LOGIN_BTN_LOADING", "Entrando...")
                    : t("LOGIN_BTN", "Entrar")}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl font-bold text-primary">
                {t("REG_TITLE", "Criar conta")}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {t("REG_SUBTITLE", "Preencha os dados para se cadastrar.")}
              </p>
              <form onSubmit={onRegisterSubmit} className="mt-6 space-y-4">
                <input
                  type="text"
                  required
                  placeholder={t("REG_PH_NAME", "Nome completo")}
                  value={registerForm.name}
                  onChange={(e) =>
                    setRegisterForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className={INPUT_CLS}
                />
                <input
                  type="text"
                  required
                  placeholder="CPF (000.000.000-00)"
                  value={registerForm.cpf}
                  onChange={(e) =>
                    setRegisterForm((p) => ({ ...p, cpf: e.target.value }))
                  }
                  className={INPUT_CLS}
                />
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder={t(
                      "REG_PH_EMAIL",
                      "Email (opcional se informar telefone)",
                    )}
                    value={registerForm.email}
                    onChange={(e) =>
                      setRegisterForm((p) => ({ ...p, email: e.target.value }))
                    }
                    className={INPUT_CLS}
                  />
                  <input
                    type="tel"
                    placeholder={t(
                      "REG_PH_PHONE",
                      "Telefone (opcional se informar email)",
                    )}
                    value={registerForm.phone}
                    onChange={(e) =>
                      setRegisterForm((p) => ({ ...p, phone: e.target.value }))
                    }
                    className={INPUT_CLS}
                  />
                  <p className="text-xs text-smoke">
                    {t("REG_NOTE", "* Informe ao menos email ou telefone")}
                  </p>
                </div>
                <input
                  type="password"
                  required
                  placeholder={t(
                    "REG_PH_PASSWORD",
                    "Senha (mínimo 6 caracteres)",
                  )}
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm((p) => ({ ...p, password: e.target.value }))
                  }
                  className={INPUT_CLS}
                />
                <input
                  type="text"
                  required
                  placeholder={t("REG_PH_ADDRESS", "Endereço de entrega")}
                  value={registerForm.address}
                  onChange={(e) =>
                    setRegisterForm((p) => ({ ...p, address: e.target.value }))
                  }
                  className={INPUT_CLS}
                />
                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="ui-btn ui-btn-primary ui-btn-lg w-full"
                >
                  {registerMutation.isPending
                    ? t("REG_BTN_LOADING", "Criando conta...")
                    : t("REG_BTN", "Criar conta")}
                </button>
              </form>
            </>
          )}

          <Link
            to="/"
            className="mt-6 block text-center text-sm text-gray-400 transition hover:text-secondary"
          >
            {t("LOGIN_BACK", "← Voltar para o cardápio")}
          </Link>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;
