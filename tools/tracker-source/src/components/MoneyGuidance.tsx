import { usePlan } from '../store';
import { money, reportDate } from '../domain/calculate';
import { budgetAlerts, projectedShortfalls } from '../domain/insights';
import { monthLabel, displayDate } from '../domain/dates';
import { monthlyChecklistView, installmentDisplayStatus, type ChecklistCategory } from '../domain/monthly-checklist';
import { CalendarClock, ChevronDown, Landmark, Plus, ReceiptText, ShoppingBasket, Wallet } from 'lucide-react';
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

function ChecklistCategoryCard({ item, dateFormat }: { item: ChecklistCategory; dateFormat: string }) {
  const used = item.percentage == null ? 0 : Math.min(100, Math.max(0, item.percentage));
  const abovePlan = item.remaining < 0;
  const tone = abovePlan && item.kind !== 'income'
    ? 'debt'
    : item.recorded > 0
      ? 'income'
      : 'neutral';
  const remainder = item.kind === 'income'
    ? abovePlan
      ? `${money(-item.remaining)} above expected income`
      : `${money(item.remaining)} not yet recorded`
    : abovePlan
      ? `${money(-item.remaining)} over budget`
      : `${money(item.remaining)} budget remaining`;
  return (
    <article className="checklist-card" aria-label={item.name + ' monthly summary'}>
      <div className="checklist-card-head">
        <h4>{item.name}</h4>
        <Badge tone={tone}>{item.status}</Badge>
      </div>
      <div className="checklist-card-amount">
        <strong>{money(item.recorded)}</strong>
        <span>of {money(item.planned)} {item.kind === 'income' ? 'expected' : 'budget'}</span>
      </div>
      <div
        className={`checklist-meter ${abovePlan && item.kind !== 'income' ? 'over' : item.kind}`}
        role="progressbar"
        aria-label={item.name + (item.kind === 'income' ? ' income received' : ' budget used')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={used}
        aria-valuetext={item.percentage === null ? 'No planned amount' : `${item.percentage}%`}
      >
        <span style={{ width: `${used}%` }} />
      </div>
      <div className="checklist-card-foot">
        <span>{item.percentage === null ? 'No planned amount' : `${item.percentage}% ${item.kind === 'income' ? 'received' : 'used'}`}</span>
        <strong className={abovePlan && item.kind !== 'income' ? 'unfavourable' : ''}>{remainder}</strong>
      </div>
      {item.plannedDate && (
        <p className="checklist-card-date">
          {item.kind === 'income' ? 'Expected' : 'Planned'} · {displayDate(item.plannedDate, dateFormat)}
        </p>
      )}
    </article>
  );
}

type ChecklistLoan = ReturnType<typeof monthlyChecklistView>['loans'][number];
function ChecklistLoanCard({ loan, cutoff, dateFormat }: { loan: ChecklistLoan; cutoff: string; dateFormat: string }) {
  const state = installmentDisplayStatus(loan, cutoff);
  const used = loan.expected > 0 ? Math.min(100, Math.max(0, loan.paid / loan.expected * 100)) : 0;
  return (
    <article className="checklist-card checklist-loan" aria-label={loan.category + ' installment'}>
      <div className="checklist-card-head">
        <h4>{loan.category}</h4>
        <Badge tone={loan.remaining <= 0 ? 'income' : state === 'Scheduled' ? 'neutral' : 'living'}>
          {state}
        </Badge>
      </div>
      <div className="checklist-card-amount">
        <strong>{money(loan.expected)}</strong>
        <span>scheduled installment</span>
      </div>
      <dl className="checklist-loan-dates">
        <div><dt>Planned</dt><dd>{displayDate(loan.payDate, dateFormat)}</dd></div>
        <div><dt>Due</dt><dd>{displayDate(loan.dueDate, dateFormat)}</dd></div>
      </dl>
      <div className="checklist-meter income" role="progressbar" aria-label={loan.category + ' installment recorded'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={used}>
        <span style={{ width: `${used}%` }} />
      </div>
      <div className="checklist-card-foot">
        <span>{money(loan.paid)} recorded</span>
        <strong>{money(loan.remaining)} to verify</strong>
      </div>
    </article>
  );
}

function ChecklistGroup({
  title,
  description,
  icon,
  count,
  children,
  actionLabel,
  onAction,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
  defaultOpen?: boolean;
}) {
  return (
    <details className="checklist-group" open={defaultOpen || undefined}>
      <summary>
        <span className="checklist-group-icon" aria-hidden="true">{icon}</span>
        <span className="checklist-group-title">
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <span className="checklist-group-count">{count}</span>
        <ChevronDown className="checklist-group-chevron" size={18} aria-hidden="true" />
      </summary>
      <div className="checklist-group-body">
        {count ? <div className="checklist-grid">{children}</div> :
          <p className="muted checklist-empty">No planned or recorded items in this group.</p>}
        <button type="button" className="button small secondary checklist-action" onClick={onAction}>
          <Plus size={15} aria-hidden="true" /> {actionLabel}
        </button>
      </div>
    </details>
  );
}

export function MonthlyChecklist({
  navigate,
  addEntry,
}: {
  navigate: (page: string) => void;
  addEntry: (kind: 'Income' | 'Expense') => void;
}) {
  const p = usePlan(),
    month = p.settings.selectedMonth,
    cutoff = reportDate(p),
    view = monthlyChecklistView(p, month, cutoff),
    format = p.settings.dateFormat;
  const itemCount = view.income.length + view.bills.length + view.spending.length + view.loans.length;
  return (
    <Section
      title="Monthly financial activity"
      caption={`${monthLabel(month, true)} · recorded through ${displayDate(cutoff, format)}. Groups can be expanded or collapsed.`}
      className="monthly-activity"
    >
      <div className="checklist-overview" aria-label="Recorded monthly activity totals">
        <div><span>Income recorded</span><strong>{money(view.totals.income)}</strong></div>
        <div><span>Expenses recorded</span><strong>{money(view.totals.expenses)}</strong></div>
        <div><span>Loan installments listed</span><strong>{view.loans.length}</strong></div>
        <div><span>Items to review</span><strong>{itemCount}</strong></div>
      </div>
      <div className="checklist-sections">
        <ChecklistGroup
          title="Income"
          description="Expected amounts and actual receipts"
          icon={<Wallet size={20} />}
          count={view.income.length}
          actionLabel="Add income"
          onAction={() => addEntry('Income')}
          defaultOpen
        >
          {view.income.map((item) => <ChecklistCategoryCard key={item.id} item={item} dateFormat={format} />)}
        </ChecklistGroup>
        <ChecklistGroup
          title="Loan & EMI payments"
          description="Planned dates, lender due dates, and linked receipts"
          icon={<Landmark size={20} />}
          count={view.loans.length}
          actionLabel="Open Loan & Closure"
          onAction={() => navigate('loan')}
          defaultOpen
        >
          {view.loans.map((loan) => <ChecklistLoanCard key={loan.id} loan={loan} cutoff={cutoff} dateFormat={format} />)}
        </ChecklistGroup>
        <ChecklistGroup
          title="Scheduled bills"
          description="Fixed-day budgets and expected expense entries"
          icon={<ReceiptText size={20} />}
          count={view.bills.length}
          actionLabel="Record an expense"
          onAction={() => addEntry('Expense')}
        >
          {view.bills.map((item) => <ChecklistCategoryCard key={item.id} item={item} dateFormat={format} />)}
        </ChecklistGroup>
        <ChecklistGroup
          title="Everyday spending"
          description="Spending recorded against complete monthly budgets"
          icon={<ShoppingBasket size={20} />}
          count={view.spending.length}
          actionLabel="Add an expense"
          onAction={() => addEntry('Expense')}
          defaultOpen
        >
          {view.spending.map((item) => <ChecklistCategoryCard key={item.id} item={item} dateFormat={format} />)}
        </ChecklistGroup>
      </div>
      <p className="footnote checklist-disclaimer">
        An empty entry or missing EMI receipt is not proof that a bill or installment is unpaid.
        Payment dates and amounts must be verified against actual records. Unspent budgets are not savings.
      </p>
    </Section>
  );
}
