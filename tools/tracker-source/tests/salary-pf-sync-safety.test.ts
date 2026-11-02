import { describe, expect, it } from 'vitest';
import { financialFixture } from './fixtures/financial';
import { assertModernLedgerPreserved, cloudPlan, localPlan } from '../src/cloud/model';
import { enablePfAccount, enableSalaryHistory } from '../src/domain/employment';

describe('sync integrity with older tracker clients', () => {
  it('refuses a remote downgrade that removes enabled salary history or PF account records', () => {
    const plan = financialFixture().data;
    enableSalaryHistory(plan);
    enablePfAccount(plan);
    plan.salaryChanges = [{ id: 'salary-change', effectiveDate: '2026-11-01', monthlySalary: 1200, monthlyPfContribution: 100 }];
    plan.pfMovements = [{
      id: 'pf-credit', date: '2026-11-02', kind: 'contribution', source: 'payroll',
      amount: 100, payment: 'Bank', note: 'Synthetic',
    }];
    const snapshot = JSON.stringify(plan);
    const base = cloudPlan(plan);
    const remoteWithoutSalary = structuredClone(base);
    delete remoteWithoutSalary.salaryChanges;
    expect(() => assertModernLedgerPreserved(base, plan, remoteWithoutSalary))
      .toThrow(/salary history.*preserved locally/i);
    const remoteWithoutPf = structuredClone(base);
    delete remoteWithoutPf.pfMovements;
    expect(() => assertModernLedgerPreserved(base, plan, remoteWithoutPf))
      .toThrow(/PF account records.*preserved locally/i);
    expect(JSON.stringify(plan)).toBe(snapshot);
  });
  it('protects enabled empty PF ledgers, not only ledgers containing transactions', () => {
    const plan = financialFixture().data;
    enablePfAccount(plan);
    expect(plan.pfMovements).toEqual([]);
    const base = cloudPlan(plan);
    const stale = structuredClone(base);
    delete stale.pfMovements;
    expect(() => assertModernLedgerPreserved(base, plan, stale)).toThrow('PF account records');
  });
  it('allows unchanged/compatible optional ledgers and first-time cloud selection', () => {
    const plan = financialFixture().data;
    enableSalaryHistory(plan);
    enablePfAccount(plan);
    const before = JSON.stringify(plan);
    const remote = cloudPlan(plan);
    expect(() => assertModernLedgerPreserved(remote, plan, structuredClone(remote))).not.toThrow();
    const newRemote = structuredClone(remote);
    delete newRemote.salaryChanges;
    delete newRemote.pfMovements;
    expect(() => assertModernLedgerPreserved(undefined, plan, newRemote)).not.toThrow();
    const roundTrip = localPlan(remote, plan);
    expect(roundTrip.salaryChanges).toEqual(plan.salaryChanges);
    expect(roundTrip.pfMovements).toEqual(plan.pfMovements);
    expect(JSON.stringify(plan)).toBe(before);
  });
});
