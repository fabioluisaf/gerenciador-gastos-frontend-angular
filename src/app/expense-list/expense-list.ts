import { afterNextRender, afterRenderEffect, Component, computed, DestroyRef, ElementRef, inject, Injector, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Subscription } from 'rxjs';
import { NgStyle } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import {
  LucideArrowLeftRight,
  LucideBarcode,
  LucideCheck,
  LucideCircle,
  LucideCircleCheck,
  LucideClock,
  LucideCreditCard,
  LucideLandmark,
  LucidePencil,
  LucideQrCode,
  LucideTrash2,
  LucideWallet,
  LucideX,
} from '@lucide/angular';
import { formatCurrency, formatExpenseDate, invoiceIsPastDue, MONTHS } from '../expense-utils';
import { Expense, ExpensePeriod, SelectedExpenseFilter } from '../expense-models';
import { ExpenseApi } from '../expense-api';
import { Card } from '../shared/card';
import { institutionIcon, paymentMethodIcon, paymentTagStyles } from '../shared/payment-appearance';
import { BackdropClick } from '../shared/backdrop-click';

@Component({
  selector: 'app-expense-list',
  host: { '(window:resize)': 'requestVisiblePages()' },
  imports: [
    Card,
    BackdropClick,
    NgStyle,
    RouterOutlet,
    LucideArrowLeftRight,
    LucideBarcode,
    LucideCheck,
    LucideCircle,
    LucideCircleCheck,
    LucideClock,
    LucideCreditCard,
    LucideLandmark,
    LucidePencil,
    LucideQrCode,
    LucideTrash2,
    LucideWallet,
    LucideX,
  ],
  templateUrl: './expense-list.html',
  styleUrl: './expense-list.css',
})
export class ExpenseList {
  readonly expenses = input.required<readonly Expense[]>();
  readonly period = input.required<ExpensePeriod>();
  readonly scrollContainer = input.required<HTMLElement>();
  readonly loading = input(false);
  readonly failed = input(false);
  readonly ready = input(true);
  readonly pagesRequested = output<number>();
  readonly retry = output<void>();
  readonly filterSelected = output<SelectedExpenseFilter>();
  readonly deleted = output<void>();
  readonly editRequested = output<Expense>();
  protected readonly detailLoading = signal(false);
  protected readonly detailFailed = signal(false);
  private detailSubscription?: Subscription;
  protected readonly pendingDeletion = signal<Expense | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deletionError = signal(false);
  protected readonly deletionNotice = signal('');
  protected readonly invoiceLabel = computed(() =>
    `${MONTHS[this.period().month]} de ${this.period().year}`,
  );
  protected readonly selectedExpense = signal<Expense | null>(null);
  protected readonly formatCurrency = formatCurrency;
  protected readonly institutionIcon = institutionIcon;
  protected readonly paymentMethodIcon = paymentMethodIcon;
  protected readonly paymentTagStyles = paymentTagStyles;
  private readonly expenseDialog = viewChild.required<ElementRef<HTMLDialogElement>>('expenseDialog');
  private readonly deleteDialog = viewChild.required<ElementRef<HTMLDialogElement>>('deleteDialog');
  private readonly api = inject(ExpenseApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly tableContainer = viewChild.required<ElementRef<HTMLElement>>('tableContainer');
  private scrollResetPending = false;

  constructor() {
    afterRenderEffect(() => {
      this.expenses();
      if (this.scrollResetPending) {
        this.scrollContainer().scrollTop = 0;
        this.scrollResetPending = false;
      }
      this.requestVisiblePages();
    });
  }

  resetScroll(): void {
    this.scrollResetPending = true;
  }

  requestVisiblePages(): void {
    const container = this.tableContainer().nativeElement;
    const row = container.querySelector('tbody tr:not(.empty-row)')?.getBoundingClientRect();
    const viewport = this.scrollContainer();
    if (!row?.height || !viewport.clientHeight) {
      return;
    }

    const visibleEnd = viewport.getBoundingClientRect().top + viewport.clientTop + viewport.clientHeight - row.top;
    if (visibleEnd > 0) {
      this.pagesRequested.emit(Math.ceil(visibleEnd / row.height / 10) + 1);
    }
  }

  protected formatDate(expense: Expense, day = expense.day, monthOffset = 0): string {
    return day == null ? 'Sem data' : formatExpenseDate(day, expense.year, expense.month, monthOffset);
  }

  protected formatInvoiceMonth(year: number, month: number): string {
    return `${MONTHS[month].slice(0, 3)}/${year}`;
  }

  protected invoiceIsPastDue(expense: Expense, year: number, month: number, closingDate?: string): boolean {
    return invoiceIsPastDue(year, month, closingDate ? Number(closingDate.slice(8, 10)) : expense.invoiceClosingDay);
  }

  protected filterCategory(expense: Expense): void {
    this.expenseDialog().nativeElement.close();
    this.filterSelected.emit({ field: 'category', value: expense.category, label: expense.category });
  }

  protected filterPaymentMethod(expense: Expense): void {
    if (!expense.paymentId) {
      this.detailFailed.set(true);
      return;
    }
    this.expenseDialog().nativeElement.close();
    this.filterSelected.emit({
      field: 'paymentMethod',
      value: expense.paymentId,
      label: expense.paymentName,
      payment: { institution: expense.institution, paymentMethod: expense.paymentMethod },
    });
  }

  protected openExpense(expense: Expense): void {
    this.selectedExpense.set(expense);
    this.loadDetail(expense);
    afterNextRender(() => {
      const dialog = this.expenseDialog().nativeElement;
      if (!dialog.open) {
        dialog.showModal();
      }
    }, { injector: this.injector });
  }

  protected loadDetail(expense: Expense): void {
    this.detailSubscription?.unsubscribe();
    this.detailLoading.set(true);
    this.detailFailed.set(false);
    this.detailSubscription = this.api.getExpense(expense).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.detailLoading.set(false)),
    ).subscribe({
      next: (detail) => this.selectedExpense.set(detail),
      error: () => this.detailFailed.set(true),
    });
  }

  protected closeDetail(): void {
    this.detailSubscription?.unsubscribe();
    this.selectedExpense.set(null);
  }

  protected editExpense(expense: Expense): void {
    if (this.expenseDialog().nativeElement.open) this.expenseDialog().nativeElement.close();
    this.editRequested.emit(expense);
  }

  protected requestDeletion(expense: Expense): void {
    this.pendingDeletion.set(expense);
    this.deletionError.set(false);
    this.deletionNotice.set('');
    afterNextRender(() => {
      this.deleteDialog().nativeElement.showModal();
    }, { injector: this.injector });
  }

  protected confirmDeletion(): void {
    const expense = this.pendingDeletion();
    if (!expense || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.deletionError.set(false);
    this.api.deleteExpense(expense).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.deleting.set(false)),
    ).subscribe({
      next: () => {
        this.deleteDialog().nativeElement.close();
        if (this.expenseDialog().nativeElement.open) this.expenseDialog().nativeElement.close();
        this.deletionNotice.set(expense.installment ? 'Compra parcelada excluída.' : 'Gasto excluído.');
        this.deleted.emit();
        this.scrollContainer().focus({ preventScroll: true });
      },
      error: () => this.deletionError.set(true),
    });
  }
}
