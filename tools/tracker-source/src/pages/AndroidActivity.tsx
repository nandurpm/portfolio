import { useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { usePlan } from "../store";
import { money } from "../domain/calculate";
import { displayDate } from "../domain/dates";
import { Modal, Empty } from "../components/UI";

export default function AndroidActivity({
  navigate,
  addEntry,
}: {
  navigate: (page: string, section?: string) => void;
  addEntry: (kind: "Income" | "Expense") => void;
}) {
  const p = usePlan();
  const [search, setSearch] = useState(""),
    [filters, setFilters] = useState(false);
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [account, setAccount] = useState(""),
    [type, setType] = useState("all");
  const [limit, setLimit] = useState(50);
  const activity = useMemo(() => {
    const categories = new Map(p.categories.map((c) => [c.id, c]));
    return [
      ...p.entries.map((e) => ({
        id: `entry-${e.id}`,
        date: e.date,
        title:
          e.description || categories.get(e.categoryId)?.name || "Daily entry",
        type:
          categories.get(e.categoryId)?.group === "Income"
            ? "income"
            : categories.get(e.categoryId)?.group === "Asset"
              ? "asset-movement"
              : ["emi", "closure"].includes(
                    categories.get(e.categoryId)?.role || "",
                  )
                ? "loan-payment"
                : "expense",
        amount: e.amount,
        accounts: [e.accountId],
        destination: "entries",
        detail: categories.get(e.categoryId)?.name || "Daily entry",
        fee: 0,
      })),
      ...(p.ledgerTransactions ?? []).map((t) => ({
        id: `ledger-${t.id}`,
        date: t.date,
        title: t.description || t.kind.replaceAll("-", " "),
        type: t.kind,
        amount: t.amount,
        accounts: [t.sourceAccountId, t.destinationAccountId],
        destination: "accounts",
        detail: [t.sourceAccountId, t.destinationAccountId]
          .filter(Boolean)
          .map((id) => p.accounts?.find((a) => a.id === id)?.name || "Account")
          .join(" → "),
        fee: t.feeAmount || 0,
      })),
    ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  }, [p]);
  const shown = activity.filter(
    (r) =>
      (!from || r.date >= from) &&
      (!to || r.date <= to) &&
      (!account || r.accounts.includes(account)) &&
      (type === "all" || r.type === type) &&
      `${r.title} ${r.detail} ${r.type}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  return (
    <div className="android-activity">
      <h1>Activity</h1>
      <p className="muted">Daily entries and account movements, together.</p>
      <div className="mobile-search-row">
        <label>
          <Search aria-hidden="true" />
          <span className="sr-only">Search activity</span>
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(50);
            }}
            placeholder="Search activity"
          />
        </label>
        <button
          type="button"
          className="button secondary"
          onClick={() => setFilters(true)}
        >
          <SlidersHorizontal aria-hidden="true" />
          Filters
        </button>
      </div>
      <p role="status">
        {shown.length} records
        {from || to || account || type !== "all" ? " · Filters applied" : ""}
      </p>
      {from && to && from > to && (
        <p role="alert">Choose an end date on or after the start date.</p>
      )}
      {shown.length ? (
        <ul className="unified-activity">
          {shown.slice(0, limit).map((r) => {
            const income = r.type === "income",
              expense = [
                "expense",
                "shopping",
                "credit-card-purchase",
                "loan-payment",
              ].includes(r.type),
              Icon = income
                ? ArrowDownLeft
                : expense
                  ? ArrowUpRight
                  : ArrowLeftRight;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      r.destination,
                      r.destination === "accounts"
                        ? "Recent account activity"
                        : undefined,
                    )
                  }
                >
                  <Icon
                    aria-hidden="true"
                    className={
                      income ? "income" : expense ? "expense" : "movement"
                    }
                  />
                  <span>
                    <strong>{r.title}</strong>
                    <small>
                      {r.type.replaceAll("-", " ")} ·{" "}
                      {displayDate(r.date, p.settings.dateFormat)}
                    </small>
                    <small>
                      {r.detail}
                      {r.fee > 0 ? ` · Fee ${money(r.fee)}` : ""}
                    </small>
                  </span>
                  <strong>
                    {income ? "+" : expense ? "−" : ""}
                    {money(r.amount)}
                  </strong>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty
          title="No matching activity"
          detail="Change your filters or add a transaction to get started."
        />
      )}
      {shown.length > limit && (
        <button
          className="button secondary"
          onClick={() => setLimit((n) => n + 50)}
        >
          Show more activity
        </button>
      )}
      <div className="mobile-history-tools">
        <button
          className="button secondary"
          onClick={() => navigate("entries")}
        >
          Manage daily entries
        </button>
        <button
          className="button secondary"
          onClick={() => navigate("accounts", "Recent account activity")}
        >
          Manage account activity
        </button>
        <button
          className="button secondary"
          onClick={() => addEntry("Expense")}
        >
          Add expense
        </button>
      </div>
      {filters && (
        <Modal title="Activity filters" onClose={() => setFilters(false)}>
          <div className="form-grid">
            <label>
              From date
              <input
                aria-label="From date"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              To date
              <input
                aria-label="To date"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <label>
              Account
              <select
                aria-label="Account"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              >
                <option value="">All accounts</option>
                {p.accounts?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.active ? "" : " (archived)"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Type
              <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="all">All types</option>
                {[
                  ...new Set([
                    "income",
                    "expense",
                    "transfer",
                    ...activity.map((r) => r.type),
                  ]),
                ].map((t) => (
                  <option key={t} value={t}>
                    {t.replaceAll("-", " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => {
                setFrom("");
                setTo("");
                setAccount("");
                setType("all");
                setLimit(50);
              }}
            >
              Clear filters
            </button>
            <button
              className="button"
              onClick={() => {
                setLimit(50);
                setFilters(false);
              }}
            >
              Show results
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
