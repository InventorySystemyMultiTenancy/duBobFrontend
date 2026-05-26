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
  const observation = item.observation ?? item.notes ?? "";
  const unit = Number(item.price || 0) + addonTotal(item.addons || []);

  return (
    <article className="rounded-2xl border border-border-soft bg-white p-3 text-text-main shadow-card transition-all hover:border-secondary/40 hover:shadow-card-hover">
      <h4 className="font-display text-base font-black text-primary">{nome}</h4>

      {item.addons?.length ? (
        <div className="mt-1.5 space-y-1">
          {item.addons.map((addon) => (
            <p key={addon.id || addon.nome} className="text-xs text-secondary">
              + {addon.nome} ({currency(addon.price)})
            </p>
          ))}
        </div>
      ) : null}

      {item.removals?.length ? (
        <p className="mt-1 text-xs text-text-muted">
          Remocoes: {item.removals.join(", ")}
        </p>
      ) : null}

      <div className="mt-3">
        <label className="mb-1 block text-[11px] font-black uppercase tracking-wide text-secondary">
          Observacao
        </label>
        <textarea
          rows={2}
          placeholder="Ex: sem molho"
          value={observation}
          onChange={(event) => onObservationChange(event.target.value)}
          className="w-full resize-none rounded-xl border border-border-soft bg-accent/60 px-3 py-2 text-sm text-text-main outline-none placeholder:text-text-muted/60 focus:border-secondary/60 focus:bg-white"
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-soft bg-accent text-lg font-bold text-primary transition hover:border-secondary hover:text-secondary"
            onClick={() => onQuantityChange(item.quantity - 1)}
          >
            -
          </button>
          <span className="w-7 text-center text-sm font-semibold text-primary">
            {item.quantity}
          </span>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border-soft bg-accent text-lg font-bold text-primary transition hover:border-secondary hover:text-secondary"
            onClick={() => onQuantityChange(item.quantity + 1)}
          >
            +
          </button>
        </div>

        <div className="text-right">
          <p className="text-sm font-black text-secondary">
            {currency(unit * item.quantity)}
          </p>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-semibold text-text-muted transition hover:text-red-500"
          >
            remover
          </button>
        </div>
      </div>
    </article>
  );
}

export default CartProductCard;
