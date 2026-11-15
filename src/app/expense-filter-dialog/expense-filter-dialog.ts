import { Component, input, output, signal } from '@angular/core';
import { LucideFunnel } from '@lucide/angular';
import { ExpenseTotal, ExpenseTotals, PaymentOption, SelectedExpenseFilter } from '../expense-models';
import { DialogAppendix } from '../shared/dialog-appendix';
import { PaymentOptions } from '../shared/payment-options';
import { BackdropClick } from '../shared/backdrop-click';

@Component({
  selector: 'app-expense-filter-dialog',
  imports: [
    DialogAppendix, PaymentOptions, LucideFunnel, BackdropClick,
  ],
  templateUrl: './expense-filter-dialog.html',
  styleUrl: './expense-filter-dialog.css',
})
export class ExpenseFilterDialog {
  readonly totals = input<ExpenseTotals>();
  readonly loading = input(false);
  readonly failed = input(false);
  readonly disabled = input(false);
  readonly selectedFilter = input<SelectedExpenseFilter | null>(null);
  readonly filterSelected = output<SelectedExpenseFilter>();
  readonly retry = output<void>();
  protected readonly opened = signal(false);

  protected open(dialog: HTMLDialogElement, trigger: HTMLButtonElement): void {
    const bounds = trigger.getBoundingClientRect();
    dialog.style.left = `${bounds.left - 1}px`;
    dialog.style.top = `${bounds.top - 1}px`;
    dialog.style.maxWidth = `calc(100vw - ${bounds.left}px - 1rem)`;
    dialog.style.setProperty('--filter-dialog-top', `${bounds.top}px`);
    dialog.showModal();
    this.opened.set(true);
  }

  protected isSelected(field: SelectedExpenseFilter['field'], value: string): boolean {
    return this.selectedFilter()?.field === field && this.selectedFilter()?.value === value;
  }

  protected selectPayment(total: PaymentOption, dialog: HTMLDialogElement): void {
    this.filterSelected.emit({
      field: 'paymentMethod', value: total.value, label: total.name,
      payment: { institution: total.institution, paymentMethod: total.paymentMethod },
    });
    dialog.close();
  }

  protected selectCategory(total: ExpenseTotal, dialog: HTMLDialogElement): void {
    this.filterSelected.emit({ field: 'category', value: total.value, label: total.name });
    dialog.close();
  }
}
