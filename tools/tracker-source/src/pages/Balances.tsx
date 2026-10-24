import { useState } from 'react';
import { store, usePlan } from '../store';
import { reconciliationResult, provisionResult } from '../domain/balances';
import { money, reportDate } from '../domain/calculate';
import { addMonths, today } from '../domain/dates';
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
  const preview = reconciliationResult(p, {
    ...comparison,
    statementBalance: Number(statement),
  });
  const saveReconciliation = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      store.change('Save balance reconciliation', (d) => {
        (d.reconciliations ??= []).push({
          ...comparison,
          id: crypto.randomUUID(),
          statementBalance: Number(statement),
        });
      });
      toast('Comparison saved. No transaction or opening balance was changed.');
      setStatement('');
    } catch (e) {
      toast(String(e), true);
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
      toast(String(e), true);
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
        caption="Choose the payment methods represented by your statement and enter their opening balance at the start of the selected interval. Leave methods empty only for a combined cash-and-bank balance. Transfers between accounts are not modeled as income."
      >
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
                type="number"
                step=".01"
                value={r.openingBalance}
                onChange={(e) => setR({ ...r, openingBalance: Number(e.target.value) })}
              />
            </Field>
            <Field label="Statement / bank balance (₹)">
              <input
                aria-label="Statement balance"
                required
                type="number"
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
          <p>
            Recorded balance: <strong>{money(preview.calculated)}</strong> · {preview.count}{' '}
            entries.{' '}
            {statement !== '' && (
              <>
                Difference: <strong>{money(preview.difference)}</strong> (statement minus recorded).
              </>
            )}
          </p>
          <button className="button" type="submit">
            Save comparison
          </button>
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
            </article>
          );
        })}
      </Section>
      <Section
        title="Bills and provision balances"
        caption="Opt in per bill category. Cash forecasts use the due-month bill schedule. Earmarked reserves use monthly allocations minus actual bill payments; allocations are not bank transfers or additional expenses. Explicit Budget & Plan monthly overrides still take precedence."
      >
        <form onSubmit={(e) => void saveProvision(e)}>
          <div className="form-grid three">
            <Field label="Bill category">
              <select
                aria-label="Provision category"
                required
                value={q.categoryId}
                onChange={(e) => {
                  const c = p.categories.find((c) => c.id === e.target.value);
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
                  type="number"
                  min={min}
                  max={max}
                  step={['everyMonths', 'allocationDay', 'dueDay'].includes(key) ? '1' : '.01'}
                  value={q[key]}
                  onChange={(e) => setQ({ ...q, [key]: Number(e.target.value) })}
                />
              </Field>
            ))}
          </div>
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
                  setQ({ ...x });
                  setEdit(x.id);
                }}
              >
                Edit provision
              </button>
            </article>
          );
        })}
      </Section>
    </>
  );
}
