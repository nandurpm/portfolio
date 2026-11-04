import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { financialFixture } from "./fixtures/financial";
import { validatePlan } from "../src/domain/validation";
import { actual, actualCategory, fullAmount } from "../src/domain/calculate";
import {
  ledgerPostingFlow,
  reportCategories,
  reverseLedgerTransaction,
} from "../src/domain/ledger";
import { provisionResult } from "../src/domain/balances";
import { ledgerCsvExport, parseCSV, readCSV } from "../src/io/import";
import { exportWorkbook, monthlyReport } from "../src/io/export";
import type { LedgerTransaction } from "../src/domain/types";
const fixture = () => {
  const p = financialFixture().data;
  p.settings.reportDate = "2026-11-15";
  p.settings.selectedMonth = "2026-11";
  p.accounts = [
    {
      id: "bank",
      name: "Bank",
      kind: "bank",
      openingBalance: 2000,
      active: true,
      note: "",
    },
    {
      id: "fd",
      name: "FD",
      kind: "fixed-deposit",
      openingBalance: 300,
      active: true,
      note: "",
    },
  ];
  p.ledgerTransactions = [];
  return p;
};
const expense = (rest: Partial<LedgerTransaction> = {}): LedgerTransaction => ({
  id: "expense",
  date: "2026-11-11",
  kind: "expense",
  amount: 100,
  sourceAccountId: "bank",
  description: "Account bill",
  note: "",
  ...rest,
});
describe("independent audit findings F1–F5", () => {
  it("F1 refuses an Accounts expense tagged as an installment instead of inventing payment status", () => {
    const p = fixture();
    p.ledgerTransactions = [expense({ categoryId: "emi" })];
    expect(() => validatePlan(p)).toThrow(/Loan & Closure/);
    p.ledgerTransactions = [expense({ expenseCategoryId: "emi" })];
    expect(() => validatePlan(p)).toThrow(/Loan & Closure/);
  });
  it("F2 includes ledger bill payments and bounded refunds in reserve balances", () => {
    const p = fixture();
    p.provisions = [
      {
        id: "reserve",
        categoryId: "bill",
        startMonth: "2026-11",
        firstDueMonth: "2026-12",
        everyMonths: 2,
        monthlyAmount: 150,
        billAmount: 300,
        openingReserve: 50,
        allocationDay: 10,
        dueDay: 25,
        enabled: true,
      },
    ];
    p.ledgerTransactions = [
      expense({
        expenseCategoryId: "bill",
        provisionId: "reserve",
        billDueMonth: "2026-12",
      }),
    ];
    validatePlan(p);
    expect(provisionResult(p, p.provisions[0]!, "2026-11-15")).toMatchObject({
      allocations: 150,
      payments: 100,
      reserve: 100,
    });
    expect(
      fullAmount(
        p,
        p.categories.find((c) => c.id === "bill")!,
        "2026-11",
      ),
    ).toBe(100);
    expect(
      fullAmount(
        p,
        p.categories.find((c) => c.id === "bill")!,
        "2026-12",
      ),
    ).toBe(200);
    p.ledgerTransactions.push({
      id: "refund",
      date: "2026-11-12",
      kind: "refund",
      amount: 40,
      destinationAccountId: "bank",
      originalTransactionId: "expense",
      description: "Bill refund",
      note: "",
    });
    expect(provisionResult(p, p.provisions[0]!, "2026-11-15")).toMatchObject({
      payments: 60,
      reserve: 140,
    });
    reverseLedgerTransaction(
      p,
      "refund",
      "2026-11-13",
      "Refund entered in error",
    );
    expect(provisionResult(p, p.provisions[0]!, "2026-11-15").reserve).toBe(
      100,
    );
  });
  it("F3 exports visible typed audit records for ledger-only activity without flattening transfers", async () => {
    const p = fixture();
    p.ledgerTransactions = [
      expense({ expenseCategoryId: "bill" }),
      {
        ...expense(),
        id: "transfer",
        kind: "fd-deposit",
        amount: 50,
        destinationAccountId: "fd",
        description: "Deposit",
      },
    ];
    const csv = ledgerCsvExport(p);
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(3);
    expect(rows[1]).toContain("expense");
    expect(rows[2]).toContain("fd-deposit");
    expect(() => readCSV(csv, p)).toThrow(/audit export/);
    const bytes = await exportWorkbook(p);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes as any);
    expect(wb.getWorksheet("Accounts activity")?.state).toBe("visible");
    expect(wb.getWorksheet("Accounts activity")?.getCell("D5").value).toBe(100);
    expect(wb.getWorksheet("Accounts activity")?.getCell("J5").value).toBe(100);
    expect(wb.getWorksheet("Accounts activity")?.getCell("J6").value).toBe(0);
    expect(wb.getWorksheet("Dashboard")?.getCell("C9").value).toBe(100);
  });
  it("F4 adds uncategorized reporting rows so category income and expenses reconcile to totals", () => {
    const p = fixture();
    p.ledgerTransactions = [
      expense(),
      {
        ...expense(),
        id: "income",
        kind: "income",
        sourceAccountId: undefined,
        destinationAccountId: "bank",
        amount: 50,
      },
    ];
    const categories = reportCategories(p);
    expect(categories.map((c) => c.name)).toContain("Uncategorized expenses");
    expect(categories.map((c) => c.name)).toContain("Uncategorized income");
    const totals = actual(p, "2026-11-01", "2026-11-15");
    expect(
      categories
        .filter((c) => c.group === "Income")
        .reduce((sum, c) => sum + actualCategory(p, c, "2026-11"), 0),
    ).toBe(totals.income);
    expect(
      categories
        .filter((c) => ["Living", "Debt"].includes(c.group))
        .reduce((sum, c) => sum + actualCategory(p, c, "2026-11"), 0),
    ).toBe(totals.expenses);
    expect(monthlyReport(p)).toContain("Uncategorized expenses");
  });
  it("F5 rejects wrong or missing categories and splits withdrawal interest from fees", () => {
    const p = fixture();
    for (const categoryId of ["salary", "missing"]) {
      p.ledgerTransactions = [expense({ categoryId })];
      expect(() => validatePlan(p)).toThrow(/category/);
    }
    p.ledgerTransactions = [
      {
        ...expense(),
        kind: "fd-withdrawal",
        sourceAccountId: "fd",
        destinationAccountId: "bank",
        interestAmount: 5,
        feeAmount: 2,
        incomeCategoryId: "salary",
        expenseCategoryId: "bill",
      },
    ];
    validatePlan(p);
    expect(ledgerPostingFlow(p, p.ledgerTransactions[0]!)).toMatchObject({
      income: 5,
      expenses: 2,
      incomeCategoryId: "salary",
      expenseCategoryId: "bill",
    });
    expect(
      actualCategory(
        p,
        p.categories.find((c) => c.id === "salary")!,
        "2026-11",
      ),
    ).toBe(5);
    expect(
      actualCategory(
        p,
        p.categories.find((c) => c.id === "bill")!,
        "2026-11",
      ),
    ).toBe(2);
  });
});
