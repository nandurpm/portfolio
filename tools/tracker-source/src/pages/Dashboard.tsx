import { CashAlerts, BudgetAlerts, MonthlyChecklist } from '../components/MoneyGuidance';
import { HelpTerm } from '../components/HelpTerm';
const ComparisonCharts = lazy(() => import('../components/ComparisonCharts').then((m) => ({ default: m.ComparisonCharts })));
const SavingsCharts = lazy(() => import('../components/Charts').then((m) => ({ default: m.SavingsCharts })));
import { BackupStatus } from '../components/BackupStatus';
import { lazy, Suspense, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  PiggyBank,
  CalendarRange,
  TrendingUp,
  CalendarDays,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { store, usePlan } from '../store';
import {
  planned,
  actual,
  cumulative,
  actualCategory,
  categoryPlan,
  reportDate,
  money,
  progress,
  savingsOverview,
} from '../domain/calculate';
import { monthsBetween, monthLabel, monthEnd, today, displayDate } from '../domain/dates';
import { Section, PageHead, Stat, Badge, ProgressBar, Edited } from '../components/UI';

import { RangeControl } from '../components/RangeControl';
export function MonthControls() {
  const p = usePlan(),
    s = p.settings;
  return (
    <div className="month-controls">
      <label>
        <CalendarDays size={16} />
        <select
          aria-label="Review month"
          value={s.selectedMonth}
          onChange={(e) =>
            store.change('Review month', (d) => {
              d.settings.selectedMonth = e.target.value;
            })
          }
        >
          {monthsBetween(s.planStart, s.planEnd).map((m) => (
            <option key={m} value={m}>
              {monthLabel(m, true)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Report through{' '}
        <input
          aria-label="Report through date"
          type="date"
          value={reportDate(p)}
          onChange={(e) => {
            if (e.target.value)
              store.change('Report through date', (d) => {
                d.settings.reportDate = e.target.value;
                d.settings.liveDate = false;
              });
          }}
        />
        {!s.liveDate && <Edited />}
      </label>
      <HelpTerm term="report through" />
      <button
        className="icon-button"
        aria-label="Reset report date to today"
        title="Reset to today"
        onClick={() =>
          store.change('Reset report date to today', (d) => {
            d.settings.liveDate = true;
            d.settings.reportDate = today();
          })
        }
      >
        <RotateCcw size={17} />
      </button>
      <RangeControl kind="view" compact />
    </div>
  );
}
export function ProgressTable({ whole = false }: { whole?: boolean }) {
  const p = usePlan(),
    date = reportDate(p),
    rows = useMemo(() => progress(p, date), [p, date]);
  const visible = whole
    ? rows
    : rows.filter((r) => r.month >= p.settings.viewStart && r.month <= p.settings.viewEnd);
  return (
    <div
      className="table-scroll long-table-scroll"
      tabIndex={0}
      role="region"
      aria-label="Recorded monthly progress"
    >
      <table className="data-table progress-table">
        <thead>
          <tr>
            {[
              'Month',
              'Full-month income plan',
              'Actual income',
              'Full-month expense plan',
              'Actual expenses',
              'Full-month savings plan',
              'Actual savings',
              'Savings vs full-month plan',
              'Expected cash',
              'Recorded cash',
              'Entries',
              'Status',
            ].map((h) => (
              <th scope="col" key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => (
            <tr key={r.month}>
              <td className="strong nowrap">{monthLabel(r.month)}</td>
              {[
                r.status === 'Future' ? null : r.plan.income,
                r.actual?.income,
                r.status === 'Future' ? null : r.plan.expenses,
                r.actual?.expenses,
                r.status === 'Future' ? null : r.plan.savings,
                r.actual?.savings,
                r.actual ? r.actual.savings - r.plan.savings : null,
                r.expectedCash,
                r.recordedCash,
              ].map((v, i) => (
                <td
                  key={i}
                  className={i === 6 ? 'muted' : ''}
                >
                  {v == null ? (r.status === 'Future' ? 'Future' : r.count === 0 ? 'No entries recorded' : '—') : money(v)}
                </td>
              ))}
              <td>{r.count || '—'}</td>
              <td>
                <Badge tone={r.status.toLowerCase()}>{r.status}</Badge>
                {r.status !== 'Future' && !r.count && <small className="subtle">No entries</small>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default function Dashboard({
  navigate,
  addEntry,
}: {
  navigate: (page: string) => void;
  addEntry: (kind: 'Income' | 'Expense') => void;
}) {
  const p = usePlan(),
    s = p.settings,
    m = s.selectedMonth,
    date = reportDate(p),
    beforeMonth = date < `${m}-01`,
    full = planned(p, m),
    act = actual(p, `${m}-01`, date < monthEnd(m) ? date : monthEnd(m)),
    cum = cumulative(p),
    savings = savingsOverview(p, m, date),
    status = m > date.slice(0, 7) ? 'future' : m < date.slice(0, 7) ? 'past' : 'current';
  const metrics = [
    ['Income', 'income', 'income'],
    ['Living expenses', 'living', 'living'],
    ['Loan payments', 'debt', 'debt'],
    ['Total expenses', 'expenses', 'living'],
    ['Savings / deficit', 'savings', 'income'],
  ] as const;
  return (
    <>
      <PageHead
        eyebrow="YOUR MONEY, AT A GLANCE"
        title="A little progress. Every day."
        description="Know what’s planned, what’s spent, and what’s yours to keep."
        action={
          <div className="entry-kind">
            <button className="button income-action" onClick={() => addEntry('Income')}>
              <Plus size={18} />
              Add Income
            </button>
            <button className="button expense-action" onClick={() => addEntry('Expense')}>
              <Plus size={18} />
              Add Expense
            </button>
          </div>
        }
      />
      <MonthControls />
      <div className="month-banner">
        <span className={`status-dot ${status}`} />
        <span>
          Selected month: <strong>{monthLabel(m, true)}</strong> ({status} month)
        </span>
        <span className="muted">
          {date < `${s.planStart}-01`
            ? `Your plan begins ${displayDate(s.planStart + '-01')}`
            : `Through ${displayDate(date, s.dateFormat)}`}
        </span>
      </div>
      {date > today() && (
        <div className="callout preview-banner" role="status">
          <strong>Future report preview</strong> · Reporting through {displayDate(date)}. Actuals
          are entered transactions dated through that date; future-dated records are not proof of
          payment.{' '}
          <button
            className="button secondary"
            onClick={() =>
              store.change('Return to live reporting', (d) => {
                d.settings.liveDate = true;
              })
            }
          >
            Return to today
          </button>
        </div>
      )}
      {date < s.planStart + '-01' && (
        <div className="callout">
          <strong>Your plan has not started yet.</strong> Planned comparisons are available below.
          Actual totals remain empty until the report date reaches your entries.{' '}
          <button className="button secondary" onClick={() => navigate('forecast')}>
            View full forecast
          </button>
        </div>
      )}
      <BackupStatus compact />
      <div className="stats-grid savings-overview">
        <Stat
          label="Income entered"
          value={act.income}
          caption={`${money(full.income, 0)} full-month plan`}
          tone="green"
          icon={<ArrowDownLeft />}
        />
        <Stat
          label="Expenses entered"
          value={act.expenses}
          caption={`${money(full.expenses, 0)} full-month budget`}
          tone="orange"
          icon={<ArrowUpRight />}
        />
        <Stat
          label="Saved this month"
          value={savings.month}
          caption={`${monthLabel(m, true)} · income less expenses`}
          tone={savings.month < 0 ? 'orange' : 'violet'}
          icon={<PiggyBank />}
        />
        <Stat
          label="Saved this year"
          value={savings.year}
          caption={`${savings.calendarYear} year-to-date · through ${displayDate(date, s.dateFormat)}`}
          tone={savings.year < 0 ? 'orange' : 'violet'}
          icon={<CalendarRange />}
        />
        <Stat
          label="Saved till now"
          value={savings.lifetime}
          caption={`Since ${monthLabel(s.planStart, true)} · excludes opening savings`}
          tone={savings.lifetime < 0 ? 'orange' : 'violet'}
          icon={<TrendingUp />}
        />
        <Stat
          label="Calculated cash balance"
          value={cum.actualCash}
          caption="Opening savings + recorded net savings · not bank-verified"
          tone="blue"
          icon={<Wallet />}
        />
      </div>
      <CashAlerts />
      <BudgetAlerts />
      <MonthlyChecklist navigate={navigate} addEntry={addEntry} />
      <Suspense fallback={<p className="muted" role="status">Loading comparison charts…</p>}><ComparisonCharts /></Suspense>
      <Section
        title={`${monthLabel(m, true)}, side by side`}
        caption={
          beforeMonth
            ? `Forecast only: the report date (${displayDate(date)}) is before this month. Date-based comparisons are not yet applicable. Full-month plan shows the expected budget.`
            : 'Monthly budget versus recorded transactions. Remaining budgets are unspent allocations, not savings or confirmation that bills are paid.'
        }
      >
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Monthly comparison table"
        >
          <table className="data-table comparison">
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col">Full-month plan</th>
                <th scope="col">Actual entered</th>
                <th scope="col">Monthly status</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(([label, k, tone]) => {
                const remaining = full[k] - act[k];
                const statusText =
                  k === 'savings'
                    ? act.income === 0 && act.expenses === 0
                      ? 'No income or expenses recorded'
                      : act.savings < 0
                        ? 'Recorded expenses exceed recorded income'
                        : 'Recorded income minus recorded expenses'
                    : k === 'income'
                      ? remaining > 0
                        ? `${money(remaining)} income not yet recorded`
                        : remaining < 0
                          ? `${money(-remaining)} above planned income`
                          : 'Planned income recorded'
                      : remaining < 0
                        ? `${money(-remaining)} over budget`
                        : `${money(remaining)} ${k === 'debt' ? 'loan budget remaining' : 'budget remaining'}`;
                const overBudget = k !== 'income' && k !== 'savings' && remaining < 0;
                return (
                  <tr key={k} className={k === 'savings' ? 'total-row' : ''}>
                    <td>
                      <span className={`category-dot ${tone}`} />
                      {label}
                    </td>
                    <td>
                      {money(full[k])}
                      {k === 'savings' && full.savings < 0 && <small> Planned deficit</small>}
                    </td>
                    <td className="strong">{beforeMonth ? 'Not yet applicable' : money(act[k])}</td>
                    <td
                      className={!beforeMonth && overBudget ? 'unfavourable' : 'muted'}
                    >
                      {beforeMonth ? 'Not yet applicable' : statusText}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
      <Section
        title="From plan start — full-month plan vs actual"
        caption={`Planned totals use complete monthly budgets through ${monthLabel(date.slice(0, 7), true)}. Recorded totals include only transactions through ${displayDate(date, s.dateFormat)}. Unspent budgets are not savings. Opening savings: ${money(s.opening)}.`}
      >
        <div className="cumulative-grid">
          {[
            ['Income received', cum.plan.income, cum.actual.income, 'income'],
            ['Total expenses', cum.plan.expenses, cum.actual.expenses, 'expenses'],
            ['Savings added', cum.plan.savings, cum.actual.savings, 'savings'],
            ['Calculated cash balance', cum.expectedCash, cum.actualCash, 'cash'],
          ].map(([label, plannedValue, actualValue, kind]) => {
            const delta = Number(actualValue) - Number(plannedValue);
            const explanation =
              delta === 0
                ? 'Matches full-month plan'
                : kind === 'expenses'
                  ? delta > 0
                    ? 'Over full-month budget'
                    : 'Unspent budget — not savings'
                  : kind === 'income'
                    ? delta > 0
                      ? 'Income above plan'
                      : 'Planned income not yet recorded'
                    : kind === 'cash'
                      ? delta > 0
                        ? 'Above planned month-end cash'
                        : 'Below planned month-end cash'
                      : delta > 0
                        ? 'Savings above plan'
                        : 'Below planned month-end savings';
            return (
              <div className="cumulative-item" key={String(label)}>
                <span>{label}</span>
                <strong>{money(Number(actualValue))}</strong>
                <small>Full-month plan {money(Number(plannedValue))}</small>
                <span className="muted">
                  {delta === 0 ? '' : `${money(Math.abs(delta))} · `}{explanation}
                </span>
              </div>
            );
          })}
        </div>
      </Section>
      <Suspense fallback={<p className="muted" role="status">Loading savings charts…</p>}><SavingsCharts all /></Suspense>
      <Section
        title="Every category, accounted for"
        caption="Income progress is measured by receipts; expense progress is measured by spending. Remaining budgets are not savings."
      >
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Category budget table">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Full-month plan</th>
                <th scope="col">Actual</th>
                <th scope="col">Remaining / income gap</th>
                <th scope="col">Progress</th>
              </tr>
            </thead>
            <tbody>
              {p.categories
                .filter((c) => c.active || p.entries.some((e) => e.categoryId === c.id))
                .map((c) => {
                  const a = actualCategory(p, c, m, date),
                    b = categoryPlan(p, c, m);
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className={`category-dot ${c.group.toLowerCase()}`} />
                        {c.name}
                        {!c.active && <Badge>Archived</Badge>}
                      </td>
                      <td>{money(b)}</td>
                      <td className="strong">{money(a)}</td>
                      <td className={c.group !== 'Income' && a > b ? 'unfavourable' : ''}>
                        {money(b - a)}
                      </td>
                      <td className="progress-cell">
                        <ProgressBar
                          value={b > 0 ? (a / b) * 100 : a > 0 ? 100 : 0}
                          tone={c.group.toLowerCase()}
                        />
                        <small>
                          {c.group === 'Income'
                            ? b > 0
                              ? `Income received ${Math.round((a / b) * 100)}%`
                              : a > 0
                                ? 'Unplanned income received'
                                : 'No income plan'
                            : b > 0
                              ? `Budget used ${Math.round((a / b) * 100)}%`
                              : a > 0
                                ? 'Unbudgeted spending'
                                : 'No budget'}
                        </small>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Section>
      <Section
        title="Month-by-month progress"
        caption="Complete monthly planned amounts, not daily allocations. Actual amounts count recorded transactions through the report date. Future actuals remain blank."
      >
        <ProgressTable whole />
      </Section>
    </>
  );
}
