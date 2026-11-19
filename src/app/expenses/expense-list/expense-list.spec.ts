import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NEVER, Observable, of, Subject, throwError } from 'rxjs';
import { Page } from '../../core/api';
import { provideAppLocale } from '../../core/locale';
import { stubDialogs } from '../../shared/testing/dialog-stub';
import { TimelineScrubber } from '../../shared/timeline-scrubber/timeline-scrubber';
import { Expense, ExpenseFilter, ExpenseKind, ExpensePeriod } from '../expense';
import { ExpenseCard } from '../expense-card/expense-card';
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

type ListExpenses = (
  kind: ExpenseKind,
  page: number,
  size: number,
  filters: readonly ExpenseFilter[],
) => Observable<Page<Expense>>;

describe('ExpenseList', () => {
  let list: ReturnType<typeof vi.fn<ListExpenses>>;
  let periods: ExpensePeriod[];
  let listPeriods: ReturnType<typeof vi.fn>;
  let deleteExpense: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', VisibleIntersectionObserver);
    Element.prototype.scrollIntoView = vi.fn();
    vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined);
    list = vi.fn<ListExpenses>();
    periods = [];
    listPeriods = vi.fn(() => of(periods));
    deleteExpense = vi.fn(() => of(undefined));
    TestBed.configureTestingModule({
      providers: [
        provideAppLocale(),
        {
          provide: ExpensesApi,
          useValue: { list, listPeriods, delete: deleteExpense },
        },
      ],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function render(): Promise<ComponentFixture<ExpenseList>> {
    const fixture = TestBed.createComponent(ExpenseList);
    await fixture.whenStable();
    return fixture;
  }

  function dayLabels(element: HTMLElement): string[] {
    return [...element.querySelectorAll('section.day h3')].map(
      (label) => label.textContent?.trim() ?? '',
    );
  }

  it('should load older pages while the end of the list is visible and group expenses by day', async () => {
    list
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

    expect(list.mock.calls).toEqual([
      ['realized', 0, 50, []],
      ['realized', 1, 50, []],
    ]);
    expect(dayLabels(element)).toEqual([
      '19 de nov de 2026 — Quinta-feira',
      '15 de nov de 2026 — Domingo',
    ]);
    expect(
      [...element.querySelectorAll('section.day')].map(
        (day) => day.querySelectorAll('app-expense-card').length,
      ),
    ).toEqual([2, 1]);
    expect(element.querySelector('[appInViewport]')).toBeNull();
  });

  it('should show the timeline with the months proportional to their expenses', async () => {
    periods = [
      { year: 2026, month: 11, count: 75 },
      { year: 2026, month: 10, count: 25 },
    ];
    list.mockReturnValue(of({ items: [buildExpense()], hasNext: false }));

    const fixture = await render();
    const scrubber = fixture.debugElement.query(By.directive(TimelineScrubber))
      .componentInstance as TimelineScrubber;

    expect(scrubber.marks()).toEqual([
      { id: '2026-11', label: 'nov de 2026', position: 0 },
      { id: '2026-10', label: 'out de 2026', position: 0.75 },
    ]);
  });

  it('should jump to the page of a month that is not loaded and then load the newer pages above it', async () => {
    periods = [
      { year: 2026, month: 11, count: 50 },
      { year: 2026, month: 10, count: 50 },
      { year: 2026, month: 1, count: 10 },
    ];
    let pageOneRequests = 0;
    list.mockImplementation((_, page) => {
      if (page === 0) {
        return of({ items: [buildExpense({ id: 'nov', date: '2026-11-19' })], hasNext: true });
      }
      if (page === 1) {
        pageOneRequests++;
        return pageOneRequests === 1
          ? NEVER
          : of({ items: [buildExpense({ id: 'out', date: '2026-10-05' })], hasNext: true });
      }
      return of({ items: [buildExpense({ id: 'jan', date: '2026-01-20' })], hasNext: false });
    });

    const fixture = await render();
    fixture.debugElement
      .query(By.directive(TimelineScrubber))
      .triggerEventHandler('selected', '2026-01');
    await fixture.whenStable();

    expect(list.mock.calls).toEqual([
      ['realized', 0, 50, []],
      ['realized', 1, 50, []],
      ['realized', 2, 50, []],
      ['realized', 1, 50, []],
      ['realized', 0, 50, []],
    ]);
    expect(dayLabels(fixture.nativeElement)).toEqual([
      '19 de nov de 2026 — Quinta-feira',
      '05 de out de 2026 — Segunda-feira',
      '20 de jan de 2026 — Terça-feira',
    ]);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('should only scroll when the chosen month is already loaded', async () => {
    periods = [
      { year: 2026, month: 11, count: 1 },
      { year: 2026, month: 10, count: 1 },
    ];
    list.mockReturnValue(
      of({
        items: [
          buildExpense({ id: 'nov', date: '2026-11-19' }),
          buildExpense({ id: 'out', date: '2026-10-05' }),
        ],
        hasNext: false,
      }),
    );

    const fixture = await render();
    fixture.debugElement
      .query(By.directive(TimelineScrubber))
      .triggerEventHandler('selected', '2026-10');
    await fixture.whenStable();

    expect(list).toHaveBeenCalledOnce();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
  });

  it('should restart from the newest page with the new filters and refresh the timeline', async () => {
    const mercado: ExpenseFilter = { kind: 'category', id: 'Mercado', label: 'Mercado' };
    list.mockImplementation((_, __, ___, filters) =>
      of({
        items: [buildExpense({ id: filters.length ? 'filtrado' : 'todos', date: '2026-11-19' })],
        hasNext: false,
      }),
    );
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    const fixture = await render();
    fixture.componentRef.setInput('filters', [mercado]);
    await fixture.whenStable();

    expect(list.mock.calls).toEqual([
      ['realized', 0, 50, []],
      ['realized', 0, 50, [mercado]],
    ]);
    expect(listPeriods).toHaveBeenLastCalledWith('realized', [mercado]);
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(fixture.nativeElement.querySelectorAll('app-expense-card')).toHaveLength(1);
  });

  it('should explain when the filters leave nothing to show', async () => {
    list.mockReturnValue(of({ items: [], hasNext: false }));
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

    const fixture = await render();
    fixture.componentRef.setInput('filters', [{ kind: 'category', id: 'X', label: 'X' }]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('output')?.textContent).toContain(
      'Nenhum gasto com esses filtros',
    );
  });

  it('should show a loading message while a page is on its way', async () => {
    list.mockReturnValue(new Subject<Page<Expense>>());

    const element: HTMLElement = (await render()).nativeElement;

    expect(element.querySelector('output')?.textContent).toContain('Carregando gastos');
    expect(list).toHaveBeenCalledOnce();
  });

  it('should show an empty message when there are no expenses', async () => {
    list.mockReturnValue(of({ items: [], hasNext: false }));

    const element: HTMLElement = (await render()).nativeElement;

    expect(element.querySelector('output')?.textContent).toContain('Nenhum gasto realizado ainda');
    expect(element.querySelector('app-timeline-scrubber')).toBeNull();
  });

  it('should list the planned expenses with their own timeline and an undated group last', async () => {
    periods = [
      { year: 2026, month: 12, count: 1 },
      { year: null, month: null, count: 1 },
    ];
    list.mockReturnValue(
      of({
        items: [
          buildExpense({ id: 'dez', date: '2026-12-05' }),
          buildExpense({ id: 'sem-data', date: null }),
        ],
        hasNext: false,
      }),
    );

    const fixture = TestBed.createComponent(ExpenseList);
    fixture.componentRef.setInput('kind', 'planned');
    await fixture.whenStable();
    const scrubber = fixture.debugElement.query(By.directive(TimelineScrubber))
      .componentInstance as TimelineScrubber;

    expect(list).toHaveBeenCalledWith('planned', 0, 50, []);
    expect(listPeriods).toHaveBeenCalledWith('planned', []);
    expect(dayLabels(fixture.nativeElement)).toEqual([
      '05 de dez de 2026 — Sábado',
      'Sem data definida',
    ]);
    expect(scrubber.marks()).toEqual([
      { id: '2026-12', label: 'dez de 2026', position: 0 },
      { id: 'sem-data', label: 'Sem data', position: 0.5 },
    ]);
  });

  it('should show its own empty message for planned expenses', async () => {
    list.mockReturnValue(of({ items: [], hasNext: false }));

    const fixture = TestBed.createComponent(ExpenseList);
    fixture.componentRef.setInput('kind', 'planned');
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('output')?.textContent).toContain(
      'Nenhum gasto planejado',
    );
  });

  it('should let the user retry after a failure', async () => {
    list
      .mockReturnValueOnce(throwError(() => new Error('offline')))
      .mockReturnValueOnce(of({ items: [buildExpense()], hasNext: false }));

    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('output')?.textContent).toContain(
      'Não foi possível carregar os gastos',
    );

    element.querySelector<HTMLButtonElement>('.retry')!.click();
    await fixture.whenStable();

    expect(list).toHaveBeenCalledTimes(2);
    expect(element.querySelectorAll('app-expense-card')).toHaveLength(1);
  });

  it('should delete an installment purchase after confirmation and drop all of its cards', async () => {
    const restoreDialogs = stubDialogs();
    const purchase = { count: 2, purchaseId: 'compra', purchaseAmount: 200 };
    list.mockReturnValueOnce(
      of({
        items: [
          buildExpense({ id: 'avulso', name: 'Padaria' }),
          buildExpense({ id: 'p1', name: 'Geladeira', installment: { number: 1, ...purchase } }),
          buildExpense({ id: 'p2', name: 'Geladeira', installment: { number: 2, ...purchase } }),
        ],
        hasNext: false,
      }),
    );
    const fixture = await render();
    const deleted = vi.fn();
    fixture.componentInstance.expenseDeleted.subscribe(deleted);
    const element: HTMLElement = fixture.nativeElement;
    const periodRequests = listPeriods.mock.calls.length;

    fixture.debugElement
      .queryAll(By.directive(ExpenseCard))[1]
      .componentInstance.deleteRequested.emit();
    await fixture.whenStable();

    expect(element.querySelector('dialog .message')?.textContent).toBe(
      '"Geladeira" e as 2 parcelas da compra serão excluídos.',
    );
    expect(deleteExpense).not.toHaveBeenCalled();

    element.querySelector<HTMLButtonElement>('dialog .danger')!.click();
    await fixture.whenStable();

    expect(deleteExpense).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
    expect([...element.querySelectorAll('.name')].map((name) => name.textContent)).toEqual([
      'Padaria',
    ]);
    expect(listPeriods.mock.calls.length).toBe(periodRequests + 1);
    expect(deleted).toHaveBeenCalledTimes(1);
    expect(element.querySelector('dialog')?.open).toBe(false);
    restoreDialogs();
  });

  it('should title the first day of each month with the month name', async () => {
    list.mockReturnValueOnce(
      of({
        items: [
          buildExpense({ id: 'a', date: '2026-12-03' }),
          buildExpense({ id: 'b', date: '2026-12-01' }),
          buildExpense({ id: 'c', date: '2026-11-30' }),
        ],
        hasNext: false,
      }),
    );
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;

    const sections = [...element.querySelectorAll('section.day')].map(
      (section) => section.querySelector('h2.month-label')?.textContent?.trim() ?? null,
    );
    expect(sections).toEqual(['Dezembro de 2026', null, 'Novembro de 2026']);
  });
});
