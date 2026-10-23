// Complementos cobrados à parte: produtos de categoria própria no admin
// (o preço é o do tamanho cadastrado). A API soma o preço no item do pedido.
export const MILKSHAKE_COMPLEMENT_CATEGORY = "complemento milkshake";
export const ACAI_PREMIUM_CATEGORY = "complemento acai premium";

const normalizeText = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function paidComplementOptions(products, categoryNeedle) {
  return (products ?? [])
    .filter(
      (product) =>
        product.isActive !== false &&
        normalizeText(product.category).includes(categoryNeedle),
    )
    .map((product) => ({
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl ?? "",
      price: Number(product.sizes?.[0]?.price ?? 0),
    }))
    .filter((product) => product.name && product.price > 0);
}

// Item do carrinho que é milk shake (montado com "Linha: ..." nas notas)
export function isMilkshakeCartItem(item) {
  return /Linha:/i.test(String(item?.observation ?? item?.notes ?? ""));
}
