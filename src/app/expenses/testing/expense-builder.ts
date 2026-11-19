import { Expense } from '../expense';

export function buildExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'gasto-1',
    date: '2026-11-19',
    name: 'Mercado',
    amount: 123.45,
    category: 'Casa',
    description: null,
    realized: true,
    paymentType: 'CREDITO',
    institution: {
      id: 'nubank',
      name: 'Nubank',
      iconUrl: '/api/instituicoes-financeiras/nubank/icone',
      color: '#820AD1',
    },
    installment: null,
    ...overrides,
  };
}
