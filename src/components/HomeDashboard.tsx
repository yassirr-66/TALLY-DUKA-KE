import React from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  PackagePlus,
  Plus,
  Users,
} from 'lucide-react';
import type { Business, Debt, Expense, NavTab, Product, Sale } from '../types/duka';
import {
  calculateInventorySummary,
  calculateOutstandingDebt,
  calculateProfitAndLoss,
  formatDateLabel,
  formatKES,
  getDailySeries,
  getTodayISO,
} from '../utils/calculations';
import { SalesVsExpensesChart } from './Charts';

interface HomeDashboardProps {
  business: Business;
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  debts: Debt[];
  onQuickAddSale: () => void;
  onQuickAddExpense: () => void;
  onQuickAddStock: () => void;
  onNavigate: (tab: NavTab) => void;
  onLoadDemo: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  business,
  products,
  sales,
  expenses,
  debts,
  onQuickAddSale,
  onQuickAddExpense,
  onQuickAddStock,
  onNavigate,
  onLoadDemo,
}) => {
  const today = getTodayISO();
  const todayPnL = calculateProfitAndLoss({
    sales,
    expenses,
    products,
    startDate: today,
    endDate: today,
  });

  const inventory = calculateInventorySummary(products);
  const outstandingDebt = calculateOutstandingDebt(debts);
  const unpaidCount = debts.filter((d) => d.status !== 'paid').length;
  const chartSeries = getDailySeries(sales, expenses, 7);

  const recentTransactions = [
    ...sales.map((s) => ({
      id: s.id,
      kind: 'sale' as const,
      date: s.date,
      createdAt: s.createdAt,
      title: s.items.map((i) => `${i.name} x${i.qty}`).join(', '),
      subtitle: `${s.paymentMethod}${s.customer ? ` · ${s.customer}` : ''}`,
      amount: s.total,
    })),
    ...expenses.map((e) => ({
      id: e.id,
      kind: 'expense' as const,
      date: e.date,
      createdAt: e.createdAt,
      title: e.category,
      subtitle: `${e.paymentMethod}${e.notes ? ` · ${e.notes}` : ''}`,
      amount: e.amount,
    })),
  ]
    .sort((a, b) =>
      b.date === a.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
    )
    .slice(0, 5);

  const isCompletelyEmpty =
    sales.length === 0 && expenses.length === 0 && products.length === 0;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Habari, {business.owner} · {business.type}
          </p>
          <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {business.name}
          </h2>
        </div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Today · {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'short' })}
        </p>
      </section>

      {/* Today's 3 Summary Cards */}
      <section aria-label="Today's numbers" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Today&apos;s Money In</span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="font-num mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatKES(todayPnL.totalSales)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {todayPnL.salesCount} {todayPnL.salesCount === 1 ? 'sale' : 'sales'} today
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Today&apos;s Money Out</span>
            <ArrowUpRight className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          </div>
          <p className="font-num mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatKES(todayPnL.totalExpenses)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {todayPnL.expensesCount} {todayPnL.expensesCount === 1 ? 'expense' : 'expenses'} today
          </p>
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            todayPnL.netProfit >= 0
              ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30'
              : 'border-red-200 bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
            <span>Today&apos;s {todayPnL.netProfit >= 0 ? 'Profit' : 'Loss'}</span>
            <span
              className={`font-semibold ${
                todayPnL.netProfit >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              {todayPnL.netProfit >= 0 ? 'Profit' : 'Loss'}
            </span>
          </div>
          <p
            className={`font-num mt-2 text-2xl font-bold ${
              todayPnL.netProfit >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-red-700 dark:text-red-400'
            }`}
          >
            {formatKES(todayPnL.netProfit)}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Money In minus Money Out
          </p>
        </div>
      </section>

      {/* Quick Actions */}
      <section aria-label="Quick actions" className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onQuickAddSale}
          className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-700 px-2 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 active:scale-[0.98] sm:min-h-[52px] sm:flex-row sm:gap-1.5 sm:px-3 sm:text-sm"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">Add Sale</span>
        </button>
        <button
          type="button"
          onClick={onQuickAddExpense}
          className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 active:scale-[0.98] sm:min-h-[52px] sm:flex-row sm:gap-1.5 sm:px-3 sm:text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">Add Expense</span>
        </button>
        <button
          type="button"
          onClick={onQuickAddStock}
          className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 active:scale-[0.98] sm:min-h-[52px] sm:flex-row sm:gap-1.5 sm:px-3 sm:text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <PackagePlus className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">Add Stock</span>
        </button>
      </section>

      {/* Empty State Banner if new shop */}
      {isCompletelyEmpty && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Your shop book is ready
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Start by adding your first product or sale above, or load sample Kenyan duka items to explore how Tally Duka works.
          </p>
          <button
            type="button"
            onClick={onLoadDemo}
            className="mt-4 min-h-[44px] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300"
          >
            Load demo data
          </button>
        </section>
      )}

      {/* Main 2-column Desktop / Stacked Mobile Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Column: 7-Day Chart + Outstanding Debts */}
        <div className="space-y-5 lg:col-span-7">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Last 7 Days: Money In vs Out
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
              >
                Full reports
              </button>
            </div>
            <SalesVsExpensesChart data={chartSeries} compact />
          </section>

          {/* Outstanding Debts Card */}
          <button
            type="button"
            onClick={() => onNavigate('debts')}
            className="flex min-h-[68px] w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/80"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Customers who owe me
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {unpaidCount} unpaid {unpaidCount === 1 ? 'customer' : 'customers'} · Tap to record payment
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-num text-base font-bold text-slate-900 dark:text-slate-100">
                {formatKES(outstandingDebt)}
              </span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </button>
        </div>

        {/* Right Column: Low Stock Alerts + Recent 5 Transactions */}
        <div className="space-y-5 lg:col-span-5">
          {/* Low Stock Alerts */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`h-4 w-4 ${
                    inventory.lowStockItems.length > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Low Stock Alerts
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('stock')}
                className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
              >
                Manage stock
              </button>
            </div>

            {inventory.lowStockItems.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {products.length === 0
                  ? 'No stock items added yet.'
                  : 'All stock items are above their reorder level.'}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {inventory.lowStockItems.slice(0, 4).map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Reorder at {item.reorderLevel} {item.unit}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-num text-sm font-semibold text-red-700 dark:text-red-400">
                        {item.quantity} {item.unit}
                      </span>
                      <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                        Low stock
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 5 Most Recent Transactions */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Recent Transactions
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('sales')}
                className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
              >
                See all
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No sales or expenses recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentTransactions.map((tx) => (
                  <li key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {tx.title}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {formatDateLabel(tx.date)} · {tx.subtitle}
                      </p>
                    </div>
                    <span
                      className={`font-num shrink-0 text-sm font-semibold ${
                        tx.kind === 'sale'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {tx.kind === 'sale' ? '+' : '-'}
                      {formatKES(tx.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
