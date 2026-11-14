// Generated from src/domain/bot-finance.ts; run node scripts/build-bot-finance.mjs. Do not edit.

// src/domain/round-money.ts
function toPaise(value) {
  if (!Number.isFinite(value)) return value;
  const [mantissa, exponent = "0"] = Math.abs(value).toString().split("e");
  const shifted = Number(`${mantissa}e${Number(exponent) + 2}`);
  const paise = Math.round(shifted);
  return paise === 0 ? 0 : Math.sign(value) * paise;
}
var roundMoney = (value) => toPaise(value) / 100;

// src/domain/money-precision.ts
function isPaise(value) {
  return Number.isFinite(value) && Math.abs(value - Math.round(value * 100) / 100) <= Number.EPSILON * Math.max(0.01, Math.abs(value)) * 2;
}

// src/domain/dates.ts
var today = () => {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
var validMonth = (s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s) && +s.slice(0, 4) >= 1900 && +s.slice(0, 4) <= 2199;
function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = /* @__PURE__ */ new Date(`${s}T12:00:00Z`);
  return !isNaN(+d) && d.toISOString().slice(0, 10) === s;
}
var addMonths = (m, n) => {
  const d = /* @__PURE__ */ new Date(`${m}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};
var daysIn = (m) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
var monthEnd = (m) => `${m}-${daysIn(m)}`;
var monthDay = (m, day) => `${m}-${String(Math.min(Math.max(1, day), daysIn(m))).padStart(2, "0")}`;
function monthsBetween(start, end) {
  if (!validMonth(start) || !validMonth(end) || start > end) return [];
  const n = (+end.slice(0, 4) - +start.slice(0, 4)) * 12 + (+end.slice(5, 7) - +start.slice(5, 7)) + 1;
  return Array.from({ length: n }, (_, i) => addMonths(start, i));
}
var inRange = (date, start, end) => validDate(date) && date >= `${start}-01` && date <= monthEnd(end);

// src/domain/ledger.ts
var round = roundMoney;
var liquidKinds = ["cash", "bank", "wallet"];
var isLiability = (kind) => ["credit-card", "liability"].includes(kind);
var cents = (value) => {
  if (!Number.isFinite(value) || value < 0 || value > 1e12)
    throw Error("Use a valid non-negative amount.");
  if (!isPaise(value))
    throw Error("Use at most two decimal places.");
  return toPaise(value);
};
var money = (value) => value === 0 ? 0 : value / 100;
function validateLedger(accounts, transactions) {
  const accountIds = new Set(accounts.map((account) => account.id));
  if (accountIds.size !== accounts.length)
    throw Error("Account IDs must be unique.");
  if (new Set(accounts.map((account) => account.name.trim().toLowerCase())).size !== accounts.length)
    throw Error("Account names must be unique.");
  if (new Set(transactions.map((transaction) => transaction.id)).size !== transactions.length)
    throw Error("Ledger transaction IDs must be unique.");
  const ids = new Set(transactions.map((transaction) => transaction.id));
  const requiresBoth = /* @__PURE__ */ new Set([
    "transfer",
    "lend",
    "repayment-received",
    "borrow",
    "principal-repayment",
    "fd-deposit",
    "fd-withdrawal",
    "investment-deposit",
    "investment-withdrawal",
    "credit-card-payment"
  ]);
  for (const account of accounts) cents(Math.abs(account.openingBalance));
  const type = (id) => accounts.find((a) => a.id === id)?.kind;
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
      transaction.destinationAccountId
    ])
      if (id && !accountIds.has(id))
        throw Error("A ledger transaction refers to a missing account.");
    if (transaction.sourceAccountId && transaction.sourceAccountId === transaction.destinationAccountId)
      throw Error("Source and destination accounts must differ.");
    if (requiresBoth.has(transaction.kind) && (!transaction.sourceAccountId || !transaction.destinationAccountId))
      throw Error(
        "This transaction needs both source and destination accounts."
      );
    if (transaction.kind === "income" && !transaction.destinationAccountId)
      throw Error("Income needs a destination account.");
    if (["expense", "shopping"].includes(transaction.kind) && !transaction.sourceAccountId)
      throw Error("An expense needs a source account.");
    if (transaction.kind === "credit-card-purchase" && !transaction.destinationAccountId)
      throw Error("A credit-card purchase needs a card liability account.");
    if (transaction.kind === "reversal") {
      const original = transactions.find(
        (r) => r.id === transaction.reversalOfId
      );
      if (!original || original.kind === "reversal")
        throw Error("Choose an original transaction to reverse.");
      if (transaction.date < original.date)
        throw Error("A reversal cannot precede its original transaction.");
      if (transaction.amount !== original.amount || transaction.sourceAccountId !== original.sourceAccountId || transaction.destinationAccountId !== original.destinationAccountId || transaction.categoryId !== original.categoryId)
        throw Error(
          "A reversal must preserve the original posting references and amount."
        );
      if (transactions.filter((r) => r.reversalOfId === original.id).length !== 1)
        throw Error("A transaction can be reversed only once.");
      if (transactions.some(
        (r) => r.originalTransactionId === original.id && !transactions.some((x) => x.reversalOfId === r.id)
      ))
        throw Error(
          "Reverse the linked refunds before reversing this purchase."
        );
      continue;
    }
    if (transaction.reversalOfId)
      throw Error("Use a reversal transaction for a reversal reference.");
    const requireType = (id, kinds) => {
      if (!kinds.includes(type(id)))
        throw Error("Choose an account of the correct type for this movement.");
    };
    const liquid = (id) => requireType(id, liquidKinds);
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
          transaction.kind === "fd-deposit" ? "fixed-deposit" : "investment"
        ]);
        break;
      case "fd-withdrawal":
      case "investment-withdrawal":
        requireType(transaction.sourceAccountId, [
          transaction.kind === "fd-withdrawal" ? "fixed-deposit" : "investment"
        ]);
        liquid(transaction.destinationAccountId);
        break;
    }
    if ((transaction.interestAmount ?? 0) && ![
      "principal-repayment",
      "fd-withdrawal",
      "investment-withdrawal"
    ].includes(transaction.kind))
      throw Error(
        "Interest is supported on loan repayments and withdrawals only."
      );
    if ((transaction.feeAmount ?? 0) && ![
      "transfer",
      "lend",
      "repayment-received",
      "borrow",
      "principal-repayment",
      "fd-deposit",
      "fd-withdrawal",
      "investment-deposit",
      "investment-withdrawal",
      "credit-card-payment"
    ].includes(transaction.kind))
      throw Error(
        "Include charges in the purchase or income amount for this transaction type."
      );
    if (transaction.kind === "refund") {
      if (!transaction.destinationAccountId || !transaction.originalTransactionId || !ids.has(transaction.originalTransactionId))
        throw Error("A refund needs its destination and original purchase.");
      const original = transactions.find(
        (row) => row.id === transaction.originalTransactionId
      );
      if (transaction.date < original.date)
        throw Error("A refund cannot precede its purchase.");
      if (transaction.destinationAccountId !== (original.kind === "credit-card-purchase" ? original.destinationAccountId : original.sourceAccountId))
        throw Error("Refund to the original purchase account.");
      if (!["shopping", "expense", "credit-card-purchase"].includes(original.kind))
        throw Error("Refunds can only reverse a purchase or expense.");
      const days = /* @__PURE__ */ new Map();
      for (const event of transactions) {
        const posting = event.kind === "reversal" ? transactions.find((r) => r.id === event.reversalOfId) : event;
        if (posting?.kind !== "refund" || posting.originalTransactionId !== original.id)
          continue;
        days.set(
          event.date,
          (days.get(event.date) ?? 0) + (event.kind === "reversal" ? -1 : 1) * cents(posting.amount)
        );
      }
      let refunded = 0;
      for (const [, value] of [...days].sort(
        ([a], [b]) => a.localeCompare(b)
      )) {
        refunded += value;
        if (refunded > cents(original.amount))
          throw Error("Refunds cannot exceed the original purchase.");
      }
    }
  }
}
function ledgerSummary(plan, through = today()) {
  const accounts = plan.accounts ?? [], transactions = plan.ledgerTransactions ?? [];
  validateLedger(accounts, transactions);
  const balances = new Map(
    accounts.map((account) => [
      account.id,
      cents(Math.abs(account.openingBalance)) * (isLiability(account.kind) ? -1 : account.openingBalance < 0 ? -1 : 1)
    ])
  );
  let income = 0, expenses = 0;
  const add = (id, value) => {
    if (id) balances.set(id, (balances.get(id) ?? 0) + value);
  };
  for (const event of transactions.filter((row) => row.date <= through)) {
    const row = event.kind === "reversal" ? transactions.find((r) => r.id === event.reversalOfId) : event;
    const sign = event.kind === "reversal" ? -1 : 1;
    const amount = sign * cents(row.amount), interest = sign * cents(row.interestAmount ?? 0), fee = sign * cents(row.feeAmount ?? 0);
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
  const byKind = (kinds) => accounts.filter((account) => kinds.includes(account.kind)).reduce((sum, account) => sum + (balances.get(account.id) ?? 0), 0);
  const assets = byKind([
    "cash",
    "bank",
    "wallet",
    "receivable",
    "fixed-deposit",
    "investment"
  ]);
  const liabilities = -byKind(["credit-card", "liability"]);
  return {
    balances: Object.fromEntries(
      [...balances].map(([id, value]) => [id, money(value)])
    ),
    income: money(income),
    expenses: money(expenses),
    assets: money(assets),
    liabilities: money(liabilities),
    netWorth: money(assets - liabilities),
    receivables: money(byKind(["receivable"])),
    investments: money(byKind(["fixed-deposit", "investment"]))
  };
}
function ledgerCashEffect(plan, from, through) {
  const beforeDate = new Date(Date.parse(from + "T12:00:00Z") - 864e5).toISOString().slice(0, 10);
  const before = ledgerSummary(plan, beforeDate), after = ledgerSummary(plan, through);
  return round(
    (plan.accounts ?? []).filter((a) => liquidKinds.includes(a.kind)).reduce(
      (sum, a) => sum + (after.balances[a.id] ?? 0) - (before.balances[a.id] ?? 0),
      0
    )
  );
}
function ledgerPeriod(plan, from, through, categoryId) {
  let income = 0, expenses = 0, count = 0;
  for (const row of plan.ledgerTransactions ?? []) {
    if (row.date < from || row.date > through) continue;
    const flow = ledgerPostingFlow(plan, row);
    if (!categoryId || (flow.incomeCategoryId ?? UNCATEGORIZED_INCOME_ID) === categoryId)
      income += flow.income;
    if (!categoryId || (flow.expenseCategoryId ?? UNCATEGORIZED_EXPENSE_ID) === categoryId)
      expenses += flow.expenses;
    if (!categoryId || (flow.incomeCategoryId ?? UNCATEGORIZED_INCOME_ID) === categoryId || (flow.expenseCategoryId ?? UNCATEGORIZED_EXPENSE_ID) === categoryId)
      count++;
  }
  return { income: round(income), expenses: round(expenses), count };
}
var UNCATEGORIZED_INCOME_ID = "ledger-uncategorized-income";
var UNCATEGORIZED_EXPENSE_ID = "ledger-uncategorized-expense";
function ledgerPostingFlow(p, event) {
  const row = event.kind === "reversal" ? p.ledgerTransactions?.find((r) => r.id === event.reversalOfId) : event;
  if (!row) throw Error("Missing original reversal transaction.");
  const sign = event.kind === "reversal" ? -1 : 1;
  const purchase = row.kind === "refund" ? p.ledgerTransactions?.find((r) => r.id === row.originalTransactionId) : void 0;
  const categorySource = purchase ?? row;
  const legacy = p.categories?.find((c) => c.id === categorySource.categoryId);
  const incomeCategoryId = categorySource.incomeCategoryId !== void 0 ? categorySource.incomeCategoryId || void 0 : legacy?.group === "Income" ? categorySource.categoryId : void 0;
  const expenseCategoryId = categorySource.expenseCategoryId !== void 0 ? categorySource.expenseCategoryId || void 0 : legacy && legacy.group !== "Income" && legacy.group !== "Asset" ? categorySource.categoryId : void 0;
  const income = row.kind === "income" ? row.amount : ["fd-withdrawal", "investment-withdrawal"].includes(row.kind) ? row.interestAmount ?? 0 : 0;
  const expenses = ["expense", "shopping", "credit-card-purchase"].includes(
    row.kind
  ) ? row.amount : row.kind === "refund" ? -row.amount : (row.feeAmount ?? 0) + (row.kind === "principal-repayment" ? row.interestAmount ?? 0 : 0);
  return {
    income: round(sign * income),
    expenses: round(sign * expenses),
    incomeCategoryId,
    expenseCategoryId,
    posting: row,
    purchase
  };
}
function reportCategories(p) {
  const extras = [];
  const add = (id, name, group) => extras.push({
    id,
    name,
    group,
    amount: 0,
    timing: "Daily",
    day: 1,
    months: [],
    active: true,
    role: "regular",
    note: "Uncategorized account activity; no budget is inferred."
  });
  const flows = (p.ledgerTransactions ?? []).map(
    (r) => ledgerPostingFlow(p, r)
  );
  if (flows.some((f) => f.income !== 0 && !f.incomeCategoryId))
    add(UNCATEGORIZED_INCOME_ID, "Uncategorized income", "Income");
  if (flows.some((f) => f.expenses !== 0 && !f.expenseCategoryId))
    add(UNCATEGORIZED_EXPENSE_ID, "Uncategorized expenses", "Living");
  return [...p.categories, ...extras];
}
function billReceipts(p) {
  const ledger = (p.ledgerTransactions ?? []).flatMap((event) => {
    const flow = ledgerPostingFlow(p, event);
    if (!["expense", "shopping", "credit-card-purchase", "refund"].includes(
      flow.posting.kind
    ) || !flow.expenseCategoryId)
      return [];
    const origin = flow.purchase ?? flow.posting;
    return [
      {
        date: event.date,
        categoryId: flow.expenseCategoryId,
        amount: flow.expenses,
        provisionId: origin.provisionId,
        billDueMonth: origin.billDueMonth
      }
    ];
  });
  return [...p.entries, ...ledger];
}

// src/domain/employment.ts
var cents2 = toPaise;
var isSalaryCategory = (category) => category.role === "salary" || category.role === "salary-history";
function salaryHistory(p) {
  const history = p.salaryChanges ?? (p.settings.raisedSalary !== p.settings.salary31 ? [
    {
      id: "legacy-salary-change",
      effectiveDate: p.settings.raiseStart + "-01",
      monthlySalary: p.settings.raisedSalary,
      monthlyPfContribution: 0
    }
  ] : []);
  return [...history].sort(
    (a, b) => a.effectiveDate.localeCompare(b.effectiveDate)
  );
}
function salaryAtDate(p, date) {
  const change = salaryHistory(p).filter((row) => row.effectiveDate <= date).at(-1);
  return {
    monthlySalary: change?.monthlySalary ?? p.settings.salary31,
    monthlyPfContribution: change?.monthlyPfContribution ?? 0
  };
}
var salaryForReceiptMonth = (p, month) => salaryAtDate(p, monthEnd(addMonths(month, -1))).monthlySalary;
function pfCashEffect(p, from, through, methods = []) {
  return (p.pfMovements ?? []).filter(
    (row) => row.date >= from && row.date <= through && row.date >= p.settings.planStart + "-01" && row.date <= monthEnd(p.settings.planEnd) && (!methods.length || methods.includes(row.payment))
  ).reduce(
    (sum, row) => sum + (row.kind === "claim" ? cents2(row.amount) : row.source === "cash" ? -cents2(row.amount) : 0),
    0
  ) / 100;
}

// src/domain/format-money.ts
var compactNumber = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1, minimumFractionDigits: 0 });

// src/domain/calculate.ts
var round2 = roundMoney;
var key = (month, id) => `${month}|${id}`;
var reportDate = (p) => p.settings.liveDate ? today() : p.settings.reportDate;
var emptyTotals = () => ({
  income: 0,
  living: 0,
  debt: 0,
  expenses: 0,
  savings: 0
});
function finish(t) {
  const income = round2(t.income);
  const expenses = round2(t.living + t.debt);
  let living = round2(t.living), debt = round2(t.debt);
  const residualPaise = Math.round((expenses - living - debt) * 100);
  if (residualPaise !== 0) {
    const livingRemainder = t.living - living;
    const debtRemainder = t.debt - debt;
    if (residualPaise > 0 ? livingRemainder >= debtRemainder : livingRemainder <= debtRemainder)
      living = round2(living + residualPaise / 100);
    else
      debt = round2(debt + residualPaise / 100);
  }
  return { income, living, debt, expenses, savings: round2(income - expenses) };
}
function salary(p, m) {
  return salaryForReceiptMonth(p, m);
}
function contractBalance(p, m) {
  const row = [...p.loan.rows].filter((r) => r.month <= m).sort((a, b) => a.month.localeCompare(b.month)).at(-1);
  return row?.balance ?? p.loan.principal;
}
function closureAmount(p, m = p.settings.closureMonth) {
  const principal = contractBalance(p, m);
  if (m !== p.settings.closureMonth) return principal;
  return p.settings.lenderQuote > 0 ? p.settings.lenderQuote : round2(principal + p.settings.accruedInterest + p.settings.fees);
}
function defaultAmount(p, c, m, mode = p.settings.mode) {
  if (!c.active) return 0;
  if (c.role === "emi") {
    const rows = c.loanId ? p.additionalLoans?.find((l) => l.id === c.loanId)?.rows ?? [] : p.loan.rows;
    return round2(
      rows.reduce((total, row) => {
        if (!c.loanId && row.paidBeforeOpening) return total;
        if (!c.loanId && mode === "Early closure" && row.month > p.settings.closureMonth)
          return total;
        const paymentMonth = p.settings.emiPreviousMonth ? addMonths(row.month, -1) : row.month;
        const receipts = p.entries.filter((e) => e.categoryId === c.id && e.loanRowId === row.id);
        const early = receipts.length ? receipts.filter((e) => e.date.slice(0, 7) < paymentMonth) : row.paidDate && row.paidDate.slice(0, 7) < paymentMonth ? [{ date: row.paidDate, amount: row.paidAmount }] : [];
        const prepaid = early.reduce((sum, e) => sum + e.amount, 0);
        const paidHere = early.filter((e) => e.date.slice(0, 7) === m).reduce((sum, e) => sum + e.amount, 0);
        return total + paidHere + (paymentMonth === m ? Math.max(0, row.emi - prepaid) : 0);
      }, 0)
    );
  }
  const provision = p.provisions?.find((r) => r.enabled && r.categoryId === c.id);
  if (provision) {
    if (m < provision.startMonth) return 0;
    const end = m > p.settings.planEnd ? m : p.settings.planEnd;
    const dueMonths = monthsBetween(provision.firstDueMonth, end).filter(
      (_, i) => i % provision.everyMonths === 0
    );
    return round2(
      dueMonths.reduce((sum, due) => {
        const early = billReceipts(p).filter(
          (e) => e.provisionId === provision.id && e.billDueMonth === due && e.date.slice(0, 7) < due
        );
        const prepaid = early.reduce((n, e) => n + e.amount, 0);
        const paidHere = early.filter((e) => e.date.slice(0, 7) === m).reduce((n, e) => n + e.amount, 0);
        return sum + paidHere + (due === m ? Math.max(0, provision.billAmount - prepaid) : 0);
      }, 0)
    );
  }
  if (c.months.length && !c.months.includes(+m.slice(5, 7))) return 0;
  if (isSalaryCategory(c)) return salary(p, m);
  if (c.role === "closure")
    return mode === "Early closure" && m === p.settings.closureMonth ? closureAmount(p) : 0;
  return c.amount;
}
function fullAmount(p, c, m, mode = p.settings.mode) {
  if (c.group === "Asset") return 0;
  if (!c.active) return 0;
  if (c.role === "emi" && !c.loanId && mode === "Early closure" && (m > p.settings.closureMonth || p.settings.emiPreviousMonth && m === p.settings.closureMonth))
    return 0;
  if (c.role === "closure" && (mode !== "Early closure" || m !== p.settings.closureMonth)) return 0;
  return p.overrides[key(m, c.id)] ?? defaultAmount(p, c, m, mode);
}
function timedAmount(full, c, m, date) {
  if (date < `${m}-01`) return 0;
  if (date >= monthEnd(m)) return full;
  return c.timing === "Fixed day" && date >= monthDay(m, c.day) ? full : 0;
}
function categoryPlan(p, c, m, date, mode = p.settings.mode) {
  const amount = fullAmount(p, c, m, mode);
  const provision = p.provisions?.find((r) => r.enabled && r.categoryId === c.id);
  if (date && provision && c.active && m >= provision.startMonth && !(key(m, c.id) in p.overrides)) {
    const earlyHere = billReceipts(p).filter(
      (e) => e.categoryId === c.id && e.provisionId === provision.id && e.billDueMonth && e.billDueMonth > m && e.date.slice(0, 7) === m
    );
    const earlyTotal = earlyHere.reduce((sum, e) => sum + e.amount, 0);
    return round2(
      timedAmount(
        Math.max(0, amount - earlyTotal),
        { ...c, timing: "Fixed day", day: provision.dueDay },
        m,
        date
      ) + earlyHere.filter((e) => e.date <= date).reduce((sum, e) => sum + e.amount, 0)
    );
  }
  return date ? timedAmount(
    amount,
    provision ? { ...c, timing: "Fixed day", day: provision.dueDay } : c.role === "emi" && p.settings.emiPreviousMonth ? { ...c, timing: "Fixed day", day: (c.loanId ? p.additionalLoans?.find((l) => l.id === c.loanId)?.plannedPayDay : void 0) ?? p.settings.salaryDay } : c,
    m,
    date
  ) : amount;
}
function planned(p, m, date, mode = p.settings.mode) {
  const t = emptyTotals();
  for (const c of p.categories) {
    if (c.group === "Asset") continue;
    const a = categoryPlan(p, c, m, date, mode);
    t[c.group === "Income" ? "income" : c.group === "Living" ? "living" : "debt"] += a;
  }
  return finish(t);
}
function actual(p, start, end, catId) {
  const entries = p.entries.filter((e) => inRange(e.date, p.settings.planStart, p.settings.planEnd));
  return actualFromEntries(p, start, end, entries, new Map(p.categories.map((c) => [c.id, c])), catId);
}
function actualFromEntries(p, start, end, entries, cats, catId) {
  const t = emptyTotals();
  for (const e of entries) {
    if (e.date < start || e.date > end || catId && e.categoryId !== catId)
      continue;
    const c = cats.get(e.categoryId);
    if (c && c.group !== "Asset")
      t[c.group === "Income" ? "income" : c.group === "Living" ? "living" : "debt"] += e.amount;
  }
  const ledger = ledgerPeriod(p, start > p.settings.planStart + "-01" ? start : p.settings.planStart + "-01", end < monthEnd(p.settings.planEnd) ? end : monthEnd(p.settings.planEnd), catId);
  t.income += ledger.income;
  const debtCategoryIds = reportCategories(p).filter((c) => c.group === "Debt" && (!catId || c.id === catId)).map((c) => c.id);
  const ledgerDebt = debtCategoryIds.reduce((sum, id) => sum + ledgerPeriod(p, start > p.settings.planStart + "-01" ? start : p.settings.planStart + "-01", end < monthEnd(p.settings.planEnd) ? end : monthEnd(p.settings.planEnd), id).expenses, 0);
  t.debt += ledgerDebt;
  t.living += ledger.expenses - ledgerDebt;
  return finish(t);
}
function releasedAdvance(p, m) {
  return p.settings.emiPreviousMonth ? round2(
    p.categories.filter((c) => c.role === "emi" && !c.loanId).reduce((sum, c) => sum + fullAmount(p, c, m, "Scheduled"), 0)
  ) : 0;
}
function forecast(p, mode = p.settings.mode) {
  let cash = p.settings.opening;
  return monthsBetween(p.settings.planStart, p.settings.planEnd).map((m) => {
    const t = planned(p, m, void 0, mode);
    cash = round2(cash + t.savings + pfCashEffect(p, `${m}-01`, monthEnd(m)));
    const emi = round2(
      p.categories.filter((c) => c.role === "emi").reduce((n, c) => n + fullAmount(p, c, m, mode), 0)
    ), closure = round2(
      p.categories.filter((c) => c.role === "closure").reduce((n, c) => n + fullAmount(p, c, m, mode), 0)
    );
    const reserve = p.settings.emiPreviousMonth ? 0 : round2(
      p.categories.filter((c) => c.role === "emi").reduce((n, c) => n + fullAmount(p, c, addMonths(m, 1), mode), 0)
    );
    const balance = contractBalance(p, m);
    return {
      month: m,
      ...t,
      emi,
      closure,
      cash,
      reserve,
      spendable: round2(cash - reserve),
      balance,
      headroom: round2(
        cash + (mode === "Early closure" && m >= p.settings.closureMonth ? 0 : releasedAdvance(p, m)) - (mode === "Early closure" && m >= p.settings.closureMonth ? 0 : closureAmount(p, m))
      )
    };
  });
}
function cumulative(p, date = reportDate(p)) {
  const t = emptyTotals();
  for (const m of monthsBetween(p.settings.planStart, p.settings.planEnd)) {
    if (m > date.slice(0, 7)) break;
    const v = planned(p, m);
    t.income += v.income;
    t.living += v.living;
    t.debt += v.debt;
  }
  const plan = finish(t), a = actual(p, `${p.settings.planStart}-01`, date);
  return {
    plan,
    actual: a,
    expectedCash: round2(p.settings.opening + plan.savings + pfCashEffect(p, `${p.settings.planStart}-01`, date)),
    actualCash: recordedCash(p, date, a)
  };
}
function recordedCash(p, date, totals = actual(p, `${p.settings.planStart}-01`, date)) {
  const ledger = ledgerPeriod(p, p.settings.planStart + "-01", date);
  return round2(p.settings.opening + totals.savings + pfCashEffect(p, p.settings.planStart + "-01", date) + ledgerCashEffect(p, p.settings.planStart + "-01", date) - ledger.income + ledger.expenses);
}

// src/domain/balances.ts
function reconciliationResult(p, r) {
  const categories = new Map(p.categories.map((c) => [c.id, c]));
  let income = 0, expenses = 0, count = 0;
  for (const e of p.entries) {
    if (e.date < r.fromDate || e.date > r.throughDate || r.methods.length && !r.methods.includes(e.payment))
      continue;
    const category = categories.get(e.categoryId);
    if (!category || category.group === "Asset") continue;
    if (category.group === "Income") income += e.amount;
    else expenses += e.amount;
    count++;
  }
  const ledger = r.methods.length ? { income: 0, expenses: 0, count: 0 } : ledgerPeriod(p, r.fromDate, r.throughDate);
  const ledgerCash = r.methods.length ? 0 : ledgerCashEffect(p, r.fromDate, r.throughDate);
  count += ledger.count;
  const cashAdjustment = ledgerCash;
  income = round2(income);
  expenses = round2(expenses);
  const calculated = round2(r.openingBalance + income - expenses + pfCashEffect(p, r.fromDate, r.throughDate, r.methods) + cashAdjustment);
  return {
    income,
    expenses,
    count,
    calculated,
    difference: round2(r.statementBalance - calculated)
  };
}

// src/domain/bot-finance.ts
function financialRange(p, start, end) {
  const totals = actual(p, start, end);
  const categories = reportCategories(p);
  const byCat = new Map(categories.map((c) => [c.id, c.group === "Income" ? actual(p, start, end, c.id).income : actual(p, start, end, c.id).expenses]));
  const ledgerEntries = (p.ledgerTransactions ?? []).filter((t) => t.date >= start && t.date <= end && t.date >= p.settings.planStart + "-01" && t.date <= monthEnd(p.settings.planEnd)).flatMap((t) => {
    const f = ledgerPostingFlow(p, t);
    return [{ amount: f.income, categoryId: f.incomeCategoryId ?? "ledger-uncategorized-income" }, { amount: f.expenses, categoryId: f.expenseCategoryId ?? "ledger-uncategorized-expense" }].filter((x) => x.amount !== 0).map((x, i) => ({ id: "ledger:" + t.id + ":" + i, date: t.date, amount: x.amount, categoryId: x.categoryId ?? (i === 0 ? "ledger-uncategorized-income" : "ledger-uncategorized-expense"), description: "Accounts \xB7 " + t.kind + " \xB7 " + t.description, payment: "Accounts", notes: t.note ?? "" }));
  });
  return { ledgerEntries, ...totals, expense: totals.expenses, net: totals.savings, byCat, map: new Map(categories.map((c) => [c.id, c])) };
}
function financialCash(p, date) {
  return cumulative(p, date > monthEnd(p.settings.planEnd) ? monthEnd(p.settings.planEnd) : date).actualCash;
}
function botReportPlan(p) {
  if (!p.settings.liveDate) return p;
  const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(/* @__PURE__ */ new Date());
  return { ...p, settings: { ...p.settings, liveDate: false, reportDate: date } };
}
var financialForecast = (p) => forecast(botReportPlan(p));
var financialBudget = (p, c, month) => categoryPlan(botReportPlan(p), c, month);
var financialReconciliation = reconciliationResult;
var financialAccounts = (p, through) => ledgerSummary(p, through);
export {
  financialAccounts,
  financialBudget,
  financialCash,
  financialForecast,
  financialRange,
  financialReconciliation
};
