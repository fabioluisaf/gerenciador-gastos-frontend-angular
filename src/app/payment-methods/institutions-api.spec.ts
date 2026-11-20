import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { InstitutionsApi } from './institutions-api';

describe('InstitutionsApi', () => {
  let api: InstitutionsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(InstitutionsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should list the institutions mapped to the domain', () => {
    const result = vi.fn();
    api.list().subscribe(result);

    http.expectOne('/api/instituicoes-financeiras').flush({
      dados: [{ id: 'nu', nome: 'Nubank', possuiIcone: true, cor: '#820AD1' }],
      paginacao: { pagina: 0, tamanho: 100, totalElementos: 1, totalPaginas: 1 },
    });

    expect(result).toHaveBeenCalledWith([
      {
        id: 'nu',
        name: 'Nubank',
        iconUrl: '/api/instituicoes-financeiras/nu/icone',
        color: '#820AD1',
      },
    ]);
  });

  it('should send a new institution as multipart, leaving out what was not filled', () => {
    const icon = new File(['png'], 'icone.png', { type: 'image/png' });
    api.create({ name: 'Inter', color: '#FF7A00', icon }).subscribe();
    api.create({ name: 'Carteira', color: null, icon: null }).subscribe();

    const [complete, minimal] = http.match('/api/instituicoes-financeiras');
    const full = complete.request.body as FormData;
    expect(full.get('nome')).toBe('Inter');
    expect(full.get('cor')).toBe('#FF7A00');
    expect((full.get('icone') as File).name).toBe('icone.png');
    const bare = minimal.request.body as FormData;
    expect(bare.get('nome')).toBe('Carteira');
    expect(bare.has('cor')).toBe(false);
    expect(bare.has('icone')).toBe(false);
    complete.flush({ dados: {} });
    minimal.flush({ dados: {} });
  });
});
