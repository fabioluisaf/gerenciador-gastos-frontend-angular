import { CurrencyPipe, formatDate, NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  LOCALE_ID,
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
import { FilteredTotal } from '../../shared/filtered-total/filtered-total';
import { HorizontalWheelScroll } from '../../shared/horizontal-wheel-scroll';
import {
  SegmentedSelector,
  SelectorOption,
} from '../../shared/segmented-selector/segmented-selector';
import { MonthStrip } from '../../shared/month-strip/month-strip';
import { currentInvoice, Invoice, invoiceStatus, InvoiceStatus } from '../invoice';
import {
  categoriesOf,
  entryTotals,
  filterEntries,
  groupInvoiceEntries,
  InvoiceStatusFilter,
  isFiltering,
} from '../invoice-entries';
import { InvoicesApi } from '../invoices-api';

const STATUS_FILTER_OPTIONS: readonly SelectorOption<InvoiceStatusFilter>[] = [
  { value: 'all', label: 'Todos' },
  { value: 'realized', label: 'Realizados' },
  { value: 'planned', label: 'Planejados' },
];

const STATUS_LABELS: Readonly<Record<InvoiceStatus, string>> = {
  open: 'Aberta',
  closed: 'Fechada',
  past: 'Encerrada',
};

interface InvoiceEntries {
  realized: Expense[];
  planned: Expense[];
}

function isoToDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

@Component({
  selector: 'app-invoices-page',
  imports: [
    ConfirmDialog,
    CurrencyPipe,
    DayLabelPipe,
    ExpenseCard,
    FilteredTotal,
    HorizontalWheelScroll,
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
})
export class InvoicesPage {
  private readonly paymentMethodsApi = inject(PaymentMethodsApi);
  private readonly invoicesApi = inject(InvoicesApi);
  private readonly expensesApi = inject(ExpensesApi);
  private readonly dataChanges = inject(DataChanges);
  private readonly locale = inject(LOCALE_ID);
  private readonly confirmDialog = viewChild.required(ConfirmDialog);

  protected readonly editRequests = inject(EditRequests);
  protected readonly today = todayIsoDate();
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusOptions = STATUS_FILTER_OPTIONS;
  protected readonly nameQuery = signal('');
  protected readonly statusFilter = signal<InvoiceStatusFilter>('all');
  private readonly chosenCategories = signal<readonly string[]>([]);

  private readonly methods = rxResource({
    params: () => this.dataChanges.paymentMethods(),
    stream: () => this.paymentMethodsApi.list(),
  });

  protected readonly methodsLoaded = computed(() => this.methods.hasValue());
  protected readonly cards = computed(() =>
    (this.methods.hasValue() ? this.methods.value() : [])
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

  protected readonly invoicesLoaded = computed(() => this.invoices.hasValue());
  protected readonly invoiceList = computed(() =>
    this.invoices.hasValue() ? this.invoices.value() : [],
  );
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
  protected readonly status = computed(() => {
    const invoice = this.invoice();
    return invoice ? invoiceStatus(invoice, this.today) : null;
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
    status: this.statusFilter(),
    categories: this.selectedCategories(),
  }));
  protected readonly filtering = computed(() => isFiltering(this.entryFilter()));
  protected readonly filteredEntries = computed(() =>
    filterEntries(this.allEntries(), this.entryFilter()),
  );
  protected readonly filteredTotals = computed(() => entryTotals(this.filteredEntries()));
  protected readonly groups = computed(() => groupInvoiceEntries(this.filteredEntries()));
  protected readonly datedCount = computed(() =>
    this.groups().days.reduce((count, day) => count + day.expenses.length, 0),
  );

  protected toggleCategory(category: string): void {
    this.chosenCategories.update((current) =>
      current.includes(category)
        ? current.filter((chosen) => chosen !== category)
        : [...current, category],
    );
  }

  protected clearFilters(): void {
    this.nameQuery.set('');
    this.statusFilter.set('all');
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

  protected title(invoice: Invoice): string {
    return `Fatura de ${formatDate(isoToDate(invoice.dueDate), "MMMM 'de' y", this.locale)}`;
  }

  protected dayOf(iso: string): string {
    return formatDate(isoToDate(iso), "d 'de' MMM", this.locale).replace('.', '');
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
