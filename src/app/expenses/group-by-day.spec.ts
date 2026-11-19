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

  it('should return no days for no expenses', () => {
    expect(groupByDay([])).toEqual([]);
  });
});
