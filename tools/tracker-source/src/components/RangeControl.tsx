import { useState } from 'react';
import { CalendarRange, ChevronDown, Check } from 'lucide-react';
import { store, usePlan } from '../store';
import {
  monthsBetween,
  presetRange,
  clampMonth,
  inRange,
  monthLabel,
  validMonth,
} from '../domain/dates';
import { Modal, Field, useUi } from './UI';
const presets = [
  'Full plan',
  'Current month',
  'Previous month',
  'Next month',
  'Last 3 months',
  'Last 6 months',
  'Next 3 months',
  'Next 6 months',
  'Next 12 months',
  'This year',
  'This financial year (Apr–Mar)',
  'Original imported range',
  'Custom',
];
export function RangeControl({
  kind = 'plan',
  compact = false,
}: {
  kind?: 'plan' | 'view';
  compact?: boolean;
}) {
  const p = usePlan(),
    s = p.settings,
    [open, setOpen] = useState(false),
    [start, setStart] = useState(''),
    [end, setEnd] = useState('');
  const { confirm, toast } = useUi();
  const launch = () => {
    setStart(kind === 'plan' ? s.planStart : s.viewStart);
    setEnd(kind === 'plan' ? s.planEnd : s.viewEnd);
    setOpen(true);
  };
  async function apply() {
    if (!validMonth(start) || !validMonth(end) || start > end) {
      toast('Choose valid start and end months.', true);
      return;
    }
    if (kind === 'view' && (start < s.planStart || end > s.planEnd)) {
      toast('View range must be inside your plan.', true);
      return;
    }
    if (monthsBetween(start, end).length > 600) {
      toast('Choose a range of at most 600 months.', true);
      return;
    }
    if (kind === 'plan' && (start > s.planStart || end < s.planEnd)) {
      const count = p.entries.filter((e) => !inRange(e.date, start, end)).length;
      if (
        !(await confirm(
          'Change your plan range?',
          `${count} entries will be kept in the archive, not deleted. Opening savings will apply to the new start month; update it if needed.`,
          false,
          'Keep data and apply',
        ))
      )
        return;
    }
    try {
      store.change(`${kind === 'plan' ? 'Plan' : 'View'} range: ${start} → ${end}`, (d) => {
        if (kind === 'plan') {
          d.settings.planStart = start;
          d.settings.planEnd = end;
          d.settings.selectedMonth = clampMonth(d.settings.selectedMonth, start, end);
          d.settings.viewStart = start;
          d.settings.viewEnd = end;
        } else {
          d.settings.viewStart = start;
          d.settings.viewEnd = end;
        }
      });
      setOpen(false);
      toast('Range updated. All calculations have been refreshed.');
    } catch (e) {
      toast(String(e), true);
    }
  }
  return (
    <>
      <button className={compact ? 'range-mini' : 'range-control'} onClick={launch}>
        <CalendarRange size={18} />
        <span>
          <small>{kind === 'plan' ? 'PLAN RANGE' : 'VIEW RANGE'}</small>
          <strong>
            {monthLabel(kind === 'plan' ? s.planStart : s.viewStart)} <span>→</span>{' '}
            {monthLabel(kind === 'plan' ? s.planEnd : s.viewEnd)}
          </strong>
        </span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <Modal
          title={kind === 'plan' ? 'Choose your plan range' : 'Choose a view range'}
          onClose={() => setOpen(false)}
        >
          <p className="muted">
            {kind === 'plan'
              ? 'Extend the timeline with your current rules. Existing data is always kept.'
              : 'Filter charts and tables without changing your plan or entries.'}
          </p>
          <Field label="Quick preset">
            <select
              defaultValue="Custom"
              onChange={(e) => {
                if (e.target.value === 'Custom') return;
                const [a, b] =
                  e.target.value === 'Original imported range'
                    ? [p.source.originalStart, p.source.originalEnd]
                    : presetRange(e.target.value, s.planStart, s.planEnd);
                setStart(kind === 'view' ? clampMonth(a, s.planStart, s.planEnd) : a);
                setEnd(kind === 'view' ? clampMonth(b, s.planStart, s.planEnd) : b);
              }}
            >
              {presets.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Start month">
              <input type="month" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="End month">
              <input type="month" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
          <div className="callout">{monthsBetween(start, end).length} months selected</div>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="button" onClick={() => void apply()}>
              <Check size={17} />
              Apply range
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
