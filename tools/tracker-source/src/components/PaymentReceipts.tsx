import type { Entry } from '../domain/types';
import { money } from '../domain/calculate';
export function PaymentReceipts({
  receipts,
  onEdit,
}: {
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
            {e.date} · {money(e.amount)} · {e.payment}
          </span>
          <button className="button small secondary" type="button" onClick={() => onEdit(e)}>
            Edit receipt
          </button>
        </div>
      ))}
    </div>
  );
}
