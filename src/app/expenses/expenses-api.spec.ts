import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ExpensesApi } from './expenses-api';

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

  it('should request a page of realized expenses and map them to the domain model', () => {
    const result = vi.fn();
    api.listRealized(1, 50).subscribe(result);

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
          metodoPagamento: {
            tipo: 'PIX',
            instituicaoFinanceira: { id: 'caixa', nome: 'Caixa', possuiIcone: true },
          },
          parcela: { numero: 2, quantidade: 3 },
        },
        {
          id: 'b',
          data: '18/11/2026',
          nome: 'Livro',
          valor: 40,
          categoria: 'Educação',
          descricao: 'Presente',
          metodoPagamento: {
            tipo: 'DEBITO',
            instituicaoFinanceira: { id: 'banco', nome: 'Banco', possuiIcone: false },
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
          paymentType: 'PIX',
          institution: {
            id: 'caixa',
            name: 'Caixa',
            iconUrl: '/api/instituicoes-financeiras/caixa/icone',
          },
          installment: { number: 2, total: 3 },
        },
        {
          id: 'b',
          date: '2026-11-18',
          name: 'Livro',
          amount: 40,
          category: 'Educação',
          description: 'Presente',
          paymentType: 'DEBITO',
          institution: { id: 'banco', name: 'Banco', iconUrl: null },
          installment: null,
        },
      ],
    });
  });

  it('should report that there is no next page on the last page', () => {
    const result = vi.fn();
    api.listRealized(2, 50).subscribe(result);

    http
      .expectOne((req) => req.url === '/api/gastos')
      .flush({
        dados: [],
        paginacao: { pagina: 2, tamanho: 50, totalElementos: 100, totalPaginas: 3 },
      });

    expect(result).toHaveBeenCalledWith({ items: [], hasNext: false });
  });
});
