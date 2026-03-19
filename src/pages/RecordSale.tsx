import { useState, useMemo, useEffect } from "react";
import { ShoppingCart, Plus, Minus, Wallet, User, Download } from "lucide-react";
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
import { supabase } from "@/lib/supabase";
import type { Product } from "@/types";
import type { CustomerType, PaymentMethod } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";

const CUSTOMER_TYPES: { value: CustomerType; label: string }[] = [
  { value: "Walk-in", label: "Walk-in" },
  { value: "Online", label: "Online" },
  { value: "Pre-order", label: "Pre-order" },
  { value: "Shopee", label: "Shopee" },
  { value: "Tokopedia", label: "Tokopedia" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "Cash", label: "Cash" },
  { value: "Transfer", label: "Transfer" },
  { value: "E-wallet", label: "E-wallet" },
];

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

type CartLine = { product: Product; quantity: number };

// Custom hook untuk mengelola stock products
function useProductsWithStock() {
  const { data: products = [], isLoading } = useProducts();
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

  const getProductsWithStock = (searchQuery: string): Product[] => {
    return products.filter((p) => 
      getStock(p.id) > 0 && 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return {
    products,
    isLoading: isLoading || loadingStock,
    getStock,
    getProductsWithStock,
  };
}

export default function RecordSale() {
  const { products, isLoading, getStock, getProductsWithStock } = useProductsWithStock();
  const recordSale = useRecordSale();
  const { toast } = useToast();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerType, setCustomerType] = useState<CustomerType>("Walk-in");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [paymentNominal, setPaymentNominal] = useState<string>("");
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  const availablePaymentMethods = useMemo(() => {
    if (customerType === "Walk-in") return PAYMENT_METHODS;
    // Online, Pre-order, Shopee, Tokopedia: only Transfer and E-wallet
    return PAYMENT_METHODS.filter(m => m.value !== "Cash");
  }, [customerType]);

  // Reset payment method if not available
  useEffect(() => {
    if (!availablePaymentMethods.find(m => m.value === paymentMethod)) {
      setPaymentMethod(availablePaymentMethods[0]?.value || "Transfer");
    }
  }, [customerType, paymentMethod, availablePaymentMethods]);

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
    [cart]
  );

  const productsWithStock = useMemo(
    () => getProductsWithStock(productSearch),
    [getProductsWithStock, productSearch]
  );

  const addToCart = async (product: Product, qty: number) => {
    const stock = getStock(product.id);
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
    const stock = getStock(productId);
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

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    if (paymentMethod === "Cash" && (!paymentNominal || parseFloat(paymentNominal) < total)) {
      toast({ title: "Cash payment must be >= total amount", variant: "destructive" });
      return;
    }

    // Generate receipt
    const receiptDataUrl = await generateReceipt();

    recordSale.mutate(
      {
        cashier_id: currentUserId || undefined,
        customer_id: undefined,
        customer_type: customerType,
        payment_method: paymentMethod,
        payment_nominal: paymentMethod === "Cash" ? parseFloat(paymentNominal) : undefined,
        total_amount: total,
        receipt_url: receiptDataUrl,
        items: cart.map((line) => ({
          product_id: line.product.id,
          quantity: line.quantity,
          unit_price: line.product.price,
          total_price: line.product.price * line.quantity,
        })),
      },
      {
        onSuccess: (sale) => {
          toast({ title: "Sale recorded" });
          setCart([]);
          setCustomerType("Walk-in");
          setPaymentMethod("Cash");
          setPaymentNominal("");
          setReceiptUrl(receiptDataUrl);
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

  const generateReceipt = async (): Promise<string> => {
    const receiptElement = document.createElement("div");
    receiptElement.innerHTML = `
      <div style="font-family: monospace; width: 300px; padding: 20px; border: 1px solid #000;">
        <h2 style="text-align: center;">AJ33 Receipt</h2>
        <p>Date: ${new Date().toLocaleString()}</p>
        <p>Customer: ${customerType}</p>
        <p>Payment: ${paymentMethod}</p>
        <table style="width: 100%;">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            ${cart.map(line => `
              <tr>
                <td>${line.product.name}</td>
                <td>${line.quantity}</td>
                <td>${formatRupiah(line.product.price * line.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p>Total: ${formatRupiah(total)}</p>
        <p>Thank you!</p>
      </div>
    `;
    document.body.appendChild(receiptElement);
    const canvas = await html2canvas(receiptElement);
    document.body.removeChild(receiptElement);
    return canvas.toDataURL("image/jpeg");
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
            <div className="mb-4">
              <Input
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading products…</p>
            ) : productsWithStock.length === 0 ? (
              <p className="text-muted-foreground text-sm">No products in stock. Add stock in Products.</p>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {productsWithStock.map((p) => {
                  const stock = getStock(p.id);
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
                    {cart.map((line) => {
                      const stock = getStock(line.product.id);
                      return (
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
                                disabled={line.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center">{line.quantity}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setCartQty(line.product.id, line.quantity + 1)}
                                disabled={line.quantity >= stock}
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
                      );
                    })}
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
                  {availablePaymentMethods.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={`pm-${opt.value}`} />
                      <Label htmlFor={`pm-${opt.value}`} className="font-normal cursor-pointer">
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {paymentMethod === "Cash" && (
                  <div className="space-y-2">
                    <Label>Cash received</Label>
                    <Input
                      type="number"
                      placeholder="Enter cash amount"
                      value={paymentNominal}
                      onChange={(e) => setPaymentNominal(e.target.value)}
                    />
                  </div>
                )}
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
              {receiptUrl && (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = receiptUrl;
                    link.download = `receipt-${Date.now()}.jpg`;
                    link.click();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Receipt
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}