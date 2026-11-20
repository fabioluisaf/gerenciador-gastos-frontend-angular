import { CurrencyPipe, DOCUMENT, formatDate, NgOptimizedImage } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  LOCALE_ID,
  output,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  LucideChevronDown,
  LucideCircle,
  LucideCircleCheck,
  LucideCircleDot,
  LucideTrash2,
} from '@lucide/angular';
import { SwipeActions } from '../../shared/swipe-actions/swipe-actions';
import { Expense, PAYMENT_TYPE_LABELS } from '../expense';
import { ActionsMenu } from '../../shared/actions-menu/actions-menu';
import { ExpensesApi } from '../expenses-api';
import { todayIsoDate } from '../timeline';

let nextId = 0;

type InstallmentStatus = 'paid' | 'current' | 'future';

const STATUS_LABELS: Readonly<Record<InstallmentStatus, string>> = {
  paid: 'Paga',
  current: 'Fatura atual',
  future: 'Futura',
};

function statusOf(paid: boolean, current: boolean): InstallmentStatus {
  if (paid) {
    return 'paid';
  }
  return current ? 'current' : 'future';
}

function isCut(element: HTMLElement | null): boolean {
  return !!element && element.scrollWidth > element.clientWidth;
}

@Component({
  selector: 'app-expense-card',
  imports: [
    CurrencyPipe,
    ActionsMenu,
    NgOptimizedImage,
    LucideChevronDown,
    LucideCircle,
    LucideCircleCheck,
    LucideCircleDot,
    LucideTrash2,
    SwipeActions,
  ],
  templateUrl: './expense-card.html',
  styleUrl: './expense-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.planned]': '!expense().realized',
    '[class.expandable]': 'expandable()',
    '(click)': 'onClick()',
  },
})
export class ExpenseCard {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly api = inject(ExpensesApi);
  private readonly locale = inject(LOCALE_ID);
  private readonly view = inject(DOCUMENT).defaultView;

  readonly expense = input.required<Expense>();
  readonly deleteRequested = output<void>();

  protected readonly detailsId = `gasto-detalhes-${nextId++}`;
  protected readonly expanded = signal(false);
  private readonly textCut = signal(false);
  private readonly installmentsRequested = signal(false);
  private readonly today = todayIsoDate();

  protected readonly paymentLabel = computed(() => PAYMENT_TYPE_LABELS[this.expense().paymentType]);
  protected readonly paymentColor = computed(
    () => `var(--payment-${this.expense().paymentType.toLowerCase()}-border)`,
  );
  protected readonly amount = computed(() => {
    const { amount, installment } = this.expense();
    return installment?.purchaseAmount ?? amount;
  });
  protected readonly isRefund = computed(() => this.amount() < 0);
  protected readonly expandable = computed(
    () => this.expanded() || this.textCut() || this.expense().installment !== null,
  );

  private readonly installmentParts = rxResource({
    params: () =>
      this.installmentsRequested() ? this.expense().installment?.purchaseId : undefined,
    stream: ({ params }) => this.api.listInstallments(params),
  });

  protected readonly installmentsLoading = this.installmentParts.isLoading;
  protected readonly installmentsFailed = computed(() => !!this.installmentParts.error());
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly installments = computed(() => {
    const parts = this.installmentParts.hasValue() ? this.installmentParts.value() : [];
    const isPaid = (dueDate: string | null) => !!dueDate && dueDate <= this.today;
    const current = parts.find((part) => !isPaid(part.invoiceDueDate));
    return parts.map((part) => ({
      ...part,
      status: statusOf(isPaid(part.invoiceDueDate), part === current),
      invoiceLabel: part.invoiceDueDate
        ? formatDate(`${part.invoiceDueDate}T00:00`, 'MMM y', this.locale).replaceAll('.', '')
        : 'Sem fatura',
    }));
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.measureText();
      if (!this.view?.ResizeObserver) {
        return;
      }
      const observer = new this.view.ResizeObserver(() => this.measureText());
      observer.observe(this.host.nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected onClick(): void {
    if (!this.expandable() || this.view?.getSelection()?.toString()) {
      return;
    }
    this.expanded.update((expanded) => !expanded);
    if (this.expanded()) {
      this.installmentsRequested.set(true);
    }
  }

  private measureText(): void {
    if (this.expanded()) {
      return;
    }
    const element = this.host.nativeElement;
    this.textCut.set(
      isCut(element.querySelector('.name')) || isCut(element.querySelector('.description')),
    );
  }
}
