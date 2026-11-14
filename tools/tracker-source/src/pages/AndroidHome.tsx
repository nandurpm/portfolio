import { lazy, Suspense, useState } from "react";
import { Plus, ArrowDownLeft, ArrowUpRight, Wallet, CalendarDays } from "lucide-react";
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
      <div className="mobile-home-intro"><div><p className="mobile-eyebrow">YOUR MONEY, AT A GLANCE</p><p className="muted">A clearer view. A confident next step.</p></div><span className="mobile-home-mark" aria-hidden="true"><Wallet /></span></div>
      <section
        className="mobile-balance dashboard-balance"
        aria-labelledby="mobile-balance-title"
      >
        <div className="mobile-balance-heading"><span id="mobile-balance-title">Total cash balance</span><span className="mobile-balance-symbol" aria-hidden="true"><Wallet size={20} /></span></div>
        <strong>{money(cash)}</strong>
        <p>Opening savings + recorded cash movements</p>
        <small className="mobile-balance-date">
          <CalendarDays size={15} aria-hidden="true" /> {date > today() ? "Forecast through" : "Through"} {displayDate(date, p.settings.dateFormat)} · Includes
          unallocated cash
        </small>
        <button type="button" className="mobile-balance-link" onClick={() => navigate("accounts")}>View accounts <ArrowUpRight size={16} aria-hidden="true" /></button>
      </section>
      <div className="mobile-section-title"><h2>Monthly snapshot</h2><span>{monthLabel(month)}</span></div>
      <div
        className="mobile-summary"
        aria-label={`${monthLabel(month)} summary`}
      >
        <Stat
          label="Income"
          value={totals.income}
          caption="Recorded"
          tone="green"
          icon={<ArrowDownLeft />}
        />
        <Stat
          label="Expenses"
          value={totals.expenses}
          caption="Recorded"
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
            <Analysis embedded navigate={navigate} addEntry={addEntry} />
          </Suspense>
        )}
      </details>
    </div>
  );
}
