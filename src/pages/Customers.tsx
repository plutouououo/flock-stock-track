import { useMemo, useState } from "react";
import {
  Users,
  Search,
  ChevronDown,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Plus,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSales, useProducts } from "@/lib/queries";
import { format } from "date-fns";
import type { Customer, Sale } from "@/types";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

interface CustomerAnalytics {
  customer: Customer | { id: string; name: string; phone?: string; address?: string };
  totalSpent: number;
  purchaseCount: number;
  favoriteProducts: Array<{ productId: string; name: string; quantity: number; spent: number }>;
  lastPurchase?: string;
  sales: Sale[];
}

export default function Customers() {
  const { data: sales = [] } = useSales();
  const { data: products = [] } = useProducts();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAnalytics | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Build customer analytics from sales data
  const customerAnalytics = useMemo(() => {
    const customerMap = new Map<string, CustomerAnalytics>();

    sales.forEach((sale) => {
      const customerKey = sale.customerId || sale.customerType || "Walk-in";
      const customerName =
        sale.customerId && customerMap.get(sale.customerId)?.customer.name
          ? (customerMap.get(sale.customerId)?.customer.name as string)
          : sale.customerType || "Walk-in";

      if (!customerMap.has(customerKey)) {
        customerMap.set(customerKey, {
          customer: {
            id: customerKey,
            name: customerName,
            phone: sale.customerId ? "" : undefined,
            address: sale.customerId ? "" : undefined,
          },
          totalSpent: 0,
          purchaseCount: 0,
          favoriteProducts: [],
          sales: [],
        });
      }

      const analytics = customerMap.get(customerKey)!;
      analytics.totalSpent += sale.totalAmount || 0;
      analytics.purchaseCount += 1;
      analytics.lastPurchase = sale.createdAt;
      analytics.sales.push(sale);

      // Track products
      const productMap = new Map<
        string,
        { productId: string; name: string; quantity: number; spent: number }
      >();

      sale.items.forEach((item) => {
        const product = products.find((p) => p.id === item.productId);
        const key = item.productId || "unknown";

        if (!productMap.has(key)) {
          productMap.set(key, {
            productId: key,
            name: product?.name || "Unknown",
            quantity: 0,
            spent: 0,
          });
        }

        const prod = productMap.get(key)!;
        prod.quantity += item.quantity;
        prod.spent += item.totalPrice || 0;
      });

      analytics.favoriteProducts = Array.from(productMap.values()).sort(
        (a, b) => b.spent - a.spent
      );
    });

    return Array.from(customerMap.values()).sort(
      (a, b) => b.totalSpent - a.totalSpent
    );
  }, [sales, products]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customerAnalytics;

    return customerAnalytics.filter((c) =>
      c.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customerAnalytics, searchQuery]);

  const totalCustomers = useMemo(() => customerAnalytics.length, [customerAnalytics]);
  const totalRevenue = useMemo(
    () => customerAnalytics.reduce((sum, c) => sum + c.totalSpent, 0),
    [customerAnalytics]
  );
  const avgCustomerValue = useMemo(
    () => (totalCustomers > 0 ? totalRevenue / totalCustomers : 0),
    [totalCustomers, totalRevenue]
  );

  const topCustomers = useMemo(
    () => [...customerAnalytics].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5),
    [customerAnalytics]
  );

  const handleViewDetails = (customer: CustomerAnalytics) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-header">Customers</h1>
          <p className="page-description">Track customer purchases and spending</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalCustomers}</p>
            <p className="text-xs text-muted-foreground">
              {customerAnalytics.length} unique customer types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatRupiah(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground">From all customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Customer Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatRupiah(avgCustomerValue)}</p>
            <p className="text-xs text-muted-foreground">Average spending per customer</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Top 5 Customers by Spending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Purchases</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="text-right">Avg Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                    No customers yet
                  </TableCell>
                </TableRow>
              ) : (
                topCustomers.map((customer) => (
                  <TableRow
                    key={customer.customer.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetails(customer)}
                  >
                    <TableCell className="font-medium">{customer.customer.name}</TableCell>
                    <TableCell className="text-right">{customer.purchaseCount}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatRupiah(customer.totalSpent)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(customer.totalSpent / customer.purchaseCount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* All Customers */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Customers</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Last Purchase</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {searchQuery ? "No customers match your search" : "No customers yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.customer.id}>
                      <TableCell className="font-medium">{customer.customer.name}</TableCell>
                      <TableCell className="text-right">{customer.purchaseCount}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatRupiah(customer.totalSpent)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {customer.lastPurchase
                          ? format(new Date(customer.lastPurchase), "dd MMM yyyy")
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(customer)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customer Name</p>
                  <p className="text-lg font-semibold">{selectedCustomer.customer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-lg font-semibold">
                    {formatRupiah(selectedCustomer.totalSpent)}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Purchases</p>
                    <p className="text-2xl font-bold">{selectedCustomer.purchaseCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Average Order</p>
                    <p className="text-2xl font-bold">
                      {formatRupiah(selectedCustomer.totalSpent / selectedCustomer.purchaseCount)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Last Purchase</p>
                    <p className="text-lg font-bold">
                      {selectedCustomer.lastPurchase
                        ? format(new Date(selectedCustomer.lastPurchase), "dd MMM")
                        : "N/A"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Favorite Products */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Favorite Products</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty Purchased</TableHead>
                        <TableHead className="text-right">Total Spent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCustomer.favoriteProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                            No products purchased
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedCustomer.favoriteProducts.map((product) => (
                          <TableRow key={product.productId}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-right">{product.quantity}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatRupiah(product.spent)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Purchase History */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Purchase History</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead>Date</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...selectedCustomer.sales]
                        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                        .map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="text-sm">
                              {format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm")}
                            </TableCell>
                            <TableCell className="text-sm">{sale.items.length} item(s)</TableCell>
                            <TableCell className="text-sm capitalize">
                              {sale.paymentMethod?.replace(/-/g, " ") || "N/A"}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatRupiah(sale.totalAmount || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
