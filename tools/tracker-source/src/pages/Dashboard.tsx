import { ComparisonCharts } from '../components/ComparisonCharts';
import { BackupStatus } from '../components/BackupStatus';
import { useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  PiggyBank,
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
} from '../domain/calculate';
import { monthsBetween, monthLabel, monthEnd, today, displayDate } from '../domain/dates';
import { Section, PageHead, Stat, Badge, ProgressBar, Edited } from '../components/UI';
import { SavingsCharts } from '../components/Charts';
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
    <div className="table-scroll">
      <table className="data-table progress-table">
        <thead>
          <tr>
            {[
              'Month',
              'Plan income',
              'Actual income',
              'Plan expenses',
              'Actual expenses',
              'Plan savings',
              'Actual savings',
              'Savings gap',
              'Expected cash',
              'Recorded cash',
              'Entries',
              'Status',
            ].map((h) => (
              <th key={h}>{h}</th>
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
                  className={i === 6 && v != null ? (v >= 0 ? 'favourable' : 'unfavourable') : ''}
                >
                  {v == null ? '—' : money(v)}
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
    full = planned(p, m),
    due = planned(p, m, date),
    act = actual(p, `${m}-01`, date < monthEnd(m) ? date : monthEnd(m)),
    cum = cumulative(p),
    status = m > today().slice(0, 7) ? 'future' : m < today().slice(0, 7) ? 'past' : 'current';
  const metrics = [
    ['Income', 'income', 'income'],
    ['Living expenses', 'living', 'living'],
    ['Loan payments', 'debt', 'debt'],
    ['Total expenses', 'expenses', 'living'],
    ['Saved this month', 'savings', 'income'],
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
      <div className="stats-grid">
        <Stat
          label="Income entered"
          value={act.income}
          caption={`${money(due.income, 0)} planned by date`}
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
          value={act.savings}
          caption={`${money(due.savings, 0)} planned by date`}
          tone="violet"
          icon={<PiggyBank />}
        />
        <Stat
          label="Recorded cash balance"
          value={cum.actualCash}
          caption="Opening savings + all recorded savings"
          tone="blue"
          icon={<Wallet />}
        />
      </div>
      <ComparisonCharts />
      <Section
        title="This month, side by side"
        caption="Green means favourable. Actuals include only the transactions you enter."
      >
        <div className="table-scroll">
          <table className="data-table comparison">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Full-month plan</th>
                <th>Plan by date</th>
                <th>Actual entered</th>
                <th>Difference by date</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(([label, k, tone]) => {
                const gap = k === 'income' || k === 'savings' ? act[k] - due[k] : due[k] - act[k];
                return (
                  <tr key={k} className={k === 'savings' ? 'total-row' : ''}>
                    <td>
                      <span className={`category-dot ${tone}`} />
                      {label}
                    </td>
                    <td>{money(full[k])}</td>
                    <td>{money(due[k])}</td>
                    <td className="strong">{money(act[k])}</td>
                    <td className={gap >= 0 ? 'favourable' : 'unfavourable'}>
                      {gap > 0 ? '+' : ''}
                      {money(gap)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
      <Section
        title="From the start, up to now"
        caption={`${monthLabel(s.planStart)} → ${displayDate(date, s.dateFormat)} · opening savings ${money(s.opening)}`}
      >
        <div className="cumulative-grid">
          {[
            ['Income received', cum.plan.income, cum.actual.income],
            ['Total expenses', cum.plan.expenses, cum.actual.expenses],
            ['Savings added', cum.plan.savings, cum.actual.savings],
            ['Cash balance', cum.expectedCash, cum.actualCash],
          ].map(([label, a, b], i) => (
            <div className="cumulative-item" key={String(label)}>
              <span>{label}</span>
              <strong>{money(Number(b))}</strong>
              <small>Expected {money(Number(a))}</small>
              <span
                className={
                  (i === 1 ? Number(a) - Number(b) : Number(b) - Number(a)) >= 0
                    ? 'favourable'
                    : 'unfavourable'
                }
              >
                {money(i === 1 ? Number(a) - Number(b) : Number(b) - Number(a))} difference
              </span>
            </div>
          ))}
        </div>
      </Section>
      <SavingsCharts all />
      <Section
        title="Every category, accounted for"
        caption="Remaining compares actuals with the full-month budget. Fixed-day items become due on their chosen date."
      >
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Full-month plan</th>
                <th>Plan by date</th>
                <th>Actual</th>
                <th>Remaining / income gap</th>
                <th>Budget used</th>
              </tr>
            </thead>
            <tbody>
              {p.categories
                .filter((c) => c.active || p.entries.some((e) => e.categoryId === c.id))
                .map((c) => {
                  const a = actualCategory(p, c, m, date),
                    b = categoryPlan(p, c, m),
                    due = categoryPlan(p, c, m, date);
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className={`category-dot ${c.group.toLowerCase()}`} />
                        {c.name}
                        {!c.active && <Badge>Archived</Badge>}
                      </td>
                      <td>{money(b)}</td>
                      <td>{money(due)}</td>
                      <td className="strong">{money(a)}</td>
                      <td className={c.group !== 'Income' && a > b ? 'unfavourable' : ''}>
                        {money(b - a)}
                      </td>
                      <td className="progress-cell">
                        <ProgressBar
                          value={b > 0 ? (a / b) * 100 : a > 0 ? 100 : 0}
                          tone={c.group.toLowerCase()}
                        />
                        <small>{b > 0 ? `${Math.round((a / b) * 100)}%` : 'No budget'}</small>
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
        caption="The entire plan. Future periods stay blank until the report date reaches them."
      >
        <ProgressTable whole />
      </Section>
    </>
  );
}
