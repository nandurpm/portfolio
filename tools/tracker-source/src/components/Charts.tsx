import { currencyAxis } from '../domain/display';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { usePlan } from '../store';
import { progress, actualCategory, reportDate, money } from '../domain/calculate';
import { monthLabel } from '../domain/dates';
import { Section, Empty } from './UI';
const colors = [
  'var(--accent)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
];
const axis = { tickLine: false, axisLine: false, tick: { fill: 'var(--muted)', fontSize: 11 } };
const tip = {
  contentStyle: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    color: 'var(--text)',
  },
  formatter: (v: any) => money(Number(v)),
  labelStyle: { color: 'var(--text)' },
};
export function SavingsCharts({ all = false }: { all?: boolean }) {
  const p = usePlan(),
    date = reportDate(p);
  const data = progress(p, date)
    .filter(
      (r) =>
        r.month >= p.settings.viewStart &&
        r.month <= p.settings.viewEnd &&
        r.month <= date.slice(0, 7),
    )
    .map((r) => ({
      name: monthLabel(r.month),
      plan: r.expectedCash === null ? null : r.expectedCash - p.settings.opening,
      actual: r.recordedCash === null ? null : r.recordedCash - p.settings.opening,
      income: r.actual?.income ?? null,
      expenses: r.actual?.expenses ?? null,
      expected: r.expectedCash,
      cash: r.recordedCash,
    }));
  const expense = p.categories
    .filter((c) => c.group !== 'Income')
    .map((c) => ({ name: c.name, value: actualCategory(p, c, p.settings.selectedMonth, date) }))
    .filter((c) => c.value > 0);
  const empty = (
    <Empty
      title="Your story starts here"
      detail="Charts appear as the report date reaches your plan. Add income and expenses to see your actual progress."
    />
  );
  return (
    <div className="chart-grid">
      <Section title="Savings over time" caption="Cumulative savings added from the plan start">
        <div className="chart-box">
          {!data.length ? (
            empty
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" {...axis} minTickGap={28} />
                <YAxis width={94} {...axis} tickFormatter={currencyAxis} />
                <Tooltip {...tip} />
                <Legend />
                <Line
                  name="Plan savings"
                  dataKey="plan"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={data.length < 8}
                  isAnimationActive={p.settings.animations}
                />
                <Line
                  name="Actual savings"
                  dataKey="actual"
                  stroke="var(--green)"
                  strokeWidth={3}
                  dot={data.length < 8}
                  connectNulls={false}
                  isAnimationActive={p.settings.animations}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Section>
      <Section
        title="Cash, month by month"
        caption="Opening savings + cumulative income − expenses"
      >
        <div className="chart-box">
          {!data.length ? (
            empty
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" {...axis} minTickGap={28} />
                <YAxis width={94} {...axis} tickFormatter={currencyAxis} />
                <Tooltip {...tip} />
                <Legend />
                <Area
                  name="Expected cash"
                  dataKey="expected"
                  stroke="#aaa2cf"
                  fill="none"
                  strokeDasharray="5 4"
                  isAnimationActive={p.settings.animations}
                />
                <Area
                  name="Recorded cash"
                  dataKey="cash"
                  stroke="var(--accent)"
                  fill="url(#cashGradient)"
                  strokeWidth={3}
                  dot={data.length < 8}
                  connectNulls={false}
                  isAnimationActive={p.settings.animations}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Section>
      {all && (
        <>
          <Section
            title="Where your money goes"
            caption={`Actual expenses · ${monthLabel(p.settings.selectedMonth)}`}
          >
            <div className="chart-box">
              {!expense.length ? (
                <Empty
                  title="No expenses yet"
                  detail="Choose a category when you add a transaction."
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expense}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={65}
                      outerRadius={96}
                      paddingAngle={3}
                      isAnimationActive={p.settings.animations}
                    >
                      {expense.map((c, i) => (
                        <Cell key={c.name} fill={colors[i % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tip} />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      wrapperStyle={{ fontSize: 11, maxWidth: 150 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
