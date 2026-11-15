import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ExpenseApi } from './expense-api';
import { Expense, ExpenseDraft } from './expense-models';

describe('ExpenseApi HTTP contracts', () => {
  let api: ExpenseApi;
  let http: HttpTestingController;
  const payment = { id: 'payment-id', nome: 'Meu cartão', tipo: 'CREDITO', instituicaoFinanceira: 'NUBANK', diaFechamento: 14, diaVencimento: 21 };
  const invoice = { id: 'invoice-id', dataFechamento: '2026-11-14', dataVencimento: '2026-11-21' };
  const row: Expense = {
    id: 'expense-id', year: 2026, month: 10, day: 9, name: 'Compra', amountInCents: 1670,
    category: 'Casa', description: '', paymentMethod: 'Cartão de crédito', paymentName: '', institution: 'NUBANK',
    realized: true, installment: { number: 1, quantity: 2 },
  };
  const draft: ExpenseDraft = {
    nome: 'Compra', valor: 33.36, categoria: 'Casa', metodoPagamentoId: 'payment-id', data: '2026-11-09',
    descricao: 'Descrição', realizado: true, parcelado: true, quantidadeParcelas: 2, faturaPeriodo: '2026-11',
  };
  const envelope = <T>(dados: T) => ({ dados, versao: 'test' });
  const page = <T>(dados: T[], pagina = 0, totalPaginas = 1) => ({
    ...envelope(dados), paginacao: { pagina, tamanho: 10, totalElementos: 2, totalPaginas },
  });
  const flushAvailability = (populated: string[]) => {
    let requests = http.match((req) => req.url === '/api/gastos/intervalo');
    while (requests.length) {
      for (const request of requests) {
        expect(request.request.params.get('size')).toBe('1');
        expect(request.request.params.has('categoria')).toBe(false);
        expect(request.request.params.has('metodoPagamentoId')).toBe(false);
        const hasExpenses = populated.includes(request.request.params.get('fim')!);
        request.flush({
          ...envelope([]),
          paginacao: { pagina: 0, tamanho: 1, totalElementos: hasExpenses ? 1 : 0, totalPaginas: hasExpenses ? 1 : 0 },
        });
      }
      requests = http.match((req) => req.url === '/api/gastos/intervalo');
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ExpenseApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('should identify connection failures without misreporting backend validation errors as offline', () => {
    const error = vi.fn();
    api.getMetadata().subscribe({ error });
    http.expectOne('/api/gastos/periodos').flush({}, { status: 500, statusText: 'Internal Server Error' });
    expect(api.offline()).toBe(false);
    api.getMetadata().subscribe({ error });
    http.expectOne('/api/gastos/periodos').flush({}, { status: 503, statusText: 'Service Unavailable' });
    expect(api.offline()).toBe(true);
    api.getMetadata().subscribe((metadata) => expect(metadata.periods).toEqual({}));
    http.expectOne('/api/gastos/periodos').flush(envelope([]));
    http.expectOne((req) => req.url === '/api/metodos-pagamento').flush(page([]));
    expect(api.offline()).toBe(false);
    expect(error).toHaveBeenCalledTimes(2);
  });

  it('should adapt server periods, dates and zero-based pages and forward opaque payment IDs', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 13));
    api.getMetadata().subscribe((metadata) => {
      expect(metadata.initialPeriod).toEqual({ year: 2026, month: 10 });
      expect(metadata.periods[2027]).toEqual({ months: [0, 3], monthOnSelect: 0 });
    });
    http.expectOne('/api/gastos/periodos').flush(envelope([{ ano: 2027, mes: 4 }, { ano: 2027, mes: 1 }, { ano: 2026, mes: 11 }]));
    http.expectOne((req) => req.url === '/api/metodos-pagamento').flush(page([]));
    flushAvailability(['2026-11-20', '2027-01-20', '2027-04-20']);
    vi.useRealTimers();
    api.getExpenses({ year: 2026, month: 10, page: 2, pageSize: 10, filter: { field: 'paymentMethod', value: 'opaque-id' } })
      .subscribe((result) => {
        expect(result).toMatchObject({ page: 2, firstItem: 11, lastItem: 11 });
        expect(result.items[0]).toMatchObject({ id: 'id', year: 2026, month: 10, day: 9, amountInCents: 1670, installment: { number: 1, quantity: 2 } });
      });
    const request = http.expectOne((req) => req.url === '/api/gastos/intervalo');
    expect(request.request.params.get('inicio')).toBe('2026-10-21');
    expect(request.request.params.get('fim')).toBe('2026-11-20');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('metodoPagamentoId')).toBe('opaque-id');
    request.flush(page([{ id: 'id', data: '09/11/2026', nome: 'Compra', valor: 16.70, categoria: 'Casa', realizado: true, metodoPagamento: payment, parcela: { numero: 1, quantidade: 2 } }], 1, 2));
  });

  it('should enable only populated intervals, including invoice periods and year rollover', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 15));
    const result = vi.fn();
    api.getMetadata().subscribe(result);
    http.expectOne('/api/gastos/periodos').flush(envelope([
      { ano: 2026, mes: 10 }, { ano: 2026, mes: 12 },
    ]));
    http.expectOne((req) => req.url === '/api/metodos-pagamento').flush(page([payment]));
    http.expectOne((req) => req.url === '/api/faturas/cartao/payment-id').flush(page([
      { ...invoice, dataFechamento: '2026-11-14', valorTotal: 0 },
      { ...invoice, dataFechamento: '2028-03-20', valorTotal: 0 },
      { ...invoice, dataFechamento: '2028-03-21', valorTotal: 0 },
    ]));
    flushAvailability(['2026-11-20', '2027-01-20', '2028-03-20', '2028-04-20']);
    expect(result).toHaveBeenCalledWith({
      initialPeriod: { year: 2026, month: 10 },
      periods: {
        2026: { months: [10], monthOnSelect: 10 },
        2027: { months: [0], monthOnSelect: 0 },
        2028: { months: [2, 3], monthOnSelect: 2 },
      },
    });
  });

  it('should select a populated future month when no earlier interval has expenses', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 25));
    const result = vi.fn();
    api.getMetadata().subscribe(result);
    http.expectOne('/api/gastos/periodos').flush(envelope([{ ano: 2026, mes: 12 }]));
    http.expectOne((req) => req.url === '/api/metodos-pagamento').flush(page([]));
    flushAvailability(['2027-01-20']);
    expect(result).toHaveBeenCalledWith({
      initialPeriod: { year: 2027, month: 0 },
      periods: { 2027: { months: [0], monthOnSelect: 0 } },
    });
  });

  it('should retrieve every page of registered methods and totals without deducing options or summing amounts', () => {
    api.getPaymentMethods().subscribe((methods) => expect(methods.map((method) => method.value)).toEqual(['payment-id', 'other-id']));
    http.expectOne((req) => req.url === '/api/metodos-pagamento' && req.params.get('page') === '0').flush(page([payment], 0, 2));
    http.expectOne((req) => req.url === '/api/metodos-pagamento' && req.params.get('page') === '1').flush(page([{ ...payment, id: 'other-id' }], 1, 2));
    api.getTotals({ year: 2027, month: 0 }).subscribe((totals) => {
      expect(totals.payment[0]).toMatchObject({ value: 'payment-id', name: 'Servidor', planned: 703, realized: 101 });
      expect(totals.category.map((total) => total.value)).toEqual(['Casa', 'Outros']);
    });
    http.expectOne((req) => req.url.endsWith('/totais/metodo-pagamento')
      && req.params.get('inicio') === '2026-12-21' && req.params.get('fim') === '2027-01-20')
      .flush(page([{ metodoPagamentoId: 'payment-id', nome: 'Servidor', tipo: 'PIX', instituicaoFinanceira: 'CAIXA', planejado: 7.03, realizado: 1.01 }]));
    http.expectOne((req) => req.url.endsWith('/totais/categoria') && req.params.get('page') === '0')
      .flush(page([{ categoria: 'Casa', planejado: 7.03, realizado: 1.01 }], 0, 2));
    http.expectOne((req) => req.url.endsWith('/totais/categoria') && req.params.get('page') === '1')
      .flush(page([{ categoria: 'Outros', planejado: 0, realizado: 0 }], 1, 2));
  });

  it('should load actual purchase amounts, update the entire purchase and preserve unequal installments', () => {
    api.getExpense(row).subscribe((expense) => {
      expect(expense.purchase?.installments.map((item) => item.amountInCents)).toEqual([1670, 1666]);
      expect(expense.purchaseId).toBe('purchase-id');
      api.saveExpense(draft, expense).subscribe();
    });
    http.expectOne('/api/gastos/expense-id').flush(envelope({
      id: 'expense-id', data: '09/11/2026', nome: 'Compra', valor: 16.70, categoria: 'Casa', realizado: true,
      metodoPagamento: payment, fatura: invoice, parcela: { numero: 1, quantidade: 2, compraParceladaId: 'purchase-id' },
    }));
    http.expectOne('/api/compras-parceladas/purchase-id').flush(envelope({
      id: 'purchase-id', valorTotal: 33.36, quantidadeParcelas: 2,
      parcelas: [
        { id: 'a', numeroParcela: 1, data: '09/11/2026', valor: 16.70, realizado: true, fatura: invoice },
        { id: 'b', numeroParcela: 2, data: '01/12/2026', valor: 16.66, realizado: false, fatura: { ...invoice, dataFechamento: '2026-12-14' } },
      ],
    }));
    const request = http.expectOne('/api/compras-parceladas/purchase-id');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toMatchObject({ data: '09/11/2026', valorTotal: 33.36, quantidadeParcelas: 2, valoresParcelas: [16.70, 16.66] });
    expect(request.request.body).not.toHaveProperty('realizado');
    expect(request.request.body).not.toHaveProperty('valor');
    request.flush({});
  });

  it('should POST simple expenses and methods and delete only after a successful server response', () => {
    api.saveExpense({ ...draft, parcelado: false, realizado: false, data: null }).subscribe();
    const create = http.expectOne('/api/gastos');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toMatchObject({ data: null, valor: 33.36, realizado: false });
    create.flush({});
    api.createPaymentMethod({ nome: 'Cartão', tipo: 'CREDITO', instituicaoFinanceira: 'NUBANK', diaFechamento: 14, diaVencimento: 21 })
      .subscribe((method) => expect(method.value).toBe('payment-id'));
    http.expectOne('/api/metodos-pagamento').flush(envelope(payment));
    const complete = vi.fn();
    const error = vi.fn();
    api.deleteExpense({ ...row, installment: undefined }).subscribe({ next: complete, error });
    const deletion = http.expectOne('/api/gastos/expense-id');
    expect(deletion.request.method).toBe('DELETE');
    expect(complete).not.toHaveBeenCalled();
    deletion.flush({}, { status: 409, statusText: 'Conflict' });
    expect(error).toHaveBeenCalledOnce();
    expect(complete).not.toHaveBeenCalled();
    api.deleteExpense({ ...row, purchaseId: 'purchase-id' }).subscribe(complete);
    const purchaseDeletion = http.expectOne('/api/compras-parceladas/purchase-id');
    expect(purchaseDeletion.request.method).toBe('DELETE');
    purchaseDeletion.flush(null, { status: 204, statusText: 'No Content' });
    expect(complete).toHaveBeenCalledOnce();
  });
});
