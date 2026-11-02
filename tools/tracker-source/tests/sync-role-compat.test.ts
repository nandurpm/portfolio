import { describe, expect, it } from 'vitest';
import { financialFixture } from './fixtures/financial';
import { validatePlan } from '../src/domain/validation';
import { FALLBACK_ERROR, userError } from '../src/domain/user-error';

describe('category role sync compatibility', () => {
  it('accepts salary-history and PF account roles used by current clients', () => {
    const plan = structuredClone(financialFixture().data);
    const salary = plan.categories.find((category) => category.role === 'salary')!;
    salary.role = 'salary-history';
    plan.salaryChanges = [{
      id: 'salary-change-1',
      effectiveDate: `${plan.settings.planStart}-01`,
      monthlySalary: salary.amount,
      monthlyPfContribution: 0,
    }];
    plan.categories.push({
      id: 'pf-account',
      name: 'Provident fund',
      group: 'Asset',
      amount: 0,
      timing: 'Fixed day',
      day: 1,
      months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      active: false,
      role: 'pf-account',
      note: '',
    });
    plan.pfMovements = [];

    expect(validatePlan(plan).categories.map((category) => category.role)).toContain('salary-history');
    expect(validatePlan(plan).categories.map((category) => category.role)).toContain('pf-account');
  });

  it('does not show raw schema diagnostics in the sync dialog', () => {
    const legacyDiagnostic = '[{"code":"invalid_value","path":["categories",0,"role"]}]';
    expect(userError(legacyDiagnostic)).toBe(FALLBACK_ERROR);
  });
});
