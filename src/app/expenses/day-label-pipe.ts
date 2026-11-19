import { formatDate } from '@angular/common';
import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'dayLabel' })
export class DayLabelPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(isoDate: string): string {
    const [year, month, day] = isoDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayMonthYear = formatDate(date, "dd 'de' MMM 'de' y", this.locale).replaceAll('.', '');
    const weekday = formatDate(date, 'EEEE', this.locale);
    return `${dayMonthYear} — ${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`;
  }
}
