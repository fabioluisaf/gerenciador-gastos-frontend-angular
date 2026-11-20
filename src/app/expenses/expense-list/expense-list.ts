import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  LOCALE_ID,
  model,
  output,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, tap } from 'rxjs';
import { DataChanges } from '../../core/data-changes';
import { EditRequests } from '../../core/edit-requests';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { InViewport } from '../../shared/in-viewport';
import { TimelineScrubber } from '../../shared/timeline-scrubber/timeline-scrubber';
import { DayLabelPipe } from '../day-label-pipe';
import { Expense, ExpenseFilter, ExpenseKind } from '../expense';
import { ExpenseCard } from '../expense-card/expense-card';
import { ExpensesApi } from '../expenses-api';
import { groupByDay } from '../group-by-day';
import { buildTimeline, formatMonthTitle, toScrubberMarks, UNDATED_PERIOD_KEY } from '../timeline';

const PAGE_SIZE = 50;
const SCROLL_CLASS = 'timeline-scroll';
const ACTIVE_LINE_PX = 96;

type LoadStatus = 'idle' | 'loading' | 'error';
type Direction = 'older' | 'newer';

const EMPTY_MESSAGES: Readonly<Record<ExpenseKind, string>> = {
  realized: 'Nenhum gasto realizado ainda.',
  planned: 'Nenhum gasto planejado.',
};

export function dayElementId(key: string): string {
  return `dia-${key}`;
}

