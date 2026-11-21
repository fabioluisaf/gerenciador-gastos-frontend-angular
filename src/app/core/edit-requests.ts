import { Injectable, signal } from '@angular/core';
import { Expense } from '../expenses/expense';
import { PaymentMethod } from '../payment-methods/payment-method';

export type EditRequest =
  | { kind: 'expense'; expense: Expense }
  | { kind: 'copy-expense'; expense: Expense }
  | { kind: 'payment-method'; method: PaymentMethod };

@Injectable({ providedIn: 'root' })
export class EditRequests {
  private readonly pending = signal<EditRequest | null>(null);

  readonly request = this.pending.asReadonly();

  editExpense(expense: Expense): void {
    this.pending.set({ kind: 'expense', expense });
  }

  copyExpense(expense: Expense): void {
    this.pending.set({ kind: 'copy-expense', expense });
  }

  editPaymentMethod(method: PaymentMethod): void {
    this.pending.set({ kind: 'payment-method', method });
  }

  consume(): void {
    this.pending.set(null);
  }
}
