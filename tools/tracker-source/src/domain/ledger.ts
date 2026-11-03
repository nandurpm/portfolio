import type { Account, LedgerTransaction, Plan } from './types';
import { round } from './calculate';

const cents = (value: number) => {
  if (!Number.isFinite(value) || value < 0 || value > 1e12)
    throw Error('Use a valid non-negative amount.');
  if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-6)
    throw Error('Use at most two decimal places.');
  return Math.round(value * 100);
};
const money = (value: number) => value / 100;

export interface LedgerSummary {
  balances: Record<string, number>;
  income: number;
  expenses: number;
  assets: number;
  liabilities: number;
  netWorth: number;
  receivables: number;
  investments: number;
}

export function validateLedger(accounts: Account[], transactions: LedgerTransaction[]) {
  const accountIds = new Set(accounts.map((account) => account.id));
  if (accountIds.size !== accounts.length) throw Error('Account IDs must be unique.');
  if (new Set(accounts.map((account) => account.name.trim().toLowerCase())).size !== accounts.length)
    throw Error('Account names must be unique.');
  if (new Set(transactions.map((transaction) => transaction.id)).size !== transactions.length)
    throw Error('Ledger transaction IDs must be unique.');
  const ids = new Set(transactions.map((transaction) => transaction.id));
  const requiresBoth = new Set<LedgerTransaction['kind']>([
    'transfer', 'lend', 'repayment-received', 'borrow', 'principal-repayment',
    'fd-deposit', 'fd-withdrawal', 'investment-deposit', 'investment-withdrawal',
    'credit-card-payment',
  ]);
  for (const transaction of transactions) {
    cents(transaction.amount);
    cents(transaction.interestAmount ?? 0);
    cents(transaction.feeAmount ?? 0);
    if (transaction.amount <= 0) throw Error('Ledger amounts must be positive.');
    for (const id of [transaction.sourceAccountId, transaction.destinationAccountId])
      if (id && !accountIds.has(id)) throw Error('A ledger transaction refers to a missing account.');
    if (transaction.sourceAccountId && transaction.sourceAccountId === transaction.destinationAccountId)
      throw Error('Source and destination accounts must differ.');
    if (requiresBoth.has(transaction.kind) &&
        (!transaction.sourceAccountId || !transaction.destinationAccountId))
      throw Error('This transaction needs both source and destination accounts.');
    if (transaction.kind === 'income' && !transaction.destinationAccountId)
      throw Error('Income needs a destination account.');
    if (['expense', 'shopping'].includes(transaction.kind) && !transaction.sourceAccountId)
      throw Error('An expense needs a source account.');
    if (transaction.kind === 'credit-card-purchase' && !transaction.destinationAccountId)
      throw Error('A credit-card purchase needs a card liability account.');
    if (transaction.kind === 'refund') {
      if (!transaction.destinationAccountId || !transaction.originalTransactionId ||
          !ids.has(transaction.originalTransactionId))
        throw Error('A refund needs its destination and original purchase.');
      const original = transactions.find((row) => row.id === transaction.originalTransactionId)!;
      if (!['shopping', 'expense', 'credit-card-purchase'].includes(original.kind))
        throw Error('Refunds can only reverse a purchase or expense.');
      const refunded = transactions
        .filter((row) => row.kind === 'refund' && row.originalTransactionId === original.id)
        .reduce((sum, row) => sum + cents(row.amount), 0);
      if (refunded > cents(original.amount)) throw Error('Refunds cannot exceed the original purchase.');
    }
  }
}

export function ledgerSummary(plan: Pick<Plan, 'accounts' | 'ledgerTransactions'>): LedgerSummary {
  const accounts = plan.accounts ?? [], transactions = plan.ledgerTransactions ?? [];
  validateLedger(accounts, transactions);
  const balances = new Map(accounts.map((account) => [account.id, cents(Math.abs(account.openingBalance)) *
    (account.openingBalance < 0 ? -1 : 1)]));
  let income = 0, expenses = 0;
  const add = (id: string | undefined, value: number) => {
    if (id) balances.set(id, (balances.get(id) ?? 0) + value);
  };
  for (const row of transactions) {
    const amount = cents(row.amount), interest = cents(row.interestAmount ?? 0),
      fee = cents(row.feeAmount ?? 0);
    switch (row.kind) {
      case 'income': add(row.destinationAccountId, amount); income += amount; break;
      case 'expense': case 'shopping':
        add(row.sourceAccountId, -amount); expenses += amount; break;
      case 'refund':
        add(row.destinationAccountId, amount); expenses -= amount; break;
      case 'credit-card-purchase':
        add(row.destinationAccountId, -amount); expenses += amount; break;
      case 'borrow':
        add(row.sourceAccountId, -amount); add(row.destinationAccountId, amount); break;
      case 'principal-repayment':
        add(row.sourceAccountId, -(amount + interest + fee));
        add(row.destinationAccountId, amount); expenses += interest + fee; break;
      case 'fd-withdrawal': case 'investment-withdrawal':
        add(row.sourceAccountId, -amount); add(row.destinationAccountId, amount + interest);
        income += interest; break;
      default:
        add(row.sourceAccountId, -(amount + fee));
        add(row.destinationAccountId, amount);
        expenses += fee;
    }
  }
  const byKind = (kinds: Account['kind'][]) => accounts
    .filter((account) => kinds.includes(account.kind))
    .reduce((sum, account) => sum + (balances.get(account.id) ?? 0), 0);
  const assets = byKind(['cash', 'bank', 'wallet', 'receivable', 'fixed-deposit', 'investment']);
  const liabilities = -byKind(['credit-card', 'liability']);
  return {
    balances: Object.fromEntries([...balances].map(([id, value]) => [id, money(value)])),
    income: money(income), expenses: money(expenses),
    assets: money(assets), liabilities: money(liabilities),
    netWorth: money(assets - liabilities),
    receivables: money(byKind(['receivable'])),
    investments: money(byKind(['fixed-deposit', 'investment'])),
  };
}

export const ledgerSavings = (plan: Pick<Plan, 'accounts' | 'ledgerTransactions'>) => {
  const summary = ledgerSummary(plan);
  return round(summary.income - summary.expenses);
};
