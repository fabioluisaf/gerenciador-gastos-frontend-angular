import { MonthTotals } from '../expense';

export function buildMonthTotals(overrides: Partial<MonthTotals> = {}): MonthTotals {
  return {
    realized: 150,
    planned: 200,
    byPayment: [
      {
        id: 'cartao',
        label: 'Cartão Nubank',
        realized: 100,
        planned: 150,
        paymentType: 'CREDITO',
        institution: {
          id: 'nubank',
          name: 'Nubank',
          iconUrl: '/api/instituicoes-financeiras/nubank/icone',
          color: '#820AD1',
        },
      },
      {
        id: 'pix',
        label: 'Pix Caixa',
        realized: 50,
        planned: 50,
        paymentType: 'PIX',
        institution: { id: 'caixa', name: 'Caixa', iconUrl: null, color: null },
      },
    ],
    byCategory: [
      { id: 'Casa', label: 'Casa', realized: 120, planned: 160 },
      { id: 'Lazer', label: 'Lazer', realized: 30, planned: 40 },
    ],
    ...overrides,
  };
}
