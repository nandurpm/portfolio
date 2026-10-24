import type ExcelJS from 'exceljs';
import { excelCompatible } from './normalize';
import { freshPlan } from '../domain/defaults';
import type { Plan, Entry, ImportPreview, Category, LoanRow } from '../domain/types';
import { validatePlan, validateEntry } from '../domain/validation';
import { clampMonth, monthEnd, validDate, validMonth } from '../domain/dates';
import { fullAmount, key, forecast } from '../domain/calculate';
export type ColumnMapping = {
  date: string;
  category: string;
  description: string;
  amount: string;
  payment: string;
  notes: string;
};
export const defaultMapping: ColumnMapping = {
  date: 'Date',
  category: 'Category',
  description: 'Description',
  amount: 'Amount (₹)',
  payment: 'Payment method',
  notes: 'Notes',
};
export function value(cell: ExcelJS.Cell): any {
  const v = cell.value;
  if (v && typeof v === 'object') {
    if ('result' in v) return v.result;
    if ('richText' in v) return v.richText.map((r) => r.text).join('');
    if ('text' in v) return v.text;
  }
  return v;
}
export function iso(v: any): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number')
    return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000).toISOString().slice(0, 10);
  if (typeof v === 'string') {
    if (validDate(v.slice(0, 10))) return v.slice(0, 10);
    const m = /^(\d{1,2})[-/]([A-Za-z]{3}|\d{1,2})[-/](\d{4})$/.exec(v);
    if (m && m[1] && m[2] && m[3]) {
      const month = isNaN(+m[2])
        ? [
            'jan',
            'feb',
            'mar',
            'apr',
            'may',
            'jun',
            'jul',
            'aug',
            'sep',
            'oct',
            'nov',
            'dec',
          ].indexOf(m[2].toLowerCase()) + 1
        : +m[2];
      const d = `${m[3]}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      if (validDate(d)) return d;
    }
  }
  return '';
}
const str = (v: any) => (v == null ? '' : String(v));
// Decode only explicitly marked tracker CSV rows. XLSX and generic CSV text is literal.
const unguard = (v: string) => v.replace(/^'(?=['=+@\-\t\r])/, '');
const num = (v: any, fallback = 0) => {
  const n = Number(typeof v === 'string' ? v.replace(/[₹,]/g, '') : v);
  return Number.isFinite(n) ? n : fallback;
};
function headers(ws: ExcelJS.Worksheet) {
  for (let r = 1; r <= Math.min(ws.rowCount, 100); r++) {
    const h = Array.from({ length: ws.columnCount }, (_, i) => str(value(ws.getCell(r, i + 1))));
    if (h.some((x) => /^date$/i.test(x)) && h.some((x) => /amount/i.test(x)))
      return { row: r, headers: h };
  }
  return {
    row: 1,
    headers: Array.from({ length: ws.columnCount }, (_, i) => str(value(ws.getCell(1, i + 1)))),
  };
}
function importRows(
  rows: any[][],
  head: string[],
  p: Plan,
  map: ColumnMapping,
  firstRow: number,
  encodedCSV = false,
) {
  const warnings: string[] = [],
    unknownCategories: string[] = [],
    entries: Entry[] = [];
  const index = (name: string, fallback: string[]) => {
    let i = head.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    if (i < 0) i = head.findIndex((h) => fallback.some((f) => h.toLowerCase() === f.toLowerCase()));
    return i;
  };
  const cols = {
    date: index(map.date, ['Date']),
    category: index(map.category, ['Category']),
    description: index(map.description, ['Description']),
    amount: index(map.amount, ['Amount', 'Amount (₹)', 'Amount (INR)']),
    payment: index(map.payment, ['Payment method', 'Payment']),
    notes: index(map.notes, ['Notes']),
  };
  if (cols.date < 0 || cols.category < 0 || cols.amount < 0)
    throw Error('Map Date, Category and Amount columns before importing.');
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    if (!row.some((v) => v !== null && v !== undefined && v !== '')) continue;
    const decode = (v: unknown) =>
      encodedCSV && row[head.indexOf('Tracker CSV encoding')] === 'apostrophe-v2'
        ? unguard(str(v))
        : str(v);
    const rawDate = row[cols.date],
      name = decode(row[cols.category]).trim(),
      amount = row[cols.amount];
    if ((rawDate == null || rawDate === '') && !name && (amount == null || amount === '')) continue;
    let c = p.categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (!c && name) {
      c = {
        id: crypto.randomUUID(),
        name,
        group: 'Living',
        amount: 0,
        timing: 'Daily',
        day: 1,
        months: [],
        active: true,
        role: 'regular',
        note: 'Imported category; review its group',
        edited: true,
      };
      p.categories.push(c);
      unknownCategories.push(name);
    }
    const e: Entry = {
      id: crypto.randomUUID(),
      date: iso(rawDate),
      categoryId: c?.id ?? '',
      description: decode(row[cols.description]),
      amount: num(amount, NaN),
      payment: decode(row[cols.payment]) || 'Other',
      notes: decode(row[cols.notes]),
      edited: false,
    };
    try {
      validateEntry(e, p, true);
      entries.push(e);
    } catch (error) {
      warnings.push(
        `Row ${firstRow + i}: ${error instanceof Error ? error.message : String(error)} Skipped.`,
      );
    }
  }
  return { entries, warnings, unknownCategories };
}
export async function readWorkbook(
  bytes: Uint8Array,
  base: Plan = freshPlan(),
  map: ColumnMapping = defaultMapping,
): Promise<ImportPreview & { headers: string[] }> {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await excelCompatible(bytes)) as any);
  const budget = wb.getWorksheet('Budget'),
    daily = wb.getWorksheet('Daily entries');
  if (!budget || !daily) throw Error('Workbook must contain Budget and Daily entries sheets.');
  let p = structuredClone(base);
  const warnings: string[] = [];
  let hasMetadata = false;
  if (
    ['Savings and Expense Tracker metadata v1', 'Savings and Expence Tracker metadata v1'].includes(
      str(value(budget.getCell('M1'))),
    )
  ) {
    try {
      const count = num(value(budget.getCell('N1')));
      if (count < 1 || count > 10000) throw Error('Metadata size invalid');
      const json = Array.from({ length: count }, (_, i) =>
        str(value(budget.getCell(i + 2, 13))),
      ).join('');
      p = validatePlan(JSON.parse(json));
      hasMetadata = true;
    } catch {
      throw Error(
        'Tracker metadata is invalid. Import stopped to protect archived records and receipt links; restore a verified JSON backup instead.',
      );
    }
  }
  const s = p.settings;
  const controls: {
    cell: string;
    field: keyof typeof s;
    type: 'number' | 'month' | 'mode';
  }[] = [
    { cell: 'D6', field: 'opening', type: 'number' },
    { cell: 'D7', field: 'salary31', type: 'number' },
    { cell: 'D9', field: 'raisedSalary', type: 'number' },
    { cell: 'D10', field: 'raiseStart', type: 'month' },
    { cell: 'D11', field: 'salaryDay', type: 'number' },
    { cell: 'D12', field: 'mode', type: 'mode' },
    { cell: 'D13', field: 'closureMonth', type: 'month' },
    { cell: 'D14', field: 'lenderQuote', type: 'number' },
    { cell: 'D15', field: 'accruedInterest', type: 'number' },
    { cell: 'D16', field: 'fees', type: 'number' },
    { cell: 'D17', field: 'cushion', type: 'number' },
  ];
  for (const c of controls) {
    const v = value(budget.getCell(c.cell));
    if (v !== null && v !== undefined)
      (s as any)[c.field] =
        c.type === 'month' ? iso(v).slice(0, 7) : c.type === 'number' ? num(v) : str(v);
  }
  s.salaryShort = s.salary31; // Retained only for old backup compatibility.
  const start = iso(value(budget.getCell('I6'))).slice(0, 7),
    end = iso(value(budget.getCell('I7'))).slice(0, 7);
  if (validMonth(start)) s.planStart = start;
  if (validMonth(end)) s.planEnd = end;
  s.viewStart = s.planStart;
  s.viewEnd = s.planEnd;
  s.selectedMonth = clampMonth(s.selectedMonth, s.planStart, s.planEnd);
  const originalCats = structuredClone(p.categories),
    cats: Category[] = [];
  for (let r = 26; r < 500; r++) {
    const name = str(value(budget.getCell(r, 1))).trim(),
      group = str(value(budget.getCell(r, 2)));
    if (!name || !['Income', 'Living', 'Debt'].includes(group)) break;
    const original =
      originalCats.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? originalCats[r - 26];
    const note = str(value(budget.getCell(r, 7))),
      explicitMonths = value(budget.getCell(r, 12));
    let months = original?.months ?? [];
    if (explicitMonths !== null && explicitMonths !== undefined)
      months = str(explicitMonths).split(',').filter(Boolean).map(Number);
    else if (/only/i.test(note)) {
      const names = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      months = names.map((n, i) => (new RegExp(n, 'i').test(note) ? i + 1 : 0)).filter(Boolean);
    }
    cats.push({
      loanId: original?.loanId,
      id: str(value(budget.getCell(r, 11))) || original?.id || crypto.randomUUID(),
      name,
      group: group as Category['group'],
      amount: num(value(budget.getCell(r, 4))),
      timing: str(value(budget.getCell(r, 5))) === 'Fixed day' ? 'Fixed day' : 'Daily',
      day: num(value(budget.getCell(r, 6)), 1),
      months,
      active: value(budget.getCell(r, 9)) === false ? false : true,
      role: (str(value(budget.getCell(r, 10))) || original?.role || 'regular') as Category['role'],
      note,
      edited: false,
    });
  }
  if (cats.length) p.categories = cats;
  const loanSheet = wb.getWorksheet('Loan schedule');
  const loanRows: LoanRow[] = [];
  const loanStart = loanSheet ? 5 : 720,
    loanEnd = loanSheet ? loanSheet.rowCount : 755,
    ls = loanSheet ?? budget;
  for (let r = loanStart; r <= loanEnd; r++) {
    const month = iso(value(ls.getCell(r, 1))).slice(0, 7);
    if (!validMonth(month)) continue;
    const old = p.loan.rows.find((x) => x.month === month);
    loanRows.push({
      id: str(value(ls.getCell(r, 12))) || old?.id || `loan-${month}`,
      month,
      dueDate: iso(value(ls.getCell(r, 2))) || month + '-05',
      emi: num(value(ls.getCell(r, 3))),
      principal: num(value(ls.getCell(r, 4))),
      interest: num(value(ls.getCell(r, 5))),
      balance: num(value(ls.getCell(r, 6))),
      paidBeforeOpening: loanSheet ? !!value(ls.getCell(r, 7)) : (old?.paidBeforeOpening ?? false),
      paid: loanSheet ? !!value(ls.getCell(r, 8)) : (old?.paid ?? false),
      paidAmount: loanSheet ? num(value(ls.getCell(r, 9))) : (old?.paidAmount ?? 0),
      paidDate: loanSheet ? iso(value(ls.getCell(r, 10))) : (old?.paidDate ?? ''),
      edited: false,
    });
  }
  if (loanRows.length) p.loan.rows = loanRows;
  const visibleStart =
    hasMetadata && str(value(budget.getCell('O1'))) === 'Tracker visible entry range v1'
      ? str(value(budget.getCell('O2')))
      : s.planStart;
  const visibleEnd =
    hasMetadata && str(value(budget.getCell('O1'))) === 'Tracker visible entry range v1'
      ? str(value(budget.getCell('O3')))
      : s.planEnd;
  if (!validMonth(visibleStart) || !validMonth(visibleEnd) || visibleEnd < visibleStart)
    throw Error('Invalid workbook visible range');
  p.overrides = Object.fromEntries(
    Object.entries(p.overrides).filter(
      ([k]) => k.slice(0, 7) < visibleStart || k.slice(0, 7) > visibleEnd,
    ),
  );
  for (let r = 45; r <= budget.rowCount; r++) {
    const month = iso(value(budget.getCell(r, 1))).slice(0, 7),
      name = str(value(budget.getCell(r, 2))),
      c = p.categories.find((c) => c.name === name);
    if (!validMonth(month) || !c) continue;
    const raw = budget.getCell(r, 4).value;
    if (raw !== null && !(typeof raw === 'object' && ('formula' in raw || 'sharedFormula' in raw)))
      p.overrides[key(month, c.id)] = num(value(budget.getCell(r, 4)));
  }
  const h = headers(daily);
  const data = Array.from({ length: daily.rowCount - h.row }, (_, i) =>
    Array.from({ length: Math.max(daily.columnCount, 8) }, (_, j) =>
      value(daily.getCell(h.row + 1 + i, j + 1)),
    ),
  );
  const parsed = importRows(data, h.headers, p, map, h.row + 1);
  const linked = p.entries;
  const used = new Set<string>();
  for (const entry of parsed.entries) {
    const saved = linked.find(
      (e) =>
        !used.has(e.id) &&
        e.date === entry.date &&
        e.categoryId === entry.categoryId &&
        Math.abs(e.amount - entry.amount) < 0.01,
    );
    if (saved) {
      entry.id = saved.id;
      entry.loanRowId = saved.loanRowId;
      entry.provisionId = saved.provisionId;
      entry.billDueMonth = saved.billDueMonth;
      used.add(saved.id);
    }
  }
  const archived = linked.filter(
    (e) => !used.has(e.id) && (e.date < visibleStart + '-01' || e.date > monthEnd(visibleEnd)),
  );
  p.entries = [...parsed.entries, ...archived];
  for (const l of p.additionalLoans ?? [])
    for (const r of l.rows) {
      const cat = p.categories.find((c) => c.loanId === l.id);
      const match = p.entries.find(
        (e) =>
          e.categoryId === cat?.id &&
          e.date === r.paidDate &&
          Math.abs(e.amount - r.paidAmount) < 0.01 &&
          (!e.loanRowId || e.loanRowId === r.id),
      );
      if (match) match.loanRowId = r.id;
    }
  // Re-link marked payments only where a matching entry actually exists; never create duplicate actuals.
  for (const r of p.loan.rows) {
    if (r.paidBeforeOpening || p.entries.some((e) => e.loanRowId === r.id)) continue;
    const match = p.entries.find(
      (e) =>
        !e.loanRowId &&
        e.date === r.paidDate &&
        Math.abs(e.amount - r.paidAmount) < 0.01 &&
        p.categories.find((c) => c.id === e.categoryId)?.role === 'emi',
    );
    if (match) match.loanRowId = r.id;
    else if (r.paid) {
      warnings.push(
        `${r.month}: marked paid in the schedule but no matching transaction was found. Review this payment.`,
      );
    }
  }
  p.source = {
    filename: 'Imported workbook',
    importedAt: new Date().toISOString(),
    originalStart: s.planStart,
    originalEnd: s.planEnd,
  };
  validatePlan(p);
  const final = forecast(p).at(-1)?.cash ?? s.opening;
  return {
    plan: p,
    headers: h.headers,
    warnings: [...warnings, ...parsed.warnings],
    unknownCategories: parsed.unknownCategories,
    sourceRows: data.length,
    summary: [
      `${p.categories.length} categories`,
      `${p.entries.length} valid transactions`,
      `${p.loan.rows.length} loan schedule rows`,
      `${Object.keys(p.overrides).length} monthly overrides`,
      `Closing cash: ₹${final.toFixed(2)}`,
    ],
  };
}
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (quoted) throw Error('CSV has an unclosed quote.');
  if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, '');
  return rows;
}
export async function inspectColumns(bytes: Uint8Array, name: string) {
  if (name.toLowerCase().endsWith('.csv'))
    return parseCSV(new TextDecoder().decode(bytes))[0] ?? [];
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await excelCompatible(bytes)) as any);
  const ws = wb.getWorksheet('Daily entries');
  if (!ws) throw Error('No Daily entries sheet found.');
  return headers(ws).headers.filter(Boolean);
}
export function readCSV(
  text: string,
  base: Plan,
  map = defaultMapping,
): ImportPreview & { headers: string[] } {
  const p = structuredClone(base),
    rows = parseCSV(text),
    head = rows.shift() ?? [];
  const parsed = importRows(rows, head, p, map, 2, true);
  p.entries = parsed.entries;
  return {
    plan: p,
    headers: head,
    warnings: parsed.warnings,
    unknownCategories: parsed.unknownCategories,
    sourceRows: rows.length,
    summary: [
      `${p.entries.length} valid transactions`,
      `${parsed.unknownCategories.length} new categories`,
      `Date coverage retained; out-of-range entries go to the archive`,
    ],
  };
}
export function csvExport(p: Plan, start = p.settings.planStart, end = p.settings.planEnd) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const safe = (v: string) => (/^['=+@\-\t\r]/.test(v) ? "'" + v : v);
  const rows = [
    [
      'Date',
      'Category',
      'Description',
      'Amount (₹)',
      'Payment method',
      'Notes',
      'Tracker CSV encoding',
    ],
    ...p.entries
      .filter((e) => e.date >= start + '-01' && e.date <= monthEnd(end))
      .map((e) => [
        e.date,
        safe(p.categories.find((c) => c.id === e.categoryId)?.name ?? ''),
        safe(e.description),
        e.amount,
        safe(e.payment),
        safe(e.notes),
        'apostrophe-v2',
      ]),
  ];
  return '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
}
export function compareImported(p: Plan) {
  return {
    november: fullAmount(
      p,
      p.categories.find((c) => c.role === 'salary')!,
      p.settings.planStart,
    ),
    closing: forecast(p).at(-1)?.cash,
  };
}
