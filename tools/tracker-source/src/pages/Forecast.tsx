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
  const milestones = [10000, 25000, 50000, 100000, 200000];
  const dates = p.categories
    .filter((c) => c.active && c.timing === 'Fixed day' && fullAmount(p, c, s.selectedMonth) > 0)
    .map((c) => ({ c, date: monthDay(s.selectedMonth, c.day) }));
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
          caption="Closing cash minus the following month’s EMI"
          tone="green"
          icon={<PiggyBank />}
        />
        <Stat
          label="Next EMI reserve"
          value={end?.reserve ?? 0}
          caption={`Following ${monthLabel(s.viewEnd)}`}
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
        caption="All amounts use complete months, including future months. Cash and reserves continue from the plan start."
      >
        <div className="table-scroll">
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
                <tr key={r.month}>
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
                <small>{displayDate(date, s.dateFormat)}</small>
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
