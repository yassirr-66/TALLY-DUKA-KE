import React from 'react';
import type {
  BestSellingItem,
  DailySeriesPoint,
  ExpenseCategorySummary,
} from '../utils/calculations';
import { formatKES } from '../utils/calculations';

interface SalesVsExpensesChartProps {
  data: DailySeriesPoint[];
  compact?: boolean;
}

export const SalesVsExpensesChart: React.FC<SalesVsExpensesChartProps> = ({
  data,
  compact = false,
}) => {
  const maxVal = Math.max(
    100,
    ...data.map((d) => Math.max(d.sales, d.expenses))
  );

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
            Money In
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-400 dark:bg-slate-600" />
            Money Out
          </span>
        </div>
        <span className="font-num">Max {formatKES(maxVal)}</span>
      </div>

      <div
        className={`grid gap-2 ${compact ? 'h-32' : 'h-44'}`}
        style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
        role="img"
        aria-label="Sales versus expenses bar chart"
      >
        {data.map((point) => {
          const salesHeight = Math.round((point.sales / maxVal) * 100);
          const expHeight = Math.round((point.expenses / maxVal) * 100);
          return (
            <div
              key={point.date}
              className="flex h-full flex-col items-center justify-end gap-1.5"
              title={`${point.shortLabel}: In ${formatKES(point.sales)}, Out ${formatKES(point.expenses)}`}
            >
              <div className="flex w-full flex-1 items-end justify-center gap-1 px-0.5">
                <div
                  className="w-1/2 max-w-[16px] rounded-t-md bg-emerald-600 transition-all duration-200"
                  style={{ height: `${Math.max(point.sales > 0 ? 6 : 2, salesHeight)}%` }}
                />
                <div
                  className="w-1/2 max-w-[16px] rounded-t-md bg-slate-300 transition-all duration-200 dark:bg-slate-600"
                  style={{ height: `${Math.max(point.expenses > 0 ? 6 : 2, expHeight)}%` }}
                />
              </div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {point.shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DONUT_COLORS = [
  '#16a34a',
  '#0284c7',
  '#d97706',
  '#7c3aed',
  '#dc2626',
  '#64748b',
];

interface ExpensesDonutChartProps {
  categories: ExpenseCategorySummary[];
  totalExpenses: number;
}

export const ExpensesDonutChart: React.FC<ExpensesDonutChartProps> = ({
  categories,
  totalExpenses,
}) => {
  if (categories.length === 0 || totalExpenses <= 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        No expenses recorded in this period.
      </p>
    );
  }

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="16"
            className="text-slate-100 dark:text-slate-800"
          />
          {categories.map((cat, idx) => {
            const fraction = cat.amount / totalExpenses;
            const dashLength = fraction * circumference;
            const dashOffset = -accumulated * circumference;
            accumulated += fraction;
            return (
              <circle
                key={cat.category}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={DONUT_COLORS[idx % DONUT_COLORS.length]}
                strokeWidth="16"
                strokeDasharray={`${dashLength} ${circumference}`}
                strokeDashoffset={dashOffset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Out</span>
          <span className="font-num text-xs font-bold text-slate-900 dark:text-slate-100">
            {formatKES(totalExpenses)}
          </span>
        </div>
      </div>

      <div className="w-full flex-1 space-y-2">
        {categories.map((cat, idx) => (
          <div key={cat.category} className="flex items-center justify-between gap-2 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
              />
              <span className="truncate text-slate-700 dark:text-slate-200">
                {cat.category}
              </span>
            </div>
            <div className="font-num shrink-0 text-xs text-slate-600 dark:text-slate-300">
              {formatKES(cat.amount)} · {cat.percent}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface TopProductsBarChartProps {
  items: BestSellingItem[];
}

export const TopProductsBarChart: React.FC<TopProductsBarChartProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        No product sales recorded in this period.
      </p>
    );
  }

  const maxRev = Math.max(1, ...items.map((i) => i.revenue));

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = Math.max(6, Math.round((item.revenue / maxRev) * 100));
        return (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                {item.name}
              </span>
              <span className="font-num shrink-0 text-xs text-slate-600 dark:text-slate-300">
                {item.qtySold} sold · {formatKES(item.revenue)}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
