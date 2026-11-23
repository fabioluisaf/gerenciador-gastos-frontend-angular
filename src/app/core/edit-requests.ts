import { Injectable, signal } from '@angular/core';
import { Expense } from '../expenses/expense';
import { PaymentMethod } from '../payment-methods/payment-method';
import { PlannedGroup } from '../planned-groups/planned-group';

export type EditRequest =
  | { kind: 'expense'; expense: Expense }
  | { kind: 'copy-expense'; expense: Expense }
  | { kind: 'payment-method'; method: PaymentMethod }
  | { kind: 'planned-group'; group: PlannedGroup }
  | { kind: 'new-planned-group' };

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

  editPlannedGroup(group: PlannedGroup): void {
    this.pending.set({ kind: 'planned-group', group });
  }

  newPlannedGroup(): void {
    this.pending.set({ kind: 'new-planned-group' });
  }

  consume(): void {
    this.pending.set(null);
  }
}
