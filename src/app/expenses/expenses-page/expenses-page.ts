import { CurrencyPipe, DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  linkedSignal,
  LOCALE_ID,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { LucideChevronUp } from '@lucide/angular';
import { forkJoin } from 'rxjs';
import { ControlBarState } from '../../control-bar/control-bar-state';
import { DataChanges } from '../../core/data-changes';
import { ContainScroll } from '../../shared/contain-scroll';
import { BottomSheet } from '../../shared/bottom-sheet/bottom-sheet';
import { SwipeUp } from '../../shared/swipe-up';
import { ExpenseFilter, ExpenseKind, MonthTotals as MonthTotalsData } from '../expense';
import { ExpenseFilterBar } from '../expense-filter-bar/expense-filter-bar';
import { ExpenseFilters } from '../expense-filters';
import { ExpenseKindToggle } from '../expense-kind-toggle/expense-kind-toggle';
import { ExpenseList } from '../expense-list/expense-list';
import { ExpensesApi } from '../expenses-api';
import { MonthStrip } from '../month-strip/month-strip';
import { MonthTotals } from '../month-totals/month-totals';
import {
  currentPeriodKey,
  formatPeriodLabel,
  monthRange,
  periodKey,
  UNDATED_PERIOD_KEY,
} from '../timeline';

const WIDE_SCREEN_QUERY = '(min-width: 64rem)';

@Component({
  selector: 'app-expenses-page',
  imports: [
    CurrencyPipe,
    NgTemplateOutlet,
    ContainScroll,
    BottomSheet,
    SwipeUp,
    ExpenseFilterBar,
    ExpenseKindToggle,
    ExpenseList,
    MonthStrip,
    MonthTotals,
    LucideChevronUp,
  ],
  templateUrl: './expenses-page.html',
  styleUrl: './expenses-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesPage {
  private readonly api = inject(ExpensesApi);
  private readonly locale = inject(LOCALE_ID);
  private readonly controlBar = inject(ControlBarState);
  private readonly expenseFilters = inject(ExpenseFilters);
  private readonly sheet = viewChild.required(BottomSheet);
  private readonly list = viewChild.required(ExpenseList);

  readonly kind = input<ExpenseKind>('realized');

  protected readonly heading = computed(() =>
    this.kind() === 'planned' ? 'Gastos planejados' : 'Gastos realizados',
  );
  protected readonly activePeriod = signal<string | null>(null);
  protected readonly period = linkedSignal<string | null, string>({
    source: this.activePeriod,
    computation: (active, previous) =>
      active === UNDATED_PERIOD_KEY
        ? (previous?.value ?? currentPeriodKey())
        : (active ?? currentPeriodKey()),
  });
  protected readonly periodLabel = computed(() => formatPeriodLabel(this.period(), this.locale));
  protected readonly sheetOpen = signal(false);
  protected readonly filters = this.expenseFilters.active;

  private readonly knownPeriods = rxResource({
    stream: () => forkJoin([this.api.listPeriods('realized'), this.api.listPeriods('planned')]),
  });
  protected readonly months = computed(() =>
    monthRange([
      ...(this.knownPeriods.value() ?? [])
        .flat()
        .map(({ year, month }) => (year && month ? periodKey(year, month) : UNDATED_PERIOD_KEY)),
      currentPeriodKey(),
      this.period(),
    ]),
  );

  protected readonly totals = rxResource({
    params: () => this.period(),
    stream: ({ params }) => this.api.getMonthTotals(params),
  });
  protected readonly shownTotals = linkedSignal<
    { value: MonthTotalsData | undefined; failed: boolean },
    MonthTotalsData | undefined
  >({
    source: () => ({
      value: this.totals.hasValue() ? this.totals.value() : undefined,
      failed: this.totals.status() === 'error',
    }),
    computation: ({ value, failed }, previous) => (failed ? undefined : (value ?? previous?.value)),
  });

  constructor() {
    const wideScreen = inject(DOCUMENT).defaultView?.matchMedia(WIDE_SCREEN_QUERY);
    const closeSheetOnWideScreen = (event: MediaQueryListEvent) => {
      if (event.matches) {
        this.closeSheet();
      }
    };
    wideScreen?.addEventListener('change', closeSheetOnWideScreen);
    inject(DestroyRef).onDestroy(() => {
      wideScreen?.removeEventListener('change', closeSheetOnWideScreen);
      this.controlBar.show();
    });

    const dataChanges = inject(DataChanges);
    let seenExpenses = dataChanges.expenses();
    effect(() => {
      const version = dataChanges.expenses();
      if (version !== seenExpenses) {
        seenExpenses = version;
        untracked(() => this.refreshSummaries());
      }
    });
  }

  protected refreshSummaries(): void {
    this.totals.reload();
    this.knownPeriods.reload();
  }

  protected selectMonth(key: string): void {
    this.list().jumpTo(key);
  }

  protected toggleFilter(filter: ExpenseFilter): void {
    this.expenseFilters.toggle(filter);
  }

  protected openSheet(): void {
    this.sheetOpen.set(true);
    this.sheet().open();
    this.controlBar.hide();
  }

  protected closeSheet(): void {
    this.sheet().close();
  }

  protected onSheetClosed(): void {
    this.sheetOpen.set(false);
    this.controlBar.show();
  }
}
