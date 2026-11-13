import { afterNextRender, afterRenderEffect, Component, computed, ElementRef, inject, Injector, input, output, signal, viewChild } from '@angular/core';
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
  LucideQrCode,
  LucideWallet,
  LucideX,
} from '@lucide/angular';
import { closeOnBackdrop, formatCurrency, formatExpenseDate, invoiceIsPastDue, MONTHS } from '../expense-utils';
import { Expense, ExpensePeriod, SelectedExpenseFilter } from '../expense-models';
import { Card } from '../shared/card';
import { institutionIcon, paymentMethodIcon, paymentTagStyles } from '../shared/payment-appearance';

@Component({
  selector: 'app-expense-list',
  host: { '(window:resize)': 'requestVisiblePages()' },
  imports: [
    Card,
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
    LucideQrCode,
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
  protected readonly invoiceLabel = computed(() =>
    `${MONTHS[this.period().month]} de ${this.period().year}`,
  );
  protected readonly selectedExpense = signal<Expense | null>(null);
  protected readonly formatCurrency = formatCurrency;
  protected readonly closeOnBackdrop = closeOnBackdrop;
  protected readonly institutionIcon = institutionIcon;
  protected readonly paymentMethodIcon = paymentMethodIcon;
  protected readonly paymentTagStyles = paymentTagStyles;
  private readonly expenseDialog = viewChild.required<ElementRef<HTMLDialogElement>>('expenseDialog');
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

  openFirstExpense(): void {
    const expense = this.expenses()[0];
    if (expense) {
      this.openExpense(expense);
    }
  }

  protected formatDate(expense: Expense, day = expense.day, monthOffset = 0): string {
    return day == null ? 'Sem data' : formatExpenseDate(day, expense.year, expense.month, monthOffset);
  }

  protected installmentSchedule(expense: Expense): readonly { number: number; year: number; month: number }[] {
    const installment = expense.installment;
    if (!installment) {
      return [];
    }

    const currentInvoiceMonth = expense.year * 12 + expense.month + (expense.invoiceMonthOffset ?? 0);
    const firstInvoiceMonth = currentInvoiceMonth - installment.number + 1;
    return Array.from({ length: installment.quantity }, (_, index) => {
      const month = firstInvoiceMonth + index;
      return { number: index + 1, year: Math.floor(month / 12), month: month % 12 };
    });
  }

  protected formatInvoiceMonth(year: number, month: number): string {
    return `${MONTHS[month].slice(0, 3)}/${year}`;
  }

  protected invoiceIsPastDue(expense: Expense, year: number, month: number): boolean {
    return invoiceIsPastDue(year, month, expense.invoiceClosingDay);
  }

  protected filterCategory(expense: Expense): void {
    this.expenseDialog().nativeElement.close();
    this.filterSelected.emit({ field: 'category', value: expense.category, label: expense.category });
  }

  protected filterPaymentMethod(expense: Expense): void {
    this.expenseDialog().nativeElement.close();
    this.filterSelected.emit({
      field: 'paymentName',
      value: expense.paymentName,
      label: expense.paymentName,
      payment: { institution: expense.institution, paymentMethod: expense.paymentMethod },
    });
  }

  protected openExpense(expense: Expense): void {
    this.selectedExpense.set(expense);
    afterNextRender(() => {
      const dialog = this.expenseDialog().nativeElement;
      if (!dialog.open) {
        dialog.showModal();
      }
    }, { injector: this.injector });
  }
}
