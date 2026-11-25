import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type {
  PaymentMethod,
  Product,
  ProductUnit,
  Sale,
  StockMovement,
} from '../types/duka';
import {
  calculateInventorySummary,
  formatDateLabel,
  formatKES,
  getTodayISO,
} from '../utils/calculations';
import { BottomSheet } from './BottomSheet';
import { ConfirmDialog } from './ConfirmDialog';

const UNITS: ProductUnit[] = [
  'pieces',
  'kg',
  'litres',
  'packets',
  'bags',
  'boxes',
  'bottles',
  'trays',
];

const ADJUSTMENT_REASONS = ['Damaged', 'Expired', 'Lost / Stolen', 'Personal use'];

interface StockViewProps {
  products: Product[];
  sales: Sale[];
  stockMovements: StockMovement[];
  openAddTrigger?: number;
  onAddProduct: (input: Omit<Product, 'id' | 'updatedAt'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onRestock: (params: {
    productId: string;
    qtyToAdd: number;
    unitBuyPrice?: number;
    date: string;
    reason?: string;
    recordAsExpense: boolean;
    paymentMethod?: PaymentMethod;
  }) => void;
  onAdjustStock: (params: {
    productId: string;
    qtyRemoved: number;
    date: string;
    reason: string;
  }) => void;
}

export const StockView: React.FC<StockViewProps> = ({
  products,
  sales,
  stockMovements,
  openAddTrigger = 0,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onRestock,
  onAdjustStock,
}) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low'>('all');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Add / Edit Product modal
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<string>('pieces');
  const [reorderLevel, setReorderLevel] = useState('5');
  const [productError, setProductError] = useState('');

