import { describe, expect, it } from 'vitest';
import { financialFixture } from './fixtures/financial';
import {
  ledgerSummary,
  reverseLedgerTransaction,
  validateLedger,
} from '../src/domain/ledger';
import { cumulative } from '../src/domain/calculate';
import type { Account, LedgerTransaction } from '../src/domain/types';

const account = (
  id: string,
  kind: Account['kind'],
  openingBalance = 0,
): Account => ({
  id,
  name: id,
  kind,
  openingBalance,
  active: true,
  note: '',
});

const transfer = (
  id: string,
  date: string,
  amount: number,
  sourceAccountId: string,
  destinationAccountId: string,
  feeAmount = 0,
): LedgerTransaction => ({
  id,
  date,
  kind: 'transfer',
  amount,
  sourceAccountId,
  destinationAccountId,
  feeAmount,
  description: id,
  note: '',
});

const transferPlan = () => {
  const plan = financialFixture().data;
  plan.settings.reportDate = '2026-11-30';
  plan.settings.liveDate = false;
  plan.settings.opening = 1000;
  plan.entries = [];
  plan.accounts = [
    account('bank', 'bank', 700),
    account('wallet', 'wallet', 300),
    account('card', 'credit-card'),
  ];
  plan.ledgerTransactions = [];
  return plan;
};

describe('account-to-account transfers', () => {
  it('moves money between accounts without income, expense, or net-worth inflation', () => {
    const plan = transferPlan();
    const before = ledgerSummary(plan, '2026-11-30').netWorth;
    plan.ledgerTransactions = [
      transfer('bank-to-wallet', '2026-11-14', 125.5, 'bank', 'wallet'),
    ];

    const summary = ledgerSummary(plan, '2026-11-30');
    const totals = cumulative(plan);

    expect(summary.balances).toMatchObject({ bank: 574.5, wallet: 425.5 });
    expect(summary.income).toBe(0);
    expect(summary.expenses).toBe(0);
    expect(summary.netWorth).toBe(before);
    expect(totals.actual).toMatchObject({ income: 0, expenses: 0, savings: 0 });
    expect(totals.actualCash).toBe(1000);
  });

  it('records a transfer fee as an expense while keeping the principal internal', () => {
    const plan = transferPlan();
    const before = ledgerSummary(plan, '2026-11-30').netWorth;
    plan.ledgerTransactions = [
      transfer('bank-to-wallet-with-fee', '2026-11-14', 125.5, 'bank', 'wallet', 2.25),
    ];

    const summary = ledgerSummary(plan, '2026-11-30');
    const totals = cumulative(plan);

    expect(summary.balances).toMatchObject({ bank: 572.25, wallet: 425.5 });
    expect(summary.income).toBe(0);
    expect(summary.expenses).toBe(2.25);
    expect(summary.netWorth).toBe(before - 2.25);
    expect(totals.actual).toMatchObject({ income: 0, expenses: 2.25, savings: -2.25 });
    expect(totals.actualCash).toBe(997.75);
  });

  it('rejects missing, identical, or non-liquid transfer accounts', () => {
    const plan = transferPlan();
    const valid = transfer('valid', '2026-11-14', 10, 'bank', 'wallet');

    expect(() => validateLedger(plan.accounts!, [{ ...valid, destinationAccountId: undefined }])).toThrow(/both source and destination/);
    expect(() => validateLedger(plan.accounts!, [{ ...valid, destinationAccountId: 'bank' }])).toThrow(/differ/);
    expect(() => validateLedger(plan.accounts!, [{ ...valid, destinationAccountId: 'card' }])).toThrow(/correct type/);
  });

  it('reverses a transfer across a date boundary and restores both account balances', () => {
    const plan = transferPlan();
    plan.settings.reportDate = '2027-01-02';
    plan.settings.planEnd = '2027-01';
    const before = ledgerSummary(plan, '2027-01-02').netWorth;
    plan.ledgerTransactions = [
      transfer('year-end-transfer', '2026-12-31', 125.5, 'bank', 'wallet'),
    ];

    reverseLedgerTransaction(plan, 'year-end-transfer', '2027-01-01', 'Correcting the transfer');

    const summary = ledgerSummary(plan, '2027-01-02');
    expect(plan.ledgerTransactions).toHaveLength(2);
    expect(summary.balances).toMatchObject({ bank: 700, wallet: 300 });
    expect(summary.income).toBe(0);
    expect(summary.expenses).toBe(0);
    expect(summary.netWorth).toBe(before);
    expect(plan.ledgerTransactions?.[1]).toMatchObject({
      kind: 'reversal',
      reversalOfId: 'year-end-transfer',
      amount: 125.5,
    });
  });
});
