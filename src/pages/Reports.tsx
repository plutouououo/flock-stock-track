import { useMemo } from "react";
import { BarChart3, TrendingUp, ShoppingCart, DollarSign, Package } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSales, useProducts } from "@/lib/queries";
import { format, subDays, startOfDay } from "date-fns";
import type { Sale } from "@/types";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function Reports() {
  const { data: sales = [] } = useSales();
  const { data: products = [] } = useProducts();

  const stats = useMemo(() => {
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalCogs = sales.reduce(
      (sum, s) =>
        sum +
        s.items.reduce((lineSum, item) => lineSum + (item.costPerUnit ?? 0) * item.quantity, 0),
      0
    );
    const netWorth = totalRevenue - totalCogs;
    const today = format(new Date(), "yyyy-MM-dd");
    const todaySales = sales.filter((s) => s.createdAt.startsWith(today));
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
    const thisMonth = format(new Date(), "yyyy-MM");
    const monthSales = sales.filter((s) => s.createdAt.startsWith(thisMonth));
    const monthRevenue = monthSales.reduce((sum, s) => sum + s.total, 0);

    return {
      totalRevenue,
      totalCogs,
      netWorth,
      todayRevenue,
      monthRevenue,
      salesCount: sales.length,
    };
  }, [sales]);

  const revenueByDay = useMemo(() => {
    const last14 = 14;
    const dayMap: Record<string, number> = {};
    for (let i = 0; i < last14; i++) {
      const d = format(subDays(startOfDay(new Date()), i), "yyyy-MM-dd");
      dayMap[d] = 0;
    }
    sales.forEach((s) => {
      const d = s.createdAt.slice(0, 10);
      if (d in dayMap) dayMap[d] += s.total;
    });
    return Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date: format(new Date(date), "dd/MM"), revenue }));
  }, [sales]);

  const byCustomerType = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    sales.forEach((s) => {
      if (!map[s.customerType]) map[s.customerType] = { count: 0, revenue: 0 };
      map[s.customerType].count += 1;
      map[s.customerType].revenue += s.total;
    });
    return Object.entries(map).map(([type, v]) => ({
      type: type.replace(/-/g, " "),
      ...v,
    }));
  }, [sales]);

  const byPaymentMethod = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    sales.forEach((s) => {
      if (!map[s.paymentMethod]) map[s.paymentMethod] = { count: 0, revenue: 0 };
      map[s.paymentMethod].count += 1;
      map[s.paymentMethod].revenue += s.total;
    });
    return Object.entries(map).map(([method, v]) => ({
      method: method.replace(/-/g, " "),
      ...v,
    }));
  }, [sales]);

  const popularProducts = useMemo(() => {
    const map: Record<string, { name: string; sku: string; quantity: number; revenue: number }> = {};
    sales.forEach((s) => {
      s.items.forEach((item) => {
        const key = item.productId;
        if (!map[key]) {
          map[key] = { name: item.productName, sku: item.sku, quantity: 0, revenue: 0 };
        }
        map[key].quantity += item.quantity;
        map[key].revenue += item.unitPrice * item.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  }, [sales]);

  const recentSales = useMemo(
    () => [...sales].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 15),
    [sales]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Sales Reports</h1>
        <p className="page-description">Track revenue, COGS, and business performance</p>
      </div>

      {sales.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-4 opacity-30" />
            <p className="font-medium">No data yet</p>
            <p className="text-sm mt-1">Reports will populate once you start recording sales</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatRupiah(stats.totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today&apos;s sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatRupiah(stats.todayRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.salesCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">COGS / Net</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">COGS: {formatRupiah(stats.totalCogs)}</p>
                <p className="text-lg font-bold">Net: {formatRupiah(stats.netWorth)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue (last 14 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [formatRupiah(v), "Revenue"]} labelFormatter={(l) => `Date: ${l}`} />
                    <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>By customer type</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byCustomerType.map((row) => (
                      <TableRow key={row.type}>
                        <TableCell className="capitalize">{row.type}</TableCell>
                        <TableCell className="text-right">{row.count}</TableCell>
                        <TableCell className="text-right">{formatRupiah(row.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>By payment method</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byPaymentMethod.map((row) => (
                      <TableRow key={row.method}>
                        <TableCell className="capitalize">{row.method}</TableCell>
                        <TableCell className="text-right">{row.count}</TableCell>
                        <TableCell className="text-right">{formatRupiah(row.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Most popular products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {popularProducts.map((row) => (
                    <TableRow key={row.sku}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{row.sku}</TableCell>
                      <TableCell className="text-right">{row.quantity}</TableCell>
                      <TableCell className="text-right">{formatRupiah(row.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent sales</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(s.createdAt), "dd MMM yyyy, HH:mm")}
                      </TableCell>
                      <TableCell className="capitalize">{s.customerType.replace(/-/g, " ")}</TableCell>
                      <TableCell className="capitalize">{s.paymentMethod.replace(/-/g, " ")}</TableCell>
                      <TableCell className="text-right font-medium">{formatRupiah(s.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
