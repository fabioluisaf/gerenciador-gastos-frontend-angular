import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ControlBarState } from '../../control-bar/control-bar-state';
import { provideAppLocale } from '../../core/locale';
import { ExpenseList } from '../expense-list/expense-list';
import { ExpenseFilters } from '../expense-filters';
import { ExpensesApi } from '../expenses-api';
import { buildMonthTotals } from '../testing/month-totals-builder';
import { currentPeriodKey } from '../timeline';
import { stubDialogs } from '../../shared/testing/dialog-stub';
import { ExpensesPage } from './expenses-page';

describe('ExpensesPage', () => {
  let getMonthTotals: ReturnType<typeof vi.fn>;
  let fixture: ComponentFixture<ExpensesPage>;
  let element: HTMLElement;
  let mediaListeners: ((event: MediaQueryListEvent) => void)[];
  let restoreDialogs: () => void;

  beforeEach(async () => {
    mediaListeners = [];
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
        mediaListeners.push(listener),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe(): void {}
        disconnect(): void {}
      },
    );
    Element.prototype.scrollTo = vi.fn();
    restoreDialogs = stubDialogs();
    getMonthTotals = vi.fn(() => of(buildMonthTotals()));
    TestBed.configureTestingModule({
      providers: [
        provideAppLocale(),
        provideRouter([]),
        {
          provide: ExpensesApi,
          useValue: {
            getMonthTotals,
            getFilteredTotals: () => of({ realized: 12, planned: 30 }),
            list: () => of({ items: [], hasNext: false }),
            listPeriods: () => of([]),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(ExpensesPage);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    restoreDialogs();
  });

  function sheet(): HTMLDialogElement {
    return element.querySelector('app-bottom-sheet dialog')!;
  }

  it('should load the totals of the current month until the list reports the month at the top', async () => {
    expect(getMonthTotals).toHaveBeenCalledWith(currentPeriodKey());

    fixture.debugElement
      .query(By.directive(ExpenseList))
      .componentInstance.activePeriod.set('2026-03');
    await fixture.whenStable();

    expect(getMonthTotals).toHaveBeenLastCalledWith('2026-03');
    expect(element.querySelector('.mini-player-label')?.textContent).toBe('Total de mar de 2026');
    expect(element.querySelector('aside app-month-totals .title')?.textContent).toBe(
      'Totais de mar de 2026',
    );
  });

  it('should keep the totals of the last month while the list shows the planned expenses without a date', async () => {
    const list = fixture.debugElement.query(By.directive(ExpenseList))
      .componentInstance as ExpenseList;

    list.activePeriod.set('2026-12');
    await fixture.whenStable();
    list.activePeriod.set('sem-data');
    await fixture.whenStable();

    expect(getMonthTotals).toHaveBeenLastCalledWith('2026-12');
    expect(element.querySelector('.mini-player-label')?.textContent).toBe('Total de dez de 2026');
  });

  it('should show the realized expenses by default and the planned ones when the route asks for them', async () => {
    const list = fixture.debugElement.query(By.directive(ExpenseList))
      .componentInstance as ExpenseList;
    expect(list.kind()).toBe('realized');
    expect(element.querySelector('h1')?.textContent).toBe('Gastos realizados');

    fixture.componentRef.setInput('kind', 'planned');
    await fixture.whenStable();

    expect(list.kind()).toBe('planned');
    expect(element.querySelector('h1')?.textContent).toBe('Gastos planejados');
    expect(element.querySelector('.list-header app-expense-kind-toggle')).not.toBeNull();
  });

  it('should keep the filters when the page is opened again for the other kind of expense', async () => {
    const casa = { kind: 'category' as const, id: 'Casa', label: 'Casa' };
    TestBed.inject(ExpenseFilters).toggle(casa);
    fixture.destroy();

    const planned = TestBed.createComponent(ExpensesPage);
    planned.componentRef.setInput('kind', 'planned');
    await planned.whenStable();

    const list = planned.debugElement.query(By.directive(ExpenseList))
      .componentInstance as ExpenseList;
    expect(list.filters()).toEqual([casa]);
    expect(
      planned.nativeElement.querySelector('.list-header app-expense-filter-bar'),
    ).not.toBeNull();
  });

  it('should show the realized total in the mini player and open the totals sheet hiding the control bar', async () => {
    const controlBar = TestBed.inject(ControlBarState);
    const miniPlayer = element.querySelector<HTMLButtonElement>('.mini-player')!;
    expect(miniPlayer.textContent?.replace(/\s+/g, ' ')).toContain('R$ 150,00');

    miniPlayer.click();
    await fixture.whenStable();

    expect(sheet().open).toBe(true);
    expect(miniPlayer.getAttribute('aria-expanded')).toBe('true');
    expect(controlBar.hidden()).toBe(true);

    sheet().close();
    await fixture.whenStable();

    expect(sheet().open).toBe(false);
    expect(controlBar.hidden()).toBe(false);
  });

  it('should close the sheet when the screen becomes wide enough for the side panel', async () => {
    element.querySelector<HTMLButtonElement>('.mini-player')!.click();
    await fixture.whenStable();

    mediaListeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));

    expect(sheet().open).toBe(false);
    expect(TestBed.inject(ControlBarState).hidden()).toBe(false);
  });

  it('should filter the list from the totals without reloading the totals', async () => {
    const list = fixture.debugElement.query(By.directive(ExpenseList))
      .componentInstance as ExpenseList;
    const totalsRequests = getMonthTotals.mock.calls.length;
    const casa = () =>
      [...element.querySelectorAll<HTMLButtonElement>('aside .row-button')].find((button) =>
        button.textContent?.includes('Casa'),
      )!;

    casa().click();
    await fixture.whenStable();

    expect(list.filters()).toEqual([{ kind: 'category', id: 'Casa', label: 'Casa' }]);
    expect(element.querySelector('app-expense-filter-bar .chip-label')?.textContent).toBe('Casa');
    expect(casa().getAttribute('aria-pressed')).toBe('true');

    casa().click();
    await fixture.whenStable();

    expect(list.filters()).toEqual([]);
    expect(element.querySelector('app-expense-filter-bar')).toBeNull();
    expect(getMonthTotals).toHaveBeenCalledTimes(totalsRequests);
  });

  it('should jump the list to the month picked above the totals', async () => {
    const list = fixture.debugElement.query(By.directive(ExpenseList))
      .componentInstance as ExpenseList;
    const jumpTo = vi.spyOn(list, 'jumpTo');
    const current = element.querySelector<HTMLButtonElement>(
      'aside app-month-strip .month[aria-pressed="true"]',
    );

    current!.click();

    expect(jumpTo).toHaveBeenCalledWith(currentPeriodKey());
  });

  it('should show the control bar again when leaving the page', async () => {
    element.querySelector<HTMLButtonElement>('.mini-player')!.click();
    await fixture.whenStable();

    fixture.destroy();

    expect(TestBed.inject(ControlBarState).hidden()).toBe(false);
  });

  it('should open the name search in the list header and show the filtered totals', async () => {
    const toggle = element.querySelector<HTMLButtonElement>('.search-toggle')!;
    expect(element.querySelector('app-expense-name-search')).toBeNull();

    toggle.click();
    await fixture.whenStable();
    const input = element.querySelector<HTMLInputElement>(
      '.list-header app-expense-name-search input',
    )!;
    expect(document.activeElement).toBe(input);

    TestBed.inject(ExpenseFilters).setName('mercado');
    await fixture.whenStable();
    expect(element.querySelector('.mini-player-label')?.textContent?.trim()).toMatch(
      /^Filtrados em/,
    );
    expect(element.querySelector('.mini-player-amount')?.textContent).toMatch(/R\$\s12,00/);
    expect(element.querySelector('aside app-filtered-total')?.textContent).toMatch(
      /R\$\s12,00 de R\$\s30,00 planejados/,
    );

    toggle.click();
    await fixture.whenStable();
    expect(TestBed.inject(ExpenseFilters).active()).toEqual([]);
    expect(element.querySelector('app-expense-name-search')).toBeNull();
    expect(element.querySelector('app-filtered-total')).toBeNull();
  });
});
