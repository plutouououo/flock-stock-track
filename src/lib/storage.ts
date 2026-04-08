/**
 * Storage layer for PoultryMart.
 * Supports localStorage fallback and Supabase sync.
 */

import type { AppData, Product, Sale, ShoppingListItem, ProductBatch, SaleItem, Customer, Expense, Setting, SaleDB, SaleItemDB, ExpenseDB, ProductBatchDB, ProductDB, ShoppingListItemDB, CustomerDB, SettingDB } from "@/types";
import { supabase } from "./supabase";

const STORAGE_KEY = "poultrymart_data";

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {
      products: [],
      productBatches: [],
      sales: [],
      saleItems: [],
      customers: [],
      expenses: [],
      shoppingList: [],
      settings: []
    };
    const parsed = JSON.parse(raw) as AppData;
    
    // Ensure all arrays exist even if they're missing from the stored data
    return {
      products: Array.isArray(parsed.products) ? parsed.products : [],
      productBatches: Array.isArray(parsed.productBatches) ? parsed.productBatches : [],
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
      saleItems: Array.isArray(parsed.saleItems) ? parsed.saleItems : [],
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      shoppingList: Array.isArray(parsed.shoppingList) ? parsed.shoppingList : [],
      settings: Array.isArray(parsed.settings) ? parsed.settings : []
    };
  } catch {
    return {
      products: [],
      productBatches: [],
      sales: [],
      saleItems: [],
      customers: [],
      expenses: [],
      shoppingList: [],
      settings: []
    };
  }
}

function save(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function mapSale(sale: SaleDB): Sale {
  return {
    id: sale.id,
    cashierId: sale.cashier_id, 
    customerId: sale.customer_id,
    customerType: sale.customer_type,
    paymentMethod: sale.payment_method,
    paymentNominal: sale.payment_nominal,
    totalAmount: sale.total_amount,
    shippingCost: sale.shipping_cost,
    receiptUrl: sale.receipt_url,
    createdAt: sale.created_at,
    items: [] // items will be populated separately
  };
}

function mapSaleItem(saleItem: SaleItemDB): SaleItem {
  return {
    id: saleItem.id,
    saleId: saleItem.sale_id,
    productId: saleItem.product_id,
    quantity: saleItem.quantity,
    unitPrice: saleItem.unit_price,
    totalPrice: saleItem.total_price
  };
}

function mapExpense(expense: ExpenseDB): Expense {
  return {
    id: expense.id,
    type: expense.type,
    date: expense.date,
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
    notes: expense.notes,
    createdAt: expense.created_at
  };
}

function mapProductBatch(batch: ProductBatchDB): ProductBatch {
  return {
    id: batch.id,
    productId: batch.product_id,
    quantity: batch.quantity,
    expiryDate: batch.expiry_date,
    costPerUnit: batch.cost_per_unit,
    createdAt: batch.created_at
  };
}

function mapProduct(product: ProductDB): Product {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: product.price,
    threshold: product.threshold,
    imageUrl: product.image_url,
    createdAt: product.created_at,
    updatedAt: product.updated_at
  };
}

function mapShoppingListItem(item: ShoppingListItemDB): ShoppingListItem {
  return {
    id: item.id,
    productId: item.product_id,
    quantity: item.quantity,
    isOrdered: item.is_ordered,
    checked: item.checked,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  };
}

function mapCustomer(customer: CustomerDB): Customer {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at
  };
}

function mapSetting(setting: SettingDB): Setting {
  return {
    id: setting.id,
    key: setting.key,
    value: setting.value,
    createdAt: setting.created_at,
    updatedAt: setting.updated_at
  };
}
  
function mapShoppingListItemDB(list: ShoppingListItem): ShoppingListItemDB {
  return {
    id: list.id,
    product_id: list.productId,
    quantity: list.quantity,
    is_ordered: list.isOrdered,
    checked: list.checked,
    created_at: list.createdAt,
    updated_at: list.updatedAt
  };
}

function mapProductDB(product: Product): ProductDB {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: product.price,
    threshold: product.threshold,
    image_url: product.imageUrl,
    created_at: product.createdAt,
    updated_at: product.updatedAt
  };
}

function mapProductBatchDB(batch: ProductBatch): ProductBatchDB {
  return {
    id: batch.id,
    product_id: batch.productId,
    quantity: batch.quantity,
    expiry_date: batch.expiryDate,
    cost_per_unit: batch.costPerUnit,
    created_at: batch.createdAt,
  };
}

