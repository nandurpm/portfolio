import { describe, it, expect } from 'vitest';
import { financialFixture } from './fixtures/financial';
import { defaultViewRange, initializeDisplayRange } from '../src/domain/view-range';
import { currencyAxis } from '../src/domain/display';
import { cloudPlan, localPlan } from '../src/cloud/model';
import { forecast } from '../src/domain/calculate';
describe('display-only default range', () => {
  it('chooses 12 inclusive months, clamped to the full plan', () => {
    expect(defaultViewRange('2026-11', '2034-12', '2026-10-24')).toEqual(['2026-11', '2027-10']);
    expect(defaultViewRange('2026-11', '2034-12', '2034-08-01')).toEqual(['2034-08', '2034-12']);
    expect(defaultViewRange('2026-11', '2026-12', '2026-10-24')).toEqual(['2026-11', '2026-12']);
  });
  it('initializes an older full view once, preserving every financial record and forecast', () => {
    const p = financialFixture().data;
    p.settings.planEnd = '2034-12';
    p.settings.viewEnd = '2034-12';
    delete p.settings.displayRangeVersion;
    const original = structuredClone(p),
      expected = forecast(p),
      result = initializeDisplayRange(p);
    expect(p).toEqual(original);
    expect(result.settings.planEnd).toBe('2034-12');
    expect(forecast(result)).toEqual(expected);
    expect(result.entries).toEqual(p.entries);
    expect(result.loan).toEqual(p.loan);
    expect(result.settings.viewEnd).not.toBe(result.settings.planEnd);
    expect(result.settings.displayRangeVersion).toBe(1);
    result.settings.viewEnd = '2034-12';
    expect(initializeDisplayRange(result).settings.viewEnd).toBe('2034-12');
  });
  it('preserves an existing custom range', () => {
    const p = financialFixture().data;
    delete p.settings.displayRangeVersion;
    p.settings.viewStart = '2026-12';
    p.settings.viewEnd = '2027-01';
    expect(initializeDisplayRange(p).settings).toMatchObject({
      viewStart: '2026-12',
      viewEnd: '2027-01',
      displayRangeVersion: 1,
    });
  });
  it('keeps the display marker on the device, not in cloud financial data', () => {
    const p = financialFixture().data;
    p.settings.displayRangeVersion = 1;
    const remote = cloudPlan(p);
    expect(remote.settings).not.toHaveProperty('displayRangeVersion');
    expect(localPlan(remote, p).settings.displayRangeVersion).toBe(1);
  });
});
describe('readable currency axes', () => {
  it('preserves rupees and paise instead of tiny k values', () => {
    expect(currencyAxis(-311.91)).toBe('-₹311.91');
    expect(currencyAxis(100000)).toBe('₹1,00,000');
    expect(currencyAxis(-0)).toBe('₹0');
  });
});
