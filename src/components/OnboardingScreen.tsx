import React, { useState } from 'react';
import { Store, Sparkles } from 'lucide-react';
import type { Business, BusinessType } from '../types/duka';

const BUSINESS_TYPES: BusinessType[] = [
  'Retail shop',
  'Kiosk',
  'Hardware',
  'Salon',
  'Wholesale',
  'Other',
];

interface OnboardingScreenProps {
  onComplete: (business: Business) => void;
  onLoadDemo: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
  onLoadDemo,
}) => {
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [type, setType] = useState<BusinessType>('Retail shop');
  const [pin, setPin] = useState('');
  const [recoveryQuestion, setRecoveryQuestion] = useState('What is your favorite place or childhood nickname?');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanOwner = owner.trim();
    const cleanPin = pin.trim();
    const cleanAnswer = recoveryAnswer.trim();

    if (!cleanName) {
      setError('Please enter your shop or business name.');
      return;
    }
    if (!cleanOwner) {
      setError('Please enter the owner name.');
      return;
    }
    if (cleanPin && !/^\d{4}$/.test(cleanPin)) {
      setError('Your PIN must be 4 numbers (or leave it empty to skip).');
      return;
    }

    setError('');
    onComplete({
      name: cleanName,
      owner: cleanOwner,
      type,
      pin: cleanPin,
      recoveryQuestion: cleanPin && cleanAnswer ? recoveryQuestion.trim() || 'Recovery question' : '',
      recoveryAnswer: cleanPin ? cleanAnswer : '',
    });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Welcome to Tally Duka
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Simple shop books &amp; stock on your phone
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="onboard-business-name"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Business name
            </label>
            <input
              id="onboard-business-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Neema Corner Duka"
              className="min-h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="onboard-owner-name"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Owner name
            </label>
            <input
              id="onboard-owner-name"
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="e.g. Amina Mwangi"
              className="min-h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="onboard-business-type"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Business type
            </label>
            <select
              id="onboard-business-type"
              value={type}
              onChange={(e) => setType(e.target.value as BusinessType)}
              className="min-h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {BUSINESS_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="onboard-pin"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              4-digit PIN lock (optional)
            </label>
            <input
              id="onboard-pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Leave empty for no PIN"
              className="font-num min-h-[46px] w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base tracking-widest text-slate-900 placeholder:tracking-normal placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              All your records stay safely on this phone and work offline.
            </p>
          </div>

          {pin.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <div>
                <label
                  htmlFor="onboard-recovery-q"
                  className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200"
                >
                  PIN recovery question (in case you forget PIN)
                </label>
                <input
                  id="onboard-recovery-q"
                  type="text"
                  value={recoveryQuestion}
                  onChange={(e) => setRecoveryQuestion(e.target.value)}
                  className="min-h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
              <div>
                <label
                  htmlFor="onboard-recovery-a"
                  className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-200"
                >
                  Recovery answer (optional)
                </label>
                <input
                  id="onboard-recovery-a"
                  type="text"
                  value={recoveryAnswer}
                  onChange={(e) => setRecoveryAnswer(e.target.value)}
                  placeholder="e.g. Nakuru"
                  className="min-h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="min-h-[48px] w-full rounded-xl bg-emerald-700 px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-800 active:scale-[0.99]"
          >
            Start My Shop Books
          </button>
        </form>

        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onLoadDemo}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Try with sample shop data
          </button>
        </div>
      </div>
    </div>
  );
};
