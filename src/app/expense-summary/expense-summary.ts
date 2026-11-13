import { Component, input, output } from '@angular/core';
import { NgStyle } from '@angular/common';
import {
  LucideArrowLeftRight, LucideBarcode, LucideCreditCard, LucideLandmark,
  LucideQrCode, LucideWallet,
} from '@lucide/angular';
import { formatCurrency } from '../expense-utils';
import { ExpenseFilter, ExpenseTotal, SelectedExpenseFilter } from '../expense-models';
import { Card } from '../shared/card';
import {
  institutionIcon, PaymentDetails, paymentMethodIcon, paymentTagStyles,
} from '../shared/payment-appearance';

@Component({
  selector: 'app-expense-summary',
  imports: [
    Card,
    NgStyle,
    LucideArrowLeftRight,
    LucideBarcode,
    LucideCreditCard,
    LucideLandmark,
    LucideQrCode,
    LucideWallet,
  ],
  templateUrl: './expense-summary.html',
  styleUrl: './expense-summary.css',
})
export class ExpenseSummary {
  readonly totals = input.required<readonly ExpenseTotal[]>();
  readonly heading = input.required<string>();
  readonly headingId = input.required<string>();
  readonly filterField = input.required<ExpenseFilter['field']>();
  readonly selectedFilter = input<SelectedExpenseFilter | null>(null);
  readonly filterSelected = output<SelectedExpenseFilter>();
  protected readonly formatCurrency = formatCurrency;
  protected readonly paymentMethodIconForTotal = (total: ExpenseTotal) =>
    paymentMethodIcon(this.paymentDetails(total).paymentMethod);
  protected readonly institutionIconForTotal = (total: ExpenseTotal) =>
    institutionIcon(this.paymentDetails(total));
  protected readonly paymentTagStyles = (total: ExpenseTotal) =>
    paymentTagStyles(this.paymentDetails(total));

  protected isSelected(total: ExpenseTotal): boolean {
    return this.selectedFilter()?.field === this.filterField() &&
      this.selectedFilter()?.value === total.value;
  }

  protected select(total: ExpenseTotal): void {
    const filter: SelectedExpenseFilter = {
      field: this.filterField(),
      value: total.value,
      label: total.name,
    };
    if (this.filterField() === 'paymentMethod') {
      filter.payment = this.paymentDetails(total);
    }
    this.filterSelected.emit(filter);
  }

  private paymentDetails(total: ExpenseTotal): PaymentDetails {
    if (!('institution' in total) || typeof total.institution !== 'string' ||
      !('paymentMethod' in total) || typeof total.paymentMethod !== 'string') {
      throw new Error('Payment totals must include institution and payment method details.');
    }

    return { institution: total.institution, paymentMethod: total.paymentMethod };
  }
}
