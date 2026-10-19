import { api } from "./api.js";

// Valida no servidor o PIN de saída do totem ("totem") ou de logout da mesa
// ("mesa"). O PIN não fica mais no código do site.
export async function verifyExitPin(kind, pin) {
  try {
    await api.post("/auth/exit-pin", { kind, pin });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error.response?.data?.error?.message ||
        "Não foi possível validar o PIN.",
    };
  }
}
