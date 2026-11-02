import type { InstallmentRow, LoanRow } from './types';

/** Missing receipts are not evidence that a lender has not been paid. */
export function paymentDisplayStatus(
  row: Pick<InstallmentRow | LoanRow, 'emi' | 'paidAmount' | 'paidBeforeOpening'>,
  plannedDate: string,
  dueDate: string,
  cutoff: string,
) {
  if (row.paidBeforeOpening && row.paidAmount >= row.emi) return 'Recorded before plan';
  if (row.emi > 0 && row.paidAmount >= row.emi) return 'Payment recorded';
  if (row.paidAmount > 0) return 'Part recorded';
  if (dueDate < cutoff) return 'Due date passed · verify';
  if (plannedDate < cutoff) return 'Planned date passed';
  return 'Scheduled';
}
