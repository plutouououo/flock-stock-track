/**
 * Domain types for PoultryMart sales management.
 * Products are identified by SKU; stock is tracked in batches with expiry dates.
 */

export type CustomerType = "online" | "walk-in" | "pre-order";
export type PaymentMethod = "cash" | "transfer" | "e-wallet";

/** A single batch of stock (e.g. one delivery from supplier) with expiry */
export interface ProductBatch {
  id: string;
  quantity: number;
  expiryDate: string; // ISO date YYYY-MM-DD
  receivedAt?: string; // ISO date when batch was added
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  /** Minimum stock before low-stock alert */
  threshold: number;
  /** Product image URL (data URL or external) */
  imageUrl?: string;
  /** Batches: stock is sum of batch quantities; FIFO by expiry for sales */
  batches: ProductBatch[];
  createdAt: string;
  updatedAt: string;
}

/** One line in a sale (product + quantity sold) */
export interface SaleItem {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  /** Cost used for COGS (optional; can be computed from batches later) */
  costPerUnit?: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  customerType: CustomerType;
  paymentMethod: PaymentMethod;
  /** Total amount received */
  total: number;
  /** ISO datetime */
  createdAt: string;
  /** Optional note */
  note?: string;
}

/** Shopping list item: product to reorder (from low stock or manual) */
export interface ShoppingListItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  checked: boolean;
  createdAt: string;
}

export interface AppData {
  products: Product[];
  sales: Sale[];
  shoppingList: ShoppingListItem[];
}
