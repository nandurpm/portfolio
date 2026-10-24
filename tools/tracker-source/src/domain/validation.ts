import { z } from 'zod';
import { validDate, validMonth, monthsBetween, inRange } from './dates';
import { isAppFormat, type Plan, type Entry } from './types';
const nonnegative = z.number().finite().min(0).max(1e12),
  month = z.string().refine(validMonth, 'Use a valid month from 1900 to 2199'),
  date = z.string().refine(validDate, 'Use a valid date');
const category = z.object({
  loanId: z.string().optional(),
  id: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  group: z.enum(['Income', 'Living', 'Debt']),
  amount: nonnegative,
  timing: z.enum(['Daily', 'Fixed day']),
  day: z.number().int().min(1).max(31),
  months: z.array(z.number().int().min(1).max(12)),
  active: z.boolean(),
  role: z.enum(['regular', 'salary', 'emi', 'closure']),
  note: z.string(),
  edited: z.boolean().optional(),
});
const entry = z.object({
  id: z.string().min(1),
  date,
  categoryId: z.string().min(1),
  description: z.string().max(1000),
  amount: z.number().finite().positive().max(1e12),
  payment: z.string().min(1).max(100),
  notes: z.string().max(5000),
  edited: z.boolean().optional(),
  loanRowId: z.string().optional(),
});
const loanRow = z.object({
  id: z.string(),
  month,
  dueDate: date,
  emi: nonnegative,
  principal: nonnegative,
  interest: nonnegative,
  balance: nonnegative,
  paidBeforeOpening: z.boolean(),
  paid: z.boolean(),
  paidAmount: nonnegative,
  paidDate: z.union([z.literal(''), date]),
  edited: z.boolean().optional(),
});
export const planSchema = z.object({
  additionalLoans: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().min(1).max(100),
        principal: nonnegative.positive(),
        monthlyEmi: nonnegative.positive(),
        tenure: z.number().int().min(1).max(600),
        firstDueDate: date,
        note: z.string().max(5000),
        rows: z.array(
          loanRow.omit({
            principal: true,
            interest: true,
            balance: true,
            edited: true,
          }),
        ),
      }),
    )
    .optional(),
  schemaVersion: z.literal(1),
  settings: z.object({
    emiPreviousMonth: z.boolean().optional(),
    planStart: month,
    planEnd: month,
    opening: z.number().finite().min(-1e12).max(1e12),
    salary31: nonnegative,
    salaryShort: nonnegative,
    raisedSalary: nonnegative,
    raiseStart: month,
    salaryDay: z.number().int().min(1).max(31),
    reportDate: date,
    liveDate: z.boolean(),
    selectedMonth: month,
    viewStart: month,
    viewEnd: month,
    applyViewToExport: z.boolean(),
    mode: z.enum(['Scheduled', 'Early closure']),
    closureMonth: month,
    lenderQuote: nonnegative,
    accruedInterest: nonnegative,
    fees: nonnegative,
    cushion: nonnegative,
    theme: z.enum(['light', 'dark', 'system']),
    palette: z.string(),
    animations: z.boolean(),
    dateFormat: z.enum(['dd-MMM-yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd']),
    autoStart: z.boolean(),
    tray: z.boolean(),
    backupFolder: z.string(),
    reminders: z.object({
      salary: z.boolean(),
      emi: z.boolean(),
      recharge: z.boolean(),
      missing: z.boolean(),
    }),
  }),
  categories: z.array(category).min(1),
  entries: z.array(entry),
  overrides: z.record(z.string(), nonnegative),
  loan: z.object({
    principal: nonnegative,
    annualRate: z.number().finite().min(0).max(100),
    tenure: z.number().int().min(1).max(600),
    regularEmi: nonnegative,
    firstEmi: nonnegative,
    firstInterest: nonnegative,
    firstDueDate: date,
    dueDay: z.number().int().min(1).max(31),
    rows: z.array(loanRow),
  }),
  celebrated: z.array(z.string()),
  source: z.object({
    filename: z.string(),
    importedAt: z.string(),
    originalStart: month,
    originalEnd: month,
  }),
});
export function validatePlan(p: unknown): Plan {
  const v = planSchema.parse(p);
  if (v.settings.planStart > v.settings.planEnd)
    throw Error('Start month must be before the end month.');
  if (monthsBetween(v.settings.planStart, v.settings.planEnd).length > 600)
    throw Error('Use a plan of up to 600 months (50 years).');
  if (
    v.settings.viewStart < v.settings.planStart ||
    v.settings.viewEnd > v.settings.planEnd ||
    v.settings.viewStart > v.settings.viewEnd
  )
    throw Error('View range must lie inside the plan range.');
  if (
    v.settings.selectedMonth < v.settings.planStart ||
    v.settings.selectedMonth > v.settings.planEnd
  )
    throw Error('Selected month must lie inside the plan range.');
  const ids = new Set(v.categories.map((c) => c.id));
  const extra = v.additionalLoans ?? [];
  if (new Set(extra.map((l) => l.id)).size !== extra.length)
    throw Error('Loan IDs must be unique.');
  const allRows = [...v.loan.rows, ...extra.flatMap((l) => l.rows)];
  if (new Set(allRows.map((r) => r.id)).size !== allRows.length)
    throw Error('Installment IDs must be unique.');
  for (const l of extra) {
    if (l.rows.length !== l.tenure || new Set(l.rows.map((r) => r.month)).size !== l.rows.length)
      throw Error('Loan schedule must contain one row per installment.');
    if (
      v.categories.filter((c) => c.loanId === l.id && c.role === 'emi' && c.group === 'Debt')
        .length !== 1
    )
      throw Error('Each loan needs its own debt category.');
  }
  if (v.categories.some((c) => c.loanId && !extra.some((l) => l.id === c.loanId)))
    throw Error('Category refers to a missing loan.');
  if (allRows.some((r) => r.dueDate.slice(0, 7) !== r.month))
    throw Error('Installment date must match its month.');
  if (ids.size !== v.categories.length) throw Error('Category IDs must be unique.');
  if (new Set(v.categories.map((c) => c.name.toLowerCase())).size !== v.categories.length)
    throw Error('Category names must be unique.');
  if (new Set(v.entries.map((e) => e.id)).size !== v.entries.length)
    throw Error('Entry IDs must be unique.');
  if (v.entries.some((e) => !ids.has(e.categoryId)))
    throw Error('An entry refers to a missing category.');
  if (new Set(v.loan.rows.map((r) => r.month)).size !== v.loan.rows.length)
    throw Error('Loan schedule months must be unique.');
  for (const r of v.loan.rows)
    if (r.dueDate.slice(0, 7) !== r.month)
      throw Error('Loan due date must be within its schedule month.');
  return v as Plan;
}
export function validateEntry(e: Entry, p: Plan, allowArchive = false) {
  entry.parse(e);
  if (!p.categories.some((c) => c.id === e.categoryId)) throw Error('Select a valid category.');
  if (!allowArchive && !inRange(e.date, p.settings.planStart, p.settings.planEnd))
    throw Error('Date must be inside the plan range. Extend the range first if needed.');
}
export function validateBackup(raw: unknown) {
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('format' in raw) ||
    !isAppFormat(raw.format) ||
    !('data' in raw)
  )
    throw Error('This is not a Savings and Expense Tracker backup.');
  return validatePlan(raw.data);
}
