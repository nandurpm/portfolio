import { store, usePlan } from '../store';
import type { Settings } from '../domain/types';
import { addMonths, monthLabel } from '../domain/dates';
import { Field, NumberField, useEdited, useUi } from './UI';
export function SettingNumber({
  name,
  label,
  min = 0,
  hint,
  integer = false,
}: {
  name: keyof Settings;
  label: string;
  min?: number;
  hint?: string;
  integer?: boolean;
}) {
  const p = usePlan(),
    edited = useEdited(`settings.${name}`);
  return (
    <Field label={label} hint={hint} edited={edited}>
      <NumberField
        value={Number(p.settings[name])}
        min={min}
        label={label}
        step={integer ? '1' : '.01'}
        onCommit={(value) =>
          store.change(`Change ${label.toLowerCase()}`, (d) => {
            (d.settings as any)[name] = value;
            if (name === 'salary31') d.settings.salaryShort = value;
            if (name === 'salaryDay')
              d.categories
                .filter((c) => c.role === 'salary' || c.role === 'closure')
                .forEach((c) => {
                  c.day = value;
                  c.edited = true;
                });
          })
        }
      />
    </Field>
  );
}
export function SettingMonth({
  name,
  label,
  hint,
}: {
  name: keyof Settings;
  label: string;
  hint?: string;
}) {
  const p = usePlan(),
    edited = useEdited(`settings.${name}`),
    { toast } = useUi();
  return (
    <Field label={label} hint={hint} edited={edited}>
      <input
        type="month"
        aria-label={label}
        value={String(p.settings[name])}
        onChange={(e) => {
          if (e.target.value)
            try {
              store.change(`Change ${label.toLowerCase()}`, (d) => {
                (d.settings as any)[name] = e.target.value;
              });
            } catch (err) {
              toast(String(err), true);
            }
        }}
      />
    </Field>
  );
}
export function IncomeSettings() {
  const p = usePlan();
  return (
    <>
      <p className="callout">
        Budget salary in the month it reaches your account. For example,{' '}
        {monthLabel(p.settings.selectedMonth, true)} receives{' '}
        {monthLabel(addMonths(p.settings.selectedMonth, -1), true)} salary. This is the expected
        full salary with no leave deductions; enter the amount actually received in Daily Entries.
      </p>
      <div className="form-grid three">
        <SettingNumber
          name="opening"
          label="Opening savings (₹)"
          min={-1e12}
          hint="Available at the start of your plan"
        />
        <SettingNumber
          name="salary31"
          label="Expected full-month salary (₹)"
          hint="Same expected salary for 28-, 29-, 30- and 31-day months. Leave deductions belong in actual income."
        />
        <SettingNumber name="raisedSalary" label="Raised salary (₹)" />
        <SettingMonth
          name="raiseStart"
          label="Raise effective for salary month"
          hint="An April salary raise is received in May."
        />
        <SettingNumber
          name="salaryDay"
          label="Salary received by day"
          integer
          hint="Fixed-day planning assumption, from 1 to 31"
        />
      </div>
    </>
  );
}
