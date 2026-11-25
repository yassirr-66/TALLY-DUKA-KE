import React, { useState } from 'react';
import {
  Check,
  Download,
  Lock,
  Moon,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react';
import type { Business, BusinessType, DukaDatabase, ThemeMode } from '../types/duka';
import { generateAllDataCSV } from '../utils/calculations';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ConfirmDialog } from './ConfirmDialog';

const BUSINESS_TYPES: BusinessType[] = [
  'Retail shop',
  'Kiosk',
  'Hardware',
  'Salon',
  'Wholesale',
  'Other',
];

interface SettingsViewProps {
  db: DukaDatabase;
  onSaveBusiness: (business: Business) => void;
  onSetTheme: (theme: ThemeMode) => void;
  onLoadDemo: () => void;
  onClearAll: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  db,
  onSaveBusiness,
  onSetTheme,
  onLoadDemo,
  onClearAll,
}) => {
  const business = db.business!;
  const [name, setName] = useState(business.name);
  const [owner, setOwner] = useState(business.owner);
  const [type, setType] = useState<BusinessType>(business.type);
  const [savedNotice, setSavedNotice] = useState(false);
  const [bizError, setBizError] = useState('');

  const [newPin, setNewPin] = useState(business.pin || '');
  const [pinNotice, setPinNotice] = useState('');
  const [pinError, setPinError] = useState('');

  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setBizError('Business name cannot be empty.');
      return;
    }
    if (!owner.trim()) {
      setBizError('Owner name cannot be empty.');
      return;
    }
    setBizError('');
    onSaveBusiness({
      ...business,
      name: name.trim(),
      owner: owner.trim(),
      type,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPin.trim();
    if (clean && !/^\d{4}$/.test(clean)) {
      setPinError('PIN must be exactly 4 digits, or leave empty to turn off PIN lock.');
      return;
    }
    setPinError('');
    onSaveBusiness({
      ...business,
      pin: clean,
    });
    setPinNotice(clean ? '4-digit PIN lock saved.' : 'PIN lock turned off.');
    setTimeout(() => setPinNotice(''), 2500);
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(db, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tally-duka-backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const csv = generateAllDataCSV(db);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tally-duka-all-records.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Shop Settings
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage your shop details, PIN lock, backups, and phone app install.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Business Details */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Business Details
          </h3>
          <form onSubmit={handleSaveDetails} className="mt-4 space-y-3.5" noValidate>
            {bizError && (
              <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
                {bizError}
              </p>
            )}
            <div>
              <label htmlFor="set-biz-name" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Business name
              </label>
              <input
                id="set-biz-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="set-owner" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Owner name
              </label>
              <input
                id="set-owner"
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="set-type" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Business type
              </label>
              <select
                id="set-type"
                value={type}
                onChange={(e) => setType(e.target.value as BusinessType)}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                {BUSINESS_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              {savedNotice && <Check className="h-4 w-4" />}
              {savedNotice ? 'Saved!' : 'Save Business Info'}
            </button>
          </form>
        </section>

        {/* PIN Lock & Theme */}
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                PIN Lock
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Protect your shop books with a 4-digit PIN when opening the app.
            </p>
            <form onSubmit={handleSavePin} className="mt-3.5 space-y-3" noValidate>
              {pinError && (
                <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
                  {pinError}
                </p>
              )}
              {pinNotice && (
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {pinNotice}
                </p>
              )}
              <div className="flex items-center gap-2">
                <input
                  id="set-pin"
                  aria-label="4-digit PIN"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="4 digits (or empty)"
                  className="font-num min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm tracking-widest placeholder:tracking-normal dark:border-slate-700 dark:bg-slate-950"
                />
                <button
                  type="submit"
                  className="min-h-[44px] rounded-xl border border-slate-200 bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 dark:border-slate-700 dark:bg-emerald-700"
                >
                  Update PIN
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Appearance
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onSetTheme('light')}
                className={`flex min-h-[46px] items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors ${
                  db.theme === 'light'
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200'
                }`}
              >
                <Sun className="h-4 w-4" />
                Light Mode
              </button>
              <button
                type="button"
                onClick={() => onSetTheme('dark')}
                className={`flex min-h-[46px] items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors ${
                  db.theme === 'dark'
                    ? 'border-emerald-600 bg-emerald-950/60 text-emerald-300'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200'
                }`}
              >
                <Moon className="h-4 w-4" />
                Dark Mode
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* PWA Install Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Install Tally Duka on Your Phone
              </h3>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {isInstalled
                  ? 'Tally Duka is already installed on your home screen and works offline.'
                  : 'Add to your Home Screen so it opens like a normal app and works without bundles.'}
              </p>
            </div>
          </div>

          {!isInstalled && (
            <div className="shrink-0">
              {isInstallable ? (
                <button
                  type="button"
                  onClick={install}
                  className="min-h-[44px] rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Install App
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowIOSGuide((prev) => !prev)}
                  className="min-h-[44px] rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                >
                  {isIOS ? 'How to install on iPhone' : 'How to Add to Home Screen'}
                </button>
              )}
            </div>
          )}
        </div>

        {showIOSGuide && !isInstalled && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-700 dark:bg-slate-950 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Phone Installation Steps:
            </p>
            <p className="mt-1">
              • <strong>Android (Chrome):</strong> Tap the 3-dot menu (⋮) in the top right, then tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            </p>
            <p className="mt-1">
              • <strong>iPhone (Safari):</strong> Tap the <strong>Share</strong> button at the bottom, scroll down, and tap <strong>Add to Home Screen</strong>.
            </p>
          </div>
        )}
      </section>

      {/* Data Backup & Reset */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Backup &amp; Data
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Your data is stored locally on this device. Export a backup anytime.
        </p>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <Download className="h-4 w-4" />
            Export All (CSV)
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <Download className="h-4 w-4" />
            Export Backup (JSON)
          </button>
          <button
            type="button"
            onClick={() => setConfirmDemo(true)}
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Load Demo Data
          </button>
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
            Clear All Data
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmDemo}
        title="Load sample duka data?"
        message="This will replace your current items, sales, and expenses with sample Kenyan shop records so you can test the app."
        confirmLabel="Load Demo Data"
        destructive={false}
        onCancel={() => setConfirmDemo(false)}
        onConfirm={() => {
          onLoadDemo();
          setConfirmDemo(false);
        }}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Clear all shop data?"
        message="This permanently deletes all sales, expenses, stock items, debts, and shop settings from this phone. Export a backup first if you need it."
        confirmLabel="Clear Everything"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          onClearAll();
          setConfirmClear(false);
        }}
      />
    </div>
  );
};
