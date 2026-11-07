import { addMonths, monthsBetween, validMonth } from './dates';
import type { Plan, Provision } from './types';

export function isBillDueMonth(provision: Provision, month: string): boolean {
  return validMonth(month) && month >= provision.firstDueMonth &&
    (monthsBetween(provision.firstDueMonth, month).length - 1) % provision.everyMonths === 0;
}
export function nextBillDueMonth(provision: Provision, month: string): string {
  if (month <= provision.firstDueMonth) return provision.firstDueMonth;
  const distance = monthsBetween(provision.firstDueMonth, month).length - 1;
  return addMonths(provision.firstDueMonth, Math.ceil(distance / provision.everyMonths) * provision.everyMonths);
}
/** Enforce new/edited user postings without making old backups or sync records unreadable. */
export function assertEditedBillLinks(before: Plan, after: Plan) {
  const oldRows = new Map((before.ledgerTransactions ?? []).map(row => [row.id, row]));
  for (const row of after.ledgerTransactions ?? []) {
    if (!row.provisionId) continue;
    const old = oldRows.get(row.id);
    if (old && row.provisionId === old.provisionId && row.billDueMonth === old.billDueMonth &&
        row.amount === old.amount && row.date === old.date && row.kind === old.kind &&
        row.expenseCategoryId === old.expenseCategoryId && row.categoryId === old.categoryId) continue;
    // A refund/reversal must retain the original link, including an unchanged legacy link.
    const origin = row.originalTransactionId && oldRows.get(row.originalTransactionId);
    if (origin && ['refund', 'reversal'].includes(row.kind) &&
        row.provisionId === origin.provisionId && row.billDueMonth === origin.billDueMonth) continue;
    const provision = after.provisions?.find(item => item.id === row.provisionId);
    if (!provision || !row.billDueMonth || !isBillDueMonth(provision, row.billDueMonth))
      throw Error('Choose a bill due month on the provision schedule. Payments may be made in advance.');
  }
}
/** Surface legacy/imported links for review without mutating or blocking their records. */
export function offScheduleBillLinks(plan: Plan) {
  return (plan.ledgerTransactions ?? []).filter(row => {
    if (!row.provisionId || row.kind === 'reversal') return false;
    const provision = plan.provisions?.find(item => item.id === row.provisionId);
    return !provision || !row.billDueMonth || !isBillDueMonth(provision, row.billDueMonth);
  });
}
