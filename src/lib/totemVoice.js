import { useEffect } from "react";
import { TOTEM_MODE_KEY } from "./totemMode.js";

/**
 * Voz do totem: fala as perguntas do pedido.
 * - No Fully Kiosk usa a fala do próprio Fully (motor de voz do Android, onde
 *   dá para instalar/escolher a voz). Precisa de "Enable JavaScript Interface"
 *   ligado nas configurações do Fully — o WebView não tem a fala do navegador.
 * - Fora dele usa a síntese de voz do navegador, preferindo vozes naturais.
 * Só funciona no modo totem e quando o admin liga "Voz do totem" no cadastro
 * do totem (TotemPage grava a opção ao carregar o totem).
 */
export const TOTEM_VOICE_KEY = "pc_totem_voice";

const SIZE_LETTERS = { P: "pê", M: "eme", G: "gê", MG: "mega" };
const FULLY_LOCALE = "pt_BR";
const FULLY_ENGINE = "com.google.android.tts";

export function setTotemVoiceEnabled(enabled) {
  localStorage.setItem(TOTEM_VOICE_KEY, enabled ? "true" : "false");
}

function fullyApi() {
  const fully = typeof window !== "undefined" ? window.fully : undefined;
  return fully && typeof fully.textToSpeech === "function" ? fully : null;
}

function hasBrowserSpeech() {
  return (
    typeof window !== "undefined" &&
    Boolean(window.speechSynthesis) &&
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

function isVoiceOn() {
  return (
    (fullyApi() || hasBrowserSpeech()) &&
    localStorage.getItem(TOTEM_MODE_KEY) === "true" &&
    localStorage.getItem(TOTEM_VOICE_KEY) === "true"
  );
}

// Vozes naturais/neurais soam bem mais simpáticas que as padrão.
const FRIENDLY_VOICE = /natural|neural|online|francisca|thalita|luciana|google/i;

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  const ptBR = voices.filter((voice) => /^pt[-_]BR$/i.test(voice.lang));
  return (
    ptBR.find((voice) => FRIENDLY_VOICE.test(voice.name)) ||
    ptBR[0] ||
    voices.find((voice) => voice.lang?.toLowerCase().startsWith("pt")) ||
    null
  );
}

function speakWithFully(fully, text) {
  try {
    fully.stopTextToSpeech?.();
    fully.textToSpeech(text, FULLY_LOCALE, FULLY_ENGINE);
  } catch {
    // versões antigas do Fully aceitam só o texto
    try {
      fully.textToSpeech(text);
    } catch {
      // sem voz disponível: segue sem falar
    }
  }
}

export function speakTotem(text) {
  if (!text || !isVoiceOn()) return;

  const fully = fullyApi();
  if (fully) {
    speakWithFully(fully, text);
    return;
  }

  // A voz nunca pode derrubar o totem: qualquer erro aqui só deixa de falar.
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 1;
    utterance.pitch = 1.1;
    try {
      const voice = pickVoice();
      if (voice) utterance.voice = voice;
    } catch {
      // fica com a voz padrão em português
    }
    synth.speak(utterance);
  } catch {
    // navegador sem fala funcionando
  }
}

export function stopTotemSpeech() {
  const fully = fullyApi();
  if (fully) {
    try {
      fully.stopTextToSpeech?.();
    } catch {
      // ignora
    }
    return;
  }
  try {
    if (hasBrowserSpeech()) window.speechSynthesis.cancel();
  } catch {
    // ignora
  }
}

// O Chrome carrega a lista de vozes depois; pede de novo para já ter a voz boa.
try {
  if (hasBrowserSpeech()) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", () =>
      window.speechSynthesis.getVoices(),
    );
  }
} catch {
  // ignora
}

// Fala o texto sempre que ele mudar; para de falar ao sair da tela.
export function useTotemVoice(text) {
  useEffect(() => {
    speakTotem(text);
  }, [text]);
  useEffect(() => stopTotemSpeech, []);
}

export function spokenPrice(value) {
  const cents = Math.round(Number(value || 0) * 100);
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  const reaisText = `${reais} ${reais === 1 ? "real" : "reais"}`;
  return centavos ? `${reaisText} e ${centavos} centavos` : reaisText;
}

export function spokenSize(size) {
  const letter = SIZE_LETTERS[size.label] ?? size.label;
  // Fala as letras "ml" (a voz leria "ml" como "mililitros")
  const ml = String(size.ml ?? "").replace(/\s*ml\b/i, " eme éle");
  return `${letter}, ${ml}, ${spokenPrice(size.price)}`;
}

// Nomes cadastrados sem acento, para a voz pronunciar certo.
const SPOKEN_FIXES = [[/\bAlcoolica\b/gi, "Alcoólica"], [/\bAcai\b/gi, "Açaí"]];

export function spokenList(items) {
  const fixed = items.map((item) =>
    SPOKEN_FIXES.reduce((text, [from, to]) => text.replace(from, to), item),
  );
  if (fixed.length <= 1) return fixed.join("");
  return `${fixed.slice(0, -1).join(", ")} ou ${fixed[fixed.length - 1]}`;
}

// "Milk Shake - Morango M (400 ml)" -> "Milk Shake, Morango, eme, 400 eme éle"
function spokenItemName(name) {
  const fixed = SPOKEN_FIXES.reduce(
    (text, [from, to]) => text.replace(from, to),
    String(name ?? "Item"),
  );
  return fixed
    .replace(/\s+-\s+/g, ", ")
    .replace(
      /\s+(MG|P|M|G)\s*\((\d+)\s*ml\)/i,
      (_, letter, ml) =>
        `, ${SIZE_LETTERS[letter.toUpperCase()] ?? letter}, ${ml} eme éle`,
    );
}

// Lê o carrinho na tela de pagamento: itens, adicionais e total.
export function spokenOrder(items, total) {
  const parts = items.map((item) => {
    const addons = (item.addons ?? [])
      .map((addon) => addon.nome || addon.name)
      .filter(Boolean);
    const name = spokenItemName(item.nome || item.title);
    return `${item.quantity ?? 1} ${name}${
      addons.length ? `, com ${spokenList(addons).replace(/ ou /, " e ")}` : ""
    }`;
  });
  return `Confira seu pedido: ${parts.join(". ")}. Total: ${spokenPrice(total)}.`;
}
