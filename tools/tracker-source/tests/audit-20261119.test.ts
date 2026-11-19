import { describe, expect, it } from 'vitest';
import { financialFixture } from './fixtures/financial';
import { freshPlan } from '../src/domain/defaults';
import { fullAmount, planned, key } from '../src/domain/calculate';
import { netWorthSnapshot } from '../src/domain/net-worth';
import { reverseLedgerTransaction } from '../src/domain/ledger';
import { roundMoney } from '../src/domain/round-money';
import type { Plan } from '../src/domain/types';

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

function ledgerPlan(): Plan {
  const p = financialFixture().data;
  Object.assign(p.settings, { planStart: '2028-01', planEnd: '2028-04', reportDate: '2028-03-31', liveDate: false });
  p.accounts = [
    { id: 'bank', name: 'Bank', kind: 'bank', openingBalance: 1000.1, active: true, note: '' },
    { id: 'cash', name: 'Cash', kind: 'cash', openingBalance: 0.2, active: true, note: '' },
  ];
  p.ledgerTransactions = [];
  return p;
}

describe('net worth snapshot (audit 2026-11-19)', () => {
  it('returns namedCash at exact paise precision (0.1 + 0.2 style drift)', () => {
    const p = ledgerPlan();
    expect(netWorthSnapshot(p, '2028-03-31').namedCash).toBe(1000.3);
  });

  it('never returns unrounded namedCash across random paise data', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const r = rng(seed), paise = () => Math.round(r() * 99999 + 1) / 100;
      const p = ledgerPlan();
      p.accounts![0]!.openingBalance = paise();
      p.accounts![1]!.openingBalance = paise();
      p.ledgerTransactions!.push({
        id: 't', kind: 'transfer', date: '2028-02-29', amount: paise(),
        sourceAccountId: 'bank', destinationAccountId: 'cash', description: '', note: '',
      });
      const v = netWorthSnapshot(p, '2028-03-31').namedCash;
      expect(v).toBe(roundMoney(v));
    }
  });

  it.each(['2028-02-29', '2028-03-01', '2028-03-31'])('keeps net worth unchanged by an internal transfer on %s', (date) => {
    const p = ledgerPlan();
    const before = netWorthSnapshot(p, '2028-03-31').netWorth;
    p.ledgerTransactions!.push({ id: 't1', kind: 'transfer', date, amount: 333.33, sourceAccountId: 'bank', destinationAccountId: 'cash', description: '', note: '' });
    expect(netWorthSnapshot(p, '2028-03-31').netWorth).toBe(before);
  });

  it('reduces net worth by exactly the transfer fee, and a reversal restores it', () => {
    const p = ledgerPlan();
    const before = netWorthSnapshot(p, '2028-03-31').netWorth;
    p.ledgerTransactions!.push({ id: 't1', kind: 'transfer', date: '2028-03-01', amount: 100, feeAmount: 2.35, sourceAccountId: 'bank', destinationAccountId: 'cash', description: '', note: '' });
    expect(roundMoney(before - netWorthSnapshot(p, '2028-03-31').netWorth)).toBe(2.35);
    reverseLedgerTransaction(p, 't1', '2028-03-02', 'undo');
    expect(netWorthSnapshot(p, '2028-03-31').netWorth).toBe(before);
  });
});

/**
 * Characterises the CURRENT budget model for a category split (e.g. one combined category
 * replaced by two from a given month). Categories have a flat amount with no effective date.
 * These tests document that limitation and the only supported workaround (explicit per-month
 * overrides). They intentionally use generic synthetic ids, not personal category names.
 */
describe('category split without date-effective categories (documented limitation)', () => {
  function splitPlan() {
    const p = freshPlan();
    p.settings.planStart = '2026-01';
    p.settings.planEnd = '2027-03';
    const old = { id: 'combined', name: 'Combined', group: 'Living' as const, role: 'regular' as const, amount: 500, timing: 'Fixed day' as const, day: 1, months: [] as number[], active: true, note: '' };
    p.categories.push(old);
    const a = p.categories.find((c) => c.id === 'tea-snacks')!;
    const b = p.categories.find((c) => c.id === 'travel')!;
    p.overrides[key('2026-11', 'combined')] = 498.75;
    return { p, old, a, b };
  }

  it('a flat edit changes every past month (limitation)', () => {
    const { p, a, b } = splitPlan();
    a.amount = 350; b.amount = 150;
    expect(planned(p, '2026-10').living).toBe(1000);
    expect(planned(p, '2026-11').living).toBe(998.75);
  });

  it('deactivating the old category drops its saved override for history (limitation)', () => {
    const { p, old } = splitPlan();
    old.active = false;
    expect(fullAmount(p, old, '2026-11')).toBe(0);
  });

  it('months selects a recurring month of year, not an effective start date (limitation)', () => {
    const { p, a } = splitPlan();
    a.amount = 350; a.months = [12];
    expect(fullAmount(p, a, '2026-12')).toBe(350);
    expect(fullAmount(p, a, '2027-12')).toBe(350);
    expect(fullAmount(p, a, '2027-01')).toBe(0);
  });

  it('explicit per-month overrides reconcile history and the future', () => {
    const { p, old, a, b } = splitPlan();
    a.amount = 350; b.amount = 150; old.amount = 0;
    for (const m of ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']) {
      p.overrides[key(m, 'tea-snacks')] = 0;
      p.overrides[key(m, 'travel')] = 0;
      if (m !== '2026-11') p.overrides[key(m, 'combined')] = 500;
    }
    expect(planned(p, '2026-10').living).toBe(500);
    expect(planned(p, '2026-11').living).toBe(498.75);
    expect(planned(p, '2026-12').living).toBe(500);
    expect(planned(p, '2027-03').living).toBe(500);
  });
});
