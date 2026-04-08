import { useEffect, useState } from "react";
import { useProducts } from "@/lib/queries";
import { getProductStock } from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";
import { CashierFlow } from "@/components/CashierFlow";
import { OwnerFlow } from "@/components/OwnerFlow";
import type { Product } from "@/types";

// ──────────────────────────────────────────────────────────────────────────────
// Stock Hook
// ──────────────────────────────────────────────────────────────────────────────

function useProductsWithStock() {
  const { data: products = [], isLoading } = useProducts();
  const [stockMap, setStockMap] = useState<Map<string, number>>(new Map());
  const [loadingStock, setLoadingStock] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingStock(true);
      const map = new Map<string, number>();
      for (const p of products) {
        try {
          map.set(p.id, await getProductStock(p));
        } catch {
          map.set(p.id, 0);
        }
      }
      if (mounted) {
        setStockMap(map);
        setLoadingStock(false);
      }
    }
    products.length > 0 ? load() : setLoadingStock(false);
    return () => {
      mounted = false;
    };
  }, [products]);

  return {
    products,
    isLoading: isLoading || loadingStock,
    getStock: (id: string) => stockMap.get(id) ?? 0,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Export
// ──────────────────────────────────────────────────────────────────────────────

// ─── root export ───────────────────────────────────────────────────────────────

export default function RecordSale() {
  const { role, userId, loading } = useAuth();
  const { products, isLoading, getStock } = useProductsWithStock();

  if (loading) return (
    <div className="flex items-center justify-center min-h-svh">
      <p className="text-muted-foreground">Loading…</p>
    </div>
  );

  const props = { products, isLoading, getStock, userId };

  return role === "cashier"
    ? <CashierFlow {...props} />
    : <OwnerFlow {...props} />;
}