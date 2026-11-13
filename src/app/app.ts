import { afterNextRender, afterRenderEffect, Component, computed, effect, ElementRef, inject, InjectionToken, Injector, isDevMode, linkedSignal, signal, untracked, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { LucideListFilter } from '@lucide/angular';
import { Subscription } from 'rxjs';
import { ExpenseApi } from './expense-api';
import { ExpenseFilter } from './expense-filter/expense-filter';
import { Expense, ExpenseQuery, SelectedExpenseFilter } from './expense-models';
import { ExpenseList } from './expense-list/expense-list';
import { ExpenseSummary } from './expense-summary/expense-summary';
import { MONTHS } from './expense-utils';
import { PeriodSelector } from './period-selector/period-selector';
import { Card } from './shared/card';
import { TopBar } from './top-bar/top-bar';

export const AUTO_OPEN_EXPENSE_PREVIEW = new InjectionToken<boolean>('AUTO_OPEN_EXPENSE_PREVIEW', {
  providedIn: 'root',
  factory: () => isDevMode(),
});

@Component({
  imports: [Card, TopBar, PeriodSelector, ExpenseFilter, ExpenseList, ExpenseSummary, LucideListFilter],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly api = inject(ExpenseApi);
  private previewPending = inject(AUTO_OPEN_EXPENSE_PREVIEW);
  private readonly expenseList = viewChild(ExpenseList);
  private readonly topBar = viewChild.required(TopBar);
  private readonly filterChip = viewChild<ExpenseFilter, ElementRef<HTMLElement>>(ExpenseFilter, { read: ElementRef });
  private readonly injector = inject(Injector);
  protected readonly metadataRequest = rxResource({
    stream: () => this.api.getMetadata(),
  });
  protected readonly metadata = computed(() =>
    this.metadataRequest.hasValue() ? this.metadataRequest.value() : undefined,
  );
  protected readonly selectedYear = linkedSignal(() => this.metadata()?.initialPeriod.year ?? new Date().getFullYear());
  protected readonly selectedMonth = linkedSignal(() => this.metadata()?.initialPeriod.month ?? new Date().getMonth());
  protected readonly selectedFilter = signal<SelectedExpenseFilter | null>(null);
  protected readonly periodLabel = computed(() => `${MONTHS[this.selectedMonth()].toLowerCase()} de ${this.selectedYear()}`);
  private readonly period = computed(() => this.metadata()
    ? { year: this.selectedYear(), month: this.selectedMonth() }
    : undefined,
  );
  private readonly expenseQuery = computed<ExpenseQuery | undefined>(() => {
    const period = this.period();
    const filter = this.selectedFilter();
    return period ? {
      ...period,
      filter: filter ? { field: filter.field, value: filter.value } : null,
      page: 1,
      pageSize: 10,
    } : undefined;
  });
  protected readonly expenses = signal<readonly Expense[]>([]);
  protected readonly expensesLoading = signal(false);
  protected readonly expensesError = signal(false);
  private readonly loadedPage = signal(0);
  private readonly totalPages = signal<number | null>(null);
  private readonly requestedPages = signal(1);
  private readonly expenseReload = signal(0);
  private expenseSubscription?: Subscription;
  protected readonly totalsRequest = rxResource({
    params: this.period,
    stream: ({ params }) => this.api.getTotals(params),
  });

  constructor() {
    effect((onCleanup) => {
      this.expenseQuery();
      this.expenseReload();
      untracked(() => {
        this.expenses.set([]);
        this.loadedPage.set(0);
        this.totalPages.set(null);
        this.requestedPages.set(1);
        this.expensesLoading.set(false);
        this.expensesError.set(false);
        this.expenseList()?.resetScroll();
      });
      onCleanup(() => this.expenseSubscription?.unsubscribe());
    });

    effect(() => {
      const query = this.expenseQuery();
      const loaded = this.loadedPage();
      const total = this.totalPages();
      if (query && !this.expensesLoading() && !this.expensesError() &&
        loaded < this.requestedPages() && (total === null || loaded < total)) {
        untracked(() => this.loadExpensePage({ ...query, page: loaded + 1 }));
      }
    });

    afterRenderEffect(() => {
      const list = this.expenseList();
      if (this.previewPending && list && !this.expensesLoading() && this.totalPages() !== null) {
        this.previewPending = false;
        list.openFirstExpense();
      }
    });
  }

  protected requestPages(count: number): void {
    this.requestedPages.update((current) => Math.max(current, count));
  }

  protected retryExpenses(): void {
    this.expensesError.set(false);
  }

  private loadExpensePage(query: ExpenseQuery): void {
    this.expensesLoading.set(true);
    this.expenseSubscription = this.api.getExpenses(query).subscribe({
      next: (page) => {
        this.expenses.update((current) => [...current, ...page.items]);
        this.loadedPage.set(page.page);
        this.totalPages.set(page.totalPages);
      },
      error: () => {
        this.expensesError.set(true);
        this.expensesLoading.set(false);
      },
      complete: () => this.expensesLoading.set(false),
    });
  }

  protected selectFilter(filter: SelectedExpenseFilter): void {
    this.selectedFilter.update((current) =>
      current?.field === filter.field && current.value === filter.value ? null : filter,
    );
    this.topBar().closeTotals();
  }

  protected filterExpense(filter: SelectedExpenseFilter): void {
    this.selectedFilter.set(filter);
    afterNextRender(() => {
      this.filterChip()?.nativeElement.querySelector<HTMLButtonElement>('button')?.focus();
    }, { injector: this.injector });
  }

  onExpenseAdded(): void {
    this.expenseReload.update((value) => value + 1);
    this.totalsRequest.reload();
  }
}
