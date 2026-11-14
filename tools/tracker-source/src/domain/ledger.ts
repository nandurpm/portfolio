import { roundMoney, toPaise } from './round-money';
import { isPaise } from './money-precision';
import type { Account, Category, LedgerTransaction, Plan } from "./types";
import { inRange, today, validDate } from "./dates";
const round = roundMoney;
export const liquidKinds: Account["kind"][] = ["cash", "bank", "wallet"];
export const isLiability = (kind: Account["kind"]) =>
  ["credit-card", "liability"].includes(kind);

const cents = (value: number) => {
  if (!Number.isFinite(value) || value < 0 || value > 1e12)
    throw Error("Use a valid non-negative amount.");
  if (!isPaise(value))
    throw Error("Use at most two decimal places.");
  return toPaise(value);
};
const money = (value: number) => (value === 0 ? 0 : value / 100);

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
    if (transaction.kind === "reversal") {
      const original = transactions.find(
        (r) => r.id === transaction.reversalOfId,
      );
      if (!original || original.kind === "reversal")
        throw Error("Choose an original transaction to reverse.");
      if (transaction.date < original.date)
        throw Error("A reversal cannot precede its original transaction.");
      if (
        transaction.amount !== original.amount ||
        transaction.sourceAccountId !== original.sourceAccountId ||
        transaction.destinationAccountId !== original.destinationAccountId ||
        transaction.categoryId !== original.categoryId
      )
        throw Error(
          "A reversal must preserve the original posting references and amount.",
        );
      if (
        transactions.filter((r) => r.reversalOfId === original.id).length !== 1
      )
        throw Error("A transaction can be reversed only once.");
      if (
        transactions.some(
          (r) =>
            r.originalTransactionId === original.id &&
            !transactions.some((x) => x.reversalOfId === r.id),
        )
      )
        throw Error(
          "Reverse the linked refunds before reversing this purchase.",
        );
      continue;
    }
    if (transaction.reversalOfId)
      throw Error("Use a reversal transaction for a reversal reference.");
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
      const days = new Map<string, number>();
      for (const event of transactions) {
        const posting =
          event.kind === "reversal"
            ? transactions.find((r) => r.id === event.reversalOfId)
            : event;
        if (
          posting?.kind !== "refund" ||
          posting.originalTransactionId !== original.id
        )
          continue;
        days.set(
          event.date,
          (days.get(event.date) ?? 0) +
            (event.kind === "reversal" ? -1 : 1) * cents(posting.amount),
        );
      }
      let refunded = 0;
      for (const [, value] of [...days].sort(([a], [b]) =>
        a.localeCompare(b),
      )) {
        refunded += value;
        if (refunded > cents(original.amount))
          throw Error("Refunds cannot exceed the original purchase.");
      }
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
  for (const event of transactions.filter((row) => row.date <= through)) {
    const row =
      event.kind === "reversal"
        ? transactions.find((r) => r.id === event.reversalOfId)!
        : event;
    const sign = event.kind === "reversal" ? -1 : 1;
    const amount = sign * cents(row.amount),
      interest = sign * cents(row.interestAmount ?? 0),
      fee = sign * cents(row.feeAmount ?? 0);
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
        (sum, a) =>
          sum + (after.balances[a.id] ?? 0) - (before.balances[a.id] ?? 0),
        0,
      ),
  );
}
export function ledgerPeriod(
  plan: Pick<Plan, "accounts" | "ledgerTransactions"> &
    Partial<Pick<Plan, "categories">>,
  from: string,
  through: string,
  categoryId?: string,
) {
  let income = 0,
    expenses = 0,
    count = 0;
  for (const row of plan.ledgerTransactions ?? []) {
    if (row.date < from || row.date > through) continue;
    const flow = ledgerPostingFlow(plan, row);
    if (
      !categoryId ||
      (flow.incomeCategoryId ?? UNCATEGORIZED_INCOME_ID) === categoryId
    )
      income += flow.income;
    if (
      !categoryId ||
      (flow.expenseCategoryId ?? UNCATEGORIZED_EXPENSE_ID) === categoryId
    )
      expenses += flow.expenses;
    if (
      !categoryId ||
      (flow.incomeCategoryId ?? UNCATEGORIZED_INCOME_ID) === categoryId ||
      (flow.expenseCategoryId ?? UNCATEGORIZED_EXPENSE_ID) === categoryId
    )
      count++;
  }
  return { income: round(income), expenses: round(expenses), count };
}

