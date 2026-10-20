import { parseItemNotes, rawObservation, withObservation } from "../lib/itemNotes.js";

const currency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const addonTotal = (addons = []) =>
  addons.reduce((sum, addon) => sum + Number(addon?.price || 0), 0);

function CartProductCard({
  item,
  onQuantityChange,
  onRemove,
  onObservationChange,
}) {
  const nome = item.nome || item.title || "Produto";
  const notes = item.observation ?? item.notes ?? "";
  const { fields, complements } = parseItemNotes(notes);
  const observation = rawObservation(notes);
  const unit = Number(item.price || 0) + addonTotal(item.addons || []);

  return (
    <article className="rounded-3xl bg-white p-4 text-text-main shadow-card ring-1 ring-primary/5">
      <h4 className="font-display text-lg font-semibold leading-tight text-primary">{nome}</h4>

      {item.addons?.length ? (
        <div className="mt-1.5 space-y-1">
          {item.addons.map((addon) => (
            <p key={addon.id || addon.nome} className="text-xs text-secondary">
              + {addon.nome} ({currency(addon.price)})
            </p>
          ))}
        </div>
      ) : null}

      {fields.length > 0 && (
        <p className="mt-1 text-sm text-text-muted">
          {fields.map((field) => field.value).join(" · ")}
        </p>
      )}
      {complements.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {complements.map((name) => (
            <li
              key={name}
              className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-primary"
            >
              {name}
            </li>
          ))}
        </ul>
      )}

      {item.removals?.length ? (
        <p className="mt-1 text-xs text-text-muted">
          Remoções: {item.removals.join(", ")}
        </p>
      ) : null}

      <div className="mt-3">
        <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-secondary">
          Observação
        </label>
        <textarea
          rows={2}
          placeholder="Ex.: pouco leite condensado"
          value={observation}
          onChange={(event) =>
            onObservationChange(withObservation(notes, event.target.value))
          }
          className="w-full resize-none rounded-2xl border-2 border-primary/10 bg-accent/40 px-3 py-2 text-sm text-text-main outline-none placeholder:text-text-muted/60 focus:border-secondary focus:bg-white"
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-lg font-bold text-primary transition hover:bg-secondary hover:text-white"
            onClick={() => onQuantityChange(item.quantity - 1)}
            aria-label="Diminuir quantidade"
          >
            −
          </button>
          <span className="w-7 text-center text-sm font-semibold text-primary">
            {item.quantity}
          </span>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-lg font-bold text-primary transition hover:bg-secondary hover:text-white"
            onClick={() => onQuantityChange(item.quantity + 1)}
            aria-label="Aumentar quantidade"
          >
            +
          </button>
        </div>

        <div className="text-right">
          <p className="font-display text-lg font-bold text-secondary">
            {currency(unit * item.quantity)}
          </p>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-semibold text-text-muted transition hover:text-red-500"
          >
            Remover
          </button>
        </div>
      </div>
    </article>
  );
}

export default CartProductCard;
