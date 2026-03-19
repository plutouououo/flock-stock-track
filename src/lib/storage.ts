/**
 * Storage layer for PoultryMart.
 * Supports localStorage fallback and Supabase sync.
 */

import type { AppData, Product, Sale, ShoppingListItem, ProductBatch, SaleItem, Customer, Expense, Setting } from "@/types";
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

// Helper function to convert snake_case to camelCase for frontend
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Transform database record to frontend type (snake_case to camelCase)
function transformDbToFrontend<T>(record: any): T {
  if (!record) return record;
  
  const transformed: any = {};
  for (const [key, value] of Object.entries(record)) {
    const camelKey = toCamelCase(key);
    transformed[camelKey] = value;
  }
  return transformed as T;
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

    // Map the result to flatten sale_items into items and transform to camelCase
    const mapped = data?.map(sale => {
      const transformedSale = transformDbToFrontend<Omit<Sale, 'items'>>(sale);
      const items = (sale.sale_items || []).map((item: any) => 
        transformDbToFrontend<SaleItem>(item)
      );
      return {
        ...transformedSale,
        items,
        customerType: transformedSale.customerType as Sale['customerType'],
        paymentMethod: transformedSale.paymentMethod as Sale['paymentMethod'],
      };
    }) || [];

    return mapped;
  } catch (err) {
    console.error('Error fetching sales with items:', err);
    // Fallback to localStorage
    const sales = load().sales;
    const saleItems = load().saleItems;
    return sales.map(sale => ({
      ...sale,
      items: saleItems.filter(item => item.sale_id === sale.id)
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
        image_url: product.image_url || product.imageUrl,
        created_at: product.created_at || product.createdAt,
        updated_at: product.updated_at || product.updatedAt,
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
            expiry_date: batch.expiry_date || batch.expiryDate,
            cost_per_unit: batch.cost_per_unit || batch.costPerUnit,
            created_at: batch.created_at || batch.createdAt,
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
        product_id: batch.product_id,
        quantity: batch.quantity,
        expiry_date: batch.expiry_date || batch.expiryDate,
        cost_per_unit: batch.cost_per_unit || batch.costPerUnit,
        created_at: batch.created_at || batch.createdAt,
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
        customer_id: sale.customer_id || sale.customerId,
        customer_type: sale.customer_type || sale.customerType,
        payment_method: sale.payment_method || sale.paymentMethod,
        payment_nominal: sale.payment_nominal || sale.paymentNominal,
        total_amount: sale.total_amount || sale.total,
        receipt_url: sale.receipt_url || sale.receiptUrl,
        created_at: sale.created_at || sale.createdAt,
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
          product_id: item.product_id || item.productId,
          quantity: item.quantity,
          unit_price: item.unit_price || item.unitPrice,
          total_price: item.total_price || item.totalPrice,
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
        created_at: customer.created_at,
        updated_at: customer.updated_at, 
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
        created_at: expense.created_at,
      });
    if (error) throw error;
  }

  // Migrate shopping list
  for (const item of data.shoppingList) {
    const { error } = await supabase
      .from('shopping_list_items')
      .upsert({
        id: item.id,
        product_id: item.product_id || item.productId,
        quantity: item.quantity,
        is_ordered: item.is_ordered || item.checked || false,
        checked: item.checked || item.is_ordered || false,
        created_at: item.created_at || item.createdAt,
        updated_at: item.updated_at || item.updatedAt,
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
        created_at: setting.created_at,
        updated_at: setting.updated_at,
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
      const product = transformDbToFrontend<Product>(item);
      return {
        ...product,
        batches: (item.product_batches || []).map((batch: any) => 
          transformDbToFrontend<ProductBatch>(batch)
        ),
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
    return (data || []).map(item => transformDbToFrontend<ProductBatch>(item));
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
    return (data || []).map(item => transformDbToFrontend<SaleItem>(item));
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
    return (data || []).map(item => transformDbToFrontend<Customer>(item));
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
    return (data || []).map(item => transformDbToFrontend<Expense>(item));
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
    return (data || []).map(item => transformDbToFrontend<ShoppingListItem>(item));
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
    return (data || []).map(item => transformDbToFrontend<Setting>(item));
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
  
  if (!Array.isArray(batches)) {
    console.warn('Product batches data is not an array. Check data integrity.', batches);
    return 0;
  }
  
  return batches
    .filter((b) => b.product_id === productId)
    .reduce((sum, b) => sum + (b.quantity || 0), 0);
}

// MUTATION FUNCTIONS (write operations)

export async function addProduct(product: Omit<Product, "id" | "created_at" | "updated_at">): Promise<Product> {
  try {
    const userId = await getCurrentUserId();
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
      .insert({
        id: newProduct.id,
        name: newProduct.name,
        sku: newProduct.sku,
        price: newProduct.price,
        threshold: newProduct.threshold,
        image_url: newProduct.image_url || newProduct.imageUrl,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    // Save batches if any
    if (product.batches && product.batches.length > 0) {
      const batches = product.batches.map(batch => ({
        id: batch.id || crypto.randomUUID(),
        product_id: data.id,
        quantity: batch.quantity,
        expiry_date: batch.expiry_date || batch.expiryDate,
        cost_per_unit: batch.cost_per_unit || batch.costPerUnit,
        created_at: batch.created_at || batch.createdAt || now,
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
      created_at: now,
      updated_at: now,
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
        price: updates.price,
        threshold: updates.threshold,
        image_url: updates.image_url || updates.imageUrl,
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
        expiry_date: batch.expiry_date || batch.expiryDate,
        cost_per_unit: batch.cost_per_unit || batch.costPerUnit,
        created_at: batch.created_at || batch.createdAt || now,
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
        updated_at: now,
      };
      save({ ...load(), products });
      return products[idx];
    }

    return transformDbToFrontend<Product>(data);
  } catch (error) {
    console.error('Error updating product in Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const products = load().products;
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    
    products[idx] = {
      ...products[idx],
      ...updates,
      updated_at: new Date().toISOString(),
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

    if (error) throw error;

    // Update localStorage
    const data = load();
    data.products = data.products.filter((p) => p.id !== id);
    data.productBatches = data.productBatches.filter((b) => b.product_id !== id);
    data.shoppingList = data.shoppingList.filter((item) => item.product_id !== id);
    save(data);

    return true;
  } catch (error) {
    console.error('Error deleting product from Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const data = load();
    const originalLength = data.products.length;
    data.products = data.products.filter((p) => p.id !== id);
    if (data.products.length === originalLength) return false;
    
    data.productBatches = data.productBatches.filter((b) => b.product_id !== id);
    data.shoppingList = data.shoppingList.filter((item) => item.product_id !== id);
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
        product_id: newBatch.product_id,
        quantity: newBatch.quantity,
        expiry_date: newBatch.expiry_date || newBatch.expiryDate,
        cost_per_unit: newBatch.cost_per_unit || newBatch.costPerUnit,
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
      created_at: now,
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
      .insert({
        id: newSale.id,
        cashier_id: userId,
        customer_id: newSale.customer_id || newSale.customerId,
        customer_type: newSale.customer_type || newSale.customerType,
        payment_method: newSale.payment_method || newSale.paymentMethod,
        payment_nominal: newSale.payment_nominal || newSale.paymentNominal,
        total_amount: newSale.total_amount || newSale.total,
        receipt_url: newSale.receipt_url || newSale.receiptUrl,
        created_at: now,
      })
      .select()
      .single();

    if (saleError) throw saleError;

    // Save sale items to Supabase
    const saleItems = newSale.items.map(item => ({
      id: item.id || crypto.randomUUID(),
      sale_id: saleData.id,
      product_id: item.product_id || item.productId,
      quantity: item.quantity,
      unit_price: item.unit_price || item.unitPrice,
      total_price: item.total_price || item.totalPrice,
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
      created_at: now,
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
    const batches = (await getProductBatches()).filter(b => b.product_id === productId);
    const total = batches.reduce((sum, b) => sum + b.quantity, 0);
    if (total < quantity) return false;
    
    const sortedBatches = [...batches].sort(
      (a, b) => new Date(a.expiry_date || a.expiryDate || '').getTime() - 
               new Date(b.expiry_date || b.expiryDate || '').getTime()
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
        updatedBatches.push({ 
          ...batch, 
          quantity: left 
        });
      }
    }
    
    if (remaining > 0) return false;
    
    // Update in Supabase
    for (const batch of updatedBatches) {
      const { error } = await supabase
        .from('product_batches')
        .update({ quantity: batch.quantity })
        .eq('id', batch.id);
      
      if (error) throw error;
    }
    
    // Delete batches with zero quantity
    const batchesToDelete = batches
      .filter(b => !updatedBatches.some(ub => ub.id === b.id))
      .map(b => b.id);
    
    if (batchesToDelete.length > 0) {
      await supabase
        .from('product_batches')
        .delete()
        .in('id', batchesToDelete);
    }
    
    // Update localStorage
    const allBatches = (await getProductBatches())
      .filter(b => b.product_id !== productId)
      .concat(updatedBatches);
    
    const data = load();
    data.productBatches = allBatches;
    save(data);
    
    return true;
  } catch (error) {
    console.error('Error deducting stock in Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const batches = getProductBatchesSync().filter(b => b.product_id === productId);
    const total = batches.reduce((sum, b) => sum + b.quantity, 0);
    if (total < quantity) return false;
    
    const sortedBatches = [...batches].sort(
      (a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
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
      .filter(b => b.product_id !== productId)
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

export async function addCustomer(customer: Omit<Customer, "id" | "created_at" | "updated_at">): Promise<Customer> {
  try {
    const now = new Date().toISOString();
    const newCustomer = {
      ...customer,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    };

    const { error } = await supabase
      .from('customers')
      .insert({
        id: newCustomer.id,
        name: newCustomer.name,
        phone: newCustomer.phone,
        address: newCustomer.address,
        created_at: now,
        updated_at: now,
      });

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
      created_at: now,
      updated_at: now,
    };
    customers.push(newCustomer);
    save({ ...load(), customers });
    return newCustomer;
  }
}

export async function addExpense(expense: Omit<Expense, "id" | "created_at">): Promise<Expense> {
  try {
    const now = new Date().toISOString();
    const newExpense = {
      ...expense,
      id: crypto.randomUUID(),
      created_at: now,
    };

    const { error } = await supabase
      .from('expenses')
      .insert({
        id: newExpense.id,
        type: newExpense.type,
        date: newExpense.date,
        description: newExpense.description,
        amount: newExpense.amount,
        created_at: now,
      });

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
      created_at: now,
    };
    expenses.push(newExpense);
    save({ ...load(), expenses });
    return newExpense;
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
      created_at: now,
      updated_at: now,
    };

    const { error } = await supabase
      .from('shopping_list_items')
      .insert({
        id: newItem.id,
        product_id: newItem.product_id || newItem.productId,
        quantity: newItem.quantity,
        is_ordered: false,
        checked: false,
        created_at: now,
        updated_at: now,
      });

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
      is_ordered: false,
      checked: false,
      created_at: now,
      updated_at: now,
    };
    list.push(newItem);
    save({ ...load(), shoppingList: list });
    return newItem;
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
          is_ordered: u.is_ordered ?? u.checked,
          checked: u.checked ?? u.is_ordered,
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
          updated_at: now,
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
          updated_at: now,
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