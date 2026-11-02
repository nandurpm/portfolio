import { describe, expect, it } from 'vitest';
import { money, moneyCompact } from '../src/domain/calculate';
import { GENERIC_ERROR, errorDetails, errorMessage } from '../src/domain/user-errors';

describe('consistent currency formatting', () => {
  it('uses Indian grouping and explicit negative signs', () => {
    expect(money(125000)).toContain('1,25,000');
    expect(moneyCompact(1250000)).toBe('₹12.5L');
    expect(moneyCompact(-125000)).toBe('−₹1.3L');
    expect(moneyCompact(-150)).toContain('−₹150');
    expect(moneyCompact(Number.NaN)).toBe('—');
  });
});
describe('safe technical error mapping', () => {
  it('hides implementation details but preserves copyable diagnostics', () => {
    const e = new Error('Invariant failed: Async schemas not supported');
    expect(errorMessage(e)).toBe(GENERIC_ERROR);
    expect(errorDetails(e)).toContain('Invariant failed');
  });
  it('preserves useful validation and connectivity messages', () => {
    expect(errorMessage('Enter a valid amount.')).toBe('Enter a valid amount.');
    expect(errorMessage(new Error('Failed to fetch'))).toContain('internet connection');
  });
});
