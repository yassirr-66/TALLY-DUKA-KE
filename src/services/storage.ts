import type {
  Business,
  Debt,
  DukaDatabase,
  Expense,
  ExpenseCategory,
  PaymentMethod,
  Product,
  Sale,
  SaleItem,
  StockMovement,
  ThemeMode,
} from '../types/duka';
import { addDaysISO, calculateSaleTotal, getTodayISO } from '../utils/calculations';

export const STORAGE_KEY = 'tally_duka_db_v1';

export function createEmptyDatabase(): DukaDatabase {
  return {
    version: 1,
    business: null,
    products: [],
    sales: [],
    expenses: [],
    debts: [],
    stockMovements: [],
    theme: 'light',
    lastSyncedAt: null,
  };
}

export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// ============================================================================
// Pure State Mutations (easily unit-tested and backend-agnostic)
// ============================================================================

export function applySaveBusiness(db: DukaDatabase, business: Business): DukaDatabase {
  return {
    ...db,
    business: {
      ...business,
      id: business.id || 'duka_main',
      updatedAt: new Date().toISOString(),
    },
  };
}

export function applySetTheme(db: DukaDatabase, theme: ThemeMode): DukaDatabase {
  return { ...db, theme };
}

export function applyAddProduct(
  db: DukaDatabase,
  input: Omit<Product, 'id' | 'updatedAt'>
): DukaDatabase {
  const product: Product = {
    ...input,
    id: generateId('prod'),
    updatedAt: new Date().toISOString(),
  };
  const movements = [...db.stockMovements];
  if (product.quantity > 0) {
    movements.unshift({
      id: generateId('mov'),
      productId: product.id,
      type: 'restock',
      qty: product.quantity,
      date: getTodayISO(),
      reason: 'Opening stock',
      createdAt: new Date().toISOString(),
    });
  }
  return {
    ...db,
    products: [product, ...db.products],
    stockMovements: movements,
  };
}

export function applyUpdateProduct(db: DukaDatabase, updated: Product): DukaDatabase {
  return {
    ...db,
    products: db.products.map((p) =>
      p.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : p
    ),
  };
}

export function applyDeleteProduct(db: DukaDatabase, productId: string): DukaDatabase {
  return {
    ...db,
    products: db.products.filter((p) => p.id !== productId),
  };
}

export function applyRestockProduct(
  db: DukaDatabase,
  params: {
    productId: string;
    qtyToAdd: number;
    unitBuyPrice?: number;
    date: string;
    reason?: string;
    recordAsExpense: boolean;
    paymentMethod?: PaymentMethod;
  }
): DukaDatabase {
  const { productId, qtyToAdd, unitBuyPrice, date, reason, recordAsExpense, paymentMethod = 'Cash' } =
    params;
  if (qtyToAdd <= 0) return db;

  const target = db.products.find((p) => p.id === productId);
  if (!target) return db;

  const effectiveBuyPrice =
    typeof unitBuyPrice === 'number' && unitBuyPrice >= 0 ? unitBuyPrice : target.buyPrice;
  const now = new Date().toISOString();

  const updatedProducts = db.products.map((p) =>
    p.id === productId
      ? {
          ...p,
          quantity: p.quantity + qtyToAdd,
          buyPrice: effectiveBuyPrice,
          updatedAt: now,
        }
      : p
  );

  const movement: StockMovement = {
    id: generateId('mov'),
    productId,
    type: 'restock',
    qty: qtyToAdd,
    date,
    reason: reason?.trim() || 'Restocked inventory',
    createdAt: now,
  };

  let expenses = db.expenses;
  if (recordAsExpense && effectiveBuyPrice > 0) {
    const totalCost = qtyToAdd * effectiveBuyPrice;
    const expense: Expense = {
      id: generateId('exp'),
      date,
      category: 'Stock Purchase',
      amount: totalCost,
      paymentMethod,
      notes: `Restock: ${target.name} (${qtyToAdd} ${target.unit})`,
      createdAt: now,
      updatedAt: now,
    };
    expenses = [expense, ...db.expenses];
  }

  return {
    ...db,
    products: updatedProducts,
    stockMovements: [movement, ...db.stockMovements],
    expenses,
  };
}

