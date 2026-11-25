import React, { useState } from 'react';
import { Delete, Lock } from 'lucide-react';

interface PinLockScreenProps {
  businessName: string;
  expectedPin: string;
  onUnlock: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  businessName,
  expectedPin,
  onUnlock,
}) => {
  const [entered, setEntered] = useState('');
  const [error, setError] = useState('');

  const handleDigit = (digit: string) => {
    if (entered.length >= 4) return;
    const next = entered + digit;
    setError('');
    setEntered(next);
    if (next.length === 4) {
      if (next === expectedPin) {
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

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="w-full max-w-xs rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
          {businessName}
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
      </div>
    </div>
  );
};
