/**
 * Domain types for PoultryMart sales management.
 * Products are identified by SKU; stock is tracked in batches with expiry dates.
 */

export type CustomerType = "Walk-in" | "Online" | "Pre-order" | "Shopee" | "Tokopedia";
export type PaymentMethod = "Cash" | "Transfer" | "E-wallet";

/** A single batch of stock (e.g. one delivery from supplier) with expiry */
export interface ProductBatch {
  id: string;
  product_id: string;
  productId?: string;
  quantity: number;
  expiry_date: string; // ISO date YYYY-MM-DD
  expiryDate?: string;
  cost_per_unit?: number;
  costPerUnit?: number;
  created_at: string;
  createdAt?: string;
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

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  /** Minimum stock before low-stock alert */
  threshold: number;
  batches?: ProductBatch[];
  /** Product image URL (data URL or external) */
  image_url?: string;
  imageUrl?: string;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
}

/** One line in a sale (product + quantity sold) */
export interface SaleItem {
  id?: string;
  sale_id?: string;
  saleId?: string;
  product_id: string;
  productId?: string;
  quantity: number;
  unit_price: number;
  unitPrice?: number;
  total_price: number;
  totalPrice?: number;
}

export interface Sale {
  id: string;
  cashier_id?: string;
  cashierId?: string;
  customer_id?: string; // Reference to customers table
  customerId?: string;
  items: SaleItem[];
  customer_type: CustomerType;
  customerType?: CustomerType;
  payment_method: PaymentMethod;
  paymentMethod?: PaymentMethod;
  payment_nominal?: number;
  paymentNominal?: number;
  /** Total amount received */
  total_amount: number;
  total?: number;
  receipt_url?: string;
  receiptUrl?: string;
  /** ISO datetime */
  created_at: string;
  createdAt?: string;
}

/** Customer */
export interface Customer {
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
  created_at: string;
}

/** Shopping list item: product to reorder (from low stock or manual) */
export interface ShoppingListItem {
  id: string;
  product_id: string;
  productId?: string;
  productName?: string;
  sku?: string;
  quantity: number;
  is_ordered: boolean;
  checked?: boolean;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
}

/** Settings */
export interface Setting {
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
