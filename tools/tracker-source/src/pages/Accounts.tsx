import { userError } from '../domain/user-error';
import { nextBillDueMonth, offScheduleBillLinks } from '../domain/bill-schedule';
import { FinancialPosition } from "../components/FinancialPosition";
import { usePhone } from "../components/usePhone";
import { monthEnd, today } from "../domain/dates";
import { money, reportDate } from "../domain/calculate";
import { namedAccountBalances, netWorthSnapshot } from "../domain/net-worth";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import {
  ledgerTransactionLocked,
  openingAccountTotal,
  reverseLedgerTransaction,
  isLiability,
  ledgerSummary,
  validateLedger,
} from "../domain/ledger";
import type {
  Account,
  LedgerTransaction,
  AccountKind,
  LedgerKind,
} from "../domain/types";
import { store, useEnvelope, usePlan } from "../store";
import {
  Empty,
  Field,
  Money,
  PageHead,
  Section,
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

export default function Accounts({ initialTransfer = false }: { initialTransfer?: boolean }) {
  const plan = usePlan(),
    { toast, confirm } = useUi();
  const env = useEnvelope();
  const phone = usePhone();
  const [showHistory, setShowHistory] = useState(false);
  const [accountNote, setAccountNote] = useState(""),
    [accountActive, setAccountActive] = useState(true);
  const [reversing, setReversing] = useState(""),
    [reversalDate, setReversalDate] = useState(today()),
    [reversalReason, setReversalReason] = useState("");
  const accounts = plan.accounts ?? [],
    rows = plan.ledgerTransactions ?? [];
  const dateThrough = reportDate(plan);
  const billLinkWarnings = offScheduleBillLinks(plan);
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
  const { summary } = result;
  const namedBalances = summary ? namedAccountBalances(plan) : {};

  const [editAccount, setEditAccount] = useState(""),
    [editTransaction, setEditTransaction] = useState("");
  const [creditLimit, setCreditLimit] = useState("0");
  const [linkedLoan, setLinkedLoan] = useState("");
  const [interest, setInterest] = useState("0"),
    [fee, setFee] = useState("0");
  const [incomeCategory, setIncomeCategory] = useState(""),
    [expenseCategory, setExpenseCategory] = useState("");
  const [billDueMonth, setBillDueMonth] = useState("");
  const [original, setOriginal] = useState("");
  const [visibleCount, setVisibleCount] = useState(25);
  const [accountQuery, setAccountQuery] = useState("");
  const [accountSort, setAccountSort] = useState("balance-desc");
  const [ledgerQuery, setLedgerQuery] = useState("");
  const [ledgerKind, setLedgerKind] = useState<LedgerKind | "all">("all");
  const [ledgerSort, setLedgerSort] = useState("date-desc");
  const visibleAccounts = useMemo(() => {
    const query = accountQuery.trim().toLowerCase();
    return accounts
      .filter((a) => !query || `${a.name} ${a.note} ${a.kind}`.toLowerCase().includes(query))
      .sort((a, b) => accountSort === "name" ? a.name.localeCompare(b.name) : accountSort === "balance-asc" ? (namedBalances[a.id] ?? 0) - (namedBalances[b.id] ?? 0) : (namedBalances[b.id] ?? 0) - (namedBalances[a.id] ?? 0));
  }, [accounts, accountQuery, accountSort, namedBalances]);
  const visibleRows = useMemo(() => {
    const query = ledgerQuery.trim().toLowerCase();
    return [...rows]
      .filter((r) => (ledgerKind === "all" || r.kind === ledgerKind) && (!query || `${r.description} ${r.note} ${r.date}`.toLowerCase().includes(query)))
      .sort((a, b) => ledgerSort === "date-asc" ? a.date.localeCompare(b.date) : ledgerSort === "amount-desc" ? b.amount - a.amount : ledgerSort === "amount-asc" ? a.amount - b.amount : b.date.localeCompare(a.date));
  }, [rows, ledgerQuery, ledgerKind, ledgerSort]);
  const startAccount = (a?: Account) => {
    setEditAccount(a?.id ?? "");
    setName(a?.name ?? "");
    setAccountNote(a?.note ?? "");
    setAccountActive(a?.active ?? true);
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
    if (r && ledgerTransactionLocked(plan, r))
      return toast(
        "This posting is protected by reconciliation or reversal. Use Reverse transaction to retain its history.",
        true,
      );
    setEditTransaction(r?.id ?? "");
    setKind(r?.kind ?? "expense");
    setDate(r?.date ?? today());
    setAmount(r ? String(r.amount) : "");
    setSource(r?.sourceAccountId ?? "");
    setDestination(r?.destinationAccountId ?? "");
    setInterest(String(r?.interestAmount ?? 0));
    setFee(String(r?.feeAmount ?? 0));
    setDescription(r?.description ?? "");
    const legacy = plan.categories.find((c) => c.id === r?.categoryId);
    setIncomeCategory(
      r?.incomeCategoryId ??
        (legacy?.group === "Income" ? (r?.categoryId ?? "") : ""),
    );
    setExpenseCategory(
      r?.expenseCategoryId ??
        (legacy && legacy.group !== "Income" ? (r?.categoryId ?? "") : ""),
    );
    setBillDueMonth(r?.billDueMonth ?? "");
    setOriginal(r?.originalTransactionId ?? "");
    setShowTransaction(true);
  };
  const remove = async (id: string, account: boolean) => {
    const posting = rows.find((r) => r.id === id);
    if (!account && posting && ledgerTransactionLocked(plan, posting))
      return toast(
        "This posting is protected. Use Reverse transaction instead.",
        true,
      );
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
    [showTransaction, setShowTransaction] = useState(initialTransfer);
  const [name, setName] = useState(""),
    [accountKind, setAccountKind] = useState<AccountKind>("bank");
  const [opening, setOpening] = useState("0"),
    [kind, setKind] = useState<LedgerKind>(initialTransfer ? "transfer" : "expense");
  const [amount, setAmount] = useState(""),
    [source, setSource] = useState(""),
    [destination, setDestination] = useState("");
  const [description, setDescription] = useState(""),
    [date, setDate] = useState(today());
  const previewBalance = (() => {
    try {
      const signed = isLiability(accountKind)
        ? -Math.abs(Number(opening))
        : Number(opening);
      const candidate = structuredClone(plan);
      const item: Account = {
        id: editAccount || "__preview",
        name: name.trim() || "New account preview",
        kind: accountKind,
        openingBalance: signed,
        active: accountActive,
        note: accountNote,
      };
      candidate.accounts = [
        ...accounts.filter((a) => a.id !== editAccount),
        item,
      ];
      if (candidate.settings.openingFromAccounts)
        candidate.settings.opening = openingAccountTotal(candidate);
      return {
        balance: namedAccountBalances(candidate)[item.id] ?? 0,
        opening: candidate.settings.opening,
      };
    } catch {
      return null;
    }
  })();
  const addAccount = async () => {
    const value = Number(opening);
    if (!name.trim() || !Number.isFinite(value))
      return toast("Enter an account name and valid opening balance.", true);
    if (
      editAccount &&
      !(await confirm(
        "Save account correction?",
        `Opening balance: ${money(accounts.find((a) => a.id === editAccount)?.openingBalance ?? 0)} → ${money(isLiability(accountKind) ? -Math.abs(value) : value)}. ${plan.settings.openingFromAccounts ? "Total opening cash recalculates from named liquid accounts." : "Total opening cash stays in Budget & Plan."} This correction is recorded in change history.`,
        false,
        "Save correction",
      ))
    )
      return;
    try {
      store.change(
        editAccount ? "Correct financial account" : "Add financial account",
        (d) => {
          d.accounts ??= [];
          d.ledgerTransactions ??= [];
          const old = d.accounts.find((a) => a.id === editAccount);
          const item = {
            ...old,
            creditLimit:
              accountKind === "credit-card" ? Number(creditLimit) : undefined,
            planLoanId: accountKind === "liability" ? linkedLoan : undefined,
            id: editAccount || crypto.randomUUID(),
            name: name.trim(),
            kind: accountKind,
            openingBalance: isLiability(accountKind) ? -Math.abs(value) : value,
            active: accountActive,
            note: accountNote,
          };
          if (old)
            d.accounts[d.accounts.findIndex((a) => a.id === editAccount)] =
              item;
          else d.accounts.push(item);
          validateLedger(d.accounts, d.ledgerTransactions);
        },
      );
      setEditAccount("");
      setName("");
      setOpening("0");
      setShowAccount(false);
    } catch (error) {
      toast(userError(error), true);
    }
  };
  const activeBill = ["expense", "shopping", "credit-card-purchase"].includes(
    kind,
  )
    ? plan.provisions?.find(
        (r) => r.enabled && r.categoryId === expenseCategory,
      )
    : undefined;
  const hasIncome =
    kind === "income" ||
    (["fd-withdrawal", "investment-withdrawal"].includes(kind) &&
      Number(interest) > 0);
  const hasExpenses =
    ["expense", "shopping", "credit-card-purchase"].includes(kind) ||
    Number(fee) > 0 ||
    (kind === "principal-repayment" && Number(interest) > 0);
  const transactionSubmitLock = useRef(false);
  const [transactionSubmitting, setTransactionSubmitting] = useState(false);
  useEffect(() => {
    if (!initialTransfer) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById('account-transaction-form')?.scrollIntoView({block: 'start'});
    });
    return () => cancelAnimationFrame(frame);
  }, [initialTransfer]);
  const addTransaction = async () => {
    if (transactionSubmitLock.current) return;
    transactionSubmitLock.current = true;
    setTransactionSubmitting(true);
    try {
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
    const category = kind === "income" ? incomeCategory : expenseCategory;
    const duplicate = (plan.ledgerTransactions ?? []).some(t => t.id !== editTransaction && t.date === date && t.kind === kind && Math.round(t.amount * 100) === Math.round(value * 100) && t.sourceAccountId === (source || undefined) && t.destinationAccountId === (destination || undefined)) || plan.entries.some(e => e.date === date && e.categoryId === category && Math.round(e.amount * 100) === Math.round(value * 100));
    if (duplicate && !(await confirm("Possible duplicate transaction", "A matching amount and date already exists in Daily Entries or Accounts. Review it before saving another record.", false, "Save anyway"))) return;
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
          sourceAccountId: [
            "income",
            "credit-card-purchase",
            "refund",
          ].includes(kind)
            ? undefined
            : source || undefined,
          destinationAccountId: ["expense", "shopping"].includes(kind)
            ? undefined
            : destination || undefined,
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
          categoryId:
            kind === "refund"
              ? rows.find((r) => r.id === original)?.categoryId
              : (hasExpenses ? expenseCategory : incomeCategory) || undefined,
          incomeCategoryId:
            kind === "refund" ? "" : hasIncome ? incomeCategory : "",
          expenseCategoryId:
            kind === "refund" ? "" : hasExpenses ? expenseCategory : "",
          provisionId: activeBill && billDueMonth ? activeBill.id : "",
          billDueMonth: activeBill && billDueMonth ? billDueMonth : "",
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
      toast(userError(error), true);
    }
    } finally {
      transactionSubmitLock.current = false;
      setTransactionSubmitting(false);
    }
  };
  return (
    <div className="page accounts-page">
      <PageHead
        eyebrow="SHARED MONEY LEDGER"
        title="Accounts & transactions"
        description="See your account balances and record income, spending or transfers."
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
      {billLinkWarnings.length > 0 && <div className="callout" role="status">
        {billLinkWarnings.length} bill payment {billLinkWarnings.length === 1 ? 'links' : 'link'} to a month outside its provision schedule.
        {' '}Review the Bill due month on these transactions. Saved records have been kept.
      </div>}
      <p>
        Uses the same report date and balances as your Dashboard. Record each
        transaction once, in Daily Entries or here.
      </p>
      {result.error && (
        <div role="alert">
          Balances unavailable: {result.error} Correct the records below or use
          Undo. No data has been removed.
        </div>
      )}
      <FinancialPosition />
      {phone ? (
        <details className="android-account-settings">
          <summary>Opening balances &amp; history</summary>
      <Section
        title="Opening balance source"
        caption="Use one total. Account openings are amounts at the plan start, not today’s balances."
      >
        <p>
          Current opening savings: {money(plan.settings.opening)} · Sum of named
          liquid openings: {money(openingAccountTotal(plan))}.
        </p>
        <button
          className="button secondary"
          onClick={async () => {
            const total = openingAccountTotal(plan);
            if (
              await confirm(
                "Use named account opening balances?",
                `Opening savings will become ${money(total)}. For example, a bank opening of ₹1,000 plus a separate wallet opening of ₹250 totals ₹1,250. Account opening edits will update the Dashboard automatically. No income or expenses will be created.`,
                false,
                "Use account openings",
              )
            )
              store.change("Use named accounts for opening savings", (d) => {
                d.settings.openingFromAccounts = true;
              });
          }}
        >
          Use account openings as total savings
        </button>
        <button
          className="button secondary"
          onClick={() => setShowHistory(!showHistory)}
        >
          View account change history
        </button>
      </Section>

        </details>
      ) : (
      <Section
        title="Opening balance source"
        caption="Use one total. Account openings are amounts at the plan start, not today’s balances."
      >
        <p>
          Current opening savings: {money(plan.settings.opening)} · Sum of named
          liquid openings: {money(openingAccountTotal(plan))}.
        </p>
        <button
          className="button secondary"
          onClick={async () => {
            const total = openingAccountTotal(plan);
            if (
              await confirm(
                "Use named account opening balances?",
                `Opening savings will become ${money(total)}. For example, a bank opening of ₹1,000 plus a separate wallet opening of ₹250 totals ₹1,250. Account opening edits will update the Dashboard automatically. No income or expenses will be created.`,
                false,
                "Use account openings",
              )
            )
              store.change("Use named accounts for opening savings", (d) => {
                d.settings.openingFromAccounts = true;
              });
          }}
        >
          Use account openings as total savings
        </button>
        <button
          className="button secondary"
          onClick={() => setShowHistory(!showHistory)}
        >
          View account change history
        </button>
      </Section>

      )}
      {showHistory && (
        <Section
          title="Account change history"
          caption="Edits, reversals and removals are stored in this device’s change history. Undo is available in the toolbar."
        >
          {[...env.audit]
            .reverse()
            .filter((a) =>
              a.changes.some((c) =>
                ["accounts", "ledgerTransactions"].includes(String(c.path[0])),
              ),
            )
            .map((a) => (
              <details key={a.id}>
                <summary>
                  {a.at} · {a.label}
                </summary>
                {a.changes.map((c, i) => (
                  <p key={i}>
                    {c.path.join(" → ")}: {JSON.stringify(c.before)} →{" "}
                    {JSON.stringify(c.after)}
                  </p>
                ))}
              </details>
            ))}
        </Section>
      )}
      {reversing && (
        <Section
          title="Reverse transaction"
          caption="The original posting remains unchanged. A dated inverse posting corrects balances and income/expenses."
        >
          <Field label="Reversal date">
            <input aria-label="Reversal date"
              type="date"
              min={`${plan.settings.planStart}-01`}
              max={monthEnd(plan.settings.planEnd)}
              value={reversalDate}
              onChange={(e) => setReversalDate(e.target.value)}
            />
          </Field>
          <Field label="Correction reason">
            <input aria-label="Correction reason"
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
            />
          </Field>
          <button
            className="button"
            onClick={() => {
              try {
                store.change("Reverse reconciled account transaction", (d) => {
                  reverseLedgerTransaction(
                    d,
                    reversing,
                    reversalDate,
                    reversalReason,
                  );
                });
                setReversing("");
                setReversalReason("");
              } catch (e) {
                toast(String(e), true);
              }
            }}
          >
            Save reversal
          </button>
          <button className="button secondary" onClick={() => setReversing("")}>
            Cancel reversal
          </button>
        </Section>
      )}
      {showAccount && (
        <Section
          title={editAccount ? "Edit account" : "Add an account"}
          caption="Enter card/loan outstanding as a positive amount; it is stored as debt. Liquid openings allocate total opening savings. FDs and investments show recorded cost, not market value."
        >
          <div className="form-grid three">
            <Field label="Account name">
              <input aria-label="Account name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Salary bank"
              />
            </Field>
            <Field label="Account type">
              <select aria-label="Account type"
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
                <select aria-label="Existing plan loan"
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
                <input aria-label="Credit limit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                />
              </Field>
            )}
            <Field label="Opening balance">
              <input aria-label="Opening balance"
                type="number"
                step="0.01"
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Account notes">
            <textarea aria-label="Account notes"
              value={accountNote}
              onChange={(e) => setAccountNote(e.target.value)}
            />
          </Field>
          <label>
            <input
              type="checkbox"
              checked={accountActive}
              onChange={(e) => setAccountActive(e.target.checked)}
            />{" "}
            Active account (archived balances remain included)
          </label>
          {previewBalance && (
            <p>
              Resulting account balance: {money(previewBalance.balance)} · Total
              opening savings after this change: {money(previewBalance.opening)}
              .
            </p>
          )}
          <p>
            Opening balance to save:{" "}
            {money(
              isLiability(accountKind)
                ? -Math.abs(Number(opening) || 0)
                : Number(opening) || 0,
            )}
            .{" "}
            {plan.settings.openingFromAccounts
              ? "The Dashboard opening total will follow named liquid account openings."
              : "This allocates the existing opening total; use account openings above to make them authoritative."}
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setShowAccount(false)}
            >
              Cancel
            </button>
            <button className="button" onClick={() => void addAccount()}>
              Save account
            </button>
          </div>
        </Section>
      )}
      {showTransaction && (
        <div id="account-transaction-form">
        <Section
          title="Record a transaction"
          caption="Transfers and principal movements affect balances but not income or spending. For Repay loan, Amount is principal only; enter interest and fees separately."
        >
          <div className="form-grid three">
            <Field label="Type">
              <select aria-label="Type"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as LedgerKind);
                  setIncomeCategory("");
                  setExpenseCategory("");
                  setBillDueMonth("");
                  setInterest("0");
                  setFee("0");
                }}
              >
                {transactionKinds
                  .filter((x) => x.value !== "reversal")
                  .map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Date">
              <input aria-label="Date"
                type="date"
                min={`${plan.settings.planStart}-01`}
                max={monthEnd(plan.settings.planEnd)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="Amount">
              <input aria-label="Amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="From account">
              <select aria-label="From account"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="">Not applicable</option>
                {accounts
                  .filter(
                    (a) => a.active || a.id === source || a.id === destination,
                  )
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="To account">
              <select aria-label="To account"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                <option value="">Not applicable</option>
                {accounts
                  .filter(
                    (a) => a.active || a.id === source || a.id === destination,
                  )
                  .map((a) => (
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
                <input aria-label="Interest"
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
                <input aria-label="Fees"
                  type="number"
                  min="0"
                  step="0.01"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                />
              </Field>
            )}
            {kind !== "refund" && hasIncome && (
              <Field label="Income category">
                <select aria-label="Income category"
                  value={incomeCategory}
                  onChange={(e) => setIncomeCategory(e.target.value)}
                >
                  <option value="">Uncategorized income</option>
                  {plan.categories
                    .filter(
                      (c) =>
                        c.group === "Income" &&
                        !["emi", "closure"].includes(c.role),
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            {kind !== "refund" && hasExpenses && (
              <Field label="Expense category">
                <select aria-label="Expense category"
                  value={expenseCategory}
                  onChange={(e) => {
                    setExpenseCategory(e.target.value);
                    const provision = plan.provisions?.find(
                      (r) => r.enabled && r.categoryId === e.target.value,
                    );
                    setBillDueMonth(
                      provision
                        ? nextBillDueMonth(provision, date.slice(0, 7))
                        : "",
                    );
                  }}
                >
                  <option value="">Uncategorized expenses</option>
                  {plan.categories
                    .filter(
                      (c) =>
                        ["Living", "Debt"].includes(c.group) &&
                        !["emi", "closure"].includes(c.role),
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            {activeBill && (
              <Field
                label="Bill due month"
                hint="Choose the bill this payment covers, especially when paying in advance."
              >
                <input
                  type="month"
                  aria-label="Bill due month"
                  value={billDueMonth}
                  onChange={(e) => setBillDueMonth(e.target.value)}
                />
              </Field>
            )}
            <p>
              Installment and loan closure payments belong in Loan & Closure,
              where their receipt is linked to an installment. Refunds inherit
              the purchase category.
            </p>
            {kind === "refund" && (
              <Field label="Original purchase">
                <select aria-label="Original purchase"
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
              <input aria-label="Description"
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
            <button className="button" disabled={transactionSubmitting} onClick={addTransaction}>
              {transactionSubmitting ? "Saving…" : "Save transaction"}
            </button>
          </div>
        </Section>
        </div>
      )}
      <Section
        title="Your accounts"
        caption="Named balances through the report date. Unassigned Entries are shown separately as unallocated cash."
      >
        <div className="ledger-toolbar" aria-label="Account filters">
          <label className="toolbar-search"><Search size={16} /><span className="sr-only">Search accounts</span><input value={accountQuery} onChange={(e) => setAccountQuery(e.target.value)} placeholder="Search accounts" /></label>
          <label className="toolbar-select"><ArrowUpDown size={15} /><span className="sr-only">Sort accounts</span><select value={accountSort} onChange={(e) => setAccountSort(e.target.value)}><option value="balance-desc">Highest balance</option><option value="balance-asc">Lowest balance</option><option value="name">Name A–Z</option></select></label>
          <span className="toolbar-count">{visibleAccounts.length} account{visibleAccounts.length === 1 ? '' : 's'}</span>
        </div>
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
            {visibleAccounts.map((a) => (
                <article className="account-card" key={a.id}>
                  <span>
                    {accountKinds.find((x) => x.value === a.kind)?.label}
                  </span>
                  <h3>{a.name}</h3>
                  <p>
                    {a.active ? "Active" : "Archived"} · {a.note}
                  </p>
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
        <div className="ledger-toolbar" aria-label="Transaction filters">
          <label className="toolbar-search"><Search size={16} /><span className="sr-only">Search transactions</span><input value={ledgerQuery} onChange={(e) => { setLedgerQuery(e.target.value); setVisibleCount(25); }} placeholder="Search description or date" /></label>
          <label className="toolbar-select"><SlidersHorizontal size={15} /><span className="sr-only">Filter transaction type</span><select value={ledgerKind} onChange={(e) => { setLedgerKind(e.target.value as LedgerKind | 'all'); setVisibleCount(25); }}><option value="all">All types</option>{transactionKinds.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
          <label className="toolbar-select"><ArrowUpDown size={15} /><span className="sr-only">Sort transactions</span><select value={ledgerSort} onChange={(e) => setLedgerSort(e.target.value)}><option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="amount-desc">Largest amount</option><option value="amount-asc">Smallest amount</option></select></label>
          <span className="toolbar-count">{visibleRows.length} matching transaction{visibleRows.length === 1 ? '' : 's'}</span>
        </div>
        {!rows.length ? (
          <Empty
            title="No account transactions"
            detail="Income, expenses and movements recorded here will appear on every signed-in device."
          />
        ) : (
          <div className="ledger-list">
            {visibleRows
              .slice(0, visibleCount)
              .map((r) => (
                <article key={r.id}>
                  <div>
                    <strong>{r.description}</strong>
                    <span>
                      {r.date} ·{" "}
                      {r.kind === "reversal"
                        ? "Reversal"
                        : transactionKinds.find((x) => x.value === r.kind)
                            ?.label}
                    </span>
                  </div>
                  <Money value={r.amount} decimals={2} />
                  {ledgerTransactionLocked(plan, r) && (
                    <span>Protected posting</span>
                  )}
                  {r.kind !== "reversal" &&
                    !rows.some((x) => x.reversalOfId === r.id) && (
                      <button
                        className="button small secondary"
                        onClick={() => {
                          setReversing(r.id);
                          setReversalDate(today());
                          setReversalReason("");
                        }}
                      >
                        Reverse transaction
                      </button>
                    )}
                  <button
                    className="button small secondary"
                    onClick={() => startTransaction(r)}
                  >
                    {r.kind === "reversal"
                      ? "View protected reversal"
                      : "Edit transaction"}
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
      {visibleRows.length > visibleCount && (
        <button
          className="button secondary"
          onClick={() => setVisibleCount((count) => count + 25)}
        >
          Show more transactions ({Math.min(25, visibleRows.length - visibleCount)} of {visibleRows.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
}
