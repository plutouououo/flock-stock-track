import { useState, useMemo } from "react";
import { ShoppingCart, Plus, Minus, Wallet, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProducts, useRecordSale } from "@/lib/queries";
import { getProductStock } from "@/lib/storage";
import type { Product } from "@/types";
import type { CustomerType, PaymentMethod } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CUSTOMER_TYPES: { value: CustomerType; label: string }[] = [
  { value: "walk-in", label: "Walk-in" },
  { value: "online", label: "Online" },
  { value: "pre-order", label: "Pre-order" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Transfer" },
  { value: "e-wallet", label: "E-wallet" },
];

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

type CartLine = { product: Product; quantity: number };

export default function RecordSale() {
  const { data: products = [], isLoading } = useProducts();
  const recordSale = useRecordSale();
  const { toast } = useToast();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerType, setCustomerType] = useState<CustomerType>("walk-in");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});

  const productsWithStock = useMemo(
    () => products.filter((p) => getProductStock(p) > 0),
    [products]
  );

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
    [cart]
  );

  const addToCart = (product: Product, qty: number) => {
    const stock = getProductStock(product);
    if (qty < 1 || qty > stock) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      const newQty = (existing?.quantity ?? 0) + qty;
      if (newQty > stock) return prev;
      const rest = prev.filter((l) => l.product.id !== product.id);
      if (newQty === 0) return rest;
      return [...rest, { product, quantity: newQty }];
    });
    setQtyInputs((prev) => ({ ...prev, [product.id]: "" }));
  };

  const setCartQty = (productId: string, quantity: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const stock = getProductStock(product);
    const qty = Math.max(0, Math.min(quantity, stock));
    setCart((prev) => {
      if (qty === 0) return prev.filter((l) => l.product.id !== productId);
      const existing = prev.find((l) => l.product.id === productId);
      if (existing) return prev.map((l) => (l.product.id === productId ? { ...l, quantity: qty } : l));
      return [...prev, { product, quantity: qty }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  };

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    recordSale.mutate(
      {
        items: cart.map((line) => ({
          productId: line.product.id,
          sku: line.product.sku,
          productName: line.product.name,
          quantity: line.quantity,
          unitPrice: line.product.price,
        })),
        customerType,
        paymentMethod,
        total,
      },
      {
        onSuccess: () => {
          toast({ title: "Sale recorded" });
          setCart([]);
          setCustomerType("walk-in");
          setPaymentMethod("cash");
        },
        onError: (e) => {
          toast({
            title: "Error",
            description: e instanceof Error ? e.message : String(e),
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Record Sale</h1>
        <p className="page-description">Create a new sales transaction</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Product list with stock + add to cart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Products (current stock)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading products…</p>
            ) : productsWithStock.length === 0 ? (
              <p className="text-muted-foreground text-sm">No products in stock. Add stock in Products.</p>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {productsWithStock.map((p) => {
                  const stock = getProductStock(p);
                  const qtyStr = qtyInputs[p.id] ?? "";
                  const qty = parseInt(qtyStr, 10) || 0;
                  return (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{p.sku} · Stock: {stock}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={stock}
                          placeholder="Qty"
                          className="w-20"
                          value={qtyStr}
                          onChange={(e) => setQtyInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        />
                        <Button
                          size="sm"
                          onClick={() => addToCart(p, qty)}
                          disabled={qty < 1 || qty > stock}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Cart + customer & payment + total */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cart</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add products from the list</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((line) => (
                      <TableRow key={line.product.id}>
                        <TableCell>
                          <span className="font-medium">{line.product.name}</span>
                          <span className="text-muted-foreground font-mono text-xs block">{line.product.sku}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setCartQty(line.product.id, line.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{line.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                setCartQty(line.product.id, line.quantity + 1)
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatRupiah(line.product.price)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatRupiah(line.product.price * line.quantity)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeFromCart(line.product.id)}
                          >
                            ×
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer & payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Customer type</Label>
                <RadioGroup
                  value={customerType}
                  onValueChange={(v) => setCustomerType(v as CustomerType)}
                  className="flex flex-wrap gap-4"
                >
                  {CUSTOMER_TYPES.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={`ct-${opt.value}`} />
                      <Label htmlFor={`ct-${opt.value}`} className="font-normal cursor-pointer">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Payment method
                </Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                  className="flex flex-wrap gap-4"
                >
                  {PAYMENT_METHODS.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={`pm-${opt.value}`} />
                      <Label htmlFor={`pm-${opt.value}`} className="font-normal cursor-pointer">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatRupiah(total)}</span>
              </div>
              <Button
                className="w-full mt-4"
                size="lg"
                onClick={handleCompleteSale}
                disabled={cart.length === 0 || recordSale.isPending}
              >
                {recordSale.isPending ? "Recording…" : "Complete sale"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
