import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Printer,
  Share2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type {
  Business,
  Debt,
  Expense,
  Product,
  ReportPeriod,
  Sale,
} from '../types/duka';
import {
  buildWhatsAppSummary,
  calculateOutstandingDebt,
  calculatePeriodComparison,
  calculateProfitAndLoss,
  formatKES,
  generatePeriodReportCSV,
  getBestSellingItems,
  getDailySeries,
  getMonthlySeries,
  getPeriodDateRange,
  getPreviousPeriodDateRange,
  getTopExpenseCategories,
  isDateInRange,
} from '../utils/calculations';
import {
  ExpensesDonutChart,
  SalesVsExpensesChart,
  TopProductsBarChart,
} from './Charts';

interface ReportsViewProps {
  business: Business;
  sales: Sale[];
  expenses: Expense[];
  products: Product[];
  debts: Debt[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  business,
  sales,
  expenses,
  products,
  debts,
}) => {
  const [period, setPeriod] = useState<ReportPeriod>('weekly');
  const [copied, setCopied] = useState(false);

  const range = useMemo(() => getPeriodDateRange(period), [period]);
  const prevRange = useMemo(() => getPreviousPeriodDateRange(period), [period]);

  const currentPnL = useMemo(
    () =>
      calculateProfitAndLoss({
        sales,
        expenses,
        products,
        startDate: range.start,
        endDate: range.end,
      }),
    [sales, expenses, products, range]
  );

  const previousPnL = useMemo(
    () =>
      calculateProfitAndLoss({
        sales,
        expenses,
        products,
        startDate: prevRange.start,
        endDate: prevRange.end,
      }),
    [sales, expenses, products, prevRange]
  );

  const salesComparison = calculatePeriodComparison(
    currentPnL.totalSales,
    previousPnL.totalSales,
    prevRange.label
  );

  const expenseComparison = calculatePeriodComparison(
    currentPnL.totalExpenses,
    previousPnL.totalExpenses,
    prevRange.label
  );

  const periodSales = useMemo(
    () => sales.filter((s) => isDateInRange(s.date, range.start, range.end)),
    [sales, range]
  );

  const periodExpenses = useMemo(
    () => expenses.filter((e) => isDateInRange(e.date, range.start, range.end)),
    [expenses, range]
  );

  const bestSellingItems = useMemo(
    () => getBestSellingItems(periodSales, 5),
    [periodSales]
  );

  const topExpenseCategories = useMemo(
    () => getTopExpenseCategories(periodExpenses, 6),
    [periodExpenses]
  );

  const outstandingDebt = calculateOutstandingDebt(debts);

  const chartSeries = useMemo(() => {
    if (period === 'yearly') return getMonthlySeries(sales, expenses);
    if (period === 'monthly') return getDailySeries(sales, expenses, 14);
    return getDailySeries(sales, expenses, 7);
  }, [sales, expenses, period]);

  const chartHeading =
    period === 'yearly'
      ? `Monthly Money In vs Out (${new Date().getFullYear()})`
      : period === 'monthly'
        ? 'Money In vs Money Out (Last 14 Days)'
        : 'Money In vs Money Out (Last 7 Days)';

  const whatsAppText = useMemo(
    () =>
      buildWhatsAppSummary({
        businessName: business.name,
        periodLabel: range.label,
        pnl: currentPnL,
        topItems: bestSellingItems,
        outstandingDebt,
      }),
    [business.name, range.label, currentPnL, bestSellingItems, outstandingDebt]
  );

  const handleDownloadCSV = () => {
    const csv = generatePeriodReportCSV({
      businessName: business.name,
      periodLabel: range.label,
      pnl: currentPnL,
      sales: periodSales,
      expenses: periodExpenses,
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tally-duka-${period}-report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(whatsAppText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored if clipboard denied
    }
  };

  return (
    <div className="space-y-5">
      {/* Header + Export buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Reports &amp; Profit
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {business.name} · {range.label}
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <Printer className="h-4 w-4" />
            Export PDF
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(whatsAppText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            <Share2 className="h-4 w-4" />
            Share via WhatsApp
          </a>
        </div>
      </div>

      {/* Period Switcher Tabs */}
      <div
        role="tablist"
        aria-label="Report period"
        className="no-print grid grid-cols-4 gap-1 rounded-2xl bg-slate-200/70 p-1 dark:bg-slate-800"
      >
        {(
          [
            ['daily', 'Daily'],
            ['weekly', 'Weekly'],
            ['monthly', 'Monthly'],
            ['yearly', 'Yearly'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={period === key}
            type="button"
            onClick={() => setPeriod(key)}
            className={`min-h-[42px] rounded-xl px-2 py-1.5 text-sm font-semibold transition-colors ${
              period === key
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Profit & Loss Summary Cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Sales (Money In)
          </p>
          <p className="font-num mt-1.5 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatKES(currentPnL.totalSales)}
          </p>
          <p
            className={`mt-1 flex items-center gap-1 text-xs font-medium ${
              salesComparison.direction === 'up'
                ? 'text-emerald-700 dark:text-emerald-400'
                : salesComparison.direction === 'down'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-500'
            }`}
          >
            {salesComparison.direction === 'up' ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : salesComparison.direction === 'down' ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : null}
            {salesComparison.label}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Expenses (Money Out)
          </p>
          <p className="font-num mt-1.5 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatKES(currentPnL.totalExpenses)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {expenseComparison.label}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Gross Profit (After Stock Cost)
          </p>
          <p className="font-num mt-1.5 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatKES(currentPnL.grossProfit)}
          </p>
          <p className="font-num mt-1 text-xs text-slate-500 dark:text-slate-400">
            Stock cost of goods: {formatKES(currentPnL.cogs)}
          </p>
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            currentPnL.netProfit >= 0
              ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30'
              : 'border-red-200 bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/30'
          }`}
        >
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Net {currentPnL.netProfit >= 0 ? 'Profit' : 'Loss'}
          </p>
          <p
            className={`font-num mt-1.5 text-2xl font-bold ${
              currentPnL.netProfit >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-red-700 dark:text-red-400'
            }`}
          >
            {formatKES(currentPnL.netProfit)}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {currentPnL.transactionCount} transactions · {formatKES(outstandingDebt)} owed
          </p>
        </div>
      </section>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
            {chartHeading}
          </h3>
          <SalesVsExpensesChart data={chartSeries} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
            Where Money Went (Expenses by Category)
          </h3>
          <ExpensesDonutChart
            categories={topExpenseCategories}
            totalExpenses={currentPnL.totalExpenses}
          />
        </section>
      </div>

      {/* Top 5 Best-Selling Items + Copy Summary */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
            Top 5 Best-Selling Items
          </h3>
          <TopProductsBarChart items={bestSellingItems} />
        </section>

        <section className="no-print rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              WhatsApp Summary Preview
            </h3>
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy text'}
            </button>
          </div>
          <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:bg-slate-950 dark:text-slate-300">
            {whatsAppText}
          </pre>
        </section>
      </div>
    </div>
  );
};
