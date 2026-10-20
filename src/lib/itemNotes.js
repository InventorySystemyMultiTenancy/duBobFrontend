// O texto do item do pedido junta o que o cliente escolheu e a observação dele:
//   "Sabor: Chocolate | Tamanho: P 300 ml | Complementos: Kiwi, Granola | Obs: sem gelo"
// Aqui separamos as partes para mostrar cada uma do jeito certo.

const KNOWN_FIELDS = ["Sabor", "Linha", "Tamanho", "Adicional"];
const FIELD_PATTERN = /^(Sabor|Linha|Tamanho|Complementos|Adicional|Obs)\s*:\s*(.*)$/i;

function capitalize(label) {
  const lower = label.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function parseItemNotes(notes) {
  const fields = [];
  const complements = [];
  const freeText = [];

  String(notes ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const match = part.match(FIELD_PATTERN);
      if (!match) {
        freeText.push(part);
        return;
      }
      const label = capitalize(match[1]);
      const value = match[2].trim();
      if (!value) return;
      if (label === "Complementos") {
        if (value.toLowerCase() !== "nenhum") {
          complements.push(
            ...value.split(",").map((entry) => entry.trim()).filter(Boolean),
          );
        }
      } else if (label === "Obs") {
        freeText.push(value);
      } else if (KNOWN_FIELDS.includes(label)) {
        fields.push({ label, value });
      }
    });

  return { fields, complements, observation: freeText.join(" · ") };
}

// Parte "escolhida" do texto (tudo menos a observação livre do cliente).
export function structuredNotes(notes) {
  return String(notes ?? "")
    .split("|")
    .map((part) => part.trim())
    .filter((part) => {
      const match = part.match(FIELD_PATTERN);
      return match && match[1].toLowerCase() !== "obs";
    })
    .join(" | ");
}

// Observação do cliente exatamente como foi digitada (para o campo de texto).
export function rawObservation(notes) {
  const text = String(notes ?? "");
  const match = text.match(/(?:^|\|\s*)Obs:\s?([\s\S]*)$/i);
  if (match) return match[1];
  return structuredNotes(text) ? "" : text;
}

// Monta de novo o texto mantendo as escolhas e trocando só a observação.
export function withObservation(notes, observation) {
  const base = structuredNotes(notes);
  const text = String(observation ?? "");
  if (!text.trim()) return base;
  return base ? `${base} | Obs: ${text}` : text;
}
