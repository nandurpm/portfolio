import type { Plan } from './types';

/** Presentation of existing PF records only; never reclassify them as income/expense. */
export function pfActivityRows(plan: Pick<Plan, 'pfMovements'>) {
  return (plan.pfMovements ?? []).map(row => ({
    id: `pf-${row.id}`,
    date: row.date,
    title: row.kind === 'claim' ? 'PF claim' : 'PF contribution',
    type: row.kind === 'claim' ? 'pf-claim' : 'pf-contribution',
    amount: row.amount,
    detail: `Provident fund · ${row.kind === 'claim' ? 'Returned to cash' : row.source === 'cash' ? 'Cash allocation' : 'Payroll allocation'} · ${row.payment}`,
  }));
}
