import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InViewport } from '../../shared/in-viewport';
import { DayLabelPipe } from '../day-label-pipe';
import { Expense } from '../expense';
import { ExpenseCard } from '../expense-card/expense-card';
import { ExpensesApi } from '../expenses-api';
import { groupByDay } from '../group-by-day';

const PAGE_SIZE = 50;

type LoadStatus = 'idle' | 'loading' | 'error';

@Component({
  selector: 'app-expense-list',
  imports: [DayLabelPipe, ExpenseCard, InViewport],
  templateUrl: './expense-list.html',
  styleUrl: './expense-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseList {
  private readonly api = inject(ExpensesApi);
  private readonly destroyRef = inject(DestroyRef);
  private nextPage = 0;

  private readonly expenses = signal<readonly Expense[]>([]);
  protected readonly hasMore = signal(true);
  protected readonly status = signal<LoadStatus>('idle');
  protected readonly endOfListVisible = signal(false);

  protected readonly days = computed(() => groupByDay(this.expenses()));
  protected readonly isEmpty = computed(() => !this.hasMore() && this.expenses().length === 0);

  constructor() {
    effect(() => {
      if (this.endOfListVisible() && this.hasMore() && this.status() === 'idle') {
        untracked(() => this.loadNextPage());
      }
    });
  }

  protected retry(): void {
    this.status.set('idle');
  }

  private loadNextPage(): void {
    this.status.set('loading');
    this.api
      .listRealized(this.nextPage, PAGE_SIZE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.nextPage++;
          this.expenses.update((loaded) => [...loaded, ...page.items]);
          this.hasMore.set(page.hasNext);
          this.status.set('idle');
        },
        error: () => this.status.set('error'),
      });
  }
}
