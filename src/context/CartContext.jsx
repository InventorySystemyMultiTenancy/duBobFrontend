import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import { AuthContext } from "./AuthContext.jsx";

const CartContext = createContext(null);

const FREIGHT_BASE = 0;

const currency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const sumAddons = (addons = []) =>
  addons.reduce((sum, addon) => sum + Number(addon?.price || 0), 0);

function storageKey(userId) {
  return userId ? `dubob_cart_${userId}` : "dubob_cart_guest";
}

function scopedStorageKey(userId, scope) {
  const baseKey = storageKey(userId);
  return scope && scope !== "default" ? `${baseKey}_${scope}` : baseKey;
}

function loadCartFromStorage(userId, scope = "default") {
  try {
    const raw = localStorage.getItem(scopedStorageKey(userId, scope));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const normalizeItem = (item) => {
  const id = String(item?.id || item?.productId || item?.key || "").trim();
  const nome = item?.nome || item?.name || item?.title || "Produto";
  const price = Number(item?.price ?? item?.basePrice ?? 0);
  const addons = Array.isArray(item?.addons) ? item.addons : [];
  const removals = Array.isArray(item?.removals) ? item.removals : [];
  const observation = item?.observation ?? item?.notes ?? "";
  const quantity = Math.max(1, Number(item?.quantity || 1));

  const fallbackKey = [
    id,
    addons
      .map((addon) => addon?.id || addon?.nome)
      .filter(Boolean)
      .sort()
      .join("."),
    removals.slice().sort().join("."),
    String(observation || "").trim(),
  ].join("|");

  return {
    ...item,
    id,
    nome,
    price,
    addons,
    removals,
    observation,
    quantity,
    key: item?.key || fallbackKey,
  };
};

// Junta o carrinho de visitante com o da conta (mesmo item soma a quantidade).
function mergeCartItems(baseItems, extraItems) {
  const merged = baseItems.map(normalizeItem);
  for (const raw of extraItems) {
    const item = normalizeItem(raw);
    const existing = merged.find((entry) => entry.key === item.key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.push(item);
    }
  }
  return merged;
}

const itemUnitPrice = (item) =>
  Number(item?.price || 0) + sumAddons(item?.addons || []);

export function CartProvider({ children }) {
  const { user } = useContext(AuthContext);
  const userId = user?.id ?? null;

  const [cartScope, setCartScope] = useState("default");
  const [items, setItems] = useState(() => loadCartFromStorage(userId));
  const [isCartOpen, setIsCartOpen] = useState(false);
  // De qual chave do localStorage vieram os itens em memória. Evita gravar o
  // carrinho de um usuário na chave de outro durante a troca (ex.: no login).
  const loadedKeyRef = useRef(scopedStorageKey(userId, "default"));
  const previousUserIdRef = useRef(userId);

  useEffect(() => {
    const key = scopedStorageKey(userId, cartScope);
    let nextItems = loadCartFromStorage(userId, cartScope).map(normalizeItem);

    // Visitante que acabou de entrar: o que ele colocou no carrinho vem junto.
    const justLoggedIn = previousUserIdRef.current === null && userId !== null;
    if (justLoggedIn) {
      const guestItems = loadCartFromStorage(null, cartScope);
      if (guestItems.length) {
        nextItems = mergeCartItems(nextItems, guestItems);
        localStorage.setItem(key, JSON.stringify(nextItems));
        localStorage.removeItem(scopedStorageKey(null, cartScope));
      }
    }
    previousUserIdRef.current = userId;

    loadedKeyRef.current = key;
    setItems(nextItems);
  }, [userId, cartScope]);

  useEffect(() => {
    const key = scopedStorageKey(userId, cartScope);
    if (loadedKeyRef.current !== key) return;
    localStorage.setItem(key, JSON.stringify(items));
  }, [items, userId, cartScope]);

  const addItems = (itemsToAdd, { silent = false } = {}) => {
    setItems((prev) => {
      let next = [...prev];

      for (const rawItem of itemsToAdd) {
        const item = normalizeItem(rawItem);
        const existing = next.find((entry) => entry.key === item.key);

        if (existing) {
          next = next.map((entry) =>
            entry.key === item.key
              ? { ...entry, quantity: entry.quantity + (item.quantity || 1) }
              : entry,
          );
          continue;
        }

        next = [...next, item];
      }

      return next;
    });

    if (!silent) {
      toast.success(
        itemsToAdd.length > 1
          ? "Itens adicionados ao carrinho"
          : "Item adicionado ao carrinho",
      );
    }
  };

  const addItem = (item) => {
    addItems([item]);
  };

  const updateItem = (key, updater) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const next =
          typeof updater === "function"
            ? updater(item)
            : { ...item, ...updater };
        return normalizeItem(next);
      }),
    );
  };

  const updateQuantity = (key, quantity) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.key === key ? normalizeItem({ ...item, quantity }) : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (key) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  // Estável e sem re-render se já está vazio: páginas chamam isto em efeitos
  const clearCart = useCallback(
    () => setItems((prev) => (prev.length ? [] : prev)),
    [],
  );

  const subtotal = useMemo(
    () =>
      items.reduce((acc, item) => acc + itemUnitPrice(item) * item.quantity, 0),
    [items],
  );

  const freight = useMemo(() => {
    if (!subtotal) {
      return 0;
    }

    return 0;
  }, [subtotal]);

  const total = subtotal + freight;

  const value = useMemo(
    () => ({
      items,
      cartScope,
      setCartScope,
      isCartOpen,
      openCart: () => setIsCartOpen(true),
      closeCart: () => setIsCartOpen(false),
      addItem,
      addItems,
      updateItem,
      updateQuantity,
      removeItem,
      clearCart,
      subtotal,
      freight,
      total,
      formatted: {
        subtotal: currency(subtotal),
        freight: currency(freight),
        total: currency(total),
      },
    }),
    [items, cartScope, isCartOpen, subtotal, freight, total, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart deve ser usado dentro de CartProvider");
  }

  return context;
};
