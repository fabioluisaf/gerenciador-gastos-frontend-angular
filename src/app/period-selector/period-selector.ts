import { afterNextRender, afterRenderEffect, Component, computed, DestroyRef, ElementRef, inject, input, model, signal, viewChild } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { closeOnBackdrop, MONTHS } from '../expense-utils';
import { AvailablePeriod } from '../expense-models';

@Component({
  selector: 'app-period-selector',
  imports: [LucideChevronLeft, LucideChevronRight],
  templateUrl: './period-selector.html',
  styleUrls: ['./period-selector.css', './month-selector.css', './year-wheel.css'],
})
export class PeriodSelector {
  readonly periods = input.required<Readonly<Record<number, AvailablePeriod>>>();
  readonly selectedYear = model.required<number>();
  readonly selectedMonth = model.required<number>();
  protected readonly months = MONTHS;
  protected readonly firstYear = 2020;
  protected readonly yearPageStart = signal(this.firstYear);
  protected readonly yearPage = computed(() => Array.from({ length: 9 }, (_, index) => this.yearPageStart() + index));
  protected readonly monthsWithExpenses = computed(() => this.periods()[this.selectedYear()]?.months ?? []);
  protected readonly monthsOverflowTop = signal(false);
  protected readonly closeOnBackdrop = closeOnBackdrop;
  private readonly monthList = viewChild.required<ElementRef<HTMLElement>>('monthList');

  constructor() {
    let centered = false;
    afterRenderEffect(() => {
      this.selectedYear();
      this.selectedMonth();
      if (Object.keys(this.periods()).length > 0) {
        this.showSelectedMonth(!centered);
        centered = true;
      }
    });
    const onResize = () => this.showSelectedMonth(false);
    afterNextRender(() => {
      window.addEventListener('resize', onResize);
    });
    inject(DestroyRef).onDestroy(() => window.removeEventListener('resize', onResize));
  }

  protected updateMonthOverflow(list: HTMLElement): void {
    this.monthsOverflowTop.set(list.scrollTop > 1);
  }

  private showSelectedMonth(center: boolean): void {
    const list = this.monthList().nativeElement;
    const selected = list.querySelector<HTMLElement>('.month-button.selected');
    if (!selected) {
      throw new Error('Selected month button not found');
    }
    const listBounds = list.getBoundingClientRect();
    const selectedBounds = selected.getBoundingClientRect();
    if (center) {
      list.scrollTop += selectedBounds.top + selectedBounds.height / 2 - (listBounds.top + listBounds.height / 2);
    } else {
      const style = window.getComputedStyle(list);
      const top = listBounds.top + Number.parseFloat(style.scrollPaddingTop);
      const bottom = listBounds.bottom - Number.parseFloat(style.scrollPaddingBottom);
      if (selectedBounds.bottom > bottom) {
        list.scrollTop += Math.ceil(selectedBounds.bottom - bottom);
      } else if (selectedBounds.top < top) {
        list.scrollTop -= Math.ceil(top - selectedBounds.top);
      }
    }
    this.updateMonthOverflow(list);
  }

  protected openYearSelector(dialog: HTMLDialogElement): void {
    const page = Math.max(0, Math.floor((this.selectedYear() - this.firstYear) / 9));
    this.yearPageStart.set(this.firstYear + page * 9);
    dialog.showModal();
  }

  protected selectYear(year: number, dialog: HTMLDialogElement): void {
    const period = this.periods()[year];
    if (period) {
      this.selectedYear.set(year);
      if (period.monthOnSelect !== null) {
        this.selectedMonth.set(period.monthOnSelect);
      }
      dialog.close();
    }
  }
}
