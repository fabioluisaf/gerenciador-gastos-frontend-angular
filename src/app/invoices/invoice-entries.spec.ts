import { buildExpense } from '../expenses/testing/expense-builder';
import {
  categoriesOf,
  entryTotals,
  filterEntries,
  groupInvoiceEntries,
  isFiltering,
  NO_ENTRY_FILTER,
} from './invoice-entries';

const installment = { number: 2, count: 10, purchaseId: 'compra', purchaseAmount: 3000 };

const expenses = [
  buildExpense({ id: 'a', name: 'Mercado', date: '2026-11-10', category: 'Casa' }),
  buildExpense({ id: 'b', name: 'Geladeira', date: '2026-08-02', installment, category: 'Casa' }),
  buildExpense({ id: 'c', name: 'Viagem', date: null, realized: false, category: 'Lazer' }),
  buildExpense({ id: 'd', name: 'Açaí', date: '2026-11-12', realized: false, category: 'Comida' }),
  buildExpense({ id: 'e', name: 'Padaria', date: '2026-11-10', category: 'Comida' }),
];

describe('invoice entries', () => {
  it('should split installments, undated planned, planned oldest first and realized newest first', () => {
    const groups = groupInvoiceEntries([
      ...expenses,
      buildExpense({ id: 'f', name: 'Show', date: '2026-11-05', realized: false, amount: 50 }),
    ]);
    const days = ({ items }: { items: { key: string; expenses: { id: string }[] }[] }) =>
      items.map(({ key, expenses }) => [key, expenses.map(({ id }) => id)]);

    expect(groups.installments.items.map(({ id }) => id)).toEqual(['b']);
    expect(groups.undated.items.map(({ id }) => id)).toEqual(['c']);
    expect(days(groups.plannedDays)).toEqual([
      ['2026-11-05', ['f']],
      ['2026-11-12', ['d']],
    ]);
    expect(days(groups.realizedDays)).toEqual([['2026-11-10', ['a', 'e']]]);
    expect(groups.plannedDays.count).toBe(2);
    expect(groups.plannedDays.total).toBeCloseTo(173.45);
    expect(groups.realizedDays.total).toBeCloseTo(246.9);
  });

  it('should filter by name ignoring case and accents and by categories', () => {
    const ids = (filter: Parameters<typeof filterEntries>[1]) =>
      filterEntries(expenses, filter).map(({ id }) => id);

    expect(ids(NO_ENTRY_FILTER)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(ids({ ...NO_ENTRY_FILTER, name: 'acai' })).toEqual(['d']);
    expect(ids({ ...NO_ENTRY_FILTER, name: 'ADA' })).toEqual(['e']);
    expect(ids({ ...NO_ENTRY_FILTER, categories: ['Comida', 'Lazer'] })).toEqual(['c', 'd', 'e']);
    expect(isFiltering(NO_ENTRY_FILTER)).toBe(false);
    expect(isFiltering({ ...NO_ENTRY_FILTER, name: ' ' })).toBe(false);
    expect(isFiltering({ ...NO_ENTRY_FILTER, categories: ['Casa'] })).toBe(true);
  });

  it('should total the realized and the realized plus planned amounts', () => {
    expect(
      entryTotals([
        buildExpense({ amount: 10 }),
        buildExpense({ amount: 5.5, realized: false }),
        buildExpense({ amount: -2 }),
      ]),
    ).toEqual({ count: 3, realized: 8, planned: 13.5 });
  });

  it('should list the categories in alphabetical order without repeating', () => {
    expect(categoriesOf(expenses)).toEqual(['Casa', 'Comida', 'Lazer']);
  });
});
