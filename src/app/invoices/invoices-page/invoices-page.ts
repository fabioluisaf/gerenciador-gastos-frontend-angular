import { CurrencyPipe, NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { LucideChevronDown, LucideSearch } from '@lucide/angular';
import { tap } from 'rxjs';
import { DataChanges } from '../../core/data-changes';
import { EditRequests } from '../../core/edit-requests';
import { DayLabelPipe } from '../../expenses/day-label-pipe';
import { Expense } from '../../expenses/expense';
import { ExpenseCard } from '../../expenses/expense-card/expense-card';
import { ExpensesApi } from '../../expenses/expenses-api';
import { todayIsoDate } from '../../expenses/timeline';
import { PaymentMethod } from '../../payment-methods/payment-method';
import { PaymentMethodsApi } from '../../payment-methods/payment-methods-api';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { DragScroll } from '../../shared/drag-scroll';
import { FilteredTotal } from '../../shared/filtered-total/filtered-total';
import { HorizontalWheelScroll } from '../../shared/horizontal-wheel-scroll';
import {
  SegmentedSelector,
  SelectorOption,
} from '../../shared/segmented-selector/segmented-selector';
import { MonthStrip } from '../../shared/month-strip/month-strip';
import { currentInvoice, Invoice } from '../invoice';
import { InvoiceSummary } from '../invoice-summary/invoice-summary';
import {
  categoriesOf,
  entryTotals,
  filterEntries,
  groupInvoiceEntries,
  isFiltering,
} from '../invoice-entries';
import { InvoicesApi } from '../invoices-api';

interface InvoiceEntries {
  realized: Expense[];
  planned: Expense[];
}

interface CardInvoices {
  cardId: string | null;
  invoices: Invoice[] | undefined;
}

type SectionKey = 'installments' | 'undated' | 'plannedDays' | 'realizedDays';

@Component({
  selector: 'app-invoices-page',
  imports: [
    ConfirmDialog,
    CurrencyPipe,
    DayLabelPipe,
    DragScroll,
    ExpenseCard,
    FilteredTotal,
    HorizontalWheelScroll,
    InvoiceSummary,
    LucideChevronDown,
    LucideSearch,
    NgOptimizedImage,
    NgTemplateOutlet,
    MonthStrip,
    SegmentedSelector,
  ],
  templateUrl: './invoices-page.html',
  styleUrl: './invoices-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.selecting]': 'selectedExpenses().length > 0' },
})
export class InvoicesPage {
  private readonly paymentMethodsApi = inject(PaymentMethodsApi);
  private readonly invoicesApi = inject(InvoicesApi);
  private readonly expensesApi = inject(ExpensesApi);
  private readonly dataChanges = inject(DataChanges);
  private readonly confirmDialog = viewChild.required(ConfirmDialog);

  protected readonly editRequests = inject(EditRequests);
  protected readonly today = todayIsoDate();
  protected readonly nameQuery = signal('');
  private readonly chosenCategories = signal<readonly string[]>([]);

  private readonly methods = rxResource({
    params: () => this.dataChanges.paymentMethods(),
    stream: () => this.paymentMethodsApi.list(),
  });

  private readonly shownMethods = linkedSignal<
    PaymentMethod[] | undefined,
    PaymentMethod[] | undefined
  >({
    source: () => (this.methods.hasValue() ? this.methods.value() : undefined),
    computation: (methods, previous) => methods ?? previous?.value,
  });

  protected readonly methodsLoaded = computed(() => this.shownMethods() !== undefined);
  protected readonly cards = computed(() =>
    (this.shownMethods() ?? [])
      .filter(({ paymentType }) => paymentType === 'CREDITO')
      .sort((a, b) => b.usageCount - a.usageCount),
  );
  protected readonly cardOptions = computed<SelectorOption[]>(() =>
    this.cards().map(({ id, name }) => ({ value: id, label: name })),
  );
  protected readonly cardId = linkedSignal<PaymentMethod[], string | null>({
    source: () => this.cards(),
    computation: (cards, previous) =>
      cards.find(({ id }) => id === previous?.value)?.id ?? cards[0]?.id ?? null,
  });
  protected readonly card = computed(
    () => this.cards().find(({ id }) => id === this.cardId()) ?? null,
  );

  private readonly invoices = rxResource({
    params: () => {
      const id = this.cardId();
      return id ? { id, version: this.dataChanges.expenses() } : undefined;
    },
    stream: ({ params }) => this.invoicesApi.list(params.id),
  });

  private readonly shownInvoices = linkedSignal<CardInvoices, Invoice[] | undefined>({
    source: () => ({
      cardId: this.cardId(),
      invoices: this.invoices.hasValue() ? this.invoices.value() : undefined,
    }),
    computation: ({ cardId, invoices }, previous) =>
      invoices ?? (previous?.source.cardId === cardId ? previous.value : undefined),
  });

