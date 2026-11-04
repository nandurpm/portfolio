import { describe, expect, it } from "vitest";
import { financialFixture } from "./fixtures/financial";
import { commit, stepHistory } from "../src/domain/history";
import { actual, cumulative } from "../src/domain/calculate";
import {
  ledgerSummary,
  openingAccountTotal,
  reverseLedgerTransaction,
} from "../src/domain/ledger";
import { netWorthSnapshot } from "../src/domain/net-worth";
import type { Account, LedgerTransaction } from "../src/domain/types";
const account = (
  id: string,
  kind: Account["kind"],
  openingBalance = 0,
): Account => ({ id, name: id, kind, openingBalance, active: true, note: "" });
function fixture() {
  const e = financialFixture();
  e.data.accounts = [
    account("sbi", "bank", 2000),
    account("federal", "bank"),
    account("railway", "wallet", 700),
    account("fd", "fixed-deposit"),
    account("loan", "liability"),
    account("card", "credit-card"),
  ];
  e.data.ledgerTransactions = [];
  e.data.entries = [];
  e.data.settings.opening = 2700;
  e.data.settings.reportDate = "2026-11-04";
  e.data.settings.liveDate = false;
  return e;
}
const tx = (
  kind: LedgerTransaction["kind"],
  sourceAccountId?: string,
  destinationAccountId?: string,
): LedgerTransaction => ({
  id: "original",
  kind,
  sourceAccountId,
  destinationAccountId,
  amount: 100,
  date: "2026-11-02",
  description: "Synthetic",
  note: "",
});
describe("financial position and correction integrity", () => {
  it("uses SBI 2000 and separate wallet 700 as one 2700 opening source", () => {
    let e = fixture();
    e = commit(e, "Enable account source", (p) => {
      p.settings.openingFromAccounts = true;
    });
    e = commit(e, "Actual SBI expenses", (p) => {
      p.entries.push({
        id: "expense",
        date: "2026-11-03",
        categoryId: "bill",
        amount: 594,
        payment: "UPI",
        accountId: "sbi",
        description: "Synthetic",
        notes: "",
      });
    });
    expect(openingAccountTotal(e.data)).toBe(2700);
    expect(cumulative(e.data).actualCash).toBe(2106);
    expect(netWorthSnapshot(e.data)).toMatchObject({
      cash: 2106,
      namedCash: 2106,
      unallocatedCash: 0,
      unlinkedCount: 0,
    });
    e = commit(e, "Correct SBI opening", (p) => {
      p.accounts![0]!.openingBalance = 2100;
    });
    expect(e.data.settings.opening).toBe(2800);
    expect(cumulative(e.data).actualCash).toBe(2206);
    expect(stepHistory(e, "undo").data.settings.opening).toBe(2700);
  });
  it("keeps archived balances in assets and shows unassigned Entries explicitly", () => {
    const e = fixture();
    e.data.accounts![0]!.active = false;
    e.data.entries = [
      {
        id: "expense",
        date: "2026-11-03",
        categoryId: "bill",
        amount: 25,
        payment: "UPI",
        description: "Synthetic",
        notes: "",
      },
    ];
    expect(netWorthSnapshot(e.data)).toMatchObject({
      cash: 2675,
      namedCash: 2700,
      unallocatedCash: -25,
      unlinkedCount: 1,
    });
  });
  it("shows earmarked cash once and derives spendable cash separately", () => {
    const e = fixture();
    e.data.provisions = [
      {
        id: "provision",
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
    expect(netWorthSnapshot(e.data)).toMatchObject({
      cash: 2700,
      reserved: 50,
      spendable: 2650,
    });
  });
  it("prevents silent editing or deletion of a reconciled ledger posting", () => {
    let e = fixture();
    e.data.ledgerTransactions = [tx("expense", "sbi")];
    e.data.reconciliations = [
      {
        id: "statement",
        label: "Combined",
        fromDate: "2026-11-01",
        throughDate: "2026-11-03",
        openingBalance: 2700,
        statementBalance: 2600,
        methods: [],
        note: "",
      },
    ];
    expect(() =>
      commit(e, "edit", (p) => {
        p.ledgerTransactions![0]!.amount = 200;
      }),
    ).toThrow(/protected/);
    expect(() =>
      commit(e, "delete", (p) => {
        p.ledgerTransactions = [];
      }),
    ).toThrow(/protected/);
    e = commit(e, "Dated correction", (p) =>
      reverseLedgerTransaction(p, "original", "2026-11-04", "Wrong expense"),
    );
    expect(e.data.ledgerTransactions).toHaveLength(2);
    expect(cumulative(e.data, "2026-11-03").actualCash).toBe(2600);
    expect(cumulative(e.data, "2026-11-04").actualCash).toBe(2700);
    expect(actual(e.data, "2026-11-01", "2026-11-04").expenses).toBe(0);
  });
  it.each([
    ["income", undefined, "sbi"],
    ["expense", "sbi", undefined],
    ["transfer", "sbi", "railway"],
    ["borrow", "loan", "sbi"],
    ["principal-repayment", "sbi", "loan"],
    ["fd-deposit", "sbi", "fd"],
    ["fd-withdrawal", "fd", "sbi"],
    ["credit-card-purchase", undefined, "card"],
    ["credit-card-payment", "sbi", "card"],
  ] as const)(
    "reverses %s balances and savings without changing the original",
    (kind, from, to) => {
      const e = fixture(),
        p = e.data;
      const original = tx(kind, from, to);
      if (kind === "principal-repayment" || kind === "fd-withdrawal") {
        original.interestAmount = 5;
        original.feeAmount = 2;
      }
      p.ledgerTransactions = [original];
      const before = structuredClone(original);
      reverseLedgerTransaction(
        p,
        "original",
        "2026-11-04",
        "Synthetic correction",
      );
      expect(p.ledgerTransactions[0]).toEqual(before);
      const summary = ledgerSummary(p, "2026-11-04");
      expect(summary.income).toBe(0);
      expect(summary.expenses).toBe(0);
      for (const a of p.accounts!)
        expect(summary.balances[a.id]).toBe(a.openingBalance);
      expect(cumulative(p).actualCash).toBe(2700);
    },
  );
  it("rejects duplicate reversals, missing reasons and backdated corrections", () => {
    const p = fixture().data;
    p.ledgerTransactions = [tx("expense", "sbi")];
    expect(() =>
      reverseLedgerTransaction(p, "original", "2026-11-01", "Wrong"),
    ).toThrow(/precede/);
    expect(() =>
      reverseLedgerTransaction(p, "original", "2026-11-04", ""),
    ).toThrow(/reason/);
    reverseLedgerTransaction(p, "original", "2026-11-04", "Wrong");
    expect(() =>
      reverseLedgerTransaction(p, "original", "2026-11-05", "Again"),
    ).toThrow(/only once/);
  });
});
