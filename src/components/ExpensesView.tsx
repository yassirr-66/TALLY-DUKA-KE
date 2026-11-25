import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Receipt, Search, Trash2 } from 'lucide-react';
import type { Expense, ExpenseCategory, PaymentMethod } from '../types/duka';
import {
  formatDateLabel,
  formatKES,
  getPeriodDateRange,
  getTodayISO,
  isDateInRange,
} from '../utils/calculations';
import { BottomSheet } from './BottomSheet';
import { ConfirmDialog } from './ConfirmDialog';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Rent',
  'Stock Purchase',
  'Electricity',
  'Water',
  'Transport',
  'Salaries',
  'Airtime/Internet',
  'License/Taxes',
  'Repairs',
  'Other',
];

type ExpensePeriodFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

interface ExpensesViewProps {
  expenses: Expense[];
  openAddTrigger?: number;
  onAddExpense: (input: {
    date: string;
    category: ExpenseCategory;
    amount: number;
    paymentMethod: PaymentMethod;
    notes: string;
  }) => void;
  onEditExpense: (
    expenseId: string,
    input: {
      date: string;
      category: ExpenseCategory;
      amount: number;
      paymentMethod: PaymentMethod;
      notes: string;
    }
  ) => void;
  onDeleteExpense: (expenseId: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  openAddTrigger = 0,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}) => {
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<ExpensePeriodFilter>('all');
  const [customStart, setCustomStart] = useState(getTodayISO());
  const [customEnd, setCustomEnd] = useState(getTodayISO());
  const [categoryFilter, setCategoryFilter] = useState<'All' | ExpenseCategory>('All');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [date, setDate] = useState(getTodayISO());
  const [category, setCategory] = useState<ExpenseCategory>('Transport');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [lastTrigger, setLastTrigger] = useState(0);

  const openAddModal = () => {
    setEditingExpense(null);
    setDate(getTodayISO());
    setCategory('Transport');
    setAmount('');
    setPaymentMethod('Cash');
    setNotes('');
    setFormError('');
    setSheetOpen(true);
  };

  if (openAddTrigger > 0 && openAddTrigger !== lastTrigger) {
    setLastTrigger(openAddTrigger);
    openAddModal();
  }

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setDate(exp.date);
    setCategory(exp.category);
    setAmount(String(exp.amount));
    setPaymentMethod(exp.paymentMethod);
    setNotes(exp.notes);
    setFormError('');
    setSheetOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!date) {
      setFormError('Please pick a date.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError('Please enter an amount greater than KES 0.');
      return;
    }

    setFormError('');
    const payload = {
      date,
      category,
      amount: numericAmount,
      paymentMethod,
      notes,
    };
    if (editingExpense) {
      onEditExpense(editingExpense.id, payload);
    } else {
      onAddExpense(payload);
    }
    setSheetOpen(false);
  };

  const filteredExpenses = useMemo(() => {
    let start = '';
    let end = '';
    if (period === 'today') {
      const r = getPeriodDateRange('daily');
      start = r.start;
      end = r.end;
    } else if (period === 'week') {
      const r = getPeriodDateRange('weekly');
      start = r.start;
      end = r.end;
    } else if (period === 'month') {
      const r = getPeriodDateRange('monthly');
      start = r.start;
      end = r.end;
    } else if (period === 'custom') {
      start = customStart;
      end = customEnd;
    }

    const q = search.trim().toLowerCase();
    return expenses
      .filter((e) => {
        if ((start || end) && !isDateInRange(e.date, start, end)) return false;
        if (categoryFilter !== 'All' && e.category !== categoryFilter) return false;
        if (q) {
          const text = `${e.category} ${e.notes} ${e.paymentMethod}`.toLowerCase();
          if (!text.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) =>
        b.date === a.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
      );
  }, [expenses, period, customStart, customEnd, categoryFilter, search]);

  const groupedExpenses = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const exp of filteredExpenses) {
      const list = map.get(exp.date) || [];
      list.push(exp);
      map.set(exp.date, list);
    }
    return Array.from(map.entries());
  }, [filteredExpenses]);

  const totalOut = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Expenses (Money Out)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing {filteredExpenses.length}{' '}
            {filteredExpenses.length === 1 ? 'expense' : 'expenses'} ·{' '}
            <span className="font-num font-semibold text-red-600 dark:text-red-400">
              {formatKES(totalOut)}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          <Plus className="h-4 w-4" />
          <span className="whitespace-nowrap">Add Expense</span>
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search expenses"
            placeholder="Search category or note..."
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {(
              [
                ['all', 'All'],
                ['today', 'Today'],
                ['week', 'This Week'],
                ['month', 'This Month'],
                ['custom', 'Custom'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`min-h-[36px] rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  period === key
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <select
            aria-label="Filter by expense category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'All' | ExpenseCategory)}
            className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="All">All Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {period === 'custom' && (
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div>
              <label htmlFor="exp-start" className="mb-1 block text-xs text-slate-500">
                From
              </label>
              <input
                id="exp-start"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-white px-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="exp-end" className="mb-1 block text-xs text-slate-500">
                To
              </label>
              <input
                id="exp-end"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-white px-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </div>
        )}
      </div>

      {/* List or Empty */}
      {groupedExpenses.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <Receipt className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
            {expenses.length === 0 ? 'No expenses yet' : 'No matching expenses'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {expenses.length === 0
              ? 'Record shop costs like rent, transport, electricity, or stock purchases.'
              : 'Try adjusting your search or filter.'}
          </p>
          {expenses.length === 0 && (
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 min-h-[44px] rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Add your first expense
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedExpenses.map(([groupDate, dayExpenses]) => {
            const daySum = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
            return (
              <section
                key={groupDate}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {formatDateLabel(groupDate)}
                  </span>
                  <span className="font-num text-xs font-semibold text-red-600 dark:text-red-400">
                    -{formatKES(daySum)}
                  </span>
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dayExpenses.map((exp) => (
                    <li
                      key={exp.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {exp.category}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                          {exp.paymentMethod}
                          {exp.notes ? ` · ${exp.notes}` : ''}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="font-num mr-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                          {formatKES(exp.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => openEditModal(exp)}
                          aria-label={`Edit expense ${exp.category}`}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(exp)}
                          aria-label={`Delete expense ${exp.category}`}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
        subtitle="Record money paid out for shop operations."
      >
        <form onSubmit={handleSave} className="space-y-4" noValidate>
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
            >
              {formError}
            </div>
          )}

          <div>
            <label
              htmlFor="exp-date"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Date
            </label>
            <input
              id="exp-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div>
            <label
              htmlFor="exp-category"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Category
            </label>
            <select
              id="exp-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="exp-amount"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Amount (KES)
            </label>
            <input
              id="exp-amount"
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
              className="font-num min-h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Paid via
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(['Cash', 'M-Pesa', 'Credit/Debt'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`min-h-[44px] rounded-xl border px-2 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                    paymentMethod === method
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="exp-notes"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Notes (optional)
            </label>
            <input
              id="exp-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. KPLC tokens or delivery boda"
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <button
            type="submit"
            className="min-h-[48px] w-full rounded-xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            {editingExpense ? 'Save Changes' : 'Save Expense'}
          </button>
        </form>
      </BottomSheet>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this expense?"
        message="This will remove the expense from your Money Out records."
        confirmLabel="Delete Expense"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteExpense(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};