export function openingAccountTotal(p: Pick<Plan, "accounts">) {
  return round(
    (p.accounts ?? [])
      .filter((a) => liquidKinds.includes(a.kind))
      .reduce((sum, a) => sum + a.openingBalance, 0),
  );
}
/** Reconciled postings are retained; corrections are new, dated inverse postings. */
export function ledgerTransactionLocked(p: Plan, row: LedgerTransaction) {
  return (
    row.kind === "reversal" ||
    (p.ledgerTransactions ?? []).some((r) => r.reversalOfId === row.id) ||
    (p.reconciliations ?? []).some(
      (r) => row.date >= r.fromDate && row.date <= r.throughDate,
    )
  );
}
export function assertLedgerCorrections(before: Plan, after: Plan) {
  for (const row of before.ledgerTransactions ?? []) {
    if (!ledgerTransactionLocked(before, row)) continue;
    const next = after.ledgerTransactions?.find((r) => r.id === row.id);
    if (JSON.stringify(next) !== JSON.stringify(row))
      throw Error(
        "This posting is protected by reconciliation or a reversal. Add a dated reversal instead of editing or deleting it.",
      );
  }
}
export function reverseLedgerTransaction(
  p: Plan,
  id: string,
  date: string,
  reason: string,
) {
  const original = p.ledgerTransactions?.find((r) => r.id === id);
  if (!original || original.kind === "reversal")
    throw Error("Choose an original transaction.");
  if (!reason.trim()) throw Error("Enter a reason for the correction.");
  if (!inRange(date, p.settings.planStart, p.settings.planEnd))
    throw Error(
      "Use a correction date inside the plan range, or extend the plan first.",
    );
  const reversal: LedgerTransaction = {
    ...original,
    id: crypto.randomUUID(),
    kind: "reversal",
    date,
    reversalOfId: id,
    description: "Reversal: " + original.description,
    note: reason.trim(),
    originalTransactionId: undefined,
  };
  validateLedger(p.accounts ?? [], [...(p.ledgerTransactions ?? []), reversal]);
  (p.ledgerTransactions ??= []).push(reversal);
}