  protected readonly invoicesLoaded = computed(() => this.shownInvoices() !== undefined);
  protected readonly invoiceList = computed(() => this.shownInvoices() ?? []);
  protected readonly invoiceId = linkedSignal<Invoice[], string | null>({
    source: () => this.invoiceList(),
    computation: (invoices, previous) =>
      invoices.find(({ id }) => id === previous?.value)?.id ??
      currentInvoice(invoices, this.today)?.id ??
      null,
  });
  protected readonly invoice = computed(
    () => this.invoiceList().find(({ id }) => id === this.invoiceId()) ?? null,
  );
  protected readonly invoiceMonths = computed(() =>
    this.invoiceList().map(({ dueDate }) => dueDate.slice(0, 7)),
  );
  protected readonly selectedMonth = computed(() => this.invoice()?.dueDate.slice(0, 7) ?? '');
  protected readonly direction = linkedSignal<number, 'forward' | 'back'>({
    source: () => this.invoiceList().findIndex(({ id }) => id === this.invoiceId()),
    computation: (index, previous) => (previous && index < previous.source ? 'back' : 'forward'),
  });

  private readonly entries = rxResource({
    params: () => {
      const id = this.invoiceId();
      return id ? { id, version: this.dataChanges.expenses() } : undefined;
    },
    stream: ({ params }) => this.expensesApi.listByInvoice(params.id),
  });

  private readonly shownEntries = linkedSignal<
    InvoiceEntries | undefined,
    InvoiceEntries | undefined
  >({
    source: () => (this.entries.hasValue() ? this.entries.value() : undefined),
    computation: (entries, previous) => entries ?? previous?.value,
  });

  protected readonly entriesLoaded = computed(() => this.shownEntries() !== undefined);
  protected readonly entriesStale = computed(() => this.entries.isLoading());
  protected readonly realized = computed(() => this.shownEntries()?.realized ?? []);
  protected readonly planned = computed(() => this.shownEntries()?.planned ?? []);
  protected readonly plannedTotal = computed(() =>
    this.planned().reduce((sum, expense) => sum + expense.amount, 0),
  );

  protected readonly allEntries = computed(() => [...this.realized(), ...this.planned()]);
  protected readonly categories = computed(() => categoriesOf(this.allEntries()));
  protected readonly selectedCategories = computed(() =>
    this.chosenCategories().filter((category) => this.categories().includes(category)),
  );
  private readonly entryFilter = computed(() => ({
    name: this.nameQuery(),
    categories: this.selectedCategories(),
  }));
  protected readonly filtering = computed(() => isFiltering(this.entryFilter()));
  protected readonly filteredEntries = computed(() =>
    filterEntries(this.allEntries(), this.entryFilter()),
  );
  protected readonly filteredTotals = computed(() => entryTotals(this.filteredEntries()));
  protected readonly groups = computed(() => groupInvoiceEntries(this.filteredEntries()));

  private readonly openSections = signal<ReadonlySet<SectionKey>>(new Set());

  protected isOpen(section: SectionKey): boolean {
    return this.openSections().has(section);
  }

  protected sectionToggled(section: SectionKey, event: Event): void {
    const open = (event.target as HTMLDetailsElement).open;
    if (open === this.isOpen(section)) {
      return;
    }
    this.openSections.update((current) => {
      const next = new Set(current);
      if (open) {
        next.add(section);
      } else {
        next.delete(section);
      }
      return next;
    });
  }

  private readonly selectedIds = linkedSignal<string | null, ReadonlySet<string>>({
    source: () => this.invoiceId(),
    computation: () => new Set<string>(),
  });
  protected readonly selectedExpenses = computed(() =>
    this.allEntries().filter(({ id }) => this.selectedIds().has(id)),
  );
  protected readonly selectedTotal = computed(() =>
    this.selectedExpenses().reduce((sum, { amount }) => sum + amount, 0),
  );

  protected isSelected(expense: Expense): boolean {
    return this.selectedIds().has(expense.id);
  }

  protected setSelected(expense: Expense, selected: boolean): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (selected) {
        next.add(expense.id);
      } else {
        next.delete(expense.id);
      }
      return next;
    });
  }

  protected clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  protected toggleCategory(category: string): void {
    this.chosenCategories.update((current) =>
      current.includes(category)
        ? current.filter((chosen) => chosen !== category)
        : [...current, category],
    );
  }

  protected clearFilters(): void {
    this.nameQuery.set('');
    this.chosenCategories.set([]);
  }

  protected textValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected selectMonth(month: string): void {
    const invoice = this.invoiceList().find(({ dueDate }) => dueDate.startsWith(month));
    if (invoice) {
      this.invoiceId.set(invoice.id);
    }
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
      run: () => this.expensesApi.delete(expense).pipe(tap(() => this.dataChanges.expenseSaved())),
    });
  }
}
