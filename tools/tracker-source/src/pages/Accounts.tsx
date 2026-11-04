import { today } from "../domain/dates";
import { cumulative, reportDate } from "../domain/calculate";
import { namedAccountBalances, netWorthSnapshot } from "../domain/net-worth";
import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Landmark,
  Plus,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { isLiability, ledgerSummary, validateLedger } from "../domain/ledger";
import type {
  Account,
  LedgerTransaction,
  AccountKind,
  LedgerKind,
} from "../domain/types";
import { store, usePlan } from "../store";
import {
  Empty,
  Field,
  Money,
  PageHead,
  Section,
  Stat,
  useUi,
} from "../components/UI";

const accountKinds: { value: AccountKind; label: string }[] = [
  { value: "bank", label: "Bank account" },
  { value: "cash", label: "Cash" },
  { value: "wallet", label: "Wallet" },
  { value: "credit-card", label: "Credit card" },
  { value: "receivable", label: "Money lent" },
  { value: "liability", label: "Loan / borrowing" },
  { value: "fixed-deposit", label: "Fixed deposit" },
  { value: "investment", label: "Investment" },
];
const transactionKinds: { value: LedgerKind; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
  { value: "lend", label: "Lend money" },
  { value: "repayment-received", label: "Repayment received" },
  { value: "borrow", label: "Borrow money" },
  { value: "principal-repayment", label: "Repay loan" },
  { value: "shopping", label: "Shopping" },
  { value: "refund", label: "Refund" },
  { value: "credit-card-purchase", label: "Credit-card purchase" },
  { value: "credit-card-payment", label: "Pay credit card" },
  { value: "fd-deposit", label: "Create / add fixed deposit" },
  { value: "fd-withdrawal", label: "Withdraw fixed deposit" },
  { value: "investment-deposit", label: "Add investment" },
  { value: "investment-withdrawal", label: "Withdraw investment" },
];

