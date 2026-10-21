import { useEffect } from "react";
import { TOTEM_MODE_KEY } from "./totemMode.js";

/**
 * Voz do totem: fala as perguntas do pedido com a síntese de voz do navegador.
 * Só funciona no modo totem e quando o admin liga "Voz do totem" no cadastro
 * do totem (TotemPage grava a opção ao carregar o totem).
 */
export const TOTEM_VOICE_KEY = "pc_totem_voice";

const SIZE_LETTERS = { P: "pê", M: "eme", G: "gê", MG: "eme gê" };

export function setTotemVoiceEnabled(enabled) {
  localStorage.setItem(TOTEM_VOICE_KEY, enabled ? "true" : "false");
}

function isVoiceOn() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    localStorage.getItem(TOTEM_MODE_KEY) === "true" &&
    localStorage.getItem(TOTEM_VOICE_KEY) === "true"
  );
}

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang === "pt-BR" && /google/i.test(voice.name)) ||
    voices.find((voice) => voice.lang === "pt-BR") ||
    voices.find((voice) => voice.lang?.startsWith("pt")) ||
    null
  );
}

export function speakTotem(text) {
  if (!text || !isVoiceOn()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  utterance.rate = 0.95;
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}

export function stopTotemSpeech() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
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
  const ml = String(size.ml ?? "").replace(/\s*ml\b/i, " mililitros");
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
