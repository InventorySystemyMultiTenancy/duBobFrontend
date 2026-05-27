import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useCart } from "../context/CartContext.jsx";
import { api } from "../lib/api.js";
import {
  clearTotemMode,
  TOTEM_ID_KEY,
  TOTEM_FULLSCREEN_REQUESTED_KEY,
  TOTEM_MODE_KEY,
  TOTEM_NAME_KEY,
  TOTEM_SLUG_KEY,
  shouldForceExitTotem,
} from "../lib/totemMode.js";
const IDLE_TIME_MS = 90_000;
const WARNING_TIME = 20;
const ACTIVITY_EVENTS = [
  "click",
  "pointerdown",
  "pointermove",
  "keydown",
  "touchstart",
  "wheel",
];
const INPUT_CLS =
  "w-full rounded-2xl border border-border-soft bg-white px-5 py-5 text-xl font-semibold text-primary outline-none transition placeholder:text-text-muted/60 focus:border-secondary focus:ring-4 focus:ring-secondary/15";
const BUTTON_CLS =
  "w-full rounded-2xl bg-secondary px-6 py-5 text-xl font-black uppercase tracking-wide text-white shadow-card transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60";

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function requestTotemFullscreen() {
  const element = document.documentElement;
  if (!document.fullscreenElement && element.requestFullscreen) {
    return element.requestFullscreen().catch(() => {});
  }
  return Promise.resolve();
}

