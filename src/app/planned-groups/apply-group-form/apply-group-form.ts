import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  LOCALE_ID,
  output,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideCalendar, LucideCreditCard } from '@lucide/angular';
import { todayIsoDate } from '../../expenses/timeline';
import { PaymentMethod } from '../../payment-methods/payment-method';
import { PaymentMethodPicker } from '../../payment-methods/payment-method-picker/payment-method-picker';
import { PaymentMethodsApi } from '../../payment-methods/payment-methods-api';
import { DateField } from '../../shared/date-field/date-field';
import {
  SegmentedSelector,
  SelectorOption,
} from '../../shared/segmented-selector/segmented-selector';
import { centsFromInput, moveCaretToEnd } from '../amount-input';
import { PlannedGroup } from '../planned-group';
import { PlannedGroupsApi } from '../planned-groups-api';

export type ApplyDestination = 'invoice' | 'date';

interface ReviewItem {
  key: number;
  selected: boolean;
  amountCents: number;
}

let nextId = 0;

@Component({
  selector: 'app-apply-group-form',
  imports: [DateField, LucideCalendar, LucideCreditCard, PaymentMethodPicker, SegmentedSelector],
  templateUrl: './apply-group-form.html',
  styleUrl: './apply-group-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplyGroupForm {
  private readonly api = inject(PlannedGroupsApi);
  private readonly paymentMethodsApi = inject(PaymentMethodsApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly currency = new Intl.NumberFormat(inject(LOCALE_ID), {
    style: 'currency',
    currency: 'BRL',
  });

  readonly group = input.required<PlannedGroup>();
  readonly applied = output<number>();

  protected readonly id = `aplicar-${nextId++}`;
  protected readonly destinationOptions: SelectorOption<ApplyDestination>[] = [
    { value: 'invoice', label: 'Fatura' },
    { value: 'date', label: 'Data' },
  ];

  private readonly methods = rxResource({ stream: () => this.paymentMethodsApi.list() });
  protected readonly methodsFailed = computed(() => this.methods.status() === 'error');

  protected readonly destination = signal<ApplyDestination>('invoice');
  protected readonly invoiceMonth = signal('');
  protected readonly date = signal(todayIsoDate());
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);

  protected readonly visibleMethods = computed(() => {
    const methods = this.methods.hasValue()
      ? [...this.methods.value()].sort((a, b) => b.usageCount - a.usageCount)
      : [];
    return this.destination() === 'invoice'
      ? methods.filter(({ paymentType }) => paymentType === 'CREDITO')
      : methods;
  });
  protected readonly methodId = linkedSignal<PaymentMethod[], string | null>({
    source: () => this.visibleMethods(),
    computation: (methods, previous) =>
      methods.find(({ id }) => id === previous?.value)?.id ?? methods[0]?.id ?? null,
  });

  protected readonly review = linkedSignal<PlannedGroup, ReviewItem[]>({
    source: () => this.group(),
    computation: (group) =>
      group.items.map((item, key) => ({
        key,
        selected: true,
        amountCents: Math.round(item.amount * 100),
      })),
  });
  protected readonly selectedCount = computed(
    () => this.review().filter(({ selected }) => selected).length,
  );
  protected readonly selectedTotal = computed(() =>
    this.formatCents(
      this.review()
        .filter(({ selected }) => selected)
        .reduce((sum, { amountCents }) => sum + amountCents, 0),
    ),
  );

  protected readonly errors = computed(() => ({
    method: this.methodId()
      ? null
      : this.destination() === 'invoice'
        ? 'Cadastre um cartão de crédito para lançar numa fatura.'
        : 'Escolha o método de pagamento.',
    target:
      this.destination() === 'invoice'
        ? this.invoiceMonth()
          ? null
          : 'Escolha o mês da fatura.'
        : this.date()
          ? null
          : 'Escolha a data.',
    items:
      this.selectedCount() === 0
        ? 'Marque pelo menos um gasto.'
        : this.review().some(({ selected, amountCents }) => selected && amountCents === 0)
          ? 'Informe o valor dos gastos marcados.'
          : null,
  }));

  protected formatCents(cents: number): string {
    return this.currency.format(cents / 100);
  }

  protected errorFor(field: 'method' | 'target' | 'items'): string | null {
    return this.submitted() ? this.errors()[field] : null;
  }

  protected toggleItem(index: number, selected: boolean): void {
    this.review.update((items) =>
      items.map((item, position) => (position === index ? { ...item, selected } : item)),
    );
  }

  protected onAmountInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const cents = centsFromInput(input.value);
    this.review.update((items) =>
      items.map((item, position) => (position === index ? { ...item, amountCents: cents } : item)),
    );
    input.value = this.formatCents(cents);
  }

  protected readonly moveCaretToEnd = moveCaretToEnd;

  protected checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected save(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    const method = this.methodId();
    if (Object.values(this.errors()).some(Boolean) || !method) {
      afterNextRender(
        () => this.host.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
        { injector: this.injector },
      );
      return;
    }
    this.saving.set(true);
    this.failed.set(false);
    const groupItems = this.group().items;
    const items = this.review()
      .filter(({ selected }) => selected)
      .map(({ key, amountCents }) => ({ ...groupItems[key], amount: amountCents / 100 }));
    const toInvoice = this.destination() === 'invoice';
    this.api
      .apply(this.group().id, {
        paymentMethodId: method,
        date: toInvoice ? null : this.date(),
        invoicePeriod: toInvoice ? this.invoiceMonth() : null,
        items,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.applied.emit(items.length),
        error: () => {
          this.saving.set(false);
          this.failed.set(true);
        },
      });
  }
}
