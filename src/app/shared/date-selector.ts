import { Component, computed, input, output, signal } from '@angular/core';
import { LucideCalendarDays, LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { formatExpenseDate, MONTHS } from '../expense-utils';

@Component({
  selector: 'app-date-selector',
  imports: [LucideCalendarDays, LucideChevronLeft, LucideChevronRight],
  templateUrl: './date-selector.html',
  styleUrls: ['../period-selector/year-wheel.css', './date-selector.css'],
})
export class DateSelector {
  readonly pickerId = input.required<string>();
  readonly mode = input<'date' | 'month'>('date');
  readonly value = input('');
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly valueChange = output<string>();
  protected readonly months = MONTHS;
  protected readonly weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  protected readonly year = signal(new Date().getFullYear());
  protected readonly month = signal(new Date().getMonth());
  protected readonly view = signal<'days' | 'months' | 'years'>('days');
  protected readonly yearStart = signal(1);
  protected readonly years = computed(() => Array.from({ length: 9 }, (_, i) => this.yearStart() + i));
  protected readonly monthLabel = computed(() => {
    const match = /^(\d{4})-(\d{2})$/.exec(this.value());
    return match && +match[2] >= 1 && +match[2] <= 12
      ? `${MONTHS[+match[2] - 1]} de ${match[1]}` : 'Selecionar fatura';
  });
  protected readonly days = computed(() => {
    const first = new Date(0);
    first.setUTCFullYear(this.year(), this.month(), 1);
    const offset = (first.getUTCDay() + 6) % 7;
    const last = new Date(first);
    last.setUTCMonth(this.month() + 1, 0);
    return Array.from({ length: offset + last.getUTCDate() }, (_, i) => i < offset ? null : i - offset + 1);
  });

  protected prepare(): void {
    const match = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(this.value());
    const today = new Date();
    this.year.set(match && +match[1] >= 1 ? +match[1] : today.getFullYear());
    this.month.set(match && +match[2] >= 1 && +match[2] <= 12 ? +match[2] - 1 : today.getMonth());
    this.yearStart.set(Math.floor((this.year() - 1) / 9) * 9 + 1);
    this.view.set(this.mode() === 'month' ? 'months' : 'days');
  }

  protected navigate(direction: number): void {
    if (this.view() === 'years') {
      this.yearStart.update((year) => year + direction * 9);
    } else if (this.view() === 'months') {
      this.year.update((year) => year + direction);
    } else {
      const index = this.year() * 12 + this.month() + direction;
      this.year.set(Math.floor(index / 12));
      this.month.set(index % 12);
    }
  }

  protected canNavigate(direction: number): boolean {
    if (this.view() === 'years') return direction < 0 ? this.yearStart() > 1 : this.yearStart() + 9 <= 9999;
    if (this.view() === 'months') return this.year() + direction >= 1 && this.year() + direction <= 9999;
    const index = this.year() * 12 + this.month() + direction;
    return index >= 12 && index <= 9999 * 12 + 11;
  }

  protected chooseYear(year: number): void {
    this.year.set(year);
    this.view.set('months');
  }

  protected changeView(): void {
    if (this.view() === 'days') this.view.set('months');
    else {
      this.yearStart.set(Math.floor((this.year() - 1) / 9) * 9 + 1);
      this.view.set('years');
    }
  }

  protected chooseMonth(month: number, popup: HTMLElement): void {
    this.month.set(month);
    if (this.mode() === 'date') this.view.set('days');
    else this.choose(this.period(), popup);
  }

  protected period(month = this.month()): string {
    return `${String(this.year()).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}`;
  }

  protected date(day: number): string {
    return `${this.period()}-${String(day).padStart(2, '0')}`;
  }

  protected dateLabel(day: number): string {
    return formatExpenseDate(day, this.year(), this.month());
  }

  protected choose(value: string, popup: HTMLElement): void {
    this.valueChange.emit(value);
    popup.hidePopover();
  }

  protected escape(popup: HTMLElement, event: Event): void {
    if (popup.matches(':popover-open')) {
      event.preventDefault();
      event.stopPropagation();
      popup.hidePopover();
    }
  }
}
