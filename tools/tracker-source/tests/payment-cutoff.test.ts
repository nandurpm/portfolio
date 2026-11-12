import { describe, it, expect } from "vitest";
import { financialFixture } from "./fixtures/financial";
import {
  addInstallmentLoan,
  saveInstallmentPayment,
} from "../src/domain/installments";
import { paymentRows, loanSummary } from "../src/domain/loan-summary";
import { actual } from "../src/domain/calculate";
import { installmentTasks } from "../src/domain/insights";
import { commit } from "../src/domain/history";

describe("loan payment report-date cutoff", () => {
  it("keeps a future receipt pending in summaries, reminders and actual cash", () => {
    let e = financialFixture();
    e = commit(e, "Phone loan", (p) => {
      p.settings.reportDate = "2026-11-01";
      const loan = addInstallmentLoan(p, {
        name: "Phone",
        principal: 30000,
        monthlyEmi: 2000,
        tenure: 18,
        firstDueDate: "2026-12-05",
        note: "",
      });
      saveInstallmentPayment(p, loan.id, loan.rows[0]!.id, "2026-11-15", 2000, '__unallocated');
    });
    const p = e.data,
      loan = p.additionalLoans![0]!;
    const before = JSON.stringify(p);
    expect(loanSummary(paymentRows(p, loan.rows))).toMatchObject({
      total: 36000,
      paid: 0,
      remaining: 36000,
      paidCount: 0,
      nextAmount: 2000,
      next: { dueDate: "2026-12-05" },
    });
    expect(
      installmentTasks(p, "2026-11").find((t) => t.category === "Phone"),
    ).toMatchObject({ paid: 0, remaining: 2000 });
    expect(actual(p, "2026-11-01", "2026-11-01").debt).toBe(0);
    expect(loanSummary(paymentRows(p, loan.rows, "2026-11-15"))).toMatchObject({
      paid: 2000,
      remaining: 34000,
      paidCount: 1,
    });
    expect(actual(p, "2026-11-01", "2026-11-15").debt).toBe(2000);
    expect(JSON.stringify(p)).toBe(before);
  });

  it("counts partial receipts separately and retains historical schedule-only payments", () => {
    const p = financialFixture().data;
    const loan = addInstallmentLoan(p, {
      name: "Phone",
      principal: 2000,
      monthlyEmi: 2000,
      tenure: 1,
      firstDueDate: "2026-12-05",
      note: "",
    });
    saveInstallmentPayment(p, loan.id, loan.rows[0]!.id, "2026-10-20", 500, '__unallocated');
    saveInstallmentPayment(p, loan.id, loan.rows[0]!.id, "2026-11-15", 1500, '__unallocated');
    expect(loanSummary(paymentRows(p, loan.rows, "2026-11-01"))).toMatchObject({
      paid: 500,
      paidCount: 0,
      nextAmount: 1500,
    });
    expect(paymentRows(p, loan.rows, "2026-11-01")[0]!.paidDate).toBe(
      "2026-10-20",
    );
    const row = {
      ...loan.rows[0]!,
      paidBeforeOpening: true,
      paid: true,
      paidAmount: 2000,
      paidDate: "",
    };
    expect(
      paymentRows({ ...p, entries: [] }, [row], "2026-11-01")[0]!.paid,
    ).toBe(true);
    expect(
      paymentRows(
        { ...p, entries: [] },
        [{ ...row, paidDate: "2026-11-15" }],
        "2026-11-01",
      )[0]!.paidAmount,
    ).toBe(0);
  });
});
