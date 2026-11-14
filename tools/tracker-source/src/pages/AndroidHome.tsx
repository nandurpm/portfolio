import { lazy, Suspense, useState } from "react";
import { Plus, ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { usePlan } from "../store";
import {
  actual,
  cumulative,
  money,
  reportDate,
  savingsOverview,
} from "../domain/calculate";
import { monthEnd, monthLabel, displayDate, today } from "../domain/dates";
import { MobileRecentActivity } from "../components/MobileRecentActivity";
import { Stat } from "../components/UI";
const Analysis = lazy(() => import("./AndroidDashboard222"));

export default function AndroidHome({
  navigate,
  addEntry,
  openAdd,
}: {
  navigate: (page: string) => void;
  addEntry: (kind: "Income" | "Expense") => void;
  openAdd: () => void;
}) {
  const p = usePlan(),
    date = reportDate(p),
    month = p.settings.selectedMonth;
  const totals = actual(
    p,
    month + "-01",
    date < monthEnd(month) ? date : monthEnd(month),
  );
  const cash = cumulative(p, date).actualCash;
  const savings = savingsOverview(p, month, date);
  const [analysis, setAnalysis] = useState(false);
  return (
    <div className="android-home">
      <h1 className="sr-only">Home</h1>
      <p className="muted">Your money, clearly.</p>
      <section
        className="mobile-balance dashboard-balance"
        aria-labelledby="mobile-balance-title"
      >
        <span id="mobile-balance-title">Total cash balance</span>
        <strong>{money(cash)}</strong>
        <p>Opening savings + recorded cash movements</p>
        <small>
          {date > today() ? "Forecast through" : "Through"} {displayDate(date, p.settings.dateFormat)} · Includes
          unallocated cash
        </small>
      </section>
      <div
        className="mobile-summary"
        aria-label={`${monthLabel(month)} summary`}
      >
        <Stat
          label="Income"
          value={totals.income}
          caption={monthLabel(month, true)}
          tone="green"
          icon={<ArrowDownLeft />}
        />
        <Stat
          label="Expenses"
          value={totals.expenses}
          caption={monthLabel(month, true)}
          tone="orange"
          icon={<ArrowUpRight />}
        />
        <Stat
          label="Savings"
          value={savings.month}
          caption="Income less expenses"
          tone={savings.month < 0 ? "orange" : "violet"}
          icon={<Wallet />}
        />
      </div>
      <button type="button" className="button android-add" onClick={openAdd}>
        <Plus aria-hidden="true" />
        Add
      </button>
      <MobileRecentActivity
        native
        through={date}
        navigate={navigate}
        allActivity
      />
      <details
        className="mobile-analysis"
        onToggle={(event) => setAnalysis(event.currentTarget.open)}
      >
        <summary>Full dashboard analysis</summary>
        <p className="muted">
          Reporting dates, budgets, alerts, charts, progress and financial
          position.
        </p>
        {analysis && (
          <Suspense fallback={<p role="status">Loading analysis…</p>}>
            <Analysis navigate={navigate} addEntry={addEntry} />
          </Suspense>
        )}
      </details>
    </div>
  );
}
