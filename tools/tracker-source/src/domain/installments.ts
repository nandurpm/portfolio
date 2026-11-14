import type { Plan, InstallmentLoan } from './types';
import { addMonths, monthDay, validDate } from './dates';
import { round } from './calculate';
import { isPaise } from './money-precision';
import { liquidKinds } from './ledger';

function validatePaymentAccount(p: Plan, accountId: string) {
  if (accountId === '__unallocated') return undefined;
  const account = p.accounts?.find((item) => item.id === accountId && item.active);
  if (!account || !liquidKinds.includes(account.kind))
    throw Error('Choose an active cash, bank or wallet account, or explicitly select Unallocated cash.');
  return account.id;
}

export function addInstallmentLoan(p: Plan, input: Omit<InstallmentLoan, 'id' | 'rows'>) {
  const name = input.name.trim();
  if (!name || name.length > 100) throw Error('Enter a loan name (up to 100 characters).');
  if (p.categories.some((c) => c.name.toLowerCase() === name.toLowerCase()))
    throw Error('Use a unique loan name.');
  if (
    !Number.isFinite(input.principal) ||
    input.principal <= 0 ||
    !Number.isFinite(input.monthlyEmi) ||
    input.monthlyEmi <= 0
  )
    throw Error('Enter positive amounts.');
  if (!Number.isInteger(input.tenure) || input.tenure < 1 || input.tenure > 600)
    throw Error('Use 1 to 600 monthly installments.');
  if (!validDate(input.firstDueDate)) throw Error('Enter a valid first due date.');
  if (input.plannedPayDay !== undefined && (!Number.isInteger(input.plannedPayDay) || input.plannedPayDay < 1 || input.plannedPayDay > 31))
    throw Error('The planned payment day must be between 1 and 31.');
  if (!isPaise(input.principal) || !isPaise(input.monthlyEmi))
    throw Error('Use at most two decimal places for loan amounts.');
  if (round(input.monthlyEmi * input.tenure) < input.principal)
    throw Error('Total repayments cannot be less than the financed amount.');
  const id = crypto.randomUUID(),
    day = Number(input.firstDueDate.slice(8));
  const loan: InstallmentLoan = {
    ...input,
    name,
    id,
    rows: Array.from({ length: input.tenure }, (_, i) => {
      const month = addMonths(input.firstDueDate.slice(0, 7), i);
      return {
        id: `${id}-${i + 1}`,
        month,
        dueDate: monthDay(month, day),
        emi: round(input.monthlyEmi),
        paid: false,
        paidBeforeOpening: false,
        paidAmount: 0,
        paidDate: '',
      };
    }),
  };
  (p.additionalLoans ??= []).push(loan);
  p.categories.push({
    id: `emi-${id}`,
    loanId: id,
    name,
    group: 'Debt',
    amount: 0,
    timing: 'Fixed day',
    day,
    months: [],
    active: true,
    role: 'emi',
    note: input.note,
  });
  return loan;
}

/** Return the sole linked receipt for safe in-place editing; multiple receipts require an explicit choice. */
export function singleInstallmentReceipt<T extends { loanRowId?: string }>(entries: T[], rowId: string): T | undefined {
  const receipts = entries.filter((entry) => entry.loanRowId === rowId);
  return receipts.length === 1 ? receipts[0] : undefined;
}

export function saveInstallmentPayment(
  p: Plan,
  loanId: string,
  rowId: string,
  date: string,
  amount: number,
  accountId: string,
  method = 'Not specified',
  receiptId?: string,
) {
  const loan = p.additionalLoans?.find((l) => l.id === loanId);
  const row = loan?.rows.find((r) => r.id === rowId);
  const category = p.categories.find((c) => c.loanId === loanId);
  if (!loan || !row || !category) throw Error('Loan installment was not found.');
  if (!validDate(date) || !Number.isFinite(amount) || amount <= 0)
    throw Error('Enter a valid payment date and amount.');
  const selectedAccountId = validatePaymentAccount(p, accountId);
  const existing = receiptId
    ? p.entries.find((e) => e.id === receiptId && e.loanRowId === rowId)
    : undefined;
  if (receiptId && !existing) throw Error('Receipt was not found.');
  if (!isPaise(amount) && existing?.amount !== amount) throw Error('Use at most two decimal places for payments.');
  const receipts = p.entries.filter((e) => e.loanRowId === rowId);
  if (row.paidAmount && !receipts.length)
    throw Error(
      'This imported payment has no linked receipt. Reconcile its schedule and actual entries before adding a payment.',
    );
  const otherPaid = receipts
    .filter((e) => e.id !== existing?.id)
    .reduce((sum, e) => sum + e.amount, 0);
  if (round(otherPaid + amount) > row.emi)
    throw Error('Combined payments cannot exceed this installment.');
  if (existing) p.entries = p.entries.filter((e) => e.id !== existing.id);
  p.entries.push({
    id: existing?.id ?? crypto.randomUUID(),
    date,
    amount,
    categoryId: category.id,
    description: `${loan.name} — installment due ${row.dueDate}`,
    payment: method,
    notes: `Financed amount ${loan.principal}; ${loan.tenure} installments of ${loan.monthlyEmi}. ${loan.note}`,
    loanRowId: rowId,
    accountId: selectedAccountId,
    edited: true,
  });
}

