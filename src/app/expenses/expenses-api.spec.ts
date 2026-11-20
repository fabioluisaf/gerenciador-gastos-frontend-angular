import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ExpensesApi } from './expenses-api';
import { buildExpense } from './testing/expense-builder';

describe('ExpensesApi', () => {
  let api: ExpensesApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ExpensesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function flushUsage(counts: [string, number][]): void {
    http.expectOne('/api/metodos-pagamento/uso').flush({
      dados: counts.map(([metodoPagamentoId, quantidadeGastos]) => ({
        metodoPagamentoId,
        quantidadeGastos,
      })),
    });
  }

  it('should request a page of realized expenses and map them to the domain model', () => {
    const result = vi.fn();
    api.list('realized', 1, 50).subscribe(result);

    const request = http.expectOne((req) => req.url === '/api/gastos');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('50');
    request.flush({
      dados: [
        {
          id: 'a',
          data: '19/11/2026',
          nome: 'Mercado',
          valor: -12.5,
          categoria: 'Casa',
          descricao: '',
          realizado: true,
          metodoPagamento: {
            tipo: 'PIX',
            instituicaoFinanceira: {
              id: 'caixa',
              nome: 'Caixa',
              possuiIcone: true,
              cor: '#005CA9',
            },
          },
          parcela: {
            numero: 2,
            quantidade: 3,
            compraParceladaId: 'compra',
            valorTotalCompra: 37.5,
          },
        },
        {
          id: 'b',
          data: '18/11/2026',
          nome: 'Livro',
          valor: 40,
          categoria: 'Educação',
          descricao: 'Presente',
          realizado: false,
          metodoPagamento: {
            tipo: 'DEBITO',
            instituicaoFinanceira: { id: 'banco', nome: 'Banco', possuiIcone: false, cor: null },
          },
        },
      ],
      paginacao: { pagina: 1, tamanho: 50, totalElementos: 102, totalPaginas: 3 },
    });

    expect(result).toHaveBeenCalledWith({
      hasNext: true,
      items: [
        {
          id: 'a',
          date: '2026-11-19',
          name: 'Mercado',
          amount: -12.5,
          category: 'Casa',
          description: null,
          realized: true,
          paymentType: 'PIX',
          institution: {
            id: 'caixa',
            name: 'Caixa',
            iconUrl: '/api/instituicoes-financeiras/caixa/icone',
            color: '#005CA9',
          },
          installment: { number: 2, count: 3, purchaseId: 'compra', purchaseAmount: 37.5 },
        },
        {
          id: 'b',
          date: '2026-11-18',
          name: 'Livro',
          amount: 40,
          category: 'Educação',
          description: 'Presente',
          realized: false,
          paymentType: 'DEBITO',
          institution: { id: 'banco', name: 'Banco', iconUrl: null, color: null },
          installment: null,
        },
      ],
    });
  });

  it('should repeat the payment method and category parameters for each active filter', () => {
    const institution = { id: 'nubank', name: 'Nubank', iconUrl: null, color: null };
    const filters = [
      { kind: 'payment' as const, id: 'pix', label: 'Pix', institution },
      { kind: 'payment' as const, id: 'cartao', label: 'Cartão', institution },
      { kind: 'category' as const, id: 'Mercado', label: 'Mercado' },
    ];
    api.list('realized', 0, 50, filters).subscribe();
    api.listPeriods('realized', filters).subscribe();

    for (const url of ['/api/gastos', '/api/gastos/periodos']) {
      const request = http.expectOne((req) => req.url === url);
      expect(request.request.params.getAll('metodoPagamentoId')).toEqual(['pix', 'cartao']);
      expect(request.request.params.getAll('categoria')).toEqual(['Mercado']);
      request.flush(
        url === '/api/gastos'
          ? { dados: [], paginacao: { pagina: 0, tamanho: 50, totalElementos: 0, totalPaginas: 0 } }
          : { dados: [] },
      );
    }
  });

  it('should report that there is no next page on the last page', () => {
    const result = vi.fn();
    api.list('realized', 2, 50).subscribe(result);

    http
      .expectOne((req) => req.url === '/api/gastos')
      .flush({
        dados: [],
        paginacao: { pagina: 2, tamanho: 50, totalElementos: 100, totalPaginas: 3 },
      });

    expect(result).toHaveBeenCalledWith({ items: [], hasNext: false });
  });

  it('should request the totals of the whole month and summarize them with the categories in alphabetical order', () => {
    const result = vi.fn();
    api.getMonthTotals('2026-02').subscribe(result);

    const categories = http.expectOne((req) => req.url === '/api/gastos/totais/categoria');
    const payments = http.expectOne((req) => req.url === '/api/gastos/totais/metodo-pagamento');
    for (const request of [categories, payments]) {
      expect(request.request.params.get('inicio')).toBe('2026-02-01');
      expect(request.request.params.get('fim')).toBe('2026-02-28');
    }
    const page = <T>(dados: T[]) => ({
      dados,
      paginacao: { pagina: 0, tamanho: 200, totalElementos: dados.length, totalPaginas: 1 },
    });
    categories.flush(
      page([
        { categoria: 'Lazer', realizado: 10, planejado: 20 },
        { categoria: 'Casa', realizado: 90, planejado: 100 },
      ]),
    );
    payments.flush(
      page([
        {
          metodoPagamentoId: 'pix',
          nome: 'Pix Caixa',
          tipo: 'PIX',
          instituicaoFinanceira: { id: 'caixa', nome: 'Caixa', possuiIcone: false, cor: '#005CA9' },
          realizado: 100,
          planejado: 120,
        },
      ]),
    );
    flushUsage([]);

    expect(result).toHaveBeenCalledWith({
      realized: 100,
      planned: 120,
      byCategory: [
        { id: 'Casa', label: 'Casa', realized: 90, planned: 100 },
        { id: 'Lazer', label: 'Lazer', realized: 10, planned: 20 },
      ],
      byPayment: [
        {
          id: 'pix',
          label: 'Pix Caixa',
          realized: 100,
          planned: 120,
          paymentType: 'PIX',
          institution: { id: 'caixa', name: 'Caixa', iconUrl: null, color: '#005CA9' },
        },
      ],
    });
  });

  it('should list the categories in alphabetical order ignoring accents and case', () => {
    const result = vi.fn();
    api.getMonthTotals('2026-11').subscribe(result);

    const page = <T>(dados: T[]) => ({
      dados,
      paginacao: { pagina: 0, tamanho: 200, totalElementos: dados.length, totalPaginas: 1 },
    });
    http
      .expectOne((req) => req.url === '/api/gastos/totais/categoria')
      .flush(
        page(
          ['Saúde', 'água', 'Lazer', 'Educação', 'casa'].map((categoria, indice) => ({
            categoria,
            realizado: 0,
            planejado: 100 - indice,
          })),
        ),
      );
    http.expectOne((req) => req.url === '/api/gastos/totais/metodo-pagamento').flush(page([]));
    flushUsage([]);

    expect(result.mock.calls[0][0].byCategory.map((line: { id: string }) => line.id)).toEqual([
      'água',
      'casa',
      'Educação',
      'Lazer',
      'Saúde',
    ]);
  });

  it('should order the payment totals by type, then by how often each method is used', () => {
    const result = vi.fn();
    api.getMonthTotals('2026-11').subscribe(result);

    const payment = (id: string, tipo: string, instituicao: string, planejado: number) => ({
      metodoPagamentoId: id,
      nome: id,
      tipo,
      instituicaoFinanceira: { id: instituicao, nome: instituicao, possuiIcone: false, cor: null },
      realizado: 0,
      planejado,
    });
    const page = <T>(dados: T[]) => ({
      dados,
      paginacao: { pagina: 0, tamanho: 200, totalElementos: dados.length, totalPaginas: 1 },
    });
    http.expectOne((req) => req.url === '/api/gastos/totais/categoria').flush(page([]));
    http
      .expectOne((req) => req.url === '/api/gastos/totais/metodo-pagamento')
      .flush(
        page([
          payment('ted', 'TED', 'Caixa', 900),
          payment('pix', 'PIX', 'Caixa', 10),
          payment('doc', 'DOC', 'Caixa', 800),
          payment('credito-nubank', 'CREDITO', 'Nubank', 5),
          payment('boleto', 'BOLETO', 'Caixa', 700),
          payment('debito', 'DEBITO', 'Caixa', 600),
          payment('credito-caixa', 'CREDITO', 'Caixa', 1),
          payment('pix-nubank', 'PIX', 'Nubank', 1),
        ]),
      );
    flushUsage([
      ['credito-nubank', 30],
      ['credito-caixa', 4],
      ['pix', 2],
    ]);

    expect(result.mock.calls[0][0].byPayment.map((line: { id: string }) => line.id)).toEqual([
      'credito-nubank',
      'credito-caixa',
      'pix',
      'pix-nubank',
      'debito',
      'boleto',
      'doc',
      'ted',
    ]);
  });

  it('should map the months with realized expenses and their counts', () => {
    const result = vi.fn();
    api.listPeriods('realized').subscribe(result);

    http.expectOne('/api/gastos/periodos').flush({
      dados: [
        { ano: 2026, mes: 11, quantidade: 33 },
        { ano: 2025, mes: 12, quantidade: 4 },
      ],
    });

    expect(result).toHaveBeenCalledWith([
      { year: 2026, month: 11, count: 33 },
      { year: 2025, month: 12, count: 4 },
    ]);
  });

  it('should request the planned expenses and keep the ones without a date', () => {
    const result = vi.fn();
    api.list('planned', 0, 50).subscribe(result);
    const periods = vi.fn();
    api.listPeriods('planned').subscribe(periods);

    http
      .expectOne((req) => req.url === '/api/gastos/planejados')
      .flush({
        dados: [
          {
            id: 'a',
            data: null,
            nome: 'Viagem',
            valor: 900,
            categoria: 'Lazer',
            descricao: null,
            realizado: false,
            metodoPagamento: {
              tipo: 'PIX',
              instituicaoFinanceira: {
                id: 'nubank',
                nome: 'Nubank',
                possuiIcone: false,
                cor: null,
              },
            },
          },
        ],
        paginacao: { pagina: 0, tamanho: 50, totalElementos: 1, totalPaginas: 1 },
      });
    http.expectOne('/api/gastos/planejados/periodos').flush({
      dados: [
        { ano: 2026, mes: 12, quantidade: 3 },
        { ano: null, mes: null, quantidade: 1 },
      ],
    });

    expect(result.mock.lastCall?.[0].items[0].date).toBeNull();
    expect(periods).toHaveBeenCalledWith([
      { year: 2026, month: 12, count: 3 },
      { year: null, month: null, count: 1 },
    ]);
  });

  it('should delete a single expense or the whole installment purchase it belongs to', () => {
    api.delete(buildExpense({ id: 'avulso' })).subscribe();
    http.expectOne({ method: 'DELETE', url: '/api/gastos/avulso' }).flush(null);

    api
      .delete(
        buildExpense({
          id: 'parcela',
          installment: { number: 1, count: 3, purchaseId: 'compra', purchaseAmount: 300 },
        }),
      )
      .subscribe();
    http.expectOne({ method: 'DELETE', url: '/api/compras-parceladas/compra' }).flush(null);
  });

  it('should map the installments of a purchase in order', () => {
    const result = vi.fn();
    api.listInstallments('compra').subscribe(result);

    http.expectOne('/api/compras-parceladas/compra').flush({
      dados: {
        parcelas: [
          { numeroParcela: 2, valor: 50, fatura: { dataVencimento: '2026-12-21' } },
          { numeroParcela: 1, valor: 50, fatura: null },
        ],
      },
    });

    expect(result).toHaveBeenCalledWith([
      { number: 1, amount: 50, invoiceDueDate: null },
      { number: 2, amount: 50, invoiceDueDate: '2026-12-21' },
    ]);
  });

  it('should create a single expense with the API field names', () => {
    const done = vi.fn();
    api
      .create({
        name: 'Mercado',
        amount: 123.45,
        category: 'Casa',
        paymentMethodId: 'pix',
        date: '2026-11-20',
        description: null,
        realized: true,
        installments: 1,
        invoicePeriod: null,
      })
      .subscribe({ complete: done });

    const request = http.expectOne('/api/gastos');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      nome: 'Mercado',
      categoria: 'Casa',
      metodoPagamentoId: 'pix',
      data: '2026-11-20',
      descricao: null,
      faturaPeriodo: null,
      valor: 123.45,
      realizado: true,
    });
    request.flush({ dados: {} }, { status: 201, statusText: 'Created' });
    expect(done).toHaveBeenCalled();
  });

  it('should create an installment purchase when there is more than one installment', () => {
    api
      .create({
        name: 'Geladeira',
        amount: 3000,
        category: 'Casa',
        paymentMethodId: 'credito',
        date: '2026-11-20',
        description: 'Frost free',
        realized: false,
        installments: 10,
        invoicePeriod: '2026-12',
      })
      .subscribe();

    const request = http.expectOne('/api/compras-parceladas');
    expect(request.request.body).toEqual({
      nome: 'Geladeira',
      categoria: 'Casa',
      metodoPagamentoId: 'credito',
      data: '2026-11-20',
      descricao: 'Frost free',
      faturaPeriodo: '2026-12',
      valorTotal: 3000,
      quantidadeParcelas: 10,
      realizado: false,
    });
    request.flush({ dados: {} });
  });

  it('should list the categories as the API orders them', () => {
    const result = vi.fn();
    api.listCategories().subscribe(result);

    http.expectOne('/api/gastos/categorias').flush({
      dados: [
        { categoria: 'Transporte', quantidadeGastos: 30 },
        { categoria: 'Casa', quantidadeGastos: 27 },
      ],
    });

    expect(result).toHaveBeenCalledWith(['Transporte', 'Casa']);
  });

  it('should load a single expense for editing from its details', () => {
    const result = vi.fn();
    api.loadForEdit(buildExpense({ id: 'gasto-9' })).subscribe(result);

    http.expectOne('/api/gastos/gasto-9').flush({
      dados: {
        data: '08/12/2026',
        nome: 'Cinema',
        valor: 25,
        categoria: 'Lazer',
        metodoPagamento: { id: 'credito' },
        fatura: { dataFechamento: '2026-12-14', dataVencimento: '2026-12-21' },
        descricao: null,
        realizado: true,
      },
    });

    expect(result).toHaveBeenCalledWith({
      name: 'Cinema',
      amount: 25,
      category: 'Lazer',
      paymentMethodId: 'credito',
      date: '2026-12-08',
      description: null,
      realized: true,
      installments: 1,
      invoicePeriod: '2026-12',
    });
  });

  it('should load an installment purchase for editing from its first installment', () => {
    const result = vi.fn();
    const expense = buildExpense({
      installment: { number: 2, count: 3, purchaseId: 'compra-1', purchaseAmount: 300 },
    });
    api.loadForEdit(expense).subscribe(result);

    http.expectOne('/api/compras-parceladas/compra-1').flush({
      dados: {
        nome: 'Geladeira',
        categoria: 'Casa',
        metodoPagamento: { id: 'credito' },
        descricao: 'Frost free',
        valorTotal: 300,
        quantidadeParcelas: 3,
        parcelas: [
          {
            numeroParcela: 2,
            data: '10/11/2026',
            fatura: { dataFechamento: '2026-12-14' },
            realizado: false,
          },
          {
            numeroParcela: 1,
            data: '10/11/2026',
            fatura: { dataFechamento: '2026-11-14' },
            realizado: false,
          },
        ],
      },
    });

    expect(result).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 300,
        installments: 3,
        date: '2026-11-10',
        realized: false,
        invoicePeriod: '2026-11',
      }),
    );
  });

  it('should update a single expense or the whole purchase', () => {
    const changes = {
      name: 'Geladeira',
      amount: 600,
      category: 'Casa',
      paymentMethodId: 'credito',
      date: '2026-11-10',
      description: null,
      realized: true,
      installments: 4,
      invoicePeriod: null,
    };
    api.update(buildExpense({ id: 'gasto-9' }), { ...changes, installments: 1 }).subscribe();
    api
      .update(
        buildExpense({
          installment: { number: 1, count: 3, purchaseId: 'compra-1', purchaseAmount: 300 },
        }),
        changes,
      )
      .subscribe();

    const single = http.expectOne('/api/gastos/gasto-9');
    expect(single.request.method).toBe('PUT');
    expect(single.request.body).toEqual(
      expect.objectContaining({ valor: 600, realizado: true, faturaPeriodo: null }),
    );
    const purchase = http.expectOne('/api/compras-parceladas/compra-1');
    expect(purchase.request.method).toBe('PUT');
    expect(purchase.request.body).toEqual(
      expect.objectContaining({ valorTotal: 600, quantidadeParcelas: 4, realizado: true }),
    );
    single.flush({ dados: {} });
    purchase.flush({ dados: {} });
  });
});
