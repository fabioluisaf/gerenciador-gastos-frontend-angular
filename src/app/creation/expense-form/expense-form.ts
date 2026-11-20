import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
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
  linkedSignal,
  LOCALE_ID,
  output,
  signal,
  untracked,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideCheck, LucideClock, LucideMinus, LucidePlus } from '@lucide/angular';
import { Expense, ExpenseKind, NewExpense, PAYMENT_TYPE_LABELS } from '../../expenses/expense';
import { ExpensesApi } from '../../expenses/expenses-api';
import { PaymentMethod } from '../../payment-methods/payment-method';
import { PaymentMethodsApi } from '../../payment-methods/payment-methods-api';
import { DateField } from '../../shared/date-field/date-field';
import { DragScroll } from '../../shared/drag-scroll';
import { HorizontalWheelScroll } from '../../shared/horizontal-wheel-scroll';
import {
  SegmentedSelector,
  SelectorOption,
} from '../../shared/segmented-selector/segmented-selector';

const MAX_AMOUNT_DIGITS = 13;
const MAX_INSTALLMENTS = 1000;
const MAX_TEXT_LENGTH = 255;

type Field = 'amount' | 'name' | 'method' | 'date' | 'category';

function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

let nextId = 0;

@Component({
  selector: 'app-expense-form',
  imports: [
    CurrencyPipe,
    DateField,
    DragScroll,
    HorizontalWheelScroll,
    LucideCheck,
    LucideClock,
    LucideMinus,
    LucidePlus,
    NgOptimizedImage,
    SegmentedSelector,
  ],
  templateUrl: './expense-form.html',
  styleUrl: './expense-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseForm {
  private readonly expensesApi = inject(ExpensesApi);
  private readonly paymentMethodsApi = inject(PaymentMethodsApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly currency = new Intl.NumberFormat(inject(LOCALE_ID), {
    style: 'currency',
    currency: 'BRL',
  });

  readonly expense = input<Expense | null>(null);
  readonly saved = output<void>();

  protected readonly id = `gasto-${nextId++}`;
  protected readonly typeLabels = PAYMENT_TYPE_LABELS;
  protected readonly kindOptions: SelectorOption<ExpenseKind>[] = [
    { value: 'realized', label: 'Realizado' },
    { value: 'planned', label: 'Planejado' },
  ];

  private readonly methods = rxResource({ stream: () => this.paymentMethodsApi.list() });
  private readonly categories = rxResource({ stream: () => this.expensesApi.listCategories() });
  private readonly original = rxResource({
    params: () => this.expense() ?? undefined,
    stream: ({ params }) => this.expensesApi.loadForEdit(params),
  });

  protected readonly editing = computed(() => this.expense() !== null);
  protected readonly editingPurchase = computed(() => !!this.expense()?.installment);
  protected readonly loading = computed(() => this.editing() && !this.original.hasValue());
  protected readonly loadFailed = computed(() => this.original.status() === 'error');

  protected readonly amountCents = signal(0);
  protected readonly name = signal('');
  protected readonly kind = signal<ExpenseKind>('realized');
  protected readonly date = signal(today());
  protected readonly installments = signal(1);
  protected readonly invoiceMonth = signal('');
  protected readonly category = signal('');
  protected readonly description = signal('');
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);

  protected readonly methodsByUsage = computed(() =>
    this.methods.hasValue()
      ? [...this.methods.value()].sort((a, b) => b.usageCount - a.usageCount)
      : [],
  );
  protected readonly methodsFailed = computed(() => this.methods.status() === 'error');
  protected readonly methodId = linkedSignal<
    { methods: PaymentMethod[]; preferred: string | null },
    string | null
  >({
    source: () => ({
      methods: this.methodsByUsage(),
      preferred: this.original.hasValue() ? this.original.value().paymentMethodId : null,
    }),
    computation: ({ methods, preferred }, previous) => {
      const available = (id: string | null | undefined) =>
        id ? methods.some((method) => method.id === id) : false;
      if (preferred && previous?.source.preferred !== preferred && available(preferred)) {
        return preferred;
      }
      if (available(previous?.value)) {
        return previous!.value;
      }
      return available(preferred) ? preferred : (methods[0]?.id ?? null);
    },
  });
  protected readonly selectedMethod = computed(
    () => this.methodsByUsage().find(({ id }) => id === this.methodId()) ?? null,
  );
  protected readonly allCategories = computed(() =>
    this.categories.hasValue()
      ? [...this.categories.value()].sort((a, b) =>
          a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }),
        )
      : [],
  );

  protected readonly amountText = computed(() => this.currency.format(this.amountCents() / 100));
  protected readonly isCredit = computed(() => this.selectedMethod()?.paymentType === 'CREDITO');
  protected readonly installmentsAvailable = computed(() =>
    this.editing() ? this.editingPurchase() : this.isCredit(),
  );
  protected readonly effectiveInstallments = computed(() =>
    this.installmentsAvailable() ? this.installments() : 1,
  );
  protected readonly visibleMethods = computed(() =>
    this.editingPurchase() || this.effectiveInstallments() > 1
      ? this.methodsByUsage().filter(({ paymentType }) => paymentType === 'CREDITO')
      : this.methodsByUsage(),
  );
  protected readonly dateOptional = computed(
    () => this.kind() === 'planned' && this.effectiveInstallments() === 1,
  );
  protected readonly installmentAmount = computed(
    () => this.amountCents() / 100 / this.effectiveInstallments(),
  );

  protected readonly errors = computed<Record<Field, string | null>>(() => {
    const name = this.name().trim();
    const category = this.category().trim();
    return {
      amount: this.amountCents() === 0 ? 'Informe o valor.' : null,
      name: name ? null : 'Informe o nome do gasto.',
      method: this.methodId() ? null : 'Escolha o método de pagamento.',
      date: !this.dateOptional() && !this.date() ? 'Informe a data do gasto.' : null,
      category: category ? null : 'Informe a categoria.',
    };
  });

  protected readonly maxTextLength = MAX_TEXT_LENGTH;

  constructor() {
    effect(() => {
      if (this.original.hasValue()) {
        const draft = this.original.value();
        untracked(() => this.apply(draft));
      }
    });
  }

  protected errorFor(field: Field): string | null {
    return this.submitted() ? this.errors()[field] : null;
  }

  protected onAmountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, MAX_AMOUNT_DIGITS);
    this.amountCents.set(Number(digits || '0'));
    input.value = this.amountText();
  }

  protected changeInstallments(step: number): void {
    this.installments.update((count) => Math.min(MAX_INSTALLMENTS, Math.max(1, count + step)));
  }

  protected textValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
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
    const description = this.description().trim();
    const editing = this.expense();
    const changes: NewExpense = {
      name: this.name().trim(),
      amount: this.amountCents() / 100,
      category: this.category().trim(),
      paymentMethodId: method,
      date: this.date() || null,
      description: description || null,
      realized: this.kind() === 'realized',
      installments: this.effectiveInstallments(),
      invoicePeriod: this.isCredit() ? this.invoiceMonth() || null : null,
    };
    (editing ? this.expensesApi.update(editing, changes) : this.expensesApi.create(changes))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.saved.emit(),
        error: () => {
          this.saving.set(false);
          this.failed.set(true);
        },
      });
  }

  private apply(draft: NewExpense): void {
    this.amountCents.set(Math.round(draft.amount * 100));
    this.name.set(draft.name);
    this.kind.set(draft.realized ? 'realized' : 'planned');
    this.date.set(draft.date ?? '');
    this.installments.set(draft.installments);
    this.invoiceMonth.set(draft.invoicePeriod ?? '');
    this.category.set(draft.category);
    this.description.set(draft.description ?? '');
  }
}
