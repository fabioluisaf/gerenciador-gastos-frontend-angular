import { Component, computed, input, output } from '@angular/core';
import { NgStyle } from '@angular/common';
import {
  LucideArrowLeftRight, LucideBarcode, LucideCreditCard, LucideLandmark,
  LucideQrCode, LucideWallet, LucideX,
} from '@lucide/angular';
import { SelectedExpenseFilter } from '../expense-models';
import { institutionIcon, paymentMethodIcon, paymentTagStyles } from '../shared/payment-appearance';

@Component({
  selector: 'app-expense-filter',
  imports: [NgStyle, LucideArrowLeftRight, LucideBarcode, LucideCreditCard, LucideLandmark, LucideQrCode, LucideWallet, LucideX],
  templateUrl: './expense-filter.html',
  styleUrl: './expense-filter.css',
})
export class ExpenseFilter {
  readonly filter = input.required<SelectedExpenseFilter>();
  readonly removed = output<void>();
  protected readonly institutionIcon = institutionIcon;
  protected readonly paymentMethodIcon = paymentMethodIcon;
  protected readonly paymentStyles = computed(() => {
    const payment = this.filter().payment;
    return payment ? paymentTagStyles(payment) : null;
  });
}
