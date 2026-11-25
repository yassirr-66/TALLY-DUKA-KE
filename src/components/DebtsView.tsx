import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Search, Users } from 'lucide-react';
import type { Debt } from '../types/duka';
import {
  calculateOutstandingDebt,
  formatDateLabel,
  formatKES,
} from '../utils/calculations';
import { BottomSheet } from './BottomSheet';

interface DebtsViewProps {
  debts: Debt[];
  onRecordPayment: (debtId: string, amount: number) => void;
  onBack?: () => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  debts,
  onRecordPayment,
  onBack,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all');
  const [activeDebt, setActiveDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [error, setError] = useState('');

  const totalOutstanding = calculateOutstandingDebt(debts);

  const filteredDebts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return debts
      .filter((d) => {
        if (statusFilter !== 'all' && d.status !== statusFilter) return false;
        if (q && !d.customer.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [debts, statusFilter, search]);

  const openPaymentModal = (debt: Debt) => {
    const remaining = Math.max(0, debt.amount - debt.amountPaid);
    setActiveDebt(debt);
    setPaymentAmount(String(remaining));
    setError('');
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDebt) return;
    const remaining = Math.max(0, activeDebt.amount - activeDebt.amountPaid);
    const val = Number(paymentAmount);
    if (!Number.isFinite(val) || val <= 0) {
      setError('Enter a payment amount greater than KES 0.');
      return;
    }
    if (val > remaining) {
      setError(`Amount cannot be more than the remaining balance (${formatKES(remaining)}).`);
      return;
    }
    onRecordPayment(activeDebt.id, val);
    setActiveDebt(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Customers Who Owe Me
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Credit sales waiting for payment
            </p>
          </div>
        </div>
      </div>

      {/* Total Owed Card */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
        <p className="text-xs font-medium text-amber-900 dark:text-amber-300">
          Total Money Owed to Shop
        </p>
        <p className="font-num mt-1 text-2xl font-bold text-amber-950 dark:text-amber-200">
          {formatKES(totalOutstanding)}
        </p>
      </div>

      {/* Search & Status Tabs */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search customer debts"
            placeholder="Search customer name..."
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {(
            [
              ['all', 'All'],
              ['unpaid', 'Unpaid'],
              ['partial', 'Part Paid'],
              ['paid', 'Paid'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`min-h-[36px] flex-1 rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === key
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filteredDebts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <Users className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
            {debts.length === 0 ? 'No customer debts recorded' : 'No matching debts'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            When you record a sale with payment method &ldquo;Credit/Debt&rdquo;, it appears here automatically.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredDebts.map((debt) => {
            const remaining = Math.max(0, debt.amount - debt.amountPaid);
            return (
              <li
                key={debt.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                      {debt.customer}
                    </p>
                    <span
                      className={`text-xs font-semibold ${
                        debt.status === 'paid'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : debt.status === 'partial'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      · {debt.status === 'paid' ? 'Paid' : debt.status === 'partial' ? 'Part paid' : 'Unpaid'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {formatDateLabel(debt.date)} · Total {formatKES(debt.amount)} · Paid{' '}
                    {formatKES(debt.amountPaid)}
                  </p>
                  {debt.notes && (
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {debt.notes}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                  <div className="text-left sm:text-right">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Balance</p>
                    <p className="font-num text-base font-bold text-slate-900 dark:text-slate-100">
                      {formatKES(remaining)}
                    </p>
                  </div>
                  {debt.status !== 'paid' ? (
                    <button
                      type="button"
                      onClick={() => openPaymentModal(debt)}
                      className="min-h-[44px] rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap"
                    >
                      Record payment
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Cleared
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <BottomSheet
        open={!!activeDebt}
        onClose={() => setActiveDebt(null)}
        title="Record Debt Payment"
        subtitle={activeDebt ? `Customer: ${activeDebt.customer}` : ''}
      >
        {activeDebt && (
          <form onSubmit={handleSubmitPayment} className="space-y-4" noValidate>
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
              >
                {error}
              </div>
            )}

            <div className="rounded-xl bg-slate-50 p-3.5 text-sm dark:bg-slate-800/60">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Original debt</span>
                <span className="font-num font-medium">{formatKES(activeDebt.amount)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Already paid</span>
                <span className="font-num font-medium">{formatKES(activeDebt.amountPaid)}</span>
              </div>
              <div className="mt-1.5 flex justify-between border-t border-slate-200 pt-1.5 font-semibold dark:border-slate-700">
                <span>Remaining balance</span>
                <span className="font-num text-amber-700 dark:text-amber-400">
                  {formatKES(Math.max(0, activeDebt.amount - activeDebt.amountPaid))}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="debt-pay-amount"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Amount paid now (KES)
              </label>
              <input
                id="debt-pay-amount"
                type="number"
                min="1"
                step="any"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="font-num min-h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3 text-base dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <button
              type="submit"
              className="min-h-[48px] w-full rounded-xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-800"
            >
              Save Payment
            </button>
          </form>
        )}
      </BottomSheet>
    </div>
  );
};
