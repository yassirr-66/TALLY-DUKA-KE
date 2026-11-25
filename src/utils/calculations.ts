import type {
  Debt,
  DukaDatabase,
  Expense,
  Product,
  ReportPeriod,
  Sale,
  SaleItem,
} from '../types/duka';

export function formatKES(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const abs = Math.abs(safe).toLocaleString('en-KE');
  return safe < 0 ? `-KES ${abs}` : `KES ${abs}`;
}

export function getTodayISO(referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysISO(dateISO: string, deltaDays: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return getTodayISO(dt);
}

export function formatDateLabel(dateISO: string, referenceToday: string = getTodayISO()): string {
  if (!dateISO) return '';
  if (dateISO === referenceToday) return 'Today';
  if (dateISO === addDaysISO(referenceToday, -1)) return 'Yesterday';
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: dt.getFullYear() !== Number(referenceToday.slice(0, 4)) ? 'numeric' : undefined,
  });
}

export function getPeriodDateRange(
  period: ReportPeriod,
  referenceDate: Date = new Date()
): { start: string; end: string; label: string } {
  const end = getTodayISO(referenceDate);
  if (period === 'daily') {
    return { start: end, end, label: 'Today' };
  }
  if (period === 'weekly') {
    const dt = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    const dayOfWeek = dt.getDay(); // 0 = Sun, 1 = Mon
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    dt.setDate(dt.getDate() - diffToMonday);
    return { start: getTodayISO(dt), end, label: 'This Week' };
  }
  if (period === 'monthly') {
    const start = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}-01`;
    return {
      start,
      end,
      label: referenceDate.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' }),
    };
  }
  const start = `${referenceDate.getFullYear()}-01-01`;
  return { start, end, label: String(referenceDate.getFullYear()) };
}

export function getPreviousPeriodDateRange(
  period: ReportPeriod,
  referenceDate: Date = new Date()
): { start: string; end: string; label: string } {
  if (period === 'daily') {
    const yesterday = addDaysISO(getTodayISO(referenceDate), -1);
    return { start: yesterday, end: yesterday, label: 'yesterday' };
  }
  if (period === 'weekly') {
    const current = getPeriodDateRange('weekly', referenceDate);
    const prevEnd = addDaysISO(current.start, -1);
    const prevStart = addDaysISO(current.start, -7);
    return { start: prevStart, end: prevEnd, label: 'last week' };
  }
  if (period === 'monthly') {
    const prevMonthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
    const lastDayPrevMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0);
    return {
      start: getTodayISO(prevMonthDate),
      end: getTodayISO(lastDayPrevMonth),
      label: 'last month',
    };
  }
  const prevYear = referenceDate.getFullYear() - 1;
  return {
    start: `${prevYear}-01-01`,
    end: `${prevYear}-12-31`,
    label: String(prevYear),
  };
}

export function isDateInRange(dateISO: string, start: string, end: string): boolean {
  if (start && dateISO < start) return false;
  if (end && dateISO > end) return false;
  return true;
}

export function calculateSaleTotal(items: Pick<SaleItem, 'qty' | 'price'>[]): number {
  return items.reduce((sum, item) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    return sum + qty * price;
  }, 0);
}

export interface ProfitAndLossSummary {
  totalSales: number;
  totalExpenses: number;
  cogs: number;
  grossProfit: number;
  netProfit: number;
  transactionCount: number;
  salesCount: number;
  expensesCount: number;
}

export function calculateProfitAndLoss(params: {
  sales: Sale[];
  expenses: Expense[];
  products: Product[];
  startDate?: string;
  endDate?: string;
}): ProfitAndLossSummary {
  const { sales, expenses, products, startDate = '', endDate = '' } = params;
  const productMap = new Map(products.map((p) => [p.id, p]));

  const filteredSales = sales.filter((s) => isDateInRange(s.date, startDate, endDate));
  const filteredExpenses = expenses.filter((e) => isDateInRange(e.date, startDate, endDate));

  const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  let cogs = 0;
  for (const sale of filteredSales) {
    for (const item of sale.items) {
      const unitCost =
        typeof item.buyPrice === 'number'
          ? item.buyPrice
          : item.productId
            ? (productMap.get(item.productId)?.buyPrice ?? 0)
            : 0;
      cogs += unitCost * item.qty;
    }
  }

  return {
    totalSales,
    totalExpenses,
    cogs,
    grossProfit: totalSales - cogs,
    netProfit: totalSales - totalExpenses,
    transactionCount: filteredSales.length + filteredExpenses.length,
    salesCount: filteredSales.length,
    expensesCount: filteredExpenses.length,
  };
}

export interface PeriodComparison {
  direction: 'up' | 'down' | 'flat';
  percent: number;
  label: string;
}

export function calculatePeriodComparison(
  currentValue: number,
  previousValue: number,
  previousLabel: string
): PeriodComparison {
  if (previousValue <= 0 && currentValue <= 0) {
    return { direction: 'flat', percent: 0, label: `Same as ${previousLabel}` };
  }
  if (previousValue <= 0 && currentValue > 0) {
    return { direction: 'up', percent: 100, label: `Up from ${formatKES(0)} ${previousLabel}` };
  }
  const diff = currentValue - previousValue;
  const percent = Math.round(Math.abs((diff / previousValue) * 100));
  if (diff > 0) {
    return { direction: 'up', percent, label: `Up ${percent}% from ${previousLabel}` };
  }
  if (diff < 0) {
    return { direction: 'down', percent, label: `Down ${percent}% from ${previousLabel}` };
  }
  return { direction: 'flat', percent: 0, label: `Same as ${previousLabel}` };
}

export interface InventorySummary {
  totalProducts: number;
  totalUnits: number;
  buyValue: number;
  sellValue: number;
  potentialProfit: number;
  lowStockItems: Product[];
}

export function calculateInventorySummary(products: Product[]): InventorySummary {
  let totalUnits = 0;
  let buyValue = 0;
  let sellValue = 0;
  const lowStockItems: Product[] = [];

  for (const p of products) {
    const qty = Math.max(0, p.quantity);
    totalUnits += qty;
    buyValue += qty * p.buyPrice;
    sellValue += qty * p.sellPrice;
    if (p.quantity <= p.reorderLevel) {
      lowStockItems.push(p);
    }
  }

  lowStockItems.sort((a, b) => a.quantity - b.quantity);

  return {
    totalProducts: products.length,
    totalUnits,
    buyValue,
    sellValue,
    potentialProfit: sellValue - buyValue,
    lowStockItems,
  };
}

export function calculateOutstandingDebt(debts: Debt[]): number {
  return debts.reduce((sum, d) => sum + Math.max(0, d.amount - d.amountPaid), 0);
}

export interface BestSellingItem {
  name: string;
  productId: string | null;
  qtySold: number;
  revenue: number;
}

export function getBestSellingItems(sales: Sale[], limit = 5): BestSellingItem[] {
  const map = new Map<string, BestSellingItem>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const key = item.productId || item.name.trim().toLowerCase();
      const existing = map.get(key);
      const rev = item.qty * item.price;
      if (existing) {
        existing.qtySold += item.qty;
        existing.revenue += rev;
      } else {
        map.set(key, {
          name: item.name,
          productId: item.productId,
          qtySold: item.qty,
          revenue: rev,
        });
      }
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export interface ExpenseCategorySummary {
  category: string;
  amount: number;
  percent: number;
}

export function getTopExpenseCategories(
  expenses: Expense[],
  limit = 6
): ExpenseCategorySummary[] {
  const map = new Map<string, number>();
  let total = 0;
  for (const e of expenses) {
    total += e.amount;
    map.set(e.category, (map.get(e.category) || 0) + e.amount);
  }
  return Array.from(map.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percent: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export interface DailySeriesPoint {
  date: string;
  shortLabel: string;
  sales: number;
  expenses: number;
}

export function getDailySeries(
  sales: Sale[],
  expenses: Expense[],
  days = 7,
  referenceDate: Date = new Date()
): DailySeriesPoint[] {
  const today = getTodayISO(referenceDate);
  const points: DailySeriesPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = addDaysISO(today, -i);
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const shortLabel = dt.toLocaleDateString('en-KE', { weekday: 'short' }).slice(0, 3);
    const daySales = sales.filter((s) => s.date === date).reduce((sum, s) => sum + s.total, 0);
    const dayExpenses = expenses
      .filter((e) => e.date === date)
      .reduce((sum, e) => sum + e.amount, 0);
    points.push({ date, shortLabel, sales: daySales, expenses: dayExpenses });
  }

  return points;
}

export function getMonthlySeries(
  sales: Sale[],
  expenses: Expense[],
  year: number = new Date().getFullYear()
): DailySeriesPoint[] {
  const points: DailySeriesPoint[] = [];
  for (let m = 0; m < 12; m++) {
    const prefix = `${year}-${String(m + 1).padStart(2, '0')}`;
    const dt = new Date(year, m, 1);
    const shortLabel = dt.toLocaleDateString('en-KE', { month: 'short' }).slice(0, 3);
    const monthSales = sales
      .filter((s) => s.date.startsWith(prefix))
      .reduce((sum, s) => sum + s.total, 0);
    const monthExpenses = expenses
      .filter((e) => e.date.startsWith(prefix))
      .reduce((sum, e) => sum + e.amount, 0);
    points.push({ date: prefix, shortLabel, sales: monthSales, expenses: monthExpenses });
  }
  return points;
}

export function buildWhatsAppSummary(params: {
  businessName: string;
  periodLabel: string;
  pnl: ProfitAndLossSummary;
  topItems: BestSellingItem[];
  outstandingDebt: number;
}): string {
  const { businessName, periodLabel, pnl, topItems, outstandingDebt } = params;
  const lines = [
    `*${businessName} — ${periodLabel} Summary*`,
    `Money In (Sales): ${formatKES(pnl.totalSales)}`,
    `Money Out (Expenses): ${formatKES(pnl.totalExpenses)}`,
    `Gross Profit: ${formatKES(pnl.grossProfit)}`,
    `Net Profit/Loss: ${formatKES(pnl.netProfit)}`,
    `Transactions: ${pnl.transactionCount}`,
    `Debts Owed to Shop: ${formatKES(outstandingDebt)}`,
  ];

  if (topItems.length > 0) {
    lines.push('', 'Top Selling Items:');
    topItems.slice(0, 3).forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.name} (${item.qtySold} sold) — ${formatKES(item.revenue)}`);
    });
  }

  lines.push('', 'Sent from Tally Duka');
  return lines.join('\n');
}

