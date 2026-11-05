import { expect, test } from 'vitest';
import { financialFixture } from './fixtures/financial';
import { progress, cumulative } from '../src/domain/calculate';
test('extending future horizon leaves recorded cash and actual monthly totals unchanged', () => {
  const p = financialFixture().data;
  p.settings.reportDate = '2026-11-05';
  const original = progress(p);
  p.settings.planEnd = '2076-10';
  const extended = progress(p);
  expect(extended.slice(0, original.length)).toEqual(original);
  expect(extended[0]!.recordedCash).toBe(cumulative(p).actualCash);
  expect(extended.slice(1).every(row => row.recordedCash === null && row.actual === null)).toBe(true);
});
