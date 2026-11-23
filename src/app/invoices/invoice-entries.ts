import { Expense } from '../expenses/expense';
import { ExpenseDay, groupByDay } from '../expenses/group-by-day';
import { matchesText } from '../shared/text-search';

export interface InvoiceEntryFilter {
  name: string;
  categories: readonly string[];
}

export interface EntryGroup<T> {
  items: T;
  count: number;
  total: number;
}

export interface InvoiceGroups {
  installments: EntryGroup<Expense[]>;
  undated: EntryGroup<Expense[]>;
  plannedDays: EntryGroup<ExpenseDay[]>;
  realizedDays: EntryGroup<ExpenseDay[]>;
}

export interface EntryTotals {
  count: number;
  realized: number;
  planned: number;
}

export const NO_ENTRY_FILTER: InvoiceEntryFilter = { name: '', categories: [] };

export function isFiltering(filter: InvoiceEntryFilter): boolean {
  return filter.name.trim() !== '' || filter.categories.length > 0;
}

export function filterEntries(expenses: readonly Expense[], filter: InvoiceEntryFilter): Expense[] {
  return expenses.filter(
    (expense) =>
      matchesText(expense.name, filter.name) &&
      (filter.categories.length === 0 || filter.categories.includes(expense.category)),
  );
}

function byName(a: Expense, b: Expense): number {
  return a.name.localeCompare(b.name, 'pt-BR');
}

function newestFirst(a: Expense, b: Expense): number {
  return (b.date ?? '').localeCompare(a.date ?? '') || byName(a, b);
}

function oldestFirst(a: Expense, b: Expense): number {
  return (a.date ?? '').localeCompare(b.date ?? '') || byName(a, b);
}

function sumOf(expenses: readonly Expense[]): number {
  return expenses.reduce((sum, { amount }) => sum + amount, 0);
}

function listGroup(expenses: Expense[]): EntryGroup<Expense[]> {
  return { items: expenses, count: expenses.length, total: sumOf(expenses) };
}

function dayGroup(expenses: Expense[]): EntryGroup<ExpenseDay[]> {
  return { items: groupByDay(expenses), count: expenses.length, total: sumOf(expenses) };
}

export function groupInvoiceEntries(expenses: readonly Expense[]): InvoiceGroups {
  const single = expenses.filter(({ installment }) => installment === null);
  const planned = single.filter(({ realized }) => !realized);
  return {
    installments: listGroup(
      expenses.filter(({ installment }) => installment !== null).sort(newestFirst),
    ),
    undated: listGroup(planned.filter(({ date }) => !date).sort(byName)),
    plannedDays: dayGroup(planned.filter(({ date }) => !!date).sort(oldestFirst)),
    realizedDays: dayGroup(single.filter(({ realized }) => realized).sort(newestFirst)),
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
