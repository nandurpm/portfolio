import { userError } from '../domain/user-error';
import { useState } from 'react';
import { HelpTerm } from '../components/HelpTerm';
import { store, usePlan } from '../store';
import { reconciliationResult, provisionResult } from '../domain/balances';
import { money, reportDate } from '../domain/calculate';
import { addMonths, today, validDate } from '../domain/dates';
import { PageHead, Section, Field, useUi } from '../components/UI';
import type { Reconciliation, Provision } from '../domain/types';
export default function Balances() {
  const p = usePlan(),
    { toast, confirm } = useUi();
  const first = p.settings.planStart + '-01';
  const [r, setR] = useState<Omit<Reconciliation, 'id'>>({
    label: '',
    fromDate: first,
    throughDate: today() < first ? first : today(),
    openingBalance: p.settings.opening,
    statementBalance: 0,
    methods: [],
    note: '',
  });
  const [editComparison, setEditComparison] = useState('');
  const [billManual, setBillManual] = useState(false);
  const [statement, setStatement] = useState('');
  const [methods, setMethods] = useState('');
  const comparison = {
    ...r,
    methods: methods
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
  const [q, setQ] = useState<Omit<Provision, 'id'>>({
    categoryId: '',
    startMonth: p.settings.planStart,
    firstDueMonth: addMonths(p.settings.planStart, 1),
    everyMonths: 2,
    monthlyAmount: 0,
    billAmount: 0,
    openingReserve: 0,
    allocationDay: p.settings.salaryDay,
    dueDay: 5,
    enabled: true,
  });
  const [edit, setEdit] = useState('');
  const validInterval = validDate(comparison.fromDate) && validDate(comparison.throughDate) &&
    comparison.fromDate <= comparison.throughDate;
  const preview = validInterval ? reconciliationResult(p, {
    ...comparison,
    statementBalance: Number(statement),
  }) : null;
  const saveReconciliation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validInterval) return;
    try {
      store.change('Save balance reconciliation', (d) => {
        const item = { ...comparison, id: editComparison || crypto.randomUUID(), statementBalance: Number(statement) };
        const index = (d.reconciliations ??= []).findIndex(x => x.id === editComparison);
        if (index >= 0) d.reconciliations[index] = item;
        else d.reconciliations.push(item);
      });
      toast('Comparison saved. No transaction or opening balance was changed.');
      setEditComparison(''); setStatement('');
    } catch (e) {
      toast(userError(e), true);
    }
  };
  const saveProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !(await confirm(
        'Apply a bill provision?',
        'The cash forecast for this category will use the bill amount in its due months instead of a flat monthly expense. Monthly reserve allocations are shown separately and are not extra expenses. Existing transactions and explicit monthly overrides are preserved.',
        false,
        'Save provision',
      ))
    )
      return;
    try {
      store.change('Save bill provision', (d) => {
        const item = { ...q, id: edit || crypto.randomUUID() };
        const existing = d.provisions?.findIndex((x) => x.id === edit) ?? -1;
        if (existing >= 0) d.provisions![existing] = item;
        else (d.provisions ??= []).push(item);
      });
      setEdit('');
      toast('Provision saved. Actual cash records are unchanged.');
    } catch (e) {
      toast(userError(e), true);
    }
  };
  return (
    <>
      <PageHead
        eyebrow="BALANCES & PROVISIONS"
        title="Compare your balance. Plan for your bills."
        description="Reconciliation compares recorded cash with a statement. Provisions earmark money without counting another expense."
      />
      <Section
        title="Balance reconciliation"
        caption="Choose the payment methods represented by your statement and enter their opening balance at the start of the selected interval. Leave methods empty only for a combined cash-and-bank balance. Combined comparisons include Accounts cash movements. Payment-method comparisons use Entries and PF only because account movements have no payment-method tag. Transfers are not income."
      >
        <div className="help-strip"><HelpTerm term="reconciliation" /></div>
        <form onSubmit={saveReconciliation}>
          <div className="form-grid three">
            <Field label="Account or comparison label">
              <input
                aria-label="Reconciliation label"
                required
                maxLength={100}
                value={r.label}
                onChange={(e) => setR({ ...r, label: e.target.value })}
              />
            </Field>
            <Field label="From date">
              <input
                aria-label="Reconciliation from date"
                required
                type="date"
                value={r.fromDate}
                onChange={(e) => setR({ ...r, fromDate: e.target.value })}
              />
            </Field>
            <Field label="Through date">
              <input
                aria-label="Reconciliation through date"
                required
                type="date"
                value={r.throughDate}
                onChange={(e) => setR({ ...r, throughDate: e.target.value })}
              />
            </Field>
            <Field label="Opening balance for these methods (₹)">
              <input
                aria-label="Reconciliation opening balance"
                required
                type="number" inputMode="decimal"
                step=".01"
                value={r.openingBalance}
                onChange={(e) => setR({ ...r, openingBalance: Number(e.target.value) })}
              />
            </Field>
            <Field label="Statement / bank balance (₹)">
              <input
                aria-label="Statement balance"
                required
                type="number" inputMode="decimal"
                step=".01"
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
              />
            </Field>
            <Field
              label="Payment methods, separated by commas"
              hint="Example: Bank, UPI. Names must match your entries. Empty means all methods."
            >
              <input
                aria-label="Reconciliation payment methods"
                value={methods}
                onChange={(e) => setMethods(e.target.value)}
              />
            </Field>
          </div>
          {preview ? <p>
            Recorded balance: <strong>{money(preview.calculated)}</strong> · {preview.count}{' '}
            entries.{' '}
            {statement !== '' && (
              <>
                Difference: <strong>{money(preview.difference)}</strong> (statement minus recorded).
              </>
            )}
          </p> : <p role="status">Choose a valid date range to preview the recorded balance.</p>}
          <button className="button" type="submit" disabled={!validInterval}>
            {editComparison ? 'Update comparison' : 'Save comparison'}
          </button>
          {editComparison && <button type="button" className="button secondary" onClick={()=>{setEditComparison('');setStatement('');}}>Cancel comparison edit</button>}
        </form>
        {(p.reconciliations ?? []).map((x) => {
          const v = reconciliationResult(p, x);
          return (
            <article className="checklist-item" key={x.id}>
              <strong>{x.label}</strong>
              <p>
                {x.fromDate} → {x.throughDate} · {x.methods.join(', ') || 'All methods'}
              </p>
              <p>
                Recorded {money(v.calculated)} · Statement {money(x.statementBalance)} · Difference{' '}
                {money(v.difference)}
              </p>
              <small>
                Recalculated from current entries; this is a comparison, not an adjustment.
              </small>
              <button className="button small secondary" onClick={()=>{setR({...x}); setStatement(String(x.statementBalance));setMethods(x.methods.join(', '));setEditComparison(x.id);}}>Edit comparison</button>
              <button className="button small secondary" onClick={()=>{store.change('Remove balance comparison',d=>{d.reconciliations=d.reconciliations?.filter(r=>r.id!==x.id);});toast('Comparison removed. Undo is available.');}}>Remove comparison</button>
            </article>
          );
        })}
      </Section>
      <Section
        title="Bills and provision balances"
        caption="Opt in per bill category. Cash forecasts use the due-month bill schedule. Earmarked reserves use monthly allocations minus actual bill payments; allocations are not bank transfers or additional expenses. Explicit Budget & Plan monthly overrides still take precedence."
      >
        <div className="help-strip"><HelpTerm term="provision" /></div>
        <form onSubmit={(e) => void saveProvision(e)}>
          <div className="form-grid three">
            <Field label="Bill category">
              <select
                aria-label="Provision category"
                required
                value={q.categoryId}
                onChange={(e) => {
                  const c = p.categories.find((c) => c.id === e.target.value);
                  setBillManual(false);
                  setQ({
                    ...q,
                    categoryId: e.target.value,
                    monthlyAmount: c?.amount ?? 0,
                    billAmount: (c?.amount ?? 0) * q.everyMonths,
                  });
                }}
              >
                <option value="">Choose category</option>
                {p.categories
                  .filter((c) => c.group === 'Living' && c.role === 'regular')
                  .map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Reserve start month">
              <input
                aria-label="Provision start month"
                required
                type="month"
                value={q.startMonth}
                onChange={(e) => setQ({ ...q, startMonth: e.target.value })}
              />
            </Field>
            <Field label="First bill due month">
              <input
                aria-label="First bill due month"
                required
                type="month"
                value={q.firstDueMonth}
                onChange={(e) => setQ({ ...q, firstDueMonth: e.target.value })}
              />
            </Field>
            {(
              [
                ['everyMonths', 'Bill repeats every N months', 1, 60],
                ['monthlyAmount', 'Monthly reserve allocation (₹)', 0, 1e12],
                ['billAmount', 'Expected bill amount (₹)', 0, 1e12],
                ['openingReserve', 'Opening earmarked reserve (₹)', -1e12, 1e12],
                ['allocationDay', 'Allocation day', 1, 31],
                ['dueDay', 'Bill due day', 1, 31],
              ] as const
            ).map(([key, label, min, max]) => (
              <Field label={label} key={key}>
                <input
                  aria-label={label}
                  required
                  type="number" inputMode="decimal"
                  min={min}
                  max={max}
                  step={['everyMonths', 'allocationDay', 'dueDay'].includes(key) ? '1' : '.01'}
                  value={q[key]}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (key === 'billAmount') setBillManual(true);
                    setQ({ ...q, [key]: value, ...(!billManual && ['monthlyAmount','everyMonths'].includes(key) ? { billAmount: Math.round((key === 'monthlyAmount' ? value : q.monthlyAmount) * (key === 'everyMonths' ? value : q.everyMonths) * 100) / 100 } : {}) });
                  }}
                />
              </Field>
            ))}
          </div>
          <label><input type="checkbox" checked={q.enabled} onChange={e=>setQ({...q,enabled:e.target.checked})}/> Enable provision</label>
          <button type="submit" className="button">
            {edit ? 'Update provision' : 'Add provision'}
          </button>
          {edit && (
            <button type="button" className="button secondary" onClick={() => setEdit('')}>
              Cancel edit
            </button>
          )}
        </form>
        {(p.provisions ?? []).map((x) => {
          const v = provisionResult(p, x, reportDate(p));
          return (
            <article className="checklist-item" key={x.id}>
              <strong>
                {p.categories.find((c) => c.id === x.categoryId)?.name} ·{' '}
                {x.enabled ? 'Active' : 'Disabled'}
              </strong>
              <p>
                {money(x.monthlyAmount)} allocated monthly · {money(x.billAmount)} bill every{' '}
                {x.everyMonths} month(s).
              </p>
              <p>
                Through {reportDate(p)}: allocations {money(v.allocations)}, bill payments{' '}
                {money(v.payments)}, earmarked balance <strong>{money(v.reserve)}</strong>.
              </p>
              <button
                className="button small secondary"
                onClick={() => {
                  setBillManual(true); setQ({ ...x });
                  setEdit(x.id);
                }}
              >
                Edit provision
              </button>
              <button className="button small secondary" onClick={()=>{store.change('Remove bill provision',d=>{d.provisions=d.provisions?.filter(r=>r.id!==x.id);});toast('Provision removed. Entries preserved; Undo is available.');}}>Remove provision</button>
            </article>
          );
        })}
      </Section>
    </>
  );
}
