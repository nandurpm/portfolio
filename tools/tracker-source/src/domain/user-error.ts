/** Convert untrusted runtime/dependency errors into safe and actionable UI text. */
export const FALLBACK_ERROR = 'Something went wrong. Your data is safe. Please try again.';
export function errorDetails(error: unknown): string {
  if (error instanceof Error) return error.stack || error.message;
  return typeof error === 'string' ? error : JSON.stringify(error) || String(error);
}
export function userError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/invalid login credentials|invalid credentials/i.test(message))
    return 'Incorrect email or password. Please try again.';
  if (/email not confirmed/i.test(message))
    return 'Please confirm your email address before signing in.';
  if (/network|failed to fetch|timeout|offline/i.test(message))
    return 'Connection unavailable. Check your internet connection and try again.';
  if (/^(Enter|Choose|Select|Please |Cannot |No |Use |Amount |Budget |Loan |EMI |Transaction |Payment |Not enough |End month |The planned |Could not |Check your |This imported |Combined receipts |Combined payments |PF claims |A provision |An original-loan |Installment date |Each loan )/i.test(message) &&
    !/invariant|zod|schema|stack|async schemas|unexpected|undefined|failed requirement|trace|at [A-Za-z0-9]+\(/i.test(message) &&
    message.length <= 220) return message;
  return FALLBACK_ERROR;
}
