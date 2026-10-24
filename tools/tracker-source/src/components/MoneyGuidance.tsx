import { usePlan } from '../store';
import { actualCategory, categoryPlan, money, reportDate, round } from '../domain/calculate';
import { budgetAlerts, installmentTasks, projectedShortfalls } from '../domain/insights';
import { monthLabel, displayDate, monthDay } from '../domain/dates';
import { Section, Badge } from './UI';

export function CashAlerts() {
  const p = usePlan(),
    rows = projectedShortfalls(p);
  if (!rows.length) return null;
  const first = rows[0]!;
  return (
    <div className="callout error cash-alert" role="status">
      <strong>Projected cash shortfall · {monthLabel(first.month)}</strong>
      <p>
        Your planned closing cash is {money(first.cash)}. An additional {money(-first.cash)} is
        needed to keep that month at zero, based on the current plan.
      </p>
      <details>
        <summary>
          {rows.length} month{rows.length === 1 ? '' : 's'} with negative projected cash
        </summary>
        <ul>
          {rows.map((r) => (
            <li key={r.month}>
              {monthLabel(r.month)}: {money(r.cash)}
            </li>
          ))}
        </ul>
      </details>
      <small>
        Forecast only. Review opening savings, income and budgets in Budget &amp; Plan. No payments
        or records are changed.
      </small>
    </div>
  );
}

export function BudgetAlerts() {
  const p = usePlan(),
    month = p.settings.selectedMonth,
    alerts = budgetAlerts(p, month);
  return (
    <Section
      title="Budget alerts"
      caption={`${monthLabel(month, true)} · warnings at 80%, at the limit and above the limit. Only recorded expenses through ${displayDate(reportDate(p))} count.`}
    >
      {!alerts.length ? (
        <p className="muted">
          No category has reached its warning level. Missing entries are not treated as proof that
          spending is within budget.
        </p>
      ) : (
        <div className="budget-alert-list">
          {alerts.map((a) => (
            <article key={a.id} className={`budget-alert ${a.remaining < 0 ? 'over' : 'near'}`}>
              <div>
                <strong>{a.name}</strong>{' '}
                <Badge tone={a.remaining < 0 ? 'debt' : 'living'}>{a.level}</Badge>
              </div>
              <p>
                {money(a.spent)} recorded / {money(a.budget)} budget
                {a.percent === null ? '' : ` · ${a.percent}% used`}
              </p>
              <strong>
                {a.remaining < 0
                  ? `${money(-a.remaining)} over budget`
                  : `${money(a.remaining)} remaining`}
              </strong>
            </article>
          ))}
        </div>
      )}
    </Section>
  );
}

export function MonthlyChecklist() {
  const p = usePlan(),
    month = p.settings.selectedMonth,
    cutoff = reportDate(p),
    loans = installmentTasks(p, month, cutoff);
  const regular = p.categories.filter(
    (c) =>
      c.active &&
      c.role !== 'emi' &&
      c.role !== 'closure' &&
      (categoryPlan(p, c, month) > 0 || actualCategory(p, c, month, cutoff) > 0),
  );
  return (
    <Section
      title="Monthly checklist"
      caption={`${monthLabel(month, true)} · status comes from recorded entries through ${displayDate(cutoff)}. Add income and bills in Daily Entries, and record installments in Loan & Closure; planned items are never marked paid automatically.`}
    >
      <div className="monthly-checklist">
        {regular.map((c) => {
          const provision = p.provisions?.find((r) => r.enabled && r.categoryId === c.id);
          const expected = categoryPlan(p, c, month),
            recorded = actualCategory(p, c, month, cutoff),
            income = c.group === 'Income',
            fixed = c.timing === 'Fixed day' || !!provision,
            left = round(Math.max(0, expected - recorded));
          const status = income
            ? recorded >= expected
              ? 'Income recorded'
              : recorded > 0
                ? 'Part received'
                : 'Not received'
            : fixed
              ? recorded >= expected
                ? 'Payment recorded'
                : recorded > 0
                  ? 'Part recorded'
                  : 'Pending entry'
              : recorded > 0
                ? 'Spending recorded'
                : 'No entries';
          return (
            <article key={c.id} className="checklist-item">
              <div>
                <strong>{c.name}</strong>
                <Badge tone={recorded > 0 ? 'income' : 'living'}>{status}</Badge>
              </div>
              <p>
                {money(recorded)} recorded · {money(expected)}{' '}
                {income ? 'expected income' : 'monthly budget'}
              </p>
              <small>
                {fixed
                  ? `${income ? 'Receive' : 'Pay'} ${displayDate(monthDay(month, provision?.dueDay ?? c.day))} · `
                  : ''}
                {money(left)} {income ? 'still expected' : 'budget remaining'}
              </small>
            </article>
          );
        })}
        {loans.map((l) => (
          <article key={l.id} className="checklist-item">
            <div>
              <strong>{l.category}</strong>
              <Badge tone={l.remaining <= 0 ? 'income' : 'debt'}>{l.status}</Badge>
            </div>
            <p>
              <strong>Pay {displayDate(l.payDate)}</strong> → Due {displayDate(l.dueDate)}
            </p>
            <small>
              {money(l.paid)} paid of {money(l.expected)} · {money(l.remaining)} outstanding
            </small>
          </article>
        ))}
      </div>
      {!regular.length && !loans.length && (
        <p className="muted">No planned items or recorded entries in this month.</p>
      )}
      <p className="footnote">
        For variable spending, the checklist tracks the budget rather than confirming that a bill
        was settled.
      </p>
    </Section>
  );
}
