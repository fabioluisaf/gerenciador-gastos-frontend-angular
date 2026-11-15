import { defer, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { ExpenseApi } from '../expense-api';
import { Expense, ExpensePeriod, ExpenseQuery } from '../expense-models';
import { mockExpenseIdsToDelete, mockExpenseList, mockExpenseMetadata, mockExpenseTotals } from './expense-fixtures';

@Injectable()
export class ExpenseApiFixture extends ExpenseApi {
  private readonly excluded = new Set<number>();

  override getMetadata() { return defer(() => of(mockExpenseMetadata(new Date()))); }
  override getExpenses(query: ExpenseQuery) { return defer(() => of(mockExpenseList(query, this.excluded))); }
  override getTotals(period: ExpensePeriod) { return defer(() => of(mockExpenseTotals(period, this.excluded))); }
  override getExpense(expense: Expense) {
    const quantity = expense.installment?.quantity ?? 0;
    const first = expense.year * 12 + expense.month + (expense.invoiceMonthOffset ?? 0) - (expense.installment?.number ?? 1) + 1;
    return of({
      ...expense,
      paymentId: expense.paymentMethod,
      purchase: expense.installment ? {
        id: expense.purchaseId!, quantity, amountInCents: expense.amountInCents * quantity,
        installments: Array.from({ length: quantity }, (_, index) => ({
          id: String(index), number: index + 1, year: Math.floor((first + index) / 12), month: (first + index) % 12,
          amountInCents: expense.amountInCents, date: '', realized: expense.realized,
        })),
      } : undefined,
    });
  }
  override deleteExpense(expense: Expense) {
    return defer(() => {
      for (const id of mockExpenseIdsToDelete(expense)) this.excluded.add(id);
      return of(undefined);
    });
  }
}