@Component({
  selector: 'app-expense-list',
  imports: [ConfirmDialog, DayLabelPipe, ExpenseCard, InViewport, TimelineScrubber],
  templateUrl: './expense-list.html',
  styleUrl: './expense-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:scroll)': 'scheduleActivePeriodUpdate()',
  },
})
export class ExpenseList {
  private readonly api = inject(ExpensesApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly locale = inject(LOCALE_ID);
  private readonly dataChanges = inject(DataChanges);
  protected readonly editRequests = inject(EditRequests);

  protected readonly loadMargin = '600px 0px 600px 0px';
  protected readonly dayElementId = dayElementId;

  private readonly dayElements = viewChildren<ElementRef<HTMLElement>>('day');
  private readonly confirmDialog = viewChild.required(ConfirmDialog);
  private activePeriodFrame = 0;
  private pendingLoad?: Subscription;
  private appliedFilters?: readonly ExpenseFilter[];

  readonly kind = input<ExpenseKind>('realized');
  readonly filters = input<readonly ExpenseFilter[]>([]);

  private readonly expenses = signal<readonly Expense[]>([]);
  private readonly firstPage = signal(0);
  private readonly lastPage = signal(-1);
  protected readonly hasOlder = signal(true);
  protected readonly hasNewer = computed(() => this.firstPage() > 0);
  protected readonly status = signal<LoadStatus>('idle');
  protected readonly topVisible = signal(false);
  protected readonly bottomVisible = signal(false);
  readonly activePeriod = model<string | null>(null);
  readonly expenseDeleted = output<void>();

  private readonly periods = rxResource({
    params: () => ({ kind: this.kind(), filters: this.filters() }),
    stream: ({ params }) => this.api.listPeriods(params.kind, params.filters),
  });
  private readonly timeline = computed(() =>
    buildTimeline(this.periods.value() ?? [], this.locale),
  );
  protected readonly marks = computed(() => {
    const total = (this.periods.value() ?? []).reduce((sum, period) => sum + period.count, 0);
    return toScrubberMarks(this.timeline(), total);
  });

  protected readonly days = computed(() => groupByDay(this.expenses()));
  protected readonly isEmpty = computed(
    () => !this.hasOlder() && !this.hasNewer() && this.expenses().length === 0,
  );
  protected readonly emptyMessage = computed(() =>
    this.filters().length > 0 ? 'Nenhum gasto com esses filtros.' : EMPTY_MESSAGES[this.kind()],
  );

  constructor() {
    const root = this.document.documentElement;
    root.classList.add(SCROLL_CLASS);
    this.destroyRef.onDestroy(() => {
      root.classList.remove(SCROLL_CLASS);
      cancelAnimationFrame(this.activePeriodFrame);
    });

    let seenExpenses = this.dataChanges.expenses();
    effect(() => {
      const version = this.dataChanges.expenses();
      if (version !== seenExpenses) {
        seenExpenses = version;
        untracked(() => {
          this.restartFromTop();
          this.periods.reload();
        });
      }
    });
    effect(() => {
      const filters = this.filters();
      if (this.appliedFilters !== undefined && this.appliedFilters !== filters) {
        untracked(() => this.restartFromTop());
      }
      this.appliedFilters = filters;
    });
    effect(() => {
      if (this.status() === 'idle' && this.bottomVisible() && this.hasOlder()) {
        untracked(() => this.load('older'));
      }
    });
    effect(() => {
      if (this.status() === 'idle' && this.topVisible() && this.hasNewer()) {
        untracked(() => this.load('newer'));
      }
    });
  }

  protected monthTitle(isoDate: string): string {
    return formatMonthTitle(isoDate, this.locale);
  }

  protected confirmDelete(expense: Expense): void {
    const installment = expense.installment;
    this.confirmDialog().open({
      title: 'Excluir gasto?',
      message: installment
        ? `"${expense.name}" e as ${installment.count} parcelas da compra serão excluídos.`
        : `"${expense.name}" será excluído.`,
      confirmLabel: 'Excluir',
      runningLabel: 'Excluindo…',
      errorMessage: 'Não foi possível excluir o gasto. Tente novamente.',
      run: () => this.api.delete(expense).pipe(tap(() => this.removeExpense(expense))),
    });
  }

  protected retry(): void {
    this.status.set('idle');
  }

  protected scheduleActivePeriodUpdate(): void {
    if (this.activePeriodFrame === 0) {
      this.activePeriodFrame = requestAnimationFrame(() => {
        this.activePeriodFrame = 0;
        this.updateActivePeriod();
      });
    }
  }

  jumpTo(periodKey: string): void {
    this.activePeriod.set(periodKey);
    if (this.scrollToPeriod(periodKey)) {
      return;
    }
    const period = this.timeline().find(({ key }) => key === periodKey);
    if (!period) {
      return;
    }
    this.restartAt(Math.floor(period.offset / PAGE_SIZE));
    this.load('older', () =>
      afterNextRender(() => this.scrollToPeriod(periodKey), { injector: this.injector }),
    );
  }

  private removeExpense(removed: Expense): void {
    const purchaseId = removed.installment?.purchaseId;
    this.expenses.update((loaded) =>
      loaded.filter((expense) =>
        purchaseId ? expense.installment?.purchaseId !== purchaseId : expense.id !== removed.id,
      ),
    );
    this.periods.reload();
    this.expenseDeleted.emit();
    this.scheduleActivePeriodUpdate();
  }

  private restartFromTop(): void {
    this.restartAt(0);
    this.document.defaultView?.scrollTo(0, 0);
  }

  private restartAt(page: number): void {
    this.pendingLoad?.unsubscribe();
    this.expenses.set([]);
    this.firstPage.set(page);
    this.lastPage.set(page - 1);
    this.hasOlder.set(true);
    this.status.set('idle');
  }

  private load(direction: Direction, onLoaded?: () => void): void {
    const page = direction === 'older' ? this.lastPage() + 1 : this.firstPage() - 1;
    this.status.set('loading');
    this.pendingLoad = this.api
      .list(this.kind(), page, PAGE_SIZE, this.filters())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ items, hasNext }) => {
          if (direction === 'older') {
            this.expenses.update((loaded) => [...loaded, ...items]);
            this.lastPage.set(page);
            this.hasOlder.set(hasNext);
          } else {
            this.keepScrollPositionAfterPrepend();
            this.expenses.update((loaded) => [...items, ...loaded]);
            this.firstPage.set(page);
          }
          this.status.set('idle');
          this.scheduleActivePeriodUpdate();
          onLoaded?.();
        },
        error: () => this.status.set('error'),
      });
  }

  private updateActivePeriod(): void {
    const view = this.document.defaultView;
    const days = this.days();
    if (!view || days.length === 0) {
      return;
    }
    const atTop = view.scrollY <= 0 && !this.hasNewer();
    const atBottom =
      view.scrollY + view.innerHeight >= this.document.documentElement.scrollHeight - 1 &&
      !this.hasOlder();
    let index = this.dayElements().findIndex(
      ({ nativeElement }) => nativeElement.getBoundingClientRect().bottom > ACTIVE_LINE_PX,
    );
    if (atTop) {
      index = 0;
    } else if (atBottom || index === -1) {
      index = days.length - 1;
    }
    this.activePeriod.set(days[index].month ?? UNDATED_PERIOD_KEY);
  }

  private keepScrollPositionAfterPrepend(): void {
    const root = this.document.documentElement;
    const heightBefore = root.scrollHeight;
    afterNextRender(
      () => this.document.defaultView?.scrollBy(0, root.scrollHeight - heightBefore),
      { injector: this.injector },
    );
  }

  private scrollToPeriod(periodKey: string): boolean {
    const day = this.days().find(({ month }) => (month ?? UNDATED_PERIOD_KEY) === periodKey);
    const element = day && this.document.getElementById(dayElementId(day.key));
    element?.scrollIntoView({ block: 'start' });
    return !!element;
  }
}
