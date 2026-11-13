import { Injectable } from '@angular/core';
import { defer, Observable, of } from 'rxjs';
import { ExpenseMetadata, ExpensePage, ExpensePeriod, ExpenseQuery, ExpenseTotals } from './expense-models';
import { mockExpenseList, mockExpenseMetadata, mockExpenseTotals } from './mock-expenses';

@Injectable({ providedIn: 'root' })
export class ExpenseApi {
  getMetadata(): Observable<ExpenseMetadata> {
    return defer(() => of(mockExpenseMetadata(new Date())));
  }

  getExpenses(query: ExpenseQuery): Observable<ExpensePage> {
    return defer(() => of(mockExpenseList(query)));
  }

  getTotals(period: ExpensePeriod): Observable<ExpenseTotals> {
    return defer(() => of(mockExpenseTotals(period)));
  }
}