  // Restock modal
  const [restockTarget, setRestockTarget] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockBuyPrice, setRestockBuyPrice] = useState('');
  const [restockDate, setRestockDate] = useState(getTodayISO());
  const [restockReason, setRestockReason] = useState('');
  const [recordAsExpense, setRecordAsExpense] = useState(true);
  const [restockPayMethod, setRestockPayMethod] = useState<PaymentMethod>('Cash');
  const [restockError, setRestockError] = useState('');

  // Adjustment modal
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustDate, setAdjustDate] = useState(getTodayISO());
  const [adjustReasonType, setAdjustReasonType] = useState('Damaged');
  const [adjustCustomReason, setAdjustCustomReason] = useState('');
  const [adjustError, setAdjustError] = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [lastTrigger, setLastTrigger] = useState(0);

  const openAddProductModal = () => {
    setEditingProduct(null);
    setName('');
    setCategory('General');
    setBuyPrice('');
    setSellPrice('');
    setQuantity('');
    setUnit('pieces');
    setReorderLevel('5');
    setProductError('');
    setProductSheetOpen(true);
  };

  if (openAddTrigger > 0 && openAddTrigger !== lastTrigger) {
    setLastTrigger(openAddTrigger);
    openAddProductModal();
  }

  const openEditProductModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category);
    setBuyPrice(String(p.buyPrice));
    setSellPrice(String(p.sellPrice));
    setQuantity(String(p.quantity));
    setUnit(p.unit);
    setReorderLevel(String(p.reorderLevel));
    setProductError('');
    setProductSheetOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const buy = Number(buyPrice);
    const sell = Number(sellPrice);
    const qty = Number(quantity);
    const reorder = Number(reorderLevel);

    if (!cleanName) {
      setProductError('Please enter a product name.');
      return;
    }
    if (!Number.isFinite(buy) || buy < 0) {
      setProductError('Enter a valid buying price (0 or more).');
      return;
    }
    if (!Number.isFinite(sell) || sell <= 0) {
      setProductError('Enter a valid selling price greater than 0.');
      return;
    }
    if (!Number.isFinite(qty) || qty < 0) {
      setProductError('Enter a valid starting quantity (0 or more).');
      return;
    }
    if (!Number.isFinite(reorder) || reorder < 0) {
      setProductError('Enter a valid low-stock alert threshold (0 or more).');
      return;
    }

    setProductError('');
    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        name: cleanName,
        category: category.trim() || 'General',
        buyPrice: buy,
        sellPrice: sell,
        quantity: qty,
        unit,
        reorderLevel: reorder,
      });
    } else {
      onAddProduct({
        name: cleanName,
        category: category.trim() || 'General',
        buyPrice: buy,
        sellPrice: sell,
        quantity: qty,
        unit,
        reorderLevel: reorder,
      });
    }
    setProductSheetOpen(false);
  };

  const openRestockModal = (p: Product) => {
    setRestockTarget(p);
    setRestockQty('');
    setRestockBuyPrice(String(p.buyPrice));
    setRestockDate(getTodayISO());
    setRestockReason('');
    setRecordAsExpense(true);
    setRestockPayMethod('Cash');
    setRestockError('');
  };

  const handleSaveRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockTarget) return;
    const qty = Number(restockQty);
    const buy = Number(restockBuyPrice);
    if (!Number.isFinite(qty) || qty <= 0) {
      setRestockError('Enter a quantity greater than 0 to add.');
      return;
    }
    if (!Number.isFinite(buy) || buy < 0) {
      setRestockError('Enter a valid buying price per unit.');
      return;
    }
    onRestock({
      productId: restockTarget.id,
      qtyToAdd: qty,
      unitBuyPrice: buy,
      date: restockDate,
      reason: restockReason,
      recordAsExpense,
      paymentMethod: restockPayMethod,
    });
    setRestockTarget(null);
  };

  const openAdjustModal = (p: Product) => {
    setAdjustTarget(p);
    setAdjustQty('');
    setAdjustDate(getTodayISO());
    setAdjustReasonType('Damaged');
    setAdjustCustomReason('');
    setAdjustError('');
  };

  const handleSaveAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    const qty = Number(adjustQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      setAdjustError('Enter a quantity greater than 0.');
      return;
    }
    if (qty > adjustTarget.quantity) {
      setAdjustError(`Cannot remove more than current stock (${adjustTarget.quantity} ${adjustTarget.unit}).`);
      return;
    }
    const reason =
      adjustCustomReason.trim() ? `${adjustReasonType}: ${adjustCustomReason.trim()}` : adjustReasonType;
    onAdjustStock({
      productId: adjustTarget.id,
      qtyRemoved: qty,
      date: adjustDate,
      reason,
    });
    setAdjustTarget(null);
  };

  const summary = useMemo(() => calculateInventorySummary(products), [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (filterMode === 'low' && p.quantity > p.reorderLevel) return false;
      if (q) {
        const text = `${p.name} ${p.category}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [products, search, filterMode]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  // Product Detail View
  if (selectedProduct) {
    const unitProfit = selectedProduct.sellPrice - selectedProduct.buyPrice;
    const totalUnitsSold = sales.reduce((sum, s) => {
      const matchQty = s.items
        .filter((i) => i.productId === selectedProduct.id)
        .reduce((acc, i) => acc + i.qty, 0);
      return sum + matchQty;
    }, 0);
    const movements = stockMovements.filter((m) => m.productId === selectedProduct.id);
    const isLow = selectedProduct.quantity <= selectedProduct.reorderLevel;

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedProductId(null)}
              aria-label="Back to stock list"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-xl font-bold text-slate-900 dark:text-slate-100">
                  {selectedProduct.name}
                </h2>
                {isLow && (
                  <span className="shrink-0 rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                    Low stock
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {selectedProduct.category} · Reorder level: {selectedProduct.reorderLevel} {selectedProduct.unit}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => openEditProductModal(selectedProduct)}
              aria-label={`Edit ${selectedProduct.name}`}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(selectedProduct)}
              aria-label={`Delete ${selectedProduct.name}`}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-red-600 hover:bg-red-50 dark:border-slate-800 dark:bg-slate-900 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-500 dark:text-slate-400">In Stock</p>
            <p className="font-num mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
              {selectedProduct.quantity} {selectedProduct.unit}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-500 dark:text-slate-400">Profit per Unit</p>
            <p
              className={`font-num mt-1 text-xl font-bold ${
                unitProfit >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatKES(unitProfit)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Units Sold</p>
            <p className="font-num mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
              {totalUnitsSold} {selectedProduct.unit}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-500 dark:text-slate-400">Buy / Sell Price</p>
            <p className="font-num mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {formatKES(selectedProduct.buyPrice)} / {formatKES(selectedProduct.sellPrice)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => openRestockModal(selectedProduct)}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <PackagePlus className="h-4 w-4" />
            Restock Item
          </button>
          <button
            type="button"
            onClick={() => openAdjustModal(selectedProduct)}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <ArrowUpDown className="h-4 w-4" />
            Adjust Stock
          </button>
        </div>

        {/* Stock Movement History */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Stock History
          </h3>
          {movements.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              No stock movements recorded yet.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {movements.map((mov) => (
                <li key={mov.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize text-slate-900 dark:text-slate-100">
                      {mov.type} · {mov.reason}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDateLabel(mov.date)}
                    </p>
                  </div>
                  <span
                    className={`font-num shrink-0 text-sm font-bold ${
                      mov.qty >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {mov.qty >= 0 ? `+${mov.qty}` : mov.qty} {selectedProduct.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Modals rendered here too */}
        {renderModals()}
      </div>
    );
  }

  function renderModals() {
    return (
      <>
        <BottomSheet
          open={productSheetOpen}
          onClose={() => setProductSheetOpen(false)}
          title={editingProduct ? 'Edit Product' : 'Add Stock Product'}
          subtitle="Keep track of prices, stock levels, and low-stock alerts."
        >
          <form onSubmit={handleSaveProduct} className="space-y-4" noValidate>
            {productError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
              >
                {productError}
              </div>
            )}

            <div>
              <label htmlFor="prod-name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Product name
              </label>
              <input
                id="prod-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pembe Maize Flour 2kg"
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="prod-cat" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Category
                </label>
                <input
                  id="prod-cat"
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Dry Foods"
                  className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
              <div>
                <label htmlFor="prod-unit" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Unit
                </label>
                <select
                  id="prod-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="prod-buy" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Buying price (KES)
                </label>
                <input
                  id="prod-buy"
                  type="number"
                  min="0"
                  step="any"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  placeholder="e.g. 135"
                  className="font-num min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
              <div>
                <label htmlFor="prod-sell" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Selling price (KES)
                </label>
                <input
                  id="prod-sell"
                  type="number"
                  min="0"
                  step="any"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="e.g. 165"
                  className="font-num min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="prod-qty" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Current quantity
                </label>
                <input
                  id="prod-qty"
                  type="number"
                  min="0"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 20"
                  className="font-num min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
              <div>
                <label htmlFor="prod-reorder" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Low stock alert at
                </label>
                <input
                  id="prod-reorder"
                  type="number"
                  min="0"
                  step="any"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  placeholder="e.g. 5"
                  className="font-num min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            </div>

            <button
              type="submit"
              className="min-h-[48px] w-full rounded-xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-800"
            >
              {editingProduct ? 'Save Changes' : 'Save Product'}
            </button>
          </form>
        </BottomSheet>

        {/* Restock Sheet */}
        <BottomSheet
          open={!!restockTarget}
          onClose={() => setRestockTarget(null)}
          title="Restock Product"
          subtitle={restockTarget ? `${restockTarget.name} (Currently ${restockTarget.quantity} ${restockTarget.unit})` : ''}
        >
          {restockTarget && (
            <form onSubmit={handleSaveRestock} className="space-y-4" noValidate>
              {restockError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
                >
                  {restockError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="restock-qty" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Quantity added ({restockTarget.unit})
                  </label>
                  <input
                    id="restock-qty"
                    type="number"
                    min="0.01"
                    step="any"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    placeholder="e.g. 12"
                    className="font-num min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label htmlFor="restock-buy" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Buying price / unit
                  </label>
                  <input
                    id="restock-buy"
                    type="number"
                    min="0"
                    step="any"
                    value={restockBuyPrice}
                    onChange={(e) => setRestockBuyPrice(e.target.value)}
                    className="font-num min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="restock-date" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Date
                </label>
                <input
                  id="restock-date"
                  type="date"
                  value={restockDate}
                  onChange={(e) => setRestockDate(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <div>
                <label htmlFor="restock-reason" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Note / Supplier (optional)
                </label>
                <input
                  id="restock-reason"
                  type="text"
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  placeholder="e.g. Wholesale delivery"
                  className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={recordAsExpense}
                  onChange={(e) => setRecordAsExpense(e.target.checked)}
                  className="h-4 w-4 accent-emerald-700"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  Also record total cost (
                  <span className="font-num font-semibold">
                    {formatKES((Number(restockQty) || 0) * (Number(restockBuyPrice) || 0))}
                  </span>
                  ) as Money Out expense
                </span>
              </label>

              {recordAsExpense && (
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">
                    Paid via
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Cash', 'M-Pesa', 'Credit/Debt'] as PaymentMethod[]).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setRestockPayMethod(method)}
                        className={`min-h-[40px] rounded-xl border px-2 text-xs font-semibold ${
                          restockPayMethod === method
                            ? 'border-emerald-700 bg-emerald-700 text-white'
                            : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="min-h-[48px] w-full rounded-xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-800"
              >
                Confirm Restock
              </button>
            </form>
          )}
        </BottomSheet>

        {/* Stock Adjustment Sheet */}
        <BottomSheet
          open={!!adjustTarget}
          onClose={() => setAdjustTarget(null)}
          title="Adjust Stock"
          subtitle={adjustTarget ? `${adjustTarget.name} (${adjustTarget.quantity} ${adjustTarget.unit} available)` : ''}
        >
          {adjustTarget && (
            <form onSubmit={handleSaveAdjust} className="space-y-4" noValidate>
              {adjustError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
                >
                  {adjustError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="adj-qty" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Quantity to remove
                  </label>
                  <input
                    id="adj-qty"
                    type="number"
                    min="0.01"
                    step="any"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    placeholder="e.g. 1"
                    className="font-num min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label htmlFor="adj-date" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    Date
                  </label>
                  <input
                    id="adj-date"
                    type="date"
                    value={adjustDate}
                    onChange={(e) => setAdjustDate(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="adj-reason-type" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Reason
                </label>
                <select
                  id="adj-reason-type"
                  value={adjustReasonType}
                  onChange={(e) => setAdjustReasonType(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  {ADJUSTMENT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="adj-note" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Extra note (optional)
                </label>
                <input
                  id="adj-note"
                  type="text"
                  value={adjustCustomReason}
                  onChange={(e) => setAdjustCustomReason(e.target.value)}
                  placeholder="e.g. Broken during delivery"
                  className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </div>

              <button
                type="submit"
                className="min-h-[48px] w-full rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white hover:bg-slate-800 dark:bg-emerald-700 dark:hover:bg-emerald-800"
              >
                Save Adjustment
              </button>
            </form>
          )}
        </BottomSheet>

        <ConfirmDialog
          open={!!deleteTarget}
          title={`Delete ${deleteTarget?.name || 'product'}?`}
          message="Past sales will remain in your reports, but this product will be removed from your stock list."
          confirmLabel="Delete Product"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (deleteTarget) {
              onDeleteProduct(deleteTarget.id);
              if (selectedProductId === deleteTarget.id) {
                setSelectedProductId(null);
              }
              setDeleteTarget(null);
            }
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Stock &amp; Inventory
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {summary.totalProducts} products · {summary.totalUnits} total units
          </p>
        </div>
        <button
          type="button"
          onClick={openAddProductModal}
          className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          <Plus className="h-4 w-4" />
          <span className="whitespace-nowrap">Add Product</span>
        </button>
      </div>

      {/* Inventory Value Summary */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Stock Value (Buying Price)
          </p>
          <p className="font-num mt-1.5 text-xl font-bold text-slate-900 dark:text-slate-100">
            {formatKES(summary.buyValue)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Stock Value (Selling Price)
          </p>
          <p className="font-num mt-1.5 text-xl font-bold text-emerald-700 dark:text-emerald-400">
            {formatKES(summary.sellValue)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Expected Profit in Stock
          </p>
          <p className="font-num mt-1.5 text-xl font-bold text-slate-900 dark:text-slate-100">
            {formatKES(summary.potentialProfit)}
          </p>
        </div>
      </section>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search stock items"
            placeholder="Search product or category..."
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`min-h-[38px] rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap ${
              filterMode === 'all'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            All ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('low')}
            className={`min-h-[38px] rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap ${
              filterMode === 'low'
                ? 'bg-white text-red-700 shadow-sm dark:bg-slate-900 dark:text-red-400'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Low Stock ({summary.lowStockItems.length})
          </button>
        </div>
      </div>

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <Package className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
            {products.length === 0 ? 'No products in stock yet' : 'No matching products'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {products.length === 0
              ? 'Add items you sell so Tally Duka can track stock levels and profits automatically.'
              : 'Try clearing your search or switching to All products.'}
          </p>
          {products.length === 0 && (
            <button
              type="button"
              onClick={openAddProductModal}
              className="mt-4 min-h-[44px] rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Add your first product
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {filteredProducts.map((product) => {
            const isLow = product.quantity <= product.reorderLevel;
            return (
              <li
                key={product.id}
                className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
              >
                <button
                  type="button"
                  onClick={() => setSelectedProductId(product.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-slate-900 hover:text-emerald-700 dark:text-slate-100 dark:hover:text-emerald-400">
                      {product.name}
                    </span>
                    {isLow && (
                      <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                        Low stock
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {product.category} · Buy {formatKES(product.buyPrice)} · Sell{' '}
                    {formatKES(product.sellPrice)} · Profit/unit{' '}
                    {formatKES(product.sellPrice - product.buyPrice)}
                  </p>
                </button>

                <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                  <div className="text-left sm:mr-2 sm:text-right">
                    <p
                      className={`font-num text-base font-bold ${
                        isLow
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {product.quantity} {product.unit}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Alert at {product.reorderLevel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openRestockModal(product)}
                    className="min-h-[44px] rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-300"
                  >
                    + Restock
                  </button>
                  <button
                    type="button"
                    onClick={() => openAdjustModal(product)}
                    aria-label={`Adjust stock for ${product.name}`}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {renderModals()}
    </div>
  );
};
