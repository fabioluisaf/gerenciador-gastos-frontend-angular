import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  linkedSignal,
  LOCALE_ID,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  LucideCalendar,
  LucideCalendarRange,
  LucideChevronLeft,
  LucideChevronRight,
} from '@lucide/angular';
import { SlidingIndicator } from '../sliding-indicator';

export type DateFieldMode = 'date' | 'month';

interface CalendarDay {
  iso: string;
  day: number;
  outside: boolean;
  label: string;
}

interface CalendarMonth {
  value: string;
  short: string;
  label: string;
}

interface ViewPosition {
  year: number;
  month: number;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const CALENDAR_CELLS = 42;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function positionOf(value: string): ViewPosition | null {
  const match = /^(\d{4})-(\d{2})/.exec(value);
  return match ? { year: Number(match[1]), month: Number(match[2]) - 1 } : null;
}

let nextId = 0;

@Component({
  selector: 'app-date-field',
  imports: [
    LucideCalendar,
    LucideCalendarRange,
    LucideChevronLeft,
    LucideChevronRight,
    SlidingIndicator,
  ],
  templateUrl: './date-field.html',
  styleUrl: './date-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateField {
  private readonly locale = inject(LOCALE_ID);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  readonly label = input.required<string>();
  readonly value = input('');
  readonly mode = input<DateFieldMode>('date');
  readonly emptyLabel = input('Selecione');
  readonly clearLabel = input<string | null>(null);
  readonly invalid = input(false);
  readonly describedBy = input<string | null>(null);
  readonly startOpen = input(false);
  readonly valueChange = output<string>();

  protected readonly id = `data-${nextId++}`;
  protected readonly weekdays = WEEKDAYS;
  protected readonly open = linkedSignal(() => this.startOpen());
  protected readonly today = isoDate(new Date());

  protected readonly view = linkedSignal<string, ViewPosition>({
    source: () => this.value(),
    computation: (value, previous) => {
      const today = new Date();
      return (
        positionOf(value) ??
        previous?.value ?? { year: today.getFullYear(), month: today.getMonth() }
      );
    },
  });

  protected readonly display = computed(() => {
    const position = positionOf(this.value());
    if (!position) {
      return this.emptyLabel();
    }
    if (this.mode() === 'month') {
      return this.formatMonth(position.year, position.month, 'long');
    }
    const [year, month, day] = this.value().split('-').map(Number);
    return new Intl.DateTimeFormat(this.locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month - 1, day));
  });

  protected readonly title = computed(() => {
    const { year, month } = this.view();
    if (this.mode() === 'month') {
      return String(year);
    }
    const title = this.formatMonth(year, month, 'long');
    return title.charAt(0).toUpperCase() + title.slice(1);
  });

  protected readonly days = computed<CalendarDay[]>(() => {
    const { year, month } = this.view();
    const first = new Date(year, month, 1);
    const formatter = new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' });
    return Array.from({ length: CALENDAR_CELLS }, (_, index) => {
      const date = new Date(year, month, 1 - first.getDay() + index);
      return {
        iso: isoDate(date),
        day: date.getDate(),
        outside: date.getMonth() !== month,
        label: formatter.format(date),
      };
    });
  });

  protected readonly months = computed<CalendarMonth[]>(() => {
    const { year } = this.view();
    return Array.from({ length: 12 }, (_, month) => ({
      value: `${year}-${pad(month + 1)}`,
      short: this.formatMonth(year, month, 'short').replace('.', ''),
      label: this.formatMonth(year, month, 'long'),
    }));
  });

  protected toggle(): void {
    this.open.update((open) => !open);
  }

  protected step(direction: number): void {
    this.view.update(({ year, month }) => {
      if (this.mode() === 'month') {
        return { year: year + direction, month };
      }
      const next = new Date(year, month + direction, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  protected pick(value: string): void {
    this.valueChange.emit(value);
    this.close();
  }

  protected pickRelative(daysAgo: number): void {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    this.pick(isoDate(date));
  }

  protected close(): void {
    this.open.set(false);
    this.trigger().nativeElement.focus();
  }

  private formatMonth(year: number, month: number, style: 'long' | 'short'): string {
    const options: Intl.DateTimeFormatOptions =
      style === 'long' ? { month: 'long', year: 'numeric' } : { month: 'short' };
    return new Intl.DateTimeFormat(this.locale, options).format(new Date(year, month, 1));
  }
}
