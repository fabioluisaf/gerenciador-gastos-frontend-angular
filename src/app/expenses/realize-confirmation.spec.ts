import { of } from 'rxjs';
import { provideAppLocale } from '../core/locale';
import { realizeConfirmation } from './realize-confirmation';
import { buildExpense } from './testing/expense-builder';

describe('realizeConfirmation', () => {
  const run = () => of(undefined);

  beforeAll(() => provideAppLocale());

  it('should tell the date the expense will be realized on', () => {
    expect(
      realizeConfirmation(buildExpense({ name: 'Cinema', date: '2026-12-08' }), 'pt-BR', run),
    ).toEqual(
      expect.objectContaining({
        title: 'Realizar gasto?',
        message: '"Cinema" será marcado como realizado em 08/12/2026.',
        confirmLabel: 'Realizar',
        tone: 'success',
      }),
    );
    expect(
      realizeConfirmation(buildExpense({ name: 'Cinema', date: null }), 'pt-BR', run).message,
    ).toBe('"Cinema" será marcado como realizado com a data de hoje.');
  });

  it('should warn that the whole installment purchase is realized', () => {
    const expense = buildExpense({
      name: 'Geladeira',
      installment: { number: 2, count: 10, purchaseId: 'compra', purchaseAmount: 3000 },
    });

    expect(realizeConfirmation(expense, 'pt-BR', run).message).toBe(
      '"Geladeira" e as 10 parcelas da compra serão marcados como realizados.',
    );
    expect(realizeConfirmation({ ...expense, date: null }, 'pt-BR', run).message).toBe(
      '"Geladeira" e as 10 parcelas da compra serão marcados como realizados, com a data de hoje.',
    );
  });
});