function escapeCSV(val: string | number): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateAllDataCSV(db: DukaDatabase): string {
  const rows: string[] = [];
  rows.push('Record Type,Date,Name / Category,Details,Payment Method,Amount (KES)');

  for (const s of db.sales) {
    const itemsText = s.items.map((i) => `${i.name} x${i.qty}`).join(' | ');
    rows.push(
      [
        'Sale',
        s.date,
        s.customer || 'Walk-in customer',
        itemsText,
        s.paymentMethod,
        s.total,
      ]
        .map(escapeCSV)
        .join(',')
    );
  }

  for (const e of db.expenses) {
    rows.push(
      ['Expense', e.date, e.category, e.notes || '-', e.paymentMethod, -e.amount]
        .map(escapeCSV)
        .join(',')
    );
  }

  for (const d of db.debts) {
    const remaining = Math.max(0, d.amount - d.amountPaid);
    rows.push(
      [
        'Debt',
        d.date,
        d.customer,
        `Status: ${d.status} (Paid ${d.amountPaid}/${d.amount})`,
        'Credit/Debt',
        remaining,
      ]
        .map(escapeCSV)
        .join(',')
    );
  }

  for (const p of db.products) {
    rows.push(
      [
        'Stock Item',
        '-',
        p.name,
        `${p.quantity} ${p.unit} (Buy ${p.buyPrice} / Sell ${p.sellPrice})`,
        p.category,
        p.quantity * p.sellPrice,
      ]
        .map(escapeCSV)
        .join(',')
    );
  }

  return rows.join('\n');
}

