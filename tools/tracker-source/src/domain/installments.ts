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
) {
  const loan = p.additionalLoans?.find((l) => l.id === loanId);
  const row = loan?.rows.find((r) => r.id === rowId);
  const category = p.categories.find((c) => c.loanId === loanId);
  if (!loan || !row || !category) throw Error('Loan installment was not found.');
  if (!validDate(date) || !Number.isFinite(amount) || amount <= 0)
    throw Error('Enter a valid payment date and amount.');
  if (amount > row.emi) throw Error('Payment cannot exceed this installment.');
  const existing = p.entries.find((e) => e.loanRowId === rowId);
  p.entries = p.entries.filter((e) => e.loanRowId !== rowId);
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
