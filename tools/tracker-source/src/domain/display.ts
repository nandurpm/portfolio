/** Exact rupee units, with Indian grouping; never fractional “k” labels. */
export function currencyAxis(value: number | string): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(Object.is(amount, -0) ? 0 : amount)
    : '—';
}
