import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { Page } from '../../core/api';
import { provideAppLocale } from '../../core/locale';
import { Expense } from '../expense';
import { ExpensesApi } from '../expenses-api';
import { buildExpense } from '../testing/expense-builder';
import { ExpenseList } from './expense-list';

class VisibleIntersectionObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}

  observe(): void {
    this.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }

  disconnect(): void {}
}

describe('ExpenseList', () => {
  let listRealized: ReturnType<
    typeof vi.fn<(page: number, size: number) => Observable<Page<Expense>>>
  >;

  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', VisibleIntersectionObserver);
    listRealized = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideAppLocale(), { provide: ExpensesApi, useValue: { listRealized } }],
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  async function render(): Promise<ComponentFixture<ExpenseList>> {
    const fixture = TestBed.createComponent(ExpenseList);
    await fixture.whenStable();
    return fixture;
  }

  it('should load pages while the end of the list is visible and group expenses by day', async () => {
    listRealized
      .mockReturnValueOnce(
        of({
          items: [
            buildExpense({ id: 'a', date: '2026-11-19' }),
            buildExpense({ id: 'b', date: '2026-11-19' }),
          ],
          hasNext: true,
        }),
      )
      .mockReturnValueOnce(
        of({ items: [buildExpense({ id: 'c', date: '2026-11-15' })], hasNext: false }),
      );

    const element: HTMLElement = (await render()).nativeElement;

    expect(listRealized.mock.calls).toEqual([
      [0, 50],
      [1, 50],
    ]);
    const days = [...element.querySelectorAll('section.day')];
    expect(days.map((day) => day.querySelector('h2')?.textContent?.trim())).toEqual([
      '19 de nov de 2026 — Quinta-feira',
      '15 de nov de 2026 — Domingo',
    ]);
    expect(days.map((day) => day.querySelectorAll('app-expense-card').length)).toEqual([2, 1]);
    expect(element.querySelector('[appInViewport]')).toBeNull();
  });

  it('should show a loading message while a page is on its way', async () => {
    listRealized.mockReturnValue(new Subject<Page<Expense>>());

    const element: HTMLElement = (await render()).nativeElement;

    expect(element.querySelector('[role="status"]')?.textContent).toContain('Carregando gastos');
    expect(listRealized).toHaveBeenCalledOnce();
  });

  it('should show an empty message when there are no expenses', async () => {
    listRealized.mockReturnValue(of({ items: [], hasNext: false }));

    const element: HTMLElement = (await render()).nativeElement;

    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Nenhum gasto realizado ainda',
    );
  });

  it('should let the user retry after a failure', async () => {
    listRealized
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValueOnce(of({ items: [buildExpense()], hasNext: false }));

    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Não foi possível carregar os gastos',
    );

    element.querySelector<HTMLButtonElement>('.retry')!.click();
    await fixture.whenStable();

    expect(listRealized).toHaveBeenCalledTimes(2);
    expect(element.querySelectorAll('app-expense-card')).toHaveLength(1);
  });
});
