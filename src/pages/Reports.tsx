import { useMemo, useState } from "react";
import { BarChart3, TrendingUp, ShoppingCart, DollarSign, Package, Download, Calendar, Edit, Trash2, Eye } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSales, useProducts, useExpenses, useSettings, useCustomers, useDeleteSale, useUpdateSale, useUpdateSaleItems } from "@/lib/queries";
import { format, subDays, startOfDay, startOfWeek, startOfMonth, startOfYear, isWithinInterval } from "date-fns";
import type { Sale, SaleItem } from "@/types";
import * as XLSX from "xlsx";
import { toast } from "sonner";

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
  const { data: customers = [] } = useCustomers();

  // Mutations
  const deleteSaleMutation = useDeleteSale();
  const updateSaleMutation = useUpdateSale();
  const updateSaleItemsMutation = useUpdateSaleItems();

  // State for edit/delete
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDetailEditMode, setIsDetailEditMode] = useState(false);

  // Edit dialog handlers
  const [editedPaymentMethod, setEditedPaymentMethod] = useState<string>("");
  const [editedPaymentNominal, setEditedPaymentNominal] = useState<number>(0);
  const [editedCustomerType, setEditedCustomerType] = useState<string>("");
  const [editedItems, setEditedItems] = useState<SaleItem[]>([]);

  const handleSaveEdit = async () => {
    if (!editingSale) return;
    try {
      await updateSaleMutation.mutateAsync({
        id: editingSale.id,
        updates: {
          paymentMethod: editedPaymentMethod as any,
          paymentNominal: editedPaymentNominal,
          customerType: editedCustomerType as any,
        },
      });

      // Update items if they changed
      if (JSON.stringify(editedItems) !== JSON.stringify(editingSale.items)) {
        await updateSaleItemsMutation.mutateAsync({
          saleId: editingSale.id,
          items: editedItems,
        });
      }

      toast.success("Sale updated successfully");
      setIsDetailEditMode(false);
      setEditingSale(null);
    } catch (error) {
      toast.error("Failed to update sale");
      console.error(error);
    }
  };

  const handleAddItem = () => {
    const newItem: SaleItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      saleId: editingSale?.id,
      productId: "",
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    };
    setEditedItems([...editedItems, newItem]);
  };

  const handleRemoveItem = (itemId: string) => {
    setEditedItems(editedItems.filter(item => item.id !== itemId));
  };

  const handleUpdateItem = (itemId: string, updates: Partial<SaleItem>) => {
    setEditedItems(
      editedItems.map(item => {
        if (item.id === itemId) {
          const updated = { ...item, ...updates };
          // Recalculate total price if product or quantity changed
          if (updates.productId || updates.quantity) {
            const product = products.find(p => p.id === (updates.productId || item.productId));
            const unitPrice = product?.price || updated.unitPrice || 0;
            const quantity = updates.quantity !== undefined ? updates.quantity : item.quantity;
            updated.unitPrice = unitPrice;
            updated.totalPrice = unitPrice * quantity;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleDeleteOpen = (saleId: string) => {
    setDeletingSaleId(saleId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSaleId) return;
    try {
      await deleteSaleMutation.mutateAsync(deletingSaleId);
      toast.success("Sale deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingSaleId(null);
    } catch (error) {
      toast.error("Failed to delete sale");
      console.error(error);
    }
  };

  const handleViewDetails = (sale: Sale) => {
    setViewingSale(sale);
    setEditingSale(sale);
    setEditedPaymentMethod(sale.paymentMethod || "");
    setEditedPaymentNominal(sale.paymentNominal || 0);
    setEditedCustomerType(sale.customerType || "");
    setEditedItems([...sale.items]);
    setIsDetailEditMode(false);
    setIsViewDialogOpen(true);
  };

  const customerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    customers.forEach(c => {
      map[c.id] = c.name;
    });
    return map;
  }, [customers]);

  const productMap = useMemo(() => {
    const map: Record<string, any> = {};
    products.forEach(p => {
      map[p.id] = p;
    });
    return map;
  }, [products]);

  const getDisplayCustomerName = (sale: Sale) => {
    if (sale.customerId && customerNameMap[sale.customerId]) {
      return customerNameMap[sale.customerId];
    }
    return sale.customerType || "Walk-in";
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
    return sales.filter(s => new Date(s.createdAt) >= startDate!);
  }, [sales, dateFilter]);

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalCogs = filteredSales.reduce(
      (sum, s) =>
        sum +
        s.items.reduce((lineSum, item) => lineSum + (item.totalPrice - (item.totalPrice / (1 + 0.1))) || 0, 0), // placeholder COGS calc
      0
    );
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = totalRevenue - totalCogs - totalExpenses;
    const today = format(new Date(), "yyyy-MM-dd");
    const todaySales = filteredSales.filter((s) => s.createdAt.startsWith(today));
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const thisMonth = format(new Date(), "yyyy-MM");
    const monthSales = filteredSales.filter((s) => s.createdAt.startsWith(thisMonth));
    const monthRevenue = monthSales.reduce((sum, s) => sum + s.totalAmount, 0);

    // Month-on-month comparisons (simplified)
    const lastMonth = format(subDays(new Date(), 30), "yyyy-MM");
    const lastMonthSales = sales.filter((s) => s.createdAt.startsWith(lastMonth));
    const lastMonthRevenue = lastMonthSales.reduce((sum, s) => sum + s.totalAmount, 0);
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
      const monthSales = filteredSales.filter(s => s.createdAt.startsWith(month));
      const revenue = monthSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const monthExpenses = expenses.filter(e => e.createdAt.startsWith(month));
      const expense = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      months.push({ month: format(date, "MMM yy"), revenue, expenses: expense });
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
      s.id,
      s.createdAt,
      getDisplayCustomerName(s),
      s.items.length,
      s.totalAmount,
      s.paymentMethod,
      s.shippingCost ? formatRupiah(s.shippingCost) : "-",
    ]);
    salesData.unshift(["Sale ID", "Date", "Customer", "Items Count", "Total", "Payment Method", "Shipping"]);
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
        const key = item.productId;
        if (!map[key]) {
          const product = products.find(p => p.id === item.productId);
          map[key] = { name: product?.name || "Unknown", sku: product?.sku || "N/A", quantity: 0, revenue: 0 };
        }
        map[key].quantity += item.quantity;
        map[key].revenue += item.totalPrice;
      });
    });
    return Object.values(map).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  }, [filteredSales, products]);

  const recentSales = useMemo(
    () => [...filteredSales].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 15),
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
                    <TableHead>Customer Type</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(s.createdAt), "dd MMM yyyy, HH:mm")}
                      </TableCell>
                      <TableCell className="capitalize">{getDisplayCustomerName(s)}</TableCell>
                      <TableCell className="capitalize">{s.paymentMethod.replace(/-/g, " ")}</TableCell>
                      <TableCell className="text-right font-medium">{formatRupiah(s.totalAmount)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(s)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteOpen(s.id)}
                            disabled={deletingSaleId === s.id}
                            title="Delete sale"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Sale</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this sale record? This action cannot be undone, and the stock will be restored.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogCancel disabled={deleteSaleMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={deleteSaleMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteSaleMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogContent>
          </AlertDialog>

          {/* Sale Details Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex justify-between items-center w-full">
                  <DialogTitle>{isDetailEditMode ? "Edit Sale" : "Sale Details"}</DialogTitle>
                  {!isDetailEditMode && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsDetailEditMode(true)}
                      className="ml-auto"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </DialogHeader>

              {viewingSale && (
                <div className="space-y-6">
                  {isDetailEditMode ? (
                    // EDIT MODE
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Customer Type</label>
                        <Select value={editedCustomerType} onValueChange={setEditedCustomerType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Walk-in">Walk-in</SelectItem>
                            <SelectItem value="Online">Online</SelectItem>
                            <SelectItem value="Pre-order">Pre-order</SelectItem>
                            <SelectItem value="Shopee">Shopee</SelectItem>
                            <SelectItem value="Tokopedia">Tokopedia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Payment Method</label>
                        <Select value={editedPaymentMethod} onValueChange={setEditedPaymentMethod}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Transfer">Transfer</SelectItem>
                            <SelectItem value="E-wallet">E-wallet</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Payment Nominal</label>
                        <input
                          type="number"
                          value={editedPaymentNominal}
                          onChange={(e) => setEditedPaymentNominal(Number(e.target.value))}
                          className="w-full px-3 py-2 border rounded-md"
                          placeholder="Enter payment nominal"
                        />
                      </div>

                      {/* Items Section */}
                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-sm font-semibold">Items Sold</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleAddItem}
                          >
                            + Add Item
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {editedItems.map((item, index) => (
                            <div key={item.id} className="flex gap-2">
                              <div className="flex-1 grid gap-2">
                                <div>
                                  <label className="text-xs text-muted-foreground">Product</label>
                                  <Select 
                                    value={item.productId || ""} 
                                    onValueChange={(value) => handleUpdateItem(item.id, { productId: value })}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue placeholder="Select product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {products.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                          {p.name} ({p.sku})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="w-20 grid gap-2">
                                <div>
                                  <label className="text-xs text-muted-foreground">Qty</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateItem(item.id, { quantity: Number(e.target.value) })}
                                    className="w-full px-2 py-1.5 border rounded-md text-sm text-center"
                                  />
                                </div>
                              </div>
                              <div className="w-28 grid gap-2">
                                <div>
                                  <label className="text-xs text-muted-foreground">Total</label>
                                  <div className="px-2 py-1.5 rounded-md bg-muted text-sm font-semibold">
                                    {formatRupiah(item.totalPrice || 0)}
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveItem(item.id)}
                                className="mt-6 h-9"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="text-sm bg-muted/50 p-3 rounded border">
                        <p>Items: {editedItems.length}</p>
                        <p className="font-semibold mt-1">
                          New Total: {formatRupiah(editedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0))}
                        </p>
                      </div>
                    </div>
                  ) : (
                    // VIEW MODE
                    <>
                      {/* Header Information */}
                      <div className="grid grid-cols-2 gap-4 border-b pb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Date & Time</p>
                          <p className="text-lg font-semibold">
                            {format(new Date(viewingSale.createdAt), "dd MMM yyyy, HH:mm:ss")}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Sale ID</p>
                          <p className="text-lg font-mono">{viewingSale.id.slice(0, 8)}...</p>
                        </div>
                      </div>

                      {/* Transaction Information */}
                      <div className="grid grid-cols-2 gap-4 border-b pb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Customer</p>
                          <p className="text-lg font-semibold">{getDisplayCustomerName(viewingSale)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Customer Type</p>
                          <p className="text-lg font-semibold capitalize">{viewingSale.customerType || "N/A"}</p>
                        </div>
                      </div>

                      {/* Payment Information */}
                      <div className="grid grid-cols-2 gap-4 border-b pb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Payment Method</p>
                          <p className="text-lg font-semibold capitalize">{viewingSale.paymentMethod?.replace(/-/g, " ") || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Payment Nominal</p>
                          <p className="text-lg font-semibold">{formatRupiah(viewingSale.paymentNominal || 0)}</p>
                        </div>
                      </div>

                      {viewingSale.shippingCost && (
                        <div className="grid grid-cols-1 gap-4 border-b pb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Shipping Cost</p>
                            <p className="text-lg font-semibold">{formatRupiah(viewingSale.shippingCost)}</p>
                          </div>
                        </div>
                      )}

                      {/* Sales Items */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Items Sold</h3>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted">
                                <TableHead>Product</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {viewingSale.items.map((item) => {
                                const product = productMap[item.productId || ""];
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-medium">
                                      {product?.name || "Unknown Product"}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm text-muted-foreground">
                                      {product?.sku || "N/A"}
                                    </TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">
                                      {formatRupiah(item.unitPrice || 0)}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                      {formatRupiah(item.totalPrice || 0)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Total Summary */}
                      <div className="bg-muted/50 rounded-lg p-4 border">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-muted-foreground">Subtotal ({viewingSale.items.length} items)</span>
                          <span className="font-semibold">
                            {formatRupiah(
                              viewingSale.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
                            )}
                          </span>
                        </div>
                        {viewingSale.shippingCost && (
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-muted-foreground">Shipping Cost</span>
                            <span className="font-semibold">
                              {formatRupiah(viewingSale.shippingCost)}
                            </span>
                          </div>
                        )}
                        <div className="border-t pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold">Total Amount</span>
                            <span className="text-2xl font-bold text-primary">
                              {formatRupiah(viewingSale.totalAmount || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <DialogFooter>
                {isDetailEditMode ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsDetailEditMode(false)}
                      disabled={updateSaleMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      disabled={updateSaleMutation.isPending}
                    >
                      {updateSaleMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsViewDialogOpen(false)}
                  >
                    Close
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
