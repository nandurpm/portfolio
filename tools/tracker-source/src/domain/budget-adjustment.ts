import { roundMoney } from './round-money';

/** Represent the input's decimal value as an integer and a power-of-ten scale. */
function decimalParts(value: number) {
  const [mantissa = '0', exponent = '0'] = value.toString().split('e');
  const [whole = '0', fraction = ''] = mantissa.split('.');
  const decimalPlaces = fraction.length - Number(exponent);
  const digits = BigInt(whole + fraction);
  return {
    digits: digits * 10n ** BigInt(Math.max(0, -decimalPlaces)),
    scale: 10n ** BigInt(Math.max(0, decimalPlaces)),
  };
}

/** Apply the percentage in decimal paise, then round half away from zero. */
export function adjustedBudgetAmount(amount: number, percent: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(percent))
    return roundMoney(amount * (1 + percent / 100));

  const base = decimalParts(amount);
  const change = decimalParts(percent);
  // The factor's division by 100 cancels the INR-to-paise multiplication.
  const numerator = base.digits * (100n * change.scale + change.digits);
  const denominator = base.scale * change.scale;
  const magnitude = numerator < 0n ? -numerator : numerator;
  const roundedPaise = (magnitude + denominator / 2n) / denominator;
  return Number(numerator < 0n ? -roundedPaise : roundedPaise) / 100;
}
