import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  CreditCard,
  Download,
  Home,
  Moon,
  Package,
  Receipt,
  Settings,
  Sun,
  Users,
  WifiOff,
} from 'lucide-react';
import type {
  Business,
  DukaDatabase,
  ExpenseCategory,
  NavTab,
  PaymentMethod,
  Product,
  SaleItem,
  ThemeMode,
} from './types/duka';
import {
  applyAddExpense,
  applyAddProduct,
  applyAddSale,
  applyDebtPayment,
  applyDeleteExpense,
  applyDeleteProduct,
  applyDeleteSale,
  applyEditExpense,
  applyEditSale,
  applyResetPin,
  applyRestockProduct,
  applySaveBusiness,
  applySetTheme,
  applyStockAdjustment,
  applyUpdateProduct,
  buildDemoDatabase,
  createEmptyDatabase,
  dukaRepository,
} from './services/storage';
import { calculateOutstandingDebt, formatKES } from './utils/calculations';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { usePWAInstall } from './hooks/usePWAInstall';
import { OnboardingScreen } from './components/OnboardingScreen';
import { PinLockScreen } from './components/PinLockScreen';
import { HomeDashboard } from './components/HomeDashboard';
import { SalesView } from './components/SalesView';
import { ExpensesView } from './components/ExpensesView';
import { StockView } from './components/StockView';
import { DebtsView } from './components/DebtsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';

const BOTTOM_TABS: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'sales', label: 'Sales', icon: CreditCard },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'stock', label: 'Stock', icon: Package },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

