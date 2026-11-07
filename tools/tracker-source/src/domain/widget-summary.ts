import type { Plan } from './types';
import { actual } from './calculate';
import { monthLabel } from './dates';
import { formatMoney } from './format-money';

export type WidgetAccess = 'ready' | 'loading' | 'signed_out' | 'locked' | 'attention';
export type WidgetAction = 'expense' | 'income' | 'refresh';
export interface WidgetSnapshot {
  month: string;
  monthText: string;
  updatedAt: number;
  income: string;
  expenses: string;
  savings: string;
  status: 'ready' | 'empty' | 'outside_plan';
  offline: boolean;
  syncPending: boolean;
}
export interface WidgetContext {
  plan: Plan;
  planOwner?: string;
  userId?: string;
  loading: boolean;
  locked: boolean;
  needsAttention: boolean;
  online: boolean;
  syncPending: boolean;
}

/** Same access boundary as the app. A signed-in account never sees an unlinked plan. */
export function widgetAccess(c: WidgetContext): { owner: string; access: WidgetAccess } {
  if (c.loading) return { owner: '', access: 'loading' };
  if (!c.userId && c.planOwner) return { owner: '', access: 'signed_out' };
  if (c.locked || (c.planOwner && c.userId !== c.planOwner)) return { owner: '', access: 'locked' };
  if (c.needsAttention || (c.userId && c.planOwner !== c.userId)) return { owner: '', access: 'attention' };
  return { owner: c.userId ?? 'local', access: 'ready' };
}

/** Local calendar date, independent of the dashboard's selected month/report cutoff. */
export function widgetSummary(c: WidgetContext, now = new Date()): WidgetSnapshot {
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const through = `${month}-${String(now.getDate()).padStart(2, '0')}`;
  const outside = month < c.plan.settings.planStart || month > c.plan.settings.planEnd;
  // Never implement another financial engine in Java: actual() includes recorded loan
  // payments and ledger fees/interest, excluding transfers and other principal movements.
  const totals = outside ? null : actual(c.plan, `${month}-01`, through);
  return {
    month, monthText: monthLabel(month), updatedAt: now.getTime(),
    income: totals ? formatMoney(totals.income) : '—',
    expenses: totals ? formatMoney(totals.expenses) : '—',
    savings: totals ? formatMoney(totals.savings) : '—',
    status: !totals ? 'outside_plan' : totals.income === 0 && totals.expenses === 0 ? 'empty' : 'ready',
    offline: !c.online, syncPending: c.syncPending,
  };
}

export const widgetAction = (value: unknown): WidgetAction | null =>
  value === 'expense' || value === 'income' || value === 'refresh' ? value : null;
