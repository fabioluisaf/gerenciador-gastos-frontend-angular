import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { InvoicesApi } from './invoices-api';

describe('InvoicesApi', () => {
  it('should list the invoices of a card mapped to the domain', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const result = vi.fn();

    TestBed.inject(InvoicesApi).list('cartao').subscribe(result);

    const request = http.expectOne((req) => req.url === '/api/faturas/cartao/cartao');
    expect(request.request.params.get('size')).toBe('200');
    request.flush({
      dados: [
        {
          id: 'f1',
          dataFechamento: '2026-12-14',
          dataVencimento: '2026-12-21',
          valorTotal: 657.08,
        },
      ],
      paginacao: { pagina: 0, tamanho: 200, totalElementos: 1, totalPaginas: 1 },
    });

    expect(result).toHaveBeenCalledWith([
      { id: 'f1', closingDate: '2026-12-14', dueDate: '2026-12-21', total: 657.08 },
    ]);
    http.verify();
  });
});
