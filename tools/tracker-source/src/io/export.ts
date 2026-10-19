import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import type { Plan, Category } from '../domain/types';
import { APP_NAME } from '../domain/types';
import {
  forecast,
  progress,
  planned,
  actual,
  cumulative,
  categoryPlan,
  actualCategory,
  fullAmount,
  reportDate,
  key,
  money,
} from '../domain/calculate';
import { monthLabel, monthsBetween, monthEnd, displayDate, clampMonth } from '../domain/dates';
import { xmlEscape } from './files';
const currency = '"₹" #,##0.00;[Red]("₹" #,##0.00);"–"';
const fill = (argb: string): ExcelJS.Fill => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb },
});
const navy = 'FF193452',
  purple = 'FF6255DF',
  teal = 'FF087F8C';
function header(ws: ExcelJS.Worksheet, row: number, values: string[], color = teal) {
  ws.getRow(row).values = values;
  ws.getRow(row).height = 32;
  ws.getRow(row).eachCell((c) => {
    c.fill = fill(color);
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { vertical: 'middle', wrapText: true };
  });
}
function baseSheet(wb: ExcelJS.Workbook, name: string, title: string) {
  const ws = wb.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: false }],
  });
  ws.properties.defaultRowHeight = 22;
  ws.columns = Array.from({ length: 14 }, (_, i) => ({ width: i === 0 ? 25 : 19 }));
  ws.mergeCells('A1:G2');
  ws.getCell('A1').value = title;
  ws.getCell('A1').font = { name: 'Calibri', size: 21, bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getCell('A1').fill = fill(navy);
  ws.getCell('A1').alignment = { vertical: 'middle' };
  ws.getRow(1).height = 24;
  ws.getRow(2).height = 24;
  ws.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };
  return ws;
}
function bands(ws: ExcelJS.Worksheet, from: number, to: number, last: number) {
  for (let r = from; r <= to; r++)
    for (let c = 1; c <= last; c++) {
      const cell = ws.getCell(r, c);
      if (r % 2) cell.fill = fill('FFF1F5FB');
      cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF23364D' } };
      cell.alignment = { vertical: 'middle', wrapText: c === 1 };
      if (c > 1 && typeof cell.value === 'number') cell.numFmt = currency;
    }
}
const d = (date: string) => new Date(date + 'T00:00:00Z');
export function exportRange(p: Plan): [string, string] {
  return p.settings.applyViewToExport
    ? [p.settings.viewStart, p.settings.viewEnd]
    : [p.settings.planStart, p.settings.planEnd];
}
export async function exportWorkbook(
  p: Plan,
  start = p.settings.planStart,
  end = p.settings.planEnd,
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = APP_NAME;
  wb.title = APP_NAME;
  wb.subject = 'Savings, expenses and loan plan';
  wb.created = new Date();
  wb.calcProperties.fullCalcOnLoad = true;
  const dash = baseSheet(wb, 'Dashboard', APP_NAME),
    daily = baseSheet(wb, 'Daily entries', APP_NAME + ' · Daily entries'),
    budget = baseSheet(wb, 'Budget', APP_NAME + ' · Budget'),
    loan = baseSheet(wb, 'Loan schedule', APP_NAME + ' · Loan schedule'),
    fc = baseSheet(wb, 'Forecast', APP_NAME + ' · Forecast');
  const month = clampMonth(p.settings.selectedMonth, start, end),
    date = reportDate(p),
    full = planned(p, month),
    due = planned(p, month, date),
    act = actual(p, month + '-01', date < monthEnd(month) ? date : monthEnd(month)),
    cum = cumulative(p, date),
    forecastRows = forecast(p),
    forecastRange = forecastRows.filter((r) => r.month >= start && r.month <= end);
  dash.getCell('A3').value = `View: ${monthLabel(start)} → ${monthLabel(end)}`;
  dash.mergeCells('A3:C3');
  dash.getCell('D3').value = `Report through ${displayDate(date)}`;
  dash.mergeCells('D3:G3');
  header(dash, 5, [
    'Selected month: ' + monthLabel(month),
    'Full-month plan',
    'Plan by date',
    'Actual entered',
    'Favourable difference',
  ]);
  (['income', 'living', 'debt', 'expenses', 'savings'] as const).forEach((k, i) => {
    dash.getRow(6 + i).values = [
      ['Income', 'Living expenses', 'Loan payments', 'Total expenses', 'Saved this month'][i],
      full[k],
      due[k],
      act[k],
      k === 'income' || k === 'savings' ? act[k] - due[k] : due[k] - act[k],
    ];
  });
  bands(dash, 6, 10, 5);
  header(
    dash,
    13,
    ['Plan start → report date', 'Expected', 'Actual', 'Favourable difference'],
    purple,
  );
  [
    ['Income received', cum.plan.income, cum.actual.income],
    ['Total expenses', cum.plan.expenses, cum.actual.expenses],
    ['Savings added', cum.plan.savings, cum.actual.savings],
    ['Cash balance', cum.expectedCash, cum.actualCash],
  ].forEach((r, i) => {
    dash.getRow(14 + i).values = [
      ...r,
      i === 1 ? Number(r[1]) - Number(r[2]) : Number(r[2]) - Number(r[1]),
    ];
  });
  bands(dash, 14, 17, 4);
  header(dash, 20, [
    'Category',
    'Full-month plan',
    'Plan by date',
    'Actual',
    'Remaining / income gap',
  ]);
  p.categories.forEach((c, i) => {
    const v = actualCategory(p, c, month, date),
      f = fullAmount(p, c, month);
    dash.getRow(21 + i).values = [c.name, f, categoryPlan(p, c, month, date), v, f - v];
  });
  bands(dash, 21, 20 + p.categories.length, 5);
  dash.addConditionalFormatting({
    ref: 'E6:E10',
    rules: [
      {
        type: 'cellIs',
        operator: 'lessThan',
        formulae: ['0'],
        priority: 1,
        style: { fill: fill('FFFCE7EB'), font: { color: { argb: 'FFB43455' } } },
      },
      {
        type: 'cellIs',
        operator: 'greaterThan',
        formulae: ['-0.005'],
        priority: 2,
        style: { fill: fill('FFDDF4EC') },
      },
    ],
  });
  daily.mergeCells('A4:H4');
  daily.getCell('A4').value =
    'One transaction per row. Positive income and expenses. Group and status are calculated by the app.';
  header(daily, 7, [
    'Date',
    'Category',
    'Description',
    'Amount (₹)',
    'Payment method',
    'Notes',
    'Group',
    'Status',
  ]);
  const entries = p.entries.filter((e) => e.date >= start + '-01' && e.date <= monthEnd(end));
  entries.forEach((e, i) => {
    const c = p.categories.find((c) => c.id === e.categoryId);
    daily.getRow(i + 8).values = [
      d(e.date),
      c?.name,
      e.description,
      e.amount,
      e.payment,
      e.notes,
      c?.group,
      e.date <= date ? 'Counted' : 'Future – excluded until report date',
    ];
    daily.getCell(i + 8, 1).numFmt = 'dd-mmm-yyyy';
    daily.getCell(i + 8, 4).numFmt = currency;
  });
  bands(daily, 8, Math.max(8, 7 + entries.length), 8);
  daily.getColumn(3).width = 32;
  daily.getColumn(6).width = 36;
  daily.views = [{ state: 'frozen', ySplit: 7, showGridLines: false }];
  daily.autoFilter = { from: 'A7', to: `H${Math.max(8, 7 + entries.length)}` };
  const exportState = structuredClone(p);
  exportState.settings.planStart = start;
  exportState.settings.planEnd = end;
  exportState.settings.viewStart = start;
  exportState.settings.viewEnd = end;
  exportState.settings.selectedMonth = month;
  // Keep linked installment receipts even outside the exported budget window.
  const extraRowIds = new Set((p.additionalLoans ?? []).flatMap((l) => l.rows.map((r) => r.id)));
  exportState.entries = p.entries.filter(
    (e) => entries.some((x) => x.id === e.id) || (e.loanRowId && extraRowIds.has(e.loanRowId)),
  );
  exportState.overrides = Object.fromEntries(
    Object.entries(p.overrides).filter(([k]) => k.slice(0, 7) >= start && k.slice(0, 7) <= end),
  );
  exportState.loan.rows = p.loan.rows.filter((r) => r.month >= start && r.month <= end);
  if (start > p.settings.planStart) {
    exportState.settings.opening =
      forecastRows.filter((r) => r.month < start).at(-1)?.cash ?? p.settings.opening;
    budget.mergeCells('A4:G4');
    budget.getCell('A4').value =
      'Range export: opening savings carries the forecast cash before this range. Original cumulative balances are shown on Dashboard.';
  }
  const s = exportState.settings;
  const settingsRows = [
    ['Opening savings', s.opening],
    ['Expected full-month salary', s.salary31],
    ['Salary paid the following month', 'Yes'],
    ['Raised monthly salary', s.raisedSalary],
    ['Raise effective for salary month', d(s.raiseStart + '-01')],
    ['Salary received by day', s.salaryDay],
    ['Loan payment mode', s.mode],
    ['Early closure month', d(s.closureMonth + '-01')],
    ['Lender quote override', s.lenderQuote],
    ['Accrued interest estimate', s.accruedInterest],
    ['Closure fees and taxes', s.fees],
    ['Cash cushion after closure', s.cushion],
  ];
  settingsRows.forEach(([label, v], i) => {
    budget.mergeCells(`A${i + 6}:C${i + 6}`);
    budget.getCell(i + 6, 1).value = label as string;
    budget.getCell(i + 6, 4).value = v as any;
    budget.getCell(i + 6, 4).fill = fill('FFFFF0C2');
    budget.getCell(i + 6, 4).numFmt =
      v instanceof Date ? 'mmm yyyy' : typeof v === 'number' ? currency : 'General';
  });
  budget.getCell('D11').numFmt = '0';
  budget.getCell('F6').value = 'Plan starts';
  budget.getCell('I6').value = d(start + '-01');
  budget.getCell('F7').value = 'Plan ends';
  budget.getCell('I7').value = d(monthEnd(end));
  budget.getCell('I6').numFmt = budget.getCell('I7').numFmt = 'dd-mmm-yyyy';
  header(budget, 25, [
    'Category',
    'Group',
    '',
    'Base amount',
    'Timing',
    'Day',
    'Notes',
    '',
    'Active',
    'Rule',
    'Category ID',
    'Months',
  ]);
  p.categories.forEach((c, i) => {
    budget.getRow(i + 26).values = [
      c.name,
      c.group,
      '',
      c.amount,
      c.timing,
      c.day,
      c.note,
      '',
      c.active,
      c.role,
      c.id,
      c.months.join(','),
    ];
    budget.getCell(i + 26, 4).numFmt = currency;
  });
  budget.getColumn(7).width = 45;
  budget.getColumn(11).hidden = true;
  budget.getColumn(12).hidden = true;
  const lr = Math.max(54, 26 + p.categories.length + 10);
  header(budget, lr - 1, [
    'Month',
    'Category',
    'Group',
    'Full-month plan',
    'Plan by date',
    'Timing',
    'Day',
  ]);
  let ri = lr;
  for (const m of monthsBetween(start, end))
    for (const [i, c] of p.categories.entries()) {
      const cr = i + 26;
      let formula = `$D$${cr}`;
      if (c.role === 'salary') formula = `IF(EDATE(A${ri},-1)>=$D$10,$D$9,$D$7)`;
      if (c.role === 'emi' && !c.loanId)
        formula = `IF(AND($D$12="Early closure",A${ri}>$D$13),0,SUMIFS('Loan schedule'!$C$5:$C$${Math.max(5, 4 + exportState.loan.rows.length)},'Loan schedule'!$A$5:$A$${Math.max(5, 4 + exportState.loan.rows.length)},A${ri},'Loan schedule'!$G$5:$G$${Math.max(5, 4 + exportState.loan.rows.length)},FALSE))`;
      if (c.role === 'closure') formula = String(fullAmount(p, c, m));
      if (c.loanId) formula = String(fullAmount(p, c, m));
      if (c.role === 'regular' && c.months.length)
        formula = `IF(OR(${c.months.map((n) => `MONTH(A${ri})=${n}`).join(',')}),$D$${cr},0)`;
      if (!c.active) formula = '0';
      budget.getRow(ri).values = [
        d(m + '-01'),
        c.name,
        c.group,
        key(m, c.id) in p.overrides
          ? p.overrides[key(m, c.id)]
          : { formula, result: fullAmount(p, c, m) },
        categoryPlan(p, c, m, date),
        c.timing,
        c.day,
      ];
      budget.getCell(ri, 1).numFmt = 'mmm yyyy';
      budget.getCell(ri, 4).numFmt = budget.getCell(ri, 5).numFmt = currency;
      budget.getCell(ri, 4).fill = fill('FFFFF0C2');
      ri++;
    }
  budget.autoFilter = { from: { row: lr - 1, column: 1 }, to: { row: ri - 1, column: 7 } };
  const metadata = JSON.stringify(exportState),
    chunks = metadata.match(/[\s\S]{1,30000}/g) ?? [];
  budget.getCell('M1').value = 'Savings and Expense Tracker metadata v1';
  budget.getCell('N1').value = chunks.length;
  chunks.forEach((chunk, i) => (budget.getCell(i + 2, 13).value = chunk));
  budget.getColumn(13).hidden = true;
  budget.getColumn(14).hidden = true;
  header(loan, 4, [
    'Month',
    'Due date',
    'EMI',
    'Principal repaid',
    'Interest',
    'Balance after EMI',
    'Paid before opening',
    'Paid',
    'Actual paid',
    'Paid date',
    'Edited',
    'ID',
  ]);
  exportState.loan.rows.forEach((r, i) => {
    loan.getRow(i + 5).values = [
      d(r.month + '-01'),
      d(r.dueDate),
      r.emi,
      r.principal,
      r.interest,
      r.balance,
      r.paidBeforeOpening,
      r.paid,
      r.paidAmount,
      r.paidDate ? d(r.paidDate) : '',
      !!r.edited,
      r.id,
    ];
    loan.getCell(i + 5, 1).numFmt = 'mmm yyyy';
    loan.getCell(i + 5, 2).numFmt = loan.getCell(i + 5, 10).numFmt = 'dd-mmm-yyyy';
  });
  bands(loan, 5, 4 + exportState.loan.rows.length, 12);
  loan.getColumn(12).hidden = true;
  if (p.additionalLoans?.length) {
    const additional = baseSheet(wb, 'Additional loans', APP_NAME + ' · Additional loans');
    header(additional, 4, [
      'Loan',
      'Financed amount',
      'Total repayment',
      'Installment',
      'Due date',
      'EMI',
      'Actual paid',
      'Payment date',
      'Status',
    ]);
    let index = 5;
    for (const l of p.additionalLoans)
      for (const [i, r] of l.rows.entries()) {
        additional.getRow(index).values = [
          l.name,
          l.principal,
          l.monthlyEmi * l.tenure,
          i + 1,
          d(r.dueDate),
          r.emi,
          r.paidAmount,
          r.paidDate ? d(r.paidDate) : '',
          r.paid ? 'Paid' : r.paidAmount ? 'Partial' : 'Unpaid',
        ];
        additional.getCell(index, 5).numFmt = additional.getCell(index, 8).numFmt = 'dd-mmm-yyyy';
        index++;
      }
    bands(additional, 5, index - 1, 9);
  }
  header(fc, 4, [
    'Month',
    'Income',
    'Living',
    'EMI',
    'Closure',
    'Total expenses',
    'Savings added',
    'Closing cash',
    'Next EMI reserve',
    'Spendable cash',
    'Contract balance',
    'Closure headroom',
  ]);
  forecastRange.forEach((r, i) => {
    fc.getRow(i + 5).values = [
      d(r.month + '-01'),
      r.income,
      r.living,
      r.emi,
      r.closure,
      r.expenses,
      r.savings,
      r.cash,
      r.reserve,
      r.spendable,
      r.balance,
      r.headroom,
    ];
    fc.getCell(i + 5, 1).numFmt = 'mmm yyyy';
  });
  bands(fc, 5, 4 + forecastRange.length, 12);
  fc.autoFilter = { from: 'A4', to: `L${4 + forecastRange.length}` };
  fc.addConditionalFormatting({
    ref: `G5:L${4 + forecastRange.length}`,
    rules: [
      {
        type: 'cellIs',
        operator: 'lessThan',
        formulae: ['0'],
        priority: 1,
        style: { font: { color: { argb: 'FFB43455' } }, fill: fill('FFFCE7EB') },
      },
    ],
  });
  const chartData = progress(p, date).filter(
    (r) => r.month >= start && r.month <= end && r.status !== 'Future',
  );
  dash.getRow(4).getCell(10).value = 'Month';
  ['Plan savings', 'Actual savings', 'Expected cash', 'Recorded cash'].forEach(
    (v, i) => (dash.getCell(4, i + 11).value = v),
  );
  chartData.forEach((r, i) => {
    [
      monthLabel(r.month),
      r.plan.savings,
      r.actual?.savings ?? null,
      r.expectedCash,
      r.recordedCash,
    ].forEach((v, j) => (dash.getCell(i + 5, j + 10).value = v));
  });
  for (let c = 10; c <= 14; c++) dash.getColumn(c).hidden = true;
  const bytes = new Uint8Array((await wb.xlsx.writeBuffer()) as any);
  return addCharts(bytes, chartData, Math.max(41, 23 + p.categories.length));
}
async function addCharts(bytes: Uint8Array, data: ReturnType<typeof progress>, row: number) {
  const zip = await JSZip.loadAsync(bytes),
    ns = 'http://schemas.openxmlformats.org';
  const n = data.length;
  const series = (
    name: string,
    col: string,
    values: (number | null)[],
    color: string,
    id: number,
  ) =>
    `<c:ser><c:idx val="${id}"/><c:order val="${id}"/><c:tx><c:v>${xmlEscape(name)}</c:v></c:tx><c:spPr><a:ln w="28575"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="4"/></c:marker><c:cat><c:strRef><c:f>Dashboard!$J$5:$J$${Math.max(5, n + 4)}</c:f><c:strCache><c:ptCount val="${n}"/>${data.map((r, i) => `<c:pt idx="${i}"><c:v>${xmlEscape(monthLabel(r.month))}</c:v></c:pt>`).join('')}</c:strCache></c:strRef></c:cat><c:val><c:numRef><c:f>Dashboard!$${col}$5:$${col}$${Math.max(5, n + 4)}</c:f><c:numCache><c:formatCode>#,##0.00</c:formatCode><c:ptCount val="${n}"/>${values.map((v, i) => (v === null ? '' : `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`)).join('')}</c:numCache></c:numRef></c:val></c:ser>`;
  const specs = [
    {
      title: 'Savings and Expense Tracker · Monthly savings',
      series:
        series(
          'Plan savings',
          'K',
          data.map((r) => r.plan.savings),
          '8D79DF',
          0,
        ) +
        series(
          'Actual savings',
          'L',
          data.map((r) => r.actual?.savings ?? null),
          '20B69C',
          1,
        ),
    },
    {
      title: 'Savings and Expense Tracker · Cash balance',
      series:
        series(
          'Expected cash',
          'M',
          data.map((r) => r.expectedCash),
          '8D79DF',
          0,
        ) +
        series(
          'Recorded cash',
          'N',
          data.map((r) => r.recordedCash),
          '20B69C',
          1,
        ),
    },
  ];
  for (let i = 0; i < 2; i++)
    zip.file(
      `xl/charts/chart${i + 1}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="${ns}/drawingml/2006/chart" xmlns:a="${ns}/drawingml/2006/main"><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-IN" sz="1300"/><a:t>${xmlEscape(specs[i].title)}</a:t></a:r></a:p></c:rich></c:tx></c:title><c:plotArea><c:layout/><c:lineChart><c:grouping val="standard"/>${specs[i].series}<c:axId val="100"/><c:axId val="200"/></c:lineChart><c:catAx><c:axId val="100"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:tickLblPos val="nextTo"/><c:crossAx val="200"/><c:crosses val="autoZero"/></c:catAx><c:valAx><c:axId val="200"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="l"/><c:majorGridlines/><c:numFmt formatCode="#,##0" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="100"/><c:crosses val="autoZero"/></c:valAx></c:plotArea><c:legend><c:legendPos val="b"/></c:legend><c:plotVisOnly val="0"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`,
    );
  const anchor = (i: number) =>
    `<xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row + i * 19}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>7</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row + 17 + i * 19}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 1}" name="Chart ${i + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${ns}/drawingml/2006/chart"><c:chart xmlns:c="${ns}/drawingml/2006/chart" xmlns:r="${ns}/officeDocument/2006/relationships" r:id="rId${i + 1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;
  zip.file(
    'xl/drawings/drawing1.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="${ns}/drawingml/2006/spreadsheetDrawing" xmlns:a="${ns}/drawingml/2006/main">${anchor(0)}${anchor(1)}</xdr:wsDr>`,
  );
  zip.file(
    'xl/drawings/_rels/drawing1.xml.rels',
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${ns}/package/2006/relationships"><Relationship Id="rId1" Type="${ns}/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/><Relationship Id="rId2" Type="${ns}/officeDocument/2006/relationships/chart" Target="../charts/chart2.xml"/></Relationships>`,
  );
  let sheet = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
  sheet = sheet.replace('</worksheet>', '<drawing r:id="rIdCharts"/></worksheet>');
  zip.file('xl/worksheets/sheet1.xml', sheet);
  const relPath = 'xl/worksheets/_rels/sheet1.xml.rels';
  let rel =
    (await zip.file(relPath)?.async('string')) ??
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${ns}/package/2006/relationships"></Relationships>`;
  rel = rel.replace(
    '</Relationships>',
    `<Relationship Id="rIdCharts" Type="${ns}/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`,
  );
  zip.file(relPath, rel);
  let content = await zip.file('[Content_Types].xml')!.async('string');
  content = content.replace(
    '</Types>',
    '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/><Override PartName="/xl/charts/chart2.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>',
  );
  zip.file('[Content_Types].xml', content);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
export function monthlyReport(p: Plan) {
  const m = p.settings.selectedMonth,
    date = reportDate(p),
    full = planned(p, m),
    due = planned(p, m, date),
    a = actual(p, m + '-01', date < monthEnd(m) ? date : monthEnd(m)),
    c = cumulative(p);
  const html = (s: unknown) => xmlEscape(s);
  const row = (c: Category) =>
    `<tr><td>${html(c.name)}</td><td>${html(money(fullAmount(p, c, m)))}</td><td>${html(money(categoryPlan(p, c, m, date)))}</td><td>${html(money(actualCategory(p, c, m, date)))}</td></tr>`;
  return `<!doctype html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none';style-src 'unsafe-inline';img-src data:;font-src data:"><title>${APP_NAME}</title><style>body{font:12px Arial,sans-serif;color:#23364d;margin:28px}h1{font-size:24px;color:#6255df}h2{font-size:17px;margin-top:30px}small{color:#64748b}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#087f8c;color:white;text-align:right;padding:10px}th:first-child,td:first-child{text-align:left}td{text-align:right;padding:9px;border-bottom:1px solid #e4e9f0}tr:nth-child(even){background:#f3f6fc}.kpis{display:flex;gap:12px;margin-top:22px}.card{flex:1;background:#eeeafb;padding:18px;border-radius:12px}.card strong{display:block;font-size:20px;margin-top:8px}footer{margin-top:30px;font-size:10px;color:#64748b}thead{display:table-header-group}tr{break-inside:avoid}</style></head><body><h1>${APP_NAME}</h1><h2>${html(monthLabel(m, true))} · Monthly report</h2><small>Report through ${html(displayDate(date))}. Plan range ${html(monthLabel(p.settings.planStart))} – ${html(monthLabel(p.settings.planEnd))}.</small><div class="kpis"><div class="card">Actual income<strong>${html(money(a.income))}</strong></div><div class="card">Actual expenses<strong>${html(money(a.expenses))}</strong></div><div class="card">Saved this month<strong>${html(money(a.savings))}</strong></div></div><table><thead><tr><th>Metric</th><th>Full plan</th><th>Plan by date</th><th>Actual</th></tr></thead><tbody>${(['income', 'living', 'debt', 'expenses', 'savings'] as const).map((k, i) => `<tr><td>${['Income', 'Living expenses', 'Loan payments', 'Total expenses', 'Saved this month'][i]}</td><td>${html(money(full[k]))}</td><td>${html(money(due[k]))}</td><td>${html(money(a[k]))}</td></tr>`).join('')}</tbody></table><h2>From the plan start to the report date</h2><p>Expected cash ${html(money(c.expectedCash))} · Recorded cash ${html(money(c.actualCash))}</p><h2>Category comparison</h2><table><thead><tr><th>Category</th><th>Full plan</th><th>Plan by date</th><th>Actual</th></tr></thead><tbody>${p.categories.map(row).join('')}</tbody></table><footer>Actual totals include entered transactions only. Daily budgets are spread across the month; fixed-day budgets count when due. Generated offline by ${APP_NAME}.</footer></body></html>`;
}
