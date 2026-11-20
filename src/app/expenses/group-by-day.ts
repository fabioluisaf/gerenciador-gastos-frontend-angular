import { Expense } from './expense';
import { UNDATED_PERIOD_KEY } from './timeline';

export interface ExpenseDay {
  key: string;
  date: string | null;
  month: string | null;
  startsMonth: boolean;
  expenses: Expense[];
}

export function referenceDate(expense: Expense): string | null {
  return expense.date ?? expense.invoiceDueDate;
}

export function groupByDay(expenses: readonly Expense[]): ExpenseDay[] {
  const days: ExpenseDay[] = [];
  for (const expense of expenses) {
    const month = referenceDate(expense)?.slice(0, 7) ?? null;
    const key = expense.date ?? `${month ?? ''}${month ? '-' : ''}${UNDATED_PERIOD_KEY}`;
    const current = days.at(-1);
    if (current?.key === key) {
      current.expenses.push(expense);
    } else {
      const startsMonth = month !== null && month !== current?.month;
      days.push({ key, date: expense.date, month, startsMonth, expenses: [expense] });
    }
  }
  return days;
}
