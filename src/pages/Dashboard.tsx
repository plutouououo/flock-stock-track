import { useMemo, useState, useEffect } from "react";
import { Package, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useProducts, useSales } from "@/lib/queries";
import { getProductStock } from "@/lib/storage";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

// Custom hook untuk mengelola stock products
function useProductsWithStock() {
  const { data: products = [] } = useProducts();
  const [productStockMap, setProductStockMap] = useState<Map<string, number>>(new Map());
  const [loadingStock, setLoadingStock] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadStocks() {
      setLoadingStock(true);
      const stockMap = new Map();
      
      for (const product of products) {
        try {
          const stock = await getProductStock(product);
          if (mounted) {
            stockMap.set(product.id, stock);
          }
        } catch (error) {
          console.error(`Error loading stock for product ${product.id}:`, error);
          if (mounted) {
            stockMap.set(product.id, 0);
          }
        }
      }
      
      if (mounted) {
        setProductStockMap(stockMap);
        setLoadingStock(false);
      }
    }

    if (products.length > 0) {
      loadStocks();
    } else {
      setLoadingStock(false);
    }

    return () => {
      mounted = false;
    };
  }, [products]);

  const getStock = (productId: string): number => {
    return productStockMap.get(productId) || 0;
  };

  const getProductStockValue = (product: Product): number => {
    return getStock(product.id);
  };

  const getLowStockProducts = (): Product[] => {
    return products
      .filter((p) => p.threshold > 0 && getStock(p.id) <= p.threshold)
      .sort((a, b) => getStock(a.id) - getStock(b.id));
  };

  const getLowStockCount = (): number => {
    return products.filter(
      (p) => p.threshold > 0 && getStock(p.id) <= p.threshold
    ).length;
  };

  return {
    products,
    loadingStock,
    getStock,
    getProductStockValue,
    getLowStockProducts,
    getLowStockCount,
  };
}

export default function Dashboard() {
  const { products, getStock, getLowStockProducts, getLowStockCount } = useProductsWithStock();
  const { data: sales = [] } = useSales();

  const stats = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const thisMonth = format(new Date(), "yyyy-MM");
    
    const todaySales = sales.filter((s) => s.createdAt?.startsWith(today) || s.created_at?.startsWith(today));
    const monthSales = sales.filter((s) => s.createdAt?.startsWith(thisMonth) || s.created_at?.startsWith(thisMonth));
    
    const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total || s.total_amount || 0), 0);
    const monthRevenue = monthSales.reduce((sum, s) => sum + (s.total || s.total_amount || 0), 0);
    
    const lowStockCount = getLowStockCount();

    return {
      todayRevenue,
      productCount: products.length,
      monthRevenue,
      lowStockCount,
    };
  }, [products, sales, getLowStockCount]);

  const recentSales = useMemo(
    () =>
      [...sales]
        .sort((a, b) => {
          const dateA = a.createdAt || a.created_at || '';
          const dateB = b.createdAt || b.created_at || '';
          return dateB.localeCompare(dateA);
        })
        .slice(0, 5),
    [sales]
  );

  const lowStockProducts = useMemo(
    () => getLowStockProducts().slice(0, 5),
    [getLowStockProducts]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Dashboard</h1>
        <p className="page-description">Welcome back! Here&apos;s your business overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card flex items-start gap-4">
          <div className="rounded-lg bg-muted p-2.5 text-accent">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Today&apos;s Sales</p>
            <p className="text-xl font-bold mt-0.5">{formatRupiah(stats.todayRevenue)}</p>
          </div>
        </div>
        <div className="stat-card flex items-start gap-4">
          <div className="rounded-lg bg-muted p-2.5 text-info">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Products</p>
            <p className="text-xl font-bold mt-0.5">{stats.productCount}</p>
          </div>
        </div>
        <div className="stat-card flex items-start gap-4">
          <div className="rounded-lg bg-muted p-2.5 text-success">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Revenue (Month)</p>
            <p className="text-xl font-bold mt-0.5">{formatRupiah(stats.monthRevenue)}</p>
          </div>
        </div>
        <div className="stat-card flex items-start gap-4">
          <div className="rounded-lg bg-muted p-2.5 text-warning">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Low Stock Alerts</p>
            <p className="text-xl font-bold mt-0.5">{stats.lowStockCount}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-elevated-md p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Sales</h2>
          {recentSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No sales recorded yet</p>
              <p className="text-xs mt-1">Start by adding products and recording your first sale</p>
              <Button asChild className="mt-3" variant="outline">
                <Link to="/sales">Record sale</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {recentSales.map((s) => {
                const saleDate = s.createdAt || s.created_at || '';
                const customerType = s.customerType || s.customer_type || 'Unknown';
                const total = s.total || s.total_amount || 0;
                
                return (
                  <li key={s.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {saleDate ? format(new Date(saleDate), "dd MMM, HH:mm") : 'Unknown'} · {customerType}
                    </span>
                    <span className="font-medium">{formatRupiah(total)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card-elevated-md p-6">
          <h2 className="text-lg font-semibold mb-4">Low Stock Alerts</h2>
          {lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No alerts</p>
              <p className="text-xs mt-1">Products below threshold will appear here</p>
              <Button asChild className="mt-3" variant="outline">
                <Link to="/shopping-list">Shopping list</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {lowStockProducts.map((p) => {
                const stock = getStock(p.id);
                return (
                  <li key={p.id} className="flex justify-between text-sm">
                    <span>{p.name}</span>
                    <span className="text-warning font-medium">
                      {stock} / {p.threshold}
                    </span>
                  </li>
                );
              })}
              <li>
                <Button asChild variant="link" className="px-0 h-auto text-sm">
                  <Link to="/shopping-list">View shopping list →</Link>
                </Button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}