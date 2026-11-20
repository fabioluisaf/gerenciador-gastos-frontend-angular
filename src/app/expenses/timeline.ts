import { formatDate } from '@angular/common';
import { ScrubberMark } from '../shared/timeline-scrubber/timeline-scrubber';
import { ExpensePeriod } from './expense';

export interface TimelinePeriod {
  key: string;
  label: string;
  offset: number;
}

export const UNDATED_PERIOD_KEY = 'sem-data';

export function periodKeyOf(isoDate: string | null): string {
  return isoDate?.slice(0, 7) ?? UNDATED_PERIOD_KEY;
}

export function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function currentPeriodKey(today = new Date()): string {
  return periodKey(today.getFullYear(), today.getMonth() + 1);
}

export function todayIsoDate(today = new Date()): string {
  return `${periodKey(today.getFullYear(), today.getMonth() + 1)}-${String(today.getDate()).padStart(2, '0')}`;
}

export function parsePeriodKey(key: string): { year: number; month: number } {
  const [year, month] = key.split('-').map(Number);
  return { year, month };
}

export function monthRange(keys: readonly string[]): string[] {
  const dated = keys.filter((key) => key !== UNDATED_PERIOD_KEY).sort();
  if (dated.length === 0) {
    return [];
  }
  const range: string[] = [];
  let { year, month } = parsePeriodKey(dated[0]);
  const last = dated.at(-1)!;
  for (let key = periodKey(year, month); key <= last; key = periodKey(year, month)) {
    range.push(key);
    month = (month % 12) + 1;
    year += month === 1 ? 1 : 0;
  }
  return range;
}

export function formatPeriodLabel(key: string, locale: string): string {
  if (key === UNDATED_PERIOD_KEY) {
    return 'Sem data';
  }
  const { year, month } = parsePeriodKey(key);
  return formatDate(new Date(year, month - 1, 1), "MMM 'de' y", locale).replaceAll('.', '');
}

export function formatMonthTitle(isoDate: string, locale: string): string {
  const { year, month } = parsePeriodKey(periodKeyOf(isoDate));
  const title = formatDate(new Date(year, month - 1, 1), "MMMM 'de' y", locale);
  return title.charAt(0).toUpperCase() + title.slice(1);
}

export function buildTimeline(periods: readonly ExpensePeriod[], locale: string): TimelinePeriod[] {
  let offset = 0;
  return periods.map(({ year, month, count }) => {
    const key = year && month ? periodKey(year, month) : UNDATED_PERIOD_KEY;
    const period = { key, label: formatPeriodLabel(key, locale), offset };
    offset += count;
    return period;
  });
}

export function toScrubberMarks(
  timeline: readonly TimelinePeriod[],
  total: number,
): ScrubberMark[] {
  return timeline.map(({ key, label, offset }) => ({
    id: key,
    label,
    position: total > 0 ? offset / total : 0,
  }));
}
