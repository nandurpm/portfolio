import { useState } from 'react';
import { Plus } from 'lucide-react';
import { store, usePlan } from '../store';
import { money, round } from '../domain/calculate';
import { today } from '../domain/dates';
import { usePhone } from './usePhone';
import { loanSummary } from '../domain/loan-summary';
import { addInstallmentLoan, saveInstallmentPayment } from '../domain/installments';
import { Section, Modal, Field, useUi } from './UI';

export default function AdditionalLoans() {
  const phone = usePhone();
  const p = usePlan(),
    { toast } = useUi();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(''),
    [principal, setPrincipal] = useState(''),
    [emi, setEmi] = useState(''),
    [tenure, setTenure] = useState('12'),
    [first, setFirst] = useState(today()),
    [note, setNote] = useState('');
  const [selected, setSelected] = useState('');
  const [payment, setPayment] = useState<{ loanId: string; rowId: string } | null>(null);
  const [paidDate, setPaidDate] = useState(today()),
    [paidAmount, setPaidAmount] = useState(''),
    [method, setMethod] = useState('Not specified');
  const loans = p.additionalLoans ?? [],
    loan = loans.find((l) => l.id === selected) ?? loans[0];
  const total = loan ? round(loan.monthlyEmi * loan.tenure) : 0;
  const paid = loan ? round(loan.rows.reduce((n, r) => n + r.paidAmount, 0)) : 0;
  const summary = loan ? loanSummary(loan.rows) : null;
  function openPayment(rowId: string) {
    const r = loan.rows.find((r) => r.id === rowId)!;
    setPayment({ loanId: loan.id, rowId });
    setPaidDate(r.paidDate || today());
    setPaidAmount(String(r.paidAmount || r.emi));
    setMethod(p.entries.find((e) => e.loanRowId === rowId)?.payment || 'Not specified');
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
  function savePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payment) return;
    try {
      store.change('Record installment payment', (d) =>
        saveInstallmentPayment(
          d,
          payment.loanId,
          payment.rowId,
          paidDate,
          Number(paidAmount),
          method,
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
        {!loans.length ? (
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
            <p className="loan-next-payment">
              {summary?.next ? (
                <>
                  Next unpaid installment: <strong>{summary.next.dueDate}</strong> ·{' '}
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
                        <dt>Due date</dt>
                        <dd>{r.dueDate}</dd>
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
                        <dd>{r.paidDate || '—'}</dd>
                      </div>
                    </dl>
                    {r.paidDate && r.paidDate < r.dueDate && <p>Paid early</p>}
                    <button className="button small secondary" onClick={() => openPayment(r.id)}>
                      {r.paid ? 'Paid · Edit' : r.paidAmount ? 'Partial · Edit' : 'Record payment'}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      {[
                        'Installment',
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
                        <td>{r.dueDate}</td>
                        <td>{money(r.emi)}</td>
                        <td>{r.paidAmount ? money(r.paidAmount) : '—'}</td>
                        <td>
                          {r.paidDate || '—'}
                          {r.paidDate && r.paidDate < r.dueDate && <small> · Paid early</small>}
                        </td>
                        <td>
                          <button
                            className={`button small ${r.paid ? 'paid-button' : 'secondary'}`}
                            onClick={() => {
                              setPayment({ loanId: loan.id, rowId: r.id });
                              setPaidDate(r.paidDate || today());
                              setPaidAmount(String(r.paidAmount || r.emi));
                              setMethod(
                                p.entries.find((e) => e.loanRowId === r.id)?.payment ||
                                  'Not specified',
                              );
                            }}
                          >
                            {r.paid
                              ? 'Paid · Edit'
                              : r.paidAmount
                                ? 'Partial · Edit'
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
