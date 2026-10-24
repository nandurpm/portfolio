import { receiptScope } from '../domain/archive';
import { plannedPaymentDate, possibleDuplicates } from '../domain/insights';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { store, usePlan } from '../store';
import { money, round } from '../domain/calculate';
import { today, displayDate } from '../domain/dates';
import { usePhone } from './usePhone';
import { loanSummary } from '../domain/loan-summary';
import {
  addInstallmentLoan,
  saveInstallmentPayment,
  correctInstallmentDates,
} from '../domain/installments';
import { Section, Modal, Field, useUi } from './UI';
import { PaymentReceipts } from './PaymentReceipts';

export default function AdditionalLoans() {
  const phone = usePhone();
  const p = usePlan(),
    { toast, confirm } = useUi();
  const showDate = (date: string) => displayDate(date, p.settings.dateFormat);
  const [adding, setAdding] = useState(false);
  const [editingDates, setEditingDates] = useState(false);
  const [correctedFirst, setCorrectedFirst] = useState('');
  const [correctedNote, setCorrectedNote] = useState('');
  const [name, setName] = useState(''),
    [principal, setPrincipal] = useState(''),
    [emi, setEmi] = useState(''),
    [tenure, setTenure] = useState('12'),
    [first, setFirst] = useState(today()),
    [note, setNote] = useState('');
  const [selected, setSelected] = useState('');
  const [receiptId, setReceiptId] = useState('');
  const [payment, setPayment] = useState<{
    loanId: string;
    rowId: string;
  } | null>(null);
  const [paidDate, setPaidDate] = useState(today()),
    [paidAmount, setPaidAmount] = useState(''),
    [method, setMethod] = useState('Not specified');
  const loans = p.additionalLoans ?? [],
    loan = loans.find((l) => l.id === selected) ?? loans[0];
  const total = loan ? round(loan.monthlyEmi * loan.tenure) : 0;
  const paid = loan ? round(loan.rows.reduce((n, r) => n + r.paidAmount, 0)) : 0;
  const summary = loan ? loanSummary(loan.rows) : null;
  function openPayment(rowId: string) {
    if (!loan) return;
    const r = loan.rows.find((r) => r.id === rowId)!;
    setPayment({ loanId: loan.id, rowId });
    setReceiptId('');
    setPaidDate(today());
    setPaidAmount(String(Math.max(0, round(r.emi - r.paidAmount))));
    setMethod('Not specified');
  }
  function saveLoan(e: React.FormEvent) {
    e.preventDefault();
    try {
      let id = '';
      store.change(`Add loan: ${name}`, (d) => {
        id = addInstallmentLoan(d, {
          name,
          principal: Number(principal),
          monthlyEmi: Number(emi),
          tenure: Number(tenure),
          firstDueDate: first,
          note,
        }).id;
      });
      setSelected(id);
      setAdding(false);
      toast('Loan and monthly schedule saved.');
      setName('');
      setPrincipal('');
      setEmi('');
      setNote('');
    } catch (e) {
      toast(String(e), true);
    }
  }
  async function savePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payment) return;
    try {
      if (
        receiptScope(p, paidDate) !== 'inside plan' &&
        !(await confirm(
          'Record an out-of-range loan receipt?',
          `This payment is ${receiptScope(p, paidDate)}. It updates lifetime loan repayment but is excluded from this plan's actual cash. Before-opening payments must already be reflected in opening savings. No plan dates or opening balance will be changed.`,
          false,
          'Save archived receipt',
        ))
      )
        return;

      const category = p.categories.find((c) => c.loanId === payment.loanId);
      if (
        category &&
        possibleDuplicates(p.entries, {
          id: receiptId,
          date: paidDate,
          categoryId: category.id,
          amount: Number(paidAmount),
        }).length &&
        !(await confirm(
          'Possible duplicate payment',
          'A receipt already has this date, category and amount. Is this a separate transfer?',
          false,
          'Save anyway',
        ))
      )
        return;
      store.change('Record installment payment', (d) =>
        saveInstallmentPayment(
          d,
          payment.loanId,
          payment.rowId,
          paidDate,
          Number(paidAmount),
          method,
          receiptId || undefined,
        ),
      );
      setPayment(null);
      toast('Payment saved and linked to this installment.');
    } catch (e) {
      toast(String(e), true);
    }
  }
  return (
    <>
      <Section
        title="Additional loans & EMIs"
        caption="Keep each purchase or loan separate. Fixed installments include the lender’s agreed charges; no interest rate is assumed."
        action={
          <button className="button" onClick={() => setAdding(true)}>
            <Plus size={17} /> Add loan
          </button>
        }
      >
        {!loan ? (
          <p>No additional loans yet. Add a loan to create its own payment schedule.</p>
        ) : (
          <>
            <Field label="Choose loan">
              <select value={loan.id} onChange={(e) => setSelected(e.target.value)}>
                {loans.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="multi-loan-summary">
              <div>
                <small>Financed amount</small>
                <strong>{money(loan.principal)}</strong>
              </div>
              <div>
                <small>Total repayment</small>
                <strong>{money(total)}</strong>
              </div>
              <div>
                <small>Paid so far</small>
                <strong>{money(paid)}</strong>
              </div>
              <div>
                <small>Repayment remaining</small>
                <strong>{money(Math.max(0, total - paid))}</strong>
              </div>
            </div>
            <p>
              {loan.rows.filter((r) => r.paid).length} of {loan.tenure} installments paid ·{' '}
              {money(loan.monthlyEmi)} monthly · {money(round(total - loan.principal))} total
              charges
            </p>
            {loan.note && <p className="muted">{loan.note}</p>}
            <button
              className="button small secondary"
              onClick={() => {
                setCorrectedFirst(loan.firstDueDate);
                setCorrectedNote(loan.note);
                setEditingDates(true);
              }}
            >
              Correct loan dates and notes
            </button>
            <p className="loan-next-payment">
              {summary?.next ? (
                <>
                  Next unpaid installment:{' '}
                  <strong>Pay {showDate(plannedPaymentDate(p, summary.next.dueDate))}</strong> →
                  Due <strong>{showDate(summary.next.dueDate)}</strong> ·{' '}
                  <strong>{money(summary.nextAmount)}</strong>
                </>
              ) : (
                'All installments are paid.'
              )}
            </p>
            {phone ? (
              <div className="installment-cards">
                {loan.rows.map((r, i) => (
                  <article key={r.id} className="installment-card">
                    <div className="installment-card-head">
                      <strong>
                        Installment {i + 1} of {loan.tenure}
                      </strong>
                      <span>{r.paid ? 'Paid' : r.paidAmount ? 'Partial' : 'Unpaid'}</span>
                    </div>
                    <dl>
                      <div>
                        <dt>Planned pay date</dt>
                        <dd>{showDate(plannedPaymentDate(p, r.dueDate))}</dd>
                      </div>
                      <div>
                        <dt>Due date</dt>
                        <dd>{showDate(r.dueDate)}</dd>
                      </div>
                      <div>
                        <dt>Amount</dt>
                        <dd>{money(r.emi)}</dd>
                      </div>
                      <div>
                        <dt>Paid amount</dt>
                        <dd>{money(r.paidAmount)}</dd>
                      </div>
                      <div>
                        <dt>Payment date</dt>
                        <dd>{r.paidDate ? showDate(r.paidDate) : '—'}</dd>
                      </div>
                    </dl>
                    {r.paidDate && r.paidDate < r.dueDate && <p>Paid early</p>}
                    <button className="button small secondary" onClick={() => openPayment(r.id)}>
                      {r.paid ? 'View receipts' : r.paidAmount ? 'Add payment' : 'Record payment'}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="table-scroll long-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      {[
                        'Installment',
                        'Planned pay date',
                        'Due date',
                        'Amount',
                        'Paid amount',
                        'Payment date',
                        'Status',
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loan.rows.map((r, i) => (
                      <tr key={r.id} className={r.paid ? 'paid-row' : ''}>
                        <td>{i + 1}</td>
                        <td>{showDate(plannedPaymentDate(p, r.dueDate))}</td>
                        <td>{showDate(r.dueDate)}</td>
                        <td>{money(r.emi)}</td>
                        <td>{r.paidAmount ? money(r.paidAmount) : '—'}</td>
                        <td>
                          {r.paidDate ? showDate(r.paidDate) : '—'}
                          {r.paidDate && r.paidDate < r.dueDate && <small> · Paid early</small>}
                        </td>
                        <td>
                          <button
                            className={`button small ${r.paid ? 'paid-button' : 'secondary'}`}
                            onClick={() => openPayment(r.id)}
                          >
                            {r.paid
                              ? 'View receipts'
                              : r.paidAmount
                                ? 'Add payment'
                                : 'Record payment'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="muted">
              Payments before the plan’s opening month are kept in Daily Entries → Archive. They are
              not deducted again from opening savings. Future budgets exclude amounts already paid
              early.
            </p>
          </>
        )}
      </Section>
      {editingDates && loan && (
        <Modal title="Correct loan dates and notes" onClose={() => setEditingDates(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                store.change('Correct loan dates and notes', (d) =>
                  correctInstallmentDates(d, loan.id, correctedFirst, correctedNote),
                );
                setEditingDates(false);
                toast('Schedule dates corrected. Payment dates and amounts preserved.');
              } catch (err) {
                toast(String(err), true);
              }
            }}
          >
            <Field label="Correct first installment due date">
              <input
                aria-label="Correct first installment due date"
                type="date"
                required
                value={correctedFirst}
                onChange={(e) => setCorrectedFirst(e.target.value)}
              />
            </Field>
            <Field label="Correct loan notes">
              <textarea
                aria-label="Correct loan notes"
                maxLength={4000}
                value={correctedNote}
                onChange={(e) => setCorrectedNote(e.target.value)}
              />
            </Field>
            <p>
              All installments keep their amounts and receipt links. Due dates are rebuilt monthly
              from the corrected first date. Actual payment dates are preserved.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditingDates(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button">
                Save corrected schedule
              </button>
            </div>
          </form>
        </Modal>
      )}
      {adding && (
        <Modal title="Add loan" onClose={() => setAdding(false)}>
          <form onSubmit={saveLoan}>
            <div className="form-grid">
              <Field label="Loan name">
                <input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="Financed amount (₹)">
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                />
              </Field>
              <Field label="Monthly EMI (₹)">
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={emi}
                  onChange={(e) => setEmi(e.target.value)}
                />
              </Field>
              <Field label="Number of installments">
                <input
                  required
                  type="number"
                  min="1"
                  max="600"
                  step="1"
                  value={tenure}
                  onChange={(e) => setTenure(e.target.value)}
                />
              </Field>
              <Field label="First installment due">
                <input
                  required
                  type="date"
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                />
              </Field>
              <Field label="Notes">
                <textarea maxLength={4000} value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
            </div>
            <p>
              Total repayment: <strong>{money(Number(emi) * Number(tenure))}</strong>. The schedule
              ends after the stated number of installments.
            </p>
            <div className="modal-actions">
              <button type="button" className="button secondary" onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button className="button" type="submit">
                Save loan
              </button>
            </div>
          </form>
        </Modal>
      )}
      {payment && (
        <Modal title="Record installment payment" onClose={() => setPayment(null)}>
          <PaymentReceipts
            dateFormat={p.settings.dateFormat}
            receipts={p.entries.filter((e) => e.loanRowId === payment.rowId)}
            onEdit={(e) => {
              setReceiptId(e.id);
              setPaidDate(e.date);
              setPaidAmount(String(e.amount));
              setMethod(e.payment);
            }}
          />
          <p>
            {receiptId
              ? 'Editing one saved receipt.'
              : 'Add a new transfer. Previous receipts are kept.'}
          </p>
          <form onSubmit={savePayment}>
            <Field label="Actual payment date">
              <input
                required
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </Field>
            <Field label="Amount paid (₹)">
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
            </Field>
            <Field label="Payment method">
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                {['Not specified', 'Bank', 'UPI', 'Cash', 'Card'].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <p>
              Enter the date money was actually paid, including early payments. This records a
              payment; it does not transfer money.
            </p>
            <div className="modal-actions">
              <button type="button" className="button secondary" onClick={() => setPayment(null)}>
                Cancel
              </button>
              <button className="button" type="submit">
                Save payment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