export default function App() {
  const [db, setDb] = useState<DukaDatabase>(() => {
    const loaded = dukaRepository.load();
    if (
      typeof window !== 'undefined' &&
      !loaded.business &&
      new URLSearchParams(window.location.search).get('autostart') === '1'
    ) {
      const demo = buildDemoDatabase(null, loaded.theme);
      dukaRepository.save(demo);
      return demo;
    }
    return loaded;
  });

  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [pinUnlocked, setPinUnlocked] = useState<boolean>(() => {
    const loaded = dukaRepository.load();
    return !loaded.business?.pin;
  });

  // Trigger counters to open specific "+ Add" sheets when jumping from Dashboard quick actions
  const [addSaleTrigger, setAddSaleTrigger] = useState(0);
  const [addExpenseTrigger, setAddExpenseTrigger] = useState(0);
  const [addStockTrigger, setAddStockTrigger] = useState(0);

  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, install } = usePWAInstall();

  useEffect(() => {
    dukaRepository.save(db);
  }, [db]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', db.theme === 'dark');
  }, [db.theme]);

  const updateDb = (updater: (prev: DukaDatabase) => DukaDatabase) => {
    setDb((prev) => updater(prev));
  };

  const handleCompleteOnboarding = (business: Business) => {
    updateDb((prev) => applySaveBusiness(prev, business));
    setPinUnlocked(true);
    setActiveTab('home');
  };

  const handleLoadDemo = () => {
    setDb((prev) => buildDemoDatabase(prev.business, prev.theme));
    setPinUnlocked(true);
    setActiveTab('home');
  };

  const handleClearAll = () => {
    dukaRepository.clear();
    setDb((prev) => ({ ...createEmptyDatabase(), theme: prev.theme }));
    setPinUnlocked(true);
    setActiveTab('home');
  };

  const handleToggleTheme = () => {
    const next: ThemeMode = db.theme === 'dark' ? 'light' : 'dark';
    updateDb((prev) => applySetTheme(prev, next));
  };

  if (!db.business) {
    return (
      <OnboardingScreen
        onComplete={handleCompleteOnboarding}
        onLoadDemo={handleLoadDemo}
      />
    );
  }

  if (db.business.pin && !pinUnlocked) {
    return (
      <PinLockScreen
        business={db.business}
        onUnlock={() => setPinUnlocked(true)}
        onResetPin={(nextPin) => updateDb((prev) => applyResetPin(prev, nextPin))}
        onClearAll={handleClearAll}
      />
    );
  }

  const outstandingDebt = calculateOutstandingDebt(db.debts);

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Left Sidebar */}
      <aside className="no-print hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white lg:dark:border-slate-800 lg:dark:bg-slate-900">
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5 dark:border-slate-800">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-sm font-bold text-white">
            TD
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
              Tally Duka
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {db.business.name}
            </p>
          </div>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 space-y-1 p-3">
          {BOTTOM_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <div className="my-2 border-t border-slate-100 pt-2 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('debts')}
              className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'debts'
                  ? 'bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`}
            >
              <span className="flex items-center gap-3">
                <Users className="h-5 w-5 shrink-0" />
                <span>Debts</span>
              </span>
              {outstandingDebt > 0 && (
                <span className="font-num text-xs font-semibold text-amber-700 dark:text-amber-400">
                  {formatKES(outstandingDebt)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`mt-1 flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`}
            >
              <Settings className="h-5 w-5 shrink-0" />
              <span>Settings</span>
            </button>
          </div>
        </nav>

        <div className="space-y-2 border-t border-slate-100 p-3 dark:border-slate-800">
          {isInstallable && !isInstalled && (
            <button
              type="button"
              onClick={install}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              <Download className="h-4 w-4" />
              Install App
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleTheme}
            className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <span>{db.theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            {db.theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-500" />
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Compact Sticky Top Bar (52px height) */}
      <header className="no-print sticky top-0 z-30 flex h-[52px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2 text-left"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-700 text-xs font-bold text-white">
            TD
          </span>
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Tally Duka
          </span>
        </button>

        <div className="flex items-center gap-1">
          {isInstallable && !isInstalled && (
            <button
              type="button"
              onClick={install}
              aria-label="Install Tally Duka app"
              className="flex min-h-[44px] items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"
            >
              <Download className="h-4 w-4" />
              <span>Install</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label={db.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {db.theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            aria-label="Open settings"
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors ${
              activeTab === 'settings'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6 lg:pb-10 lg:pt-7">
          {!isOnline && (
            <div className="no-print mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>Offline mode — All your shop records work normally on this device.</span>
            </div>
          )}

          {activeTab === 'home' && (
            <HomeDashboard
              business={db.business}
              products={db.products}
              sales={db.sales}
              expenses={db.expenses}
              debts={db.debts}
              onQuickAddSale={() => {
                setActiveTab('sales');
                setAddSaleTrigger((n) => n + 1);
              }}
              onQuickAddExpense={() => {
                setActiveTab('expenses');
                setAddExpenseTrigger((n) => n + 1);
              }}
              onQuickAddStock={() => {
                setActiveTab('stock');
                setAddStockTrigger((n) => n + 1);
              }}
              onNavigate={setActiveTab}
              onLoadDemo={handleLoadDemo}
            />
          )}

          {activeTab === 'sales' && (
            <SalesView
              sales={db.sales}
              products={db.products}
              debts={db.debts}
              openAddTrigger={addSaleTrigger}
              onAddSale={(input: {
                date: string;
                items: SaleItem[];
                paymentMethod: PaymentMethod;
                customer: string;
                notes: string;
              }) => updateDb((prev) => applyAddSale(prev, input))}
              onEditSale={(saleId, input) =>
                updateDb((prev) => applyEditSale(prev, saleId, input))
              }
              onDeleteSale={(saleId) =>
                updateDb((prev) => applyDeleteSale(prev, saleId))
              }
              onOpenDebts={() => setActiveTab('debts')}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              expenses={db.expenses}
              openAddTrigger={addExpenseTrigger}
              onAddExpense={(input: {
                date: string;
                category: ExpenseCategory;
                amount: number;
                paymentMethod: PaymentMethod;
                notes: string;
              }) => updateDb((prev) => applyAddExpense(prev, input))}
              onEditExpense={(expenseId, input) =>
                updateDb((prev) => applyEditExpense(prev, expenseId, input))
              }
              onDeleteExpense={(expenseId) =>
                updateDb((prev) => applyDeleteExpense(prev, expenseId))
              }
            />
          )}

          {activeTab === 'stock' && (
            <StockView
              products={db.products}
              sales={db.sales}
              stockMovements={db.stockMovements}
              openAddTrigger={addStockTrigger}
              onAddProduct={(input: Omit<Product, 'id' | 'updatedAt'>) =>
                updateDb((prev) => applyAddProduct(prev, input))
              }
              onUpdateProduct={(product) =>
                updateDb((prev) => applyUpdateProduct(prev, product))
              }
              onDeleteProduct={(productId) =>
                updateDb((prev) => applyDeleteProduct(prev, productId))
              }
              onRestock={(params) =>
                updateDb((prev) => applyRestockProduct(prev, params))
              }
              onAdjustStock={(params) =>
                updateDb((prev) => applyStockAdjustment(prev, params))
              }
            />
          )}

          {activeTab === 'debts' && (
            <DebtsView
              debts={db.debts}
              onRecordPayment={(debtId, amount) =>
                updateDb((prev) => applyDebtPayment(prev, debtId, amount))
              }
              onBack={() => setActiveTab('home')}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              business={db.business}
              sales={db.sales}
              expenses={db.expenses}
              products={db.products}
              debts={db.debts}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              db={db}
              onSaveBusiness={(biz) => updateDb((prev) => applySaveBusiness(prev, biz))}
              onSetTheme={(theme) => updateDb((prev) => applySetTheme(prev, theme))}
              onLoadDemo={handleLoadDemo}
              onClearAll={handleClearAll}
            />
          )}
        </div>
      </main>

      {/* Mobile Fixed 5-Tab Bottom Navigation Bar (60px height) */}
      <nav
        aria-label="Bottom navigation"
        className="no-print fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur-md lg:hidden dark:border-slate-800 dark:bg-slate-900/95"
      >
        <div className="grid h-[60px] grid-cols-5 items-center">
          {BOTTOM_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors ${
                  active
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[11px] font-medium tracking-tight">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