export function applyStockAdjustment(
  db: DukaDatabase,
  params: {
    productId: string;
    qtyRemoved: number;
    date: string;
    reason: string;
  }
): DukaDatabase {
  const { productId, qtyRemoved, date, reason } = params;
  if (qtyRemoved <= 0) return db;

  const target = db.products.find((p) => p.id === productId);
  if (!target) return db;

  const actualRemoved = Math.min(target.quantity, qtyRemoved);
  const now = new Date().toISOString();

  const updatedProducts = db.products.map((p) =>
    p.id === productId
      ? { ...p, quantity: Math.max(0, p.quantity - actualRemoved), updatedAt: now }
      : p
  );

  const movement: StockMovement = {
    id: generateId('mov'),
    productId,
    type: 'adjustment',
    qty: -actualRemoved,
    date,
    reason: reason.trim() || 'Stock adjustment',
    createdAt: now,
  };

  return {
    ...db,
    products: updatedProducts,
    stockMovements: [movement, ...db.stockMovements],
  };
}

export function applyAddSale(
  db: DukaDatabase,
  input: {
    date: string;
    items: SaleItem[];
    paymentMethod: PaymentMethod;
    customer: string;
    notes: string;
  }
): DukaDatabase {
  const now = new Date().toISOString();
  const productMap = new Map(db.products.map((p) => [p.id, p]));

  const normalizedItems: SaleItem[] = input.items.map((item) => {
    const prod = item.productId ? productMap.get(item.productId) : undefined;
    return {
      ...item,
      buyPrice: typeof item.buyPrice === 'number' ? item.buyPrice : prod?.buyPrice ?? 0,
    };
  });

  const total = calculateSaleTotal(normalizedItems);
  const sale: Sale = {
    id: generateId('sale'),
    date: input.date,
    items: normalizedItems,
    total,
    paymentMethod: input.paymentMethod,
    customer: input.customer.trim(),
    notes: input.notes.trim(),
    createdAt: now,
    updatedAt: now,
  };

  // Deduct stock quantities
  const deductions = new Map<string, number>();
  const newMovements: StockMovement[] = [];
  for (const item of normalizedItems) {
    if (item.productId) {
      deductions.set(item.productId, (deductions.get(item.productId) || 0) + item.qty);
      newMovements.push({
        id: generateId('mov'),
        productId: item.productId,
        type: 'sale',
        qty: -item.qty,
        date: sale.date,
        reason: `Sold (${sale.customer || 'Walk-in'})`,
        createdAt: now,
      });
    }
  }

  const updatedProducts = db.products.map((p) => {
    const deduct = deductions.get(p.id);
    if (!deduct) return p;
    return {
      ...p,
      quantity: Math.max(0, p.quantity - deduct),
      updatedAt: now,
    };
  });

  let updatedDebts = db.debts;
  if (sale.paymentMethod === 'Credit/Debt') {
    const debt: Debt = {
      id: generateId('debt'),
      customer: sale.customer || 'Walk-in customer',
      amount: sale.total,
      amountPaid: 0,
      saleId: sale.id,
      date: sale.date,
      status: 'unpaid',
      notes: sale.notes,
      updatedAt: now,
    };
    updatedDebts = [debt, ...db.debts];
  }

  return {
    ...db,
    products: updatedProducts,
    sales: [sale, ...db.sales],
    debts: updatedDebts,
    stockMovements: [...newMovements, ...db.stockMovements],
  };
}

export function applyDeleteSale(db: DukaDatabase, saleId: string): DukaDatabase {
  const existing = db.sales.find((s) => s.id === saleId);
  if (!existing) return db;

  const now = new Date().toISOString();
  const restorations = new Map<string, number>();
  const restoreMovements: StockMovement[] = [];

  for (const item of existing.items) {
    if (item.productId) {
      restorations.set(item.productId, (restorations.get(item.productId) || 0) + item.qty);
      restoreMovements.push({
        id: generateId('mov'),
        productId: item.productId,
        type: 'adjustment',
        qty: item.qty,
        date: getTodayISO(),
        reason: `Sale deleted (restored ${item.qty})`,
        createdAt: now,
      });
    }
  }

  const updatedProducts = db.products.map((p) => {
    const restore = restorations.get(p.id);
    if (!restore) return p;
    return { ...p, quantity: p.quantity + restore, updatedAt: now };
  });

  return {
    ...db,
    products: updatedProducts,
    sales: db.sales.filter((s) => s.id !== saleId),
    debts: db.debts.filter((d) => d.saleId !== saleId),
    stockMovements: [...restoreMovements, ...db.stockMovements],
  };
}

