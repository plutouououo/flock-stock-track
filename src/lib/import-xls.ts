/**
 * Parse XLS/XLSX file and return rows suitable for creating products.
 * Expected columns (case-insensitive): name, sku, price, threshold, quantity, expiryDate
 * quantity + expiryDate = one initial batch per product.
 */

import * as XLSX from "xlsx";

export interface ProductImportRow {
  name: string;
  sku: string;
  price: number;
  threshold: number;
  quantity: number;
  expiryDate: string;
}

function normalizeHeader(h: string): string {
  return String(h ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function parseNumber(val: unknown): number {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  if (typeof val === "string") {
    const n = parseFloat(val.replace(/,/g, ""));
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

function parseDate(val: unknown): string {
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  if (typeof val === "number" && !Number.isNaN(val)) {
    const date = new Date((val - 25569) * 86400 * 1000);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }
  return new Date().toISOString().slice(0, 10);
}

export function parseProductXls(file: File): Promise<ProductImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("Could not read file"));
          return;
        }
        const wb = XLSX.read(data, { type: "binary" });
        const firstSheet = wb.SheetNames[0];
        if (!firstSheet) {
          reject(new Error("No sheet in file"));
          return;
        }
        const sheet = wb.Sheets[firstSheet];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        if (rows.length === 0) {
          resolve([]);
          return;
        }
        const headers = Object.keys(rows[0] ?? {}).map(normalizeHeader);
        const nameIdx = headers.findIndex((h) => h === "name");
        const skuIdx = headers.findIndex((h) => h === "sku");
        const priceIdx = headers.findIndex((h) => h === "price");
        const thresholdIdx = headers.findIndex((h) => h === "threshold");
        const qtyIdx = headers.findIndex((h) => h === "quantity" || h === "qty");
        const expiryIdx = headers.findIndex((h) => h === "expirydate" || h === "expiry");
        const keys = Object.keys(rows[0] ?? {});

        const out: ProductImportRow[] = [];
        for (const row of rows) {
          const name = String(row[keys[nameIdx]] ?? "").trim();
          const sku = String(row[keys[skuIdx]] ?? "").trim();
          if (!name || !sku) continue;
          out.push({
            name,
            sku,
            price: parseNumber(row[keys[priceIdx]]),
            threshold: parseNumber(row[keys[thresholdIdx]]),
            quantity: Math.max(1, parseNumber(row[keys[qtyIdx]])),
            expiryDate: parseDate(row[keys[expiryIdx]]),
          });
        }
        resolve(out);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsBinaryString(file);
  });
}
