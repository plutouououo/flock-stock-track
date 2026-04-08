import html2canvas from "html2canvas";
import type { Product, ProductCategory, CustomerType, PaymentMethod } from "@/types";

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

export const CUSTOMER_TYPES: { value: CustomerType; label: string }[] = [
  { value: "Walk-in", label: "Walk-in" },
  { value: "Online", label: "Online" },
  { value: "Pre-order", label: "Pre-order" },
  { value: "Shopee", label: "Shopee" },
  { value: "Tokopedia", label: "Tokopedia" },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "Cash", label: "Cash" },
  { value: "Transfer", label: "Transfer" },
  { value: "E-wallet", label: "E-wallet" },
];

export const CATEGORIES: { value: ProductCategory | "all"; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "Ayam Potong", label: "Ayam Potong" },
  { value: "Ayam Kampung", label: "Ayam Kampung" },
  { value: "Bebek", label: "Bebek" },
  { value: "Jeroan", label: "Jeroan" },
  { value: "Olahan", label: "Olahan" },
  { value: "Lainnya", label: "Lainnya" },
];

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type CartLine = { product: Product; quantity: number };

// ──────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────────────────────────────────────

export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export async function generateReceiptJpg(
  cart: CartLine[],
  customerType: CustomerType,
  paymentMethod: PaymentMethod,
  paymentNominal: string,
  total: number,
  change: number,
  shippingCost?: number,
): Promise<string> {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;left:-9999px;top:0";
  el.innerHTML = `
    <div style="font-family:monospace;width:320px;padding:24px;background:#fff;color:#000">
      <div style="text-align:center;margin-bottom:12px">
        <div style="font-size:18px;font-weight:bold">Aneka Jaya 33</div>
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
      <div style="font-size:12px;display:flex;justify-content:space-between">
        <span>Subtotal</span><span>${formatRupiah(total - (shippingCost || 0))}</span>
      </div>
      ${shippingCost && shippingCost > 0 ? `
        <div style="font-size:12px;display:flex;justify-content:space-between">
          <span>Ongkos Kirim</span><span>${formatRupiah(shippingCost)}</span>
        </div>
      ` : ""}
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
    scale: 2,
    backgroundColor: "#fff",
  });
  document.body.removeChild(el);
  return canvas.toDataURL("image/jpeg", 0.95);
}