export function saveOriginalPayment(
  p: Plan,
  rowId: string,
  date: string,
  amount: number,
  accountId: string,
  receiptId?: string,
) {
  const row = p.loan.rows.find((r) => r.id === rowId);
  const category = p.categories.find((c) => c.role === 'emi' && !c.loanId);
  if (!row || !category || row.paidBeforeOpening) throw Error('Choose an editable installment.');
  if (!validDate(date) || !Number.isFinite(amount) || amount <= 0)
    throw Error('Enter a valid payment date and positive amount.');
  const selectedAccountId = validatePaymentAccount(p, accountId);
  const receipts = p.entries.filter((e) => e.loanRowId === rowId);
  const existing = receipts.find((e) => e.id === receiptId);
  if (receiptId && !existing) throw Error('Receipt was not found.');
  if (!isPaise(amount) && existing?.amount !== amount) throw Error('Use at most two decimal places for payments.');
  if (row.paidAmount && !receipts.length)
    throw Error(
      'This imported schedule payment has no receipt. Reconcile it before recording another payment.',
    );
  const other = receipts.filter((e) => e.id !== receiptId).reduce((sum, e) => sum + e.amount, 0);
  if (round(other + amount) > row.emi)
    throw Error(
      'Combined payments cannot exceed this installment. Record loan prepayments separately.',
    );
  if (existing) p.entries = p.entries.filter((e) => e.id !== receiptId);
  p.entries.push({
    id: existing?.id ?? crypto.randomUUID(),
    date,
    amount,
    categoryId: category.id,
    description: `EMI due ${row.dueDate}`,
    payment: existing?.payment ?? 'Bank',
    notes: existing?.notes ?? 'Linked to loan schedule',
    loanRowId: rowId,
    accountId: selectedAccountId,
    edited: true,
  });
}

/** Correct contractual dates without replacing installment IDs or payment receipts. */
export function correctInstallmentDates(
  p: Plan,
  loanId: string,
  firstDueDate: string,
  note: string,
  plannedPayDay?: number,
) {
  if (!validDate(firstDueDate)) throw Error('Enter a valid first due date.');
  if (note.length > 4000) throw Error('Notes must be at most 4000 characters.');
  if (plannedPayDay !== undefined && (!Number.isInteger(plannedPayDay) || plannedPayDay < 1 || plannedPayDay > 31))
    throw Error('The planned payment day must be between 1 and 31.');
  const loan = p.additionalLoans?.find((l) => l.id === loanId);
  const category = p.categories.find((c) => c.loanId === loanId);
  if (!loan || !category) throw Error('Loan was not found.');
  const oldNote = loan.note;
  const day = Number(firstDueDate.slice(8));
  loan.rows.forEach((r, i) => {
    const oldDate = r.dueDate;
    r.month = addMonths(firstDueDate.slice(0, 7), i);
    r.dueDate = monthDay(r.month, day);
    for (const entry of p.entries.filter((e) => e.loanRowId === r.id)) {
      entry.description = entry.description.replace(oldDate, () => r.dueDate);
      // Function replacer: user text must never be parsed as a $-replacement pattern ($$, $&, $`, $').
      if (oldNote) entry.notes = entry.notes.replace(oldNote, () => note);
    }
  });
  loan.firstDueDate = firstDueDate;
  if (plannedPayDay === undefined) delete loan.plannedPayDay;
  else loan.plannedPayDay = plannedPayDay;
  loan.note = note;
  category.note = note;
  category.day = day;
  category.edited = true;
}

/** Import a lender's contractual allocation without creating a payment or cash movement. */
export function applyLenderSchedule(p: Plan, loanId: string, text: string) {
  const loan = p.additionalLoans?.find(l => l.id === loanId);
  if (!loan) throw Error('Loan not found.');
  const input = text.trim().split(/\r?\n/).filter(Boolean).map(line => line.trim().split(/[,;\t]/).map(v => v.trim()));
  if (input.length !== loan.rows.length) throw Error('Provide one date, principal and interest row for every installment.');
  let balance = loan.principal;
  const rows = input.map((parts, i) => {
    const [dueDate, rawPrincipal, rawInterest] = parts;
    const principal = Number(rawPrincipal), interest = Number(rawInterest), old = loan.rows[i]!;
    if (parts.length !== 3 || !dueDate || !validDate(dueDate) || !rawPrincipal || !rawInterest || !Number.isFinite(principal) || !Number.isFinite(interest) || principal < 0 || interest < 0 || !isPaise(principal) || !isPaise(interest) || (i > 0 && dueDate <= input[i-1]![0]!)) throw Error('Use ascending YYYY-MM-DD, principal, interest rows with nonnegative two-decimal amounts.');
    const emi = round(principal + interest);
    if (emi <= 0 || principal > balance || old.paidAmount > emi || (old.paidAmount > 0 && old.dueDate !== dueDate)) throw Error('Schedule conflicts with principal or existing payments. Correct receipts before changing paid installment dates.');
    balance = round(balance - principal);
    return {...old, dueDate, month: dueDate.slice(0,7), principal, interest, balance, emi};
  });
  if (balance !== 0) throw Error('Scheduled principal must total the financed principal exactly.');
  loan.rows = rows;
  loan.firstDueDate = rows[0]!.dueDate;
  loan.monthlyEmi = rows[0]!.emi;
}