function mapSaleDB(sale: Sale): SaleDB {
  return {
    id: sale.id,
    cashier_id: sale.cashierId,
    customer_id: sale.customerId,
    customer_type: sale.customerType,
    payment_method: sale.paymentMethod,
    payment_nominal: sale.paymentNominal,
    total_amount: sale.totalAmount,
    shipping_cost: sale.shippingCost,
    receipt_url: sale.receiptUrl,
    created_at: sale.createdAt,
  };
}

function mapSaleItemDB(item: SaleItem): SaleItemDB {
  return {
    id: item.id,
    sale_id: item.saleId,
    product_id: item.productId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
  };
}

function mapCustomerDB(customer: Customer): CustomerDB {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    created_at: customer.createdAt,
    updated_at: customer.updatedAt
  };
}

function mapExpenseDB(expense: Expense): ExpenseDB {
  return {
    id: expense.id,
    type: expense.type,
    date: expense.date,
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
    notes: expense.notes,
    created_at: expense.createdAt,
  };
}

function mapSettingDB(setting: Setting): SettingDB {
  return {
    id: setting.id,
    key: setting.key,
    value: setting.value,
    created_at: setting.createdAt,
    updated_at: setting.updatedAt,
  };
}

// Helper to get current user
async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");
  return user.id;
}

// Function to get sales with joined sale_items
export async function getSalesWithItems(): Promise<Sale[]> {
  try {
    const { data, error } = await supabase
      .from("sales")
      .select(`
        *,
        sale_items (*)
      `);

    if (error) throw error;

    const mapped = data?.map(sale => {
      const items = (sale.sale_items || []).map(mapSaleItem);
      return {
        ...mapSale(sale),
        items,
      };
    });

    return mapped;
  } catch (err) {
    console.error('Error fetching sales with items:', err);
    // Fallback to localStorage
    const sales = load().sales;
    const saleItems = load().saleItems;
    return sales.map(sale => ({
      ...sale,
      items: saleItems.filter(item => item.saleId === sale.id)
    }));
  }
}

// Migration function: export local data to Supabase
export async function migrateToSupabase(): Promise<void> {
  const data = load();
  const userId = await getCurrentUserId();

  // Migrate products
  for (const product of data.products) {
    const { data: prodData, error: prodError } = await supabase
      .from('products')
      .upsert({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        threshold: product.threshold,
        image_url: product.imageUrl,
        created_at: product.createdAt,
        updated_at: product.updatedAt,
      })
      .select()
      .single();
    if (prodError) throw prodError;

    // Migrate batches
    if (product.batches) {
      for (const batch of product.batches) {
        const { error: batchError } = await supabase
          .from('product_batches')
          .upsert({
            id: batch.id,
            product_id: prodData.id,
            quantity: batch.quantity,
            expiry_date: batch.expiryDate,
            cost_per_unit: batch.costPerUnit,
            created_at: batch.createdAt,
          });
        if (batchError) throw batchError;
      }
    }
  }

  // Migrate product batches that are not nested in products
  for (const batch of data.productBatches) {
    const { error: batchError } = await supabase
      .from('product_batches')
      .upsert({
        id: batch.id,
        product_id: batch.productId,
        quantity: batch.quantity,
        expiry_date: batch.expiryDate,
        cost_per_unit: batch.costPerUnit,
        created_at: batch.createdAt,
      });
    if (batchError) throw batchError;
  }

  // Migrate sales
  for (const sale of data.sales) {
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .upsert({
        id: sale.id,
        cashier_id: userId,
        customer_id: sale.customerId,
        customer_type: sale.customerType,
        payment_method: sale.paymentMethod,
        payment_nominal: sale.paymentNominal,
        total_amount: sale.totalAmount,
        shipping_cost: sale.shippingCost,
        receipt_url: sale.receiptUrl,
        created_at: sale.createdAt,
      })
      .select()
      .single();
    if (saleError) throw saleError;

    // Migrate sale items
    for (const item of sale.items) {
      const { error: itemError } = await supabase
        .from('sale_items')
        .upsert({
          id: item.id,
          sale_id: saleData.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
        });
      if (itemError) throw itemError;
    }
  }

  // Migrate customers
  for (const customer of data.customers) {
    const { error } = await supabase
      .from('customers')
      .upsert({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        created_at: customer.createdAt,
        updated_at: customer.updatedAt, 
      });
    if (error) throw error;
  }

  // Migrate expenses
  for (const expense of data.expenses) {
    const { error } = await supabase
      .from('expenses')
      .upsert({
        id: expense.id,
        type: expense.type,
        date: expense.date,
        description: expense.description,
        amount: expense.amount,
        created_at: expense.createdAt,
      });
    if (error) throw error;
  }

  // Migrate shopping list
  for (const item of data.shoppingList) {
    const { error } = await supabase
      .from('shopping_list_items')
      .upsert({
        id: item.id,
        product_id: item.productId,
        quantity: item.quantity,
        is_ordered: item.isOrdered || item.checked || false,
        checked: item.checked || item.isOrdered || false,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      });
    if (error) throw error;
  }

  // Migrate settings
  for (const setting of data.settings) {
    const { error } = await supabase
      .from('settings')
      .upsert({
        id: setting.id,
        key: setting.key,
        value: setting.value,
        created_at: setting.createdAt,
        updated_at: setting.updatedAt,
      });
    if (error) throw error;
  }

  console.log("Migration to Supabase completed");
}

