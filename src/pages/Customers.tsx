import { useMemo, useState } from "react";
import {
  Users,
  Search,
  Phone,
  MapPin,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSales, useProducts, useCustomers, useAddCustomer, useUpdateCustomer, useDeleteCustomer } from "@/lib/queries";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Customer, Sale } from "@/types";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

interface CustomerAnalytics {
  customer: Customer;
  totalSpent: number;
  purchaseCount: number;
  favoriteProducts: Array<{ productId: string; name: string; quantity: number; spent: number }>;
  lastPurchase?: string;
  sales: Sale[];
}

interface FormData {
  name: string;
  phone: string;
  address: string;
}

export default function Customers() {
  const { data: allCustomers = [] } = useCustomers();
  const { data: sales = [] } = useSales();
  const { data: products = [] } = useProducts();
  
  const addCustomer = useAddCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    address: "",
  });

  // Build customer analytics combining DB customers with sales data
  const customerAnalytics = useMemo(() => {
    const analyticsMap = new Map<string, CustomerAnalytics>();

    // Add all DB customers first
    allCustomers.forEach((customer) => {
      analyticsMap.set(customer.id, {
        customer,
        totalSpent: 0,
        purchaseCount: 0,
        favoriteProducts: [],
        sales: [],
      });
    });

    // Aggregate sales data
    sales.forEach((sale) => {
      const customerId = sale.customerId;
      if (customerId && analyticsMap.has(customerId)) {
        const analytics = analyticsMap.get(customerId)!;
        analytics.totalSpent += sale.totalAmount || 0;
        analytics.purchaseCount += 1;
        analytics.lastPurchase = sale.createdAt;
        analytics.sales.push(sale);

        // Track favorite products
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
      }
    });

    return Array.from(analyticsMap.values()).sort(
      (a, b) => b.totalSpent - a.totalSpent
    );
  }, [allCustomers, sales, products]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customerAnalytics;

    return customerAnalytics.filter((c) =>
      c.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customer.phone?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customerAnalytics, searchQuery]);

  const totalCustomers = allCustomers.length;
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

  // Form handlers
  const resetForm = () => {
    setFormData({ name: "", phone: "", address: "" });
    setIsEditing(false);
  };

  const handleAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      address: customer.address || "",
    });
    setSelectedCustomer(customer);
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (customer: Customer) => {
    setDeleteTarget(customer);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Customer name is required", variant: "destructive" });
      return;
    }

    try {
      if (isEditing && selectedCustomer) {
        await updateCustomer.mutateAsync({
          id: selectedCustomer.id,
          updates: {
            name: formData.name,
            phone: formData.phone || undefined,
            address: formData.address || undefined,
          },
        });
        toast({ title: "Customer updated successfully" });
      } else {
        await addCustomer.mutateAsync({
          name: formData.name,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
        });
        toast({ title: "Customer added successfully" });
      }
      setIsFormOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCustomer.mutateAsync(deleteTarget.id);
      toast({ title: "Customer deleted successfully" });
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
  };

  const selectedCustomerAnalytics = selectedCustomer
    ? customerAnalytics.find((c) => c.customer.id === selectedCustomer.id)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-header">Customers</h1>
          <p className="page-description">Manage customers and track purchases</p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
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
            <p className="text-xs text-muted-foreground">Active customers</p>
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
            <p className="text-xs text-muted-foreground">Average spending</p>
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
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                    No customers yet
                  </TableCell>
                </TableRow>
              ) : (
                topCustomers.map((analytics) => (
                  <TableRow
                    key={analytics.customer.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetails(analytics.customer)}
                  >
                    <TableCell className="font-medium">{analytics.customer.name}</TableCell>
                    <TableCell className="text-right">{analytics.purchaseCount}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatRupiah(analytics.totalSpent)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(analytics.totalSpent / Math.max(analytics.purchaseCount, 1))}
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
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                  filteredCustomers.map((analytics) => (
                    <TableRow key={analytics.customer.id}>
                      <TableCell className="font-medium">{analytics.customer.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {analytics.customer.phone || "—"}
                      </TableCell>
                      <TableCell className="text-right">{analytics.purchaseCount}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatRupiah(analytics.totalSpent)}
                      </TableCell>
                      <TableCell className="text-right gap-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(analytics.customer)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(analytics.customer)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(analytics.customer)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Add/Edit Customer Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Customer" : "Add New Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input
                placeholder="Enter customer name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                placeholder="Enter address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFormSubmit}>
              {isEditing ? "Update" : "Add"} Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>

          {selectedCustomerAnalytics && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="text-lg font-semibold">{selectedCustomerAnalytics.customer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="text-lg font-semibold">{selectedCustomerAnalytics.customer.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="text-lg font-semibold">{selectedCustomerAnalytics.customer.address || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-lg font-semibold">
                    {formatRupiah(selectedCustomerAnalytics.totalSpent)}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Total Purchases</p>
                    <p className="text-2xl font-bold">{selectedCustomerAnalytics.purchaseCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Average Order</p>
                    <p className="text-2xl font-bold">
                      {formatRupiah(
                        selectedCustomerAnalytics.totalSpent / Math.max(selectedCustomerAnalytics.purchaseCount, 1)
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">Last Purchase</p>
                    <p className="text-lg font-bold">
                      {selectedCustomerAnalytics.lastPurchase
                        ? format(new Date(selectedCustomerAnalytics.lastPurchase), "dd MMM")
                        : "N/A"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {selectedCustomerAnalytics.purchaseCount > 0 && (
                <>
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
                          {selectedCustomerAnalytics.favoriteProducts.map((product) => (
                            <TableRow key={product.productId}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell className="text-right">{product.quantity}</TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatRupiah(product.spent)}
                              </TableCell>
                            </TableRow>
                          ))}
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
                          {[...selectedCustomerAnalytics.sales]
                            .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
                            .map((sale) => (
                              <TableRow key={sale.id}>
                                <TableCell className="text-sm">
                                  {format(new Date(sale.createdAt || ""), "dd MMM yyyy, HH:mm")}
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
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
