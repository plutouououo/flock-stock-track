/**
 * Local storage layer for PoultryMart.
 * All data lives in one key so we can swap to a backend later without changing callers.
 */

import type { AppData, Product, Sale, ShoppingListItem } from "@/types";

const STORAGE_KEY = "poultrymart_data";

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { products: [], sales: [], shoppingList: [] };
    return JSON.parse(raw) as AppData;
  } catch {
    return { products: [], sales: [], shoppingList: [] };
  }
}

function save(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getProducts(): Product[] {
  return load().products;
}

export function getSales(): Sale[] {
  return load().sales;
}

export function getShoppingList(): ShoppingListItem[] {
  return load().shoppingList;
}

export function getProductById(id: string): Product | undefined {
  return getProducts().find((p) => p.id === id);
}

/** Total stock = sum of all batch quantities */
export function getProductStock(product: Product): number {
  return product.batches.reduce((sum, b) => sum + b.quantity, 0);
}

export function saveProducts(products: Product[]): void {
  const data = load();
  data.products = products;
  save(data);
}

export function saveSales(sales: Sale[]): void {
  const data = load();
  data.sales = sales;
  save(data);
}

export function saveShoppingList(list: ShoppingListItem[]): void {
  const data = load();
  data.shoppingList = list;
  save(data);
}

export function addProduct(product: Omit<Product, "id" | "createdAt" | "updatedAt">): Product {
  const products = getProducts();
  const now = new Date().toISOString();
  const newProduct: Product = {
    ...product,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  products.push(newProduct);
  saveProducts(products);
  return newProduct;
}

export function updateProduct(id: string, updates: Partial<Product>): Product | undefined {
  const products = getProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  products[idx] = {
    ...products[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveProducts(products);
  return products[idx];
}

export function deleteProduct(id: string): boolean {
  const products = getProducts().filter((p) => p.id !== id);
  if (products.length === getProducts().length) return false;
  saveProducts(products);
  const list = getShoppingList().filter((item) => item.productId !== id);
  saveShoppingList(list);
  return true;
}

export function addSale(sale: Omit<Sale, "id" | "createdAt">): Sale {
  const sales = getSales();
  const newSale: Sale = {
    ...sale,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  sales.push(newSale);
  saveSales(sales);
  return newSale;
}

/** Deduct stock for sold items (FIFO by expiry). Returns false if insufficient stock. */
export function deductStock(productId: string, quantity: number): boolean {
  const products = getProducts();
  const product = products.find((p) => p.id === productId);
  if (!product) return false;
  const total = getProductStock(product);
  if (total < quantity) return false;
  const batches = [...product.batches].sort(
    (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  );
  let remaining = quantity;
  const newBatches: typeof product.batches = [];
  for (const batch of batches) {
    if (remaining <= 0) {
      newBatches.push(batch);
      continue;
    }
    const take = Math.min(batch.quantity, remaining);
    remaining -= take;
    const left = batch.quantity - take;
    if (left > 0) {
      newBatches.push({ ...batch, quantity: left });
    }
  }
  if (remaining > 0) return false;
  const idx = products.findIndex((p) => p.id === productId);
  products[idx] = { ...product, batches: newBatches, updatedAt: new Date().toISOString() };
  saveProducts(products);
  return true;
}

export function addShoppingListItem(
  item: Omit<ShoppingListItem, "id" | "createdAt" | "checked">
): ShoppingListItem {
  const list = getShoppingList();
  const newItem: ShoppingListItem = {
    ...item,
    id: crypto.randomUUID(),
    checked: false,
    createdAt: new Date().toISOString(),
  };
  list.push(newItem);
  saveShoppingList(list);
  return newItem;
}

export function updateShoppingList(
  updates: (Partial<ShoppingListItem> & { id: string })[]
): void {
  const list = getShoppingList();
  for (const u of updates) {
    const i = list.findIndex((x) => x.id === u.id);
    if (i !== -1) list[i] = { ...list[i], ...u };
  }
  saveShoppingList(list);
}

export function removeShoppingListItem(id: string): void {
  saveShoppingList(getShoppingList().filter((x) => x.id !== id));
}
