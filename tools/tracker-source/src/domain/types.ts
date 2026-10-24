export const APP_NAME = 'Savings and Expense Tracker';
/** Pre-1.0.1 spelling. Kept only so existing data, backups and workbooks keep loading. */
export const LEGACY_APP_NAME = 'Savings and Expence Tracker';
export const isAppFormat = (v: unknown) => v === APP_NAME || v === LEGACY_APP_NAME;
export type Group = 'Income' | 'Living' | 'Debt';
export type Role = 'regular' | 'salary' | 'emi' | 'closure';
export interface Category {
  loanId?: string;
  id: string;
  name: string;
  group: Group;
  amount: number;
  timing: 'Daily' | 'Fixed day';
  day: number;
  months: number[];
  active: boolean;
  role: Role;
  note: string;
  edited?: boolean;
}
export interface Entry {
  id: string;
  date: string;
  categoryId: string;
  description: string;
  amount: number;
  payment: string;
  notes: string;
  edited?: boolean;
  loanRowId?: string;
}
export interface LoanRow {
  id: string;
  month: string;
  dueDate: string;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
  paidBeforeOpening: boolean;
  paid: boolean;
  paidAmount: number;
  paidDate: string;
  edited?: boolean;
}
export interface Settings {
  emiPreviousMonth?: boolean;
  planStart: string;
  planEnd: string;
  opening: number;
  salary31: number; // Expected full-month salary; legacy serialized key.
  salaryShort: number; // Deprecated compatibility value; no longer a separate rule.
  raisedSalary: number;
  raiseStart: string;
  salaryDay: number;
  reportDate: string;
  liveDate: boolean;
  selectedMonth: string;
  viewStart: string;
  viewEnd: string;
  applyViewToExport: boolean;
  mode: 'Scheduled' | 'Early closure';
  closureMonth: string;
  lenderQuote: number;
  accruedInterest: number;
  fees: number;
  cushion: number;
  theme: 'light' | 'dark' | 'system';
  palette: string;
  animations: boolean;
  dateFormat: 'dd-MMM-yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd';
  autoStart: boolean;
  tray: boolean;
  backupFolder: string;
  reminders: {
    salary: boolean;
    emi: boolean;
    recharge: boolean;
    missing: boolean;
  };
}
export interface Plan {
  additionalLoans?: InstallmentLoan[];
  schemaVersion: 1;
  settings: Settings;
  categories: Category[];
  entries: Entry[];
  overrides: Record<string, number>;
  loan: {
    principal: number;
    annualRate: number;
    tenure: number;
    regularEmi: number;
    firstEmi: number;
    firstInterest: number;
    firstDueDate: string;
    dueDay: number;
    rows: LoanRow[];
  };
  celebrated: string[];
  source: {
    filename: string;
    importedAt: string;
    originalStart: string;
    originalEnd: string;
  };
}
export interface InstallmentLoan {
  id: string;
  name: string;
  principal: number;
  monthlyEmi: number;
  tenure: number;
  firstDueDate: string;
  note: string;
  rows: InstallmentRow[];
}
export interface InstallmentRow {
  id: string;
  month: string;
  dueDate: string;
  emi: number;
  paid: boolean;
  paidBeforeOpening: boolean;
  paidAmount: number;
  paidDate: string;
}
export interface Delta {
  path: (string | number)[];
  before: unknown;
  after: unknown;
  op: 'add' | 'replace' | 'remove';
}
export interface Audit {
  id: string;
  at: string;
  label: string;
  changes: Delta[];
  forward: import('immer').Patch[];
  inverse: import('immer').Patch[];
}
export interface Envelope {
  sync?: import('../cloud/model').SyncMeta;
  format: typeof APP_NAME | typeof LEGACY_APP_NAME;
  schemaVersion: 1;
  data: Plan;
  audit: Audit[];
  undo: string[];
  redo: string[];
}
export interface Totals {
  income: number;
  living: number;
  debt: number;
  expenses: number;
  savings: number;
}
export interface ForecastRow extends Totals {
  month: string;
  emi: number;
  closure: number;
  cash: number;
  reserve: number;
  spendable: number;
  balance: number;
  headroom: number;
}
export interface ProgressRow {
  month: string;
  plan: Totals;
  actual: Totals | null;
  expectedCash: number | null;
  recordedCash: number | null;
  count: number;
  status: 'Past' | 'Current' | 'Future';
}
export interface ImportPreview {
  plan: Plan;
  warnings: string[];
  summary: string[];
  unknownCategories: string[];
  sourceRows: number;
}
