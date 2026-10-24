import { CashAlerts } from '../components/MoneyGuidance';
import { installmentTasks } from '../domain/insights';
import { useRef } from 'react';
import { RangeControl } from '../components/RangeControl';
import { ComparisonCharts } from '../components/ComparisonCharts';
import { CalendarDays, Flag, PiggyBank, Wallet } from 'lucide-react';
import { usePlan } from '../store';
import { forecast, money, fullAmount, reportDate } from '../domain/calculate';
import { monthLabel, monthDay, displayDate, today } from '../domain/dates';
import { PageHead, Section, Stat, Badge } from '../components/UI';
import { SavingsCharts } from '../components/Charts';
import { ProgressTable, MonthControls } from './Dashboard';
export default function Forecast() {
  const p = usePlan(),
    s = p.settings,
    all = forecast(p),
    rows = all.filter((r) => r.month >= s.viewStart && r.month <= s.viewEnd),
    end = rows.at(-1);
  const tableRef = useRef<HTMLDivElement>(null);
  const years = [...new Set(rows.map((r) => r.month.slice(0, 4)))];
  const payments = installmentTasks(p, s.selectedMonth);
  const milestones = [10000, 25000, 50000, 100000, 200000];
  const dates = p.categories
    .filter((c) => c.active && c.timing === 'Fixed day' && fullAmount(p, c, s.selectedMonth) > 0)
    .map((c) => ({
      c,
      date: monthDay(s.selectedMonth, c.role === 'emi' && s.emiPreviousMonth ? s.salaryDay : c.day),
    }));
  return (
    <>
      <PageHead
        eyebrow="FORECAST & PROGRESS"
        title="See where your plan takes you."
        description="The forecast uses complete months. The progress charts stop at your report date."
      />
      <MonthControls />
      <p className="callout preview-banner">
        <strong>Forecast: expected future amounts.</strong> These projections do not add actual
        income or payments.{' '}
        {reportDate(p) > today() &&
          'Your report date is in the future; recorded progress includes entries dated through that date.'}
      </p>
      <CashAlerts />
      <div className="stats-grid three">
        <Stat
          label="Forecast closing cash"
          value={end?.cash ?? s.opening}
          caption={`At ${monthLabel(s.viewEnd)}`}
          tone="violet"
          icon={<Wallet />}
        />
        <Stat
          label="Spendable after EMI reserve"
          value={end?.spendable ?? s.opening}
          caption={
            s.emiPreviousMonth
              ? 'Next month’s EMI is already included in this month’s expenses'
              : 'Closing cash minus the following month’s EMI'
          }
          tone="green"
          icon={<PiggyBank />}
        />
        <Stat
          label="Next EMI reserve"
          value={end?.reserve ?? 0}
          caption={
            s.emiPreviousMonth
              ? 'No second deduction for the EMI already budgeted early'
              : `Following ${monthLabel(s.viewEnd)}`
          }
          tone="orange"
          icon={<CalendarDays />}
        />
      </div>
      <Section
        title="Your milestones"
        caption="First full-plan month when projected cash reaches each milestone"
      >
        <div className="milestones">
          {milestones.map((n) => {
            const r = all.find((r) => r.cash >= n);
            return (
              <div key={n} className={r ? 'milestone' : 'milestone muted'}>
                <Flag size={20} />
                <strong>{money(n, 0)}</strong>
                <span>{r ? monthLabel(r.month) : 'Beyond current plan'}</span>
              </div>
            );
          })}
        </div>
      </Section>
      <ComparisonCharts initialScope="range" />
      <SavingsCharts />
      <Section
        title="Full-month forecast"
        action={<RangeControl kind="view" />}
        caption={
          s.emiPreviousMonth
            ? 'EMIs are budgeted on the salary day before their due month. No extra EMI reserve is deducted. Contract balance follows the lender’s due-date schedule; advance payments do not assume an interest rebate.'
            : 'All amounts use complete months, including future months. Cash and reserves continue from the plan start.'
        }
      >
        <p className="muted">
          Showing {rows.length} of {all.length} months · {monthLabel(s.viewStart)} →{' '}
          {monthLabel(s.viewEnd)}. Choose Full plan or a custom range above.
        </p>
        <label className="year-jump">
          Jump to year{' '}
          <select
            aria-label="Forecast year shortcut"
            defaultValue=""
            onChange={(e) => {
              const box = tableRef.current;
              const row = box?.querySelector<HTMLElement>(`tr[data-year="${e.target.value}"]`);
              if (box && row)
                box.scrollTop = Math.max(
                  0,
                  row.offsetTop - (box.querySelector<HTMLElement>('thead')?.offsetHeight ?? 42),
                );
            }}
          >
            <option value="" disabled>
              Choose year
            </option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <div
          className="table-scroll long-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Full-month forecast table"
          ref={tableRef}
        >
          <table className="data-table">
            <thead>
              <tr>
                {[
                  'Month',
                  'Income',
                  'Living',
                  'EMI',
                  'Closure',
                  'Total expenses',
                  'Savings added',
                  'Closing cash',
                  'Next EMI reserve',
                  'Spendable cash',
                  'Contract balance',
                  'Closure headroom',
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month} data-year={r.month.slice(0, 4)}>
                  <td className="strong nowrap">{monthLabel(r.month)}</td>
                  {(
                    [
                      'income',
                      'living',
                      'emi',
                      'closure',
                      'expenses',
                      'savings',
                      'cash',
                      'reserve',
                      'spendable',
                      'balance',
                      'headroom',
                    ] as const
                  ).map((k) => (
                    <td
                      key={k}
                      className={`${k === 'cash' ? 'accent strong' : ''} ${r[k] < 0 ? 'unfavourable' : ''}`}
                    >
                      {money(r[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Upcoming in the selected month" caption={monthLabel(s.selectedMonth, true)}>
        <div className="calendar-cards">
          {dates.map(({ c, date }) => (
            <div key={c.id} className={`calendar-item ${c.group.toLowerCase()}`}>
              <div>
                <strong>{date.slice(8)}</strong>
                <span>{monthLabel(s.selectedMonth).split(' ')[0]}</span>
              </div>
              <section>
                <h3>{c.name}</h3>
                <small>
                  {c.role === 'emi' ? 'Pay ' : ''}
                  {displayDate(date, s.dateFormat)}
                </small>
                {c.role === 'emi' &&
                  payments
                    .filter((l) => l.category === c.name)
                    .map((l) => (
                      <small key={l.id}>Due {displayDate(l.dueDate, s.dateFormat)}</small>
                    ))}
                <Badge tone={c.group.toLowerCase()}>{c.group}</Badge>
              </section>
            </div>
          ))}
        </div>
      </Section>
      <Section
        title="Recorded progress in the view range"
        caption="Blank actuals mean no transactions were entered. They do not mean no money was spent."
      >
        <ProgressTable />
      </Section>
    </>
  );
}
