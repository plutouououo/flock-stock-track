/**
 * Domain types for PoultryMart sales management.
 * Products are identified by SKU; stock is tracked in batches with expiry dates.
 */

export type CustomerType = "Walk-in" | "Online" | "Pre-order" | "Shopee" | "Tokopedia";
export type PaymentMethod = "Cash" | "Transfer" | "E-wallet";

/** A single batch of stock (e.g. one delivery from supplier) with expiry */
export interface ProductBatch {
  id: string;
  productId?: string;
  quantity: number;
  expiryDate?: string;
  costPerUnit?: number;
  createdAt?: string;
}

export interface ProductBatchDB {
  id: string;
  product_id: string;
  quantity: number;
  expiry_date: string; // ISO date YYYY-MM-DD
  cost_per_unit?: number;
  created_at: string;
}

/** User profile (extends auth.users) */
export interface Profile {
  id: string;
  role: 'owner' | 'cashier';
  full_name: string;
  username: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export type ProductCategory =
  | "Ayam Potong"
  | "Ayam Kampung"
  | "Bebek"
  | "Jeroan"
  | "Olahan"
  | "Lainnya";

export interface Product {
  id: string;
  name: string;
  sku: string;
  category?: ProductCategory; // ← tambah ini
  price: number;
  threshold: number;
  batches?: ProductBatch[];
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductDB {
  id: string;
  name: string;
  sku: string;
  category?: ProductCategory; // ← tambah ini
  price: number;
  threshold: number;
  batches?: ProductBatch[];
  image_url?: string;
  created_at: string;
  updated_at: string;
}

/** One line in a sale (product + quantity sold) */
export interface SaleItem {
  id: string;
  saleId?: string;
  productId?: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface SaleItemDB {
  id: string;
  sale_id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Sale {
  id: string;
  cashierId?: string;
  customerId?: string;
  items: SaleItem[];
  customerType?: CustomerType;
  paymentMethod?: PaymentMethod;
  paymentNominal?: number;
  totalAmount?: number;
  receiptUrl?: string;
  createdAt?: string;
}

export interface SaleDB {
  id: string;
  cashier_id?: string;
  customer_id?: string;
  customer_type: CustomerType;
  payment_method: PaymentMethod;
  payment_nominal?: number;
  total_amount: number;
  receipt_url?: string;
  created_at: string;
}

/** Customer */
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDB {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

/** Expense entry */
export interface Expense {
  id: string;
  type: string;
  date: string; // YYYY-MM-DD
  description?: string;
  amount: number;
  createdAt: string;
}

export interface ExpenseDB {
  id: string;
  type: string;
  date: string; // YYYY-MM-DD
  description?: string;
  amount: number;
  created_at: string;
}

/** Shopping list item: product to reorder (from low stock or manual) */
export interface ShoppingListItem {
  id: string;
  productId?: string;
  quantity: number;
  isOrdered: boolean;
  checked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShoppingListItemDB {
  id: string;
  product_id: string;
  quantity: number;
  is_ordered: boolean;
  checked?: boolean;
  created_at: string;
  updated_at: string;
}

/** Settings */
export interface Setting {
  id: string;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettingDB {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

// Alias for Profile
export type Employee = Profile;

export interface AppData {
  products: Product[];
  productBatches: ProductBatch[];
  sales: Sale[];
  saleItems: SaleItem[];
  customers: Customer[];
  expenses: Expense[];
  shoppingList: ShoppingListItem[];
  settings: Setting[];
}
