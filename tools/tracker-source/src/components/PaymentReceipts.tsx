import { displayDate } from '../domain/dates';
import type { Entry } from '../domain/types';
import { money } from '../domain/calculate';
export function PaymentReceipts({
  receipts,
  onEdit,
  dateFormat = 'dd-MMM-yyyy',
}: {
  dateFormat?: string;
  receipts: Entry[];
  onEdit: (receipt: Entry) => void;
}) {
  if (!receipts.length) return null;
  return (
    <div className="payment-receipts">
      <h3>Saved receipts</h3>
      <p className="muted">
        Each transfer stays separate. Edit a receipt here, or remove it in Daily Entries.
      </p>
      {receipts.map((e) => (
        <div className="receipt-row" key={e.id}>
          <span>
            {displayDate(e.date, dateFormat)} · {money(e.amount)} · {e.payment}
          </span>
          <button className="button small secondary" type="button" onClick={() => onEdit(e)}>
            Edit receipt
          </button>
        </div>
      ))}
    </div>
  );
}
