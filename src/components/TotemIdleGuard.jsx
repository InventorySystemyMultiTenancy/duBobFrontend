import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useCart } from "../context/CartContext.jsx";

const TOTEM_MODE_KEY = "pc_totem_mode";
const IDLE_TIME_MS = 90_000;
const WARNING_TIME = 20;
const EXIT_HOLD_MS = 10_000;
const EXIT_PASSWORD = "2468";
const BLOCKED_CTRL_KEYS = new Set(["r", "l", "n", "t", "w", "p", "s", "u"]);
const ACTIVITY_EVENTS = [
  "click",
  "pointerdown",
  "pointermove",
  "keydown",
  "touchstart",
  "wheel",
];

function isTotemModeEnabled() {
  return localStorage.getItem(TOTEM_MODE_KEY) === "true";
}

function requestTotemFullscreen() {
  const element = document.documentElement;
  if (!document.fullscreenElement && element.requestFullscreen) {
    return element.requestFullscreen().catch(() => {});
  }
  return Promise.resolve();
}

function TotemIdleGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { clearCart, closeCart } = useCart();
  const [isTotemMode, setIsTotemMode] = useState(isTotemModeEnabled);
  const [showWarning, setShowWarning] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [showExitPassword, setShowExitPassword] = useState(false);
  const [exitPassword, setExitPassword] = useState("");
  const [exitPasswordError, setExitPasswordError] = useState("");
  const [remaining, setRemaining] = useState(WARNING_TIME);
  const [holdProgress, setHoldProgress] = useState(0);
  const idleTimerRef = useRef(null);
  const holdTimerRef = useRef(null);
  const holdStartedAtRef = useRef(null);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const finishTotemSession = useCallback(
    ({ exitTotem = false } = {}) => {
      clearIdleTimer();
      logout();
      clearCart();
      closeCart();
      setShowWarning(false);
      setShowFullscreenPrompt(false);
      setShowExitPassword(false);
      setExitPassword("");
      setExitPasswordError("");
      setRemaining(WARNING_TIME);

      if (exitTotem) {
        localStorage.removeItem(TOTEM_MODE_KEY);
        window.dispatchEvent(new Event("pc_totem_mode_change"));
        navigate("/", { replace: true });
        return;
      }

      localStorage.setItem(TOTEM_MODE_KEY, "true");
      navigate("/totem", { replace: true });
    },
    [clearCart, clearIdleTimer, closeCart, logout, navigate],
  );

  const startIdleTimer = useCallback(() => {
    clearIdleTimer();

    if (!isTotemMode || location.pathname === "/totem") {
      return;
    }

    idleTimerRef.current = window.setTimeout(() => {
      setRemaining(WARNING_TIME);
      setShowWarning(true);
    }, IDLE_TIME_MS);
  }, [clearIdleTimer, isTotemMode, location.pathname]);

  useEffect(() => {
    const syncMode = () => setIsTotemMode(isTotemModeEnabled());
    window.addEventListener("storage", syncMode);
    window.addEventListener("pc_totem_mode_change", syncMode);

    return () => {
      window.removeEventListener("storage", syncMode);
      window.removeEventListener("pc_totem_mode_change", syncMode);
    };
  }, []);

  useEffect(() => {
    if (!isTotemMode) {
      return undefined;
    }

    const handleFullscreenChange = () => {
      setShowFullscreenPrompt(!document.fullscreenElement);
    };

    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const shouldBlock =
        event.key === "F11" ||
        event.key === "F5" ||
        event.key === "Escape" ||
        ((event.ctrlKey || event.metaKey) && BLOCKED_CTRL_KEYS.has(key)) ||
        (event.altKey && ["arrowleft", "arrowright", "f4"].includes(key));

      if (shouldBlock) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("beforeunload", handleBeforeUnload);
    handleFullscreenChange();

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isTotemMode]);

  useEffect(() => {
    if (!isTotemMode) {
      clearIdleTimer();
      return undefined;
    }

    const handleActivity = () => {
      if (showWarning) {
        setShowWarning(false);
        setRemaining(WARNING_TIME);
      }
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
  }, [clearIdleTimer, isTotemMode, showWarning, startIdleTimer]);

  useEffect(() => {
    if (!showWarning) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          finishTotemSession();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [finishTotemSession, showWarning]);

  const stopLogoHold = () => {
    if (holdTimerRef.current) {
      window.clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdStartedAtRef.current = null;
    setHoldProgress(0);
  };

  const startLogoHold = () => {
    stopLogoHold();
    holdStartedAtRef.current = Date.now();
    holdTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - holdStartedAtRef.current;
      const progress = Math.min(100, (elapsed / EXIT_HOLD_MS) * 100);
      setHoldProgress(progress);

      if (elapsed >= EXIT_HOLD_MS) {
        stopLogoHold();
        setShowExitPassword(true);
        setExitPassword("");
        setExitPasswordError("");
      }
    }, 100);
  };

  const closeExitPassword = () => {
    setShowExitPassword(false);
    setExitPassword("");
    setExitPasswordError("");
  };

  const handleExitPasswordSubmit = (event) => {
    event.preventDefault();

    if (exitPassword !== EXIT_PASSWORD) {
      setExitPasswordError("Senha incorreta.");
      setExitPassword("");
      return;
    }

    finishTotemSession({ exitTotem: true });
  };

  useEffect(() => stopLogoHold, []);

  if (!isTotemMode) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onPointerDown={startLogoHold}
        onPointerUp={stopLogoHold}
        onPointerLeave={stopLogoHold}
        onPointerCancel={stopLogoHold}
        className="fixed left-4 top-4 z-[70] h-16 w-16 overflow-hidden rounded-xl border border-white/40 bg-white/90 p-2 shadow-card backdrop-blur transition hover:bg-white"
        aria-label="Segure por 10 segundos para sair do modo totem"
      >
        <img
          src="/LogoDuBob.png"
          alt="Dubob"
          className="h-full w-full object-contain"
          draggable="false"
        />
        <span
          className="absolute bottom-0 left-0 h-1 bg-secondary"
          style={{ width: `${holdProgress}%` }}
        />
      </button>

      {showFullscreenPrompt && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-primary/90 p-6 text-center text-white backdrop-blur-sm">
          <button
            type="button"
            onClick={() => {
              requestTotemFullscreen().then(() => {
                setShowFullscreenPrompt(!document.fullscreenElement);
              });
            }}
            className="w-full max-w-xl rounded-2xl border border-white/30 bg-white p-8 text-primary shadow-2xl"
          >
            <p className="text-sm font-black uppercase tracking-[0.28em] text-secondary">
              Modo Totem
            </p>
            <h2 className="mt-3 text-4xl font-black">
              Toque para voltar para tela cheia
            </h2>
            <p className="mt-4 text-lg text-text-muted">
              Para continuar usando o Totem, mantenha a tela cheia ativa.
            </p>
          </button>
        </div>
      )}

      {showExitPassword && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-primary/85 p-6 text-center text-white backdrop-blur-sm">
          <form
            onSubmit={handleExitPasswordSubmit}
            className="w-full max-w-sm rounded-2xl border border-white/30 bg-white p-6 text-primary shadow-2xl"
          >
            <p className="text-xs font-black uppercase tracking-[0.28em] text-secondary">
              Sair do Totem
            </p>
            <h2 className="mt-3 text-3xl font-black">Digite a senha</h2>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={exitPassword}
              onChange={(event) => {
                setExitPassword(event.target.value.replace(/\D/g, ""));
                setExitPasswordError("");
              }}
              className="mt-5 w-full rounded-2xl border border-border-soft bg-accent px-5 py-4 text-center text-3xl font-black tracking-[0.35em] text-primary outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/15"
              placeholder="0000"
            />
            {exitPasswordError && (
              <p className="mt-3 text-sm font-bold text-red-500">
                {exitPasswordError}
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeExitPassword}
                className="rounded-2xl border border-border-soft bg-white px-4 py-4 text-base font-black text-primary transition hover:border-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-2xl bg-secondary px-4 py-4 text-base font-black text-white transition hover:bg-primary"
              >
                Sair
              </button>
            </div>
          </form>
        </div>
      )}

      {showWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-primary/85 p-6 text-center text-white backdrop-blur-sm">
          <button
            type="button"
            onClick={() => {
              setShowWarning(false);
              setRemaining(WARNING_TIME);
              startIdleTimer();
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
              Toque na tela para continuar. Voltando para o inicio em{" "}
              <strong className="text-secondary">{remaining}s</strong>.
            </p>
          </button>
        </div>
      )}
    </>
  );
}

export default TotemIdleGuard;
