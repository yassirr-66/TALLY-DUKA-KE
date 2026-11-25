import React, { useMemo, useState } from 'react';
import {
  CreditCard,
  Pencil,
  Plus,
  Search,
  Smartphone,
  Trash2,
  Users,
} from 'lucide-react';
import type {
  Debt,
  PaymentMethod,
  Product,
  Sale,
  SaleItem,
} from '../types/duka';
import {
  calculateOutstandingDebt,
  calculateSaleTotal,
  formatDateLabel,
  formatKES,
  getPeriodDateRange,
  getTodayISO,
  isDateInRange,
} from '../utils/calculations';
import { BottomSheet } from './BottomSheet';
import { ConfirmDialog } from './ConfirmDialog';

type SalesPeriodFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

interface SalesViewProps {
  sales: Sale[];
  products: Product[];
  debts: Debt[];
  openAddTrigger?: number;
  onAddSale: (input: {
    date: string;
    items: SaleItem[];
    paymentMethod: PaymentMethod;
    customer: string;
    notes: string;
  }) => void;
  onEditSale: (
    saleId: string,
    input: {
      date: string;
      items: SaleItem[];
      paymentMethod: PaymentMethod;
      customer: string;
      notes: string;
    }
  ) => void;
  onDeleteSale: (saleId: string) => void;
  onOpenDebts: () => void;
}

interface DraftLine {
  key: string;
  mode: 'inventory' | 'custom';
  productId: string;
  name: string;
  qty: string;
  price: string;
  buyPrice: number;
}

function makeEmptyLine(products: Product[]): DraftLine {
  const first = products[0];
  return {
    key: Math.random().toString(36).slice(2, 9),
    mode: first ? 'inventory' : 'custom',
    productId: first ? first.id : '',
    name: first ? first.name : '',
    qty: '1',
    price: first ? String(first.sellPrice) : '',
    buyPrice: first ? first.buyPrice : 0,
  };
}

