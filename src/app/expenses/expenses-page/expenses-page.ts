import { CurrencyPipe, DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  input,
  linkedSignal,
  LOCALE_ID,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { LucideChevronUp, LucideSearch, LucideX } from '@lucide/angular';
import { forkJoin } from 'rxjs';
import { ControlBarState } from '../../control-bar/control-bar-state';
import { DataChanges } from '../../core/data-changes';
import { ContainScroll } from '../../shared/contain-scroll';
import { BottomSheet } from '../../shared/bottom-sheet/bottom-sheet';
import { SwipeUp } from '../../shared/swipe-up';
import { FilteredTotal } from '../../shared/filtered-total/filtered-total';
import {
  ExpenseFilter,
  ExpenseKind,
  FilteredTotals,
  MonthTotals as MonthTotalsData,
} from '../expense';
import { ExpenseFilterBar } from '../expense-filter-bar/expense-filter-bar';
import { ExpenseFilters } from '../expense-filters';
import { ExpenseKindToggle } from '../expense-kind-toggle/expense-kind-toggle';
import { ExpenseNameSearch } from '../expense-name-search/expense-name-search';
import { ExpenseList } from '../expense-list/expense-list';
import { ExpensesApi } from '../expenses-api';
import { MonthStrip } from '../../shared/month-strip/month-strip';
import { MonthInvoiceCard } from '../../invoices/month-invoice-card/month-invoice-card';
import { MonthTotals } from '../month-totals/month-totals';
import {
  currentPeriodKey,
  formatPeriodLabel,
  monthRange,
  periodKey,
  UNDATED_PERIOD_KEY,
} from '../timeline';

const WIDE_SCREEN_QUERY = '(min-width: 64rem)';
const INVOICE_COLUMN_QUERY = '(min-width: 90rem)';

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
    ExpenseNameSearch,
    FilteredTotal,
    MonthInvoiceCard,
    MonthStrip,
    MonthTotals,
    LucideChevronUp,
    LucideSearch,
    LucideX,
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
  private readonly dataVersion = inject(DataChanges).expenses;
  private readonly injector = inject(Injector);

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
  protected readonly invoiceColumn = signal(false);
  protected readonly filters = this.expenseFilters.active;
  private readonly searchOpen = signal(false);
  protected readonly searchVisible = computed(
    () => this.searchOpen() || this.expenseFilters.name() !== '',
  );
  private readonly nameSearch = viewChild(ExpenseNameSearch);

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

  protected readonly filteredTotals = rxResource({
    params: () => {
      const filters = this.filters();
      return filters.length > 0
        ? { period: this.period(), filters, version: this.dataVersion() }
        : undefined;
    },
    stream: ({ params }) => this.api.getFilteredTotals(params.period, params.filters),
  });
  protected readonly shownFilteredTotals = linkedSignal<
    FilteredTotals | undefined,
    FilteredTotals | undefined
  >({
    source: () => (this.filteredTotals.hasValue() ? this.filteredTotals.value() : undefined),
    computation: (value, previous) =>
      value ?? (this.filters().length > 0 ? previous?.value : undefined),
  });

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    const wideScreen = view?.matchMedia(WIDE_SCREEN_QUERY);
    const invoiceScreen = view?.matchMedia(INVOICE_COLUMN_QUERY);
    const showInvoiceColumn = (event: { matches: boolean }) =>
      this.invoiceColumn.set(event.matches);
    if (invoiceScreen) {
      showInvoiceColumn(invoiceScreen);
    }
    invoiceScreen?.addEventListener('change', showInvoiceColumn);
    const closeSheetOnWideScreen = (event: MediaQueryListEvent) => {
      if (event.matches) {
        this.closeSheet();
      }
    };
    wideScreen?.addEventListener('change', closeSheetOnWideScreen);
    inject(DestroyRef).onDestroy(() => {
      wideScreen?.removeEventListener('change', closeSheetOnWideScreen);
      invoiceScreen?.removeEventListener('change', showInvoiceColumn);
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
    this.filteredTotals.reload();
  }

  protected selectMonth(key: string): void {
    this.list().jumpTo(key);
  }

  protected toggleFilter(filter: ExpenseFilter): void {
    this.expenseFilters.toggle(filter);
  }

  protected toggleSearch(): void {
    if (this.searchVisible()) {
      this.searchOpen.set(false);
      this.expenseFilters.setName('');
      return;
    }
    this.searchOpen.set(true);
    afterNextRender(() => this.nameSearch()?.focus(), { injector: this.injector });
  }

  protected clearFilters(): void {
    this.expenseFilters.clear();
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
