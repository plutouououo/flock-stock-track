import { useState, useMemo, useEffect, useRef } from "react";
import {
  ShoppingCart, Plus, Minus, Wallet, User,
  Download, ArrowLeft, ArrowRight, Check, X,
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
import { useProducts, useRecordSale, useCustomers, useAddCustomer } from "@/lib/queries";
import { getProductStock } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Product, ProductCategory, CustomerType, PaymentMethod } from "@/types";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";

// ─── constants ────────────────────────────────────────────────────────────────

const CUSTOMER_TYPES: { value: CustomerType; label: string }[] = [
  { value: "Walk-in",   label: "Walk-in" },
  { value: "Online",    label: "Online" },
  { value: "Pre-order", label: "Pre-order" },
  { value: "Shopee",    label: "Shopee" },
  { value: "Tokopedia", label: "Tokopedia" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "Cash",     label: "Cash" },
  { value: "Transfer", label: "Transfer" },
  { value: "E-wallet", label: "E-wallet" },
];

const CATEGORIES: { value: ProductCategory | "all"; label: string }[] = [
  { value: "all",          label: "Semua" },
  { value: "Ayam Potong",  label: "Ayam Potong" },
  { value: "Ayam Kampung", label: "Ayam Kampung" },
  { value: "Bebek",        label: "Bebek" },
  { value: "Jeroan",       label: "Jeroan" },
  { value: "Olahan",       label: "Olahan" },
  { value: "Lainnya",      label: "Lainnya" },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(n);
}

type CartLine = { product: Product; quantity: number };

// ─── stock hook ───────────────────────────────────────────────────────────────

function useProductsWithStock() {
  const { data: products = [], isLoading } = useProducts();
  const [stockMap, setStockMap] = useState<Map<string, number>>(new Map());
  const [loadingStock, setLoadingStock] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingStock(true);
      const map = new Map<string, number>();
      for (const p of products) {
        try { map.set(p.id, await getProductStock(p)); }
        catch { map.set(p.id, 0); }
      }
      if (mounted) { setStockMap(map); setLoadingStock(false); }
    }
    products.length > 0 ? load() : setLoadingStock(false);
    return () => { mounted = false; };
  }, [products]);

  return {
    products,
    isLoading: isLoading || loadingStock,
    getStock: (id: string) => stockMap.get(id) ?? 0,
  };
}

// ─── shared receipt generator ─────────────────────────────────────────────────