export const SalesView: React.FC<SalesViewProps> = ({
  sales,
  products,
  debts,
  openAddTrigger = 0,
  onAddSale,
  onEditSale,
  onDeleteSale,
  onOpenDebts,
}) => {
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<SalesPeriodFilter>('all');
  const [customStart, setCustomStart] = useState(getTodayISO());
  const [customEnd, setCustomEnd] = useState(getTodayISO());
  const [paymentFilter, setPaymentFilter] = useState<'All' | PaymentMethod>('All');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [saleDate, setSaleDate] = useState(getTodayISO());
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [customer, setCustomer] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
  const [lastTrigger, setLastTrigger] = useState(0);

  const openAddModal = () => {
    setEditingSale(null);
    setSaleDate(getTodayISO());
    setLines([makeEmptyLine(products)]);
    setPaymentMethod('Cash');
    setCustomer('');
    setNotes('');
    setFormError('');
    setSheetOpen(true);
  };

  if (openAddTrigger > 0 && openAddTrigger !== lastTrigger) {
    setLastTrigger(openAddTrigger);
    openAddModal();
  }

  const openEditModal = (sale: Sale) => {
    setEditingSale(sale);
    setSaleDate(sale.date);
    setLines(
      sale.items.map((item, idx) => ({
        key: `${sale.id}_${idx}`,
        mode: item.productId ? 'inventory' : 'custom',
        productId: item.productId || '',
        name: item.name,
        qty: String(item.qty),
        price: String(item.price),
        buyPrice: item.buyPrice ?? 0,
      }))
    );
    setPaymentMethod(sale.paymentMethod);
    setCustomer(sale.customer);
    setNotes(sale.notes);
    setFormError('');
    setSheetOpen(true);
  };

  const handleLineProductChange = (lineKey: string, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    setLines((prev) =>
      prev.map((l) =>
        l.key === lineKey
          ? {
              ...l,
              productId,
              name: prod ? prod.name : l.name,
              price: prod ? String(prod.sellPrice) : l.price,
              buyPrice: prod ? prod.buyPrice : 0,
            }
          : l
      )
    );
  };

  const handleLineModeToggle = (lineKey: string, mode: 'inventory' | 'custom') => {
    const first = products[0];
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== lineKey) return l;
        if (mode === 'inventory' && first) {
          return {
            ...l,
            mode: 'inventory',
            productId: first.id,
            name: first.name,
            price: String(first.sellPrice),
            buyPrice: first.buyPrice,
          };
        }
        return {
          ...l,
          mode: 'custom',
          productId: '',
          name: '',
          price: '',
          buyPrice: 0,
        };
      })
    );
  };

  const draftTotal = useMemo(() => {
    return calculateSaleTotal(
      lines.map((l) => ({
        qty: Number(l.qty) || 0,
        price: Number(l.price) || 0,
      }))
    );
  }, [lines]);

  const handleSaveSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleDate) {
      setFormError('Please select a date for this sale.');
      return;
    }
    if (lines.length === 0) {
      setFormError('Please add at least one item.');
      return;
    }

    const parsedItems: SaleItem[] = [];
    for (const line of lines) {
      const cleanName = line.name.trim();
      const qtyNum = Number(line.qty);
      const priceNum = Number(line.price);

      if (!cleanName) {
        setFormError('Every item needs a name or selected product.');
        return;
      }
      if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
        setFormError(`Enter a valid quantity greater than 0 for "${cleanName}".`);
        return;
      }
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        setFormError(`Enter a valid selling price for "${cleanName}".`);
        return;
      }

      parsedItems.push({
        productId: line.mode === 'inventory' && line.productId ? line.productId : null,
        name: cleanName,
        qty: qtyNum,
        price: priceNum,
        buyPrice: line.buyPrice,
      });
    }

    if (paymentMethod === 'Credit/Debt' && !customer.trim()) {
      setFormError('Please enter the customer name for a Credit/Debt sale.');
      return;
    }

    setFormError('');
    const payload = {
      date: saleDate,
      items: parsedItems,
      paymentMethod,
      customer,
      notes,
    };

    if (editingSale) {
      onEditSale(editingSale.id, payload);
    } else {
      onAddSale(payload);
    }
    setSheetOpen(false);
  };

  const filteredSales = useMemo(() => {
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
    return sales
      .filter((s) => {
        if ((start || end) && !isDateInRange(s.date, start, end)) return false;
        if (paymentFilter !== 'All' && s.paymentMethod !== paymentFilter) return false;
        if (q) {
          const haystack = `${s.customer} ${s.notes} ${s.items.map((i) => i.name).join(' ')}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) =>
        b.date === a.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
      );
  }, [sales, period, customStart, customEnd, paymentFilter, search]);

  const groupedSales = useMemo(() => {
    const groups = new Map<string, Sale[]>();
    for (const s of filteredSales) {
      const list = groups.get(s.date) || [];
      list.push(s);
      groups.set(s.date, list);
    }
    return Array.from(groups.entries());
  }, [filteredSales]);

  const filteredTotal = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const outstandingDebt = calculateOutstandingDebt(debts);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Sales (Money In)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing {filteredSales.length} {filteredSales.length === 1 ? 'sale' : 'sales'} ·{' '}
            <span className="font-num font-semibold text-emerald-700 dark:text-emerald-400">
              {formatKES(filteredTotal)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenDebts}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="whitespace-nowrap">Debts ({formatKES(outstandingDebt)})</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            <span className="whitespace-nowrap">Add Sale</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search sales by item or customer"
            placeholder="Search item, customer, or note..."
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
            aria-label="Filter by payment method"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as 'All' | PaymentMethod)}
            className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="All">All Payments</option>
            <option value="Cash">Cash</option>
            <option value="M-Pesa">M-Pesa</option>
            <option value="Credit/Debt">Credit/Debt</option>
          </select>
        </div>

        {period === 'custom' && (
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div>
              <label htmlFor="sales-start" className="mb-1 block text-xs text-slate-500">
                From
              </label>
              <input
                id="sales-start"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-white px-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="sales-end" className="mb-1 block text-xs text-slate-500">
                To
              </label>
              <input
                id="sales-end"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="min-h-[40px] w-full rounded-xl border border-slate-200 bg-white px-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          </div>
        )}
      </div>

      {/* Grouped List or Empty State */}
      {groupedSales.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <CreditCard className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
            {sales.length === 0 ? 'No sales yet' : 'No matching sales'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {sales.length === 0
              ? 'Record your first sale to start tracking daily Money In.'
              : 'Try clearing your search or choosing a wider date filter.'}
          </p>
          {sales.length === 0 && (
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 min-h-[44px] rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Add your first sale
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedSales.map(([date, daySales]) => {
            const daySum = daySales.reduce((sum, s) => sum + s.total, 0);
            return (
              <section
                key={date}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {formatDateLabel(date)}
                  </span>
                  <span className="font-num text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatKES(daySum)}
                  </span>
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {daySales.map((sale) => {
                    const summaryLabel = sale.items
                      .map((i) => `${i.name} x${i.qty}`)
                      .join(', ');
                    return (
                      <li
                        key={sale.id}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {summaryLabel}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                            <span
                              className={
                                sale.paymentMethod === 'Credit/Debt'
                                  ? 'font-medium text-amber-700 dark:text-amber-400'
                                  : ''
                              }
                            >
                              {sale.paymentMethod}
                            </span>
                            {sale.customer ? ` · ${sale.customer}` : ''}
                            {sale.notes ? ` · ${sale.notes}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="font-num mr-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                            {formatKES(sale.total)}
                          </span>
                          <button
                            type="button"
                            onClick={() => openEditModal(sale)}
                            aria-label={`Edit sale ${summaryLabel}`}
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(sale)}
                            aria-label={`Delete sale ${summaryLabel}`}
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {/* Add / Edit Sale Modal */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingSale ? 'Edit Sale' : 'Add Sale'}
        subtitle="Items from stock will automatically update your quantities."
      >
        <form onSubmit={handleSaveSale} className="space-y-4" noValidate>
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
              htmlFor="sale-date"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Date
            </label>
            <input
              id="sale-date"
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Items Sold
              </span>
              <button
                type="button"
                onClick={() => setLines((prev) => [...prev, makeEmptyLine(products)])}
                className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
              >
                + Add another item
              </button>
            </div>

            {lines.map((line, idx) => (
              <div
                key={line.key}
                className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1 rounded-lg bg-slate-200/70 p-0.5 dark:bg-slate-800">
                    {products.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleLineModeToggle(line.key, 'inventory')}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                          line.mode === 'inventory'
                            ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        From Stock
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleLineModeToggle(line.key, 'custom')}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                        line.mode === 'custom'
                          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Custom Item
                    </button>
                  </div>

                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setLines((prev) => prev.filter((l) => l.key !== line.key))
                      }
                      aria-label={`Remove item ${idx + 1}`}
                      className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {line.mode === 'inventory' && products.length > 0 ? (
                  <div>
                    <label
                      htmlFor={`line-prod-${line.key}`}
                      className="mb-1 block text-xs text-slate-500 dark:text-slate-400"
                    >
                      Select product
                    </label>
                    <select
                      id={`line-prod-${line.key}`}
                      value={line.productId}
                      onChange={(e) => handleLineProductChange(line.key, e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.quantity} {p.unit} left · {formatKES(p.sellPrice)})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor={`line-name-${line.key}`}
                      className="mb-1 block text-xs text-slate-500 dark:text-slate-400"
                    >
                      Item name
                    </label>
                    <input
                      id={`line-name-${line.key}`}
                      type="text"
                      value={line.name}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key ? { ...l, name: e.target.value } : l
                          )
                        )
                      }
                      placeholder="e.g. Mandazi, Safaricom Airtime"
                      className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor={`line-qty-${line.key}`}
                      className="mb-1 block text-xs text-slate-500 dark:text-slate-400"
                    >
                      Quantity
                    </label>
                    <input
                      id={`line-qty-${line.key}`}
                      type="number"
                      min="0.01"
                      step="any"
                      value={line.qty}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key ? { ...l, qty: e.target.value } : l
                          )
                        )
                      }
                      className="font-num min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`line-price-${line.key}`}
                      className="mb-1 block text-xs text-slate-500 dark:text-slate-400"
                    >
                      Selling price (KES)
                    </label>
                    <input
                      id={`line-price-${line.key}`}
                      type="number"
                      min="0"
                      step="any"
                      value={line.price}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key ? { ...l, price: e.target.value } : l
                          )
                        )
                      }
                      className="font-num min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total Banner */}
          <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/40">
            <span className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
              Total Sale Amount
            </span>
            <span className="font-num text-xl font-bold text-emerald-800 dark:text-emerald-300">
              {formatKES(draftTotal)}
            </span>
          </div>

          {/* Payment Method */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Payment Method
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

            {/* Future-ready M-Pesa Payment Request button */}
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="mt-2.5 flex min-h-[44px] w-full cursor-not-allowed items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400"
            >
              <span className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-600/70" />
                M-Pesa Payment Request (STK Push)
              </span>
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                Coming soon
              </span>
            </button>
          </div>

          <div>
            <label
              htmlFor="sale-customer"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Customer name {paymentMethod === 'Credit/Debt' ? '(required)' : '(optional)'}
            </label>
            <input
              id="sale-customer"
              type="text"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder={
                paymentMethod === 'Credit/Debt'
                  ? 'Who owes this money?'
                  : 'e.g. Mama Kevin'
              }
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div>
            <label
              htmlFor="sale-notes"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Notes (optional)
            </label>
            <input
              id="sale-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any short note..."
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <button
            type="submit"
            className="min-h-[48px] w-full rounded-xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            {editingSale ? 'Save Changes' : 'Save Sale'}
          </button>
        </form>
      </BottomSheet>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this sale?"
        message="Deleting this sale will restore the sold items back into your stock and remove any linked customer debt."
        confirmLabel="Delete Sale"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteSale(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};