export function generatePeriodReportCSV(params: {
  businessName: string;
  periodLabel: string;
  pnl: ProfitAndLossSummary;
  sales: Sale[];
  expenses: Expense[];
}): string {
  const { businessName, periodLabel, pnl, sales, expenses } = params;
  const rows: string[] = [
    `Tally Duka Report,${escapeCSV(businessName)},${escapeCSV(periodLabel)}`,
    '',
    'Summary Metric,Amount (KES)',
    `Money In (Total Sales),${pnl.totalSales}`,
    `Cost of Goods Sold,${pnl.cogs}`,
    `Gross Profit,${pnl.grossProfit}`,
    `Money Out (Total Expenses),${pnl.totalExpenses}`,
    `Net Profit/Loss,${pnl.netProfit}`,
    '',
    'Type,Date,Category / Customer,Details,Payment Method,Amount (KES)',
  ];

  for (const s of sales) {
    rows.push(
      [
        'Sale',
        s.date,
        s.customer || 'Walk-in customer',
        s.items.map((i) => `${i.name} x${i.qty}`).join(' | '),
        s.paymentMethod,
        s.total,
      ]
        .map(escapeCSV)
        .join(',')
    );
  }

  for (const e of expenses) {
    rows.push(
      ['Expense', e.date, e.category, e.notes || '-', e.paymentMethod, e.amount]
        .map(escapeCSV)
        .join(',')
    );
  }

  return rows.join('\n');
}
