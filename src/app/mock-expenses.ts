import {
  Expense, ExpenseMetadata, ExpensePage, ExpensePeriod, ExpenseQuery, ExpenseTotal, ExpenseTotals,
  PaymentExpenseTotal,
} from './expense-models';

const MOCK_INVOICES = [
  { id: 'nubank-1', cardName: 'Cartão principal', institution: 'Nubank', icon: 'nubank.png' },
  { id: 'caixa-1', cardName: 'Cartão viagens', institution: 'Caixa', icon: 'caixa.png' },
] as const;

const MONTHLY_EXPENSES: readonly Omit<Expense, 'year' | 'month'>[] = [
  { id: 1, day: 4, name: 'Mercado', amountInCents: 18590, description: 'Compras da semana', category: 'Alimentação', paymentMethod: 'Cartão de crédito', paymentName: MOCK_INVOICES[0].cardName, invoiceId: MOCK_INVOICES[0].id, institution: 'Nubank', realized: true, closingDay: 18, invoiceClosingDay: 18 },
  { id: 2, day: 6, name: 'Transporte', amountInCents: 2650, description: 'Deslocamento', category: 'Transporte', paymentMethod: 'Cartão de débito', paymentName: 'Cartão Caixa', institution: 'Caixa', realized: true },
  { id: 3, day: 8, name: 'Energia', amountInCents: 14375, description: 'Conta de energia', category: 'Moradia', paymentMethod: 'Pix', paymentName: 'Pix Caixa', institution: 'Caixa', realized: true },
  { id: 4, day: 11, name: 'Farmácia', amountInCents: 4990, description: 'Itens de farmácia', category: 'Saúde', paymentMethod: 'Cartão de crédito', paymentName: MOCK_INVOICES[0].cardName, invoiceId: MOCK_INVOICES[0].id, institution: 'Nubank', realized: true, closingDay: 18, invoiceClosingDay: 18 },
  { id: 5, day: 14, name: 'Restaurante e cafeteria da praça central', amountInCents: 7850, description: 'Almoço em família no restaurante da praça central da cidade', category: 'Alimentação', paymentMethod: 'Cartão de crédito', paymentName: MOCK_INVOICES[0].cardName, invoiceId: MOCK_INVOICES[0].id, institution: 'Nubank', realized: true, closingDay: 18, invoiceClosingDay: 18 },
  { id: 6, day: 17, name: 'Plano de internet residencial de alta velocidade', amountInCents: 9990, description: 'Mensalidade do plano de internet residencial e serviços adicionais', category: 'Moradia', paymentMethod: 'Pix', paymentName: 'Pix Caixa', institution: 'Caixa', realized: false },
  { id: 7, day: 21, name: 'Abastecimento de combustível para viagens longas e manutenção do veículo familiar', amountInCents: 21000, description: 'Abastecimento', category: 'Transporte', paymentMethod: 'Cartão de crédito', paymentName: MOCK_INVOICES[0].cardName, invoiceId: MOCK_INVOICES[0].id, institution: 'Nubank', realized: true, closingDay: 18, invoiceClosingDay: 18, invoiceMonthOffset: 1, installment: { number: 1, quantity: 12 } },
  { id: 8, day: 25, name: 'Academia', amountInCents: 9000, description: 'Mensalidade', category: 'Saúde', paymentMethod: 'Pix', paymentName: 'Pix Caixa', institution: 'Caixa', realized: false },
];

const PAGINATION_DEMO_MONTHS = [
  { month: 8, repetitions: 6 },
  { month: 9, repetitions: 2 },
  { month: 10, repetitions: 3 },
  { month: 11, repetitions: 4 },
];

const PAGINATION_DEMO_NAMES = [
  ['Feira de frutas e verduras', 'Corrida de aplicativo', 'Conta de água', 'Consulta médica', 'Padaria', 'Plano de celular', 'Revisão do carro', 'Pilates'],
  ['Açougue', 'Passagem de ônibus', 'Condomínio', 'Exames de rotina', 'Lanchonete', 'Assinatura de streaming', 'Troca de pneus', 'Natação'],
  ['Hortifruti', 'Passagem de metrô', 'Gás de cozinha', 'Consulta odontológica', 'Pizzaria', 'Armazenamento em nuvem', 'Alinhamento do carro', 'Fisioterapia'],
  ['Mercearia', 'Táxi', 'Seguro residencial', 'Óculos de grau', 'Sorveteria', 'Assinatura de música', 'Troca de óleo', 'Yoga'],
  ['Compras na cooperativa', 'Bicicleta compartilhada', 'Limpeza residencial', 'Vacinação', 'Cafeteria', 'Serviço de telefonia', 'Lavagem do carro', 'Avaliação física'],
] as const;

const FIRST_INSTALLMENT_MONTH_INDEX = 4;