export function applyEditSale(
  db: DukaDatabase,
  saleId: string,
  input: {
    date: string;
    items: SaleItem[];
    paymentMethod: PaymentMethod;
    customer: string;
    notes: string;
  }
): DukaDatabase {
  const oldSale = db.sales.find((s) => s.id === saleId);
  if (!oldSale) return db;

  // Restore old stock first, then apply new deductions while preserving sale ID & createdAt
  const withoutOld = applyDeleteSale(db, saleId);
  const now = new Date().toISOString();
  const productMap = new Map(withoutOld.products.map((p) => [p.id, p]));

  const normalizedItems: SaleItem[] = input.items.map((item) => {
    const prod = item.productId ? productMap.get(item.productId) : undefined;
    return {
      ...item,
      buyPrice: typeof item.buyPrice === 'number' ? item.buyPrice : prod?.buyPrice ?? 0,
    };
  });

  const total = calculateSaleTotal(normalizedItems);
  const updatedSale: Sale = {
    ...oldSale,
    date: input.date,
    items: normalizedItems,
    total,
    paymentMethod: input.paymentMethod,
    customer: input.customer.trim(),
    notes: input.notes.trim(),
    updatedAt: now,
  };

  const deductions = new Map<string, number>();
  const newMovements: StockMovement[] = [];
  for (const item of normalizedItems) {
    if (item.productId) {
      deductions.set(item.productId, (deductions.get(item.productId) || 0) + item.qty);
      newMovements.push({
        id: generateId('mov'),
        productId: item.productId,
        type: 'sale',
        qty: -item.qty,
        date: updatedSale.date,
        reason: `Sale edited (${updatedSale.customer || 'Walk-in'})`,
        createdAt: now,
      });
    }
  }

  const updatedProducts = withoutOld.products.map((p) => {
    const deduct = deductions.get(p.id);
    if (!deduct) return p;
    return { ...p, quantity: Math.max(0, p.quantity - deduct), updatedAt: now };
  });

  // Re-create or preserve debt payment progress if still Credit/Debt
  const oldDebt = db.debts.find((d) => d.saleId === saleId);
  let updatedDebts = withoutOld.debts;
  if (updatedSale.paymentMethod === 'Credit/Debt') {
    const prevPaid = oldDebt ? Math.min(oldDebt.amountPaid, updatedSale.total) : 0;
    const status =
      prevPaid >= updatedSale.total ? 'paid' : prevPaid > 0 ? 'partial' : 'unpaid';
    const debt: Debt = {
      id: oldDebt?.id || generateId('debt'),
      customer: updatedSale.customer || 'Walk-in customer',
      amount: updatedSale.total,
      amountPaid: prevPaid,
      saleId: updatedSale.id,
      date: updatedSale.date,
      status,
      notes: updatedSale.notes,
      updatedAt: now,
    };
    updatedDebts = [debt, ...updatedDebts];
  }

  return {
    ...withoutOld,
    products: updatedProducts,
    sales: [updatedSale, ...withoutOld.sales].sort((a, b) =>
      b.date === a.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
    ),
    debts: updatedDebts,
    stockMovements: [...newMovements, ...withoutOld.stockMovements],
  };
}

export function applyAddExpense(
  db: DukaDatabase,
  input: {
    date: string;
    category: ExpenseCategory;
    amount: number;
    paymentMethod: PaymentMethod;
    notes: string;
  }
): DukaDatabase {
  const now = new Date().toISOString();
  const expense: Expense = {
    id: generateId('exp'),
    date: input.date,
    category: input.category,
    amount: input.amount,
    paymentMethod: input.paymentMethod,
    notes: input.notes.trim(),
    createdAt: now,
    updatedAt: now,
  };
  return {
    ...db,
    expenses: [expense, ...db.expenses],
  };
}

