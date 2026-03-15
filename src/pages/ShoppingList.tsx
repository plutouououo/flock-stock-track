import { useMemo } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useProducts, useShoppingList, useAddShoppingListItem, useUpdateShoppingList, useRemoveShoppingListItem } from "@/lib/queries";
import { getProductStock } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function ShoppingList() {
  const { data: products = [] } = useProducts();
  const { data: list = [] } = useShoppingList();
  const addItem = useAddShoppingListItem();
  const updateList = useUpdateShoppingList();
  const removeItem = useRemoveShoppingListItem();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState("1");

  const lowStockProducts = useMemo(
    () =>
      products
        .filter((p) => p.threshold > 0 && getProductStock(p) <= p.threshold)
        .sort((a, b) => getProductStock(a) - getProductStock(b)),
    [products]
  );

  const handleAdd = () => {
    const product = products.find((p) => p.id === selectedProductId);
    const qty = parseInt(quantity, 10);
    if (!product || !qty || qty < 1) {
      toast({ title: "Select a product and quantity", variant: "destructive" });
      return;
    }
    addItem.mutate(
      {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: qty,
      },
      {
        onSuccess: () => {
          toast({ title: "Added to shopping list" });
          setAddOpen(false);
          setSelectedProductId("");
          setQuantity("1");
        },
        onError: (e) => toast({ title: "Error", description: String(e), variant: "destructive" }),
      }
    );
  };

  const toggleChecked = (id: string, checked: boolean) => {
    updateList.mutate([{ id, checked }]);
  };

  const handleRemove = (id: string) => {
    removeItem.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-header">Shopping List</h1>
          <p className="page-description">Plan your restocking orders</p>
        </div>
        <Button className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      <div className="card-elevated-md overflow-hidden">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mb-4 opacity-30" />
            <p className="font-medium">Shopping list is empty</p>
            <p className="text-sm mt-1">
              Add items manually or use suggestions from low-stock products
            </p>
            {lowStockProducts.length > 0 && (
              <Button className="mt-4" variant="outline" onClick={() => setAddOpen(true)}>
                Add from low-stock products
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Done</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item) => (
                <TableRow key={item.id} className={item.checked ? "opacity-60" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={(c) => toggleChecked(item.id, c === true)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="font-mono text-muted-foreground text-sm">{item.sku}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemove(item.id)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {lowStockProducts.length > 0 && (
        <div className="card-elevated-md p-6">
          <h2 className="text-lg font-semibold mb-3">Suggested (low stock)</h2>
          <p className="text-sm text-muted-foreground mb-4">
            These products are at or below their threshold.
          </p>
          <ul className="space-y-2">
            {lowStockProducts.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {p.sku} · Stock: {getProductStock(p)} (threshold: {p.threshold})
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedProductId(p.id);
                    setQuantity(String(Math.max(1, p.threshold - getProductStock(p) + 1)));
                    setAddOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add to list
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to shopping list</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity to order</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={addItem.isPending || !selectedProductId}>
              {addItem.isPending ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
