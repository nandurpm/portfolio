import { useMemo } from 'react';
import { store, usePlan } from '../store';
import { actual, actualCategory, categoryPlan, money, planned, reportDate, savingsOverview } from '../domain/calculate';
import { displayDate, monthEnd, monthLabel, monthsBetween } from '../domain/dates';
import { installmentTasks } from '../domain/insights';
import { namedAccountBalances, netWorthSnapshot } from '../domain/net-worth';
import { liquidKinds } from '../domain/ledger';
import { MobileRecentActivity } from './MobileRecentActivity';
import './android-home.css';

/** Presentation only: all amounts come from the desktop's shared financial engine. */
export function AndroidHome({ navigate, addEntry }: {
  navigate: (page: string) => void;
  addEntry: (kind: 'Income' | 'Expense') => void;
}) {
  const p = usePlan(), date = reportDate(p), month = p.settings.selectedMonth;
  const end = date < monthEnd(month) ? date : monthEnd(month);
  const a = actual(p, month + '-01', end), budget = planned(p, month);
  const position = netWorthSnapshot(p, date), balances = namedAccountBalances(p, date);
  const upcoming = useMemo(() => monthsBetween(p.settings.planStart, p.settings.planEnd)
    .flatMap(m => installmentTasks(p, m, date))
    .filter(row => row.remaining > 0)
    .sort((a, b) => a.payDate.localeCompare(b.payDate))[0], [p, date]);
  const spending = p.categories.filter(c => c.group === 'Living' || c.group === 'Debt')
    .map(c => ({ id: c.id, name: c.name, spent: actualCategory(p, c, month, end), budget: categoryPlan(p, c, month) }))
    .filter(c => c.spent > 0).sort((a, b) => b.spent - a.spent).slice(0, 3);
  return <div className="android-home">
    <header><h1>Home</h1><label>Review month <select aria-label="Home review month" value={month} onChange={e => store.change('Review month', draft => { draft.settings.selectedMonth = e.target.value; })}>{monthsBetween(p.settings.planStart, p.settings.planEnd).map(m => <option key={m} value={m}>{monthLabel(m, true)}</option>)}</select></label><p>Monthly figures through {displayDate(end, p.settings.dateFormat)}</p></header>
    <section className="android-balance" aria-label="Available balance">
      <span>Available balance</span><strong>{money(position.spendable)}</strong>
      <p>{money(position.cash)} recorded cash − {money(position.reserved)} reserved</p>
      <p>As of {displayDate(date, p.settings.dateFormat)}</p>
      <button className="text-button" onClick={() => navigate('accounts')}>View balance breakdown</button>
    </section>
    <dl className="android-metrics">
      <div><dt>Income received</dt><dd>{money(a.income)}</dd></div>
      <div><dt>Expenses</dt><dd>{money(a.expenses)}</dd></div>
      <div><dt>Saved this month</dt><dd>{money(savingsOverview(p, month, date).month)}</dd></div>
      <div><dt>Upcoming EMI</dt><dd>{upcoming ? money(upcoming.remaining) : 'None scheduled'}</dd></div>
    </dl>
    <div className="android-actions" role="group" aria-label="Quick actions">
      <button className="button" onClick={() => addEntry('Expense')}>Add expense</button>
      <button className="button secondary" onClick={() => addEntry('Income')}>Add income</button>
      <button className="button secondary" onClick={() => navigate('accounts')}>Transfer</button>
    </div>
    {upcoming && <section className="android-card"><h2>Next loan payment</h2><p>{upcoming.category} · {upcoming.status}</p><p>Planned {displayDate(upcoming.payDate)} · Due {displayDate(upcoming.dueDate)}</p><button className="text-button" onClick={() => navigate('loan')}>Review EMI</button></section>}
    <section className="android-card"><h2>Accounts</h2>
      <dl className="android-account-list">{(p.accounts ?? []).filter(a => liquidKinds.includes(a.kind)).slice(0, 3).map(a => <div key={a.id}><dt>{a.name}</dt><dd>{money(balances[a.id] ?? 0)}</dd></div>)}</dl>
      {!(p.accounts ?? []).length && <p>Add a bank or cash account to assign your transactions.</p>}
      {position.unallocatedCash !== 0 && <p>Unallocated cash: {money(position.unallocatedCash)}</p>}
      <button className="text-button" onClick={() => navigate('accounts')}>All accounts &amp; breakdown</button>
    </section>
    <MobileRecentActivity navigate={navigate} native through={date} />
    <section className="android-card"><h2>Spending summary</h2><p>{money(a.expenses)} of {money(budget.expenses)} monthly budget</p>
      {budget.expenses > 0 && <progress aria-label="Monthly budget used" max={budget.expenses} value={Math.min(budget.expenses, a.expenses)} />}
      {a.expenses > budget.expenses && <p role="status">Over budget by {money(a.expenses - budget.expenses)}</p>}
      <dl className="android-account-list">{spending.map(c => <div key={c.id}><dt>{c.name}</dt><dd>{money(c.spent)}</dd></div>)}</dl>
      {!spending.length && <p>No spending recorded for this month.</p>}
      <button className="text-button" onClick={() => navigate('budget')}>Review monthly budget</button>
    </section>
    <p className="muted">Advanced tools, reports, backups and settings are available in More.</p>
  </div>;
}
