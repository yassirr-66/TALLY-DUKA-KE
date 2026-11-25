import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWhatsAppSummary,
  calculateInventorySummary,
  calculateOutstandingDebt,
  calculatePeriodComparison,
  calculateProfitAndLoss,
  calculateSaleTotal,
  formatKES,
  getBestSellingItems,
  getPeriodDateRange,
} from './calculations';
import type { Debt, Expense, Product, Sale } from '../types/duka';

test('formatKES formats positive, zero, and negative amounts cleanly', () => {
  assert.equal(formatKES(1250), 'KES 1,250');
  assert.equal(formatKES(0), 'KES 0');
  assert.equal(formatKES(-450), '-KES 450');
  assert.equal(formatKES(1250.6), 'KES 1,251');
});

test('calculateSaleTotal sums item qty * price accurately', () => {
  const total = calculateSaleTotal([
    { qty: 3, price: 165 },
    { qty: 2, price: 65 },
  ]);
  assert.equal(total, 625);
});

test('calculateProfitAndLoss computes COGS, gross profit, and net profit correctly', () => {
  const products: Product[] = [
    {
      id: 'p1',
      name: 'Unga 2kg',
      category: 'Dry Foods',
      buyPrice: 130,
      sellPrice: 165,
      quantity: 10,
      unit: 'packets',
      reorderLevel: 5,
    },
  ];
  const sales: Sale[] = [
    {
      id: 's1',
      date: '2026-11-18',
      items: [
        { productId: 'p1', name: 'Unga 2kg', qty: 4, price: 165, buyPrice: 130 },
        { productId: null, name: 'Custom Bag', qty: 1, price: 100, buyPrice: 0 },
      ],
      total: 760,
      paymentMethod: 'Cash',
      customer: '',
      notes: '',
      createdAt: '2026-11-18T10:00:00Z',
    },
    {
      id: 's_old',
      date: '2026-10-01',
      items: [{ productId: 'p1', name: 'Unga 2kg', qty: 10, price: 165, buyPrice: 130 }],
      total: 1650,
      paymentMethod: 'M-Pesa',
      customer: '',
      notes: '',
      createdAt: '2026-10-01T10:00:00Z',
    },
  ];
  const expenses: Expense[] = [
    {
      id: 'e1',
      date: '2026-11-18',
      category: 'Transport',
      amount: 200,
      paymentMethod: 'Cash',
      notes: '',
      createdAt: '2026-11-18T09:00:00Z',
    },
  ];

  const pnl = calculateProfitAndLoss({
    sales,
    expenses,
    products,
    startDate: '2026-11-18',
    endDate: '2026-11-18',
  });

  assert.equal(pnl.totalSales, 760);
  assert.equal(pnl.cogs, 520); // 4 * 130
  assert.equal(pnl.grossProfit, 240); // 760 - 520
  assert.equal(pnl.totalExpenses, 200);
  assert.equal(pnl.netProfit, 560); // 760 - 200
  assert.equal(pnl.transactionCount, 2);
});

test('calculateInventorySummary calculates buy/sell value and low stock items', () => {
  const products: Product[] = [
    {
      id: 'p1',
      name: 'Sugar 1kg',
      category: 'Dry Foods',
      buyPrice: 140,
      sellPrice: 180,
      quantity: 3,
      unit: 'packets',
      reorderLevel: 5,
    },
    {
      id: 'p2',
      name: 'Milk 500ml',
      category: 'Dairy',
      buyPrice: 50,
      sellPrice: 65,
      quantity: 20,
      unit: 'packets',
      reorderLevel: 10,
    },
  ];

  const summary = calculateInventorySummary(products);
  assert.equal(summary.totalProducts, 2);
  assert.equal(summary.totalUnits, 23);
  assert.equal(summary.buyValue, 3 * 140 + 20 * 50); // 1420
  assert.equal(summary.sellValue, 3 * 180 + 20 * 65); // 1840
  assert.equal(summary.potentialProfit, 420);
  assert.equal(summary.lowStockItems.length, 1);
  assert.equal(summary.lowStockItems[0].id, 'p1');
});

test('calculatePeriodComparison reports up/down/flat percentage cleanly', () => {
  assert.deepEqual(calculatePeriodComparison(1120, 1000, 'last week'), {
    direction: 'up',
    percent: 12,
    label: 'Up 12% from last week',
  });
  assert.deepEqual(calculatePeriodComparison(750, 1000, 'last week'), {
    direction: 'down',
    percent: 25,
    label: 'Down 25% from last week',
  });
});

test('calculateOutstandingDebt sums unpaid balances across debts', () => {
  const debts: Debt[] = [
    { id: 'd1', customer: 'John', amount: 1000, amountPaid: 400, saleId: 's1', date: '2026-11-18', status: 'partial' },
    { id: 'd2', customer: 'Mary', amount: 500, amountPaid: 500, saleId: 's2', date: '2026-11-18', status: 'paid' },
  ];
  assert.equal(calculateOutstandingDebt(debts), 600);
});

test('getBestSellingItems aggregates revenue across sales and limits results', () => {
  const sales: Sale[] = [
    {
      id: 's1',
      date: '2026-11-18',
      items: [
        { productId: 'p1', name: 'Unga', qty: 2, price: 150 },
        { productId: 'p2', name: 'Milk', qty: 5, price: 60 },
      ],
      total: 600,
      paymentMethod: 'Cash',
      customer: '',
      notes: '',
      createdAt: '2026-11-18T10:00:00Z',
    },
    {
      id: 's2',
      date: '2026-11-18',
      items: [{ productId: 'p1', name: 'Unga', qty: 3, price: 150 }],
      total: 450,
      paymentMethod: 'M-Pesa',
      customer: '',
      notes: '',
      createdAt: '2026-11-18T11:00:00Z',
    },
  ];
  const top = getBestSellingItems(sales, 5);
  assert.equal(top[0].name, 'Unga');
  assert.equal(top[0].qtySold, 5);
  assert.equal(top[0].revenue, 750);
});

test('getPeriodDateRange computes weekly Monday-to-today range and WhatsApp summary formats cleanly', () => {
  const ref = new Date(2026, 10, 18); // Wed Nov 18, 2026
  const weekly = getPeriodDateRange('weekly', ref);
  assert.equal(weekly.start, '2026-11-16');
  assert.equal(weekly.end, '2026-11-18');

  const text = buildWhatsAppSummary({
    businessName: 'Neema Duka',
    periodLabel: 'Today',
    pnl: {
      totalSales: 2500,
      totalExpenses: 500,
      cogs: 1800,
      grossProfit: 700,
      netProfit: 2000,
      transactionCount: 4,
      salesCount: 3,
      expensesCount: 1,
    },
    topItems: [{ name: 'Unga 2kg', productId: 'p1', qtySold: 5, revenue: 825 }],
    outstandingDebt: 350,
  });
  assert.match(text, /Neema Duka/);
  assert.match(text, /KES 2,500/);
  assert.match(text, /Unga 2kg/);
});
