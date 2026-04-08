import { useState, useMemo, useEffect } from "react";
import {
  ShoppingCart, Plus, Minus, Wallet, User, Download, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecordSale, useCustomers, useAddCustomer, useAddExpense } from "@/lib/queries";
import { useToast } from "@/hooks/use-toast";
import type { Product, ProductCategory, CustomerType, PaymentMethod } from "@/types";
import {
  CUSTOMER_TYPES,
  PAYMENT_METHODS,
  CATEGORIES,
  CartLine,
  formatRupiah,
  generateReceiptJpg,
} from "../lib/recordSaleUtils";

interface OwnerFlowProps {
  products: Product[];
  isLoading: boolean;
  getStock: (id: string) => number;
  userId: string | null;
}

export function OwnerFlow({
  products,
  isLoading,
  getStock,
  userId,
}: OwnerFlowProps) {
  const recordSale = useRecordSale();
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomers();
  const addCustomer = useAddCustomer();
  const addExpense = useAddExpense();
  const { toast } = useToast();

  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerType, setCustomerType] = useState<CustomerType>("Walk-in");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [paymentNominal, setPaymentNominal] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | "all">("all");

  const total = useMemo(
    () => cart.reduce((s, l) => s + l.product.price * l.quantity, 0),
    [cart]
  );

  const totalWithShipping = useMemo(() => {
    const shipping = parseFloat(shippingCost) || 0;
    return total + shipping;
  }, [total, shippingCost]);

  const change = useMemo(() => {
    const n = parseFloat(paymentNominal);
    return paymentMethod === "Cash" && !isNaN(n) ? Math.max(0, n - totalWithShipping) : 0;
  }, [paymentMethod, paymentNominal, totalWithShipping]);

  const nominalShort = useMemo(() => {
    const n = parseFloat(paymentNominal);
    return paymentMethod === "Cash" && !isNaN(n) && n < totalWithShipping ? totalWithShipping - n : 0;
  }, [paymentMethod, paymentNominal, totalWithShipping]);

  const availablePaymentMethods = useMemo(() =>
    customerType === "Walk-in"
      ? PAYMENT_METHODS
      : PAYMENT_METHODS.filter(m => m.value !== "Cash"),
    [customerType]
  );

  useEffect(() => {
    if (!availablePaymentMethods.find(m => m.value === paymentMethod))
      setPaymentMethod(availablePaymentMethods[0]?.value ?? "Transfer");
  }, [customerType]);

  const productsFiltered = useMemo(() =>
    products.filter(p => {
      const inStock = getStock(p.id) > 0;
      const matchSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase());
      const matchCat = categoryFilter === "all" || p.category === categoryFilter;
      return inStock && matchSearch && matchCat;
    }),
    [products, productSearch, categoryFilter, getStock]
  );

  const addToCart = (product: Product, qty: number) => {
    const stock = getStock(product.id);
    if (qty < 1 || qty > stock) return;
    setCart(prev => {
      const existing = prev.find(l => l.product.id === product.id);
      const newQty = (existing?.quantity ?? 0) + qty;
      if (newQty > stock) return prev;
      const rest = prev.filter(l => l.product.id !== product.id);
      return newQty === 0 ? rest : [...rest, { product, quantity: newQty }];
    });
    setQtyInputs(prev => ({ ...prev, [product.id]: "" }));
  };

  const setCartQty = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const qty = Math.max(0, Math.min(quantity, getStock(productId)));
    setCart(prev => {
      if (qty === 0) return prev.filter(l => l.product.id !== productId);
      return prev.map(l => l.product.id === productId ? { ...l, quantity: qty } : l);
    });
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast({ title: "Keranjang kosong", variant: "destructive" });
      return;
    }

    if (paymentMethod === "Cash") {
      const n = parseFloat(paymentNominal);
      if (!paymentNominal || isNaN(n) || n < totalWithShipping) {
        toast({ title: "Jumlah cash kurang dari total", variant: "destructive" });
        return;
      }
    }

    const shippingCostValue = parseFloat(shippingCost) || 0;
    const receiptDataUrl = await generateReceiptJpg(
      cart, customerType, paymentMethod, paymentNominal, totalWithShipping, change, shippingCostValue > 0 ? shippingCostValue : undefined,
    );

    recordSale.mutate(
      {
        cashierId: userId ?? undefined,
        customerId: selectedCustomerId && selectedCustomerId !== "walk" ? selectedCustomerId : undefined,
        customerType: customerType,
        paymentMethod: paymentMethod,
        paymentNominal: paymentMethod === "Cash" ? parseFloat(paymentNominal) : undefined,
        totalAmount: totalWithShipping,
        shippingCost: shippingCostValue > 0 ? shippingCostValue : undefined,
        receiptUrl: receiptDataUrl,
        items: cart.map(l => ({
          id: crypto.randomUUID(),
          productId: l.product.id,
          quantity: l.quantity,
          unitPrice: l.product.price,
          totalPrice: l.product.price * l.quantity,
        })),
      },
      {
        onSuccess: () => {
          // Add shipping expense if shipping cost > 0
          if (shippingCostValue > 0) {
            addExpense.mutate({
              type: "Shipping",
              date: new Date().toISOString().split('T')[0],
              description: `Shipping cost for ${customerType}`,
              amount: shippingCostValue,
              createdAt: new Date().toISOString(),
            });
          }
          toast({ title: "Penjualan berhasil dicatat" });
          setCart([]);
          setPaymentNominal("");
          setShippingCost("");
          setCustomerType("Walk-in");
          setSelectedCustomerId(null);
          setPaymentMethod("Cash");
          setReceiptUrl(receiptDataUrl);
        },
        onError: (e) => toast({
          title: "Error",
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive",
        }),
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Products (current stock)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search products..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    categoryFilter === cat.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-foreground"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : productsFiltered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada produk.</p>
            ) : (
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {productsFiltered.map(p => {
                  const stock = getStock(p.id);
                  const qtyStr = qtyInputs[p.id] ?? "";
                  const qty = parseInt(qtyStr, 10) || 0;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {p.sku} · Stok: {stock}
                          {p.category && <span className="ml-1">· {p.category}</span>}
                        </p>
                        <p className="text-xs font-medium">{formatRupiah(p.price)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          type="number"
                          min={1}
                          max={stock}
                          placeholder="Qty"
                          className="w-20"
                          value={qtyStr}
                          onChange={e => setQtyInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && addToCart(p, qty)}
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

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cart</CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tambah produk dari daftar</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Harga</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map(line => {
                      const stock = getStock(line.product.id);
                      return (
                        <TableRow key={line.product.id}>
                          <TableCell>
                            <span className="font-medium">{line.product.name}</span>
                            <span className="font-mono text-xs text-muted-foreground block">
                              {line.product.sku}
                            </span>
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
                          <TableCell className="text-right text-muted-foreground text-sm">
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
                              onClick={() => setCart(prev => prev.filter(l => l.product.id !== line.product.id))}
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
                <Label className="font-semibold">Pelanggan</Label>
                {!showNewCustomerForm ? (
                  <div className="space-y-2">
                    <Select value={selectedCustomerId || ""} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih pelanggan..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="walk">Tidak ada (Walk-in)</SelectItem>
                        {customers.map((cust) => (
                          <SelectItem key={cust.id} value={cust.id}>
                            {cust.name} {cust.phone ? `• ${cust.phone}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowNewCustomerForm(true)}
                    >
                      + Tambah Pelanggan Baru
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                    <div className="space-y-2">
                      <Label className="text-xs">Nama Pelanggan</Label>
                      <Input
                        placeholder="Masukkan nama"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">No. Telepon (opsional)</Label>
                      <Input
                        type="tel"
                        placeholder="Masukkan nomor telepon"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        disabled={!newCustomerName.trim() || addCustomer.isPending}
                        onClick={async () => {
                          try {
                            const newCustomer = await addCustomer.mutateAsync({
                              name: newCustomerName.trim(),
                              phone: newCustomerPhone.trim() || undefined,
                            });
                            setSelectedCustomerId(newCustomer.id);
                            setNewCustomerName("");
                            setNewCustomerPhone("");
                            setShowNewCustomerForm(false);
                            toast({
                              title: "Pelanggan ditambahkan",
                              description: `${newCustomer.name} berhasil ditambahkan.`,
                            });
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: error instanceof Error ? error.message : "Gagal menambah pelanggan",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Simpan
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowNewCustomerForm(false);
                          setNewCustomerName("");
                          setNewCustomerPhone("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Tipe pelanggan</Label>
                <RadioGroup
                  value={customerType}
                  onValueChange={v => setCustomerType(v as CustomerType)}
                  className="flex flex-wrap gap-4"
                >
                  {CUSTOMER_TYPES.map(opt => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={`ct-${opt.value}`} />
                      <Label
                        htmlFor={`ct-${opt.value}`}
                        className="font-normal cursor-pointer"
                      >
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Metode pembayaran
                </Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={v => setPaymentMethod(v as PaymentMethod)}
                  className="flex flex-wrap gap-4"
                >
                  {availablePaymentMethods.map(opt => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={`pm-${opt.value}`} />
                      <Label
                        htmlFor={`pm-${opt.value}`}
                        className="font-normal cursor-pointer"
                      >
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {paymentMethod === "Cash" && (
                  <div className="space-y-2 pt-1">
                    <Label>Jumlah diterima</Label>
                    <Input
                      type="number"
                      placeholder="Masukkan jumlah cash"
                      value={paymentNominal}
                      onChange={e => setPaymentNominal(e.target.value)}
                    />
                    {nominalShort > 0 && (
                      <p className="text-sm text-destructive">Kurang {formatRupiah(nominalShort)}</p>
                    )}
                    {change > 0 && (
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        Kembalian: {formatRupiah(change)}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Ongkos Kirim (optional)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={shippingCost}
                  onChange={e => setShippingCost(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatRupiah(total)}</span>
                </div>
                {parseFloat(shippingCost) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Ongkos Kirim</span>
                    <span>{formatRupiah(parseFloat(shippingCost))}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-lg font-semibold border-t pt-2">
                <span>Total</span>
                <span>{formatRupiah(totalWithShipping)}</span>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleCompleteSale}
                disabled={cart.length === 0 || recordSale.isPending}
              >
                {recordSale.isPending ? "Menyimpan…" : "Selesaikan penjualan"}
              </Button>
              {receiptUrl && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = receiptUrl;
                    a.download = `struk-${Date.now()}.jpg`;
                    a.click();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download struk
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
