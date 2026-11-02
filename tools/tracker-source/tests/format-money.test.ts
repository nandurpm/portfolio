import { describe, expect, it } from 'vitest';
import { compactMoney, formatMoney } from '../src/domain/format-money';
describe('shared INR formatter', () => {
  it('keeps the Indian grouping and accurate decimals', () => {
    expect(formatMoney(125000)).toBe('₹1,25,000.00');
    expect(formatMoney(125000, 0)).toBe('₹1,25,000');
    expect(formatMoney(12.5)).toBe('₹12.50');
  });
  it('signals negative amounts independently of color', () => {
    expect(formatMoney(-129)).toBe('−₹129.00');
    expect(compactMoney(-1250000)).toBe('−₹12.5L');
    expect(formatMoney(-0, 0)).toBe('₹0');
  });
  it('uses lakh and crore compact labels for narrow chart axes', () => {
    expect(compactMoney(1250000)).toBe('₹12.5L');
    expect(compactMoney(12500000)).toBe('₹1.3Cr');
    expect(compactMoney(12500)).toBe('₹12.5K');
    expect(compactMoney(Number.NaN)).toBe('—');
  });
});
