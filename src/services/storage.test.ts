import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAddProduct,
  applyAddSale,
  applyDebtPayment,
  applyDeleteSale,
  applyEditSale,
  applyRestockProduct,
  applyStockAdjustment,
  createEmptyDatabase,
} from './storage';

test('adding a Credit/Debt sale deducts stock, records movement, and creates debt', () => {
  let db = createEmptyDatabase();
  db = applyAddProduct(db, {
    name: 'Sugar 1kg',
    category: 'Dry Foods',
    buyPrice: 140,
    sellPrice: 180,
    quantity: 10,
    unit: 'packets',
    reorderLevel: 3,
  });
  const productId = db.products[0].id;

  db = applyAddSale(db, {
    date: '2026-11-18',
    items: [{ productId, name: 'Sugar 1kg', qty: 4, price: 180 }],
    paymentMethod: 'Credit/Debt',
    customer: 'Peter Kamau',
    notes: 'Pay Friday',
  });

  assert.equal(db.products[0].quantity, 6);
  assert.equal(db.sales.length, 1);
  assert.equal(db.sales[0].total, 720);
  assert.equal(db.debts.length, 1);
  assert.equal(db.debts[0].customer, 'Peter Kamau');
  assert.equal(db.debts[0].amount, 720);
  assert.equal(db.debts[0].status, 'unpaid');
  assert.equal(db.stockMovements[0].type, 'sale');
  assert.equal(db.stockMovements[0].qty, -4);
});

test('deleting a sale restores stock and removes linked debt', () => {
  let db = createEmptyDatabase();
  db = applyAddProduct(db, {
    name: 'Unga 2kg',
    category: 'Dry Foods',
    buyPrice: 130,
    sellPrice: 165,
    quantity: 15,
    unit: 'packets',
    reorderLevel: 5,
  });
  const productId = db.products[0].id;

  db = applyAddSale(db, {
    date: '2026-11-18',
    items: [{ productId, name: 'Unga 2kg', qty: 5, price: 165 }],
    paymentMethod: 'Credit/Debt',
    customer: 'Mary Wanjiku',
    notes: '',
  });
  assert.equal(db.products[0].quantity, 10);
  const saleId = db.sales[0].id;

  db = applyDeleteSale(db, saleId);
  assert.equal(db.products[0].quantity, 15);
  assert.equal(db.sales.length, 0);
  assert.equal(db.debts.length, 0);
});

test('editing a sale adjusts stock delta and updates debt cleanly', () => {
  let db = createEmptyDatabase();
  db = applyAddProduct(db, {
    name: 'Milk 500ml',
    category: 'Dairy',
    buyPrice: 50,
    sellPrice: 65,
    quantity: 20,
    unit: 'packets',
    reorderLevel: 5,
  });
  const productId = db.products[0].id;

  db = applyAddSale(db, {
    date: '2026-11-18',
    items: [{ productId, name: 'Milk 500ml', qty: 4, price: 65 }],
    paymentMethod: 'Credit/Debt',
    customer: 'Alice',
    notes: '',
  });
  const saleId = db.sales[0].id;

  db = applyEditSale(db, saleId, {
    date: '2026-11-18',
    items: [{ productId, name: 'Milk 500ml', qty: 6, price: 65 }],
    paymentMethod: 'Credit/Debt',
    customer: 'Alice',
    notes: 'Updated qty',
  });

  assert.equal(db.products[0].quantity, 14);
  assert.equal(db.sales[0].total, 390);
  assert.equal(db.debts[0].amount, 390);
});

test('restock adds quantity and optionally records expense; adjustment reduces stock', () => {
  let db = createEmptyDatabase();
  db = applyAddProduct(db, {
    name: 'Cooking Oil 1L',
    category: 'Cooking',
    buyPrice: 280,
    sellPrice: 340,
    quantity: 2,
    unit: 'bottles',
    reorderLevel: 5,
  });
  const productId = db.products[0].id;

  db = applyRestockProduct(db, {
    productId,
    qtyToAdd: 10,
    unitBuyPrice: 290,
    date: '2026-11-18',
    reason: 'Wholesale purchase',
    recordAsExpense: true,
    paymentMethod: 'M-Pesa',
  });

  assert.equal(db.products[0].quantity, 12);
  assert.equal(db.products[0].buyPrice, 290);
  assert.equal(db.expenses.length, 1);
  assert.equal(db.expenses[0].category, 'Stock Purchase');
  assert.equal(db.expenses[0].amount, 2900);

  db = applyStockAdjustment(db, {
    productId,
    qtyRemoved: 2,
    date: '2026-11-18',
    reason: 'Damaged bottle',
  });
  assert.equal(db.products[0].quantity, 10);
});

test('applyDebtPayment transitions status from unpaid -> partial -> paid', () => {
  let db = createEmptyDatabase();
  db = applyAddSale(db, {
    date: '2026-11-18',
    items: [{ productId: null, name: 'Airtime', qty: 1, price: 500 }],
    paymentMethod: 'Credit/Debt',
    customer: 'Brian',
    notes: '',
  });
  const debtId = db.debts[0].id;

  db = applyDebtPayment(db, debtId, 200);
  assert.equal(db.debts[0].amountPaid, 200);
  assert.equal(db.debts[0].status, 'partial');

  db = applyDebtPayment(db, debtId, 500); // caps at 500
  assert.equal(db.debts[0].amountPaid, 500);
  assert.equal(db.debts[0].status, 'paid');
});
