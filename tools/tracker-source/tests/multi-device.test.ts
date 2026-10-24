import { describe, it, expect } from 'vitest';
import { cloudPlan, mergePlans, resolveConflicts, localPlan } from '../src/cloud/model';
import { financialFixture } from './fixtures/financial';
const entry = (id: string, amount: number) => ({
  id,
  date: '2026-11-10',
  categoryId: 'bill',
  amount,
  payment: 'Bank',
  description: 'Synthetic',
  notes: '',
});
describe('independent device edits', () => {
  it('merges two offline additions without duplicating records after a retry', () => {
    const base = cloudPlan(financialFixture().data),
      phone = structuredClone(base),
      laptop = structuredClone(base);
    phone.entries.push(entry('phone', 10));
    laptop.entries.push(entry('laptop', 20));
    const combined = mergePlans(base, phone, laptop);
    expect(combined.conflicts).toEqual([]);
    expect(combined.plan.entries.map((x) => x.id).sort()).toEqual(['laptop', 'phone']);
    expect(mergePlans(base, combined.plan, combined.plan).plan.entries).toHaveLength(2);
  });
  it('merges simultaneous first optional collections by ID', () => {
    const base = cloudPlan(financialFixture().data),
      phone = structuredClone(base),
      laptop = structuredClone(base);
    const record = {
      label: 'Synthetic',
      fromDate: '2026-11-01',
      throughDate: '2026-11-30',
      openingBalance: 0,
      statementBalance: 0,
      methods: [],
      note: '',
    };
    phone.reconciliations = [{ ...record, id: 'phone' }];
    laptop.reconciliations = [{ ...record, id: 'laptop' }];
    const combined = mergePlans(base, phone, laptop);
    expect(combined.conflicts).toEqual([]);
    expect(combined.plan.reconciliations).toHaveLength(2);
    expect(() => localPlan(combined.plan, financialFixture().data)).not.toThrow();
  });
  it('requires an explicit choice when one device deletes a record the other edits', () => {
    const base = cloudPlan(financialFixture().data);
    base.entries = [entry('shared', 10)];
    const phone = structuredClone(base),
      laptop = structuredClone(base);
    phone.entries = [];
    laptop.entries[0]!.amount = 20;
    const result = mergePlans(base, phone, laptop);
    expect(result.conflicts).toHaveLength(1);
    expect(resolveConflicts(result.plan, result.conflicts, ['remote']).entries[0]!.amount).toBe(20);
    expect(resolveConflicts(result.plan, result.conflicts, ['local']).entries).toEqual([]);
  });
});
