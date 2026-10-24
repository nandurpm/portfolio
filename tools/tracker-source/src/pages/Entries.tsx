import { ArchivedPayments } from '../components/ArchivedPayments';
import { WEB_APP } from '../web-mode';
import { possibleDuplicates, duplicateGroups } from '../domain/insights';
import { usePhone } from '../components/usePhone';
import { money, categoryPlan, actualCategory, round } from '../domain/calculate';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Plus,
  Search,
  Trash2,
  Copy,
  CheckSquare,
  Archive,
  ArrowDownWideNarrow,
  GripVertical,
  Filter,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { store, usePlan } from '../store';
import { type Entry } from '../domain/types';
import {
  today,
  inRange,
  monthsBetween,
  monthLabel,
  displayDate,
  monthEnd,
  validMonth,
} from '../domain/dates';
import { reportDate } from '../domain/calculate';
import { validateEntry } from '../domain/validation';
import {
  PageHead,
  Section,
  Field,
  Modal,
  Badge,
  NumberField,
  TextField,
  Edited,
  Empty,
  useUi,
} from '../components/UI';
const payments = ['Cash', 'UPI', 'Card', 'Bank', 'Other'];
type EntryFillField = 'categoryId' | 'date' | 'payment';
export default function Entries({
  initialKind = 'Expense',
}: {
  initialKind?: 'Income' | 'Expense';
}) {
  const p = usePlan(),
    s = p.settings,
    { toast, confirm } = useUi();
  const phone = usePhone();
  const [pageIndex, setPageIndex] = useState(0);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [kind, setKind] = useState<'Income' | 'Expense'>(initialKind),
    [adding, setAdding] = useState(false),
    [search, setSearch] = useState(''),
    [category, setCategory] = useState(''),
    [month, setMonth] = useState(''),
    [archive, setArchive] = useState(false),
    [sort, setSort] = useState('date-desc'),
    [selection, setSelection] = useState<Set<string>>(new Set()),
    [bulk, setBulk] = useState(false),
    [bulkValues, setBulkValues] = useState({
      categoryId: '',
      date: '',
      payment: '',
    });
  const defaultDate = inRange(today(), s.planStart, s.planEnd) ? today() : `${s.selectedMonth}-01`;
  const [draft, setDraft] = useState({
    date: defaultDate,
    categoryId:
      p.categories.find((c) => c.id === 'food' && c.active)?.id ??
      p.categories.find((c) => c.group === 'Living' && c.active)?.id ??
      p.categories[0]?.id ??
      '',
    description: '',
    amount: '',
    payment: 'UPI',
    notes: '',
  });
  const duplicates = useMemo(() => duplicateGroups(p.entries), [p.entries]);
  const quickCategories = p.categories.filter(
    (c) => c.active && (kind === 'Income' ? c.group === 'Income' : c.group !== 'Income'),
  );
  const activeCategoryId = quickCategories.some((c) => c.id === draft.categoryId)
    ? draft.categoryId
    : (quickCategories.find((c) => c.role === 'salary' || c.id === 'food')?.id ??
      quickCategories[0]?.id ??
      '');
  const [billDueMonth, setBillDueMonth] = useState('');
  const selectedCategory = p.categories.find((c) => c.id === activeCategoryId);
  const activeProvision = p.provisions?.find((x) => x.enabled && x.categoryId === activeCategoryId);
  const entryMonth = validMonth(draft.date.slice(0, 7)) ? draft.date.slice(0, 7) : s.selectedMonth;
  const draftBudget = selectedCategory ? categoryPlan(p, selectedCategory, entryMonth) : 0;
  const draftSpent = selectedCategory
    ? actualCategory(p, selectedCategory, entryMonth, monthEnd(entryMonth))
    : 0;
  const draftProjected = round(draftSpent + (Number(draft.amount) || 0));
  const parent = useRef<HTMLDivElement>(null),
    searchRef = useRef<HTMLInputElement>(null),
    amountRef = useRef<HTMLInputElement>(null),
    drag = useRef<{ id: string; field: EntryFillField; value: string } | null>(null);
  const catMap = useMemo(() => new Map(p.categories.map((c) => [c.id, c])), [p.categories]);
  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return p.entries
      .filter((e) =>
        archive
          ? !inRange(e.date, s.planStart, s.planEnd)
          : inRange(e.date, s.planStart, s.planEnd),
      )
      .filter(
        (e) =>
          (!category || category === e.categoryId) &&
          (!month || e.date.startsWith(month)) &&
          (!q ||
            `${e.date} ${catMap.get(e.categoryId)?.name} ${e.description} ${e.amount} ${e.payment} ${e.notes}`
              .toLowerCase()
              .includes(q)),
      )
      .sort((a, b) =>
        sort === 'amount-desc'
          ? b.amount - a.amount
          : sort === 'amount-asc'
            ? a.amount - b.amount
            : sort === 'category'
              ? (catMap.get(a.categoryId)?.name ?? '').localeCompare(
                  catMap.get(b.categoryId)?.name ?? '',
                )
              : sort === 'date-asc'
                ? a.date.localeCompare(b.date)
                : b.date.localeCompare(a.date),
      );
  }, [p.entries, s.planStart, s.planEnd, archive, category, month, search, sort, catMap]);
  const virtual = useVirtualizer({
    count: rows.length,
    enabled: !phone,
    getScrollElement: () => parent.current,
    estimateSize: () => 64,
    overscan: 8,
  });
  const pageCount = Math.max(1, Math.ceil(rows.length / 25));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const phoneRows = rows.slice(currentPage * 25, (currentPage + 1) * 25);
  useEffect(() => setPageIndex(0), [search, category, month, archive, sort]);
  function update(id: string, patch: Partial<Entry>) {
    const old = p.entries.find((e) => e.id === id);
    if (!old) return;
    const next = { ...old, ...patch, edited: true };
    validateEntry(next, p, archive && (!patch.date || patch.date === old.date));
    store.change('Edit transaction', (d) => {
      d.entries[d.entries.findIndex((e) => e.id === id)] = next;
    });
  }
  function safe(fn: () => void) {
    try {
      fn();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), true);
    }
  }
  async function remove(ids: string[]) {
    if (!ids.length) return;
    if (
      !(await confirm(
        `Delete ${ids.length} transaction${ids.length > 1 ? 's' : ''}?`,
        'You can undo this change. Linked loan payments will also be marked unpaid.',
        true,
        'Delete',
      ))
    )
      return;
    store.change('Delete transactions', (d) => {
      const loans = d.entries
        .filter((e) => ids.includes(e.id) && e.loanRowId)
        .map((e) => e.loanRowId);
      d.entries = d.entries.filter((e) => !ids.includes(e.id));
      [...d.loan.rows, ...(d.additionalLoans ?? []).flatMap((l) => l.rows)].forEach((r) => {
        if (loans.includes(r.id)) {
          r.paid = false;
          r.paidAmount = 0;
          r.paidDate = '';
        }
      });
    });
    setSelection(new Set());
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (adding) return;
    setAdding(true);
    try {
      const n: Entry = {
        id: crypto.randomUUID(),
        ...draft,
        ...(activeProvision && billDueMonth
          ? { provisionId: activeProvision.id, billDueMonth }
          : {}),
        categoryId: activeCategoryId,
        amount: Number(draft.amount),
        edited: true,
      };
      validateEntry(n, p);
      const matches = possibleDuplicates(store.get().data.entries, n);
      if (
        matches.length &&
        !(await confirm(
          'Possible duplicate transaction',
          `${matches.length} existing entry/entries have the same date, category and amount (${money(n.amount)}). Review the existing records before adding another.`,
          false,
          'Add anyway',
        ))
      )
        return;
      store.change(kind === 'Income' ? 'Add income' : 'Add expense', (d) => {
        d.entries.push(n);
      });
      setDraft((x) => ({ ...x, description: '', amount: '', notes: '' }));
      setBillDueMonth('');
      amountRef.current?.focus();
      try {
        await store.flush();
        toast(
          WEB_APP
            ? `${kind} recorded. Check cloud status for synchronization.`
            : `${kind} added and saved locally.`,
        );
      } catch (error) {
        toast(
          `Entry recorded in the app, but saving failed. Use Retry save above. ${String(error)}`,
          true,
        );
      }
    } catch (error) {
      toast(String(error), true);
    } finally {
      setAdding(false);
    }
  }
  async function duplicate(row: Entry) {
    if (
      !(await confirm(
        'Create a matching transaction?',
        'This will create another entry with the same date, category and amount. Continue only if it represents a separate payment.',
        false,
        'Create copy',
      ))
    )
      return;
    safe(() => {
      const entry = {
        ...row,
        id: crypto.randomUUID(),
        loanRowId: undefined,
        provisionId: undefined,
        billDueMonth: undefined,
        edited: true,
      };
      validateEntry(entry, p);
      store.change('Duplicate transaction', (d) => {
        d.entries.push(entry);
      });
      toast('Transaction duplicated.');
    });
  }
  function bulkApply() {
    safe(() => {
      for (const row of p.entries.filter((e) => selection.has(e.id)))
        validateEntry(
          {
            ...row,
            ...Object.fromEntries(Object.entries(bulkValues).filter(([, v]) => v)),
          },
          p,
          archive && !bulkValues.date,
        );
      store.change('Bulk edit transactions', (d) => {
        for (const e of d.entries)
          if (selection.has(e.id)) {
            Object.assign(e, Object.fromEntries(Object.entries(bulkValues).filter(([, v]) => v)));
            e.edited = true;
          }
      });
      setBulk(false);
      toast('Selected transactions updated.');
    });
  }
  function fill(target: string) {
    const source = drag.current;
    if (!source) return;
    const a = rows.findIndex((e) => e.id === source.id),
      b = rows.findIndex((e) => e.id === target),
      ids = rows.slice(Math.min(a, b), Math.max(a, b) + 1).map((e) => e.id);
    safe(() => {
      for (const row of p.entries.filter((e) => ids.includes(e.id)))
        validateEntry(
          { ...row, [source.field]: source.value },
          p,
          archive && source.field !== 'date',
        );
      store.change(`Drag-fill ${source.field}`, (d) => {
        for (const row of d.entries)
          if (ids.includes(row.id)) {
            row[source.field] = source.value;
            row.edited = true;
          }
      });
      toast(`Filled ${ids.length} rows.`);
    });
    drag.current = null;
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        amountRef.current?.focus();
      }
      if (
        e.key === 'Delete' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        void remove([...selection]);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  return (
    <>
      <PageHead
        eyebrow="DAILY ENTRIES"
        title="Small entries. Clearer money."
        description="Add one transaction per row. Your totals update automatically."
        action={
          <button
            className={`button ${archive ? '' : 'secondary'}`}
            onClick={() => {
              setArchive(!archive);
              setMonth('');
              setSelection(new Set());
            }}
          >
            <Archive size={17} />
            {archive
              ? 'Back to active entries'
              : `Archive (${p.entries.filter((e) => !inRange(e.date, s.planStart, s.planEnd)).length})`}
          </button>
        }
      />
      <div className="entry-kind" role="group" aria-label="Transaction type">
        <button
          type="button"
          className={`button ${kind === 'Income' ? 'income-action' : 'secondary'}`}
          aria-pressed={kind === 'Income'}
          onClick={() => setKind('Income')}
        >
          Add Income
        </button>
        <button
          type="button"
          className={`button ${kind === 'Expense' ? 'expense-action' : 'secondary'}`}
          aria-pressed={kind === 'Expense'}
          onClick={() => setKind('Expense')}
        >
          Add Expense
        </button>
      </div>
      <Section
        title={kind === 'Income' ? 'Record actual income' : 'Record actual expense'}
        caption={
          kind === 'Income'
            ? 'Choose Salary when your pay reaches your account. October salary received in November is entered on its actual November payment date. Enter the amount received after any leave deductions.'
            : 'Record what you paid. Rent, food, bills and loan payments all go here.'
        }
      >
        {kind === 'Expense' && selectedCategory && (
          <div className={`callout ${draftProjected > draftBudget ? 'error' : ''}`} role="status">
            <strong>
              {selectedCategory.name} · {monthLabel(entryMonth)}
            </strong>
            <p>
              {money(draftSpent)} already recorded / {money(draftBudget)} monthly budget ·{' '}
              {money(Math.max(0, round(draftBudget - draftSpent)))} remaining.
            </p>
            {Number(draft.amount) > 0 && (
              <p>
                After this entry: {money(draftProjected)} recorded.{' '}
                {draftProjected > draftBudget
                  ? `${money(round(draftProjected - draftBudget))} over budget.`
                  : draftBudget > 0 && draftProjected >= draftBudget * 0.8
                    ? '80% or more of this budget will be used.'
                    : `${money(round(draftBudget - draftProjected))} will remain.`}
              </p>
            )}
          </div>
        )}
        {!quickCategories.length && (
          <p className="callout">
            No active {kind.toLowerCase()} categories. Add or enable one in Budget &amp; Plan.
          </p>
        )}
        {draft.date > today() && (
          <p className="callout">
            Future-dated record: this will count when Report through reaches{' '}
            {displayDate(draft.date)}. Enter the date you actually received or paid the money.
          </p>
        )}
        <form className="quick-add" onSubmit={(e) => void add(e)}>
          <Field label="Date">
            <input
              type="date"
              aria-label="New transaction date"
              value={draft.date}
              min={`${s.planStart}-01`}
              max={monthEnd(s.planEnd)}
              required
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </Field>
          <Field label="Category">
            <select
              aria-label="New transaction category"
              value={activeCategoryId}
              onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}
            >
              {quickCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <input
              aria-label="New transaction description"
              value={draft.description}
              placeholder="What was it for?"
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </Field>
          <Field label="Amount (₹)">
            <input
              ref={amountRef}
              aria-label="New transaction amount"
              type="number"
              step=".01"
              min=".01"
              value={draft.amount}
              placeholder="0.00"
              required
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            />
          </Field>
          {activeProvision && (
            <Field
              label="Bill due month (optional)"
              hint="For an early bill payment, select its liability month to avoid a second forecast charge."
            >
              <input
                aria-label="New bill due month"
                type="month"
                value={billDueMonth}
                onChange={(e) => setBillDueMonth(e.target.value)}
              />
            </Field>
          )}
          <Field label="Payment">
            <select
              value={draft.payment}
              aria-label="New transaction payment"
              onChange={(e) => setDraft({ ...draft, payment: e.target.value })}
            >
              {payments.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <button
            className="button add-button"
            type="submit"
            disabled={adding || !activeCategoryId}
          >
            <Plus size={19} />
            Add
          </button>
          <Field label="Notes (optional)">
            <input
              aria-label="New transaction notes"
              value={draft.notes}
              placeholder="Anything to remember"
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </Field>
        </form>
      </Section>
      {archive && <ArchivedPayments />}
      {duplicates.length > 0 && (
        <div className="callout error" role="status">
          <strong>Possible duplicate entries</strong>
          <p>
            {duplicates.length} group(s) have matching dates, categories and amounts. Review them
            before recording more. Repeated payments can be legitimate; nothing is removed
            automatically.
          </p>
          <details>
            <summary>Review matching entries</summary>
            <ul>
              {duplicates.slice(0, 10).map((group) => {
                const e = group[0]!;
                return (
                  <li key={e.id}>
                    {displayDate(e.date)} · {catMap.get(e.categoryId)?.name} · {money(e.amount)} ·{' '}
                    {group.length} entries
                  </li>
                );
              })}
            </ul>
            {duplicates.length > 10 && (
              <small>More matching groups are available in your transaction list.</small>
            )}
          </details>
        </div>
      )}
      <Section
        title={archive ? 'Archived transactions' : 'Your transactions'}
        caption={`${rows.length.toLocaleString('en-IN')} shown · ${phone ? 'Tap Edit to change a transaction. Select rows and use Bulk edit to copy dates, categories or payments.' : 'Changes save when you leave a field · Drag a fill handle down to copy a value'}`}
        action={
          <Badge tone="income">{WEB_APP ? 'Private account sync' : 'Offline & private'}</Badge>
        }
      >
        <div className="filter-bar">
          <div className="search-box">
            <Search size={17} />
            <input
              ref={searchRef}
              aria-label="Search transactions"
              placeholder={phone ? 'Search transactions…' : 'Search transactions… Ctrl+F'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Filter size={17} />
          <select
            aria-label="Filter category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {p.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            <option value="">All months</option>
            {(archive
              ? [
                  ...new Set(
                    p.entries
                      .filter((e) => !inRange(e.date, s.planStart, s.planEnd))
                      .map((e) => e.date.slice(0, 7)),
                  ),
                ].sort()
              : monthsBetween(s.planStart, s.planEnd)
            ).map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
          <ArrowDownWideNarrow size={17} />
          <select
            aria-label="Sort transactions"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Largest amount</option>
            <option value="amount-asc">Smallest amount</option>
            <option value="category">Category A–Z</option>
          </select>
        </div>
        {selection.size > 0 && (
          <div className="selection-bar">
            <strong>{selection.size} selected</strong>
            <button
              className="button small secondary"
              onClick={() => {
                setBulkValues({ categoryId: '', date: '', payment: '' });
                setBulk(true);
              }}
            >
              <CheckSquare size={15} />
              Bulk edit
            </button>
            <button
              className="button small danger-quiet"
              onClick={() => void remove([...selection])}
            >
              <Trash2 size={15} />
              Delete
            </button>
            <button className="text-button" onClick={() => setSelection(new Set())}>
              Clear
            </button>
          </div>
        )}
        {!rows.length ? (
          <Empty
            title={
              search
                ? 'No matching transactions'
                : archive
                  ? 'Nothing in the archive'
                  : 'Your first entry is a fresh start'
            }
            detail={
              search
                ? 'Try another search or filter.'
                : 'Use Quick add above to record your salary, a purchase or a payment.'
            }
          />
        ) : phone ? (
          <div className="phone-transactions">
            <label className="phone-select-all">
              <input
                type="checkbox"
                aria-label="Select all filtered transactions"
                checked={rows.every((e) => selection.has(e.id))}
                onChange={(e) =>
                  setSelection(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())
                }
              />
              Select all {rows.length} filtered transactions
            </label>
            {phoneRows.map((row) => {
              const c = catMap.get(row.categoryId),
                future = row.date > reportDate(p);
              return (
                <article
                  className={`transaction-card ${selection.has(row.id) ? 'selected' : ''}`}
                  key={row.id}
                >
                  <div className="transaction-card-head">
                    <label>
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.description || displayDate(row.date)}`}
                        checked={selection.has(row.id)}
                        onChange={(e) =>
                          setSelection((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(row.id);
                            else next.delete(row.id);
                            return next;
                          })
                        }
                      />
                      <span>{c?.name}</span>
                    </label>
                    <strong className={c?.group === 'Income' ? 'favourable' : ''}>
                      {money(row.amount, 2)}
                    </strong>
                  </div>
                  <p>{row.description || 'No description'}</p>
                  <div className="transaction-meta">
                    <span>
                      {displayDate(row.date, s.dateFormat)} · {row.payment}
                    </span>
                    <Badge tone={archive ? 'neutral' : future ? 'future' : 'income'}>
                      {archive ? 'Archived' : future ? 'Future' : 'Counted'}
                    </Badge>
                    <Badge tone={c?.group.toLowerCase()}>{c?.group}</Badge>
                  </div>
                  {row.notes && <p className="transaction-notes">{row.notes}</p>}
                  <div className="phone-card-actions">
                    <button
                      className="button secondary"
                      aria-label={`Edit transaction ${row.description || displayDate(row.date)}`}
                      onClick={() => setEditEntry({ ...row })}
                    >
                      <Pencil size={17} />
                      Edit
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Duplicate transaction"
                      disabled={archive}
                      onClick={() => duplicate(row)}
                    >
                      <Copy size={19} />
                    </button>
                    <button
                      className="icon-button red"
                      aria-label="Delete transaction"
                      onClick={() => void remove([row.id])}
                    >
                      <Trash2 size={19} />
                    </button>
                  </div>
                </article>
              );
            })}
            <div className="phone-pagination">
              <button
                className="button secondary"
                aria-label="Previous transactions"
                disabled={currentPage === 0}
                onClick={() => setPageIndex(currentPage - 1)}
              >
                <ChevronLeft size={20} />
              </button>
              <span>
                Page {currentPage + 1} of {pageCount}
              </span>
              <button
                className="button secondary"
                aria-label="Next transactions"
                disabled={currentPage + 1 >= pageCount}
                onClick={() => setPageIndex(currentPage + 1)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        ) : (
          <div className="entry-grid-wrap">
            <div className="entry-grid header">
              <input
                aria-label="Select all displayed transactions"
                type="checkbox"
                checked={rows.length > 0 && rows.every((e) => selection.has(e.id))}
                onChange={(e) =>
                  setSelection(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())
                }
              />
              {[
                'Date',
                'Category',
                'Description',
                'Amount (₹)',
                'Payment',
                'Notes',
                'Status',
                '',
              ].map((h, i) => (
                <strong key={i}>{h}</strong>
              ))}
            </div>
            <div className="virtual-entries" ref={parent}>
              <div style={{ height: virtual.getTotalSize(), position: 'relative' }}>
                {virtual.getVirtualItems().map((item) => {
                  const row = rows[item.index];
                  if (!row) return null;
                  const c = catMap.get(row.categoryId),
                    future = row.date > reportDate(p);
                  return (
                    <div
                      key={row.id}
                      className={`entry-grid entry-row ${selection.has(row.id) ? 'selected' : ''}`}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${item.start}px)`,
                        height: item.size,
                      }}
                    >
                      <input
                        aria-label={`Select ${row.description || displayDate(row.date)}`}
                        type="checkbox"
                        checked={selection.has(row.id)}
                        onChange={(e) =>
                          setSelection((prev) => {
                            const n = new Set(prev);
                            if (e.target.checked) n.add(row.id);
                            else n.delete(row.id);
                            return n;
                          })
                        }
                      />
                      <div
                        className="fill-cell"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => fill(row.id)}
                      >
                        <input
                          type="date"
                          aria-label="Entry date"
                          value={row.date}
                          onChange={(e) => safe(() => update(row.id, { date: e.target.value }))}
                        />
                        <small>{displayDate(row.date, s.dateFormat)}</small>
                        <button
                          draggable
                          onDragStart={() => {
                            drag.current = {
                              id: row.id,
                              field: 'date',
                              value: row.date,
                            };
                          }}
                          className="fill-handle"
                          title="Drag to fill dates"
                          aria-label="Drag to fill dates"
                        >
                          <GripVertical size={10} />
                        </button>
                      </div>
                      <div
                        className="fill-cell"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => fill(row.id)}
                      >
                        <select
                          aria-label="Entry category"
                          value={row.categoryId}
                          onChange={(e) =>
                            safe(() => update(row.id, { categoryId: e.target.value }))
                          }
                        >
                          {p.categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <small className={c?.group.toLowerCase()}>
                          {c?.group}
                          {row.edited && <Edited />}
                        </small>
                        <button
                          draggable
                          onDragStart={() => {
                            drag.current = {
                              id: row.id,
                              field: 'categoryId',
                              value: row.categoryId,
                            };
                          }}
                          className="fill-handle"
                          title="Drag to fill category"
                          aria-label="Drag to fill category"
                        >
                          <GripVertical size={10} />
                        </button>
                      </div>
                      <TextField
                        label="Entry description"
                        value={row.description}
                        onCommit={(description) => update(row.id, { description })}
                      />
                      <NumberField
                        label="Entry amount"
                        min={0.01}
                        value={row.amount}
                        onCommit={(amount) => update(row.id, { amount })}
                      />
                      <div
                        className="fill-cell"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => fill(row.id)}
                      >
                        <select
                          aria-label="Entry payment"
                          value={row.payment}
                          onChange={(e) => safe(() => update(row.id, { payment: e.target.value }))}
                        >
                          {[...new Set([...payments, row.payment])].map((x) => (
                            <option key={x}>{x}</option>
                          ))}
                        </select>
                        <button
                          draggable
                          onDragStart={() => {
                            drag.current = {
                              id: row.id,
                              field: 'payment',
                              value: row.payment,
                            };
                          }}
                          className="fill-handle"
                          title="Drag to fill payment"
                          aria-label="Drag to fill payment"
                        >
                          <GripVertical size={10} />
                        </button>
                      </div>
                      <TextField
                        label="Entry notes"
                        value={row.notes}
                        onCommit={(notes) => update(row.id, { notes })}
                      />
                      <div>
                        <Badge tone={archive ? 'neutral' : future ? 'future' : 'income'}>
                          {archive ? 'Archived' : future ? 'Future' : 'Counted'}
                        </Badge>
                        {future && !archive && <small className="subtle">Until report date</small>}
                      </div>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label="Duplicate transaction"
                          title="Duplicate"
                          disabled={archive}
                          onClick={() => duplicate(row)}
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          className="icon-button red"
                          aria-label="Delete transaction"
                          title="Delete"
                          onClick={() => void remove([row.id])}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Section>
      {editEntry && (
        <Modal title="Edit transaction" onClose={() => setEditEntry(null)}>
          <div className="form-grid">
            <Field label="Date">
              <input
                aria-label="Edit transaction date"
                type="date"
                value={editEntry.date}
                min={archive ? undefined : `${s.planStart}-01`}
                max={archive ? undefined : monthEnd(s.planEnd)}
                onChange={(e) => setEditEntry({ ...editEntry, date: e.target.value })}
              />
            </Field>
            <Field label="Category">
              <select
                aria-label="Edit transaction category"
                value={editEntry.categoryId}
                onChange={(e) =>
                  setEditEntry({
                    ...editEntry,
                    categoryId: e.target.value,
                    provisionId: undefined,
                    billDueMonth: undefined,
                  })
                }
              >
                {p.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            {p.provisions?.some((x) => x.categoryId === editEntry.categoryId && x.enabled) && (
              <Field label="Bill liability due month (optional)">
                <input
                  aria-label="Edit bill liability due month"
                  type="month"
                  value={editEntry.billDueMonth ?? ''}
                  onChange={(e) =>
                    setEditEntry({
                      ...editEntry,
                      billDueMonth: e.target.value || undefined,
                      provisionId: e.target.value
                        ? p.provisions?.find(
                            (x) => x.categoryId === editEntry.categoryId && x.enabled,
                          )?.id
                        : undefined,
                    })
                  }
                />
              </Field>
            )}
            <Field label="Description">
              <input
                aria-label="Edit transaction description"
                value={editEntry.description}
                onChange={(e) => setEditEntry({ ...editEntry, description: e.target.value })}
              />
            </Field>
            <Field label="Amount (₹)">
              <input
                aria-label="Edit transaction amount"
                type="number"
                min="0.01"
                step="0.01"
                value={editEntry.amount}
                onChange={(e) => setEditEntry({ ...editEntry, amount: Number(e.target.value) })}
              />
            </Field>
            <Field label="Payment">
              <select
                aria-label="Edit transaction payment"
                value={editEntry.payment}
                onChange={(e) => setEditEntry({ ...editEntry, payment: e.target.value })}
              >
                {[...new Set([...payments, editEntry.payment])].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Notes">
              <input
                aria-label="Edit transaction notes"
                value={editEntry.notes}
                onChange={(e) => setEditEntry({ ...editEntry, notes: e.target.value })}
              />
            </Field>
          </div>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setEditEntry(null)}>
              Cancel
            </button>
            <button
              className="button"
              onClick={() =>
                safe(() => {
                  update(editEntry.id, editEntry);
                  setEditEntry(null);
                  toast('Transaction updated.');
                })
              }
            >
              Save transaction
            </button>
          </div>
        </Modal>
      )}
      {bulk && (
        <Modal title={`Edit ${selection.size} transactions`} onClose={() => setBulk(false)}>
          <p className="muted">
            Only fields you select are changed. Leave a field blank to keep it.
          </p>
          <Field label="Category">
            <select
              value={bulkValues.categoryId}
              onChange={(e) => setBulkValues({ ...bulkValues, categoryId: e.target.value })}
            >
              <option value="">Keep existing category</option>
              {p.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={bulkValues.date}
              onChange={(e) => setBulkValues({ ...bulkValues, date: e.target.value })}
            />
          </Field>
          <Field label="Payment">
            <select
              value={bulkValues.payment}
              onChange={(e) => setBulkValues({ ...bulkValues, payment: e.target.value })}
            >
              <option value="">Keep existing payment</option>
              {payments.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setBulk(false)}>
              Cancel
            </button>
            <button className="button" onClick={bulkApply}>
              Apply changes
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
