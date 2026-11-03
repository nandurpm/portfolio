import { userError } from '../domain/user-error';
import { useState, type FormEvent } from "react";
import { store, usePlan } from "../store";
import { PageHead, Section, useUi } from "../components/UI";
import { today, monthLabel } from "../domain/dates";
import { money } from "../domain/calculate";
import {
  salaryHistory,
  salaryAtDate,
  enableSalaryHistory,
  enablePfAccount,
  pfSummary,
  monthlyPfSchedule,
} from "../domain/employment";
import type { SalaryChange, PfMovement } from "../domain/types";
import "../workspace.css";

export default function Employment() {
  const p = usePlan(),
    { confirm } = useUi();
  const [salaryEdit, setSalaryEdit] = useState<SalaryChange | null>(null);
  const [movementEdit, setMovementEdit] = useState<PfMovement | null>(null);
  const [salaryOpen, setSalaryOpen] = useState(false),
    [pfOpen, setPfOpen] = useState(false);
  const [error, setError] = useState("");
  const history = salaryHistory(p),
    pf = pfSummary(p, today());
  const schedule = monthlyPfSchedule(
    p,
    p.settings.planStart,
    p.settings.planEnd,
  ).filter((row) => row.amount > 0);
  async function setMonthlyPf(id: string) {
    if (!(await prepare("salary"))) return;
    try {
      store.change("Set monthly PF after salary change", (d) => {
        enableSalaryHistory(d);
        enablePfAccount(d);
        const row = d.salaryChanges!.find((row) => row.id === id);
        if (!row)
          throw Error(
            "Salary change was not found. Please reload this screen.",
          );
        row.monthlyPfContribution = 2000;
      });
      setError("");
    } catch (e) {
      setError(userError(e));
    }
  }
  async function prepare(kind: "salary" | "pf") {
    if (
      (kind === "salary" && p.salaryChanges === undefined) ||
      (kind === "pf" && p.pfMovements === undefined)
    ) {
      if (
        !(await confirm(
          "Enable salary history and PF support?",
          "Update your Windows and Android apps before using these records. Older app versions cannot open plans with salary history or a PF account. Your existing entries are kept.",
        ))
      )
        return false;
    }
    return true;
  }
  async function saveSalary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const row: SalaryChange = {
      id: salaryEdit?.id ?? crypto.randomUUID(),
      effectiveDate: String(form.get("date")),
      monthlySalary: Number(form.get("salary")),
      monthlyPfContribution: Number(form.get("pf")),
    };
    if (!(await prepare("salary"))) return;
    try {
      store.change("Save salary change", (d) => {
        enableSalaryHistory(d);
        if (row.monthlyPfContribution > 0) enablePfAccount(d);
        d.salaryChanges = [
          ...d.salaryChanges!.filter((item) => item.id !== row.id),
          row,
        ];
      });
      setSalaryOpen(false);
      setError("");
    } catch (e) {
      setError(
        userError(e),
      );
    }
  }
  async function savePf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget),
      kind = String(form.get("kind")) as PfMovement["kind"];
    const row: PfMovement = {
      id: movementEdit?.id ?? crypto.randomUUID(),
      date: String(form.get("date")),
      kind,
      source:
        kind === "claim"
          ? "cash"
          : (String(form.get("source")) as PfMovement["source"]),
      amount: Number(form.get("amount")),
      payment: String(form.get("payment")).trim(),
      note: String(form.get("note")).trim(),
    };
    if (!(await prepare("pf"))) return;
    try {
      store.change("Save PF transfer", (d) => {
        enablePfAccount(d);
        d.pfMovements = [
          ...d.pfMovements!.filter((item) => item.id !== row.id),
          row,
        ];
      });
      setPfOpen(false);
      setError("");
    } catch (e) {
      setError(userError(e));
    }
  }
  async function remove(kind: "salary" | "pf", id: string) {
    if (!(await prepare(kind))) return;
    if (
      !(await confirm(
        "Delete this record?",
        "This updates the salary forecast or PF balance. Existing income and expense entries stay unchanged.",
        true,
        "Delete record",
      ))
    )
      return;
    try {
      store.change("Delete employment record", (d) => {
        if (kind === "salary") {
          enableSalaryHistory(d);
          d.salaryChanges = d.salaryChanges!.filter((row) => row.id !== id);
        } else d.pfMovements = d.pfMovements!.filter((row) => row.id !== id);
      });
      setError("");
    } catch (e) {
      setError(userError(e));
    }
  }
  return (
    <div className="finance-workspace employment-workspace">
      <PageHead
        eyebrow="PRIVATE WORKSPACE"
        title="Salary & PF"
        description="Keep take-home pay and your provident fund separate."
      />
      {error && (
        <p role="alert" className="callout error">
          {error}
        </p>
      )}
      <div className="workspace-priorities">
        <article className="workspace-card">
          <small>Current monthly take-home salary</small>
          <strong className="workspace-value">
            {money(salaryAtDate(p, today()).monthlySalary)}
          </strong>
          <p>Salary earned now. Your budget receives it the following month.</p>
        </article>
        <article className="workspace-card">
          <small>PF balance · pending claim</small>
          <strong className="workspace-value">{money(pf.balance)}</strong>
          <p>
            Recorded contributions less claims through today. Separate from cash
            and salary; this is not confirmation of claim eligibility.
          </p>
        </article>
      </div>
      <Section
        title="Salary changes"
        caption="Add each change with its own effective date. Salary means take-home pay after deductions. PF starts from the effective salary month, separately from take-home salary."
      >
        <button
          className="button"
          onClick={() => {
            setSalaryEdit(null);
            setSalaryOpen(true);
            setError("");
          }}
        >
          Add salary change
        </button>
        {!history.length && (
          <p className="workspace-empty">
            No salary changes yet. Add your first change when your pay changes.
          </p>
        )}
        <div className="workspace-records">
          {history.map((row, index) => (
            <article className="workspace-card" key={row.id}>
              <h3>{row.effectiveDate}</h3>
              <p>
                {money(
                  index
                    ? history[index - 1]!.monthlySalary
                    : p.settings.salary31,
                )}{" "}
                → <strong>{money(row.monthlySalary)}</strong> / month
              </p>
              <p>
                Monthly PF contribution: {money(row.monthlyPfContribution)} /
                month
                {index > 0
                  ? ` (${money(row.monthlyPfContribution - history[index - 1]!.monthlyPfContribution)} change)`
                  : ""}
              </p>
              {row.monthlyPfContribution === 0 && (
                <button
                  className="button secondary"
                  onClick={() => void setMonthlyPf(row.id)}
                >
                  Set ₹2,000 monthly PF after this change
                </button>
              )}
              <div className="workspace-actions">
                <button
                  aria-label={`Edit salary change ${row.effectiveDate}`}
                  className="button secondary"
                  onClick={() => {
                    setSalaryEdit(row);
                    setSalaryOpen(true);
                    setError("");
                  }}
                >
                  Edit
                </button>
                <button
                  aria-label={`Delete salary change ${row.effectiveDate}`}
                  className="text-button"
                  onClick={() => void remove("salary", row.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
        {salaryOpen && (
          <form
            key={salaryEdit?.id ?? "new"}
            className="workspace-form"
            onSubmit={(e) => void saveSalary(e)}
            aria-label="Salary change"
          >
            <label>
              Effective date
              <input
                name="date"
                type="date"
                required
                defaultValue={salaryEdit?.effectiveDate ?? today()}
              />
            </label>
            <label>
              Updated monthly take-home salary (₹)
              <input
                name="salary"
                type="number"
                min="0"
                max="1000000000000"
                step="0.01"
                required
                defaultValue={
                  salaryEdit?.monthlySalary ??
                  salaryAtDate(p, today()).monthlySalary
                }
              />
            </label>
            <label>
              Monthly PF contribution after this change (₹)
              <input
                name="pf"
                type="number"
                min="0"
                max="1000000000000"
                step="0.01"
                required
                defaultValue={salaryEdit?.monthlyPfContribution ?? 2000}
              />
            </label>
            <p>
              PF is ₹0 before your first PF-enabled salary change. The monthly
              contribution defaults to ₹2,000 and is scheduled from the
              effective salary month, without proration. Record it as credited
              only after it reaches your PF account. This does not create salary
              income or an expense.
            </p>
            <div className="workspace-actions">
              <button className="button">Save salary change</button>
              <button
                className="button secondary"
                type="button"
                onClick={() => setSalaryOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Section>
      <Section
        title="PF account"
        caption="Payroll PF stays outside cash flow. A cash allocation moves money from cash to PF; a claim returns it to cash without counting as salary or income."
      >
        <button
          className="button"
          onClick={() => {
            setMovementEdit(null);
            setPfOpen(true);
            setError("");
          }}
        >
          Record PF contribution or claim
        </button>
        {!p.pfMovements?.length && (
          <p className="workspace-empty">
            Your recorded PF balance is ₹0. You do not need to add an opening
            balance. Monthly PF starts only after the salary change you choose;
            scheduled contributions are not yet credited money.
          </p>
        )}
        <h3>Monthly PF schedule</h3>
        <p className="muted">
          Separate from salary income, expenses and cash. Your PF stays in this
          account until claimed. Contributions are planned at month-end; use the
          actual credit date when recording them.
        </p>
        {!schedule.length ? (
          <p className="workspace-empty">
            No monthly PF is scheduled. Use “Set ₹2,000 monthly PF after this
            change” on the salary increment above, or add a salary change with
            monthly PF of ₹2,000.
          </p>
        ) : (
          <>
            <p>
              Scheduled from {monthLabel(schedule[0]!.month, true)} · ₹0 opening
              PF balance unless you record earlier contributions.
            </p>
            <div className="workspace-records">
              {schedule
                .filter(
                  (row) =>
                    row.month >= today().slice(0, 7) || row.remaining > 0,
                )
                .slice(0, 12)
                .map((row) => (
                  <article className="workspace-card" key={row.month}>
                    <h3>{monthLabel(row.month, true)}</h3>
                    <strong>{money(row.amount)} monthly PF</strong>
                    <p>
                      {money(row.credited)} recorded · {money(row.remaining)}{" "}
                      not recorded yet
                    </p>
                    {row.remaining > 0 && row.date <= today() && (
                      <button
                        className="button secondary"
                        onClick={() => {
                          setMovementEdit({
                            id: crypto.randomUUID(),
                            date: row.date,
                            amount: row.remaining,
                            kind: "contribution",
                            source: "payroll",
                            payment: "Payroll",
                            note: `PF for ${row.month}`,
                          });
                          setPfOpen(true);
                          setError("");
                        }}
                      >
                        Record credited PF for {monthLabel(row.month, true)}
                      </button>
                    )}
                  </article>
                ))}
            </div>
            {schedule.length > 12 && (
              <p className="muted">
                Showing up to 12 outstanding or upcoming months. Later months
                follow the same dated salary/PF history.
              </p>
            )}
          </>
        )}
        {pfOpen && (
          <form
            key={movementEdit?.id ?? "new"}
            className="workspace-form"
            onSubmit={(e) => void savePf(e)}
            aria-label="PF transfer"
          >
            <label>
              Transfer type
              <select
                name="kind"
                defaultValue={movementEdit?.kind ?? "contribution"}
              >
                <option value="contribution">PF contribution</option>
                <option value="claim">PF claimed into cash</option>
              </select>
            </label>
            <label>
              Contribution source (ignored for claims)
              <select
                name="source"
                defaultValue={movementEdit?.source ?? "payroll"}
              >
                <option value="payroll">
                  Payroll deduction · no change to take-home cash
                </option>
                <option value="cash">
                  Cash allocation · reduces cash balance
                </option>
              </select>
            </label>
            <label>
              Date
              <input
                name="date"
                type="date"
                required
                defaultValue={movementEdit?.date ?? today()}
              />
            </label>
            <label>
              Amount (₹)
              <input
                name="amount"
                type="number"
                min="0.01"
                max="1000000000000"
                step="0.01"
                required
                defaultValue={movementEdit?.amount}
              />
            </label>
            <label>
              Payment account or method
              <input
                name="payment"
                maxLength={100}
                defaultValue={movementEdit?.payment ?? "Bank"}
                required
              />
            </label>
            <label>
              Note (optional)
              <input
                name="note"
                maxLength={1000}
                defaultValue={movementEdit?.note}
              />
            </label>
            <p>
              Cash allocations and claims must fall within your plan dates.
              Claims cannot exceed the PF contributions recorded by that date.
              Existing expense entries are not reclassified.
            </p>
            <div className="workspace-actions">
              <button className="button">Save PF transfer</button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setPfOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        <div className="workspace-records">
          {[...(p.pfMovements ?? [])]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((row) => (
              <article className="workspace-card" key={row.id}>
                <h3>
                  {row.kind === "claim" ? "PF claimed" : "PF contribution"} ·{" "}
                  {money(row.amount)}
                </h3>
                <p>
                  {row.date} ·{" "}
                  {row.kind === "claim"
                    ? "Returned to cash"
                    : row.source === "cash"
                      ? "Allocated from cash"
                      : "Payroll deduction"}{" "}
                  · {row.payment}
                </p>
                {row.note && <p>{row.note}</p>}
                <div className="workspace-actions">
                  <button
                    aria-label={`Edit PF record ${row.date}`}
                    className="button secondary"
                    onClick={() => {
                      setMovementEdit(row);
                      setPfOpen(true);
                      setError("");
                    }}
                  >
                    Edit
                  </button>
                  <button
                    aria-label={`Delete PF record ${row.date}`}
                    className="text-button"
                    onClick={() => void remove("pf", row.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
        </div>
      </Section>
    </div>
  );
}
