import type { ReactNode } from 'react';
const definitions = {
  provision: 'Money earmarked for a future bill. It is not a new expense or a bank transfer.',
  'contract balance': 'The remaining loan principal under the lender’s installment schedule, not your cash balance.',
  'cash cushion': 'Minimum cash you want to keep after making an early loan-closure payment.',
  'report through': 'Last date included in actual income, expenses and payment totals. Planned budgets still use full months.',
  'closure headroom': 'Estimated cash remaining after an early loan closure and your protected cushion.',
  reconciliation: 'Compare calculated transactions against an external bank or cash statement to identify differences.',
} as const;
export type HelpTermName = keyof typeof definitions;
/** Native details/summary supports keyboard, screen readers and touch without JavaScript popover logic. */
export function HelpTerm({ term }: { term: HelpTermName }): ReactNode {
  return (
    <details className="help-term">
      <summary aria-label={`What does ${term} mean?`}><span aria-hidden="true">ⓘ</span> {term}</summary>
      <span className="help-term-content">{definitions[term]}</span>
    </details>
  );
}