const MOCK_EXPENSES: readonly Expense[] = [
  ...Array.from({ length: 19 }, (_, index) =>
    MONTHLY_EXPENSES.flatMap((expense) => {
      const installmentNumber = index + (expense.invoiceMonthOffset ?? 0) - FIRST_INSTALLMENT_MONTH_INDEX + 1;
      if (expense.installment && (installmentNumber < 1 || installmentNumber > expense.installment.quantity)) {
        return [];
      }
      return [{
        ...expense,
        id: index * MONTHLY_EXPENSES.length + expense.id,
        day: index === 10 && expense.id === 6 ? null : expense.day,
        year: 2026 + Math.floor(index / 12),
        month: index % 12,
        ...(expense.installment && {
          installment: { number: installmentNumber, quantity: expense.installment.quantity },
        }),
      }];
    }),
  ).flat(),
  ...Array.from({ length: 2 }, (_, index) => ({
    id: 3000 + index,
    year: 2026,
    month: 9 + index,
    day: 21,
    name: 'Fone',
    amountInCents: 15000,
    description: 'Fone de ouvido sem fio',
    category: 'Tecnologia',
    paymentMethod: 'Cartão de crédito',
    paymentName: MOCK_INVOICES[0].cardName,
    invoiceId: MOCK_INVOICES[0].id,
    institution: 'Nubank',
    realized: true,
    closingDay: 18,
    invoiceClosingDay: 18,
    invoiceMonthOffset: 1,
    installment: { number: index + 1, quantity: 2 },
  })),
  ...PAGINATION_DEMO_MONTHS.flatMap(({ month, repetitions }) =>
    Array.from({ length: repetitions - 1 }, (_, index) =>
      MONTHLY_EXPENSES.map(({ installment, ...expense }, expenseIndex) => {
        const name = PAGINATION_DEMO_NAMES[index][expenseIndex];
        return {
          ...expense,
          id: 1000 + month * 100 + index * MONTHLY_EXPENSES.length + expense.id,
          year: 2026,
          month,
          name,
          description: name,
        };
      }),
    ).flat(),
  ),
  { id: 153, year: 2029, month: 8, day: 15, name: 'Notebook', amountInCents: 320000, description: 'Compra de notebook', category: 'Tecnologia', paymentMethod: 'Pix', paymentName: 'Pix Caixa', institution: 'Caixa', realized: false },
];

export function mockExpensePeriod(expense: Expense): ExpensePeriod {
  const nextInvoice = expense.paymentMethod === 'Cartão de crédito' &&
    expense.closingDay !== undefined && expense.day != null && expense.day >= expense.closingDay;
  const period = expense.year * 12 + expense.month + (nextInvoice ? 1 : 0);
  return { year: Math.floor(period / 12), month: period % 12 };
}

function mockExpensesForPeriod(period: ExpensePeriod): readonly Expense[] {
  return MOCK_EXPENSES.filter((expense) => {
    const invoice = mockExpensePeriod(expense);
    return invoice.year === period.year && invoice.month === period.month;
  });
}

function mockTotalsForField(expenses: readonly Expense[], field: 'paymentMethod' | 'category'): readonly ExpenseTotal[] {
  const values = [...new Set(MOCK_EXPENSES.map((expense) => expense[field]))];
  return values.flatMap((value) => {
    const matching = expenses.filter((expense) => expense[field] === value);
    return matching.length ? [{
      value,
      name: value,
      planned: matching.reduce((sum, expense) => sum + expense.amountInCents, 0),
      realized: matching.reduce((sum, expense) => sum + (expense.realized ? expense.amountInCents : 0), 0),
    }] : [];
  });
}

function mockPaymentTotals(expenses: readonly Expense[]): readonly PaymentExpenseTotal[] {
  const paymentMethods = [...new Set(MOCK_EXPENSES.map((expense) => expense.paymentMethod))];
  return paymentMethods.flatMap((paymentMethod) => {
    const matching = expenses.filter((expense) => expense.paymentMethod === paymentMethod);
    const representative = matching[0];
    return representative ? [{
      value: paymentMethod,
      name: representative.paymentName,
      institution: representative.institution,
      paymentMethod: representative.paymentMethod,
      planned: matching.reduce((sum, expense) => sum + expense.amountInCents, 0),
      realized: matching.reduce((sum, expense) => sum + (expense.realized ? expense.amountInCents : 0), 0),
    }] : [];
  });
}

// Simulates backend responses until the HTTP contract is available.
export function mockExpenseMetadata(today: Date): ExpenseMetadata {
  const year = today.getFullYear();
  const month = today.getMonth();
  const current = year * 12 + month;
  const latest = MOCK_EXPENSES.reduce<number | null>((result, expense) => {
    const invoice = mockExpensePeriod(expense);
    const period = invoice.year * 12 + invoice.month;
    return period <= current && (result === null || period > result) ? period : result;
  }, null) ?? current;
  return {
    initialPeriod: { year: Math.floor(latest / 12), month: latest % 12 },
    periods: {
      2026: { months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], monthOnSelect: year <= 2026 ? year === 2026 ? month : 0 : null },
      2027: { months: [0, 1, 2, 3, 4, 5, 6], monthOnSelect: year <= 2027 ? year === 2027 ? month : 0 : null },
      2029: { months: [8], monthOnSelect: 8 },
    },
  };
}

export function mockExpenseList(query: ExpenseQuery): ExpensePage {
  const filtered = mockExpensesForPeriod(query).filter((expense) =>
    query.filter === null || expense[query.filter.field] === query.filter.value,
  );
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / query.pageSize);
  const page = totalPages === 0 ? 0 : Math.min(query.page, totalPages);
  const offset = page === 0 ? 0 : (page - 1) * query.pageSize;
  return {
    items: filtered.slice(offset, offset + query.pageSize),
    page,
    pageSize: query.pageSize,
    totalItems,
    totalPages,
    firstItem: totalItems === 0 ? 0 : offset + 1,
    lastItem: Math.min(offset + query.pageSize, totalItems),
  };
}

export function mockExpenseTotals(period: ExpensePeriod): ExpenseTotals {
  const expenses = mockExpensesForPeriod(period);
  return {
    payment: mockPaymentTotals(expenses),
    category: mockTotalsForField(expenses, 'category'),
  };
}
