import { compactMoney } from './format-money';
/** Compact labels are used only on tight chart axes; precise values remain in tooltips. */
export function currencyAxis(value: number | string): string {
  const n = Number(value);
  return compactMoney(n);
}
