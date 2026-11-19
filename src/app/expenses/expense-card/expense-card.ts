import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Expense, PAYMENT_TYPE_LABELS } from '../expense';

@Component({
  selector: 'app-expense-card',
  imports: [CurrencyPipe, NgOptimizedImage],
  templateUrl: './expense-card.html',
  styleUrl: './expense-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpenseCard {
  readonly expense = input.required<Expense>();

  protected readonly paymentLabel = computed(() => PAYMENT_TYPE_LABELS[this.expense().paymentType]);
  protected readonly isRefund = computed(() => this.expense().amount < 0);
}
