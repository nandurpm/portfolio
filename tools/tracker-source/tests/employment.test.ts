import { describe, it, expect } from "vitest";
import { financialFixture } from "./fixtures/financial";
import {
  salary,
  actual,
  cumulative,
  planned,
  progress,
} from "../src/domain/calculate";
import {
  salaryHistory,
  enableSalaryHistory,
  enablePfAccount,
  pfSummary,
  pfCashEffect,
} from "../src/domain/employment";
import { validatePlan } from "../src/domain/validation";
import { cloudPlan, localPlan, mergePlans } from "../src/cloud/model";
import { exportWorkbook } from "../src/io/export";
import { readWorkbook } from "../src/io/import";
import type { PfMovement } from "../src/domain/types";
const movement = (
  id: string,
  date: string,
  amount: number,
  kind: PfMovement["kind"] = "contribution",
  source: PfMovement["source"] = "payroll",
): PfMovement => ({
  id,
  date,
  amount,
  kind,
  source,
  payment: "Bank",
  note: "Synthetic test",
});
function pfPlan() {
  const p = financialFixture().data;
  enablePfAccount(p);
  return p;
}
describe("salary history and separate PF account", () => {
  it("preserves every legacy salary forecast without migrating on read", () => {
    const p = financialFixture().data,
      before = JSON.stringify(p);
    expect(salary(p, "2027-01")).toBe(1000);
    expect(salary(p, "2027-02")).toBe(1200);
    expect(salaryHistory(p)).toHaveLength(1);
    expect(JSON.stringify(p)).toBe(before);
    enableSalaryHistory(p);
    validatePlan(p);
    expect(salary(p, "2027-01")).toBe(1000);
    expect(salary(p, "2027-02")).toBe(1200);
  });
  it("supports successive increases, decreases, zero and future values using the earned month", () => {
    const p = financialFixture().data;
    enableSalaryHistory(p);
    p.salaryChanges = [
      {
        id: "one",
        effectiveDate: "2026-11-15",
        monthlySalary: 1100,
        monthlyPfContribution: 100,
      },
      {
        id: "two",
        effectiveDate: "2026-12-01",
        monthlySalary: 1300,
        monthlyPfContribution: 200,
      },
      {
        id: "three",
        effectiveDate: "2027-01-01",
        monthlySalary: 0,
        monthlyPfContribution: 0,
      },
    ];
    validatePlan(p);
    expect(salary(p, "2026-11")).toBe(1000);
    expect(salary(p, "2026-12")).toBe(1100);
    expect(salary(p, "2027-01")).toBe(1300);
    expect(salary(p, "2027-02")).toBe(0);
    expect(p.entries).toHaveLength(0);
    expect(actual(p, "2026-11-01", "2027-02-28").income).toBe(0);
    p.salaryChanges.push({ ...p.salaryChanges[0], id: "duplicate" });
    expect(() => validatePlan(p)).toThrow("unique");
  });
  it("keeps payroll contributions outside income, expenses and cash; cash transfers adjust only cash", () => {
    const p = pfPlan(),
      legacy = financialFixture().data;
    p.pfMovements = [
      movement("payroll", "2026-10-01", 1000),
      movement("cash", "2026-11-02", 100, "contribution", "cash"),
      movement("claim", "2026-11-03", 250, "claim", "cash"),
    ];
    validatePlan(p);
    expect(pfSummary(p, "2026-11-03").balance).toBe(850);
    expect(actual(p, "2026-11-01", "2027-02-28")).toEqual(
      actual(legacy, "2026-11-01", "2027-02-28"),
    );
    expect(planned(p, "2026-11")).toEqual(planned(legacy, "2026-11"));
    expect(cumulative(p).actualCash).toBe(650);
    expect(progress(p).at(-1)?.recordedCash).toBe(650);
    expect(pfCashEffect(p, "2026-11-01", "2026-11-02")).toBe(-100);
    expect(pfCashEffect(p, "2026-11-01", "2026-11-03", ["Cash"])).toBe(0);
  });
  it("rejects overclaims, future funding of earlier claims, missing ledger markers and fractional cents", () => {
    const p = pfPlan();
    p.pfMovements = [
      movement("claim", "2026-11-02", 100, "claim", "cash"),
      movement("future", "2026-11-03", 100),
    ];
    expect(() => validatePlan(p)).toThrow("exceed");
    p.pfMovements = [movement("tiny", "2026-11-01", 0.001)];
    expect(() => validatePlan(p)).toThrow();
    p.pfMovements = [];
    p.categories = p.categories.filter((c) => c.group !== "Asset");
    expect(() => validatePlan(p)).toThrow("PF account");
  });
  it("uses exact cents and rejects claims outside cash plan dates", () => {
    const p = pfPlan();
    p.pfMovements = [
      movement("a", "2026-11-01", 0.1),
      movement("b", "2026-11-01", 0.2),
      movement("c", "2026-11-02", 0.3, "claim", "cash"),
    ];
    expect(pfSummary(validatePlan(p), "2026-11-02").balance).toBe(0);
    p.pfMovements[2].date = "2027-03-01";
    expect(() => validatePlan(p)).toThrow("plan dates");
  });
  it("retains optional records in JSON, cloud merges and XLSX with the multi-salary formula", async () => {
    const p = pfPlan();
    enableSalaryHistory(p);
    p.pfMovements = [movement("a", "2026-11-01", 500)];
    const roundtrip = localPlan(
      cloudPlan(validatePlan(JSON.parse(JSON.stringify(p)))),
      p,
    );
    expect(roundtrip.pfMovements).toEqual(p.pfMovements);
    expect(roundtrip.salaryChanges).toEqual(p.salaryChanges);
    const file = await exportWorkbook(p);
    const loaded = await readWorkbook(file);
    const { default: ExcelJS } = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file as any);
    expect(wb.getWorksheet("Salary history")).toBeDefined();
    expect(wb.getWorksheet("PF account")).toBeDefined();
    const formulas: string[] = [];
    wb.getWorksheet("Budget")!.eachRow((row) => {
      const value = row.getCell(4).value;
      if (value && typeof value === "object" && "formula" in value && typeof value.formula === "string")
        formulas.push(value.formula);
    });
    expect(
      formulas.some(
        (formula) =>
          formula.includes("EOMONTH") && formula.includes("DATE(2027,1,1)"),
      ),
    ).toBe(true);

    expect(loaded.plan.pfMovements).toEqual(p.pfMovements);
    expect(loaded.plan.salaryChanges).toEqual(p.salaryChanges);
    const left = structuredClone(p),
      right = structuredClone(p);
    left.pfMovements!.push(
      movement("left", "2026-11-02", 300, "claim", "cash"),
    );
    right.pfMovements!.push(
      movement("right", "2026-11-03", 300, "claim", "cash"),
    );
    const merged = mergePlans(cloudPlan(p), cloudPlan(left), cloudPlan(right));
    expect(() => localPlan(merged.plan, p)).toThrow("exceed");
  });
});
