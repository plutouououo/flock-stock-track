## Plan: Reports, Auth, Receipts, Customers, Expenses, Shopping List v2

TL;DR: Implement Supabase-backed auth and DB, add cashier/owner roles, expand sales/expense/customer models, enrich Reports (filters, profit, month-on-month comparisons, charts), add receipt JPG generation and XLSX exports, and improve shopping list downloads and notifications. Build incrementally with clear verification points.

**Steps**
1. Backend & Auth (blocks many tasks) — *depends on nothing*: set up Supabase tables and Auth (owners, cashiers), create REST/JS clients using the provided Supabase URL and keys. Seed initial owner from provided store info. (Complexity: medium)
2. Data model & migrations — *depends on step 1*: add `sale.id` (UUID), `sale.cashierId`, `sale.receiptUrl`, `expenses` table, `customers` table, `employees` table, and `settings` (sales target). Provide client-side migration: export existing localStorage to Supabase and/or keep local fallback. (Complexity: medium)
3. Record Sale changes — *depends on step 2*: require payment nominal when `cash`; restrict payment methods for `online`/`pre-order`; filter products by category; generate JPG receipt after sale (server-side rendering via HTML→image or client-side canvas), save receipt URL to sale record. Log sale under cashier. Responsive 3-step mobile flow for cashier. (Complexity: ambitious)
4. Reports enhancement — *depends on step 2*: add date filters (today/week/month/year/custom range), profit (Revenue − (Expenses + Cost)), expense breakdown chart, revenue-by-customer-type chart, month-on-month % comparisons for total revenue, transaction count, and today's sales, sales target achievement percentage, revenue vs expense bar chart. Add XLSX export with summary sheet + detail sheets. (Complexity: ambitious)
5. Customers, Expenses, Employees pages — *can run parallel with step 4*: CRUD pages; XLSX import for customers; basic expense entries with type, date, description, amount; employees = Auth users + profile. (Complexity: medium)
6. Shopping list & notifications — *depends on step 2*: JPG/XLSX downloads for shopping lists, group items by creation date, add created timestamp, banner & bottom-card notifications for thresholds and daily target (client push via Supabase Realtime or client polling). (Complexity: medium)
7. UI/UX & Permissions — *ongoing across steps*: owner UI responsive, cashier-limited UI (no product import/add/edit), mobile cashier auth flow, moves in Reports ordering (Most Popular Product above By customer type). (Complexity: medium)
8. PWA icons — add `public/icon-192.png` and `public/icon-512.png`. (Complexity: trivial)
9. Testing & polish — unit tests for key logic (stock deduction, profit calc), E2E for sale flow, manual checks for exports and receipts. (Complexity: medium)
10. Handoff & docs — update README, PRODUCT.md, and add migration/run instructions. (Complexity: trivial)

**Relevant files to modify**
- `src/types/index.ts` — add `Sale.id`, cashierId, receiptUrl; new types `Expense`, `Customer`, `Employee`, `Setting`
- `src/lib/storage.ts` — add Supabase sync layer and migration helpers
- `src/lib/queries.ts` — add queries/mutations for new types
- `src/lib/import-xls.ts` — extend for customers import and export generation
- `src/pages/RecordSale.tsx` — payment nominal input, product category filter, receipt generation
- `src/pages/Reports.tsx` — filters, charts, XLSX export
- `src/pages/Products.tsx` — enforce cashier restrictions
- `src/pages/ShoppingList.tsx` — add timestamps, grouping, downloads
- `src/components/*` — add Receipt renderer component, Auth components
- `public/manifest.webmanifest` — ensure icons are referenced

**Verification**
1. Auth: sign up as cashier, sign in, start/stop shift, verify login history recorded in DB.
2. Record sale: sale has UUID, cashier attribution, stock deducted FIFO, receipt JPG available and downloadable.
3. Reports: filters return correct aggregates; profit matches manual calc for sample dataset; month-on-month % shows correct change.
4. Exports: XLSX contains summary and detailed sheets; shopping list JPG matches on-screen rendering.
5. Permissions: cashier cannot access Products import/add pages; owner can.
6. Notifications: banner/card appears when target reached or low-stock.

**Decisions & assumptions**
- Use Supabase for Auth + Postgres (user confirmed yes). We'll store canonical data in Supabase and use client-side cache/React Query for UI responsiveness.
- Receipt JPG will be generated client-side via HTML→canvas (e.g., html2canvas) to avoid server rendering costs; we can later move to serverless if needed.
- Seed initial owner using provided store info and Supabase keys (user provided). We'll create a temporary setup script to create owner credentials.
- Sales target: user chose "Configure later" so initial target remains hardcoded (Rp14,000,000) with Settings UI deferred to a follow-up change.
- Exports: per request, provide a summary sheet + one detail sheet per export.

**Further Considerations**
1. Migration strategy: offer an "Import local data to Supabase" tool to avoid data loss. Recommend backup before migration.
2. Receipt template: user prefers styled template matching their attached image — need the exact image/assets to match visuals.
3. Performance: large datasets in client may need server-side pagination; defer until needed.

**Estimated overall complexity**: Ambitious (several medium→ambitious tasks). I recommend splitting into two releases:
- v2.0 (MVP): Supabase auth + DB, sale UUIDs + cashier attribution, basic Reports filters + XLSX export, receipt JPG generation, customers CRUD/import, expenses basic entries, cashier role restrictions, PWA icons.
- v2.1 (follow-up): Month-on-month charts, advanced expense drilldowns, realtime push notifications, full mobile polish and E2E coverage.

---
