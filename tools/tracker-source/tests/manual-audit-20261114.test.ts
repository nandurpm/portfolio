import { describe, expect, it } from "vitest";
import { financialFixture } from "./fixtures/financial";
import {
  addInstallmentLoan,
  correctInstallmentDates,
  saveInstallmentPayment,
} from "../src/domain/installments";
import { iso } from "../src/io/import";
import {
  ledgerSummary,
  ledgerPeriod,
  validateLedger,
} from "../src/domain/ledger";

describe("manual audit 2026-11-14: installment note correction", () => {
  it.each([
    ["dollar-dollar", "Dealer deposit paid $$ cash"],
    ["dollar-ampersand", "Keep $& receipt"],
    ["dollar-backtick-and-quote", "Ref $` and $' markers"],
    ["numbered group token", "Cost $1 and $10"],
  ])(
    "re-saving a loan note containing %s leaves linked receipt notes byte-identical",
    (_label, note) => {
      const p = financialFixture().data;
      p.accounts = [
        {
          id: "bank",
          name: "Bank",
          kind: "bank",
          openingBalance: 5000,
          active: true,
          note: "",
        },
      ];
      const loan = addInstallmentLoan(p, {
        name: "Audit loan",
        principal: 1000,
        monthlyEmi: 500,
        tenure: 2,
        firstDueDate: "2026-12-05",
        note,
      } as any);
      saveInstallmentPayment(
        p,
        loan.id,
        loan.rows[0]!.id,
        "2026-12-01",
        500,
        "bank",
        "Bank",
      );
      const receipt = () =>
        p.entries.find((e) => e.loanRowId === loan.rows[0]!.id)!;
      const before = receipt().notes;
      correctInstallmentDates(p, loan.id, "2026-12-06", note);
      expect(receipt().notes).toBe(before);
      expect(receipt().description).toContain("2026-12-06");
      expect(receipt().amount).toBe(500);
    },
  );
  it("replaces an old note with a new note containing replacement tokens literally", () => {
    const p = financialFixture().data;
    p.accounts = [
      {
        id: "bank",
        name: "Bank",
        kind: "bank",
        openingBalance: 5000,
        active: true,
        note: "",
      },
    ];
    const loan = addInstallmentLoan(p, {
      name: "Audit loan 2",
      principal: 1000,
      monthlyEmi: 500,
      tenure: 2,
      firstDueDate: "2026-12-05",
      note: "Plain note",
    } as any);
    saveInstallmentPayment(
      p,
      loan.id,
      loan.rows[0]!.id,
      "2026-12-01",
      500,
      "bank",
      "Bank",
    );
    correctInstallmentDates(p, loan.id, "2026-12-05", "Now $$ and $& literal");
    expect(p.entries.find((e) => e.loanRowId === loan.rows[0]!.id)!.notes).toBe(
      "Financed amount 1000; 2 installments of 500. Now $$ and $& literal",
    );
  });
});

describe("manual audit 2026-11-14: Excel serial dates", () => {
  it("a time-of-day fraction never moves a numeric Excel serial to the next date", () => {
    expect(iso(46000)).toBe("2025-12-09");
    expect(iso(46000.25)).toBe("2025-12-09");
    expect(iso(46000.5)).toBe("2025-12-09");
    expect(iso(46000.999)).toBe("2025-12-09");
    expect(iso(46001)).toBe("2025-12-10");
  });
});

