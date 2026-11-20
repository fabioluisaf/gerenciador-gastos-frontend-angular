import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PaymentMethodsApi } from './payment-methods-api';

describe('PaymentMethodsApi', () => {
  let api: PaymentMethodsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PaymentMethodsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function dto(tipo: string, nome: string, instituicao: string, dias: [number, number] | null) {
    return {
      id: `${tipo}-${instituicao}`,
      tipo,
      nome,
      instituicaoFinanceira: {
        id: instituicao,
        nome: instituicao,
        possuiIcone: true,
        cor: '#820AD1',
      },
      diaFechamento: dias?.[0] ?? null,
      diaVencimento: dias?.[1] ?? null,
    };
  }

  it('should list every method with its usage, ordered by type and then by usage', () => {
    const result = vi.fn();
    api.list().subscribe(result);

    const request = http.expectOne((req) => req.url === '/api/metodos-pagamento');
    expect(request.request.params.get('size')).toBe('200');
    request.flush({
      dados: [
        dto('BOLETO', 'Boleto Caixa', 'Caixa', null),
        dto('PIX', 'Pix nubank', 'Nubank', null),
        dto('CREDITO', 'Cartao Nubank', 'Nubank', [14, 21]),
        dto('PIX', 'Pix caixa', 'Caixa', null),
        dto('CREDITO', 'Crédito Caixa', 'Caixa', [5, 12]),
        dto('DEBITO', 'Débito Nubank', 'Nubank', null),
      ],
      paginacao: { pagina: 0, tamanho: 200, totalElementos: 6, totalPaginas: 1 },
    });
    http.expectOne('/api/metodos-pagamento/uso').flush({
      dados: [
        { metodoPagamentoId: 'CREDITO-Nubank', quantidadeGastos: 40 },
        { metodoPagamentoId: 'CREDITO-Caixa', quantidadeGastos: 9 },
        { metodoPagamentoId: 'PIX-Nubank', quantidadeGastos: 7 },
      ],
    });

    const methods = result.mock.calls[0][0];
    expect(methods.map((method: { name: string }) => method.name)).toEqual([
      'Cartao Nubank',
      'Crédito Caixa',
      'Pix nubank',
      'Pix caixa',
      'Débito Nubank',
      'Boleto Caixa',
    ]);
    expect(methods[0]).toEqual({
      id: 'CREDITO-Nubank',
      name: 'Cartao Nubank',
      paymentType: 'CREDITO',
      institution: {
        id: 'Nubank',
        name: 'Nubank',
        iconUrl: '/api/instituicoes-financeiras/Nubank/icone',
        color: '#820AD1',
      },
      closingDay: 14,
      dueDay: 21,
      usageCount: 40,
    });
  });

  it('should delete a method by its id', () => {
    const done = vi.fn();
    api
      .delete({
        id: 'pix-nubank',
        name: 'Pix nubank',
        paymentType: 'PIX',
        institution: { id: 'nu', name: 'Nubank', iconUrl: null, color: null },
        closingDay: null,
        dueDay: null,
        usageCount: 0,
      })
      .subscribe({ complete: done });

    const request = http.expectOne('/api/metodos-pagamento/pix-nubank');
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toHaveBeenCalled();
  });

  it('should create a method with the API field names', () => {
    api
      .create({
        paymentType: 'CREDITO',
        institutionId: 'nu',
        name: 'Cartao Nubank',
        closingDay: 14,
        dueDay: 21,
      })
      .subscribe();

    const request = http.expectOne('/api/metodos-pagamento');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      tipo: 'CREDITO',
      instituicaoFinanceiraId: 'nu',
      nome: 'Cartao Nubank',
      diaFechamento: 14,
      diaVencimento: 21,
    });
    request.flush({ dados: {} });
  });

  it('should update a method without sending its type', () => {
    api
      .update(
        {
          id: 'cartao',
          name: 'Cartao Nubank',
          paymentType: 'CREDITO',
          institution: { id: 'nu', name: 'Nubank', iconUrl: null, color: null },
          closingDay: 14,
          dueDay: 21,
          usageCount: 3,
        },
        {
          paymentType: 'CREDITO',
          institutionId: 'nu',
          name: 'Roxinho',
          closingDay: 10,
          dueDay: 17,
        },
      )
      .subscribe();

    const request = http.expectOne('/api/metodos-pagamento/cartao');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      instituicaoFinanceiraId: 'nu',
      nome: 'Roxinho',
      diaFechamento: 10,
      diaVencimento: 17,
    });
    request.flush({ dados: {} });
  });
});
