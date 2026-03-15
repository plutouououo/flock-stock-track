import { useMemo, useState } from "react";
import { Package, Plus, Search, Pencil, Trash2, Upload, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProductFormDialog, type ProductFormValues } from "@/components/ProductFormDialog";
import { useQueryClient } from "@tanstack/react-query";
import { useProducts, useAddProduct, useUpdateProduct, useDeleteProduct, queryKeys } from "@/lib/queries";
import { getProductStock, addProduct as addProductStorage } from "@/lib/storage";
import { parseProductXls, type ProductImportRow } from "@/lib/import-xls";
import type { Product } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(s: string): string {
  return new Date(s).toISOString().slice(0, 10);
}

export default function Products() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useProducts();
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [importing, setImporting] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleSubmit = (values: ProductFormValues) => {
    const now = new Date().toISOString();
    if (editingProduct) {
      const batches = values.batches.map((b) => ({
        id: crypto.randomUUID(),
        quantity: b.quantity,
        expiryDate: b.expiryDate,
        receivedAt: now,
      }));
      updateProduct.mutate(
        {
          id: editingProduct.id,
          updates: {
            name: values.name,
            price: values.price,
            threshold: values.threshold,
            imageUrl: values.imageUrl || undefined,
            batches,
          },
        },
        {
          onSuccess: () => {
            toast({ title: "Product updated" });
            setDialogOpen(false);
            setEditingProduct(null);
          },
          onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
        }
      );
    } else {
      const batches = values.batches.map((b) => ({
        id: crypto.randomUUID(),
        quantity: b.quantity,
        expiryDate: b.expiryDate,
        receivedAt: now,
      }));
      addProduct.mutate(
        {
          name: values.name,
          sku: values.sku,
          price: values.price,
          threshold: values.threshold,
          imageUrl: values.imageUrl || undefined,
          batches,
        },
        {
          onSuccess: () => {
            toast({ title: "Product added" });
            setDialogOpen(false);
            setEditingProduct(null);
          },
          onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
        }
      );
    }
  };

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setDialogOpen(true);
  };

  const handleDelete = (p: Product) => {
    if (getProductStock(p) > 0) {
      toast({
        title: "Cannot delete",
        description: "Reduce stock to zero first or remove batches.",
        variant: "destructive",
      });
      return;
    }
    setDeleteTarget(p);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteProduct.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({ title: "Product deleted" });
        setDeleteTarget(null);
      },
      onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    e.target.value = "";
    try {
      const rows: ProductImportRow[] = await parseProductXls(file);
      if (rows.length === 0) {
        toast({ title: "No valid rows", description: "Check column names: name, sku, price, threshold, quantity, expiryDate", variant: "destructive" });
        return;
      }
      const existingSkus = new Set(products.map((p) => p.sku.toLowerCase()));
      let added = 0;
      let skipped = 0;
      const now = new Date().toISOString();
      for (const row of rows) {
        if (existingSkus.has(row.sku.toLowerCase())) {
          skipped++;
          continue;
        }
        addProductStorage({
          name: row.name,
          sku: row.sku,
          price: row.price,
          threshold: row.threshold,
          batches: [
            {
              id: crypto.randomUUID(),
              quantity: row.quantity,
              expiryDate: row.expiryDate,
              receivedAt: now,
            },
          ],
        });
        existingSkus.add(row.sku.toLowerCase());
        added++;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
      toast({
        title: "Import done",
        description: `Added ${added} product(s)${skipped ? `, skipped ${skipped} duplicate SKU(s)` : ""}.`,
      });
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-header">Products</h1>
          <p className="page-description">Manage your poultry product catalog</p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={handleImport}
              disabled={importing}
            />
            <Button variant="outline" className="gap-2" asChild>
              <span>
                <Upload className="h-4 w-4" />
                Import XLS
              </span>
            </Button>
          </label>
          <Button
            className="gap-2"
            onClick={() => {
              setEditingProduct(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or SKU..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card-elevated-md overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="h-12 w-12 mb-4 opacity-30" />
            <p className="font-medium">No products yet</p>
            <p className="text-sm mt-1">
              Add products manually or import from an XLS file (columns: name, sku, price, threshold, quantity, expiryDate)
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Threshold</TableHead>
                <TableHead className="text-center">Batches / Expiry</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const stock = getProductStock(p);
                const lowStock = p.threshold > 0 && stock <= p.threshold;
                const sortedBatches = [...p.batches].sort(
                  (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
                );
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Avatar className="h-10 w-10 rounded-md">
                        <AvatarImage src={p.imageUrl} alt={p.name} className="object-cover" />
                        <AvatarFallback className="rounded-md bg-muted text-xs">
                          {p.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <span className={cn(lowStock && "font-medium text-warning")}>{p.name}</span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{p.sku}</TableCell>
                    <TableCell className="text-right">{formatRupiah(p.price)}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn(lowStock && "text-warning font-medium")}>
                        {stock}
                        {lowStock && <AlertTriangle className="inline h-3.5 w-3 ml-1 text-warning" />}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{p.threshold}</TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {sortedBatches.length === 0
                        ? "—"
                        : sortedBatches.slice(0, 2).map((b) => (
                            <span key={b.id} className="block">
                              {b.quantity} → {formatDate(b.expiryDate)}
                            </span>
                          ))}
                      {sortedBatches.length > 2 && (
                        <span className="block">+{sortedBatches.length - 2} more</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(p)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(p)}
                          title="Delete"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingProduct(null);
        }}
        product={editingProduct}
        onSubmit={handleSubmit}
        isSubmitting={addProduct.isPending || updateProduct.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{deleteTarget?.name}" ({deleteTarget?.sku}). Stock must be zero to delete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