async function generateReceiptJpg(
  cart: CartLine[],
  customerType: CustomerType,
  paymentMethod: PaymentMethod,
  paymentNominal: string,
  total: number,
  change: number,
): Promise<string> {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;left:-9999px;top:0";
  el.innerHTML = `
    <div style="font-family:monospace;width:320px;padding:24px;background:#fff;color:#000">
      <div style="text-align:center;margin-bottom:12px">
        <div style="font-size:18px;font-weight:bold">PoultryMart</div>
        <div style="font-size:11px">${new Date().toLocaleString("id-ID")}</div>
      </div>
      <div style="font-size:12px;margin-bottom:8px">
        <div>Pelanggan: ${customerType}</div>
        <div>Pembayaran: ${paymentMethod}</div>
      </div>
      <div style="border-top:1px dashed #000;margin:8px 0"></div>
      <table style="width:100%;font-size:12px;border-collapse:collapse">
        <thead>
          <tr>
            <th style="text-align:left;padding:2px 0">Produk</th>
            <th style="text-align:right">Qty</th>
            <th style="text-align:right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${cart.map(l => `
            <tr>
              <td style="padding:2px 0">${l.product.name}</td>
              <td style="text-align:right">${l.quantity}</td>
              <td style="text-align:right">${formatRupiah(l.product.price * l.quantity)}</td>
            </tr>
            <tr>
              <td style="font-size:10px;color:#555">${l.product.sku} @ ${formatRupiah(l.product.price)}</td>
              <td></td><td></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div style="border-top:1px dashed #000;margin:8px 0"></div>
      <div style="font-size:13px;font-weight:bold;display:flex;justify-content:space-between">
        <span>TOTAL</span><span>${formatRupiah(total)}</span>
      </div>
      ${paymentMethod === "Cash" ? `
        <div style="font-size:12px;display:flex;justify-content:space-between;margin-top:4px">
          <span>Dibayar</span><span>${formatRupiah(parseFloat(paymentNominal) || 0)}</span>
        </div>
        <div style="font-size:12px;display:flex;justify-content:space-between">
          <span>Kembalian</span><span>${formatRupiah(change)}</span>
        </div>
      ` : ""}
      <div style="border-top:1px dashed #000;margin:12px 0"></div>
      <div style="text-align:center;font-size:11px">Terima kasih!</div>
    </div>`;
  document.body.appendChild(el);
  const canvas = await html2canvas(el.firstElementChild as HTMLElement, {
    scale: 2, backgroundColor: "#fff",
  });
  document.body.removeChild(el);
  return canvas.toDataURL("image/jpeg", 0.95);
}

// ─── cashier mobile flow (3 steps) ────────────────────────────────────────────

type Step = 1 | 2 | 3;

function CashierFlow({
  products, isLoading, getStock, userId,
}: {
  products: Product[];
  isLoading: boolean;
  getStock: (id: string) => number;
  userId: string | null;
}) {
  const recordSale = useRecordSale();
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomers();
  const addCustomer = useAddCustomer();
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
        ? { ...l, quantity: l.quantity - 1 } : l);
    });
  };

  const total = useMemo(
    () => cart.reduce((s, l) => s + l.product.price * l.quantity, 0),
    [cart]
  );

  const change = useMemo(() => {
    const n = parseFloat(paymentNominal);
    if (paymentMethod !== "Cash" || isNaN(n)) return 0;
    return Math.max(0, n - total);
  }, [paymentMethod, paymentNominal, total]);

  const nominalShort = useMemo(() => {
    const n = parseFloat(paymentNominal);
    if (paymentMethod !== "Cash" || isNaN(n)) return 0;
    return n < total ? total - n : 0;
  }, [paymentMethod, paymentNominal, total]);

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
    const receiptDataUrl = await generateReceiptJpg(
      cart, customerType, paymentMethod, paymentNominal, total, change,
    );
    recordSale.mutate(
      {
        cashierId: userId ?? undefined,
        customerId: selectedCustomerId ?? undefined,
        customerType: customerType,
        paymentMethod: paymentMethod,
        paymentNominal: paymentMethod === "Cash" ? parseFloat(paymentNominal) : undefined,
        totalAmount: total,
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

        <Input placeholder="Cari produk..."
          value={productSearch}
          onChange={e => setProductSearch(e.target.value)} />

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button key={cat.value} onClick={() => setCategoryFilter(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-colors shrink-0 ${
                categoryFilter === cat.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground"
              }`}>
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
                <div key={p.id}
                  className="flex items-center justify-between rounded-xl border p-3 active:bg-muted transition-colors">
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
                          className="w-9 h-9 rounded-full border flex items-center justify-center text-muted-foreground active:bg-muted">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-7 text-center font-semibold text-sm">{qty}</span>
                      </>
                    )}
                    <button
                      onClick={() => addOne(p)}
                      disabled={qty >= stock}
                      className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform">
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
                <span>{l.product.name} <span className="text-muted-foreground">×{l.quantity}</span></span>
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
                  <SelectItem value="">Tidak ada (Walk-in)</SelectItem>
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
              <button key={opt.value} onClick={() => setCustomerType(opt.value)}
                className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                  customerType === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground"
                }`}>
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
              <button key={opt.value} onClick={() => setPaymentMethod(opt.value)}
                className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                  paymentMethod === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground"
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* cash input */}
        {paymentMethod === "Cash" && (
          <div className="space-y-2">
            <Label className="font-semibold">Jumlah diterima</Label>
            <Input type="number" inputMode="numeric" placeholder="Masukkan jumlah cash"
              className="text-lg h-12"
              value={paymentNominal}
              onChange={e => setPaymentNominal(e.target.value)} />
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
        <Button className="flex-1" size="lg"
          disabled={!canCompleteSale() || recordSale.isPending}
          onClick={handleCompleteSale}>
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
        <p className="text-muted-foreground text-sm mt-1">{formatRupiah(total)}</p>
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
            <span>Total</span><span>{formatRupiah(total)}</span>
          </div>
          {paymentMethod === "Cash" && change > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
              <span>Kembalian</span><span>{formatRupiah(change)}</span>
            </div>
          )}
          <div className="text-muted-foreground pt-1">
            {customerType} · {paymentMethod}
          </div>
        </CardContent>
      </Card>

      <div className="w-full max-w-sm space-y-3">
        {receiptUrl && (
          <Button className="w-full" variant="outline"
            onClick={() => {
              const a = document.createElement("a");
              a.href = receiptUrl;
              a.download = `struk-${Date.now()}.jpg`;
              a.click();
            }}>
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

// ─── owner desktop flow (unchanged) ───────────────────────────────────────────

function OwnerFlow({
  products, isLoading, getStock, userId,
}: {
  products: Product[];
  isLoading: boolean;
  getStock: (id: string) => number;
  userId: string | null;
}) {
  const recordSale = useRecordSale();
  const { toast } = useToast();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerType, setCustomerType] = useState<CustomerType>("Walk-in");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [paymentNominal, setPaymentNominal] = useState("");
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | "all">("all");

  const total = useMemo(
    () => cart.reduce((s, l) => s + l.product.price * l.quantity, 0), [cart]
  );
  const change = useMemo(() => {
    const n = parseFloat(paymentNominal);
    return paymentMethod === "Cash" && !isNaN(n) ? Math.max(0, n - total) : 0;
  }, [paymentMethod, paymentNominal, total]);
  const nominalShort = useMemo(() => {
    const n = parseFloat(paymentNominal);
    return paymentMethod === "Cash" && !isNaN(n) && n < total ? total - n : 0;
  }, [paymentMethod, paymentNominal, total]);

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
    [products, productSearch, categoryFilter]
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
      toast({ title: "Keranjang kosong", variant: "destructive" }); return;
    }
    if (paymentMethod === "Cash") {
      const n = parseFloat(paymentNominal);
      if (!paymentNominal || isNaN(n) || n < total) {
        toast({ title: "Jumlah cash kurang dari total", variant: "destructive" }); return;
      }
    }
    const receiptDataUrl = await generateReceiptJpg(
      cart, customerType, paymentMethod, paymentNominal, total, change,
    );
    recordSale.mutate(
      {
        cashierId: userId ?? undefined,
        customerId: undefined,
        customerType: customerType,
        paymentMethod: paymentMethod,
        paymentNominal: paymentMethod === "Cash" ? parseFloat(paymentNominal) : undefined,
        totalAmount: total,
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
          toast({ title: "Penjualan berhasil dicatat" });
          setCart([]); setPaymentNominal("");
          setCustomerType("Walk-in"); setPaymentMethod("Cash");
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

  // owner desktop JSX — same as previous version
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
              <ShoppingCart className="h-5 w-5" />Products (current stock)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Search products..." value={productSearch}
              onChange={e => setProductSearch(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.value} onClick={() => setCategoryFilter(cat.value)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    categoryFilter === cat.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-foreground"
                  }`}>
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
                    <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {p.sku} · Stok: {stock}
                          {p.category && <span className="ml-1">· {p.category}</span>}
                        </p>
                        <p className="text-xs font-medium">{formatRupiah(p.price)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Input type="number" min={1} max={stock} placeholder="Qty"
                          className="w-20" value={qtyStr}
                          onChange={e => setQtyInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && addToCart(p, qty)} />
                        <Button size="sm" onClick={() => addToCart(p, qty)}
                          disabled={qty < 1 || qty > stock}>
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
            <CardHeader><CardTitle>Cart</CardTitle></CardHeader>
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
                            <span className="font-mono text-xs text-muted-foreground block">{line.product.sku}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => setCartQty(line.product.id, line.quantity - 1)}
                                disabled={line.quantity <= 1}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center">{line.quantity}</span>
                              <Button variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => setCartQty(line.product.id, line.quantity + 1)}
                                disabled={line.quantity >= stock}>
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
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                              onClick={() => setCart(prev => prev.filter(l => l.product.id !== line.product.id))}>
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
                <User className="h-5 w-5" />Customer & payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipe pelanggan</Label>
                <RadioGroup value={customerType}
                  onValueChange={v => setCustomerType(v as CustomerType)}
                  className="flex flex-wrap gap-4">
                  {CUSTOMER_TYPES.map(opt => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={`ct-${opt.value}`} />
                      <Label htmlFor={`ct-${opt.value}`} className="font-normal cursor-pointer">{opt.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />Metode pembayaran
                </Label>
                <RadioGroup value={paymentMethod}
                  onValueChange={v => setPaymentMethod(v as PaymentMethod)}
                  className="flex flex-wrap gap-4">
                  {availablePaymentMethods.map(opt => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={`pm-${opt.value}`} />
                      <Label htmlFor={`pm-${opt.value}`} className="font-normal cursor-pointer">{opt.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
                {paymentMethod === "Cash" && (
                  <div className="space-y-2 pt-1">
                    <Label>Jumlah diterima</Label>
                    <Input type="number" placeholder="Masukkan jumlah cash"
                      value={paymentNominal}
                      onChange={e => setPaymentNominal(e.target.value)} />
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
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Total</span><span>{formatRupiah(total)}</span>
              </div>
              <Button className="w-full" size="lg"
                onClick={handleCompleteSale}
                disabled={cart.length === 0 || recordSale.isPending}>
                {recordSale.isPending ? "Menyimpan…" : "Selesaikan penjualan"}
              </Button>
              {receiptUrl && (
                <Button variant="outline" className="w-full"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = receiptUrl;
                    a.download = `struk-${Date.now()}.jpg`;
                    a.click();
                  }}>
                  <Download className="h-4 w-4 mr-2" />Download struk
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── root export ───────────────────────────────────────────────────────────────

export default function RecordSale() {
  const { role, userId, loading } = useAuth();
  const { products, isLoading, getStock } = useProductsWithStock();

  if (loading) return (
    <div className="flex items-center justify-center min-h-svh">
      <p className="text-muted-foreground">Loading…</p>
    </div>
  );

  const props = { products, isLoading, getStock, userId };

  return role === "cashier"
    ? <CashierFlow {...props} />
    : <OwnerFlow {...props} />;
}