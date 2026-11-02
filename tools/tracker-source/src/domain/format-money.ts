/** Single INR formatter for UI cards, reports and charts. All display rounding is cosmetic. */
const fullFormatters = new Map<number, Intl.NumberFormat>();
export function formatMoney(amount: number, decimals = 2): string {
  if (!Number.isFinite(amount)) return '—';
  let formatter = fullFormatters.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR',
      minimumFractionDigits: decimals, maximumFractionDigits: decimals,
    });
    fullFormatters.set(decimals, formatter);
  }
  return formatter.format(Object.is(amount, -0) ? 0 : amount).replace(/^-/, '−');
}
const compactNumber = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1, minimumFractionDigits: 0 });
export function compactMoney(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  const a = Math.abs(amount);
  if (a < 1000) return formatMoney(amount, a % 1 === 0 ? 0 : 2);
  const unit = a >= 1e7 ? 1e7 : a >= 1e5 ? 1e5 : 1e3;
  const suffix = unit === 1e7 ? 'Cr' : unit === 1e5 ? 'L' : 'K';
  return `${amount < 0 ? '−' : ''}₹${compactNumber.format(a / unit)}${suffix}`;
}
