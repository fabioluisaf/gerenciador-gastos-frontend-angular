import { Expense } from './expense';

export interface ExpenseDay {
  date: string;
  expenses: Expense[];
}

export function groupByDay(expenses: readonly Expense[]): ExpenseDay[] {
  const days: ExpenseDay[] = [];
  for (const expense of expenses) {
    const current = days.at(-1);
    if (current?.date === expense.date) {
      current.expenses.push(expense);
    } else {
      days.push({ date: expense.date, expenses: [expense] });
    }
  }
  return days;
}
