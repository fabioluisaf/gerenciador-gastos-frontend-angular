import { Component, computed, DestroyRef, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import { LucideX } from '@lucide/angular';
import { ExpenseApi, PAYMENT_LABELS, periodParameter } from '../expense-api';
import { Expense, ExpensePeriod, ExpenseTotal, PaymentType } from '../expense-models';
import { DialogAppendix } from '../shared/dialog-appendix';
import { PaymentOptions } from '../shared/payment-options';
import { BackdropClick } from '../shared/backdrop-click';

@Component({
  selector: 'app-expense-editor',
  imports: [ReactiveFormsModule, DialogAppendix, PaymentOptions, LucideX, BackdropClick],
  templateUrl: './expense-editor.html',
  styleUrl: './expense-editor.css',
})
export class ExpenseEditor {
  readonly period = input.required<ExpensePeriod>();
  readonly categories = input<readonly ExpenseTotal[]>([]);
  readonly categoriesLoading = input(false);
  readonly categoriesFailed = input(false);
  readonly retryCategories = output<void>();
  readonly saved = output<void>();
  readonly creationOpen = output<boolean>();
  private readonly api = inject(ExpenseApi);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('editorDialog');
  private detailSubscription?: Subscription;
  protected readonly opened = signal(false);
  protected readonly editing = signal(false);
  protected readonly tab = signal<'expense' | 'payment'>('expense');
  protected readonly currentExpense = signal<Expense | undefined>(undefined);
  protected readonly detailLoading = signal(false);
  protected readonly detailFailed = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveFailed = signal(false);
  protected readonly submitted = signal(false);
  protected readonly notice = signal('');
  protected readonly paymentLabels = PAYMENT_LABELS;
  protected readonly paymentTypes: readonly PaymentType[] = ['CREDITO', 'DEBITO', 'PIX', 'BOLETO', 'DOC', 'TED'];
  protected readonly paymentRequest = rxResource({
    params: () => this.opened() ? true : undefined,
    stream: () => this.api.getPaymentMethods(),
  });
  protected readonly visiblePaymentMethods = computed(() => {
    if (!this.paymentRequest.hasValue()) return [];
    const methods = this.paymentRequest.value();
    return this.editing() && this.currentExpense()?.installment
      ? methods.filter((method) => method.type === 'CREDITO')
      : methods;
  });
  protected readonly expenseForm = this.fb.group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    amount: ['', [Validators.required, Validators.pattern(/^\d+(?:[.,]\d{1,2})?$/)]],
    category: ['', [Validators.required, Validators.pattern(/\S/)]],
    paymentId: ['', Validators.required],
    date: [''],
    invoicePeriod: [''],
    description: [''],
    realized: [true],
    parcelled: [false],
    quantity: [1],
  });
  protected readonly paymentForm = this.fb.group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    type: this.fb.control<PaymentType>('CREDITO'),
    institution: this.fb.control<'NUBANK' | 'CAIXA'>('NUBANK'),
    closingDay: this.fb.control<number | null>(null),
    dueDay: this.fb.control<number | null>(null),
  });

  protected get selectedPayment() {
    return this.paymentRequest.hasValue()
      ? this.paymentRequest.value().find((method) => method.value === this.expenseForm.controls.paymentId.value)
      : undefined;
  }

  constructor() {
    this.expenseForm.addValidators(() => {
      const value = this.expenseForm.getRawValue();
      const payment = this.selectedPayment;
      if (!payment || ((value.realized || value.parcelled) && !value.date) ||
        (value.parcelled && (payment.type !== 'CREDITO' || !Number.isInteger(value.quantity) || value.quantity < 1)) ||
        (payment.type === 'CREDITO' && !value.date && !value.invoicePeriod) ||
        !Number.isSafeInteger(Math.round(Number(value.amount.replace(',', '.')) * 100))) {
        return { expenseFields: true };
      }
      return null;
    });
    this.paymentForm.addValidators(() => {
      const value = this.paymentForm.getRawValue();
      return value.type === 'CREDITO' && [value.closingDay, value.dueDay]
        .some((day) => day === null || !Number.isInteger(day) || day < 1 || day > 31)
        ? { creditDays: true } : null;
    });
  }

  openCreate(trigger: HTMLButtonElement): void {
    this.reset();
    this.editing.set(false);
    this.currentExpense.set(undefined);
    const now = new Date();
    this.expenseForm.reset({
      name: '', amount: '', category: '', paymentId: '', description: '',
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      realized: true, invoicePeriod: '', parcelled: false, quantity: 1,
    });
    this.paymentForm.reset({ name: '', type: 'CREDITO', institution: 'NUBANK', closingDay: null, dueDay: null });
    const dialog = this.dialog().nativeElement;
    const bounds = trigger.getBoundingClientRect();
    dialog.style.left = `${bounds.left}px`;
    dialog.style.top = `${bounds.top}px`;
    dialog.style.maxWidth = `calc(100vw - ${bounds.left}px - 1rem)`;
    dialog.style.setProperty('--editor-top', `${bounds.top}px`);
    dialog.style.setProperty('--dialog-appendix-width', `${bounds.width}px`);
    dialog.style.setProperty('--dialog-appendix-height', `${bounds.height}px`);
    dialog.classList.add('create-dialog');
    this.show();
    this.creationOpen.emit(true);
  }

  openEdit(expense: Expense): void {
    this.reset();
    this.editing.set(true);
    this.currentExpense.set(expense);
    const dialog = this.dialog().nativeElement;
    dialog.removeAttribute('style');
    dialog.classList.remove('create-dialog');
    this.show();
    this.loadDetail(expense);
  }

  private show(): void {
    this.opened.set(true);
    this.dialog().nativeElement.showModal();
  }

  private reset(): void {
    this.tab.set('expense');
    this.submitted.set(false);
    this.saveFailed.set(false);
    this.detailFailed.set(false);
    this.notice.set('');
  }

  protected loadDetail(expense: Expense): void {
    this.detailSubscription?.unsubscribe();
    this.detailLoading.set(true);
    this.detailFailed.set(false);
    this.detailSubscription = this.api.getExpense(expense).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.detailLoading.set(false)),
    ).subscribe({
      next: (detail) => {
        this.currentExpense.set(detail);
        const first = detail.purchase?.installments[0];
        this.expenseForm.reset({
          name: detail.name, amount: ((detail.purchase?.amountInCents ?? detail.amountInCents) / 100).toFixed(2),
          category: detail.category, paymentId: detail.paymentId ?? '',
          description: detail.description, realized: detail.realized, parcelled: !!detail.installment,
          quantity: detail.purchase?.quantity ?? 1,
          date: first?.date ?? (detail.day == null ? '' : periodParameter(detail) + '-' + String(detail.day).padStart(2, '0')),
          invoicePeriod: first ? periodParameter(first) : detail.invoicePeriod ?? '',
        });
      },
      error: () => this.detailFailed.set(true),
    });
  }

  protected switchTab(tab: 'expense' | 'payment'): void {
    this.tab.set(tab);
    this.submitted.set(false);
    this.saveFailed.set(false);
    this.notice.set('');
  }

  protected close(): void {
    if (!this.saving()) this.dialog().nativeElement.close();
  }

  protected onClose(): void {
    this.detailSubscription?.unsubscribe();
    this.opened.set(false);
    this.creationOpen.emit(false);
  }

  protected submit(): void {
    if (this.saving() || this.detailLoading() || this.detailFailed() || !this.paymentRequest.hasValue()) return;
    this.submitted.set(true);
    this.saveFailed.set(false);
    if (this.tab() === 'payment') {
      this.paymentForm.updateValueAndValidity();
      if (this.paymentForm.invalid) return;
      const value = this.paymentForm.getRawValue();
      this.saving.set(true);
      this.api.createPaymentMethod({
        nome: value.name.trim(), tipo: value.type, instituicaoFinanceira: value.institution,
        diaFechamento: value.type === 'CREDITO' ? value.closingDay : null,
        diaVencimento: value.type === 'CREDITO' ? value.dueDay : null,
      }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false))).subscribe({
        next: (method) => {
          this.expenseForm.patchValue({ paymentId: method.value });
          this.paymentForm.reset();
          this.paymentRequest.reload();
          this.switchTab('expense');
          this.notice.set('Método de pagamento cadastrado.');
        },
        error: () => this.saveFailed.set(true),
      });
      return;
    }
    this.expenseForm.updateValueAndValidity();
    if (this.expenseForm.invalid) return;
    const value = this.expenseForm.getRawValue();
    this.saving.set(true);
    this.api.saveExpense({
      nome: value.name.trim(), valor: Number(value.amount.replace(',', '.')), categoria: value.category.trim(),
      metodoPagamentoId: value.paymentId, data: value.date || null, descricao: value.description.trim(),
      realizado: value.realized, parcelado: value.parcelled, quantidadeParcelas: value.quantity,
      faturaPeriodo: this.selectedPayment?.type === 'CREDITO' ? value.invoicePeriod || null : null,
    }, this.editing() ? this.currentExpense() : undefined)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false))).subscribe({
        next: () => {
          this.dialog().nativeElement.close();
          this.saved.emit();
        },
        error: () => this.saveFailed.set(true),
      });
  }
}
