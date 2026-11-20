import { groupByDay } from './group-by-day';
import { buildExpense } from './testing/expense-builder';

describe('groupByDay', () => {
  it('should group consecutive expenses of the same day keeping their order', () => {
    const expenses = [
      buildExpense({ id: 'a', date: '2026-11-19' }),
      buildExpense({ id: 'b', date: '2026-11-19' }),
      buildExpense({ id: 'c', date: '2026-11-15' }),
    ];

    const days = groupByDay(expenses);

    expect(days.map((day) => day.date)).toEqual(['2026-11-19', '2026-11-15']);
    expect(days[0].expenses.map((expense) => expense.id)).toEqual(['a', 'b']);
    expect(days[1].expenses.map((expense) => expense.id)).toEqual(['c']);
  });

  it('should gather the expenses without a date in a single group', () => {
    const days = groupByDay([
      buildExpense({ id: 'a', date: '2026-12-01' }),
      buildExpense({ id: 'b', date: null }),
      buildExpense({ id: 'c', date: null }),
    ]);

    expect(days.map((day) => day.date)).toEqual(['2026-12-01', null]);
    expect(days[1].expenses.map((expense) => expense.id)).toEqual(['b', 'c']);
  });

  it('should return no days for no expenses', () => {
    expect(groupByDay([])).toEqual([]);
  });

  it('should mark the first day of each month, leaving the undated group unmarked', () => {
    const days = groupByDay([
      buildExpense({ id: 'a', date: '2026-12-03' }),
      buildExpense({ id: 'b', date: '2026-12-01' }),
      buildExpense({ id: 'c', date: '2026-11-30' }),
      buildExpense({ id: 'd', date: null }),
    ]);

    expect(days.map((day) => day.startsMonth)).toEqual([true, false, true, false]);
  });

  it('should put an undated planned expense in the month of its invoice', () => {
    const days = groupByDay([
      buildExpense({ id: 'a', date: '2026-12-03' }),
      buildExpense({ id: 'b', date: null, invoiceDueDate: '2026-12-21' }),
      buildExpense({ id: 'c', date: null, invoiceDueDate: '2027-01-21' }),
      buildExpense({ id: 'd', date: null }),
    ]);

    expect(days.map((day) => [day.key, day.month, day.startsMonth])).toEqual([
      ['2026-12-03', '2026-12', true],
      ['2026-12-sem-data', '2026-12', false],
      ['2027-01-sem-data', '2027-01', true],
      ['sem-data', null, false],
    ]);
  });
});