describe("manual audit 2026-11-14: ledger conservation property", () => {
  it("net worth change equals income minus expenses and balances/periods reconcile (all kinds, fees, interest, refunds, reversals)", () => {
    // deterministic PRNG
    let s = 12345;
    const rnd = () =>
      (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)]!;

    const accounts: any[] = [
      {
        id: "b1",
        name: "B1",
        kind: "bank",
        openingBalance: 1000.55,
        active: true,
        note: "",
      },
      {
        id: "b2",
        name: "B2",
        kind: "bank",
        openingBalance: 250,
        active: true,
        note: "",
      },
      {
        id: "w1",
        name: "W1",
        kind: "wallet",
        openingBalance: 10.1,
        active: true,
        note: "",
      },
      {
        id: "rc",
        name: "RC",
        kind: "receivable",
        openingBalance: 300.07,
        active: true,
        note: "",
      },
      {
        id: "li",
        name: "LI",
        kind: "liability",
        openingBalance: 5000.5,
        active: true,
        note: "",
      },
      {
        id: "cc",
        name: "CC",
        kind: "credit-card",
        openingBalance: 120.33,
        active: true,
        note: "",
      },
      {
        id: "fd",
        name: "FD",
        kind: "fixed-deposit",
        openingBalance: 2000,
        active: true,
        note: "",
      },
      {
        id: "iv",
        name: "IV",
        kind: "investment",
        openingBalance: 700.01,
        active: true,
        note: "",
      },
    ];
    const shape: Record<string, [string[] | null, string[] | null]> = {
      income: [null, ["b1", "b2", "w1"]],
      expense: [["b1", "b2", "w1"], null],
      shopping: [["b1", "b2", "w1"], null],
      transfer: [
        ["b1", "b2", "w1"],
        ["b1", "b2", "w1"],
      ],
      lend: [["b1", "b2", "w1"], ["rc"]],
      "repayment-received": [["rc"], ["b1", "b2", "w1"]],
      borrow: [["li"], ["b1", "b2", "w1"]],
      "principal-repayment": [["b1", "b2", "w1"], ["li"]],
      "credit-card-purchase": [null, ["cc"]],
      "credit-card-payment": [["b1", "b2", "w1"], ["cc"]],
      "fd-deposit": [["b1", "b2", "w1"], ["fd"]],
      "fd-withdrawal": [["fd"], ["b1", "b2", "w1"]],
      "investment-deposit": [["b1", "b2", "w1"], ["iv"]],
      "investment-withdrawal": [["iv"], ["b1", "b2", "w1"]],
    };
    const kinds = Object.keys(shape);
    let checked = 0;
    for (let trial = 0; trial < 400; trial++) {
      const tx: any[] = [];
      const n = 5 + Math.floor(rnd() * 25);
      for (let i = 0; i < n; i++) {
        const kind = pick(kinds);
        const [src, dst] = shape[kind]!;
        const t: any = {
          id: "t" + trial + "_" + i,
          kind,
          date:
            "2026-" +
            String(1 + Math.floor(rnd() * 12)).padStart(2, "0") +
            "-" +
            String(1 + Math.floor(rnd() * 28)).padStart(2, "0"),
          amount: Math.round(rnd() * 100000) / 100 + 0.01,
          description: "x",
          note: "",
        };
        if (src) t.sourceAccountId = pick(src);
        if (dst) t.destinationAccountId = pick(dst);
        if (
          [
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
          ].includes(kind) &&
          rnd() < 0.3
        )
          t.feeAmount = Math.round(rnd() * 500) / 100;
        if (
          [
            "principal-repayment",
            "fd-withdrawal",
            "investment-withdrawal",
          ].includes(kind) &&
          rnd() < 0.4
        )
          t.interestAmount = Math.round(rnd() * 800) / 100;
        tx.push(t);
      }
      // add some refunds & reversals
      const purchases = tx.filter((t) =>
        ["expense", "shopping", "credit-card-purchase"].includes(t.kind),
      );
      for (const pch of purchases)
        if (rnd() < 0.3) {
          const r: any = {
            id: "r_" + pch.id,
            kind: "refund",
            date: pch.date,
            amount: Math.min(
              pch.amount,
              Math.round(rnd() * pch.amount * 100) / 100 || 0.01,
            ),
            description: "r",
            note: "",
            originalTransactionId: pch.id,
            destinationAccountId:
              pch.kind === "credit-card-purchase"
                ? pch.destinationAccountId
                : pch.sourceAccountId,
          };
          tx.push(r);
        }
      for (const t of [...tx])
        if (t.kind !== "refund" && rnd() < 0.15) {
          tx.push({
            ...t,
            id: "rev_" + t.id,
            kind: "reversal",
            reversalOfId: t.id,
            date:
              "2026-12-" + String(1 + Math.floor(rnd() * 28)).padStart(2, "0"),
            originalTransactionId: undefined,
          });
        }
      try {
        validateLedger(accounts, tx);
      } catch {
        continue;
      }
      const plan: any = { accounts, ledgerTransactions: tx };
      const sum = ledgerSummary(plan, "2026-12-31");
      const sgn = (a: any) =>
        (["credit-card", "liability"].includes(a.kind) ? -1 : 1) *
        Math.round(a.openingBalance * 100);
      const openNW = accounts.reduce((n, a) => n + sgn(a), 0);
      const nwPaise = Math.round(sum.netWorth * 100);
      const incPaise = Math.round(sum.income * 100),
        expPaise = Math.round(sum.expenses * 100);
      expect(nwPaise, "NW conservation trial " + trial).toBe(
        openNW + incPaise - expPaise,
      );
      const per = ledgerPeriod(plan, "2026-01-01", "2026-12-31");
      expect(Math.round(per.income * 100), "period income " + trial).toBe(
        incPaise,
      );
      expect(Math.round(per.expenses * 100), "period expenses " + trial).toBe(
        expPaise,
      );
      // balances reconcile to assets - liabilities
      const bsum = Object.values(sum.balances).reduce(
        (a: number, b: any) => a + Math.round(b * 100),
        0,
      );
      expect(bsum, "balances sum " + trial).toBe(nwPaise);
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
  });
});
