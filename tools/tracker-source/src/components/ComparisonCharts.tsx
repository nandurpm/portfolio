import { currencyAxis } from '../domain/display';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { usePlan } from '../store';
import { monthlyComparison, type PlanBasis } from '../domain/comparison';
import { money, reportDate } from '../domain/calculate';
import { displayDate, monthLabel } from '../domain/dates';
import { Section } from './UI';

export function ComparisonCharts({ initialScope = 'month' }: { initialScope?: 'month' | 'range' }) {
  const p = usePlan();
  const [scope, setScope] = useState(initialScope),
    [basis, setBasis] = useState<PlanBasis>('full');
  const start = scope === 'month' ? p.settings.selectedMonth : p.settings.viewStart;
  const end = scope === 'month' ? p.settings.selectedMonth : p.settings.viewEnd;
  const rows = useMemo(
    () =>
      monthlyComparison(p, basis, start, end).map((row) => ({
        ...row,
        name: monthLabel(row.month),
      })),
    [p, basis, start, end],
  );
  return (
    <Section
      title="Planned vs actual"
      caption={`Actuals are entered records through ${displayDate(reportDate(p))}. Missing or later entries are not assumed paid.`}
      action={
        <div className="comparison-controls">
          <label>
            Show{' '}
            <select
              aria-label="Comparison period"
              value={scope}
              onChange={(e) => setScope(e.target.value as 'month' | 'range')}
            >
              <option value="month">Selected month</option>
              <option value="range">View range</option>
            </select>
          </label>
          <label>
            Compare with{' '}
            <select
              aria-label="Comparison plan basis"
              value={basis}
              onChange={(e) => setBasis(e.target.value as PlanBasis)}
            >
              <option value="full">Full-month plan</option>
              <option value="by-date">Plan by date</option>
            </select>
          </label>
        </div>
      }
    >
      <div className="comparison-chart-grid">
        {(
          [
            ['Income', 'planIncome', 'actualIncome', 'var(--green)'],
            ['Expenses', 'planExpenses', 'actualExpenses', 'var(--orange)'],
            ['Savings', 'planSavings', 'actualSavings', 'var(--accent)'],
          ] as const
        ).map(([label, plannedKey, actualKey, color]) => (
          <div
            key={label}
            className="comparison-chart"
            role="group"
            aria-label={`${label} planned versus actual chart`}
          >
            <h3>{label}</h3>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    minTickGap={30}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                  />
                  <YAxis
                    width={94}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                    tickFormatter={currencyAxis}
                  />
                  <Tooltip
                    formatter={(value) => money(Number(value))}
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                    }}
                  />
                  <Legend />
                  <Bar
                    name={basis === 'full' ? 'Full-month plan' : 'Plan by date'}
                    dataKey={plannedKey}
                    fill="var(--muted)"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={p.settings.animations}
                  />
                  <Bar
                    name="Actual entered"
                    dataKey={actualKey}
                    fill={color}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={p.settings.animations}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="comparison-summary">
              {rows.length === 1 && rows[0] ? (
                <>
                  <span>
                    Plan <strong>{money(rows[0][plannedKey])}</strong>
                  </span>
                  <span>
                    Actual{' '}
                    <strong>
                      {rows[0][actualKey] === null ? 'Not yet counted' : money(rows[0][actualKey]!)}
                    </strong>
                  </span>
                </>
              ) : (
                <span>{rows.length} months · future actuals stay blank</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