function TotemPage() {
  const navigate = useNavigate();
  const { totemSlug } = useParams();
  const { login, logout } = useAuth();
  const { clearCart, closeCart } = useCart();
  const [step, setStep] = useState("intro");
  const [totem, setTotem] = useState(null);
  const [totemLoading, setTotemLoading] = useState(Boolean(totemSlug));
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleRemaining, setIdleRemaining] = useState(WARNING_TIME);
  const idleTimerRef = useRef(null);
  const [cpf, setCpf] = useState("");
  const [guestName, setGuestName] = useState("");
  const [registerForm, setRegisterForm] = useState({
    name: "",
    cpf: "",
    email: "",
    phone: "",
    password: "",
    address: "",
  });

  useEffect(() => {
    if (shouldForceExitTotem()) {
      clearTotemMode();
      window.dispatchEvent(new Event("pc_totem_mode_change"));
      window.dispatchEvent(new Event("pc_totem_fullscreen_request_change"));
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      window.location.replace("/");
      return;
    }

    if (!totemSlug) {
      localStorage.removeItem(TOTEM_ID_KEY);
      localStorage.removeItem(TOTEM_SLUG_KEY);
      localStorage.removeItem(TOTEM_NAME_KEY);
    } else if (!/^totem\d+$/i.test(totemSlug)) {
      window.location.replace("/");
      return;
    } else {
      let ignore = false;
      api
        .get(`/totens/slug/${totemSlug.toLowerCase()}`)
        .then((response) => {
          if (ignore) return;
          const currentTotem = response.data?.data;
          setTotem(currentTotem);
          localStorage.setItem(TOTEM_ID_KEY, currentTotem.id);
          localStorage.setItem(TOTEM_SLUG_KEY, currentTotem.slug);
          localStorage.setItem(TOTEM_NAME_KEY, currentTotem.name);
        })
        .catch(() => {
          if (!ignore) window.location.replace("/");
        })
        .finally(() => {
          if (!ignore) setTotemLoading(false);
        });

      localStorage.setItem(TOTEM_MODE_KEY, "true");
      window.dispatchEvent(new Event("pc_totem_mode_change"));
      logout();
      clearCart();
      closeCart();
      return () => {
        ignore = true;
      };
    }

    localStorage.setItem(TOTEM_MODE_KEY, "true");
    window.dispatchEvent(new Event("pc_totem_mode_change"));
    logout();
    clearCart();
    closeCart();
  }, [clearCart, closeCart, logout, totemSlug]);

  useEffect(() => {
    const clearIdleTimer = () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };

    if (step === "intro") {
      clearIdleTimer();
      return undefined;
    }

    const startIdleTimer = () => {
      clearIdleTimer();
      idleTimerRef.current = window.setTimeout(() => {
        setIdleRemaining(WARNING_TIME);
        setShowIdleWarning(true);
      }, IDLE_TIME_MS);
    };

    const handleActivity = () => {
      setShowIdleWarning(false);
      setIdleRemaining(WARNING_TIME);
      startIdleTimer();
    };

    ACTIVITY_EVENTS.forEach((eventName) =>
      window.addEventListener(eventName, handleActivity, { passive: true }),
    );
    startIdleTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) =>
        window.removeEventListener(eventName, handleActivity),
      );
      clearIdleTimer();
    };
  }, [step]);

  useEffect(() => {
    if (!showIdleWarning) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setIdleRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          logout();
          clearCart();
          closeCart();
          setShowIdleWarning(false);
          setStep("intro");
          return WARNING_TIME;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [clearCart, closeCart, logout, showIdleWarning]);

  const enterCardapio = (data, message) => {
    login(data);
    toast.success(message);
    navigate("/cardapio");
  };

  const cpfMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/auth/totem/cpf", payload);
      return response.data?.data;
    },
    onSuccess: (data) => enterCardapio(data, "Cliente encontrado!"),
    onError: (error) => {
      if (error.response?.status === 404) {
        const cleanCpf = onlyDigits(cpf);
        setRegisterForm((current) => ({ ...current, cpf: cleanCpf }));
        setStep("register");
        toast("CPF nao cadastrado. Vamos criar seu cadastro.");
        return;
      }
      toast.error(error.response?.data?.message || "Erro ao buscar CPF.");
    },
  });

  const guestMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/auth/totem/guest", payload);
      return response.data?.data;
    },
    onSuccess: (data) => enterCardapio(data, "Entrada liberada!"),
    onError: (error) =>
      toast.error(error.response?.data?.message || "Erro ao entrar."),
  });

  const registerMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/auth/register", payload);
      return response.data?.data;
    },
    onSuccess: (data) => enterCardapio(data, "Cadastro criado!"),
    onError: (error) =>
      toast.error(error.response?.data?.message || "Erro ao criar cadastro."),
  });

  const handleCpfSubmit = (event) => {
    event.preventDefault();
    const cleanCpf = onlyDigits(cpf);

    if (cleanCpf.length !== 11) {
      toast.error("Informe um CPF com 11 numeros.");
      return;
    }

    cpfMutation.mutate({ cpf: cleanCpf });
  };

  const handleGuestSubmit = (event) => {
    event.preventDefault();

    if (guestName.trim().length < 2) {
      toast.error("Informe seu nome.");
      return;
    }

    guestMutation.mutate({ name: guestName.trim() });
  };

  const handleRegisterSubmit = (event) => {
    event.preventDefault();
    const cleanCpf = onlyDigits(registerForm.cpf);

    if (cleanCpf.length !== 11) {
      toast.error("Informe um CPF com 11 numeros.");
      return;
    }

    if (!registerForm.email && !registerForm.phone) {
      toast.error("Informe email ou telefone.");
      return;
    }

    registerMutation.mutate({
      ...registerForm,
      cpf: cleanCpf,
      email: registerForm.email || undefined,
      phone: registerForm.phone || undefined,
      address: registerForm.address || undefined,
    });
  };

  const handleIntroClick = () => {
    sessionStorage.setItem(TOTEM_FULLSCREEN_REQUESTED_KEY, "true");
    window.dispatchEvent(new Event("pc_totem_fullscreen_request_change"));
    requestTotemFullscreen().finally(() => {
      setStep("identify");
    });
  };

  if (totemLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-primary px-8 text-center text-white">
        <div>
          <img
            src="/LogoDuBob.png"
            alt="Dubob"
            className="mx-auto h-28 w-auto rounded-2xl bg-white/95 p-4 shadow-2xl"
          />
          <p className="mt-6 text-xl font-black uppercase tracking-wide">
            Carregando totem...
          </p>
        </div>
      </main>
    );
  }

  if (step === "intro") {
    return (
      <main
        className="relative min-h-screen cursor-pointer overflow-hidden bg-primary text-white"
        onClick={handleIntroClick}
      >
        <img
          src="/acai.png"
          alt="Dubob"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/totem.mp4"
          poster="/acai.png"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/55 to-secondary/25" />
        <div className="relative flex min-h-screen items-center justify-center p-10 text-center">
          <div>
            <img
              src="/LogoDuBob.png"
              alt="Dubob"
              className="mx-auto h-32 w-auto rounded-2xl bg-white/95 p-4 shadow-2xl"
            />
            <p className="mt-8 text-sm font-black uppercase tracking-[0.32em] text-gold">
              Toque para iniciar
            </p>
            <h1 className="mt-3 text-6xl font-black leading-tight">
              Monte seu pedido
            </h1>
            {totem?.name ? (
              <p className="mt-4 text-xl font-black text-white/85">
                {totem.name}
              </p>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-accent bg-texture px-8 py-10 text-primary">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center">
        <div className="mb-8 text-center">
          <p className="text-sm font-black uppercase tracking-[0.32em] text-secondary">
            {totem?.name ?? "Totem Dubob"}
          </p>
          <h1 className="mt-3 text-5xl font-black">
            {step === "register" ? "Criar cadastro" : "Como voce quer entrar?"}
          </h1>
        </div>

        {step === "identify" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <form
              onSubmit={handleCpfSubmit}
              className="rounded-2xl border border-border-soft bg-white p-6 shadow-card"
            >
              <h2 className="text-3xl font-black">Entrar com CPF</h2>
              <p className="mt-2 text-lg text-text-muted">
                Se ja tiver cadastro, a gente encontra voce pelo CPF.
              </p>
              <div className="mt-6 space-y-4">
                <input
                  className={INPUT_CLS}
                  type="tel"
                  inputMode="numeric"
                  placeholder="Digite seu CPF"
                  value={cpf}
                  onChange={(event) => setCpf(event.target.value)}
                />
                <button
                  className={BUTTON_CLS}
                  type="submit"
                  disabled={cpfMutation.isPending}
                >
                  {cpfMutation.isPending ? "Buscando..." : "Continuar"}
                </button>
              </div>
            </form>

            <form
              onSubmit={handleGuestSubmit}
              className="rounded-2xl border border-border-soft bg-white p-6 shadow-card"
            >
              <h2 className="text-3xl font-black">Entrar sem cadastro</h2>
              <p className="mt-2 text-lg text-text-muted">
                Informe seu nome para seguir mais rapido.
              </p>
              <div className="mt-6 space-y-4">
                <input
                  className={INPUT_CLS}
                  type="text"
                  placeholder="Seu nome"
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                />
                <button
                  className={BUTTON_CLS}
                  type="submit"
                  disabled={guestMutation.isPending}
                >
                  {guestMutation.isPending ? "Entrando..." : "Entrar"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <form
            onSubmit={handleRegisterSubmit}
            className="mx-auto w-full max-w-3xl rounded-2xl border border-border-soft bg-white p-6 shadow-card"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                className={INPUT_CLS}
                type="text"
                required
                placeholder="Nome completo"
                value={registerForm.name}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
              <input
                className={INPUT_CLS}
                type="tel"
                inputMode="numeric"
                required
                placeholder="CPF"
                value={registerForm.cpf}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    cpf: event.target.value,
                  }))
                }
              />
              <input
                className={INPUT_CLS}
                type="email"
                placeholder="Email"
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
              <input
                className={INPUT_CLS}
                type="tel"
                placeholder="Telefone"
                value={registerForm.phone}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
              />
              <input
                className={INPUT_CLS}
                type="password"
                required
                placeholder="Senha"
                value={registerForm.password}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
              />
              <input
                className={INPUT_CLS}
                type="text"
                required
                placeholder="Endereco"
                value={registerForm.address}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setStep("identify")}
                className="w-1/3 rounded-2xl border border-border-soft bg-white px-6 py-5 text-xl font-black text-primary transition hover:border-secondary"
              >
                Voltar
              </button>
              <button
                className={BUTTON_CLS}
                type="submit"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Criando..." : "Criar e entrar"}
              </button>
            </div>
          </form>
        )}
      </section>

      {showIdleWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/85 p-6 text-center text-white backdrop-blur-sm">
          <button
            type="button"
            onClick={() => {
              setShowIdleWarning(false);
              setIdleRemaining(WARNING_TIME);
            }}
            className="w-full max-w-xl rounded-2xl border border-white/30 bg-white p-8 text-primary shadow-2xl"
          >
            <p className="text-sm font-black uppercase tracking-[0.28em] text-secondary">
              Atendimento pausado
            </p>
            <h2 className="mt-3 text-4xl font-black">
              Alguem ainda esta mexendo?
            </h2>
            <p className="mt-4 text-lg text-text-muted">
              Toque para continuar. Voltando para o video em{" "}
              <strong className="text-secondary">{idleRemaining}s</strong>.
            </p>
          </button>
        </div>
      )}
    </main>
  );
}

export default TotemPage;
