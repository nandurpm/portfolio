import { userError } from '../domain/user-error';
import { ArchivedPayments } from '../components/ArchivedPayments';
import { HelpTerm } from '../components/HelpTerm';
import { receiptScope } from '../domain/archive';
import { plannedPaymentDate, possibleDuplicates } from '../domain/insights';
import { saveOriginalPayment } from '../domain/installments';
import { PaymentReceipts } from '../components/PaymentReceipts';
import { useMemo, useState } from 'react';
import AdditionalLoans from '../components/AdditionalLoans';
import { usePhone } from '../components/usePhone';
import { loanSummary, paymentRows } from '../domain/loan-summary';
import { paymentDisplayStatus } from '../domain/payment-status';
import { RefreshCw, Check, Wallet, ShieldCheck, TrendingDown } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { store, usePlan } from '../store';
import { closureAnalysis, regenerateLoan, money, round, reportDate } from '../domain/calculate';
import { monthLabel, monthDay, inRange, today, displayDate } from '../domain/dates';
import type { LoanRow } from '../domain/types';
import {
  Section,
  PageHead,
  Field,
  NumberField,
  Modal,
  Badge,
  Edited,
  Stat,
  useUi,
  ProgressBar,
} from '../components/UI';
import { SettingMonth, SettingNumber } from '../components/SettingsFields';
export default function Loan() {
  const phone = usePhone();
  const p = usePlan(),
    s = p.settings,
    { toast, confirm } = useUi(),
    [payment, setPayment] = useState<LoanRow | null>(null),
    [paidDate, setPaidDate] = useState(''),
    [paidAmount, setPaidAmount] = useState(0),
    [outside, setOutside] = useState(false),
    [firstDue, setFirstDue] = useState(p.loan.firstDueDate);
  const effectiveRows = paymentRows(p, p.loan.rows);
  const analysis = useMemo(() => closureAnalysis(p), [p]),
    rows = effectiveRows.filter((r) => outside || (r.month >= s.planStart && r.month <= s.planEnd)),
    paid = effectiveRows.filter((r) => r.paid),
    percent = p.loan.rows.length ? (paid.length / p.loan.rows.length) * 100 : 0;
  const showDate = (date: string) => displayDate(date, s.dateFormat);
  const summary = loanSummary(effectiveRows);
  function detail(field: keyof Omit<typeof p.loan, 'rows'>, value: number | string) {
    store.change(`Change loan ${field}`, (d) => {
      (d.loan as any)[field] = value;
      if (field === 'dueDay') {
        for (const r of d.loan.rows) r.dueDate = monthDay(r.month, Number(value));
        d.categories
          .filter((c) => c.role === 'emi' && !c.loanId)
          .forEach((c) => {
            c.day = Number(value);
            c.edited = true;
          });
      }
    });
  }
  function rowEdit(id: string, field: keyof LoanRow, value: number | string | boolean) {
    store.change(`Edit loan schedule ${field}`, (d) => {
      const r = d.loan.rows.find((r) => r.id === id)!;
      (r as any)[field] = value;
      r.edited = true;
      if (field === 'paidBeforeOpening' && value) {
        r.paid = true;
        r.paidAmount = r.emi;
        d.entries = d.entries.filter((e) => e.loanRowId !== id);
      }
      if (field === 'paidBeforeOpening' && !value && !d.entries.some((e) => e.loanRowId === id)) {
        r.paid = false;
        r.paidAmount = 0;
      }
    });
  }
  async function regen() {
    if (
      !(await confirm(
        'Regenerate the loan schedule?',
        'Your current parameters will replace schedule amounts and row overrides. Recorded payment entries are kept and re-linked by month. The first interest amount is explicit because your agreement’s first period is irregular.',
        false,
        'Regenerate',
      ))
    )
      return;
    try {
      const next = regenerateLoan({...p, loan: {...p.loan, firstDueDate: firstDue}});
      store.change('Regenerate loan schedule', (d) => {
        d.loan.firstDueDate = firstDue;
        d.loan.rows = next;
      });
      toast('Schedule regenerated. Paid amounts are preserved.');
    } catch (e) {
      toast(userError(e), true);
    }
  }
  async function mark(r: LoanRow) {
    if (r.paidBeforeOpening) {
      if (
        await confirm(
          'Change the already-paid EMI?',
          'This payment was made before opening savings. Marking it unpaid adds it back to the plan.',
          false,
          'Mark unpaid',
        )
      )
        rowEdit(r.id, 'paidBeforeOpening', false);
      return;
    }
    if (r.paid) {
      if (
        !(await confirm(
          'Mark this EMI unpaid?',
          'The linked actual transaction will be removed. You can undo this change.',
        ))
      )
        return;
      store.change('Mark EMI unpaid', (d) => {
        const row = d.loan.rows.find((x) => x.id === r.id)!;
        row.paid = false;
        row.paidAmount = 0;
        row.paidDate = '';
        d.entries = d.entries.filter((e) => e.loanRowId !== r.id);
      });
      return;
    }
    setReceiptId('');
    setPayment(p.loan.rows.find((row) => row.id === r.id)!);
    setPaidDate(inRange(today(), s.planStart, s.planEnd) ? today() : r.dueDate);
    setPaidAmount(Math.max(0, r.emi - (p.loan.rows.find((row) => row.id === r.id)?.paidAmount ?? 0)));
  }
  const [receiptId, setReceiptId] = useState('');
  async function savePayment() {
    if (!payment) return;
    const cat = p.categories.find((c) => c.role === 'emi' && !c.loanId);
    if (!cat) {
      toast('Add an EMI category before recording a loan payment.', true);
      return;
    }
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

      if (
        possibleDuplicates(p.entries, {
          id: receiptId,
          date: paidDate,
          categoryId: cat.id,
          amount: paidAmount,
        }).length &&
        !(await confirm(
          'Possible duplicate payment',
          'A receipt already has this date, category and amount. Is this a separate transfer?',
          false,
          'Save anyway',
        ))
      )
        return;
      store.change(`Pay EMI: ${payment.month}`, (d) =>
        saveOriginalPayment(d, payment.id, paidDate, paidAmount, receiptId || undefined),
      );
      setPayment(null);
      toast('Payment saved in the schedule and Daily Entries.');
    } catch (e) {
      toast(userError(e), true);
    }
  }
  return (
    <>
      <PageHead
        eyebrow="LOAN & CLOSURE"
        title="Make room for a debt-free future."
        description="Your agreement’s schedule, actual payments and early-closure options in one place."
      />
      <section className="loan-command-strip" aria-labelledby="loan-command-title">
        <div className="loan-command-heading">
          <span className="section-kicker">LOAN SNAPSHOT</span>
          <h2 id="loan-command-title">Stay ahead of the repayment curve</h2>
          <p>{summary.paidCount} of {p.loan.rows.length} installments completed · {Math.round(percent)}% repaid by count</p>
        </div>
        <div className="loan-command-progress"><span style={{ width: `${Math.min(100, percent)}%` }} /></div>
        <div className="loan-command-metrics">
          <div><span>Next due</span><strong>{summary.next ? showDate(summary.next.dueDate) : 'Complete'}</strong></div>
          <div><span>Remaining</span><strong>{money(summary.remaining)}</strong></div>
          <div><span>Closure view</span><strong>{analysis.assessment}</strong></div>
        </div>
      </section>
      <Section
        title="Original loan · repayment overview"
        caption="Remaining repayment includes scheduled interest. It is different from the principal balance or an early-settlement quote."
      >
        <dl className="loan-money-grid">
          <div>
            <dt>Financed amount</dt>
            <dd>{money(p.loan.principal)}</dd>
          </div>
          <div>
            <dt>Total scheduled repayment</dt>
            <dd>{money(summary.total)}</dd>
          </div>
          <div>
            <dt>Paid so far</dt>
            <dd>{money(summary.paid)}</dd>
          </div>
          <div>
            <dt>Repayment remaining</dt>
            <dd>{money(summary.remaining)}</dd>
          </div>
        </dl>
        <p className="loan-next-payment">
          {summary.next ? (
            <>
              Next installment without full recorded payment:{' '}
              <strong>Pay {showDate(plannedPaymentDate(p, summary.next.dueDate))}</strong> → Due{' '}
              <strong>{showDate(summary.next.dueDate)}</strong> ·{' '}
              <strong>{money(summary.nextAmount)}</strong>
            </>
          ) : (
            'All scheduled installments are paid.'
          )}
        </p>
        <p className="muted">
          {summary.paidCount} of {p.loan.rows.length} installments paid ·{' '}
          {p.loan.rows.length - summary.paidCount} remaining
        </p>
      </Section>
      <ArchivedPayments />
      <AdditionalLoans />
      <h2>Original loan · schedule & early closure</h2>
      <p className="muted">
        The controls below apply to the original loan only. Mobile-phone and other added loans keep
        their own schedules above.
      </p>
      <div className="loan-hero">
        <div
          className="paid-ring"
          style={{
            background: `conic-gradient(var(--accent) ${percent}%,var(--ring-track) 0)`,
          }}
        >
          <div>
            <strong>{Math.round(percent)}%</strong>
            <span>EMIs paid</span>
          </div>
        </div>
        <div>
          <span className="eyebrow">PAYMENT PROGRESS</span>
          <h2>
            {paid.length} of {p.loan.rows.length} EMIs paid
          </h2>
          <p>
            EMI due day: {p.loan.dueDay}. Salary day: {s.salaryDay}.{' '}
            {s.emiPreviousMonth
              ? `Pay next month’s EMI on salary day ${s.salaryDay}. The forecast counts it in this payment month.`
              : p.loan.dueDay < s.salaryDay
                ? 'Keep next month’s EMI aside before salary arrives.'
                : 'Set aside the installment when salary arrives.'}
          </p>
          <div className="pill-row">
            {p.loan.rows.some((r) => r.paidBeforeOpening) && (
              <Badge tone="income">Pre-opening payments included in paid total</Badge>
            )}
            <Badge>Payments link to Daily Entries</Badge>
          </div>
        </div>
      </div>
      <div className="stats-grid three">
        <Stat
          label="Estimated early-settlement amount"
          value={analysis.quote}
          caption={`After ${monthLabel(s.closureMonth)} EMI`}
          tone="violet"
          icon={<Wallet />}
        />
        <Stat
          label="Forecast cash after settlement"
          value={analysis.after ?? 0}
          caption={analysis.assessment}
          tone={analysis.after !== null && analysis.after >= s.cushion ? 'green' : 'orange'}
          icon={<ShieldCheck />}
        />
        <Stat
          label="Estimated net interest saved"
          value={analysis.interestSaved}
          caption="Future interest less entered fees and interest"
          tone="green"
          icon={<TrendingDown />}
        />
      </div>
      <Section
        title="Early closure planner"
        caption="Uses closing cash. The next EMI reserve is released when the loan is fully closed."
      >
        <div className="form-grid three">
          <Field label="Loan payment mode">
            <select
              value={s.mode}
              onChange={(e) =>
                store.change('Change loan payment mode', (d) => {
                  d.settings.mode = e.target.value as typeof s.mode;
                })
              }
            >
              <option>Scheduled</option>
              <option>Early closure</option>
            </select>
          </Field>
          <SettingMonth name="closureMonth" label="Closure month" />
          <SettingNumber
            name="lenderQuote"
            label="Lender quote override (₹)"
            hint="0 uses principal + estimated interest + fees"
          />
          <SettingNumber name="accruedInterest" label="Accrued interest estimate (₹)" />
          <SettingNumber name="fees" label="Fees & taxes (₹)" />
          <SettingNumber name="cushion" label="Cash cushion after closure (₹)" />
          <HelpTerm term="cash cushion" />
        </div>
        <div className="closure-summary">
          <div>
            <small>Principal after selected EMI</small>
            <strong>{money(analysis.principal)}</strong>
          </div>
          <div>
            <small>Cash available before closure</small>
            <strong>
              {analysis.available === null ? 'Outside plan' : money(analysis.available)}
            </strong>
          </div>
          <div>
            <small>Earliest indicative month meeting your cushion</small>
            <strong>
              {analysis.earliest ? monthLabel(analysis.earliest, true) : 'Not within the plan'}
            </strong>
          </div>
          <Badge tone={analysis.assessment === 'Meets cushion' ? 'income' : 'debt'}>
            {analysis.assessment}
          </Badge>
        </div>
        <p className="footnote">
          Future closure dates are indicative, not guaranteed settlement dates.
          Outside your selected quote month, the planner compares cash with indicative outstanding
          principal only; future lender interest, settlement charges, and fees may change the date.
          Confirm an actual payoff amount with the lender before committing to early closure.
          Early closure adds the selected settlement once and stops later planned EMIs.
        </p>
      </Section>
      <Section
        title="Loan details"
        caption="Amounts stay tied to the agreement until you regenerate the schedule. Editing a schedule row overrides that row."
        action={
          <button className="button secondary" onClick={() => void regen()}>
            <RefreshCw size={17} /> Regenerate original schedule
          </button>
        }
      >
        <div className="form-grid four">
          {(
            [
              ['principal', 'Original principal (₹)'],
              ['annualRate', 'Annual interest rate (%)'],
              ['tenure', 'Tenure (months)'],
              ['regularEmi', 'Regular EMI (₹)'],
              ['firstEmi', 'First EMI (₹)'],
              ['firstInterest', 'First-period interest (₹)'],
              ['dueDay', 'EMI due day'],
            ] as const
          ).map(([k, label]) => (
            <Field key={k} label={label}>
              <NumberField
                label={label}
                value={p.loan[k]}
                min={k === 'dueDay' || k === 'tenure' ? 1 : 0}
                step={k === 'dueDay' || k === 'tenure' ? '1' : '.01'}
                onCommit={(v) => detail(k, v)}
              />
            </Field>
          ))}
          <Field label="First due date" hint="Changes apply only when you choose Regenerate schedule. Existing dates stay unchanged until then.">
            <input
              type="date"
              value={firstDue}
              onChange={(e) => {
                if (e.target.value)
                  try {
                    setFirstDue(e.target.value);
                  } catch (err) {
                    toast(userError(err), true);
                  }
              }}
            />
          </Field>
        </div>
      </Section>
      <Section title="Contract balance" caption="Remaining principal after each scheduled EMI">
        <div className="help-strip"><HelpTerm term="contract balance" /></div>
        <div className="chart-box short">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows.map((r) => ({ ...r, name: monthLabel(r.month) }))}>
              <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted)' }} minTickGap={24} />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
                tickFormatter={(v) => `${v / 1000}k`}
              />
              <Tooltip
                formatter={(v: any) => money(Number(v))}
                contentStyle={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  borderRadius: 12,
                }}
              />
              <Area
                name="Principal remaining"
                dataKey="balance"
                stroke="var(--accent)"
                fill="var(--accent-soft)"
                strokeWidth={3}
                isAnimationActive={s.animations}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>
      <Section
        title="Your payment schedule"
        caption="All numbers and payment dates can be edited. Schedule differences are flagged, never silently adjusted."
        action={
          <label className="check-label">
            <input
              type="checkbox"
              checked={outside}
              onChange={(e) => setOutside(e.target.checked)}
            />
            Show outside plan range
          </label>
        }
      >
        {phone ? (
          <div className="installment-cards">
            {rows.map((r) => (
              <article key={r.id} className="installment-card">
                <div className="installment-card-head">
                  <strong>{monthLabel(r.month)}</strong>
                  <Badge tone={r.paid ? 'income' : r.paidAmount ? 'living' : 'neutral'}>
                    {paymentDisplayStatus(r, plannedPaymentDate(p, r.dueDate), r.dueDate, reportDate(p))}
                  </Badge>
                </div>
                <dl>
                  <div>
                    <dt>Planned pay date</dt>
                    <dd>{showDate(plannedPaymentDate(p, r.dueDate))}</dd>
                  </div>
                  <div>
                    <dt>Due date</dt>
                    <dd>{r.dueDate}</dd>
                  </div>
                  <div>
                    <dt>Installment</dt>
                    <dd>{money(r.emi)}</dd>
                  </div>
                  <div>
                    <dt>Paid amount</dt>
                    <dd>{money(r.paidAmount)}</dd>
                  </div>
                  <div>
                    <dt>Payment date</dt>
                    <dd>{r.paidDate ? showDate(r.paidDate) : (r.paidBeforeOpening ? 'Before opening' : '—')}</dd>
                  </div>
                </dl>
                <button className="button small secondary" onClick={() => void mark(r)}>
                  {r.paid ? 'Payment status' : r.paidAmount ? 'Add receipt' : 'Record payment'}
                </button>
                {r.paid && !r.paidBeforeOpening && (
                  <button
                    className="button small secondary"
                    onClick={() => {
                      setPayment(p.loan.rows.find((row) => row.id === r.id)!);
                      setReceiptId(
                        p.entries.filter((e) => e.loanRowId === r.id).length === 1
                          ? p.entries.find((e) => e.loanRowId === r.id)!.id
                          : '',
                      );
                      setPaidDate(r.paidDate);
                      setPaidAmount(r.paidAmount);
                    }}
                  >
                    Edit payment
                  </button>
                )}
                <details>
                  <summary>Edit installment details</summary>
                  <Field label={`${r.month} due date`}>
                    <input
                      type="date"
                      value={r.dueDate}
                      onChange={(e) => {
                        try {
                          rowEdit(r.id, 'dueDate', e.target.value);
                        } catch (err) {
                          toast(userError(err), true);
                        }
                      }}
                    />
                  </Field>
                  {(['emi', 'principal', 'interest', 'balance'] as const).map((k) => (
                    <Field label={k} key={k}>
                      <NumberField
                        label={`${r.month} ${k}`}
                        value={r[k]}
                        onCommit={(v) => rowEdit(r.id, k, v)}
                      />
                    </Field>
                  ))}
                </details>
              </article>
            ))}
          </div>
        ) : (
          <div
            className="table-scroll long-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Original loan repayment schedule"
          >
            <table className="data-table loan-table">
              <thead>
                <tr>
                  {[
                    'Month',
                    'Planned pay date',
                    'Due date',
                    'EMI',
                    'Principal',
                    'Interest',
                    'Balance',
                    'Before opening',
                    'Actual paid',
                    'Paid date',
                    'Status',
                  ].map((x) => (
                    <th scope="col" key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const inconsistent = Math.abs(round(r.principal + r.interest) - r.emi) > 0.02;
                  return (
                    <tr key={r.id} className={r.paid ? 'paid-row' : ''}>
                      <td className="nowrap strong">
                        {monthLabel(r.month)}
                        {r.edited && <Edited />}
                        {inconsistent && <Badge tone="debt">EMI ≠ principal + interest</Badge>}
                      </td>
                      <td>{showDate(plannedPaymentDate(p, r.dueDate))}</td>
                      <td>
                        <input
                          aria-label={`${r.month} due date`}
                          type="date"
                          value={r.dueDate}
                          onChange={(e) => {
                            try {
                              rowEdit(r.id, 'dueDate', e.target.value);
                            } catch (err) {
                              toast(userError(err), true);
                            }
                          }}
                        />
                      </td>
                      {(['emi', 'principal', 'interest', 'balance'] as const).map((k) => (
                        <td key={k}>
                          <NumberField
                            label={`${r.month} ${k}`}
                            value={r[k]}
                            onCommit={(v) => rowEdit(r.id, k, v)}
                          />
                        </td>
                      ))}
                      <td>
                        <input
                          aria-label={`${r.month} paid before opening`}
                          type="checkbox"
                          checked={r.paidBeforeOpening}
                          onChange={(e) => rowEdit(r.id, 'paidBeforeOpening', e.target.checked)}
                        />
                      </td>
                      <td>{r.paidAmount > 0 ? money(r.paidAmount) : '—'}</td>
                      <td>{showDate(r.paidDate)}</td>
                      <td>
                        <button
                          className={`button small ${r.paid ? 'paid-button' : 'secondary'}`}
                          onClick={() => void mark(r)}
                        >
                          {r.paid ? (
                            <>
                              <Check size={14} />
                              Paid
                            </>
                          ) : (
                            'Record payment'
                          )}
                        </button>
                        {r.paid && !r.paidBeforeOpening && (
                          <button
                            className="text-button"
                            onClick={() => {
                              setPayment(p.loan.rows.find((row) => row.id === r.id)!);
                              setReceiptId(
                                p.entries.filter((e) => e.loanRowId === r.id).length === 1
                                  ? p.entries.find((e) => e.loanRowId === r.id)!.id
                                  : '',
                              );
                              setPaidDate(r.paidDate);
                              setPaidAmount(r.paidAmount);
                            }}
                          >
                            Edit payment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <ProgressBar value={percent} tone="income" />
      </Section>
      {payment && (
        <Modal
          title={`Record EMI payment · ${monthLabel(payment.month)}`}
          onClose={() => setPayment(null)}
        >
          <PaymentReceipts
            dateFormat={p.settings.dateFormat}
            receipts={p.entries.filter((e) => e.loanRowId === payment.id)}
            onEdit={(e) => {
              setReceiptId(e.id);
              setPaidDate(e.date);
              setPaidAmount(e.amount);
            }}
          />
          <p>
            {receiptId
              ? 'Editing one receipt.'
              : 'Add another transfer; previous receipts stay separate.'}
          </p>
          <Field label="Actual paid amount (₹)">
            <input
              type="number" inputMode="decimal"
              min=".01"
              step=".01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
            />
          </Field>
          <Field label="Actual payment date">
            <input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
          </Field>
          <p className="muted">
            This saves one receipt. A payment outside the plan range is kept in the archive.
          </p>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setPayment(null)}>
              Cancel
            </button>
            <button className="button" onClick={savePayment}>
              Save payment
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
