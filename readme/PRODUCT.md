# PoultryMart – Sales Manager

Product guide for the owner: what’s built, how to use it, and what could come next.

---

## What it does

- **Products** – Add and edit poultry products (name, SKU, price, low-stock threshold, image URL). Stock is stored in **batches** with quantity and expiry date. You can import products from an **Excel (.xls / .xlsx)** file.
- **Record sale** – Create a sale by adding products (with live stock), set **customer type** (Walk-in, Online, Pre-order) and **payment method** (Cash, Transfer, E-wallet). Stock is reduced automatically (FIFO by expiry).
- **Reports** – Total revenue, today’s sales, transaction count, COGS/Net, revenue chart (last 14 days), breakdown by customer type and payment method, **most popular products**, and recent sales.
- **Dashboard** – Today’s sales, total products, monthly revenue, low-stock count, recent sales, and low-stock alerts.
- **Shopping list** – Build a restock list; low-stock products are suggested. Check off items when ordered.

Data is stored in the browser (**localStorage**). No server or account is required. It works offline and is installable as a **PWA** on phone or desktop.

---

## How to run it

```bash
npm i
npm run dev
```

Open **http://localhost:8080**.  
To build for production: `npm run build`. The output is in the `dist/` folder (e.g. for static hosting or Lovable Publish).

---

## XLS import (products)

Use an Excel file with these columns (headers can be in any order; names are case-insensitive):

| Column    | Meaning           | Example        |
|----------|-------------------|----------------|
| name     | Product name      | Chicken Breast |
| sku      | Product SKU       | CHK-BREAST-001 |
| price    | Selling price     | 45000          |
| threshold| Low-stock alert   | 10             |
| quantity | Initial stock     | 50             |
| expiryDate | Batch expiry (YYYY-MM-DD or Excel date) | 2025-04-15 |

One row = one product with one initial batch. Rows with missing name or SKU are skipped. Duplicate SKUs (already in the app) are skipped and reported in the toast after import.

---

## PWA (install on phone / PC)

The app has a **manifest** so it can be installed:

- **Android (Chrome):** Menu → “Install app” or “Add to Home screen”.
- **iPhone (Safari):** Share → “Add to Home Screen”.
- **Desktop (Chrome/Edge):** Install icon in the address bar or in the menu.

Optional: add `public/icon-192.png` and `public/icon-512.png` (192×192 and 512×512 px) for a proper app icon. Without them, the browser may use a default icon.

---

## Data and limits

- All data is in **localStorage** in the browser. Clearing site data removes everything.
- There is **no sync** between devices. Using it on another phone or PC starts with empty data unless you export/import or add a backend later.

---

## Possible v2 improvements

1. **Backend + sync** – e.g. Supabase or Firebase so admin on PC and staff on phones see the same data.
2. **COGS** – Store cost per batch (or per product) and show real COGS and net in reports.
3. **Top customer** – Optional “customer name” or “customer id” on each sale, then a “top customers” report.
4. **Export** – Export sales or products to CSV/Excel.
5. **User roles** – Separate “staff” (record sales, view stock) and “owner” (reports, products, settings).
6. **PWA icons** – Add the two icon files above for a branded install icon.

---

## Where things are in the code

| What            | Where |
|-----------------|--------|
| Data types      | `src/types/index.ts` |
| Storage (local) | `src/lib/storage.ts` |
| React Query     | `src/lib/queries.ts` |
| XLS import      | `src/lib/import-xls.ts` |
| Products page   | `src/pages/Products.tsx` |
| Record sale     | `src/pages/RecordSale.tsx` |
| Reports         | `src/pages/Reports.tsx` |
| Dashboard       | `src/pages/Dashboard.tsx` |
| Shopping list   | `src/pages/ShoppingList.tsx` |
| Product form    | `src/components/ProductFormDialog.tsx` |

You’re in control: you make the product decisions; this doc and the code are there so you (or a developer) can maintain and extend the app.
