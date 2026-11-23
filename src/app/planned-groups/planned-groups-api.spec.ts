import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PlannedGroupsApi } from './planned-groups-api';

const ITEM_DTO = { nome: 'Luz', valor: 120, categoria: 'Casa', descricao: null };
const ITEM = { name: 'Luz', amount: 120, category: 'Casa', description: null };

describe('PlannedGroupsApi', () => {
  let api: PlannedGroupsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PlannedGroupsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should list the groups mapped to the domain model', () => {
    const result = vi.fn();
    api.list().subscribe(result);

    const request = http.expectOne((req) => req.url === '/api/grupos-planejados');
    expect(request.request.params.get('size')).toBe('200');
    request.flush({ dados: [{ id: 'g', nome: 'Contas', valorTotal: 120, itens: [ITEM_DTO] }] });

    expect(result).toHaveBeenCalledWith([{ id: 'g', name: 'Contas', total: 120, items: [ITEM] }]);
  });

  it('should create, update and delete a group', () => {
    api.create({ name: 'Contas', items: [ITEM] }).subscribe();
    const created = http.expectOne('/api/grupos-planejados');
    expect(created.request.method).toBe('POST');
    expect(created.request.body).toEqual({ nome: 'Contas', itens: [ITEM_DTO] });
    created.flush({ dados: { id: 'g', nome: 'Contas', valorTotal: 120, itens: [ITEM_DTO] } });

    api.update('g', { name: 'Casa', items: [ITEM] }).subscribe();
    const updated = http.expectOne('/api/grupos-planejados/g');
    expect(updated.request.method).toBe('PUT');
    expect(updated.request.body).toEqual({ nome: 'Casa', itens: [ITEM_DTO] });
    updated.flush({ dados: { id: 'g', nome: 'Casa', valorTotal: 120, itens: [ITEM_DTO] } });

    api.delete('g').subscribe();
    const deleted = http.expectOne('/api/grupos-planejados/g');
    expect(deleted.request.method).toBe('DELETE');
    deleted.flush(null);
  });

  it('should apply the reviewed items to an invoice', () => {
    const done = vi.fn();
    api
      .apply('g', {
        paymentMethodId: 'nubank',
        date: null,
        invoicePeriod: '2026-12',
        items: [ITEM],
      })
      .subscribe(done);

    const request = http.expectOne('/api/grupos-planejados/g/aplicacoes');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      metodoPagamentoId: 'nubank',
      data: null,
      faturaPeriodo: '2026-12',
      itens: [ITEM_DTO],
    });
    request.flush({ dados: [] });
    expect(done).toHaveBeenCalled();
  });
});
