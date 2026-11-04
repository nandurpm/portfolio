import type { Plan } from './types';

/** Amounts are INR, stored to paise precision. Leave unchanged legacy imports
 * readable: reject only values introduced or edited in a user transaction. */
export function isPaise(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value - Math.round(value * 100) / 100) <= Number.EPSILON * Math.max(0.01, Math.abs(value)) * 2;
}

function changedAmount(before: unknown, after: unknown, field: string) {
  if (typeof after === 'number' && after !== before && !isPaise(after))
    throw Error(`Use at most two decimal places for ${field}.`);
}

function checkFields<T extends object>(a: T | undefined, b: T | undefined, keys: readonly (keyof T)[], context: string) {
  if (!b) return;
  for (const key of keys) changedAmount(a?.[key], b[key], `${context} ${String(key)}`);
}

function checkRows<T extends { id: string }>(a: T[] | undefined, b: T[] | undefined, keys: readonly (keyof T)[], context: string) {
  const old = new Map((a ?? []).map(row => [row.id, row]));
  for (const row of b ?? []) checkFields(old.get(row.id), row, keys, context);
}

/** Apply to user-originating store changes, not backup restore/cloud migration,
 * undo or redo. Older backups remain readable without silently altering data. */
export function assertEditedMoneyPrecision(before: Plan, after: Plan) {
  checkFields(before.settings, after.settings, [
    'opening', 'salary31', 'salaryShort', 'raisedSalary', 'lenderQuote',
    'accruedInterest', 'fees', 'cushion',
  ], 'settings');
  checkFields(before.loan, after.loan, ['principal', 'regularEmi', 'firstEmi', 'firstInterest'], 'original loan');
  checkRows(before.loan.rows, after.loan.rows, ['emi', 'principal', 'interest', 'balance', 'paidAmount'], 'loan schedule');
  checkRows(before.accounts, after.accounts, ['openingBalance', 'creditLimit'], 'account');
  checkRows(before.ledgerTransactions, after.ledgerTransactions, ['amount', 'interestAmount', 'feeAmount'], 'ledger transaction');
  checkRows(before.entries, after.entries, ['amount'], 'transaction');
  checkRows(before.categories, after.categories, ['amount'], 'category');
  checkRows(before.salaryChanges, after.salaryChanges, ['monthlySalary', 'monthlyPfContribution'], 'salary history');
  checkRows(before.pfMovements, after.pfMovements, ['amount'], 'PF movement');
  checkRows(before.reconciliations, after.reconciliations, ['openingBalance', 'statementBalance'], 'reconciliation');
  checkRows(before.provisions, after.provisions, ['monthlyAmount', 'billAmount', 'openingReserve'], 'provision');
  const loanBefore = new Map((before.additionalLoans ?? []).map(row => [row.id, row]));
  for (const loan of after.additionalLoans ?? []) {
    const old = loanBefore.get(loan.id);
    checkFields(old, loan, ['principal', 'monthlyEmi'], 'additional loan');
    checkRows(old?.rows, loan.rows, ['emi', 'paidAmount'], 'additional loan payment');
  }
  for (const [key, value] of Object.entries(after.overrides))
    changedAmount(before.overrides[key], value, 'monthly budget override');
}
