import { usePlan, useSaveStatus } from "../store";
import { useSyncSummary } from "../cloud/SyncStatus";
import { installmentTasks } from "../domain/insights";
import { pfSummary, salaryAtDate, salaryHistory } from "../domain/employment";
import {
  actual,
  planned,
  actualCategory,
  money,
  reportDate,
} from "../domain/calculate";
import { monthEnd, displayDate } from "../domain/dates";
import "../workspace.css";
export function WorkspaceOverview({
  navigate,
  addEntry,
}: {
  navigate: (page: string) => void;
  addEntry: (kind: "Income" | "Expense") => void;
}) {
  const p = usePlan(),
    sync = useSyncSummary(),
    [saveStatus, , , savedAt, backupAt] = useSaveStatus();
  const m = p.settings.selectedMonth,
    cutoff = reportDate(p),
    end = cutoff < monthEnd(m) ? cutoff : monthEnd(m);
  const a = actual(p, m + "-01", end),
    budget = planned(p, m),
    remaining = budget.expenses - a.expenses;
  const tasks = installmentTasks(p, m, cutoff)
    .filter((row) => row.remaining > 0)
    .sort((a, b) => a.payDate.localeCompare(b.payDate));
  const top = p.categories
    .filter((c) => c.group === "Living" || c.group === "Debt")
    .map((c) => ({
      id: c.id,
      name: c.name,
      amount: actualCategory(p, c, m, end),
    }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);
  const pf = pfSummary(p, cutoff);
  const currentPf = salaryAtDate(p, cutoff).monthlyPfContribution;
  const upcomingPf = salaryHistory(p).find(row => row.effectiveDate > cutoff && row.monthlyPfContribution > 0);
  return (
    <div className="finance-workspace">
      <div className="workspace-trust" aria-label="Workspace status">
        <span>Private workspace</span>
        <span>
          {sync.linked ? sync.status : "Local workspace · account not linked"}
        </span>
        <span>
          {savedAt
            ? `Last saved: ${new Date(savedAt).toLocaleString()}`
            : saveStatus}
        </span>
        {backupAt && (
          <span>Local backup: {new Date(backupAt).toLocaleString()}</span>
        )}
        <button className="text-button" onClick={() => navigate("reports")}>
          Export a backup
        </button>
      </div>
      {!p.entries.some(
        (row) =>
          row.date >= p.settings.planStart + "-01" &&
          row.date <= monthEnd(p.settings.planEnd),
      ) && (
        <article className="workspace-card">
          <h2>Start with one small step</h2>
          <p>
            No entries yet. Add income, set a budget, or check your loan
            schedule. Your dashboard fills in as you record real activity.
          </p>
          <div className="workspace-actions">
            <button className="button" onClick={() => addEntry("Income")}>
              Add your first income
            </button>
            <button
              className="button secondary"
              onClick={() => navigate("budget")}
            >
              Create a budget category
            </button>
            <button
              className="button secondary"
              onClick={() => navigate("loan")}
            >
              Set up EMI
            </button>
          </div>
        </article>
      )}
      <div className="workspace-priorities">
        <article className="workspace-card">
          <h2>Upcoming payments</h2>
          {tasks.length ? (
            <ul>
              {tasks.slice(0, 3).map((row) => (
                <li key={row.id}>
                  <strong>
                    {row.category} · {money(row.remaining)}
                  </strong>
                  <p>
                    Payment planned {displayDate(row.payDate)} · Due{" "}
                    {displayDate(row.dueDate)} · {row.status}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              No outstanding scheduled loan payments for this month. Other bills
              may still be due.
            </p>
          )}
          <button className="text-button" onClick={() => navigate("loan")}>
            Review loan payments
          </button>
        </article>
        <article className="workspace-card">
          <h2>Monthly budget status</h2>
          <small>
            {remaining < 0
              ? "Budget warning · over monthly budget"
              : "Remaining expense budget"}
          </small>
          <strong className="workspace-value">
            {money(Math.abs(remaining))}
          </strong>
          <p>
            {money(a.expenses)} recorded of {money(budget.expenses)} planned.
            Unspent budget is not confirmation that bills are paid.
          </p>
          <progress
            aria-label="Monthly expense budget used"
            max={Math.max(1, budget.expenses)}
            value={Math.min(Math.max(1, budget.expenses), a.expenses)}
          />
          <button className="text-button" onClick={() => navigate("budget")}>
            Review budget
          </button>
        </article>
        <article className="workspace-card">
          <h2>Top spending</h2>
          {top.length ? (
            <ul>
              {top.map((row) => (
                <li className="workspace-topline" key={row.id}>
                  <span>{row.name}</span>
                  <strong>{money(row.amount)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              No expenses entered for this reporting period. Record an expense
              to see where your money goes.
            </p>
          )}
          <button className="text-button" onClick={() => addEntry("Expense")}>
            Add an expense
          </button>
        </article>
        <article className="workspace-card">
          <h2>PF balance · pending claim</h2>
          <p>{currentPf > 0 ? `${money(currentPf)} monthly PF scheduled` : upcomingPf ? `${money(upcomingPf.monthlyPfContribution)} monthly PF starts ${displayDate(upcomingPf.effectiveDate)}` : 'No monthly PF scheduled yet'}</p>
          <strong className="workspace-value">{money(pf.balance)}</strong>
          <p>
            Contributions less claims through the report date. Kept separate
            from cash, income and expenses.
          </p>
          <button
            className="text-button"
            onClick={() => navigate("employment")}
          >
            Manage salary & PF
          </button>
        </article>
      </div>
    </div>
  );
}
