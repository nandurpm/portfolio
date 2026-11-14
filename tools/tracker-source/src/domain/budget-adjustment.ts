import { roundMoney } from './round-money';

/** Use the same nearest-paise, half-away-from-zero rule as other calculated amounts. */
export const adjustedBudgetAmount = (amount: number, percent: number) =>
  roundMoney(amount * (1 + percent / 100));
