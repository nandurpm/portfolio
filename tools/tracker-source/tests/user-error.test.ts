import { describe, expect, it } from 'vitest';
import { FALLBACK_ERROR, errorDetails, userError } from '../src/domain/user-error';
describe('safe UI error mapping', () => {
  it('does not expose invariants, Zod internals, or stack details', () => {
    expect(userError(new Error('Invariant failed: X<Y'))).toBe(FALLBACK_ERROR);
    expect(userError(new Error('Async schemas not supported; use parseAsync'))).toBe(FALLBACK_ERROR);
    expect(userError({ code: 'BAD', data: { secret: 'token' } })).toBe(FALLBACK_ERROR);
  });
  it('keeps actionable validation and authentication wording', () => {
    expect(userError('Enter a valid amount.')).toBe('Enter a valid amount.');
    expect(userError(new Error('Invalid login credentials'))).toContain('Incorrect email or password');
    expect(userError(new Error('Failed to fetch'))).toContain('Connection unavailable');
  });
  it('allows copying the original technical detail without displaying it', () => {
    const error = new Error('Invariant failed: precise issue');
    expect(errorDetails(error)).toContain('Invariant failed');
    expect(userError(error)).not.toContain('Invariant');
  });
});
