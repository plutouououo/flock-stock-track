import { useState, useMemo, useEffect } from "react";
import {
  ShoppingCart, Plus, Minus, Check, X, Download,
  ArrowLeft, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProducts, useRecordSale, useCustomers, useAddCustomer, useAddExpense } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
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

type Step = 1 | 2 | 3;

interface CashierFlowProps {
  products: Product[];
  isLoading: boolean;
  getStock: (id: string) => number;
  userId: string | null;
}

export function CashierFlow({
  products,
  isLoading,
  getStock,
  userId,
}: CashierFlowProps) {
  const recordSale = useRecordSale();
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomers();
  const addCustomer = useAddCustomer();
  const addExpense = useAddExpense();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerType, setCustomerType] = useState<CustomerType>("Walk-in");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [paymentNominal, setPaymentNominal] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | "all">("all");
  const [productSearch, setProductSearch] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  // tap-to-add: each tap adds 1
  const addOne = (product: Product) => {
    const stock = getStock(product.id);
    setCart(prev => {
      const existing = prev.find(l => l.product.id === product.id);
      const currentQty = existing?.quantity ?? 0;
      if (currentQty >= stock) return prev;
      const rest = prev.filter(l => l.product.id !== product.id);
      return [...rest, { product, quantity: currentQty + 1 }];
    });
  };

  const removeOne = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(l => l.product.id === productId);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter(l => l.product.id !== productId);
      return prev.map(l => l.product.id === productId
        ? { ...l, quantity: l.quantity - 1 }
        : l);
    });
  };

  const total = useMemo(
    () => cart.reduce((s, l) => s + l.product.price * l.quantity, 0),
    [cart]
  );

  const nominalShort = useMemo(() => {
    const n = parseFloat(paymentNominal);
    if (paymentMethod !== "Cash" || isNaN(n)) return 0;
    return n < total ? total - n : 0;
  }, [paymentMethod, paymentNominal, total]);

  const totalWithShipping = useMemo(() => {
    const shipping = parseFloat(shippingCost) || 0;
    return total + shipping;
  }, [total, shippingCost]);

  const change = useMemo(() => {
    const n = parseFloat(paymentNominal);
    if (paymentMethod !== "Cash" || isNaN(n)) return 0;
    return Math.max(0, n - totalWithShipping);
  }, [paymentMethod, paymentNominal, totalWithShipping]);

  const availablePaymentMethods = useMemo(() =>
    customerType === "Walk-in"
      ? PAYMENT_METHODS
      : PAYMENT_METHODS.filter(m => m.value !== "Cash"),
    [customerType]
  );

  useEffect(() => {
    if (!availablePaymentMethods.find(m => m.value === paymentMethod)) {
      setPaymentMethod(availablePaymentMethods[0]?.value ?? "Transfer");
    }
  }, [customerType]);

  const productsFiltered = useMemo(() =>
    products.filter(p => {
      const inStock = getStock(p.id) > 0;
      const matchSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase());
      const matchCat = categoryFilter === "all" || (p.category && p.category === categoryFilter);
      return inStock && matchSearch && matchCat;
    }),
    [products, productSearch, categoryFilter, getStock]
  );

  const canProceedToStep2 = cart.length > 0;

  const canCompleteSale = () => {
    if (paymentMethod === "Cash") {
      const n = parseFloat(paymentNominal);
      return !isNaN(n) && n >= total;
    }
    return true;
  };

  const handleCompleteSale = async () => {
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
          setReceiptUrl(receiptDataUrl);
          setStep(3);
        },
        onError: (e) => toast({
          title: "Gagal",
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive",
        }),
      }
    );
  };

  const resetAll = () => {
    setCart([]);
    setStep(1);
    setCustomerType("Walk-in");
    setSelectedCustomerId(null);
    setShowNewCustomerForm(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setPaymentMethod("Cash");
    setPaymentNominal("");
    setShippingCost("");
    setReceiptUrl(null);
    setProductSearch("");
    setCategoryFilter("all");
  };

  // ── step indicator ──
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-4">
      {([1, 2, 3] as Step[]).map(s => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
            step === s
              ? "bg-primary text-primary-foreground"
              : step > s
              ? "bg-primary/20 text-primary"
              : "bg-muted text-muted-foreground"
          }`}>
            {step > s ? <Check className="h-4 w-4" /> : s}
          </div>
          {s < 3 && <div className={`w-8 h-0.5 ${step > s ? "bg-primary/40" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  );

  // ── step 1: products + cart ──
  if (step === 1) return (
    <div className="flex flex-col min-h-svh pb-32">
      <div className="p-4 space-y-3">
        <StepIndicator />
        <p className="text-center text-sm text-muted-foreground font-medium">Pilih produk</p>

        <Input
          placeholder="Cari produk..."
          value={productSearch}
          onChange={e => setProductSearch(e.target.value)}
        />

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-colors shrink-0 ${
                categoryFilter === cat.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
        ) : (
          <div className="space-y-2">
            {productsFiltered.map(p => {
              const stock = getStock(p.id);
              const inCart = cart.find(l => l.product.id === p.id);
              const qty = inCart?.quantity ?? 0;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border p-3 active:bg-muted transition-colors"
                >
                  <div className="min-w-0 flex-1" onClick={() => addOne(p)}>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sku} · Stok: {stock}</p>
                    <p className="text-sm font-semibold">{formatRupiah(p.price)}</p>
                  </div>
                  {/* tap +/- controls */}
                  <div className="flex items-center gap-1 ml-3">
                    {qty > 0 && (
                      <>
                        <button
                          onClick={() => removeOne(p.id)}
                          className="w-9 h-9 rounded-full border flex items-center justify-center text-muted-foreground active:bg-muted"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-7 text-center font-semibold text-sm">{qty}</span>
                      </>
                    )}
                    <button
                      onClick={() => addOne(p)}
                      disabled={qty >= stock}
                      className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* sticky bottom cart summary */}
      {canProceedToStep2 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {cart.reduce((s, l) => s + l.quantity, 0)} item · {cart.length} produk
            </span>
            <span className="font-bold text-base">{formatRupiah(total)}</span>
          </div>
          <Button className="w-full" size="lg" onClick={() => setStep(2)}>
            Lanjut ke pembayaran
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );

  // ── step 2: customer + payment ──
  if (step === 2) return (
    <div className="flex flex-col min-h-svh pb-32">
      <div className="p-4 space-y-4">
        <StepIndicator />
        <p className="text-center text-sm text-muted-foreground font-medium">Detail pembayaran</p>

        {/* cart summary (read-only) */}
        <Card>
          <CardContent className="pt-4 space-y-1">
            {cart.map(l => (
              <div key={l.product.id} className="flex justify-between text-sm">
                <span>
                  {l.product.name} <span className="text-muted-foreground">×{l.quantity}</span>
                </span>
                <span className="font-medium">{formatRupiah(l.product.price * l.quantity)}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 flex justify-between font-bold">
              <span>Total</span>
              <span>{formatRupiah(total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* customer selection */}
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

        {/* customer type */}
        <div className="space-y-2">
          <Label className="font-semibold">Tipe pelanggan</Label>
          <div className="flex flex-wrap gap-2">
            {CUSTOMER_TYPES.map(opt => (
              <button
                key={opt.value}
                onClick={() => setCustomerType(opt.value)}
                className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                  customerType === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* payment method */}
        <div className="space-y-2">
          <Label className="font-semibold">Metode pembayaran</Label>
          <div className="flex flex-wrap gap-2">
            {availablePaymentMethods.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPaymentMethod(opt.value)}
                className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                  paymentMethod === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* shipping cost input */}
        <div className="space-y-2">
          <Label className="font-semibold">Ongkos Kirim (optional)</Label>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="0"
            className="text-lg h-12"
            value={shippingCost}
            onChange={e => setShippingCost(e.target.value)}
          />
        </div>

        {/* cash input */}
        {paymentMethod === "Cash" && (
          <div className="space-y-2">
            <Label className="font-semibold">Jumlah diterima</Label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Masukkan jumlah cash"
              className="text-lg h-12"
              value={paymentNominal}
              onChange={e => setPaymentNominal(e.target.value)}
            />
            {nominalShort > 0 && (
              <p className="text-sm text-destructive font-medium">
                Kurang {formatRupiah(nominalShort)}
              </p>
            )}
            {change > 0 && (
              <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3">
                <p className="text-sm text-green-700 dark:text-green-300">Kembalian</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {formatRupiah(change)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* sticky bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-3 shadow-lg">
        <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        <Button
          className="flex-1"
          size="lg"
          disabled={!canCompleteSale() || recordSale.isPending}
          onClick={handleCompleteSale}
        >
          {recordSale.isPending ? "Menyimpan…" : "Selesaikan"}
          <Check className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // ── step 3: confirmation + receipt ──
  return (
    <div className="flex flex-col items-center justify-center min-h-svh p-6 text-center space-y-6">
      <StepIndicator />

      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
        <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold">Penjualan berhasil!</h2>
        <p className="text-muted-foreground text-sm mt-1">{formatRupiah(totalWithShipping)}</p>
      </div>

      {/* summary */}
      <Card className="w-full max-w-sm text-left">
        <CardContent className="pt-4 space-y-1 text-sm">
          {cart.map(l => (
            <div key={l.product.id} className="flex justify-between">
              <span>{l.product.name} ×{l.quantity}</span>
              <span>{formatRupiah(l.product.price * l.quantity)}</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>Subtotal</span>
            <span>{formatRupiah(total)}</span>
          </div>
          {parseFloat(shippingCost) > 0 && (
            <div className="flex justify-between">
              <span>Ongkos Kirim</span>
              <span>{formatRupiah(parseFloat(shippingCost))}</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span>{formatRupiah(totalWithShipping)}</span>
          </div>
          {paymentMethod === "Cash" && change > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
              <span>Kembalian</span>
              <span>{formatRupiah(change)}</span>
            </div>
          )}
          <div className="text-muted-foreground pt-1">
            {customerType} · {paymentMethod}
          </div>
        </CardContent>
      </Card>

      <div className="w-full max-w-sm space-y-3">
        {receiptUrl && (
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              const a = document.createElement("a");
              a.href = receiptUrl;
              a.download = `struk-${Date.now()}.jpg`;
              a.click();
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Download struk JPG
          </Button>
        )}
        <Button className="w-full" onClick={resetAll}>
          <Plus className="h-4 w-4 mr-2" />
          Penjualan baru
        </Button>
      </div>
    </div>
  );
}