export function applyEditExpense(
  db: DukaDatabase,
  expenseId: string,
  input: {
    date: string;
    category: ExpenseCategory;
    amount: number;
    paymentMethod: PaymentMethod;
    notes: string;
  }
): DukaDatabase {
  const now = new Date().toISOString();
  return {
    ...db,
    expenses: db.expenses.map((e) =>
      e.id === expenseId
        ? {
            ...e,
            date: input.date,
            category: input.category,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            notes: input.notes.trim(),
            updatedAt: now,
          }
        : e
    ),
  };
}

export function applyDeleteExpense(db: DukaDatabase, expenseId: string): DukaDatabase {
  return {
    ...db,
    expenses: db.expenses.filter((e) => e.id !== expenseId),
  };
}

export function applyDebtPayment(
  db: DukaDatabase,
  debtId: string,
  paymentAmount: number
): DukaDatabase {
  if (paymentAmount <= 0) return db;
  const now = new Date().toISOString();

  return {
    ...db,
    debts: db.debts.map((d) => {
      if (d.id !== debtId) return d;
      const nextPaid = Math.min(d.amount, d.amountPaid + paymentAmount);
      const status = nextPaid >= d.amount ? 'paid' : nextPaid > 0 ? 'partial' : 'unpaid';
      return {
        ...d,
        amountPaid: nextPaid,
        status,
        updatedAt: now,
      };
    }),
  };
}

// ============================================================================
// Kenyan Duka Demo Data Generator
// ============================================================================

