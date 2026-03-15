/**
 * React Query keys and helpers for PoultryMart data.
 * Storage is sync (localStorage); we use queryClient.invalidateQueries to refetch after mutations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product, Sale, ShoppingListItem } from "@/types";
import * as storage from "./storage";

export const queryKeys = {
  products: ["products"] as const,
  sales: ["sales"] as const,
  shoppingList: ["shoppingList"] as const,
};

export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products,
    queryFn: storage.getProducts,
  });
}

export function useSales() {
  return useQuery({
    queryKey: queryKeys.sales,
    queryFn: storage.getSales,
  });
}

export function useShoppingList() {
  return useQuery({
    queryKey: queryKeys.shoppingList,
    queryFn: storage.getShoppingList,
  });
}

export function useAddProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (product: Parameters<typeof storage.addProduct>[0]) => storage.addProduct(product),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.products }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Product> }) =>
      storage.updateProduct(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.products });
      qc.invalidateQueries({ queryKey: queryKeys.shoppingList });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => storage.deleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.products });
      qc.invalidateQueries({ queryKey: queryKeys.shoppingList });
    },
  });
}

export function useRecordSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sale: Omit<Sale, "id" | "createdAt">) => {
      // Deduct stock for each item first; if any fails, throw
      for (const item of sale.items) {
        const ok = storage.deductStock(item.productId, item.quantity);
        if (!ok) throw new Error(`Insufficient stock for ${item.productName}`);
      }
      return storage.addSale(sale);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.products });
      qc.invalidateQueries({ queryKey: queryKeys.sales });
    },
  });
}

export function useAddShoppingListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (item: Omit<ShoppingListItem, "id" | "createdAt" | "checked">) =>
      storage.addShoppingListItem(item),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shoppingList }),
  });
}

export function useUpdateShoppingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: (Partial<ShoppingListItem> & { id: string })[]) =>
      storage.updateShoppingList(updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shoppingList }),
  });
}

export function useRemoveShoppingListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => storage.removeShoppingListItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shoppingList }),
  });
}
