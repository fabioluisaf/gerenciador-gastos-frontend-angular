import { Expense, ExpenseKind } from '../expenses/expense';
import { ExpenseDay, groupByDay } from '../expenses/group-by-day';
import { matchesText } from '../shared/text-search';

export type InvoiceStatusFilter = 'all' | ExpenseKind;

export interface InvoiceEntryFilter {
  name: string;
  status: InvoiceStatusFilter;
  categories: readonly string[];
}

export interface InvoiceGroups {
  installments: Expense[];
  undated: Expense[];
  days: ExpenseDay[];
}

export interface EntryTotals {
  count: number;
  realized: number;
  planned: number;
}

export const NO_ENTRY_FILTER: InvoiceEntryFilter = { name: '', status: 'all', categories: [] };

export function isFiltering(filter: InvoiceEntryFilter): boolean {
  return filter.name.trim() !== '' || filter.status !== 'all' || filter.categories.length > 0;
}

export function filterEntries(expenses: readonly Expense[], filter: InvoiceEntryFilter): Expense[] {
  return expenses.filter(
    (expense) =>
      matchesText(expense.name, filter.name) &&
      (filter.status === 'all' || (filter.status === 'realized') === expense.realized) &&
      (filter.categories.length === 0 || filter.categories.includes(expense.category)),
  );
}

function newestFirst(a: Expense, b: Expense): number {
  return (b.date ?? '').localeCompare(a.date ?? '') || a.name.localeCompare(b.name, 'pt-BR');
}

export function groupInvoiceEntries(expenses: readonly Expense[]): InvoiceGroups {
  const installments = expenses.filter(({ installment }) => installment !== null);
  const undated = expenses.filter(({ installment, date }) => installment === null && !date);
  const dated = expenses.filter(({ installment, date }) => installment === null && !!date);
  return {
    installments: installments.sort(newestFirst),
    undated: undated.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    days: groupByDay(dated.sort(newestFirst)),
  };
}

export function entryTotals(expenses: readonly Expense[]): EntryTotals {
  return expenses.reduce<EntryTotals>(
    (totals, { amount, realized }) => ({
      count: totals.count + 1,
      realized: totals.realized + (realized ? amount : 0),
      planned: totals.planned + amount,
    }),
    { count: 0, realized: 0, planned: 0 },
  );
}

export function categoriesOf(expenses: readonly Expense[]): string[] {
  return [...new Set(expenses.map(({ category }) => category))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
}
