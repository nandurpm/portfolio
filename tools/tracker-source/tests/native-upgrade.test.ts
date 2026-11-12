import { describe, it, expect } from "vitest";
import { financialFixture } from "./fixtures/financial";
import { commit, envelopeFrom } from "../src/domain/history";
import {
  addInstallmentLoan,
  saveInstallmentPayment,
} from "../src/domain/installments";
import { actual, planned } from "../src/domain/calculate";
import { archivedReceiptSummary } from "../src/domain/archive";
import { provisionResult } from "../src/domain/balances";
import { LocalStore } from "../electron/storage";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("native upgrade synthetic financial contract", () => {
  it("keeps a ₹2,000 November phone installment paid in October outside November cash", () => {
    let e = financialFixture();
    e = commit(e, "Synthetic phone", (p) => {
      addInstallmentLoan(p, {
        name: "Synthetic phone",
        principal: 20000,
        monthlyEmi: 2000,
        tenure: 12,
        firstDueDate: "2026-11-05",
        note: "Synthetic test only",
      });
    });
    const phone = e.data.additionalLoans![0]!;
    e = commit(e, "October payment", (p) =>
      saveInstallmentPayment(p, phone.id, phone.rows[0]!.id, "2026-10-20", 2000, '__unallocated'),
    );
    expect(e.data.additionalLoans![0]!.rows[0]).toMatchObject({
      paid: true,
      paidAmount: 2000,
    });
    expect(archivedReceiptSummary(e.data).before).toBe(2000);
    expect(actual(e.data, "2026-11-01", "2026-11-30").debt).toBe(0);
    // December's liability belongs to November's cash plan when this setting is enabled.
    expect(planned(e.data, "2026-11").debt).toBe(2100);
    e = commit(e, "December paid in November", (p) =>
      saveInstallmentPayment(p, phone.id, phone.rows[1]!.id, "2026-11-10", 2000, '__unallocated'),
    );
    expect(actual(e.data, "2026-11-01", "2026-11-30").debt).toBe(2000);
    expect(planned(e.data, "2026-11").debt).toBe(2100);
    e = commit(e, "January paid in December", (p) =>
      saveInstallmentPayment(p, phone.id, phone.rows[2]!.id, "2026-12-10", 2000, '__unallocated'),
    );
    expect(actual(e.data, "2026-12-01", "2026-12-31").debt).toBe(2000);
    expect(e.data.entries).toHaveLength(3);
    expect(() =>
      commit(e, "Duplicate full installment", (p) =>
        saveInstallmentPayment(p, phone.id, phone.rows[1]!.id, "2026-11-10", 2000, '__unallocated'),
      ),
    ).toThrow("exceed");
  });

  it("preserves electricity reserves and reconciliation through native JSON save/backup/restore", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tracker-native-upgrade-"));
    try {
      const e = financialFixture();
      e.data.provisions = [
        {
          id: "electricity",
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
      e.data.reconciliations = [
        {
          id: "pooled",
          label: "Synthetic bank plus cash",
          fromDate: "2026-11-01",
          throughDate: "2026-11-30",
          openingBalance: 500,
          statementBalance: 500,
          methods: [],
          note: "Internal withdrawals are not spending",
        },
      ];
      expect(
        provisionResult(e.data, e.data.provisions[0]!, "2026-11-10").reserve,
      ).toBe(200);
      expect(
        provisionResult(e.data, e.data.provisions[0]!, "2026-12-10").reserve,
      ).toBe(350);
      expect(actual(e.data, "2026-11-01", "2026-12-31").expenses).toBe(0);
      const disk = new LocalStore(dir);
      await disk.save(e);
      const backup = await disk.backup();
      const restored = envelopeFrom(JSON.parse(await readFile(backup, "utf8")));
      expect(restored).toEqual(e);
      expect((await new LocalStore(dir).load()).envelope).toEqual(e);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
