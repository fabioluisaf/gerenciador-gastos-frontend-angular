import { Component, computed, DestroyRef, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { NgStyle, NgTemplateOutlet } from '@angular/common';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import { LucideCheck, LucideX } from '@lucide/angular';
import { ExpenseApi, PAYMENT_LABELS, periodParameter } from '../expense-api';
import { Expense, ExpensePeriod, ExpenseTotal, PaymentType } from '../expense-models';
import { BackdropClick } from '../shared/backdrop-click';
import { formatCurrency, formatExpenseDate, formatInvoiceMonth } from '../expense-utils';
import { DateSelector } from '../shared/date-selector';
import { PaymentLabel } from '../shared/payment-label';
import { paymentTagStyles } from '../shared/payment-appearance';
import { DialogAppendix } from '../shared/dialog-appendix';

@Component({
  selector: 'app-expense-editor',
  imports: [ReactiveFormsModule, NgStyle, NgTemplateOutlet, PaymentLabel, DateSelector, DialogAppendix, LucideCheck, LucideX, BackdropClick],
  templateUrl: './expense-editor.html',
  styleUrls: ['../shared/expense-dialog.css', '../period-selector/month-selector.css', './expense-editor.css'],
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
  protected readonly formatCurrency = formatCurrency;
  protected readonly paymentTagStyles = paymentTagStyles;
  protected readonly creationTabs = [
    { value: 'expense', label: 'Gasto' },
    { value: 'payment', label: 'Método de pagamento' },
  ] as const;
  protected readonly paymentTypes: readonly PaymentType[] = ['CREDITO', 'DEBITO', 'PIX', 'BOLETO', 'DOC', 'TED'];
  protected readonly paymentRequest = rxResource({
    params: () => this.opened() ? true : undefined,
    stream: () => this.api.getPaymentMethods(),
  });
  protected readonly installmentAmounts = this.fb.array<string>([]);
  private readonly cachedInstallments: FormControl<string>[] = [];
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
    installments: this.installmentAmounts,
  });
  protected readonly paymentForm = this.fb.group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    type: this.fb.control<PaymentType>('CREDITO'),
    institution: this.fb.control<'NUBANK' | 'CAIXA'>('NUBANK'),
    closingDay: this.fb.control<number | null>(null),
    dueDay: this.fb.control<number | null>(null),
  });
  private readonly parcelled = toSignal(this.expenseForm.controls.parcelled.valueChanges, { initialValue: false });
  protected readonly visiblePaymentMethods = computed(() => {
    if (!this.paymentRequest.hasValue()) return [];
    const methods = this.paymentRequest.value();
    return this.parcelled() ? methods.filter((method) => method.type === 'CREDITO') : methods;
  });

  protected get selectedPayment() {
    return this.paymentRequest.hasValue()
      ? this.paymentRequest.value().find((method) => method.value === this.expenseForm.controls.paymentId.value)
      : undefined;
  }

  protected get installmentSummary() {
    const values = this.installmentAmounts.getRawValue();
    const manual = values.some((value) => value !== '');
    const partial = manual && values.some((value) => value === '');
    const amounts = values.map((value) => value === '' ? 0 : this.cents(value));
    const sum = amounts.some((value) => value === null) ? null
      : amounts.reduce<number>((total, value) => total + (value ?? 0), 0);
    const total = this.cents(this.expenseForm.controls.amount.value);
    const validSum = sum !== null && Number.isSafeInteger(sum) ? sum : null;
    return {
      manual, partial, sum: validSum, total,
      difference: validSum !== null && total !== null ? Math.abs(total - validSum) : null,
      matches: validSum !== null && total !== null && validSum === total,
    };
  }

  protected get installmentInvoices(): readonly string[] {
    const { invoicePeriod, date } = this.expenseForm.getRawValue();
    let firstIndex: number;
    if (invoicePeriod) {
      const [year, month] = invoicePeriod.split('-').map(Number);
      firstIndex = year * 12 + month - 1;
    } else {
      const iso = this.isoDate(date);
      const closingDay = this.selectedPayment?.closingDay;
      if (!iso || !closingDay) return this.installmentAmounts.controls.map(() => '—');
      const [year, month, day] = iso.split('-').map(Number);
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const offset = day >= Math.min(closingDay, lastDay) ? 1 : 0;
      firstIndex = year * 12 + month - 1 + offset;
    }
    return this.installmentAmounts.controls.map((_, index) => {
      const current = firstIndex + index;
      return formatInvoiceMonth(Math.floor(current / 12), current % 12);
    });
  }

  protected clearInstallmentAmounts(): void {
    for (const control of this.cachedInstallments) control.setValue('', { emitEvent: false });
    this.installmentAmounts.updateValueAndValidity();
    this.expenseForm.markAsDirty();
  }

  private cents(value: string): number | null {
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(value)) return null;
    const [whole, fraction = ''] = value.replace(',', '.').split('.');
    const amount = Number(whole + fraction.padEnd(2, '0'));
    return Number.isSafeInteger(amount) ? amount : null;
  }

  private syncInstallments(): void {
    const { parcelled, quantity } = this.expenseForm.getRawValue();
    if (parcelled && (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000)) return;
    const count = parcelled ? quantity : 0;
    while (this.installmentAmounts.length > count) this.installmentAmounts.removeAt(this.installmentAmounts.length - 1, { emitEvent: false });
    while (this.installmentAmounts.length < count) {
      const index = this.installmentAmounts.length;
      this.cachedInstallments[index] ??= this.fb.control('', {
        validators: [(control) => control.value === '' || this.cents(control.value) !== null ? null : { amount: true }],
      });
      this.installmentAmounts.push(this.cachedInstallments[index], { emitEvent: false });
    }
    this.installmentAmounts.updateValueAndValidity({ emitEvent: false });
  }

  constructor() {
    this.expenseForm.addValidators(() => {
      const value = this.expenseForm.getRawValue();
      const payment = this.selectedPayment;
      const errors: ValidationErrors = {};
      if (!payment || (value.parcelled && payment.type !== 'CREDITO')) errors['paymentId'] = true;
      if (((value.realized || value.parcelled) && !value.date) ||
        (value.date && !this.isoDate(value.date))) errors['date'] = true;
      if (value.parcelled && (!Number.isInteger(value.quantity) || value.quantity < 1 || value.quantity > 1000)) errors['quantity'] = true;
      const summary = this.installmentSummary;
      if (value.parcelled && summary.manual && (summary.partial || !summary.matches)) errors['installments'] = true;
      if (payment?.type === 'CREDITO' && !value.date && !value.invoicePeriod) errors['invoicePeriod'] = true;
      if (!Number.isSafeInteger(Math.round(Number(value.amount.replace(',', '.')) * 100))) errors['amount'] = true;
      return Object.keys(errors).length ? errors : null;
    });
    this.paymentForm.addValidators(() => {
      const value = this.paymentForm.getRawValue();
      const errors: ValidationErrors = {};
      if (value.type === 'CREDITO') {
        for (const field of ['closingDay', 'dueDay'] as const) {
          const day = value[field];
          if (day === null || !Number.isInteger(day) || day < 1 || day > 31) errors[field] = true;
        }
      }
      return Object.keys(errors).length ? errors : null;
    });
    this.expenseForm.controls.parcelled.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((parcelled) => {
      const payment = this.selectedPayment;
      if (parcelled && payment && payment.type !== 'CREDITO') this.expenseForm.controls.paymentId.setValue('');
      this.syncInstallments();
    });
    this.expenseForm.controls.quantity.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncInstallments());
  }

  openCreate(trigger: HTMLButtonElement): void {
    this.reset();
    this.editing.set(false);
    this.currentExpense.set(undefined);
    const now = new Date();
    this.expenseForm.reset({
      name: '', amount: '', category: '', paymentId: '', description: '',
      date: formatExpenseDate(now.getDate(), now.getFullYear(), now.getMonth()),
      realized: true, invoicePeriod: '', parcelled: false, quantity: 1,
    });
    this.paymentForm.reset({ name: '', type: 'CREDITO', institution: 'NUBANK', closingDay: null, dueDay: null });
    const bounds = trigger.getBoundingClientRect();
    const style = this.dialog().nativeElement.style;
    style.left = `${bounds.left}px`;
    style.top = `${bounds.top}px`;
    style.maxWidth = `calc(100vw - ${bounds.left}px - 1rem)`;
    style.setProperty('--editor-dialog-top', `${bounds.top}px`);
    style.setProperty('--dialog-appendix-width', `${bounds.width}px`);
    style.setProperty('--dialog-appendix-height', `${bounds.height}px`);
    this.show();
    this.creationOpen.emit(true);
  }

  openEdit(expense: Expense): void {
    this.reset();
    this.editing.set(true);
    this.currentExpense.set(expense);
    this.show();
    this.loadDetail(expense);
  }

  private show(): void {
    this.opened.set(true);
    this.dialog().nativeElement.showModal();
  }

  private reset(): void {
    for (const property of ['left', 'top', 'max-width', '--editor-dialog-top', '--dialog-appendix-width', '--dialog-appendix-height']) {
      this.dialog().nativeElement.style.removeProperty(property);
    }
    this.installmentAmounts.clear({ emitEvent: false });
    this.cachedInstallments.length = 0;
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
        const first = detail.purchase?.installments.find((item) => item.number === 1);
        this.expenseForm.reset({
          name: detail.name, amount: ((detail.purchase?.amountInCents ?? detail.amountInCents) / 100).toFixed(2),
          category: detail.category, paymentId: detail.paymentId ?? '',
          description: detail.description, realized: detail.realized, parcelled: !!detail.installment,
          quantity: detail.purchase?.quantity ?? 1,
          date: first ? first.date.split('-').reverse().join('/')
            : detail.day == null ? '' : formatExpenseDate(detail.day, detail.year, detail.month),
          invoicePeriod: first ? periodParameter(first) : detail.invoicePeriod ?? '',
        });
        this.syncInstallments();
        for (const item of detail.purchase?.installments ?? []) {
          this.installmentAmounts.at(item.number - 1)?.setValue((item.amountInCents / 100).toFixed(2), { emitEvent: false });
        }
        this.expenseForm.updateValueAndValidity();
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

  protected isoDate(value: string): string {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return '';
    const iso = value.split('/').reverse().join('-');
    const date = new Date(`${iso}T00:00:00Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso || iso.startsWith('0000')
      ? '' : iso;
  }

  protected selectDate(value: string): void {
    this.expenseForm.controls.date.setValue(value.split('-').reverse().join('/'));
    this.expenseForm.controls.date.markAsDirty();
  }

  protected expenseInvalid(field: keyof typeof this.expenseForm.controls): boolean {
    return this.submitted() && (this.expenseForm.controls[field].invalid || !!this.expenseForm.errors?.[field]);
  }

  protected paymentInvalid(field: keyof typeof this.paymentForm.controls): boolean {
    return this.submitted() && (this.paymentForm.controls[field].invalid || !!this.paymentForm.errors?.[field]);
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
      metodoPagamentoId: value.paymentId, data: this.isoDate(value.date) || null, descricao: value.description.trim(),
      realizado: value.realized, parcelado: value.parcelled, quantidadeParcelas: value.quantity,
      ...(value.parcelled && this.installmentSummary.manual ? {
        valoresParcelas: value.installments.map((amount) => this.cents(amount)! / 100),
      } : {}),
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
