import { usePhone } from '../components/usePhone';
import { useRef, useState, useEffect } from 'react';
import {
  Plus,
  Settings2,
  ArrowUp,
  ArrowDown,
  Trash2,
  RotateCcw,
  Copy,
  Grip,
  ChevronRight,
} from 'lucide-react';
import { store, usePlan } from '../store';
import type { Category } from '../domain/types';
import { fullAmount, key } from '../domain/calculate';
import { monthsBetween, monthLabel, clampMonth } from '../domain/dates';
import {
  Section,
  PageHead,
  Field,
  Modal,
  NumberField,
  Badge,
  Edited,
  Toggle,
  useUi,
} from '../components/UI';
import { IncomeSettings } from '../components/SettingsFields';
import { RangeControl } from '../components/RangeControl';
export default function Budget() {
  const p = usePlan(),
    { toast, confirm } = useUi(),
    [edit, setEdit] = useState<Category | null>(null),
    [cell, setCell] = useState<{ month: string; id: string } | null>(null),
    [source, setSource] = useState(p.settings.selectedMonth),
    [targetStart, setTargetStart] = useState(p.settings.selectedMonth),
    [targetEnd, setTargetEnd] = useState(p.settings.selectedMonth),
    [percent, setPercent] = useState(5),
    [deleteCat, setDeleteCat] = useState<Category | null>(null),
    [reassign, setReassign] = useState('');
  const phone = usePhone();
  const [budgetMonth, setBudgetMonth] = useState(p.settings.selectedMonth);
  const drag = useRef<{ month: string; id: string; value: number } | null>(null);
  const months = monthsBetween(p.settings.planStart, p.settings.planEnd),
    cats = p.categories;
  useEffect(() => {
    setBudgetMonth((m) => clampMonth(m, p.settings.planStart, p.settings.planEnd));
    setSource((m) => clampMonth(m, p.settings.planStart, p.settings.planEnd));
    setTargetStart((m) => clampMonth(m, p.settings.planStart, p.settings.planEnd));
    setTargetEnd((m) => clampMonth(m, p.settings.planStart, p.settings.planEnd));
  }, [p.settings.planStart, p.settings.planEnd]);
  function override(month: string, id: string, value: number) {
    store.change(`Budget override: ${month} / ${cats.find((c) => c.id === id)?.name}`, (d) => {
      d.overrides[key(month, id)] = value;
    });
    setCell({ month, id });
  }
  function reset(scope: 'cell' | 'row' | 'month') {
    if (!cell) return;
    store.change(`Reset ${scope} budget to formulas`, (d) => {
      for (const k of Object.keys(d.overrides)) {
        const [m, id] = k.split('|');
        if (
          scope === 'cell'
            ? m === cell.month && id === cell.id
            : scope === 'row'
              ? id === cell.id
              : m === cell.month
        )
          delete d.overrides[k];
      }
    });
  }
  function fill(direction: 'right' | 'down') {
    if (!cell) return;
    const c = cats.find((c) => c.id === cell.id)!;
    const amount = fullAmount(p, c, cell.month);
    store.change(`Fill ${direction} in budget`, (d) => {
      if (direction === 'right')
        months
          .filter((m) => m >= cell.month)
          .forEach((m) => {
            d.overrides[key(m, c.id)] = amount;
          });
      else
        cats.slice(cats.findIndex((x) => x.id === c.id)).forEach((c) => {
          d.overrides[key(cell.month, c.id)] = amount;
        });
    });
    toast(`Filled ${direction}. Undo is available.`);
  }
  function drop(month: string, id: string) {
    const a = drag.current;
    if (!a) return;
    const m1 = months.indexOf(a.month),
      m2 = months.indexOf(month),
      c1 = cats.findIndex((c) => c.id === a.id),
      c2 = cats.findIndex((c) => c.id === id);
    if ([m1, m2, c1, c2].some((n) => n < 0)) return;
    store.change('Drag-fill budget cells', (d) => {
      for (let i = Math.min(m1, m2); i <= Math.max(m1, m2); i++)
        for (let j = Math.min(c1, c2); j <= Math.max(c1, c2); j++) {
          const m = months[i],
            c = cats[j];
          if (m && c) d.overrides[key(m, c.id)] = a.value;
        }
    });
    drag.current = null;
  }
  async function copy() {
    if (targetStart > targetEnd) {
      toast('End month must follow start month.', true);
      return;
    }
    const targets = monthsBetween(targetStart, targetEnd).filter((m) => months.includes(m));
    if (
      !(await confirm(
        'Copy a month’s budget?',
        `Copy ${monthLabel(source)} into ${targets.length} target months? These become editable overrides.`,
      ))
    )
      return;
    store.change('Copy monthly budget', (d) => {
      for (const m of targets)
        for (const c of cats) d.overrides[key(m, c.id)] = fullAmount(p, c, source);
    });
    toast('Budget copied.');
  }
  function increase() {
    if (!Number.isFinite(percent) || percent < -100 || percent > 10000) {
      toast('Use a percentage from −100 to 10,000.', true);
      return;
    }
    store.change(`Apply ${percent}% to budget`, (d) => {
      for (const m of monthsBetween(targetStart, targetEnd).filter((m) => months.includes(m)))
        for (const c of cats.filter((c) => !cell || c.id === cell.id))
          d.overrides[key(m, c.id)] =
            Math.round(fullAmount(p, c, m) * (1 + percent / 100) * 100) / 100;
    });
    toast('Percentage change applied to the target months.');
  }
  function saveCategory() {
    if (!edit) return;
    try {
      store.change(`Save category: ${edit.name}`, (d) => {
        const i = d.categories.findIndex((c) => c.id === edit.id);
        const c = { ...edit, name: edit.name.trim(), edited: true };
        if (i < 0) d.categories.push(c);
        else d.categories[i] = c;
      });
      setEdit(null);
      toast('Category saved. Existing entries keep their mapping.');
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), true);
    }
  }
  function move(id: string, by: number) {
    store.change('Reorder categories', (d) => {
      const i = d.categories.findIndex((c) => c.id === id),
        j = i + by;
      if (j < 0 || j >= d.categories.length) return;
      const first = d.categories[i],
        second = d.categories[j];
      if (!first || !second) return;
      d.categories[i] = second;
      d.categories[j] = first;
    });
  }
  function removeCategory() {
    if (!deleteCat) return;
    if (deleteCat.loanId || deleteCat.role === 'emi' || deleteCat.role === 'closure') {
      toast(
        'This category is linked to a loan. Keep it so installments and payments remain connected.',
        true,
      );
      setDeleteCat(null);
      return;
    }
    const used = p.entries.some((e) => e.categoryId === deleteCat.id);
    if (used && !reassign) {
      toast('Choose a replacement category for existing entries.', true);
      return;
    }
    try {
      store.change(`Delete category: ${deleteCat.name}`, (d) => {
        d.entries.forEach((e) => {
          if (e.categoryId === deleteCat.id) {
            e.categoryId = reassign;
            e.edited = true;
          }
        });
        d.categories = d.categories.filter((c) => c.id !== deleteCat.id);
        Object.keys(d.overrides)
          .filter((k) => k.endsWith('|' + deleteCat.id))
          .forEach((k) => delete d.overrides[k]);
      });
      setDeleteCat(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), true);
    }
  }
  return (
    <>
      <PageHead
        eyebrow="BUDGET & PLAN"
        title="Give every rupee a plan."
        description="Set your defaults once. Make one-off changes only where life changes."
        action={<RangeControl />}
      />
      <Section
        title="Income & opening savings"
        caption="Edit a value and leave the field to save. Your plan updates instantly."
      >
        <IncomeSettings />
      </Section>
      <Section
        title="Your categories"
        caption="Rename freely. Stable category IDs keep all existing transactions connected."
        action={
          <button
            className="button secondary"
            onClick={() =>
              setEdit({
                id: crypto.randomUUID(),
                name: '',
                group: 'Living',
                amount: 0,
                timing: 'Daily',
                day: 1,
                months: [],
                active: true,
                role: 'regular',
                note: '',
              })
            }
          >
            <Plus size={16} />
            Add category
          </button>
        }
      >
        {phone ? (
          <div className="phone-category-list">
            {cats.map((c, i) => (
              <article className={`phone-category-card ${c.active ? '' : 'inactive'}`} key={c.id}>
                <div className="phone-card-heading">
                  <strong>
                    {c.name}
                    {c.edited && <Edited />}
                  </strong>
                  <Badge tone={c.group.toLowerCase()}>{c.group}</Badge>
                </div>
                {c.note && <p>{c.note}</p>}
                {c.role === 'regular' ? (
                  <Field label="Base amount (₹)">
                    <NumberField
                      label={`${c.name} base amount`}
                      value={c.amount}
                      onCommit={(amount) =>
                        store.change(`Change ${c.name} budget`, (d) => {
                          Object.assign(
                            d.categories.find((x) => x.id === c.id)!,
                            { amount, edited: true },
                          );
                        })
                      }
                    />
                  </Field>
                ) : (
                  <p>
                    {c.role === 'salary'
                      ? 'Salary rule'
                      : c.role === 'emi'
                        ? 'Loan schedule'
                        : 'Closure settings'}
                  </p>
                )}
                <p>
                  {c.timing}
                  {c.timing === 'Fixed day' ? ` · day ${c.day}` : ''} ·{' '}
                  {c.months.length
                    ? c.months
                        .map((m) =>
                          new Date(2026, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' }),
                        )
                        .join(', ')
                    : 'Every month'}
                </p>
                <label className="phone-active">
                  <input
                    aria-label={`${c.name} active`}
                    type="checkbox"
                    checked={c.active}
                    onChange={(e) =>
                      store.change(`Toggle ${c.name}`, (d) => {
                        Object.assign(
                          d.categories.find((x) => x.id === c.id)!,
                          { active: e.target.checked, edited: true },
                        );
                      })
                    }
                  />
                  Active in budget
                </label>
                <div className="phone-card-actions">
                  <button
                    className="icon-button"
                    aria-label={`Move ${c.name} up`}
                    disabled={i === 0}
                    onClick={() => move(c.id, -1)}
                  >
                    <ArrowUp size={19} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Move ${c.name} down`}
                    disabled={i === cats.length - 1}
                    onClick={() => move(c.id, 1)}
                  >
                    <ArrowDown size={19} />
                  </button>
                  <button
                    className="button secondary"
                    aria-label={`Edit ${c.name}`}
                    onClick={() => setEdit(structuredClone(c))}
                  >
                    <Settings2 size={18} />
                    Edit
                  </button>
                  <button
                    className="icon-button red"
                    aria-label={`Delete ${c.name}`}
                    disabled={cats.length === 1}
                    onClick={() => {
                      setDeleteCat(c);
                      setReassign('');
                    }}
                  >
                    <Trash2 size={19} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table categories-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Group</th>
                  <th>Base amount</th>
                  <th>Timing</th>
                  <th>Rule</th>
                  <th>Active</th>
                  <th>Order / Edit</th>
                </tr>
              </thead>
              <tbody>
                {cats.map((c, i) => (
                  <tr key={c.id} className={!c.active ? 'inactive' : ''}>
                    <td className="strong">
                      <span className={`category-dot ${c.group.toLowerCase()}`} />
                      {c.name}
                      {c.edited && <Edited />}
                      <small className="subtle">{c.note}</small>
                    </td>
                    <td>
                      <Badge tone={c.group.toLowerCase()}>{c.group}</Badge>
                    </td>
                    <td>
                      {c.role === 'regular' ? (
                        <NumberField
                          label={`${c.name} base amount`}
                          value={c.amount}
                          onCommit={(amount) =>
                            store.change(`Change ${c.name} budget`, (d) => {
                              Object.assign(
                                d.categories.find((x) => x.id === c.id)!,
                                { amount, edited: true },
                              );
                            })
                          }
                        />
                      ) : (
                        <span className="muted">
                          {c.role === 'salary'
                            ? 'Salary rule'
                            : c.role === 'emi'
                              ? 'Loan schedule'
                              : 'Closure settings'}
                        </span>
                      )}
                    </td>
                    <td>
                      {c.timing}
                      {c.timing === 'Fixed day' && <small className="subtle">Day {c.day}</small>}
                    </td>
                    <td>
                      {c.months.length
                        ? c.months
                            .map((m) =>
                              new Date(2026, m - 1, 1).toLocaleDateString('en-IN', {
                                month: 'short',
                              }),
                            )
                            .join(', ')
                        : 'Every month'}
                    </td>
                    <td>
                      <input
                        aria-label={`${c.name} active`}
                        type="checkbox"
                        checked={c.active}
                        onChange={(e) =>
                          store.change(`Toggle ${c.name}`, (d) => {
                            Object.assign(
                              d.categories.find((x) => x.id === c.id)!,
                              { active: e.target.checked, edited: true },
                            );
                          })
                        }
                      />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label={`Move ${c.name} up`}
                          disabled={i === 0}
                          onClick={() => move(c.id, -1)}
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Move ${c.name} down`}
                          disabled={i === cats.length - 1}
                          onClick={() => move(c.id, 1)}
                        >
                          <ArrowDown size={15} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Edit ${c.name}`}
                          onClick={() => setEdit(structuredClone(c))}
                        >
                          <Settings2 size={16} />
                        </button>
                        <button
                          className="icon-button red"
                          aria-label={`Delete ${c.name}`}
                          disabled={cats.length === 1}
                          onClick={() => {
                            setDeleteCat(c);
                            setReassign('');
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
      <Section
        title="Monthly budget grid"
        caption={
          phone
            ? `${months.length} months · Choose one month to edit. Copy or apply a percentage below.`
            : `${months.length} months · Click a cell to select it · Drag its square handle to fill a rectangle`
        }
        action={
          cell && (
            <Badge tone="violet">
              {cats.find((c) => c.id === cell.id)?.name} · {monthLabel(cell.month)}
            </Badge>
          )
        }
      >
        {!phone && (
          <div className="budget-toolbar">
            <button
              className="button small secondary"
              disabled={!cell}
              onClick={() => fill('right')}
            >
              Fill right <ChevronRight size={15} />
            </button>
            <button
              className="button small secondary"
              disabled={!cell}
              onClick={() => fill('down')}
            >
              Fill down <ArrowDown size={15} />
            </button>
            <button
              className="button small secondary"
              disabled={!cell}
              onClick={() => reset('cell')}
            >
              <RotateCcw size={15} />
              Reset cell
            </button>
            <button
              className="button small secondary"
              disabled={!cell}
              onClick={() => reset('row')}
            >
              Reset row
            </button>
            <button
              className="button small secondary"
              disabled={!cell}
              onClick={() => reset('month')}
            >
              Reset month
            </button>
            <button className="text-button" onClick={() => setCell(null)}>
              Clear selection
            </button>
          </div>
        )}
        {phone ? (
          <div className="phone-budget">
            <Field label="Budget month">
              <select
                aria-label="Budget month"
                value={budgetMonth}
                onChange={(e) => {
                  setBudgetMonth(e.target.value);
                  setCell(null);
                }}
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="phone-budget-actions">
              <button
                className="button secondary"
                onClick={() =>
                  store.change(`Reset ${budgetMonth} budget`, (d) => {
                    Object.keys(d.overrides)
                      .filter((k) => k.startsWith(budgetMonth + '|'))
                      .forEach((k) => delete d.overrides[k]);
                  })
                }
              >
                <RotateCcw size={17} />
                Reset this month
              </button>
              {cell && (
                <button className="text-button" onClick={() => setCell(null)}>
                  Clear category selection
                </button>
              )}
            </div>
            <div className="phone-budget-list">
              {cats
                .filter((c) => c.active)
                .map((c) => {
                  const edited = key(budgetMonth, c.id) in p.overrides;
                  return (
                    <article
                      className={`phone-budget-card ${cell?.id === c.id ? 'selected' : ''}`}
                      key={c.id}
                    >
                      <div className="phone-card-heading">
                        <strong>{c.name}</strong>
                        <Badge tone={edited ? 'violet' : 'neutral'}>
                          {edited ? 'Override' : 'Formula'}
                        </Badge>
                      </div>
                      <Field label={`Full-month plan · ${monthLabel(budgetMonth, true)}`}>
                        <NumberField
                          label={`${c.name} ${budgetMonth} budget`}
                          value={fullAmount(p, c, budgetMonth)}
                          onCommit={(v) => override(budgetMonth, c.id, v)}
                        />
                      </Field>
                      <div className="phone-card-actions">
                        <button
                          className="button secondary"
                          aria-label={`Select ${c.name} for budget tools`}
                          aria-pressed={cell?.id === c.id}
                          onClick={() => setCell({ month: budgetMonth, id: c.id })}
                        >
                          {cell?.id === c.id ? 'Selected' : 'Select category'}
                        </button>
                        <button
                          className="button secondary"
                          disabled={!edited}
                          aria-label={`Reset ${c.name} ${budgetMonth} to formula`}
                          onClick={() =>
                            store.change(`Reset ${c.name} ${budgetMonth}`, (d) => {
                              delete d.overrides[key(budgetMonth, c.id)];
                            })
                          }
                        >
                          <RotateCcw size={17} />
                          Reset
                        </button>
                      </div>
                      {cell?.id === c.id && (
                        <div className="phone-card-actions">
                          <button className="button secondary" onClick={() => fill('right')}>
                            Copy to later months
                          </button>
                          <button className="button secondary" onClick={() => fill('down')}>
                            Copy to following categories
                          </button>
                          <button className="button secondary" onClick={() => reset('row')}>
                            Reset category
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="budget-grid-scroll">
            <table className="data-table budget-grid">
              <thead>
                <tr>
                  <th>Category / Month</th>
                  {months.map((m) => (
                    <th key={m}>{monthLabel(m)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cats
                  .filter((c) => c.active)
                  .map((c) => (
                    <tr key={c.id}>
                      <td>
                        <span className={`category-dot ${c.group.toLowerCase()}`} />
                        {c.name}
                      </td>
                      {months.map((m) => {
                        const edited = key(m, c.id) in p.overrides;
                        return (
                          <td
                            key={m}
                            className={`${edited ? 'overridden' : ''} ${cell?.id === c.id && cell.month === m ? 'active-cell' : ''}`}
                            onClick={() => setCell({ month: m, id: c.id })}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => drop(m, c.id)}
                          >
                            <NumberField
                              label={`${c.name} ${m} budget`}
                              value={fullAmount(p, c, m)}
                              onCommit={(v) => override(m, c.id, v)}
                            />
                            {edited && (
                              <span
                                className="override-dot"
                                title="Monthly override. Reset to return to formula."
                              />
                            )}
                            <button
                              draggable
                              aria-label={`Fill ${c.name} ${m}`}
                              title="Drag to fill"
                              className="budget-fill-handle"
                              onDragStart={() => {
                                drag.current = { month: m, id: c.id, value: fullAmount(p, c, m) };
                              }}
                            >
                              <Grip size={9} />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="copy-budget">
          <Field label="Copy from">
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Target start">
            <select value={targetStart} onChange={(e) => setTargetStart(e.target.value)}>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Target end">
            <select value={targetEnd} onChange={(e) => setTargetEnd(e.target.value)}>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </Field>
          <button className="button secondary" onClick={() => void copy()}>
            <Copy size={16} />
            Copy month
          </button>
          <Field label="Increase / decrease %">
            <input
              type="number"
              aria-label="Budget percentage change"
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
            />
          </Field>
          <button className="button secondary" onClick={increase}>
            Apply %
          </button>
        </div>
        <p className="footnote">
          Percentage changes affect the selected category, or all categories if none is selected.
          Yellow cells are monthly overrides.
        </p>
      </Section>
      {edit && (
        <Modal
          title={cats.some((c) => c.id === edit.id) ? 'Edit category' : 'Add a category'}
          onClose={() => setEdit(null)}
          wide
        >
          <div className="form-grid">
            <Field label="Name">
              <input
                aria-label="Category name"
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </Field>
            <Field label="Group">
              <select
                value={edit.group}
                onChange={(e) => setEdit({ ...edit, group: e.target.value as Category['group'] })}
              >
                {['Income', 'Living', 'Debt'].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Base amount (₹)">
              <input
                type="number"
                min="0"
                step=".01"
                value={edit.amount}
                onChange={(e) => setEdit({ ...edit, amount: Number(e.target.value) })}
              />
            </Field>
            <Field label="Calculation rule">
              <select
                value={edit.role}
                onChange={(e) => setEdit({ ...edit, role: e.target.value as Category['role'] })}
              >
                <option value="regular">Base amount</option>
                <option value="salary">Salary rule</option>
                <option value="emi">Loan EMI schedule</option>
                <option value="closure">Loan closure</option>
              </select>
            </Field>
            <Field label="Timing">
              <select
                value={edit.timing}
                onChange={(e) => setEdit({ ...edit, timing: e.target.value as Category['timing'] })}
              >
                <option>Daily</option>
                <option>Fixed day</option>
              </select>
            </Field>
            <Field label="Day of month">
              <input
                type="number"
                min="1"
                max="31"
                value={edit.day}
                onChange={(e) => setEdit({ ...edit, day: Number(e.target.value) })}
              />
            </Field>
          </div>
          <Field label="Only these months (leave all unchecked for every month)">
            <div className="month-chips">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <label key={m} className={edit.months.includes(m) ? 'selected' : ''}>
                  <input
                    type="checkbox"
                    checked={edit.months.includes(m)}
                    onChange={(e) =>
                      setEdit({
                        ...edit,
                        months: e.target.checked
                          ? [...edit.months, m].sort((a, b) => a - b)
                          : edit.months.filter((x) => x !== m),
                      })
                    }
                  />
                  {new Date(2026, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' })}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Notes">
            <input value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
          </Field>
          <Toggle
            checked={edit.active}
            onChange={(active) => setEdit({ ...edit, active })}
            label="Active in the budget"
            hint="Turning this off keeps all actual transactions."
          />
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setEdit(null)}>
              Cancel
            </button>
            <button className="button" onClick={saveCategory}>
              Save category
            </button>
          </div>
        </Modal>
      )}
      {deleteCat && (
        <Modal title={`Delete ${deleteCat.name}?`} onClose={() => setDeleteCat(null)}>
          <p>
            Existing transactions will be kept. Monthly overrides for this category will be removed.
            You can undo this change.
          </p>
          {p.entries.some((e) => e.categoryId === deleteCat.id) && (
            <Field label="Move existing transactions to">
              <select value={reassign} onChange={(e) => setReassign(e.target.value)}>
                <option value="">Choose a category</option>
                {cats
                  .filter((c) => c.id !== deleteCat.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
          )}
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setDeleteCat(null)}>
              Cancel
            </button>
            <button className="button danger" onClick={removeCategory}>
              Delete category
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
