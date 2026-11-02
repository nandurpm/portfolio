/** Maps implementation failures to safe, actionable UI copy. The original error is retained for diagnostics. */
export const GENERIC_ERROR = 'Something went wrong. Your data is safe. Please try again.';
export function errorMessage(value: unknown): string {
  const raw = value instanceof Error ? value.message : String(value ?? '');
  if (/invariant failed|async schemas not supported|zoderror|invalid_type|invalid_union|cannot read properties of|undefined is not|TypeError:|ReferenceError:|stack trace|\bat [A-Za-z_$]/i.test(raw)) return GENERIC_ERROR;
  if (/failed to fetch|networkerror|network request|network is unavailable/i.test(raw))
    return 'Unable to connect. Check your internet connection and try again.';
  if (!raw.trim() || raw.length > 260) return GENERIC_ERROR;
  return raw;
}
export function errorDetails(value: unknown): string {
  return value instanceof Error ? value.stack ?? value.message : String(value);
}
