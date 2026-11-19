import { Expense } from './expense';

export interface ExpenseDay {
  date: string | null;
  startsMonth: boolean;
  expenses: Expense[];
}

export function groupByDay(expenses: readonly Expense[]): ExpenseDay[] {
  const days: ExpenseDay[] = [];
  for (const expense of expenses) {
    const current = days.at(-1);
    if (current?.date === expense.date) {
      current.expenses.push(expense);
    } else {
      const month = expense.date?.slice(0, 7);
      const startsMonth = !!month && month !== current?.date?.slice(0, 7);
      days.push({ date: expense.date, startsMonth, expenses: [expense] });
    }
  }
  return days;
}
