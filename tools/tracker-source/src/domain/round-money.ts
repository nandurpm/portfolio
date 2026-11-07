/** Nearest paise, with exact decimal half ties rounded away from zero (as Intl INR display).
 * Decimal exponent shifting avoids binary multiplication turning 10.075 into 1007.4999….
 * This never rewrites stored lender schedules; it is used only when a value is calculated. */
export function toPaise(value: number): number {
  if (!Number.isFinite(value)) return value;
  const [mantissa, exponent = '0'] = Math.abs(value).toString().split('e');
  const shifted = Number(`${mantissa}e${Number(exponent) + 2}`);
  const paise = Math.round(shifted);
  return paise === 0 ? 0 : Math.sign(value) * paise;
}
export const roundMoney = (value: number): number => toPaise(value) / 100;
