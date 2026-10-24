import { usePlan } from '../store';
import { archivedReceiptSummary } from '../domain/archive';
import { money } from '../domain/calculate';
export function ArchivedPayments() {
  const p = usePlan(),
    s = archivedReceiptSummary(p);
  return (
    <div className="callout" aria-label="Out-of-range payment ledger">
      <strong>Payments outside this plan · {s.count} receipts</strong>
      <p>
        Before opening: {money(s.before)} · After plan end: {money(s.after)}. These are lifetime
        loan receipts, not additional deductions from this plan’s cash balance.
      </p>
      <p>
        Opening savings must already reflect payments before the plan starts. Payments after the
        plan ends belong to that later cash period. Extend the plan deliberately if you want those
        periods in actual-cash reports. Forecasts remain budgets; actuals follow transaction dates.
      </p>
    </div>
  );
}