export function buildDemoDatabase(existingBusiness?: Business | null, theme: ThemeMode = 'light'): DukaDatabase {
  const today = getTodayISO();
  const d1 = addDaysISO(today, -1);
  const d2 = addDaysISO(today, -2);
  const d3 = addDaysISO(today, -3);
  const d4 = addDaysISO(today, -4);
  const d5 = addDaysISO(today, -5);
  const d6 = addDaysISO(today, -6);

  const products: Product[] = [
    {
      id: 'prod_unga',
      name: 'Pembe Maize Flour 2kg',
      category: 'Dry Foods',
      buyPrice: 135,
      sellPrice: 165,
      quantity: 28,
      unit: 'packets',
      reorderLevel: 10,
    },
    {
      id: 'prod_oil',
      name: 'Fresh Fri Cooking Oil 1L',
      category: 'Cooking',
      buyPrice: 280,
      sellPrice: 340,
      quantity: 4, // Low stock!
      unit: 'bottles',
      reorderLevel: 8,
    },
    {
      id: 'prod_milk',
      name: 'Brookside Fresh Milk 500ml',
      category: 'Dairy',
      buyPrice: 52,
      sellPrice: 65,
      quantity: 18,
      unit: 'packets',
      reorderLevel: 12,
    },
    {
      id: 'prod_sugar',
      name: 'Kabras Sugar 1kg',
      category: 'Dry Foods',
      buyPrice: 145,
      sellPrice: 180,
      quantity: 3, // Low stock!
      unit: 'packets',
      reorderLevel: 10,
    },
    {
      id: 'prod_bread',
      name: 'Supaloaf White Bread 400g',
      category: 'Bakery',
      buyPrice: 55,
      sellPrice: 65,
      quantity: 14,
      unit: 'pieces',
      reorderLevel: 6,
    },
    {
      id: 'prod_soap',
      name: 'Menengai Bar Soap 800g',
      category: 'Household',
      buyPrice: 165,
      sellPrice: 210,
      quantity: 9,
      unit: 'pieces',
      reorderLevel: 5,
    },
    {
      id: 'prod_eggs',
      name: 'Farm Eggs Tray (30s)',
      category: 'Dairy',
      buyPrice: 380,
      sellPrice: 450,
      quantity: 2, // Low stock!
      unit: 'trays',
      reorderLevel: 4,
    },
  ];

  const sales: Sale[] = [
    {
      id: 'sale_1',
      date: today,
      items: [
        { productId: 'prod_unga', name: 'Pembe Maize Flour 2kg', qty: 3, price: 165, buyPrice: 135 },
        { productId: 'prod_oil', name: 'Fresh Fri Cooking Oil 1L', qty: 1, price: 340, buyPrice: 280 },
      ],
      total: 835,
      paymentMethod: 'M-Pesa',
      customer: 'Mama Kevin',
      notes: 'Morning shopping',
      createdAt: `${today}T09:15:00.000Z`,
    },
    {
      id: 'sale_2',
      date: today,
      items: [
        { productId: 'prod_milk', name: 'Brookside Fresh Milk 500ml', qty: 4, price: 65, buyPrice: 52 },
        { productId: 'prod_bread', name: 'Supaloaf White Bread 400g', qty: 2, price: 65, buyPrice: 55 },
      ],
      total: 390,
      paymentMethod: 'Cash',
      customer: '',
      notes: '',
      createdAt: `${today}T08:05:00.000Z`,
    },
    {
      id: 'sale_3',
      date: today,
      items: [
        { productId: 'prod_sugar', name: 'Kabras Sugar 1kg', qty: 3, price: 180, buyPrice: 145 },
        { productId: 'prod_eggs', name: 'Farm Eggs Tray (30s)', qty: 1, price: 450, buyPrice: 380 },
      ],
      total: 990,
      paymentMethod: 'Credit/Debt',
      customer: 'John Kamau',
      notes: 'Will pay Friday evening',
      createdAt: `${today}T07:40:00.000Z`,
    },
    {
      id: 'sale_4',
      date: d1,
      items: [
        { productId: 'prod_unga', name: 'Pembe Maize Flour 2kg', qty: 6, price: 165, buyPrice: 135 },
        { productId: 'prod_soap', name: 'Menengai Bar Soap 800g', qty: 3, price: 210, buyPrice: 165 },
      ],
      total: 1620,
      paymentMethod: 'M-Pesa',
      customer: 'Grace Wanjiku',
      notes: '',
      createdAt: `${d1}T16:20:00.000Z`,
    },
    {
      id: 'sale_5',
      date: d2,
      items: [
        { productId: 'prod_oil', name: 'Fresh Fri Cooking Oil 1L', qty: 4, price: 340, buyPrice: 280 },
        { productId: 'prod_sugar', name: 'Kabras Sugar 1kg', qty: 4, price: 180, buyPrice: 145 },
      ],
      total: 2080,
      paymentMethod: 'Cash',
      customer: '',
      notes: '',
      createdAt: `${d2}T14:10:00.000Z`,
    },
    {
      id: 'sale_6',
      date: d3,
      items: [
        { productId: 'prod_eggs', name: 'Farm Eggs Tray (30s)', qty: 2, price: 450, buyPrice: 380 },
        { productId: 'prod_bread', name: 'Supaloaf White Bread 400g', qty: 5, price: 65, buyPrice: 55 },
      ],
      total: 1225,
      paymentMethod: 'Credit/Debt',
      customer: 'Peter Ochieng',
      notes: 'Hotel tea kiosk order',
      createdAt: `${d3}T11:30:00.000Z`,
    },
    {
      id: 'sale_7',
      date: d4,
      items: [
        { productId: 'prod_unga', name: 'Pembe Maize Flour 2kg', qty: 8, price: 165, buyPrice: 135 },
      ],
      total: 1320,
      paymentMethod: 'M-Pesa',
      customer: '',
      notes: '',
      createdAt: `${d4}T17:45:00.000Z`,
    },
    {
      id: 'sale_8',
      date: d5,
      items: [
        { productId: 'prod_milk', name: 'Brookside Fresh Milk 500ml', qty: 10, price: 65, buyPrice: 52 },
        { productId: 'prod_soap', name: 'Menengai Bar Soap 800g', qty: 4, price: 210, buyPrice: 165 },
      ],
      total: 1490,
      paymentMethod: 'Cash',
      customer: '',
      notes: '',
      createdAt: `${d5}T13:15:00.000Z`,
    },
    {
      id: 'sale_9',
      date: d6,
      items: [
        { productId: 'prod_oil', name: 'Fresh Fri Cooking Oil 1L', qty: 3, price: 340, buyPrice: 280 },
      ],
      total: 1020,
      paymentMethod: 'M-Pesa',
      customer: 'Beatrice Njeri',
      notes: '',
      createdAt: `${d6}T10:00:00.000Z`,
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp_1',
      date: today,
      category: 'Transport',
      amount: 350,
      paymentMethod: 'Cash',
      notes: 'Bodaboda delivery from market',
      createdAt: `${today}T07:20:00.000Z`,
    },
    {
      id: 'exp_2',
      date: today,
      category: 'Airtime/Internet',
      amount: 200,
      paymentMethod: 'M-Pesa',
      notes: 'Shop data bundles',
      createdAt: `${today}T08:30:00.000Z`,
    },
    {
      id: 'exp_3',
      date: d1,
      category: 'Electricity',
      amount: 850,
      paymentMethod: 'M-Pesa',
      notes: 'KPLC prepaid tokens',
      createdAt: `${d1}T12:00:00.000Z`,
    },
    {
      id: 'exp_4',
      date: d3,
      category: 'Stock Purchase',
      amount: 2400,
      paymentMethod: 'M-Pesa',
      notes: 'Restock milk and bread',
      createdAt: `${d3}T09:00:00.000Z`,
    },
    {
      id: 'exp_5',
      date: d5,
      category: 'Rent',
      amount: 4500,
      paymentMethod: 'M-Pesa',
      notes: 'Monthly shop rent deposit',
      createdAt: `${d5}T10:30:00.000Z`,
    },
  ];

  const debts: Debt[] = [
    {
      id: 'debt_1',
      customer: 'John Kamau',
      amount: 990,
      amountPaid: 0,
      saleId: 'sale_3',
      date: today,
      status: 'unpaid',
      notes: 'Will pay Friday evening',
    },
    {
      id: 'debt_2',
      customer: 'Peter Ochieng',
      amount: 1225,
      amountPaid: 500,
      saleId: 'sale_6',
      date: d3,
      status: 'partial',
      notes: 'Paid KES 500 deposit via M-Pesa',
    },
  ];

  const stockMovements: StockMovement[] = [
    {
      id: 'mov_1',
      productId: 'prod_unga',
      type: 'restock',
      qty: 40,
      date: d6,
      reason: 'Wholesale delivery',
      createdAt: `${d6}T08:00:00.000Z`,
    },
    {
      id: 'mov_2',
      productId: 'prod_unga',
      type: 'sale',
      qty: -3,
      date: today,
      reason: 'Sold (Mama Kevin)',
      createdAt: `${today}T09:15:00.000Z`,
    },
    {
      id: 'mov_3',
      productId: 'prod_oil',
      type: 'sale',
      qty: -1,
      date: today,
      reason: 'Sold (Mama Kevin)',
      createdAt: `${today}T09:15:00.000Z`,
    },
    {
      id: 'mov_4',
      productId: 'prod_eggs',
      type: 'adjustment',
      qty: -1,
      date: d2,
      reason: 'Damaged tray during transit',
      createdAt: `${d2}T15:00:00.000Z`,
    },
  ];

  return {
    version: 1,
    business: existingBusiness || {
      id: 'duka_main',
      name: 'Neema Corner Duka',
      owner: 'Amina Mwangi',
      type: 'Retail shop',
      pin: '',
      updatedAt: new Date().toISOString(),
    },
    products,
    sales,
    expenses,
    debts,
    stockMovements,
    theme,
    lastSyncedAt: null,
  };
}

// ============================================================================
// Repository Abstraction (LocalStorage today; swap for Firebase tomorrow)
// ============================================================================

export interface DukaRepository {
  load(): DukaDatabase;
  save(db: DukaDatabase): void;
  clear(): void;
}

export class LocalStorageDukaRepository implements DukaRepository {
  load(): DukaDatabase {
    if (typeof window === 'undefined') return createEmptyDatabase();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return createEmptyDatabase();
      const parsed = JSON.parse(raw) as Partial<DukaDatabase>;
      return {
        ...createEmptyDatabase(),
        ...parsed,
        products: Array.isArray(parsed.products) ? parsed.products : [],
        sales: Array.isArray(parsed.sales) ? parsed.sales : [],
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
        debts: Array.isArray(parsed.debts) ? parsed.debts : [],
        stockMovements: Array.isArray(parsed.stockMovements) ? parsed.stockMovements : [],
        theme: parsed.theme === 'dark' ? 'dark' : 'light',
      };
    } catch {
      return createEmptyDatabase();
    }
  }

  save(db: DukaDatabase): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export const dukaRepository: DukaRepository = new LocalStorageDukaRepository();