export async function getProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_batches (*)
      `);

    if (error) throw error;

    return (data || []).map(item => {
      return {
        ...mapProduct(item),
        batches: (item.product_batches || []).map(mapProductBatch),
      };
    });
  } catch (err) {
    console.warn('Failed to fetch products from Supabase, falling back to localStorage:', err);
    return load().products;
  }
}

export async function getProductBatches(): Promise<ProductBatch[]> {
  try {
    const { data, error } = await supabase
      .from('product_batches')
      .select('*');

    if (error) throw error;
    return (data || []).map(mapProductBatch);
  } catch (err) {
    console.warn('Failed to fetch product batches from Supabase, falling back to localStorage:', err);
    return load().productBatches;
  }
}

export async function getSales(): Promise<Sale[]> {
  try {
    return await getSalesWithItems();
  } catch (err) {
    console.warn('Failed to fetch sales from Supabase, falling back to localStorage:', err);
    return load().sales;
  }
}

export async function getSaleItems(): Promise<SaleItem[]> {
  try {
    const { data, error } = await supabase
      .from('sale_items')
      .select('*');

    if (error) throw error;
    return (data || []).map(mapSaleItem);
  } catch (err) {
    console.warn('Failed to fetch sale items from Supabase, falling back to localStorage:', err);
    return load().saleItems;
  }
}

export async function getCustomers(): Promise<Customer[]> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*');

    if (error) throw error;
    return (data || []).map(mapCustomer);
  } catch (err) {
    console.warn('Failed to fetch customers from Supabase, falling back to localStorage:', err);
    return load().customers;
  }
}

export async function getExpenses(): Promise<Expense[]> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*');

    if (error) throw error;
    return (data || []).map(mapExpense);
  } catch (err) {
    console.warn('Failed to fetch expenses from Supabase, falling back to localStorage:', err);
    return load().expenses;
  }
}

export async function getShoppingList(): Promise<ShoppingListItem[]> {
  try {
    const { data, error } = await supabase
      .from('shopping_list_items')
      .select('*');

    if (error) throw error;
    return (data || []).map(mapShoppingListItem);
  } catch (err) {
    console.warn('Failed to fetch shopping list from Supabase, falling back to localStorage:', err);
    return load().shoppingList;
  }
}

export async function getSettings(): Promise<Setting[]> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*');
    if (error) throw error;
    return (data || []).map(mapSetting);
  } catch (err) {
    console.warn('Failed to fetch settings from Supabase, falling back to localStorage:', err);
    return load().settings;
  }
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((p) => p.id === id);
}

/** Total stock = sum of all batch quantities for a product */
export async function getProductStock(product: string | Product): Promise<number> {
  const productId = typeof product === "string" ? product : product.id;
  const batches = await getProductBatches();

  return batches
    .filter((b) => (b.productId) === productId) // ✅ handle kedua format
    .reduce((sum, b) => sum + (b.quantity || 0), 0);
}

// MUTATION FUNCTIONS (write operations)

export async function addProduct(product: Omit<Product, "id" | "created_at" | "updated_at">): Promise<Product> {
  try {
    // const userId = await getCurrentUserId();
    const now = new Date().toISOString();
    const newProduct = {
      ...product,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    };

    // Save to Supabase
    const { data, error } = await supabase
      .from('products')
      .insert(mapProductDB(newProduct))
      .select()
      .single();

    if (error) throw error;

    // Save batches if any
    if (product.batches && product.batches.length > 0) {
      const batches = product.batches.map(batch => ({
        id: batch.id || crypto.randomUUID(),
        product_id: data.id,
        quantity: batch.quantity,
        expiry_date: batch.expiryDate,
        cost_per_unit: batch.costPerUnit,
        created_at: batch.createdAt || now,
      }));

      const { error: batchError } = await supabase
        .from('product_batches')
        .insert(batches);

      if (batchError) throw batchError;
    }

    // Also save to localStorage for fallback
    const products = load().products;
    products.push(newProduct);
    save({ ...load(), products });

    return newProduct;
  } catch (error) {
    console.error('Error adding product to Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const products = load().products;
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...product,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    products.push(newProduct);
    save({ ...load(), products });
    return newProduct;
  }
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
  try {
    const now = new Date().toISOString();

    // Update in Supabase
    const { data, error } = await supabase
      .from('products')
      .update({
        name: updates.name,
        category: updates.category,              // ← tambah
        price: updates.price,
        threshold: updates.threshold,
        image_url: updates.imageUrl,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update batches if provided
    if (updates.batches) {
      // First delete existing batches
      await supabase
        .from('product_batches')
        .delete()
        .eq('product_id', id);

      // Then insert new batches
      const batches = updates.batches.map(batch => ({
        id: batch.id || crypto.randomUUID(),
        product_id: id,
        quantity: batch.quantity,
        expiry_date: batch.expiryDate,
        cost_per_unit: batch.costPerUnit,
        created_at: batch.createdAt || now,
      }));

      const { error: batchError } = await supabase
        .from('product_batches')
        .insert(batches);

      if (batchError) throw batchError;
    }

    // Update localStorage
    const products = load().products;
    const idx = products.findIndex((p) => p.id === id);
    if (idx !== -1) {
      products[idx] = {
        ...products[idx],
        ...updates,
        updatedAt: now,
      };
      save({ ...load(), products });
      return products[idx];
    }

    return data;
  } catch (error) {
    console.error('Error updating product in Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const products = load().products;
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    
    products[idx] = {
      ...products[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    save({ ...load(), products });
    return products[idx];
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    // Delete from Supabase (cascade will handle batches)
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      // Check if it's a foreign key constraint error
      if (error.code === '23503' || error.message?.includes('foreign key constraint')) {
        throw new Error('Produk ini sudah pernah dijual dan tidak bisa dihapus. Anda dapat mengedit atau menonaktifkan produk.');
      }
      throw error;
    }

    // Update localStorage
    const data = load();
    data.products = data.products.filter((p) => p.id !== id);
    data.productBatches = data.productBatches.filter((b) => b.productId !== id);
    data.shoppingList = data.shoppingList.filter((item) => item.productId !== id);
    save(data);

    return true;
  } catch (error) {
    console.error('Error deleting product from Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const data = load();
    const originalLength = data.products.length;
    data.products = data.products.filter((p) => p.id !== id);
    if (data.products.length === originalLength) {
      throw new Error('Produk tidak ditemukan');
    }
    
    data.productBatches = data.productBatches.filter((b) => b.productId !== id);
    data.shoppingList = data.shoppingList.filter((item) => item.productId !== id);
    save(data);
    return true;
  }
}

export async function addProductBatch(batch: Omit<ProductBatch, "id" | "created_at">): Promise<ProductBatch> {
  try {
    const now = new Date().toISOString();
    const newBatch = {
      ...batch,
      id: crypto.randomUUID(),
      created_at: now,
    };

    // Save to Supabase
    const { error } = await supabase
      .from('product_batches')
      .insert({
        id: newBatch.id,
        product_id: newBatch.productId,
        quantity: newBatch.quantity,
        expiry_date: newBatch.expiryDate,
        cost_per_unit: newBatch.costPerUnit,
        created_at: now,
      });

    if (error) throw error;

    // Update localStorage
    const batches = load().productBatches;
    batches.push(newBatch);
    save({ ...load(), productBatches: batches });

    return newBatch;
  } catch (error) {
    console.error('Error adding product batch to Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const batches = load().productBatches;
    const now = new Date().toISOString();
    const newBatch: ProductBatch = {
      ...batch,
      id: crypto.randomUUID(),
      createdAt: now,
    };
    batches.push(newBatch);
    save({ ...load(), productBatches: batches });
    return newBatch;
  }
}

export async function addSale(sale: Omit<Sale, "id" | "created_at">): Promise<Sale> {
  try {
    const userId = await getCurrentUserId();
    const now = new Date().toISOString();
    const newSale = {
      ...sale,
      id: crypto.randomUUID(),
      created_at: now,
    };

    // Save sale to Supabase
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert(mapSaleDB(newSale))
      .select()
      .single();

    if (saleError) throw saleError;

    // Save sale items to Supabase
    const saleItems = newSale.items.map(item => ({
      id: item.id || crypto.randomUUID(),
      sale_id: saleData.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) throw itemsError;

    // Update localStorage
    const data = load();
    data.sales.push(newSale);
    data.saleItems.push(...saleItems);
    save(data);

    return newSale;
  } catch (error) {
    console.error('Error adding sale to Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const data = load();
    const now = new Date().toISOString();
    const newSale: Sale = {
      ...sale,
      id: crypto.randomUUID(),
      createdAt: now,
    };
    data.sales.push(newSale);
    data.saleItems.push(...sale.items.map(item => ({
      ...item,
      id: item.id || crypto.randomUUID(),
      sale_id: newSale.id,
    })));
    save(data);
    return newSale;
  }
}

export async function deductStock(productId: string, quantity: number): Promise<boolean> {
  try {
    // ✅ handle kedua format
    const batches = (await getProductBatches()).filter(
      (b) => (b.productId) === productId
    );
    
    const total = batches.reduce((sum, b) => sum + b.quantity, 0);
    if (total < quantity) return false;

    const sortedBatches = [...batches].sort(
      (a, b) =>
        new Date(a.expiryDate || "").getTime() -
        new Date(b.expiryDate || "").getTime()
    );

    let remaining = quantity;
    const updatedBatches: ProductBatch[] = [];

    for (const batch of sortedBatches) {
      if (remaining <= 0) {
        updatedBatches.push(batch);
        continue;
      }
      const take = Math.min(batch.quantity, remaining);
      remaining -= take;
      const left = batch.quantity - take;
      if (left > 0) {
        updatedBatches.push({ ...batch, quantity: left });
      }
    }

    if (remaining > 0) return false;

    // Update Supabase
    for (const batch of updatedBatches) {
      const { error } = await supabase
        .from("product_batches")
        .update({ quantity: batch.quantity })
        .eq("id", batch.id);
      if (error) throw error;
    }

    // Delete zero-quantity batches
    const batchesToDelete = batches
      .filter((b) => !updatedBatches.some((ub) => ub.id === b.id))
      .map((b) => b.id);

    if (batchesToDelete.length > 0) {
      await supabase
        .from("product_batches")
        .delete()
        .in("id", batchesToDelete);
    }

    // ✅ Build dari data yang sudah ada, jangan re-fetch
    const allBatches = (await getProductBatches()).filter(
      (b) => (b.productId) !== productId
    ).concat(updatedBatches);

    const data = load();
    data.productBatches = allBatches;
    save(data);

    return true;
  } catch (error) {
    console.error("Error deducting stock in Supabase, falling back to localStorage:", error);
    
    // Fallback localStorage — ✅ fix field name di sini juga
    const batches = getProductBatchesSync().filter(
      (b) => (b.productId) === productId
    );
    const total = batches.reduce((sum, b) => sum + b.quantity, 0);
    if (total < quantity) return false;

    const sortedBatches = [...batches].sort(
      (a, b) =>
        new Date(a.expiryDate || "").getTime() -
        new Date(b.expiryDate || "").getTime()
    );

    let remaining = quantity;
    const updatedBatches: ProductBatch[] = [];

    for (const batch of sortedBatches) {
      if (remaining <= 0) {
        updatedBatches.push(batch);
        continue;
      }
      const take = Math.min(batch.quantity, remaining);
      remaining -= take;
      const left = batch.quantity - take;
      if (left > 0) {
        updatedBatches.push({ ...batch, quantity: left });
      }
    }

    if (remaining > 0) return false;

    const allBatches = getProductBatchesSync()
      .filter((b) => (b.productId) !== productId)
      .concat(updatedBatches);

    const data = load();
    data.productBatches = allBatches;
    save(data);
    return true;
  }
}

// Synchronous versions for internal use (fallback only)
function getProductBatchesSync(): ProductBatch[] {
  return load().productBatches;
}

export async function addCustomer(customer: Omit<Customer, "id" | "createdAt" | "updatedAt">): Promise<Customer> {
  try {
    const now = new Date().toISOString();
    const newCustomer: Customer = {
      ...customer,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await supabase
      .from('customers')
      .insert(mapCustomerDB(newCustomer));

    if (error) throw error;

    const customers = load().customers;
    customers.push(newCustomer);
    save({ ...load(), customers });

    return newCustomer;
  } catch (error) {
    console.error('Error adding customer to Supabase, falling back to localStorage:', error);
    const customers = load().customers;
    const now = new Date().toISOString();
    const newCustomer: Customer = {
      ...customer,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    customers.push(newCustomer);
    save({ ...load(), customers });
    return newCustomer;
  }
}

export async function updateCustomer(id: string, updates: Partial<Omit<Customer, "id" | "createdAt" | "updatedAt">>): Promise<Customer | undefined> {
  try {
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('customers')
      .update({
        name: updates.name,
        phone: updates.phone,
        address: updates.address,
        updated_at: now,
      })
      .eq('id', id);

    if (error) throw error;

    // Update localStorage
    const data = load();
    const idx = data.customers.findIndex((c) => c.id === id);
    if (idx !== -1) {
      data.customers[idx] = {
        ...data.customers[idx],
        ...updates,
        updatedAt: now,
      };
      save(data);
      return data.customers[idx];
    }

    return undefined;
  } catch (error) {
    console.error('Error updating customer in Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const data = load();
    const idx = data.customers.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    
    data.customers[idx] = {
      ...data.customers[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    save(data);
    return data.customers[idx];
  }
}

export async function deleteCustomer(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Update localStorage
    const data = load();
    data.customers = data.customers.filter((c) => c.id !== id);
    save(data);

    return true;
  } catch (error) {
    console.error('Error deleting customer from Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const data = load();
    const originalLength = data.customers.length;
    data.customers = data.customers.filter((c) => c.id !== id);
    const success = data.customers.length < originalLength;
    if (success) save(data);
    return success;
  }
}

export async function addExpense(expense: Omit<Expense, "id" | "createdAt">): Promise<Expense> {
  try {
    const now = new Date().toISOString();
    const newExpense = {
      ...expense,
      id: crypto.randomUUID(),
      createdAt: now,
    };

    const { error } = await supabase
      .from('expenses')
      .insert(mapExpenseDB(newExpense));

    if (error) throw error;

    const expenses = load().expenses;
    expenses.push(newExpense);
    save({ ...load(), expenses });

    return newExpense;
  } catch (error) {
    console.error('Error adding expense to Supabase, falling back to localStorage:', error);
    const expenses = load().expenses;
    const now = new Date().toISOString();
    const newExpense: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      createdAt: now,
    };
    expenses.push(newExpense);
    save({ ...load(), expenses });
    return newExpense;
  }
}

export async function updateExpense(id: string, updates: Partial<Omit<Expense, "id" | "createdAt">>): Promise<Expense | undefined> {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('expenses')
      .update({
        type: updates.type,
        date: updates.date,
        description: updates.description,
        amount: updates.amount,
        category: updates.category,
        notes: updates.notes,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update localStorage
    const expenses = load().expenses;
    const idx = expenses.findIndex((e) => e.id === id);
    if (idx !== -1) {
      expenses[idx] = {
        ...expenses[idx],
        ...updates,
        createdAt: expenses[idx].createdAt,
      };
      save({ ...load(), expenses });
    }

    return data ? mapExpense(data) : undefined;
  } catch (error) {
    console.error('Error updating expense in Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const expenses = load().expenses;
    const idx = expenses.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    
    expenses[idx] = {
      ...expenses[idx],
      ...updates,
      createdAt: expenses[idx].createdAt,
    };
    save({ ...load(), expenses });
    return expenses[idx];
  }
}

export async function deleteExpense(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Update localStorage
    const expenses = load().expenses.filter((e) => e.id !== id);
    save({ ...load(), expenses });

    return true;
  } catch (error) {
    console.error('Error deleting expense from Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const expenses = load().expenses.filter((e) => e.id !== id);
    save({ ...load(), expenses });
    return true;
  }
}

export async function addShoppingListItem(
  item: Omit<ShoppingListItem, "id" | "created_at" | "updated_at" | "is_ordered" | "checked">
): Promise<ShoppingListItem> {
  try {
    const now = new Date().toISOString();
    const newItem = {
      ...item,
      id: crypto.randomUUID(),
      is_ordered: false,
      checked: false,
      createdAt: now,
      updatedAt: now,
    };
    
    const { error } = await supabase
      .from('shopping_list_items')
      .insert(mapShoppingListItemDB(newItem));

    if (error) throw error;

    const list = load().shoppingList;
    list.push(newItem);
    save({ ...load(), shoppingList: list });

    return newItem;
  } catch (error) {
    console.error('Error adding shopping list item to Supabase, falling back to localStorage:', error);
    const list = load().shoppingList;
    const now = new Date().toISOString();
    const newItem: ShoppingListItem = {
      ...item,
      id: crypto.randomUUID(),
      isOrdered: false,
      checked: false,
      createdAt: now,
      updatedAt: now,
    };
    list.push(newItem);
    save({ ...load(), shoppingList: list });
    return newItem;
  }
}

/**
 * Delete a sale and its associated items, and restore stock
 */
export async function deleteSale(saleId: string): Promise<boolean> {
  try {
    const data = load();
    const sale = data.sales.find(s => s.id === saleId);
    
    if (!sale) return false;

    // Get sale items
    const saleItems = data.saleItems.filter(si => si.saleId === saleId);

    // Restore stock for each item
    for (const item of saleItems) {
      await addProductBatch({
        productId: item.productId,
        quantity: item.quantity,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        costPerUnit: 0,
      });
    }

    // Delete from Supabase
    const { error: itemsError } = await supabase
      .from('sale_items')
      .delete()
      .eq('sale_id', saleId);

    if (itemsError) throw itemsError;

    const { error: saleError } = await supabase
      .from('sales')
      .delete()
      .eq('id', saleId);

    if (saleError) throw saleError;

    // Delete from localStorage
    data.sales = data.sales.filter(s => s.id !== saleId);
    data.saleItems = data.saleItems.filter(si => si.saleId !== saleId);
    save(data);

    return true;
  } catch (error) {
    console.error('Error deleting sale:', error);
    // Fallback to localStorage only
    const data = load();
    const saleItems = data.saleItems.filter(si => si.saleId === saleId);
    
    // Restore stock
    for (const item of saleItems) {
      const batches = data.productBatches.filter(b => b.productId === item.productId);
      const totalQty = batches.reduce((sum, b) => sum + b.quantity, 0);
      
      // Add back as a single batch
      data.productBatches.push({
        id: crypto.randomUUID(),
        productId: item.productId,
        quantity: item.quantity,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        costPerUnit: 0,
        createdAt: new Date().toISOString(),
      });
    }
    
    data.sales = data.sales.filter(s => s.id !== saleId);
    data.saleItems = data.saleItems.filter(si => si.saleId !== saleId);
    save(data);
    return true;
  }
}

/**
 * Update a sale record
 */
export async function updateSale(saleId: string, updates: Partial<Sale>): Promise<Sale | null> {
  try {
    const data = load();
    const sale = data.sales.find(s => s.id === saleId);
    
    if (!sale) return null;

    const updatedSale: Sale = { ...sale, ...updates };

    // Update in Supabase
    const { error } = await supabase
      .from('sales')
      .update({
        customer_id: updatedSale.customerId,
        customer_type: updatedSale.customerType,
        payment_method: updatedSale.paymentMethod,
        payment_nominal: updatedSale.paymentNominal,
        total_amount: updatedSale.totalAmount,
        receipt_url: updatedSale.receiptUrl,
      })
      .eq('id', saleId);

    if (error) throw error;

    // Update in localStorage
    const index = data.sales.findIndex(s => s.id === saleId);
    if (index !== -1) {
      data.sales[index] = updatedSale;
      save(data);
    }

    return updatedSale;
  } catch (error) {
    console.error('Error updating sale:', error);
    // Fallback to localStorage
    const data = load();
    const index = data.sales.findIndex(s => s.id === saleId);
    
    if (index === -1) return null;

    const updatedSale: Sale = { ...data.sales[index], ...updates };
    data.sales[index] = updatedSale;
    save(data);
    return updatedSale;
  }
}

/**
 * Update sale items and recalculate the total amount
 */
export async function updateSaleItems(saleId: string, newItems: SaleItem[]): Promise<Sale | null> {
  try {
    const data = load();
    const sale = data.sales.find(s => s.id === saleId);
    
    if (!sale) return null;

    // Calculate new total amount
    const newTotalAmount = newItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

    // Update sale items in Supabase
    const { error: deleteError } = await supabase
      .from('sale_items')
      .delete()
      .eq('sale_id', saleId);

    if (deleteError) throw deleteError;

    // Insert new items
    const saleItemsToInsert = newItems.map(item => ({
      id: item.id || crypto.randomUUID(),
      sale_id: saleId,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice || 0,
      total_price: item.totalPrice || 0,
    }));

    if (saleItemsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('sale_items')
        .insert(saleItemsToInsert);

      if (insertError) throw insertError;
    }

    // Update sale with new total amount
    const { error: updateError } = await supabase
      .from('sales')
      .update({ total_amount: newTotalAmount })
      .eq('id', saleId);

    if (updateError) throw updateError;

    // Update localStorage
    const saleIndex = data.sales.findIndex(s => s.id === saleId);
    if (saleIndex !== -1) {
      data.sales[saleIndex].items = newItems;
      data.sales[saleIndex].totalAmount = newTotalAmount;
    }
    
    data.saleItems = data.saleItems.filter(si => si.saleId !== saleId);
    data.saleItems.push(...newItems);
    save(data);

    return data.sales[saleIndex] || null;
  } catch (error) {
    console.error('Error updating sale items:', error);
    // Fallback to localStorage
    const data = load();
    const saleIndex = data.sales.findIndex(s => s.id === saleId);
    
    if (saleIndex === -1) return null;

    const newTotalAmount = newItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    data.sales[saleIndex].items = newItems;
    data.sales[saleIndex].totalAmount = newTotalAmount;
    
    data.saleItems = data.saleItems.filter(si => si.saleId !== saleId);
    data.saleItems.push(...newItems);
    save(data);

    return data.sales[saleIndex];
  }
}

export async function updateShoppingList(
  updates: (Partial<ShoppingListItem> & { id: string })[]
): Promise<void> {
  try {
    const now = new Date().toISOString();

    for (const u of updates) {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({
          quantity: u.quantity,
          is_ordered: u.isOrdered ?? u.checked,
          checked: u.checked ?? u.isOrdered,
          updated_at: now,
        })
        .eq('id', u.id);

      if (error) throw error;
    }

    const list = load().shoppingList;
    for (const u of updates) {
      const i = list.findIndex((x) => x.id === u.id);
      if (i !== -1) {
        list[i] = { 
          ...list[i], 
          ...u,
          updatedAt: now,
        };
      }
    }
    save({ ...load(), shoppingList: list });
  } catch (error) {
    console.error('Error updating shopping list in Supabase, falling back to localStorage:', error);
    const list = load().shoppingList;
    const now = new Date().toISOString();
    for (const u of updates) {
      const i = list.findIndex((x) => x.id === u.id);
      if (i !== -1) {
        list[i] = { 
          ...list[i], 
          ...u,
          updatedAt: now,
        };
      }
    }
    save({ ...load(), shoppingList: list });
  }
}

export async function removeShoppingListItem(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('id', id);

    if (error) throw error;

    const list = load().shoppingList.filter((x) => x.id !== id);
    save({ ...load(), shoppingList: list });
  } catch (error) {
    console.error('Error removing shopping list item from Supabase, falling back to localStorage:', error);
    const list = load().shoppingList.filter((x) => x.id !== id);
    save({ ...load(), shoppingList: list });
  }
}

// Keep sync versions for backward compatibility during migration
export function saveProducts(products: Product[]): void {
  const data = load();
  data.products = products;
  save(data);
}

export function saveProductBatches(batches: ProductBatch[]): void {
  const data = load();
  data.productBatches = batches;
  save(data);
}

export function saveSales(sales: Sale[]): void {
  const data = load();
  data.sales = sales;
  save(data);
}

export function saveSaleItems(items: SaleItem[]): void {
  const data = load();
  data.saleItems = items;
  save(data);
}

export function saveCustomers(customers: Customer[]): void {
  const data = load();
  data.customers = customers;
  save(data);
}

export function saveExpenses(expenses: Expense[]): void {
  const data = load();
  data.expenses = expenses;
  save(data);
}

export function saveShoppingList(list: ShoppingListItem[]): void {
  const data = load();
  data.shoppingList = list;
  save(data);
}

export function saveSettings(settings: Setting[]): void {
  const data = load();
  data.settings = settings;
  save(data);
}