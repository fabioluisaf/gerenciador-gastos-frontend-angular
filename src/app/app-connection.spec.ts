import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';

describe('Backend connection states', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  it('should distinguish an unavailable backend from an empty database and retry without fake data', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    TestBed.configureTestingModule({
      imports: [App], providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    http.expectOne('/api/gastos/periodos').error(new ProgressEvent('error'));
    await fixture.whenStable();
    expect(compiled.querySelector('.application-state h2')?.textContent).toBe('Servidor back-end offline');
    expect(compiled.textContent).not.toContain('Não foi possível carregar os períodos');
    expect(compiled.querySelector<HTMLButtonElement>('.create-toggle')?.disabled).toBe(true);
    expect(compiled.textContent).not.toContain('Nenhum gasto cadastrado');
    compiled.querySelector<HTMLButtonElement>('.application-state button')!.click();
    fixture.detectChanges();
    http.expectOne('/api/gastos/periodos').flush({ dados: [], versao: 'test' });
    http.expectOne((req) => req.url === '/api/metodos-pagamento').flush({
      dados: [], versao: 'test',
      paginacao: { pagina: 0, tamanho: 100, totalElementos: 0, totalPaginas: 0 },
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    for (const request of http.match((req) => req.url === '/api/gastos/intervalo' || req.url.includes('/totais/'))) {
      request.flush({ dados: [], versao: 'test', paginacao: { pagina: 0, tamanho: 10, totalElementos: 0, totalPaginas: 0 } });
    }
    await fixture.whenStable();
    expect(compiled.querySelector('.application-state h2')?.textContent).toBe('Nenhum gasto cadastrado');
    expect(compiled.querySelector<HTMLButtonElement>('.create-toggle')?.disabled).toBe(false);
    expect(compiled.querySelectorAll('tbody tr.payment-tag')).toHaveLength(0);
    http.verify();
  });
});
