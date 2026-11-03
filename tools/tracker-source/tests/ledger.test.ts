import { describe, expect, it } from 'vitest';
import { ledgerSummary, validateLedger } from '../src/domain/ledger';
import type { Account, LedgerTransaction } from '../src/domain/types';

const accounts: Account[] = [
  { id: 'bank', name: 'Bank', kind: 'bank', openingBalance: 1000, active: true, note: '' },
  { id: 'cash', name: 'Cash', kind: 'cash', openingBalance: 0, active: true, note: '' },
  { id: 'friend', name: 'Money lent', kind: 'receivable', openingBalance: 0, active: true, note: '' },
  { id: 'card', name: 'Credit card', kind: 'credit-card', openingBalance: 0, active: true, note: '' },
  { id: 'fd', name: 'Fixed deposit', kind: 'fixed-deposit', openingBalance: 0, active: true, note: '' },
  { id: 'loan', name: 'Borrowed money', kind: 'liability', openingBalance: 0, active: true, note: '' },
];
const row = (value: Partial<LedgerTransaction> & Pick<LedgerTransaction, 'id' | 'kind' | 'amount'>):
  LedgerTransaction => ({ date: '2026-11-03', description: '', note: '', ...value });

describe('double-entry account ledger', () => {
  it('keeps transfers, lending, borrowing, FD principal and card payments outside income/expenses', () => {
    const ledgerTransactions: LedgerTransaction[] = [
      row({ id: 'salary', kind: 'income', amount: 500, destinationAccountId: 'bank' }),
      row({ id: 'transfer', kind: 'transfer', amount: 100, sourceAccountId: 'bank', destinationAccountId: 'cash' }),
      row({ id: 'lend', kind: 'lend', amount: 200, sourceAccountId: 'bank', destinationAccountId: 'friend' }),
      row({ id: 'repay', kind: 'repayment-received', amount: 50, sourceAccountId: 'friend', destinationAccountId: 'bank' }),
      row({ id: 'fd', kind: 'fd-deposit', amount: 300, sourceAccountId: 'bank', destinationAccountId: 'fd' }),
      row({ id: 'mature', kind: 'fd-withdrawal', amount: 300, interestAmount: 15, sourceAccountId: 'fd', destinationAccountId: 'bank' }),
      row({ id: 'buy', kind: 'credit-card-purchase', amount: 120, destinationAccountId: 'card' }),
      row({ id: 'card-pay', kind: 'credit-card-payment', amount: 120, sourceAccountId: 'bank', destinationAccountId: 'card' }),
      row({ id: 'borrow', kind: 'borrow', amount: 400, sourceAccountId: 'loan', destinationAccountId: 'bank' }),
      row({ id: 'principal', kind: 'principal-repayment', amount: 100, interestAmount: 10, sourceAccountId: 'bank', destinationAccountId: 'loan' }),
    ];
    const summary = ledgerSummary({ accounts, ledgerTransactions });
    expect(summary.income).toBe(515);
    expect(summary.expenses).toBe(130);
    expect(summary.receivables).toBe(150);
    expect(summary.liabilities).toBe(300);
    expect(summary.balances.card).toBe(0);
    expect(summary.balances.fd).toBe(0);
    expect(summary.netWorth).toBe(1385);
  });

  it('reverses purchases with bounded linked refunds and rejects malformed movements', () => {
    const purchase = row({ id: 'purchase', kind: 'shopping', amount: 200, sourceAccountId: 'bank' });
    const refund = row({ id: 'refund', kind: 'refund', amount: 80, destinationAccountId: 'bank', originalTransactionId: 'purchase' });
    expect(ledgerSummary({ accounts, ledgerTransactions: [purchase, refund] }).expenses).toBe(120);
    expect(() => validateLedger(accounts, [purchase, { ...refund, amount: 201 }])).toThrow(/exceed/);
    expect(() => validateLedger(accounts, [row({ id: 'bad', kind: 'transfer', amount: 1, sourceAccountId: 'bank' })])).toThrow(/both/);
  });

  it('uses integer cents and rejects fractional cents', () => {
    expect(() => validateLedger(accounts, [row({ id: 'bad', kind: 'income', amount: 0.001, destinationAccountId: 'bank' })])).toThrow(/two decimal/);
  });
});
