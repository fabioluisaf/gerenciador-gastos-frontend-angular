import { formatDate, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  LOCALE_ID,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DataChanges } from '../../core/data-changes';
import { ExpensesApi } from '../../expenses/expenses-api';
import { PaymentMethod } from '../../payment-methods/payment-method';
import { PaymentMethodsApi } from '../../payment-methods/payment-methods-api';
import {
  SegmentedSelector,
  SelectorOption,
} from '../../shared/segmented-selector/segmented-selector';
import { InvoiceBrief } from '../invoice-brief/invoice-brief';
import { InvoiceSummary } from '../invoice-summary/invoice-summary';
import { InvoicesApi } from '../invoices-api';

@Component({
  selector: 'app-month-invoice-card',
  imports: [InvoiceBrief, InvoiceSummary, NgOptimizedImage, RouterLink, SegmentedSelector],
  templateUrl: './month-invoice-card.html',
  styleUrl: './month-invoice-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthInvoiceCard {
  private readonly paymentMethodsApi = inject(PaymentMethodsApi);
  private readonly invoicesApi = inject(InvoicesApi);
  private readonly expensesApi = inject(ExpensesApi);
  private readonly dataChanges = inject(DataChanges);
  private readonly locale = inject(LOCALE_ID);

  readonly period = input.required<string>();

  private readonly methods = rxResource({
    params: () => this.dataChanges.paymentMethods(),
    stream: () => this.paymentMethodsApi.list(),
  });

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
  private readonly invoiceList = computed(() =>
    this.invoices.hasValue() ? this.invoices.value() : [],
  );
  private readonly invoiceIndex = computed(() =>
    this.invoiceList().findIndex(({ dueDate }) => dueDate.startsWith(this.period())),
  );
  protected readonly invoice = computed(() => this.invoiceList()[this.invoiceIndex()] ?? null);
  protected readonly previousInvoice = computed(() =>
    this.invoiceIndex() > 0 ? this.invoiceList()[this.invoiceIndex() - 1] : null,
  );
  protected readonly nextInvoice = computed(() =>
    this.invoiceIndex() >= 0 ? (this.invoiceList()[this.invoiceIndex() + 1] ?? null) : null,
  );

  private readonly entries = rxResource({
    params: () => {
      const id = this.invoice()?.id;
      return id ? { id, version: this.dataChanges.expenses() } : undefined;
    },
    stream: ({ params }) => this.expensesApi.listByInvoice(params.id),
  });

  protected readonly plannedTotal = computed(() =>
    (this.entries.hasValue() ? this.entries.value().planned : []).reduce(
      (sum, { amount }) => sum + amount,
      0,
    ),
  );
  protected readonly monthLabel = computed(() => {
    const [year, month] = this.period().split('-').map(Number);
    return formatDate(new Date(year, month - 1, 1), "MMMM 'de' y", this.locale);
  });
}
