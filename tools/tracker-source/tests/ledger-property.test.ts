import { describe, expect, it } from 'vitest';
import { ledgerCashEffect, ledgerPeriod, ledgerSummary } from '../src/domain/ledger';
import type { Account, LedgerTransaction } from '../src/domain/types';

/** Deterministic PRNG so any failing seed is reproducible. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const accounts: Account[] = [
  { id: 'bank', name: 'Bank', kind: 'bank', openingBalance: 5000.25, active: true, note: '' },
  { id: 'cash', name: 'Cash', kind: 'cash', openingBalance: 120.5, active: true, note: '' },
  { id: 'wallet', name: 'Wallet', kind: 'wallet', openingBalance: 0, active: true, note: '' },
  { id: 'friend', name: 'Money lent', kind: 'receivable', openingBalance: 0, active: true, note: '' },
  { id: 'fd', name: 'Fixed deposit', kind: 'fixed-deposit', openingBalance: 0, active: true, note: '' },
];
const liquid = ['bank', 'cash', 'wallet'];
const internal = ['transfer', 'lend', 'repayment-received', 'fd-deposit', 'fd-withdrawal'] as const;
// Month ends and month starts are deliberately over-represented to probe boundaries.
const dates = [
  '2026-01-31', '2026-02-01', '2026-02-28', '2026-03-01', '2026-03-15', '2026-03-31',
  '2026-04-01', '2026-04-30', '2026-05-01', '2026-12-31', '2027-01-01', '2028-02-29', '2028-03-01',
];
const paise = (r: () => number) => Math.round(r() * 99999 + 1) / 100;

function movement(r: () => number, id: string, kind: (typeof internal)[number]): LedgerTransaction {
  const pick = (list: string[]) => list[Math.floor(r() * list.length)]!;
  const route: Record<string, [string, string]> = {
    transfer: [pick(liquid), ''],
    lend: [pick(liquid), 'friend'],
    'repayment-received': ['friend', pick(liquid)],
    'fd-deposit': [pick(liquid), 'fd'],
    'fd-withdrawal': ['fd', pick(liquid)],
  };
  const [source, routed] = route[kind]!;
  const destination = kind === 'transfer' ? pick(liquid.filter((x) => x !== source)) : routed;
  return {
    id, kind, amount: paise(r), sourceAccountId: source, destinationAccountId: destination,
    date: pick(dates), description: '', note: '',
  };
}

function baseRows(r: () => number, count: number): LedgerTransaction[] {
  const rows: LedgerTransaction[] = [];
  for (let i = 0; i < count; i++) {
    const income = r() < 0.5;
    const account = liquid[Math.floor(r() * liquid.length)]!;
    rows.push({
      id: `base-${i}`, kind: income ? 'income' : 'expense', amount: paise(r),
      ...(income ? { destinationAccountId: account } : { sourceAccountId: account }),
      date: dates[Math.floor(r() * dates.length)]!, description: '', note: '',
    });
  }
  return rows;
}

const FAR = '2099-12-31';

describe('ledger property invariants (seeded)', () => {
  it('internal movements never change income, expenses or net worth', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const r = rng(seed);
      const base = baseRows(r, 1 + Math.floor(r() * 8));
      const moves = Array.from({ length: 1 + Math.floor(r() * 10) }, (_, i) =>
        movement(r, `move-${i}`, internal[Math.floor(r() * internal.length)]!));
      const before = ledgerSummary({ accounts, ledgerTransactions: base }, FAR);
      const after = ledgerSummary({ accounts, ledgerTransactions: [...base, ...moves] }, FAR);
      const ctx = `seed ${seed}`;
      expect(after.income, ctx).toBe(before.income);
      expect(after.expenses, ctx).toBe(before.expenses);
      expect(after.netWorth, ctx).toBe(before.netWorth);
      const periodBefore = ledgerPeriod({ accounts, ledgerTransactions: base }, '2000-01-01', FAR);
      const periodAfter = ledgerPeriod({ accounts, ledgerTransactions: [...base, ...moves] }, '2000-01-01', FAR);
      expect(periodAfter.income, ctx).toBe(periodBefore.income);
      expect(periodAfter.expenses, ctx).toBe(periodBefore.expenses);
    }
  });

  it('period totals and liquid cash effect are additive across month boundaries', () => {
    const splits: [string, string, string][] = [
      ['2026-01-01', '2026-01-31', '2026-02-01'],
      ['2026-02-01', '2026-02-28', '2026-03-01'],
      ['2027-12-01', '2027-12-31', '2028-01-01'],
      ['2028-02-01', '2028-02-29', '2028-03-01'],
    ];
    for (let seed = 1; seed <= 150; seed++) {
      const r = rng(seed * 7919);
      const rows = [
        ...baseRows(r, 1 + Math.floor(r() * 8)),
        ...Array.from({ length: Math.floor(r() * 8) }, (_, i) =>
          movement(r, `move-${i}`, internal[Math.floor(r() * internal.length)]!)),
      ];
      const plan = { accounts, ledgerTransactions: rows };
      for (const [start, firstEnd, secondStart] of splits) {
        const end = secondStart.slice(0, 7) === '2026-03' ? '2026-03-31' : '2028-03-31';
        const whole = ledgerPeriod(plan, start, end);
        const a = ledgerPeriod(plan, start, firstEnd);
        const b = ledgerPeriod(plan, secondStart, end);
        const ctx = `seed ${seed} ${start}..${end}`;
        expect(Math.round((a.income + b.income) * 100), ctx).toBe(Math.round(whole.income * 100));
        expect(Math.round((a.expenses + b.expenses) * 100), ctx).toBe(Math.round(whole.expenses * 100));
        expect(a.count + b.count, ctx).toBe(whole.count);
        const cashWhole = ledgerCashEffect(plan, start, end);
        const cashParts = ledgerCashEffect(plan, start, firstEnd) + ledgerCashEffect(plan, secondStart, end);
        expect(Math.round(cashParts * 100), ctx).toBe(Math.round(cashWhole * 100));
      }
    }
  });

  it('liquid cash effect equals income minus expenses plus principal flows into liquid accounts', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const r = rng(seed * 104729);
      const base = baseRows(r, 1 + Math.floor(r() * 8));
      const moves = Array.from({ length: Math.floor(r() * 8) }, (_, i) =>
        movement(r, `move-${i}`, internal[Math.floor(r() * internal.length)]!));
      const plan = { accounts, ledgerTransactions: [...base, ...moves] };
      let principalIn = 0;
      for (const m of moves) {
        const toLiquid = liquid.includes(m.destinationAccountId!);
        const fromLiquid = liquid.includes(m.sourceAccountId!);
        if (toLiquid && !fromLiquid) principalIn += m.amount;
        if (fromLiquid && !toLiquid) principalIn -= m.amount;
      }
      const period = ledgerPeriod(plan, '2000-01-01', FAR);
      const cash = ledgerCashEffect(plan, '2000-01-01', FAR);
      expect(Math.round(cash * 100), `seed ${seed}`)
        .toBe(Math.round((period.income - period.expenses + principalIn) * 100));
    }
  });
});
