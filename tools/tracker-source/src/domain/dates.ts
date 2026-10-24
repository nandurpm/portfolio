export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const validMonth = (s: string) =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(s) && +s.slice(0, 4) >= 1900 && +s.slice(0, 4) <= 2199;
export function validDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !isNaN(+d) && d.toISOString().slice(0, 10) === s;
}
export const addMonths = (m: string, n: number) => {
  const d = new Date(`${m}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};
export const daysIn = (m: string) =>
  new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
export const monthEnd = (m: string) => `${m}-${daysIn(m)}`;
export const monthDay = (m: string, day: number) =>
  `${m}-${String(Math.min(Math.max(1, day), daysIn(m))).padStart(2, '0')}`;
export function monthsBetween(start: string, end: string) {
  if (!validMonth(start) || !validMonth(end) || start > end) return [];
  const n =
    (+end.slice(0, 4) - +start.slice(0, 4)) * 12 + (+end.slice(5, 7) - +start.slice(5, 7)) + 1;
  return Array.from({ length: n }, (_, i) => addMonths(start, i));
}
export const inRange = (date: string, start: string, end: string) =>
  validDate(date) && date >= `${start}-01` && date <= monthEnd(end);
export const clampMonth = (m: string, start: string, end: string) =>
  m < start ? start : m > end ? end : m;
export const monthLabel = (m: string, long = false) =>
  new Date(`${m}-01T12:00:00Z`).toLocaleDateString('en-IN', {
    month: long ? 'long' : 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
export const displayDate = (s: string, format = 'dd-MMM-yyyy') =>
  !s
    ? '—'
    : format === 'yyyy-MM-dd'
      ? s
      : format === 'dd/MM/yyyy'
        ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`
        : `${s.slice(8, 10)}-${new Date(`${s}T12:00:00Z`).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })}-${s.slice(0, 4)}`;
export function presetRange(
  preset: string,
  baseStart: string,
  baseEnd: string,
  date = today(),
): [string, string] {
  const m = date.slice(0, 7),
    year = +m.slice(0, 4),
    fy = +m.slice(5, 7) < 4 ? year - 1 : year;
  switch (preset) {
    case 'Current month':
      return [m, m];
    case 'Previous month':
      return [addMonths(m, -1), addMonths(m, -1)];
    case 'Next month':
      return [addMonths(m, 1), addMonths(m, 1)];
    case 'Last 3 months':
      return [addMonths(m, -2), m];
    case 'Next 3 months':
      return [m, addMonths(m, 2)];
    case 'Next 6 months':
      return [m, addMonths(m, 5)];
    case 'This year':
      return [`${year}-01`, `${year}-12`];
    case 'This financial year (Apr–Mar)':
      return [`${fy}-04`, `${fy + 1}-03`];
    case 'Last 6 months':
      return [addMonths(m, -5), m];
    case 'Next 12 months':
      return [m, addMonths(m, 11)];
    default:
      return [baseStart, baseEnd];
  }
}
