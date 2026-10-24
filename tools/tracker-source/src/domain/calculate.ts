import type { Plan, Category, Totals, ForecastRow, ProgressRow, LoanRow } from './types';
import { today, daysIn, monthDay, monthEnd, monthsBetween, addMonths, inRange } from './dates';
export const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const money = (n: number, decimals = 2) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
export const key = (month: string, id: string) => `${month}|${id}`;
export const reportDate = (p: Plan) => (p.settings.liveDate ? today() : p.settings.reportDate);
export const emptyTotals = (): Totals => ({
  income: 0,
  living: 0,
  debt: 0,
  expenses: 0,
  savings: 0,
});
export function finish(t: Totals): Totals {
  return {
    income: round(t.income),
    living: round(t.living),
    debt: round(t.debt),
    expenses: round(t.living + t.debt),
    savings: round(t.income - t.living - t.debt),
  };
}
export function salary(p: Plan, m: string) {
  const s = p.settings;
  // A receipt-month budget contains the preceding month's earned salary.
  return addMonths(m, -1) >= s.raiseStart ? s.raisedSalary : s.salary31;
}
export function contractBalance(p: Plan, m: string) {
  const row = [...p.loan.rows]
    .filter((r) => r.month <= m)
    .sort((a, b) => a.month.localeCompare(b.month))
    .at(-1);
  return row?.balance ?? p.loan.principal;
}
export function closureAmount(p: Plan, m = p.settings.closureMonth) {
  return p.settings.lenderQuote > 0 && m === p.settings.closureMonth
    ? p.settings.lenderQuote
    : round(contractBalance(p, m) + p.settings.accruedInterest + p.settings.fees);
}
export function defaultAmount(p: Plan, c: Category, m: string, mode = p.settings.mode) {
  if (!c.active) return 0;
  if (c.role === 'emi') {
    const rows = c.loanId
      ? (p.additionalLoans?.find((l) => l.id === c.loanId)?.rows ?? [])
      : p.loan.rows;
    return round(
      rows.reduce((total, row) => {
        if (!c.loanId && row.paidBeforeOpening) return total;
        if (!c.loanId && mode === 'Early closure' && row.month > p.settings.closureMonth)
          return total;
        const paymentMonth = p.settings.emiPreviousMonth ? addMonths(row.month, -1) : row.month;
        const receipts = p.entries.filter((e) => e.categoryId === c.id && e.loanRowId === row.id);
        const early = receipts.length
          ? receipts.filter((e) => e.date.slice(0, 7) < paymentMonth)
          : row.paidDate && row.paidDate.slice(0, 7) < paymentMonth
            ? [{ date: row.paidDate, amount: row.paidAmount }]
            : [];
        const prepaid = early.reduce((sum, e) => sum + e.amount, 0);
        const paidHere = early
          .filter((e) => e.date.slice(0, 7) === m)
          .reduce((sum, e) => sum + e.amount, 0);
        // Keep actual early receipts in their cash month; budget only the unpaid remainder.
        return total + paidHere + (paymentMonth === m ? Math.max(0, row.emi - prepaid) : 0);
      }, 0),
    );
  }
  if (c.months.length && !c.months.includes(+m.slice(5, 7))) return 0;
  if (c.role === 'salary') return salary(p, m);
  if (c.role === 'closure')
    return mode === 'Early closure' && m === p.settings.closureMonth ? closureAmount(p) : 0;
  return c.amount;
}
export function fullAmount(p: Plan, c: Category, m: string, mode = p.settings.mode) {
  if (!c.active) return 0;
  if (
    c.role === 'emi' &&
    !c.loanId &&
    mode === 'Early closure' &&
    (m > p.settings.closureMonth || (p.settings.emiPreviousMonth && m === p.settings.closureMonth))
  )
    return 0;
  if (c.role === 'closure' && (mode !== 'Early closure' || m !== p.settings.closureMonth)) return 0;
  return p.overrides[key(m, c.id)] ?? defaultAmount(p, c, m, mode);
}
export function timedAmount(full: number, c: Category, m: string, date: string) {
  if (date < `${m}-01`) return 0;
  if (date >= monthEnd(m)) return full;
  if (c.timing === 'Fixed day') return date >= monthDay(m, c.day) ? full : 0;
  return round((full * Number(date.slice(8, 10))) / daysIn(m));
}
export function categoryPlan(
  p: Plan,
  c: Category,
  m: string,
  date?: string,
  mode = p.settings.mode,
) {
  const amount = fullAmount(p, c, m, mode);
  return date
    ? timedAmount(
        amount,
        c.role === 'emi' && p.settings.emiPreviousMonth
          ? { ...c, timing: 'Fixed day', day: p.settings.salaryDay }
          : c,
        m,
        date,
      )
    : amount;
}
export function planned(p: Plan, m: string, date?: string, mode = p.settings.mode): Totals {
  const t = emptyTotals();
  for (const c of p.categories) {
    const a = categoryPlan(p, c, m, date, mode);
    t[c.group === 'Income' ? 'income' : c.group === 'Living' ? 'living' : 'debt'] += a;
  }
  return finish(t);
}
export function actual(p: Plan, start: string, end: string, catId?: string): Totals {
  const t = emptyTotals(),
    cats = new Map(p.categories.map((c) => [c.id, c]));
  for (const e of p.entries) {
    if (
      !inRange(e.date, p.settings.planStart, p.settings.planEnd) ||
      e.date < start ||
      e.date > end ||
      (catId && e.categoryId !== catId)
    )
      continue;
    const c = cats.get(e.categoryId);
    if (c)
      t[c.group === 'Income' ? 'income' : c.group === 'Living' ? 'living' : 'debt'] += e.amount;
  }
  return finish(t);
}
export function actualCategory(p: Plan, c: Category, m: string, date = reportDate(p)) {
  const t = actual(p, `${m}-01`, date < monthEnd(m) ? date : monthEnd(m), c.id);
  return c.group === 'Income' ? t.income : c.group === 'Living' ? t.living : t.debt;
}
// A same-month settlement replaces the advance installment for the following due month.
function releasedAdvance(p: Plan, m: string) {
  return p.settings.emiPreviousMonth
    ? round(
        p.categories
          .filter((c) => c.role === 'emi' && !c.loanId)
          .reduce((sum, c) => sum + fullAmount(p, c, m, 'Scheduled'), 0),
      )
    : 0;
}
export function forecast(p: Plan, mode = p.settings.mode): ForecastRow[] {
  let cash = p.settings.opening;
  return monthsBetween(p.settings.planStart, p.settings.planEnd).map((m) => {
    const t = planned(p, m, undefined, mode);
    cash = round(cash + t.savings);
    const emi = round(
        p.categories
          .filter((c) => c.role === 'emi')
          .reduce((n, c) => n + fullAmount(p, c, m, mode), 0),
      ),
      closure = round(
        p.categories
          .filter((c) => c.role === 'closure')
          .reduce((n, c) => n + fullAmount(p, c, m, mode), 0),
      );
    const reserve = p.settings.emiPreviousMonth
      ? 0
      : round(
          p.categories
            .filter((c) => c.role === 'emi')
            .reduce((n, c) => n + fullAmount(p, c, addMonths(m, 1), mode), 0),
        );
    const balance = contractBalance(p, m);
    return {
      month: m,
      ...t,
      emi,
      closure,
      cash,
      reserve,
      spendable: round(cash - reserve),
      balance,
      headroom: round(
        cash +
          (mode === 'Early closure' && m >= p.settings.closureMonth ? 0 : releasedAdvance(p, m)) -
          (mode === 'Early closure' && m >= p.settings.closureMonth ? 0 : closureAmount(p, m)),
      ),
    };
  });
}
export function cumulative(p: Plan, date = reportDate(p)) {
  const t = emptyTotals();
  for (const m of monthsBetween(p.settings.planStart, p.settings.planEnd)) {
    if (m > date.slice(0, 7)) break;
    const v = planned(p, m, date);
    t.income += v.income;
    t.living += v.living;
    t.debt += v.debt;
  }
  const plan = finish(t),
    a = actual(p, `${p.settings.planStart}-01`, date);
  return {
    plan,
    actual: a,
    expectedCash: round(p.settings.opening + plan.savings),
    actualCash: round(p.settings.opening + a.savings),
  };
}
export function progress(p: Plan, date = reportDate(p)): ProgressRow[] {
  let pc = p.settings.opening,
    ac = p.settings.opening,
    hadEntries = false;
  const cats = new Map(p.categories.map((c) => [c.id, c]));
  const buckets = new Map<string, { t: Totals; count: number }>();
  for (const e of p.entries) {
    if (e.date > date || !inRange(e.date, p.settings.planStart, p.settings.planEnd)) continue;
    const c = cats.get(e.categoryId);
    if (!c) continue;
    const m = e.date.slice(0, 7),
      bucket = buckets.get(m) ?? { t: emptyTotals(), count: 0 };
    bucket.t[c.group === 'Income' ? 'income' : c.group === 'Living' ? 'living' : 'debt'] +=
      e.amount;
    bucket.count++;
    buckets.set(m, bucket);
  }
  return monthsBetween(p.settings.planStart, p.settings.planEnd).map((m) => {
    const future = m > date.slice(0, 7),
      t = planned(p, m, date),
      bucket = buckets.get(m),
      a = bucket ? finish(bucket.t) : null;
    pc = round(pc + t.savings);
    ac = round(ac + (a?.savings ?? 0));
    hadEntries ||= !!a;
    return {
      month: m,
      plan: t,
      actual: a,
      expectedCash: future ? null : pc,
      recordedCash: future || !hadEntries ? null : ac,
      count: bucket?.count ?? 0,
      status: future ? 'Future' : m === date.slice(0, 7) ? 'Current' : 'Past',
    };
  });
}
export function closureAnalysis(p: Plan) {
  const normal = forecast(p, 'Scheduled'),
    m = p.settings.closureMonth,
    r = normal.find((x) => x.month === m),
    quote = closureAmount(p);
  const available = r ? round(r.cash + releasedAdvance(p, m)) : null;
  const after = available === null ? null : round(available - quote);
  const earliest = normal.find(
    (x) =>
      x.balance > 0 &&
      x.month >= (p.loan.rows[0]?.month ?? '9999-12') &&
      round(x.cash + releasedAdvance(p, x.month) - closureAmount(p, x.month)) >= p.settings.cushion,
  );
  const interest = round(
    p.loan.rows.filter((x) => x.month > m).reduce((n, x) => n + x.interest, 0) -
      p.settings.accruedInterest -
      p.settings.fees,
  );
  return {
    principal: contractBalance(p, m),
    quote,
    available,
    after,
    assessment:
      after === null
        ? 'Outside plan range'
        : after < 0
          ? 'Insufficient cash'
          : after < p.settings.cushion
            ? 'Below cushion'
            : 'Meets cushion',
    earliest: earliest?.month ?? null,
    interestSaved: Math.max(0, interest),
  };
}
export function regenerateLoan(p: Plan): LoanRow[] {
  const l = p.loan,
    rate = l.annualRate / 1200,
    rows: LoanRow[] = [];
  let balance = l.principal;
  for (let i = 0; i < l.tenure && balance > 0; i++) {
    const month = addMonths(l.firstDueDate.slice(0, 7), i),
      interest = round(i === 0 ? l.firstInterest : balance * rate);
    let emi = i === 0 ? l.firstEmi : l.regularEmi;
    if (i === l.tenure - 1 || emi > balance + interest) emi = round(balance + interest);
    if (emi <= interest)
      throw Error('EMI must exceed interest. Increase the EMI or reduce the rate.');
    const principal = round(emi - interest);
    balance = round(Math.max(0, balance - principal));
    const old = p.loan.rows.find((r) => r.month === month);
    rows.push({
      id: old?.id ?? `loan-${month}`,
      month,
      dueDate: monthDay(month, l.dueDay),
      emi,
      principal,
      interest,
      balance,
      paidBeforeOpening: old?.paidBeforeOpening ?? false,
      paid: old?.paid ?? false,
      paidAmount: old?.paidAmount ?? 0,
      paidDate: old?.paidDate ?? '',
      edited: false,
    });
  }
  return rows;
}