export const UNCATEGORIZED_INCOME_ID = "ledger-uncategorized-income";
export const UNCATEGORIZED_EXPENSE_ID = "ledger-uncategorized-expense";
/** Separate economic streams: a withdrawal can contain income interest and expense fees. */
export function ledgerPostingFlow(
  p: Pick<Plan, "ledgerTransactions"> & Partial<Pick<Plan, "categories">>,
  event: LedgerTransaction,
) {
  const row =
    event.kind === "reversal"
      ? p.ledgerTransactions?.find((r) => r.id === event.reversalOfId)
      : event;
  if (!row) throw Error("Missing original reversal transaction.");
  const sign = event.kind === "reversal" ? -1 : 1;
  const purchase =
    row.kind === "refund"
      ? p.ledgerTransactions?.find((r) => r.id === row.originalTransactionId)
      : undefined;
  const categorySource = purchase ?? row;
  const legacy = p.categories?.find((c) => c.id === categorySource.categoryId);
  const incomeCategoryId =
    categorySource.incomeCategoryId !== undefined
      ? categorySource.incomeCategoryId || undefined
      : legacy?.group === "Income"
        ? categorySource.categoryId
        : undefined;
  const expenseCategoryId =
    categorySource.expenseCategoryId !== undefined
      ? categorySource.expenseCategoryId || undefined
      : legacy && legacy.group !== "Income" && legacy.group !== "Asset"
        ? categorySource.categoryId
        : undefined;
  const income =
    row.kind === "income"
      ? row.amount
      : ["fd-withdrawal", "investment-withdrawal"].includes(row.kind)
        ? (row.interestAmount ?? 0)
        : 0;
  const expenses = ["expense", "shopping", "credit-card-purchase"].includes(
    row.kind,
  )
    ? row.amount
    : row.kind === "refund"
      ? -row.amount
      : (row.feeAmount ?? 0) +
        (row.kind === "principal-repayment" ? (row.interestAmount ?? 0) : 0);
  return {
    income: round(sign * income),
    expenses: round(sign * expenses),
    incomeCategoryId,
    expenseCategoryId,
    posting: row,
    purchase,
  };
}
export function validateLedgerCategories(p: Plan) {
  if (
    p.categories.some((c) =>
      [UNCATEGORIZED_INCOME_ID, UNCATEGORIZED_EXPENSE_ID].includes(c.id),
    )
  )
    throw Error(
      "This category ID is reserved for uncategorized account activity.",
    );
  for (const row of p.ledgerTransactions ?? []) {
    const flow = ledgerPostingFlow(p, row);
    for (const id of [
      row.categoryId,
      row.incomeCategoryId,
      row.expenseCategoryId,
    ].filter(Boolean)) {
      const c = p.categories.find((c) => c.id === id);
      if (!c) throw Error("Choose an existing account transaction category.");
      if (c.role === "emi" || c.role === "closure")
        throw Error(
          "Record installment and loan closure payments in Loan & Closure. Accounts cannot create installment receipts.",
        );
      if (c.group === "Asset")
        throw Error("Use the separate asset or PF account workflow.");
    }
    const compatible = (id: string | undefined, income: boolean) => {
      if (!id) return;
      const c = p.categories.find((c) => c.id === id)!;
      if (income ? c.group !== "Income" : !["Living", "Debt"].includes(c.group))
        throw Error("The category must match the income or expense flow.");
    };
    compatible(flow.incomeCategoryId, true);
    compatible(flow.expenseCategoryId, false);
    const legacy = p.categories.find((c) => c.id === row.categoryId);
    if (
      legacy &&
      ((flow.income === 0 && legacy.group === "Income") ||
        (flow.expenses === 0 && legacy.group !== "Income"))
    )
      throw Error("The category must match an income or expense flow.");
    if (
      row.kind === "refund" &&
      flow.purchase &&
      ((row.expenseCategoryId &&
        row.expenseCategoryId !== flow.expenseCategoryId) ||
        (row.categoryId &&
          row.categoryId !==
            (flow.purchase.expenseCategoryId || flow.purchase.categoryId)))
    )
      throw Error("A refund inherits its original purchase category.");
    if ((row.provisionId === undefined) !== (row.billDueMonth === undefined))
      throw Error("A bill payment needs both a provision and its due month.");
    if (row.provisionId) {
      const provision = p.provisions?.find((r) => r.id === row.provisionId);
      if (
        !provision ||
        provision.categoryId !== flow.expenseCategoryId ||
        ![
          "expense",
          "shopping",
          "credit-card-purchase",
          "refund",
          "reversal",
        ].includes(row.kind)
      )
        throw Error("Choose the provision matching this bill expense.");
    }
  }
}
/** Synthetic reporting rows do not add budgets or change stored categories. */
export function reportCategories(p: Plan): Category[] {
  const extras: Category[] = [];
  const add = (id: string, name: string, group: Category["group"]) =>
    extras.push({
      id,
      name,
      group,
      amount: 0,
      timing: "Daily",
      day: 1,
      months: [],
      active: true,
      role: "regular",
      note: "Uncategorized account activity; no budget is inferred.",
    });
  const flows = (p.ledgerTransactions ?? []).map((r) =>
    ledgerPostingFlow(p, r),
  );
  if (flows.some((f) => f.income !== 0 && !f.incomeCategoryId))
    add(UNCATEGORIZED_INCOME_ID, "Uncategorized income", "Income");
  if (flows.some((f) => f.expenses !== 0 && !f.expenseCategoryId))
    add(UNCATEGORIZED_EXPENSE_ID, "Uncategorized expenses", "Living");
  return [...p.categories, ...extras];
}
export function billReceipts(p: Plan) {
  const ledger = (p.ledgerTransactions ?? []).flatMap((event) => {
    const flow = ledgerPostingFlow(p, event);
    if (
      !["expense", "shopping", "credit-card-purchase", "refund"].includes(
        flow.posting.kind,
      ) ||
      !flow.expenseCategoryId
    )
      return [];
    const origin = flow.purchase ?? flow.posting;
    return [
      {
        date: event.date,
        categoryId: flow.expenseCategoryId,
        amount: flow.expenses,
        provisionId: origin.provisionId,
        billDueMonth: origin.billDueMonth,
      },
    ];
  });
  return [...p.entries, ...ledger];
}
