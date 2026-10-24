import type { Plan, InstallmentLoan } from './types';
import { addMonths, monthDay, validDate } from './dates';
import { round } from './calculate';

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

export function saveInstallmentPayment(
  p: Plan,
  loanId: string,
  rowId: string,
  date: string,
  amount: number,
  method = 'Not specified',
  receiptId?: string,
) {
  const loan = p.additionalLoans?.find((l) => l.id === loanId);
  const row = loan?.rows.find((r) => r.id === rowId);
  const category = p.categories.find((c) => c.loanId === loanId);
  if (!loan || !row || !category) throw Error('Loan installment was not found.');
  if (!validDate(date) || !Number.isFinite(amount) || amount <= 0)
    throw Error('Enter a valid payment date and amount.');
  const existing = receiptId
    ? p.entries.find((e) => e.id === receiptId && e.loanRowId === rowId)
    : undefined;
  if (receiptId && !existing) throw Error('Receipt was not found.');
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
    edited: true,
  });
}

export function saveOriginalPayment(
  p: Plan,
  rowId: string,
  date: string,
  amount: number,
  receiptId?: string,
) {
  const row = p.loan.rows.find((r) => r.id === rowId);
  const category = p.categories.find((c) => c.role === 'emi' && !c.loanId);
  if (!row || !category || row.paidBeforeOpening) throw Error('Choose an editable installment.');
  if (!validDate(date) || !Number.isFinite(amount) || amount <= 0)
    throw Error('Enter a valid payment date and positive amount.');
  const receipts = p.entries.filter((e) => e.loanRowId === rowId);
  const existing = receipts.find((e) => e.id === receiptId);
  if (receiptId && !existing) throw Error('Receipt was not found.');
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
    edited: true,
  });
}

/** Correct contractual dates without replacing installment IDs or payment receipts. */
export function correctInstallmentDates(
  p: Plan,
  loanId: string,
  firstDueDate: string,
  note: string,
) {
  if (!validDate(firstDueDate)) throw Error('Enter a valid first due date.');
  if (note.length > 4000) throw Error('Notes must be at most 4000 characters.');
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
      entry.description = entry.description.replace(oldDate, r.dueDate);
      if (oldNote) entry.notes = entry.notes.replace(oldNote, note);
    }
  });
  loan.firstDueDate = firstDueDate;
  loan.note = note;
  category.note = note;
  category.day = day;
  category.edited = true;
}
