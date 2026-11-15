import { afterNextRender, Component, computed, effect, ElementRef, inject, Injector, linkedSignal, signal, untracked, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { ExpenseApi } from './expense-api';
import { ExpenseFilter } from './expense-filter/expense-filter';
import { ExpenseFilterDialog } from './expense-filter-dialog/expense-filter-dialog';
import { Expense, ExpenseMetadata, ExpenseQuery, SelectedExpenseFilter } from './expense-models';
import { ExpenseList } from './expense-list/expense-list';
import { ExpenseEditor } from './expense-editor/expense-editor';
import { ExpenseSummary } from './expense-summary/expense-summary';
import { MONTHS } from './expense-utils';
import { PeriodSelector } from './period-selector/period-selector';
import { Card } from './shared/card';
import { TopBar } from './top-bar/top-bar';

@Component({
  imports: [Card, TopBar, PeriodSelector, ExpenseFilter, ExpenseFilterDialog, ExpenseList, ExpenseSummary, ExpenseEditor],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly api = inject(ExpenseApi);
  protected readonly offline = this.api.offline;
  protected readonly creationOpen = signal(false);
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
  protected readonly noExpenses = computed(() => {
    const metadata = this.metadata();
    return !!metadata && Object.keys(metadata.periods).length === 0;
  });
  protected readonly selectedYear = linkedSignal<ExpenseMetadata | undefined, number>({
    source: this.metadata,
    computation: (metadata, previous) => previous && metadata?.periods[previous.value]
      ? previous.value : metadata?.initialPeriod.year ?? new Date().getFullYear(),
  });
  protected readonly selectedMonth = linkedSignal({
    source: () => ({ metadata: this.metadata(), year: this.selectedYear() }),
    computation: ({ metadata, year }, previous): number => {
      const available = metadata?.periods[year];
      if (previous && previous.source.year === year && available?.months.includes(previous.value)) return previous.value;
      return year === metadata?.initialPeriod.year ? metadata.initialPeriod.month
        : available?.monthOnSelect ?? new Date().getMonth();
    },
  });
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
    this.reloadExpenses();
  }

  protected reloadExpenses(): void {
    this.expenseReload.update((value) => value + 1);
    this.totalsRequest.reload();
    this.metadataRequest.reload();
  }

  protected retryConnection(): void {
    this.metadataRequest.reload();
    this.expenseReload.update((value) => value + 1);
    this.totalsRequest.reload();
  }
}