export default function Accounts() {
  const plan = usePlan(),
    { toast, confirm } = useUi();
  const accounts = plan.accounts ?? [],
    rows = plan.ledgerTransactions ?? [];
  const dateThrough = reportDate(plan);
  const result = useMemo(() => {
    try {
      return {
        summary: ledgerSummary(
          { accounts, ledgerTransactions: rows },
          dateThrough,
        ),
        worth: netWorthSnapshot(plan),
        error: "",
      };
    } catch (e) {
      return { summary: null, worth: null, error: String(e) };
    }
  }, [accounts, rows, dateThrough, plan]);
  const { summary, worth } = result;
  const namedBalances = summary ? namedAccountBalances(plan) : {};
  const savings = summary ? cumulative(plan).actual.savings : 0;
  const [editAccount, setEditAccount] = useState(""),
    [editTransaction, setEditTransaction] = useState("");
  const [creditLimit, setCreditLimit] = useState("0");
  const [linkedLoan, setLinkedLoan] = useState("");
  const [interest, setInterest] = useState("0"),
    [fee, setFee] = useState("0");
  const [category, setCategory] = useState(""),
    [original, setOriginal] = useState("");
  const [visibleCount, setVisibleCount] = useState(100);
  const startAccount = (a?: Account) => {
    setEditAccount(a?.id ?? "");
    setName(a?.name ?? "");
    setOpening(
      String(
        a
          ? isLiability(a.kind)
            ? Math.abs(a.openingBalance)
            : a.openingBalance
          : 0,
      ),
    );
    setCreditLimit(String(a?.creditLimit ?? 0));
    setLinkedLoan(a?.planLoanId ?? "");
    setAccountKind(a?.kind ?? "bank");
    setShowAccount(true);
  };
  const startTransaction = (r?: LedgerTransaction) => {
    setEditTransaction(r?.id ?? "");
    setKind(r?.kind ?? "expense");
    setDate(r?.date ?? today());
    setAmount(r ? String(r.amount) : "");
    setSource(r?.sourceAccountId ?? "");
    setDestination(r?.destinationAccountId ?? "");
    setInterest(String(r?.interestAmount ?? 0));
    setFee(String(r?.feeAmount ?? 0));
    setDescription(r?.description ?? "");
    setCategory(r?.categoryId ?? "");
    setOriginal(r?.originalTransactionId ?? "");
    setShowTransaction(true);
  };
  const remove = async (id: string, account: boolean) => {
    if (
      account &&
      (rows.some(
        (r) => r.sourceAccountId === id || r.destinationAccountId === id,
      ) ||
        plan.entries.some((e) => e.accountId === id))
    )
      return toast(
        "Remove or reassign this account’s transactions first.",
        true,
      );
    if (!account && rows.some((r) => r.originalTransactionId === id))
      return toast(
        "Remove linked refunds before deleting their purchase.",
        true,
      );
    if (
      !(await confirm(
        "Remove this record?",
        "This changes calculated balances. You can restore it using Undo or change history.",
        false,
        "Remove",
      ))
    )
      return;
    try {
      store.change(
        "Remove " + (account ? "financial account" : "account transaction"),
        (d) => {
          if (account) d.accounts = d.accounts?.filter((a) => a.id !== id);
          else
            d.ledgerTransactions = d.ledgerTransactions?.filter(
              (r) => r.id !== id,
            );
        },
      );
    } catch (e) {
      toast(String(e), true);
    }
  };
  const [showAccount, setShowAccount] = useState(false),
    [showTransaction, setShowTransaction] = useState(false);
  const [name, setName] = useState(""),
    [accountKind, setAccountKind] = useState<AccountKind>("bank");
  const [opening, setOpening] = useState("0"),
    [kind, setKind] = useState<LedgerKind>("expense");
  const [amount, setAmount] = useState(""),
    [source, setSource] = useState(""),
    [destination, setDestination] = useState("");
  const [description, setDescription] = useState(""),
    [date, setDate] = useState(today());
  const addAccount = () => {
    const value = Number(opening);
    if (!name.trim() || !Number.isFinite(value))
      return toast("Enter an account name and valid opening balance.", true);
    try {
      store.change("Add financial account", (d) => {
        d.accounts ??= [];
        d.ledgerTransactions ??= [];
        const old = d.accounts.find((a) => a.id === editAccount);
        const item = {
          ...old,
          creditLimit:
            accountKind === "credit-card" ? Number(creditLimit) : undefined,
          planLoanId:
            accountKind === "liability" ? linkedLoan : undefined,
          id: editAccount || crypto.randomUUID(),
          name: name.trim(),
          kind: accountKind,
          openingBalance: isLiability(accountKind) ? -Math.abs(value) : value,
          active: old?.active ?? true,
          note: old?.note ?? "",
        };
        if (old)
          d.accounts[d.accounts.findIndex((a) => a.id === editAccount)] = item;
        else d.accounts.push(item);
        validateLedger(d.accounts, d.ledgerTransactions);
      });
      setEditAccount("");
      setName("");
      setOpening("0");
      setShowAccount(false);
    } catch (error) {
      toast(String(error), true);
    }
  };
  const addTransaction = () => {
    const value = Number(amount);
    if (
      !date ||
      !Number.isFinite(value) ||
      value <= 0 ||
      Math.abs(Math.round(value * 100) - value * 100) > 1e-6
    )
      return toast(
        "Enter a date and positive amount with at most two decimal places.",
        true,
      );
    const both = new Set<LedgerKind>([
      "transfer",
      "lend",
      "repayment-received",
      "borrow",
      "principal-repayment",
      "fd-deposit",
      "fd-withdrawal",
      "investment-deposit",
      "investment-withdrawal",
      "credit-card-payment",
    ]);
    if (
      (both.has(kind) && (!source || !destination)) ||
      (kind === "income" && !destination) ||
      (["expense", "shopping"].includes(kind) && !source) ||
      (kind === "credit-card-purchase" && !destination)
    )
      return toast(
        "Choose the required source and destination accounts.",
        true,
      );
    try {
      store.change("Add account transaction", (d) => {
        d.accounts ??= [];
        d.ledgerTransactions ??= [];
        const previous = d.ledgerTransactions.find(
          (r) => r.id === editTransaction,
        );
        const item = {
          ...previous,
          id: editTransaction || crypto.randomUUID(),
          date,
          kind,
          amount: value,
          sourceAccountId: ["income", "credit-card-purchase", "refund"].includes(kind) ? undefined : source || undefined,
          destinationAccountId: ["expense", "shopping"].includes(kind) ? undefined : destination || undefined,
          interestAmount: [
            "principal-repayment",
            "fd-withdrawal",
            "investment-withdrawal",
          ].includes(kind)
            ? Number(interest)
            : 0,
          feeAmount: [
            "transfer",
            "lend",
            "repayment-received",
            "borrow",
            "principal-repayment",
            "fd-deposit",
            "fd-withdrawal",
            "investment-deposit",
            "investment-withdrawal",
            "credit-card-payment",
          ].includes(kind)
            ? Number(fee)
            : 0,
          categoryId: category || undefined,
          originalTransactionId:
            kind === "refund" ? original || undefined : undefined,
          description:
            description.trim() ||
            transactionKinds.find((x) => x.value === kind)?.label ||
            "Transaction",
          note: previous?.note ?? "",
        };
        if (previous)
          d.ledgerTransactions[
            d.ledgerTransactions.findIndex((r) => r.id === editTransaction)
          ] = item;
        else d.ledgerTransactions.push(item);
        validateLedger(d.accounts, d.ledgerTransactions);
      });
      setAmount("");
      setDescription("");
      setShowTransaction(false);
    } catch (error) {
      toast(String(error), true);
    }
  };
  return (
    <div className="page accounts-page">
      <PageHead
        eyebrow="SHARED MONEY LEDGER"
        title="Accounts & transactions"
        description="Track where money lives and move it without counting transfers, loan principal or card payments twice."
        action={
          <div className="page-actions">
            <button className="button secondary" onClick={() => startAccount()}>
              <Plus size={18} /> Account
            </button>
            <button
              className="button"
              disabled={!accounts.length}
              onClick={() => startTransaction()}
            >
              <Plus size={18} /> Transaction
            </button>
          </div>
        }
      />
      <p>
        As of {dateThrough} · Uses the Dashboard report date. Cash, bank and
        wallet opening balances allocate the total opening savings in Budget &
        Plan. Record a transaction once, in Entries or Accounts.
      </p>
      {result.error && (
        <div role="alert">
          Balances unavailable: {result.error} Correct the records below or use
          Undo. No data has been removed.
        </div>
      )}
      {summary && worth && (
        <>
          <div className="stats-grid ledger-stats">
            <Stat
              label={worth.estimated ? "Estimated net worth" : "Net worth"}
              value={worth.netWorth}
              caption="Assets less liabilities"
              icon={<WalletCards />}
            />
            <Stat
              label="Assets"
              value={worth.assets}
              caption="Cash, PF and other assets"
              tone="green"
              icon={<Landmark />}
            />
            <Stat
              label="Liabilities"
              value={worth.liabilities}
              caption="Ledger debt and plan loan principal"
              tone="orange"
              icon={<ReceiptText />}
            />
            <Stat
              label="Net savings"
              value={savings}
              caption="All recorded income less expenses; includes Entries"
              tone="blue"
              icon={<ArrowLeftRight />}
            />
          </div>
          <p>
            Cash: <Money value={worth.cash} /> · PF: <Money value={worth.pf} />{" "}
            · Unallocated cash: <Money value={worth.unallocatedCash} />. Entries
            without a named account affect unallocated cash and net worth.{" "}
            {worth.estimated
              ? "Plan loan principal includes a proportional estimate because the repayment agreement has no principal allocation."
              : ""}{" "}
            For a loan already in Loan & Closure, select it under Existing plan
            loan; record its payments there.
          </p>
        </>
      )}
      {showAccount && (
        <Section
          title={editAccount ? "Edit account" : "Add an account"}
          caption="Enter card/loan outstanding as a positive amount; it is stored as debt. Liquid openings allocate total opening savings. FDs and investments show recorded cost, not market value."
        >
          <div className="form-grid three">
            <Field label="Account name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Salary bank"
              />
            </Field>
            <Field label="Account type">
              <select
                value={accountKind}
                onChange={(e) => setAccountKind(e.target.value as AccountKind)}
              >
                {accountKinds.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
            </Field>
            {accountKind === "liability" && (
              <Field label="Existing plan loan">
                <select
                  value={linkedLoan}
                  onChange={(e) => setLinkedLoan(e.target.value)}
                >
                  <option value="">Separate loan</option>
                  <option value="original">Original plan loan</option>
                  {plan.additionalLoans?.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {accountKind === "credit-card" && (
              <Field label="Credit limit">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                />
              </Field>
            )}
            <Field label="Opening balance">
              <input
                type="number"
                step="0.01"
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
              />
            </Field>
          </div>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setShowAccount(false)}
            >
              Cancel
            </button>
            <button className="button" onClick={addAccount}>
              Save account
            </button>
          </div>
        </Section>
      )}
      {showTransaction && (
        <Section
          title="Record a transaction"
          caption="Transfers and principal movements affect balances but not income or spending. For Repay loan, Amount is principal only; enter interest and fees separately."
        >
          <div className="form-grid three">
            <Field label="Type">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as LedgerKind)}
              >
                {transactionKinds.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Amount">
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="From account">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="">Not applicable</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="To account">
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                <option value="">Not applicable</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            {[
              "principal-repayment",
              "fd-withdrawal",
              "investment-withdrawal",
            ].includes(kind) && (
              <Field label="Interest">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                />
              </Field>
            )}
            {[
              "transfer",
              "lend",
              "repayment-received",
              "borrow",
              "principal-repayment",
              "fd-deposit",
              "fd-withdrawal",
              "investment-deposit",
              "investment-withdrawal",
              "credit-card-payment",
            ].includes(kind) && (
              <Field label="Fees">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                />
              </Field>
            )}
            <Field label="Budget category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Uncategorized account activity</option>
                {plan.categories
                  .filter((c) => c.group !== "Asset")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
            {kind === "refund" && (
              <Field label="Original purchase">
                <select
                  value={original}
                  onChange={(e) => setOriginal(e.target.value)}
                >
                  <option value="">Choose purchase</option>
                  {rows
                    .filter((r) =>
                      ["expense", "shopping", "credit-card-purchase"].includes(
                        r.kind,
                      ),
                    )
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.date} · {r.description} · {r.amount}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            <Field label="Description">
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional note"
              />
            </Field>
          </div>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setShowTransaction(false)}
            >
              Cancel
            </button>
            <button className="button" onClick={addTransaction}>
              Save transaction
            </button>
          </div>
        </Section>
      )}
      <Section
        title="Your accounts"
        caption="Named balances through the report date. Unassigned Entries are shown separately as unallocated cash."
      >
        {!accounts.length ? (
          <Empty
            title="No shared accounts yet"
            detail="Add your cash, bank, wallet, cards, loans or investments to begin. Your existing tracker entries remain unchanged."
            action={
              <button className="button" onClick={() => startAccount()}>
                Add first account
              </button>
            }
          />
        ) : (
          <div className="account-card-grid">
            {accounts.map((a) => (
              <article className="account-card" key={a.id}>
                <span>
                  {accountKinds.find((x) => x.value === a.kind)?.label}
                </span>
                <h3>{a.name}</h3>
                <strong>
                  {a.planLoanId ? (
                    "Included in plan loan total"
                  ) : summary ? (
                    <Money value={namedBalances[a.id] ?? 0} decimals={2} />
                  ) : (
                    "Unavailable"
                  )}
                </strong>
                {a.kind === "credit-card" && a.creditLimit !== undefined && (
                  <p>
                    Limit: <Money value={a.creditLimit} /> · Available:{" "}
                    {summary ? (
                      <Money
                        value={Math.max(
                          0,
                          a.creditLimit + (summary.balances[a.id] ?? 0),
                        )}
                      />
                    ) : (
                      "Unavailable"
                    )}
                  </p>
                )}
                <button
                  className="button small secondary"
                  onClick={() => startAccount(a)}
                >
                  Edit account
                </button>
                <button
                  className="button small secondary"
                  onClick={() => void remove(a.id, true)}
                >
                  Remove account
                </button>
              </article>
            ))}
          </div>
        )}
      </Section>
      <Section
        title="Recent account activity"
        caption="A balance-safe audit trail shared by web, Windows and Android."
      >
        {!rows.length ? (
          <Empty
            title="No account transactions"
            detail="Income, expenses and movements recorded here will appear on every signed-in device."
          />
        ) : (
          <div className="ledger-list">
            {[...rows]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, visibleCount)
              .map((r) => (
                <article key={r.id}>
                  <div>
                    <strong>{r.description}</strong>
                    <span>
                      {r.date} ·{" "}
                      {transactionKinds.find((x) => x.value === r.kind)?.label}
                    </span>
                  </div>
                  <Money value={r.amount} decimals={2} />
                  <button
                    className="button small secondary"
                    onClick={() => startTransaction(r)}
                  >
                    Edit transaction
                  </button>
                  <button
                    className="button small secondary"
                    onClick={() => void remove(r.id, false)}
                  >
                    Remove transaction
                  </button>
                </article>
              ))}
          </div>
        )}
      </Section>
      {rows.length > visibleCount && (
        <button
          className="button secondary"
          onClick={() => setVisibleCount(visibleCount + 100)}
        >
          Show more transactions
        </button>
      )}
    </div>
  );
}
