import React, { useState } from 'react';
import { ArrowLeft, Delete, KeyRound, Lock } from 'lucide-react';
import type { Business, BusinessType } from '../types/duka';
import { verifyPinRecovery } from '../services/storage';
import { ConfirmDialog } from './ConfirmDialog';

const BUSINESS_TYPES: BusinessType[] = [
  'Retail shop',
  'Kiosk',
  'Hardware',
  'Salon',
  'Wholesale',
  'Other',
];

interface PinLockScreenProps {
  business: Business;
  onUnlock: () => void;
  onResetPin: (newPin: string) => void;
  onClearAll: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  business,
  onUnlock,
  onResetPin,
  onClearAll,
}) => {
  const [mode, setMode] = useState<'keypad' | 'recover' | 'reset'>('keypad');
  const [entered, setEntered] = useState('');
  const [error, setError] = useState('');

  // Recovery form state
  const [answer, setAnswer] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('Retail shop');
  const [recoverError, setRecoverError] = useState('');

  // Reset new PIN state
  const [newPin, setNewPin] = useState('');
  const [resetError, setResetError] = useState('');

  const [confirmErase, setConfirmErase] = useState(false);

  const hasCustomRecovery = Boolean((business.recoveryAnswer || '').trim());
  const [useDetailsFallback, setUseDetailsFallback] = useState(false);

  const handleDigit = (digit: string) => {
    if (entered.length >= 4) return;
    const next = entered + digit;
    setError('');
    setEntered(next);
    if (next.length === 4) {
      if (next === business.pin) {
        onUnlock();
      } else {
        setError('Wrong PIN. Try again.');
        setTimeout(() => setEntered(''), 220);
      }
    }
  };

  const handleBackspace = () => {
    setError('');
    setEntered((prev) => prev.slice(0, -1));
  };

  const handleVerifyRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    const checkingAnswer = hasCustomRecovery && !useDetailsFallback;
    const ok = checkingAnswer
      ? verifyPinRecovery(business, { answer })
      : verifyPinRecovery(business, { ownerName, businessType });

    if (!ok) {
      setRecoverError(
        checkingAnswer
          ? 'That recovery answer does not match. Please try again.'
          : 'Owner name or business type does not match your saved shop details.'
      );
      return;
    }

    setRecoverError('');
    setNewPin('');
    setResetError('');
    setMode('reset');
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPin.trim();
    if (clean && !/^\d{4}$/.test(clean)) {
      setResetError('Enter a 4-digit PIN, or leave empty to turn off PIN lock.');
      return;
    }
    setResetError('');
    onResetPin(clean);
    onUnlock();
  };

  if (mode === 'recover') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => {
              setRecoverError('');
              setMode('keypad');
            }}
            className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to PIN
          </button>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Reset Your PIN
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verify you own {business.name}
              </p>
            </div>
          </div>

          <form onSubmit={handleVerifyRecovery} className="mt-5 space-y-4" noValidate>
            {recoverError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
              >
                {recoverError}
              </div>
            )}

            {hasCustomRecovery && !useDetailsFallback ? (
              <div>
                <label
                  htmlFor="recover-answer"
                  className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  {business.recoveryQuestion || 'Security recovery answer'}
                </label>
                <input
                  id="recover-answer"
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Enter your recovery answer"
                  className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
                <button
                  type="button"
                  onClick={() => {
                    setRecoverError('');
                    setUseDetailsFallback(true);
                  }}
                  className="mt-2 min-h-[36px] text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  Verify using business details instead
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="recover-owner"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
                  >
                    Owner name
                  </label>
                  <input
                    id="recover-owner"
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Exact owner name saved in setup"
                    className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label
                    htmlFor="recover-type"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
                  >
                    Business type
                  </label>
                  <select
                    id="recover-type"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value as BusinessType)}
                    className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    {BUSINESS_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>
                {hasCustomRecovery && (
                  <button
                    type="button"
                    onClick={() => {
                      setRecoverError('');
                      setUseDetailsFallback(false);
                    }}
                    className="min-h-[36px] text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    Use recovery question instead
                  </button>
                )}
              </>
            )}

            <button
              type="submit"
              className="min-h-[48px] w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Verify &amp; Reset PIN
            </button>
          </form>

          <div className="mt-5 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Still locked out? You can erase this phone&apos;s data and start fresh.
            </p>
            <button
              type="button"
              onClick={() => setConfirmErase(true)}
              className="mt-2 min-h-[44px] px-3 text-xs font-semibold text-red-600 hover:underline dark:text-red-400"
            >
              Erase &amp; Start Fresh
            </button>
          </div>
        </div>

        <ConfirmDialog
          open={confirmErase}
          title="Erase all shop data?"
          message="This will delete all sales, expenses, stock, and debts on this phone so you can set up Tally Duka again."
          confirmLabel="Erase Everything"
          onCancel={() => setConfirmErase(false)}
          onConfirm={() => {
            setConfirmErase(false);
            onClearAll();
          }}
        />
      </div>
    );
  }

  if (mode === 'reset') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Set a New PIN
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Enter a new 4-digit PIN, or leave it empty to unlock without a PIN.
          </p>

          <form onSubmit={handleSaveNewPin} className="mt-5 space-y-4" noValidate>
            {resetError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
              >
                {resetError}
              </div>
            )}

            <div>
              <label
                htmlFor="reset-new-pin"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                New 4-digit PIN (optional)
              </label>
              <input
                id="reset-new-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4 digits or leave empty"
                className="font-num min-h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base tracking-widest placeholder:tracking-normal dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <button
              type="submit"
              className="min-h-[48px] w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Save New PIN &amp; Unlock
            </button>
            <button
              type="button"
              onClick={() => {
                onResetPin('');
                onUnlock();
              }}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Clear PIN &amp; Unlock Without PIN
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="w-full max-w-xs rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
          {business.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enter your 4-digit PIN to open
        </p>

        <div className="mt-5 flex justify-center gap-3" aria-label={`PIN digits entered: ${entered.length} of 4`}>
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-3.5 w-3.5 rounded-full border transition-colors ${
                idx < entered.length
                  ? 'border-emerald-600 bg-emerald-600'
                  : 'border-slate-300 bg-transparent dark:border-slate-700'
              }`}
            />
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-6 grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="font-num min-h-[54px] rounded-2xl border border-slate-200 bg-slate-50 text-lg font-semibold text-slate-900 transition-colors hover:bg-slate-100 active:bg-emerald-50 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="font-num min-h-[54px] rounded-2xl border border-slate-200 bg-slate-50 text-lg font-semibold text-slate-900 transition-colors hover:bg-slate-100 active:bg-emerald-50 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Delete last digit"
            className="flex min-h-[54px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setError('');
            setRecoverError('');
            setUseDetailsFallback(false);
            setMode('recover');
          }}
          className="mt-4 min-h-[44px] w-full text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
        >
          Forgot PIN?
        </button>
      </div>
    </div>
  );
};
