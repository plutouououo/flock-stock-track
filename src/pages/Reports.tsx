import { useMemo, useState } from "react";
import { BarChart3, TrendingUp, ShoppingCart, DollarSign, Package, Download, Calendar } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSales, useProducts, useExpenses, useSettings } from "@/lib/queries";
import { format, subDays, startOfDay, startOfWeek, startOfMonth, startOfYear, isWithinInterval } from "date-fns";
import type { Sale } from "@/types";
import * as XLSX from "xlsx";

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
  const { data: expenses = [] } = useExpenses();
  const { data: settings = [] } = useSettings();

  const customerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    // Map customer IDs to names - use customer_type as fallback
    return map;
  }, []);

  const getDisplayCustomerName = (sale: Sale) => {
    if (sale.customer_id && customerNameMap[sale.customer_id]) {
      return customerNameMap[sale.customer_id];
    }
    return sale.customer_type || "Walk-in";
  };

  const salesTarget = useMemo(() => {
    const s = settings.find((x) => x.key === "sales_target_daily");
    const v = s ? Number(s.value) : NaN;
    return Number.isFinite(v) && v > 0 ? v : 50000; // fallback default
  }, [settings]);

  const [dateFilter, setDateFilter] = useState<string>("all");

  const filteredSales = useMemo(() => {
    const now = new Date();
    let startDate: Date | null = null;
    switch (dateFilter) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "week":
        startDate = startOfWeek(now);
        break;
      case "month":
        startDate = startOfMonth(now);
        break;
      case "year":
        startDate = startOfYear(now);
        break;
      default:
        return sales; // all
    }
    return sales.filter(s => new Date(s.created_at) >= startDate!);
  }, [sales, dateFilter]);

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total_amount, 0);
    const totalCogs = filteredSales.reduce(
      (sum, s) =>
        sum +
        s.items.reduce((lineSum, item) => lineSum + (item.total_price - (item.total_price / (1 + 0.1))) || 0, 0), // placeholder COGS calc
      0
    );
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = totalRevenue - totalCogs - totalExpenses;
    const today = format(new Date(), "yyyy-MM-dd");
    const todaySales = filteredSales.filter((s) => s.created_at.startsWith(today));
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.total_amount, 0);
    const thisMonth = format(new Date(), "yyyy-MM");
    const monthSales = filteredSales.filter((s) => s.created_at.startsWith(thisMonth));
    const monthRevenue = monthSales.reduce((sum, s) => sum + s.total_amount, 0);

    // Month-on-month comparisons (simplified)
    const lastMonth = format(subDays(new Date(), 30), "yyyy-MM");
    const lastMonthSales = sales.filter((s) => s.created_at.startsWith(lastMonth));
    const lastMonthRevenue = lastMonthSales.reduce((sum, s) => sum + s.total_amount, 0);
    const momRevenuePercent = lastMonthRevenue ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
    const momTransactionsPercent = lastMonthSales.length ? ((filteredSales.length - lastMonthSales.length) / lastMonthSales.length) * 100 : 0;
    const momTodaySalesPercent = lastMonthSales.length ? ((todaySales.length - lastMonthSales.length) / lastMonthSales.length) * 100 : 0; // placeholder

    const targetAchievement = (todayRevenue / salesTarget) * 100;

    return {
      totalRevenue,
      totalCogs,
      totalExpenses,
      profit,
      todayRevenue,
      monthRevenue,
      salesCount: filteredSales.length,
      momRevenuePercent,
      momTransactionsPercent,
      momTodaySalesPercent,
      targetAchievement,
    };
  }, [filteredSales, expenses, sales, salesTarget]);

  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subDays(new Date(), i * 30);
      const month = format(date, "yyyy-MM");
      const monthSales = filteredSales.filter(s => s.created_at.startsWith(month));
      const revenue = monthSales.reduce((sum, s) => sum + s.total_amount, 0);
      const monthExpenses = expenses.filter(e => e.created_at.startsWith(month));
      const expense = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      months.push({ month: format(date, "MMM"), revenue, expenses: expense });
    }
    return months;
  }, [filteredSales, expenses]);

  const expenseBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const category = e.type || "Other";
      map[category] = (map[category] || 0) + e.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const exportToXlsx = () => {
    const wb = XLSX.utils.book_new();
    const summaryData = [
      ["Metric", "Value"],
      ["Total Revenue", stats.totalRevenue],
      ["Total COGS", stats.totalCogs],
      ["Total Expenses", stats.totalExpenses],
      ["Profit", stats.profit],
      ["Today's Revenue", stats.todayRevenue],
      ["Month Revenue", stats.monthRevenue],
      ["Total Transactions", stats.salesCount],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    const salesData = filteredSales.map(s => [
      s.created_at,
      getDisplayCustomerName(s),
      s.items.length,
      s.total_amount,
      s.payment_method,
    ]);
    salesData.unshift(["Date", "Customer", "Items Count", "Total", "Payment Method"]);
    const wsSales = XLSX.utils.aoa_to_sheet(salesData);
    XLSX.utils.book_append_sheet(wb, wsSales, "Sales Details");
    XLSX.writeFile(wb, `reports-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  // Removed - no longer used in new Reports layout

  // Removed - no longer used in new Reports layout

  const popularProducts = useMemo(() => {
    const map: Record<string, { name: string; sku: string; quantity: number; revenue: number }> = {};
    filteredSales.forEach((s) => {
      s.items.forEach((item) => {
        const key = item.product_id;
        if (!map[key]) {
          const product = products.find(p => p.id === item.product_id);
          map[key] = { name: product?.name || "Unknown", sku: product?.sku || "N/A", quantity: 0, revenue: 0 };
        }
        map[key].quantity += item.quantity;
        map[key].revenue += item.total_price;
      });
    });
    return Object.values(map).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  }, [filteredSales, products]);

  const recentSales = useMemo(
    () => [...filteredSales].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 15),
    [filteredSales]
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-header">Sales Reports</h1>
          <p className="page-description">Track revenue, profit, and business performance</p>
        </div>
        <div className="flex gap-4">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToXlsx}>
            <Download className="w-4 h-4 mr-2" />
            Export XLSX
          </Button>
        </div>
      </div>

      {filteredSales.length === 0 ? (
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
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatRupiah(stats.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.momRevenuePercent > 0 ? "+" : ""}{stats.momRevenuePercent.toFixed(1)}% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatRupiah(stats.profit)}</p>
                <p className="text-xs text-muted-foreground">Revenue - COGS - Expenses</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatRupiah(stats.todayRevenue)}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.targetAchievement.toFixed(1)}% of daily target
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.salesCount}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.momTransactionsPercent > 0 ? "+" : ""}{stats.momTransactionsPercent.toFixed(1)}% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => [formatRupiah(v), "Amount"]} />
                      <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expenseBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [formatRupiah(v), "Amount"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
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
                        {format(new Date(s.created_at), "dd MMM yyyy, HH:mm")}
                      </TableCell>
                      <TableCell className="capitalize">{getDisplayCustomerName(s)}</TableCell>
                      <TableCell className="capitalize">{s.payment_method.replace(/-/g, " ")}</TableCell>
                      <TableCell className="text-right font-medium">{formatRupiah(s.total_amount)}</TableCell>
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
