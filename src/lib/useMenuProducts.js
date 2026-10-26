import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api.js";

// Troca o preço dos tamanhos que estão em promoção agora (só se for menor)
// e guarda o preço normal em originalPrice para mostrar riscado.
export function applyPromotions(products, promotions) {
  if (!promotions?.length) return products;
  return products.map((product) => {
    const promos = promotions.filter((promo) => promo.productId === product.id);
    if (!promos.length || !product.sizes?.length) return product;
    return {
      ...product,
      sizes: product.sizes.map((size) => {
        const best = promos
          .filter((promo) => !promo.size || promo.size === size.size)
          .reduce(
            (min, promo) => (!min || Number(promo.price) < Number(min.price) ? promo : min),
            null,
          );
        if (!best || Number(best.price) >= Number(size.price)) return size;
        return {
          ...size,
          price: Number(best.price),
          originalPrice: Number(size.price),
          promoEndsAt: best.endsAt,
        };
      }),
    };
  });
}

// Produtos do cardápio já com o preço das promoções que estão valendo.
// O pedido é cobrado pela API com o mesmo preço promocional.
export function useMenuProducts() {
  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await api.get("/products")).data?.data ?? [],
    staleTime: 5 * 60 * 1000,
  });
  const promotionsQuery = useQuery({
    queryKey: ["active-promotions"],
    queryFn: async () => (await api.get("/promotions/active")).data?.data ?? [],
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
  const data = useMemo(
    () => applyPromotions(productsQuery.data ?? [], promotionsQuery.data ?? []),
    [productsQuery.data, promotionsQuery.data],
  );
  return {
    data,
    isLoading: productsQuery.isLoading,
    isError: productsQuery.isError,
  };
}
