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
  big = false,
  complementOptions = [],
  onAddonsChange,
}) {
  const nome = item.nome || item.title || "Produto";
  const notes = item.observation ?? item.notes ?? "";
  const { fields, complements } = parseItemNotes(notes);
  const observation = rawObservation(notes);
  const addons = item.addons || [];
  const unit = Number(item.price || 0) + addonTotal(addons);
  // Os complementos escolhidos no carrinho aparecem nos botões, não na lista
  const optionIds = new Set(complementOptions.map((option) => option.id));
  const otherAddons = addons.filter((addon) => !optionIds.has(addon.id));

  const toggleComplement = (option) => {
    const selected = addons.some((addon) => addon.id === option.id);
    onAddonsChange?.(
      selected
        ? addons.filter((addon) => addon.id !== option.id)
        : [...addons, { id: option.id, nome: option.name, price: option.price }],
    );
  };

  return (
    <article
      className={`rounded-3xl bg-white text-text-main shadow-card ring-1 ring-primary/5 ${
        big ? "p-6" : "p-4"
      }`}
    >
      <h4
        className={`font-display font-semibold leading-tight text-primary ${
          big ? "text-3xl" : "text-lg"
        }`}
      >
        {nome}
      </h4>

      {otherAddons.length ? (
        <div className="mt-1.5 space-y-1">
          {otherAddons.map((addon) => (
            <p
              key={addon.id || addon.nome}
              className={`text-secondary ${big ? "text-lg font-bold" : "text-xs"}`}
            >
              + {addon.nome || addon.name} ({currency(addon.price)})
            </p>
          ))}
        </div>
      ) : null}

      {fields.length > 0 && (
        <p className={`mt-1 text-text-muted ${big ? "text-xl" : "text-sm"}`}>
          {fields.map((field) => field.value).join(" · ")}
        </p>
      )}
      {complements.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {complements.map((name) => (
            <li
              key={name}
              className={`rounded-full bg-accent font-bold text-primary ${
                big ? "px-3 py-1 text-base" : "px-2.5 py-0.5 text-xs"
              }`}
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

      {complementOptions.length > 0 && onAddonsChange && (
        <div
          className={`mt-4 rounded-2xl bg-secondary/10 ring-1 ring-secondary/20 ${
            big ? "p-4" : "p-3"
          }`}
        >
          <p
            className={`font-black uppercase tracking-wide text-secondary ${
              big ? "text-lg" : "text-[11px]"
            }`}
          >
            Turbine seu milk shake
          </p>
          <div className={`mt-2 grid gap-2 ${big ? "grid-cols-2" : "grid-cols-1"}`}>
            {complementOptions.map((option) => {
              const selected = addons.some((addon) => addon.id === option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleComplement(option)}
                  className={`flex items-center justify-between gap-2 rounded-2xl border-2 text-left font-bold transition ${
                    big ? "min-h-16 px-4 py-3 text-lg" : "px-3 py-2 text-sm"
                  } ${
                    selected
                      ? "border-secondary bg-secondary text-white"
                      : "border-primary/10 bg-white text-primary hover:border-secondary/50"
                  }`}
                >
                  <span className="min-w-0 break-words">
                    {selected ? "✓ " : "+ "}
                    {option.name}
                  </span>
                  <span className={`shrink-0 ${selected ? "text-white" : "text-secondary"}`}>
                    {currency(option.price)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3">
        <label
          className={`mb-1 block font-black uppercase tracking-wide text-secondary ${
            big ? "text-sm" : "text-[11px]"
          }`}
        >
          Observação
        </label>
        <textarea
          rows={2}
          placeholder="Ex.: pouco leite condensado"
          value={observation}
          onChange={(event) =>
            onObservationChange(withObservation(notes, event.target.value))
          }
          className={`w-full resize-none rounded-2xl border-2 border-primary/10 bg-accent/40 px-3 py-2 text-text-main outline-none placeholder:text-text-muted/60 focus:border-secondary focus:bg-white ${
            big ? "text-lg" : "text-sm"
          }`}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`flex items-center justify-center rounded-full bg-accent font-bold text-primary transition hover:bg-secondary hover:text-white ${
              big ? "h-14 w-14 text-2xl" : "h-10 w-10 text-lg"
            }`}
            onClick={() => onQuantityChange(item.quantity - 1)}
            aria-label="Diminuir quantidade"
          >
            −
          </button>
          <span
            className={`text-center font-semibold text-primary ${
              big ? "w-10 text-2xl" : "w-7 text-sm"
            }`}
          >
            {item.quantity}
          </span>
          <button
            type="button"
            className={`flex items-center justify-center rounded-full bg-accent font-bold text-primary transition hover:bg-secondary hover:text-white ${
              big ? "h-14 w-14 text-2xl" : "h-10 w-10 text-lg"
            }`}
            onClick={() => onQuantityChange(item.quantity + 1)}
            aria-label="Aumentar quantidade"
          >
            +
          </button>
        </div>

        <div className="text-right">
          <p
            className={`font-display font-bold text-secondary ${
              big ? "text-3xl" : "text-lg"
            }`}
          >
            {currency(unit * item.quantity)}
          </p>
          <button
            type="button"
            onClick={onRemove}
            className={`font-semibold text-text-muted transition hover:text-red-500 ${
              big ? "text-base" : "text-xs"
            }`}
          >
            Remover
          </button>
        </div>
      </div>
    </article>
  );
}

export default CartProductCard;
