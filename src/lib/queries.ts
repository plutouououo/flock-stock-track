/**
 * React Query keys and helpers for PoultryMart data.
 * Storage is sync (localStorage); we use queryClient.invalidateQueries to refetch after mutations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product, Sale, ShoppingListItem, Customer, Expense, ProductBatch } from "@/types";
import * as storage from "./storage";

export const queryKeys = {
  products: ["products"] as const,
  productBatches: ["productBatches"] as const,
  sales: ["sales"] as const,
  salesWithItems: ["sales", "with-items"] as const,
  saleItems: ["saleItems"] as const,
  customers: ["customers"] as const,
  expenses: ["expenses"] as const,
  shoppingList: ["shoppingList"] as const,
  settings: ["settings"] as const,
};

// Type helpers for mutation parameters
type AddProductParams = Parameters<typeof storage.addProduct>[0];
type UpdateProductParams = { id: string; updates: Partial<Product> };
type DeleteProductParams = string;
type AddProductBatchParams = Parameters<typeof storage.addProductBatch>[0];
type RecordSaleParams = Omit<Sale, "id" | "created_at">;
type AddCustomerParams = Parameters<typeof storage.addCustomer>[0];
type AddExpenseParams = Parameters<typeof storage.addExpense>[0];
type AddShoppingListItemParams = Parameters<typeof storage.addShoppingListItem>[0];
type UpdateShoppingListParams = Parameters<typeof storage.updateShoppingList>[0];
type RemoveShoppingListItemParams = Parameters<typeof storage.removeShoppingListItem>[0];

// Queries
export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products,
    queryFn: async () => {
      const data = await storage.getProducts();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useProductBatches() {
  return useQuery({
    queryKey: queryKeys.productBatches,
    queryFn: async () => {
      const data = await storage.getProductBatches();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useSales() {
  return useQuery({
    queryKey: queryKeys.sales,
    queryFn: async () => {
      const data = await storage.getSales();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useSalesWithItems() {
  return useQuery({
    queryKey: queryKeys.salesWithItems,
    queryFn: async () => {
      try {
        const data = await storage.getSalesWithItems();
        return data || [];
      } catch (err) {
        console.warn('Failed to fetch sales with items from Supabase:', err);
        // Fallback to local storage with joined data
        const sales = await storage.getSales();
        const saleItems = await storage.getSaleItems();
        
        return sales.map(sale => ({
          ...sale,
          items: saleItems.filter(item => item.sale_id === sale.id)
        }));
      }
    },
  });
}

export function useSaleItems() {
  return useQuery({
    queryKey: queryKeys.saleItems,
    queryFn: async () => {
      const data = await storage.getSaleItems();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers,
    queryFn: async () => {
      const data = await storage.getCustomers();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useExpenses() {
  return useQuery({
    queryKey: queryKeys.expenses,
    queryFn: async () => {
      const data = await storage.getExpenses();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useShoppingList() {
  return useQuery({
    queryKey: queryKeys.shoppingList,
    queryFn: async () => {
      const data = await storage.getShoppingList();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: async () => {
      const data = await storage.getSettings();
      return Array.isArray(data) ? data : [];
    },
  });
}

// Mutations - All wrapped in async functions to return Promises
export function useAddProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: AddProductParams) => {
      return await storage.addProduct(product);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: UpdateProductParams) => {
      const result = await storage.updateProduct(id, updates);
      if (!result) {
        throw new Error(`Product with id ${id} not found`);
      }
      return result;
    },
    onSuccess: (updatedProduct) => {
      if (updatedProduct) {
        queryClient.invalidateQueries({ queryKey: queryKeys.products });
        queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList });
      }
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: DeleteProductParams) => {
      const success = await storage.deleteProduct(id);
      if (!success) {
        throw new Error(`Product with id ${id} not found or could not be deleted`);
      }
      return success;
    },
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.products });
        queryClient.invalidateQueries({ queryKey: queryKeys.productBatches });
        queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList });
      }
    },
  });
}

export function useAddProductBatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (batch: AddProductBatchParams) => {
      return await storage.addProductBatch(batch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.productBatches });
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
    },
  });
}

export function useRecordSale() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sale: RecordSaleParams) => {
      // Deduct stock for each item first; if any fails, throw
      for (const item of sale.items) {
        const ok = await storage.deductStock(item.product_id, item.quantity);
        if (!ok) {
          const product = await storage.getProductById(item.product_id);
          throw new Error(
            `Insufficient stock for product ${product?.name || item.product_id}`
          );
        }
      }
      return await storage.addSale(sale);
    },
    onSuccess: (newSale) => {
      // Invalidate multiple queries that are affected by a sale
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      queryClient.invalidateQueries({ queryKey: queryKeys.productBatches });
      queryClient.invalidateQueries({ queryKey: queryKeys.sales });
      queryClient.invalidateQueries({ queryKey: queryKeys.salesWithItems });
      queryClient.invalidateQueries({ queryKey: queryKeys.saleItems });
    },
    onError: (error) => {
      console.error('Failed to record sale:', error);
    },
  });
}

export function useAddCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (customer: AddCustomerParams) => {
      return await storage.addCustomer(customer);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers });
    },
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (expense: AddExpenseParams) => {
      return await storage.addExpense(expense);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses });
    },
  });
}

export function useAddShoppingListItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: AddShoppingListItemParams) => {
      return await storage.addShoppingListItem(item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList });
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
    },
  });
}

export function useUpdateShoppingList() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: UpdateShoppingListParams) => {
      await storage.updateShoppingList(updates);
      return updates; // Return the updates for optimistic updates if needed
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList });
    },
  });
}

export function useRemoveShoppingListItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: RemoveShoppingListItemParams) => {
      await storage.removeShoppingListItem(id);
      return id; // Return the id for optimistic updates if needed
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList });
    },
  });
}

// Optional: Utility hook for prefetching common data
export function usePrefetchData() {
  const queryClient = useQueryClient();
  
  const prefetchProducts = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.products,
      queryFn: async () => await storage.getProducts(),
    });
  };
  
  const prefetchSales = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.sales,
      queryFn: async () => await storage.getSales(),
    });
  };
  
  const prefetchShoppingList = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.shoppingList,
      queryFn: async () => await storage.getShoppingList(),
    });
  };
  
  return {
    prefetchProducts,
    prefetchSales,
    prefetchShoppingList,
  };
}

// Optional: Hook for optimistic updates example
export function useOptimisticShoppingList() {
  const queryClient = useQueryClient();
  
  const toggleItem = useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      await storage.updateShoppingList([{ id, checked, is_ordered: checked }]);
      return { id, checked };
    },
    onMutate: async ({ id, checked }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.shoppingList });
      
      // Snapshot previous value
      const previousList = queryClient.getQueryData<ShoppingListItem[]>(
        queryKeys.shoppingList
      );
      
      // Optimistically update
      queryClient.setQueryData<ShoppingListItem[]>(
        queryKeys.shoppingList,
        (old = []) => old.map(item => 
          item.id === id 
            ? { ...item, checked, is_ordered: checked, updated_at: new Date().toISOString() }
            : item
        )
      );
      
      return { previousList };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousList) {
        queryClient.setQueryData(queryKeys.shoppingList, context.previousList);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingList });
    },
  });
  
  return toggleItem;
}