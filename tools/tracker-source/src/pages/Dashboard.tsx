import { reportCategories } from '../domain/ledger';
import { FinancialPosition } from '../components/FinancialPosition';
import { WorkspaceOverview } from '../components/WorkspaceOverview';
import { usePhone } from '../components/usePhone';
import { CashAlerts, BudgetAlerts, MonthlyChecklist } from '../components/MoneyGuidance';
import { HelpTerm } from '../components/HelpTerm';
import { lazy, Suspense, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  CalendarRange,
  TrendingUp,
  CalendarDays,
  RotateCcw,
  Plus,
  BarChart3,
  Landmark,
  ListChecks,
  FileDown,
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
import { MobileRecentActivity } from '../components/MobileRecentActivity';
const ComparisonCharts = lazy(() => import('../components/ComparisonCharts').then((m) => ({ default: m.ComparisonCharts })));
const SavingsCharts = lazy(() => import('../components/Charts').then((m) => ({ default: m.SavingsCharts })));

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
  const phone = usePhone();
  const p = usePlan(),
    date = reportDate(p),
    rows = useMemo(() => progress(p, date), [p, date]);
  const inProgress = (month: string) => date >= month + '-01' && date < monthEnd(month);
  const visible = whole
    ? rows
    : rows.filter((r) => r.month >= p.settings.viewStart && r.month <= p.settings.viewEnd);
  if (phone) return (
    <section className="progress-month-cards" aria-label="Recorded monthly progress">
      {visible.map((r) => (
        <article className="progress-month-card" key={r.month}>
          <header>
            <strong>{monthLabel(r.month, true)}</strong>
            <Badge tone={r.status.toLowerCase()}>{r.status}</Badge>
          </header>
          <dl>
            <div><dt>Full-month income plan</dt><dd>{money(r.plan.income)}</dd></div>
            <div><dt>Income received</dt><dd>{r.actual ? money(r.actual.income) : '—'}</dd></div>
            <div><dt>Full-month expense plan</dt><dd>{money(r.plan.expenses)}</dd></div>
            <div><dt>Expenses recorded</dt><dd>{r.actual ? money(r.actual.expenses) : '—'}</dd></div>
            <div><dt>Full-month savings plan</dt><dd>{money(r.plan.savings)}</dd></div>
            <div><dt>Actual savings / deficit</dt><dd>{r.actual ? money(r.actual.savings) : '—'}</dd></div>
            <div><dt>Planned month-end cash</dt><dd>{r.expectedCash === null ? 'Future' : money(r.expectedCash)}</dd></div>
            <div><dt>Recorded cash</dt><dd>{r.recordedCash === null ? 'Future' : money(r.recordedCash)}</dd></div>
          </dl>
          <p className="progress-month-note">
            {inProgress(r.month) ? 'In progress · full-month target is not yet final' :
              r.status === 'Future' ? 'Not yet started' :
              r.actual ? `Savings vs plan: ${money(r.actual.savings - r.plan.savings)}` : 'No entries recorded'}
            {' · '}{r.count} {r.count === 1 ? 'entry' : 'entries'}
          </p>
        </article>
      ))}
    </section>
  );
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
              'Planned month-end cash',
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
                inProgress(r.month) ? null : r.actual ? r.actual.savings - r.plan.savings : null,
                r.expectedCash,
                r.recordedCash,
              ].map((v, i) => (
                <td
                  key={i}
                  className={i === 6 ? 'muted' : ''}
                >
                  {v == null ? (r.status === 'Future' ? 'Future' : inProgress(r.month) && i === 6 ? 'In progress' : r.count === 0 ? 'No entries recorded' : '—') : money(v)}
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
  onTransfer?: () => void;
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
    remainingBudget = full.expenses - act.expenses,
    budgetUsed = full.expenses > 0 ? Math.min(100, Math.max(0, (act.expenses / full.expenses) * 100)) : 0,
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
        eyebrow="PRIVATE FINANCE WORKSPACE"
        title="Monthly snapshot"
        description="Know what’s planned, what’s spent, and what’s yours to keep."
      />
      <div className="dashboard-context" aria-label="Dashboard reporting context">
        <div className="dashboard-context-copy">
          <span className="dashboard-context-label">Reviewing</span>
          <strong>{monthLabel(m, true)}</strong>
          <span className={`dashboard-context-status ${status}`}>
            <span className="status-dot" aria-hidden="true" />
            {status === 'current' ? 'Current month' : status === 'future' ? 'Future plan' : 'Past month'}
          </span>
        </div>
        <MonthControls />
      </div>
      <section className="dashboard-hero" aria-labelledby="dashboard-balance-title">
        <div className="dashboard-hero-meta">
          <span className="dashboard-live-pill"><span className={`status-dot ${date > today() ? 'past' : 'current'}`} aria-hidden="true" /> {date > today() ? 'Preview date' : 'Live reporting'}</span>
          <span>Through {displayDate(date, s.dateFormat)}</span>
        </div>
        <div className="dashboard-balance">
          <span className="dashboard-hero-icon" aria-hidden="true"><Wallet /></span>
          <div>
            <span className="dashboard-overline">Available cash snapshot</span>
            <h2 id="dashboard-balance-title">Calculated cash balance</h2>
            <strong>{money(cum.actualCash)}</strong>
            <p>Opening savings + recorded cash movements, including Accounts and PF transfers</p>
          </div>
        </div>
        <div className="dashboard-hero-insights">
          <div>
            <span>{savings.month < 0 ? (m === date.slice(0, 7) && date < monthEnd(m) ? 'Net savings · month in progress' : 'Recorded savings deficit') : 'Saved this month'}</span>
            <strong className={savings.month < 0 ? 'unfavourable' : ''}>{money(savings.month)}</strong>
            <small>Income less expenses</small>
          </div>
          <div>
            <span>{remainingBudget < 0 ? 'Over monthly budget' : 'Expense budget left'}</span>
            <strong className={remainingBudget < 0 ? 'unfavourable' : ''}>{money(Math.abs(remainingBudget))}</strong>
            <small>{money(act.expenses)} of {money(full.expenses)} used</small>
            <div className="dashboard-budget-meter" role="progressbar" aria-label="Monthly expense budget used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(budgetUsed)}>
              <span style={{ width: `${budgetUsed}%` }} />
            </div>
          </div>
        </div>
        <div className="dashboard-hero-actions" role="group" aria-label="Quick actions">
          <button className="button income-action" onClick={() => addEntry('Income')}><Plus size={18} /> Add income</button>
          <button className="button expense-action" onClick={() => addEntry('Expense')}><Plus size={18} /> Add expense</button>
          <button className="button secondary" onClick={() => navigate('reports')}>View reports</button>
        </div>
      </section>
      <div className="stats-grid dashboard-kpis">
        <Stat label="Income received" value={act.income} caption={`${money(full.income, 0)} monthly plan`} tone="green" icon={<ArrowDownLeft />} />
        <Stat label="Expenses recorded" value={act.expenses} caption={`${money(full.expenses, 0)} monthly budget`} tone="orange" icon={<ArrowUpRight />} />
        <Stat label="Saved this year" value={savings.year} caption={`${savings.calendarYear} through ${displayDate(date, s.dateFormat)}`} tone={savings.year < 0 ? 'orange' : 'violet'} icon={<CalendarRange />} />
        <Stat label="Net savings since tracking began" value={savings.lifetime} caption={`Since ${monthLabel(s.planStart, true)} · excludes opening savings`} tone={savings.lifetime < 0 ? 'orange' : 'violet'} icon={<TrendingUp />} />
      </div>
      <nav className="dashboard-quick-links" aria-label="Dashboard shortcuts">
        <button className="dashboard-quick-link" onClick={() => navigate('budget')}>
          <span className="dashboard-quick-icon violet"><ListChecks size={17} /></span>
          <span><strong>Review budget</strong><small>Adjust this month’s plan</small></span>
          <ArrowUpRight size={16} />
        </button>
        <button className="dashboard-quick-link" onClick={() => navigate('accounts')}>
          <span className="dashboard-quick-icon blue"><Landmark size={17} /></span>
          <span><strong>Check accounts</strong><small>See cash by account</small></span>
          <ArrowUpRight size={16} />
        </button>
        <button className="dashboard-quick-link" onClick={() => navigate('forecast')}>
          <span className="dashboard-quick-icon green"><BarChart3 size={17} /></span>
          <span><strong>View forecast</strong><small>Plan upcoming months</small></span>
          <ArrowUpRight size={16} />
        </button>
        <button className="dashboard-quick-link" onClick={() => navigate('reports')}>
          <span className="dashboard-quick-icon orange"><FileDown size={17} /></span>
          <span><strong>Export reports</strong><small>Back up or download</small></span>
          <ArrowUpRight size={16} />
        </button>
      </nav>
      <MobileRecentActivity navigate={navigate} />
      <FinancialPosition onManage={()=>navigate('accounts')}/>
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
      <WorkspaceOverview navigate={navigate} addEntry={addEntry} />
      <CashAlerts />
      <BudgetAlerts />
      <MonthlyChecklist navigate={navigate} addEntry={addEntry} />
      <h2>Full dashboard analysis</h2>
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
            // Never call an incomplete month a savings/cash shortfall.
            const unfinishedMonth = date < monthEnd(date.slice(0, 7));
            const pendingCashOrSavings = unfinishedMonth && (kind === 'cash' || kind === 'savings');
            const explanation = pendingCashOrSavings
              ? 'Month in progress — salary and bills may not yet be due'
              : delta === 0
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
                  {pendingCashOrSavings || delta === 0 ? '' : `${money(Math.abs(delta))} · `}{explanation}
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
              {reportCategories(p)
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
