export type BusinessType =
  | 'Retail shop'
  | 'Kiosk'
  | 'Hardware'
  | 'Salon'
  | 'Wholesale'
  | 'Other';

export type PaymentMethod = 'Cash' | 'M-Pesa' | 'Credit/Debt';

export type ExpenseCategory =
  | 'Rent'
  | 'Stock Purchase'
  | 'Electricity'
  | 'Water'
  | 'Transport'
  | 'Salaries'
  | 'Airtime/Internet'
  | 'License/Taxes'
  | 'Repairs'
  | 'Other';

export type ProductUnit =
  | 'pieces'
  | 'kg'
  | 'litres'
  | 'packets'
  | 'bags'
  | 'boxes'
  | 'bottles'
  | 'trays';

export type StockMovementType = 'restock' | 'sale' | 'adjustment';

export type DebtStatus = 'unpaid' | 'partial' | 'paid';

export type ThemeMode = 'light' | 'dark';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type NavTab = 'home' | 'sales' | 'expenses' | 'stock' | 'reports' | 'debts' | 'settings';

export interface Business {
  id?: string;
  ownerUid?: string; // Reserved for future Firebase multi-user sync
  name: string;
  owner: string;
  type: BusinessType;
  pin: string; // Empty string means PIN lock is disabled
  updatedAt?: string;
}

export interface Product {
  id: string;
  ownerUid?: string;
  name: string;
  category: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  unit: string;
  reorderLevel: number;
  updatedAt?: string;
}

export interface SaleItem {
  productId: string | null;
  name: string;
  qty: number;
  price: number;
  buyPrice?: number;
}

export interface Sale {
  id: string;
  ownerUid?: string;
  date: string; // YYYY-MM-DD
  items: SaleItem[];
  total: number;
  paymentMethod: PaymentMethod;
  customer: string;
  notes: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  ownerUid?: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  amount: number;
  paymentMethod: Exclude<PaymentMethod, 'Credit/Debt'> | 'Credit/Debt';
  notes: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Debt {
  id: string;
  ownerUid?: string;
  customer: string;
  amount: number;
  amountPaid: number;
  saleId: string;
  date: string; // YYYY-MM-DD
  status: DebtStatus;
  notes?: string;
  updatedAt?: string;
}

export interface StockMovement {
  id: string;
  ownerUid?: string;
  productId: string;
  type: StockMovementType;
  qty: number; // positive for restock, negative for sale/adjustment
  date: string; // YYYY-MM-DD
  reason: string;
  createdAt: string;
}

export interface DukaDatabase {
  version: number;
  business: Business | null;
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  debts: Debt[];
  stockMovements: StockMovement[];
  theme: ThemeMode;
  lastSyncedAt?: string | null; // Reserved for future Firebase cloud sync
}
