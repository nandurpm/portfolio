import type { Account, LedgerTransaction, Plan } from "./types";
import { today, validDate } from "./dates";
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const liquidKinds: Account["kind"][] = ["cash", "bank", "wallet"];
export const isLiability = (kind: Account["kind"]) =>
  ["credit-card", "liability"].includes(kind);

const cents = (value: number) => {
  if (!Number.isFinite(value) || value < 0 || value > 1e12)
    throw Error("Use a valid non-negative amount.");
  if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-6)
    throw Error("Use at most two decimal places.");
  return Math.round(value * 100);
};
const money = (value: number) => value / 100;

export interface LedgerSummary {
  balances: Record<string, number>;
  income: number;
  expenses: number;
  assets: number;
  liabilities: number;
  netWorth: number;
  receivables: number;
  investments: number;
}

export function validateLedger(
  accounts: Account[],
  transactions: LedgerTransaction[],
) {
  const accountIds = new Set(accounts.map((account) => account.id));
  if (accountIds.size !== accounts.length)
    throw Error("Account IDs must be unique.");
  if (
    new Set(accounts.map((account) => account.name.trim().toLowerCase()))
      .size !== accounts.length
  )
    throw Error("Account names must be unique.");
  if (
    new Set(transactions.map((transaction) => transaction.id)).size !==
    transactions.length
  )
    throw Error("Ledger transaction IDs must be unique.");
  const ids = new Set(transactions.map((transaction) => transaction.id));
  const requiresBoth = new Set<LedgerTransaction["kind"]>([
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
  for (const account of accounts) cents(Math.abs(account.openingBalance));
  const type = (id?: string) => accounts.find((a) => a.id === id)?.kind;
  for (const transaction of transactions) {
    if (!validDate(transaction.date))
      throw Error("Use a valid transaction date.");
    cents(transaction.amount);
    cents(transaction.interestAmount ?? 0);
    cents(transaction.feeAmount ?? 0);
    if (transaction.amount <= 0)
      throw Error("Ledger amounts must be positive.");
    for (const id of [
      transaction.sourceAccountId,
      transaction.destinationAccountId,
    ])
      if (id && !accountIds.has(id))
        throw Error("A ledger transaction refers to a missing account.");
    if (
      transaction.sourceAccountId &&
      transaction.sourceAccountId === transaction.destinationAccountId
    )
      throw Error("Source and destination accounts must differ.");
    if (
      requiresBoth.has(transaction.kind) &&
      (!transaction.sourceAccountId || !transaction.destinationAccountId)
    )
      throw Error(
        "This transaction needs both source and destination accounts.",
      );
    if (transaction.kind === "income" && !transaction.destinationAccountId)
      throw Error("Income needs a destination account.");
    if (
      ["expense", "shopping"].includes(transaction.kind) &&
      !transaction.sourceAccountId
    )
      throw Error("An expense needs a source account.");
    if (
      transaction.kind === "credit-card-purchase" &&
      !transaction.destinationAccountId
    )
      throw Error("A credit-card purchase needs a card liability account.");
    const requireType = (id: string | undefined, kinds: Account["kind"][]) => {
      if (!kinds.includes(type(id)!))
        throw Error("Choose an account of the correct type for this movement.");
    };
    const liquid = (id?: string) => requireType(id, liquidKinds);
    switch (transaction.kind) {
      case "income":
        liquid(transaction.destinationAccountId);
        break;
      case "expense":
      case "shopping":
        liquid(transaction.sourceAccountId);
        break;
      case "transfer":
        liquid(transaction.sourceAccountId);
        liquid(transaction.destinationAccountId);
        break;
      case "lend":
        liquid(transaction.sourceAccountId);
        requireType(transaction.destinationAccountId, ["receivable"]);
        break;
      case "repayment-received":
        requireType(transaction.sourceAccountId, ["receivable"]);
        liquid(transaction.destinationAccountId);
        break;
      case "borrow":
        requireType(transaction.sourceAccountId, ["liability"]);
        liquid(transaction.destinationAccountId);
        break;
      case "principal-repayment":
        liquid(transaction.sourceAccountId);
        requireType(transaction.destinationAccountId, ["liability"]);
        break;
      case "credit-card-purchase":
        requireType(transaction.destinationAccountId, ["credit-card"]);
        break;
      case "credit-card-payment":
        liquid(transaction.sourceAccountId);
        requireType(transaction.destinationAccountId, ["credit-card"]);
        break;
      case "fd-deposit":
      case "investment-deposit":
        liquid(transaction.sourceAccountId);
        requireType(transaction.destinationAccountId, [
          transaction.kind === "fd-deposit" ? "fixed-deposit" : "investment",
        ]);
        break;
      case "fd-withdrawal":
      case "investment-withdrawal":
        requireType(transaction.sourceAccountId, [
          transaction.kind === "fd-withdrawal" ? "fixed-deposit" : "investment",
        ]);
        liquid(transaction.destinationAccountId);
        break;
    }
    if (
      (transaction.interestAmount ?? 0) &&
      ![
        "principal-repayment",
        "fd-withdrawal",
        "investment-withdrawal",
      ].includes(transaction.kind)
    )
      throw Error(
        "Interest is supported on loan repayments and withdrawals only.",
      );
    if (
      (transaction.feeAmount ?? 0) &&
      ![
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
      ].includes(transaction.kind)
    )
      throw Error(
        "Include charges in the purchase or income amount for this transaction type.",
      );
    if (transaction.kind === "refund") {
      if (
        !transaction.destinationAccountId ||
        !transaction.originalTransactionId ||
        !ids.has(transaction.originalTransactionId)
      )
        throw Error("A refund needs its destination and original purchase.");
      const original = transactions.find(
        (row) => row.id === transaction.originalTransactionId,
      )!;
      if (transaction.date < original.date)
        throw Error("A refund cannot precede its purchase.");
      if (
        transaction.destinationAccountId !==
        (original.kind === "credit-card-purchase"
          ? original.destinationAccountId
          : original.sourceAccountId)
      )
        throw Error("Refund to the original purchase account.");
      if (
        !["shopping", "expense", "credit-card-purchase"].includes(original.kind)
      )
        throw Error("Refunds can only reverse a purchase or expense.");
      const refunded = transactions
        .filter(
          (row) =>
            row.kind === "refund" && row.originalTransactionId === original.id,
        )
        .reduce((sum, row) => sum + cents(row.amount), 0);
      if (refunded > cents(original.amount))
        throw Error("Refunds cannot exceed the original purchase.");
    }
  }
}

export function ledgerSummary(
  plan: Pick<Plan, "accounts" | "ledgerTransactions">,
  through = today(),
): LedgerSummary {
  const accounts = plan.accounts ?? [],
    transactions = plan.ledgerTransactions ?? [];
  validateLedger(accounts, transactions);
  const balances = new Map(
    accounts.map((account) => [
      account.id,
      cents(Math.abs(account.openingBalance)) *
        (isLiability(account.kind) ? -1 : account.openingBalance < 0 ? -1 : 1),
    ]),
  );
  let income = 0,
    expenses = 0;
  const add = (id: string | undefined, value: number) => {
    if (id) balances.set(id, (balances.get(id) ?? 0) + value);
  };
  for (const row of transactions.filter((row) => row.date <= through)) {
    const amount = cents(row.amount),
      interest = cents(row.interestAmount ?? 0),
      fee = cents(row.feeAmount ?? 0);
    switch (row.kind) {
      case "income":
        add(row.destinationAccountId, amount);
        income += amount;
        break;
      case "expense":
      case "shopping":
        add(row.sourceAccountId, -amount);
        expenses += amount;
        break;
      case "refund":
        add(row.destinationAccountId, amount);
        expenses -= amount;
        break;
      case "credit-card-purchase":
        add(row.destinationAccountId, -amount);
        expenses += amount;
        break;
      case "borrow":
        add(row.sourceAccountId, -amount);
        add(row.destinationAccountId, amount - fee);
        expenses += fee;
        break;
      case "principal-repayment":
        add(row.sourceAccountId, -(amount + interest + fee));
        add(row.destinationAccountId, amount);
        expenses += interest + fee;
        break;
      case "fd-withdrawal":
      case "investment-withdrawal":
        add(row.sourceAccountId, -amount);
        add(row.destinationAccountId, amount + interest - fee);
        income += interest;
        expenses += fee;
        break;
      default:
        add(row.sourceAccountId, -(amount + fee));
        add(row.destinationAccountId, amount);
        expenses += fee;
    }
  }
  const byKind = (kinds: Account["kind"][]) =>
    accounts
      .filter((account) => kinds.includes(account.kind))
      .reduce((sum, account) => sum + (balances.get(account.id) ?? 0), 0);
  const assets = byKind([
    "cash",
    "bank",
    "wallet",
    "receivable",
    "fixed-deposit",
    "investment",
  ]);
  const liabilities = -byKind(["credit-card", "liability"]);
  return {
    balances: Object.fromEntries(
      [...balances].map(([id, value]) => [id, money(value)]),
    ),
    income: money(income),
    expenses: money(expenses),
    assets: money(assets),
    liabilities: money(liabilities),
    netWorth: money(assets - liabilities),
    receivables: money(byKind(["receivable"])),
    investments: money(byKind(["fixed-deposit", "investment"])),
  };
}

export const ledgerSavings = (
  plan: Pick<Plan, "accounts" | "ledgerTransactions">,
) => {
  const summary = ledgerSummary(plan);
  return round(summary.income - summary.expenses);
};

/** Opening liquid accounts allocate the existing opening savings, never add it twice. */
export function ledgerCashEffect(
  plan: Pick<Plan, "accounts" | "ledgerTransactions">,
  from: string,
  through: string,
) {
  const beforeDate = new Date(Date.parse(from + "T12:00:00Z") - 86400000)
    .toISOString()
    .slice(0, 10);
  const before = ledgerSummary(plan, beforeDate),
    after = ledgerSummary(plan, through);
  return round(
    (plan.accounts ?? [])
      .filter((a) => liquidKinds.includes(a.kind))
      .reduce(
        (sum, a) => sum + (after.balances[a.id] ?? 0) - (before.balances[a.id] ?? 0),
        0,
      ),
  );
}
export function ledgerPeriod(
  plan: Pick<Plan, "accounts" | "ledgerTransactions">,
  from: string,
  through: string,
  categoryId?: string,
) {
  const rows = (plan.ledgerTransactions ?? []).filter(
    (r) =>
      r.date >= from &&
      r.date <= through &&
      (!categoryId || r.categoryId === categoryId),
  );
  // Validate refunds against the complete ledger; calculate a period by subtracting cumulative totals.
  const flow = (r: LedgerTransaction) => {
    const fee = r.feeAmount ?? 0,
      interest = r.interestAmount ?? 0;
    return {
      income:
        r.kind === "income"
          ? r.amount
          : ["fd-withdrawal", "investment-withdrawal"].includes(r.kind)
            ? interest
            : 0,
      expenses: ["expense", "shopping", "credit-card-purchase"].includes(r.kind)
        ? r.amount
        : r.kind === "refund"
          ? -r.amount
          : fee + (r.kind === "principal-repayment" ? interest : 0),
    };
  };
  return {
    income: round(rows.reduce((s, r) => s + flow(r).income, 0)),
    expenses: round(rows.reduce((s, r) => s + flow(r).expenses, 0)),
    count: rows.length,
  };
}
