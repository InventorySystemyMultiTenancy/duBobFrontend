import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.js";
import { CartProvider } from "./context/CartContext.jsx";
import { I18nProvider } from "./context/I18nContext.jsx";
import "./index.css";
import RealtimeBridge from "./realtime/RealtimeBridge.jsx";

const queryClient = new QueryClient();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      )
      .then(() => {
        if ("caches" in window) {
          return caches
            .keys()
            .then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
        }
        return null;
      })
      .catch(() => {});
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter>
              <RealtimeBridge />
              <App />
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: "#17171e",
                    color: "#f3f3f3",
                    border: "1px solid rgba(212,169,77,0.4)",
                  },
                }}
              />
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
);
