import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App, AUTO_OPEN_EXPENSE_PREVIEW } from './app';
import { ExpenseApi } from './expense-api';
import { Expense, ExpenseMetadata, ExpensePage, ExpenseTotals, PaginationInfo } from './expense-models';
import { mockExpenseList, mockExpensePeriod, mockExpenseTotals } from './mock-expenses';
import { invoiceIsPastDue } from './expense-utils';
import { of, Subject, throwError } from 'rxjs';

describe('App', () => {
  const installmentExpenseName =
    'Abastecimento de combustível para viagens longas e manutenção do veículo familiar';
  const pageResponse = (items: readonly Expense[], pagination: Partial<PaginationInfo> = {}): ExpensePage => ({
    items, page: items.length ? 1 : 0, pageSize: 10, totalItems: items.length,
    totalPages: items.length ? 1 : 0, firstItem: items.length ? 1 : 0, lastItem: items.length,
    ...pagination,
  });
  const mockListViewport = (height: number) => {
    const viewport = { height };
    const originalRect = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.tagName === 'MAIN' ? viewport.height + 60 : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const rect = originalRect.call(this);
      return this.matches('tbody tr')
        ? { ...rect, top: 100 - this.closest('main')!.scrollTop, height: 40 } : rect;
    });
    return viewport;
  };
  let systemIsDark: boolean;
  let prefersReducedMotion: boolean;
  let systemThemeEvents: EventTarget;
  let originalTheme: string | null;
  let originalShowModal: PropertyDescriptor | undefined;

  const mockDialog = (compiled: HTMLElement, selector: string) => {
    const dialog = compiled.querySelector<HTMLDialogElement>(selector)!;
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    });
    return dialog;
  };

  const mockYearDialog = (compiled: HTMLElement) => mockDialog(compiled, '.year-dialog');

  const chooseYear = async (fixture: ComponentFixture<App>, year: number) => {
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.year-selector')!.click();
    await fixture.whenStable();
    const button = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.year-choice'))
      .find((choice) => choice.textContent?.trim() === String(year))!;
    button.click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    systemIsDark = false;
    prefersReducedMotion = true;
    systemThemeEvents = new EventTarget();
    originalTheme = document.documentElement.getAttribute('data-theme');
    originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
    vi.stubGlobal('matchMedia', (query: string) => ({
      get matches() {
        return query === '(prefers-reduced-motion: reduce)' ? prefersReducedMotion : systemIsDark;
      },
      addEventListener: systemThemeEvents.addEventListener.bind(systemThemeEvents),
      removeEventListener: systemThemeEvents.removeEventListener.bind(systemThemeEvents),
    }));

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: AUTO_OPEN_EXPENSE_PREVIEW, useValue: false }],
    })
      .compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (originalShowModal) {
      Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
    } else {
      Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    }
    if (originalTheme === null) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', originalTheme);
    }
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should mark an invoice past due only after its closing day', () => {
    const today = new Date(2027, 0, 19);
    expect(invoiceIsPastDue(2027, 0, 18, new Date(2027, 0, 18))).toBe(false);
    expect(invoiceIsPastDue(2027, 0, 18, today)).toBe(true);
    expect(invoiceIsPastDue(2026, 11, 18, today)).toBe(true);
    expect(invoiceIsPastDue(2027, 1, 18, today)).toBe(false);
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('main h1')?.textContent).toContain('Gastos');
    expect(compiled.querySelectorAll('.content-area')).toHaveLength(3);
    expect(compiled.querySelector('.content-area-primary router-outlet')).not.toBeNull();
    expect(Array.from(compiled.querySelectorAll('th'), (heading) => heading.textContent?.trim()))
      .toEqual(['Data', 'Valor', 'Nome', 'Descrição']);
    expect(Array.from(compiled.querySelectorAll('.content-area h2'), (heading) => heading.textContent?.trim()))
      .toEqual(['Pagamento', 'Categoria']);
    expect(compiled.querySelector<HTMLDialogElement>('.expense-dialog')?.open).toBe(false);
  });

  it.each([true, false])('should handle temporary preview once without reopening after filtering (initial expenses: %s)', async (hasExpenses) => {
    TestBed.overrideProvider(AUTO_OPEN_EXPENSE_PREVIEW, { useValue: true });
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(0);
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: showModal });
    if (!hasExpenses) {
      vi.spyOn(TestBed.inject(ExpenseApi), 'getExpenses').mockReturnValueOnce(of(pageResponse([])));
    }
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const dialog = compiled.querySelector<HTMLDialogElement>('.expense-dialog')!;
    expect(dialog.open).toBe(hasExpenses);
    if (hasExpenses) {
      expect(dialog.querySelector('#expense-dialog-title')?.textContent?.trim()).toBe('Mercado');
    } else {
      expect(dialog.querySelector('.expense-details')).toBeNull();
    }
    dialog.removeAttribute('open');
    dialog.dispatchEvent(new Event('close'));
    compiled.querySelector<HTMLButtonElement>('[aria-label="Filtrar por pagamento: Pix Caixa"]')!.click();
    await fixture.whenStable();
    expect(compiled.querySelector<HTMLDialogElement>('.expense-dialog')?.open).toBe(false);
    expect(compiled.querySelectorAll('.expense-row-action')).toHaveLength(3);
    expect(showModal).toHaveBeenCalledTimes(hasExpenses ? 1 : 0);
  });

  it('should show the current expense list and disable creation until it is available', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const navigation: HTMLElement = fixture.nativeElement.querySelector('.top-navigation');
    const buttons = navigation.querySelectorAll<HTMLButtonElement>('button');
    expect(Array.from(buttons, (button) => button.getAttribute('aria-label'))).toEqual(['Totais', 'Criar']);
    expect(buttons[0].querySelector('svg[lucideChartNoAxesCombined]')).not.toBeNull();
    expect(buttons[1].querySelector('svg[lucidePlus]')).not.toBeNull();
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[1].disabled).toBe(true);
    expect(buttons[1].title).toBe('Criar (disponível em breve)');
  });

  it.each(['button', 'Escape', 'backdrop'])('should dismiss and reopen the totals panel using %s', async (method) => {
    const api = TestBed.inject(ExpenseApi);
    const totalsRequest = vi.spyOn(api, 'getTotals');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const dialog = mockDialog(compiled, '.totals-dialog');
    const toggle = compiled.querySelector<HTMLButtonElement>('.totals-toggle')!;
    toggle.click();
    await fixture.whenStable();
    expect(dialog.open).toBe(true);
    if (method === 'button') {
      expect(dialog.querySelector('.totals-dialog-header button')).toBeNull();
      dialog.querySelector<HTMLButtonElement>('.totals-appendix .totals-close')!.click();
    } else if (method === 'Escape') {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    } else {
      vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(new DOMRect(50, 50, 200, 200));
      dialog.dispatchEvent(new MouseEvent('click', { clientX: 10, clientY: 10, bubbles: true }));
    }
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await fixture.whenStable();
    expect(dialog.open).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(totalsRequest).toHaveBeenCalledTimes(1);
  });

  it.each([
    { year: 2026, month: 1, expectedYear: 2026, expectedMonth: 'Fevereiro', expenseCount: 7 },
    { year: 2027, month: 10, expectedYear: 2027, expectedMonth: 'Julho', expenseCount: 7 },
    { year: 2028, month: 0, expectedYear: 2027, expectedMonth: 'Julho', expenseCount: 7 },
    { year: 2025, month: 10, expectedYear: 2025, expectedMonth: 'Novembro', expenseCount: 0 },
  ])('should open the latest available period through $month/$year', async ({
    year, month, expectedYear, expectedMonth, expenseCount,
  }) => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(year);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(month);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.year-selector')?.textContent?.trim()).toBe(String(expectedYear));
    const selected = compiled.querySelector<HTMLButtonElement>('.month-button[aria-pressed="true"]')!;
    expect(selected.getAttribute('aria-label')).toBe(`${expectedMonth} de ${expectedYear}`);
    expect(selected.disabled).toBe(expenseCount === 0);
    expect(compiled.querySelectorAll('.expense-row-action')).toHaveLength(expenseCount);
  });

  it('should display mock expenses and matching totals for the selected period', async () => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(0);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    mockYearDialog(compiled);
    const cells = () => Array.from(compiled.querySelector<HTMLTableRowElement>('tbody tr')!.cells,
      (cell) => cell.textContent?.trim().replace(/\s+/g, ' '));
    const paymentItems = compiled.querySelectorAll('[aria-labelledby="totais-metodo"] .summary-item');
    const categoryItems = () => compiled.querySelectorAll('[aria-labelledby="totais-categoria"] .summary-item');
    const total = (items: NodeListOf<Element>, name: string) => {
      const item = Array.from(items).find((element) => element.querySelector('dt')?.textContent?.trim() === name)!;
      return Array.from(item.querySelectorAll('dd'), (part) => part.textContent?.trim().replace(/\s+/g, ' '));
    };
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const expensePeriod = compiled.querySelector('#expense-period')!;

    expect(compiled.querySelector('app-invoice-filter')).toBeNull();
    expect(compiled.querySelector('.filter-chip')).toBeNull();
    expect(expensePeriod.textContent).toContain(String(now.getFullYear()));
    expect(cells()).toEqual([`04/${month}/${now.getFullYear()}`, 'R$ 185,90', 'Mercado', 'Compras da semana']);
    expect(total(paymentItems, 'Cartão principal')).toEqual(['Planejado: R$ 314,30', 'Realizado: R$ 314,30']);
    expect(total(paymentItems, 'Pix Caixa')).toEqual(['Planejado: R$ 333,65', 'Realizado: R$ 143,75']);
    const creditPayment = Array.from(paymentItems).find((item) =>
      item.querySelector('dt')?.textContent?.trim() === 'Cartão principal',
    )?.querySelector<HTMLButtonElement>('.summary-filter')!;
    expect(creditPayment.matches('.summary-payment-tag.payment-tag')).toBe(true);
    expect(creditPayment.querySelector('.summary-row-highlight')).toBeNull();
    expect(creditPayment.querySelector('svg[lucideCreditCard]')).not.toBeNull();
    expect(creditPayment.querySelector('img')?.getAttribute('src')).toBe('/nubank.png');
    expect(creditPayment.style
      .getPropertyValue('--payment-background')).toBe('var(--payment-credito-bg)');
    const categoryFilter = Array.from(categoryItems()).find((item) =>
      item.querySelector('dt')?.textContent?.trim() === 'Saúde',
    )?.querySelector('.summary-filter')!;
    expect(categoryFilter.querySelector('.summary-payment-tag')).toBeNull();
    expect(total(categoryItems(), 'Saúde')).toEqual(['Planejado: R$ 139,90', 'Realizado: R$ 49,90']);
    const rows = compiled.querySelectorAll<HTMLTableRowElement>('tbody tr');
    expect(rows[0].classList.contains('planned-expense')).toBe(false);
    expect(rows[5].classList.contains('planned-expense')).toBe(true);
    expect(rows[5].querySelector('button')?.getAttribute('aria-label')).toContain('planejado');

    compiled.querySelectorAll<HTMLButtonElement>('.month-button')[1].click();
    await chooseYear(fixture, 2027);
    expect(cells()[0]).toBe(`21/12/${now.getFullYear()}`);
    expect(expensePeriod.textContent?.trim()).toBe(`Gastos de janeiro de ${now.getFullYear() + 1}`);
    expect(total(categoryItems(), 'Alimentação')).toEqual(['Planejado: R$ 264,40', 'Realizado: R$ 264,40']);
  });

  it('should close expense details only when clicking outside the dialog', async () => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(0);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const dialog = compiled.querySelector<HTMLDialogElement>('.expense-dialog')!;
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    });
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 200, 200));

    compiled.querySelector<HTMLButtonElement>('.expense-row-action')!.click();
    await fixture.whenStable();
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 150, clientY: 150 }));
    dialog.querySelector('.expense-details')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dialog.open).toBe(true);

    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 99, clientY: 150 }));
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
    expect(dialog.querySelector('.expense-details')).toBeNull();
  });

  it('should select only months with expenses in 2026 and 2027', async () => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(0);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const months = compiled.querySelectorAll<HTMLButtonElement>('.month-button');
    mockYearDialog(compiled);
    const expectExpenses = (count: number) => {
      expect(compiled.querySelectorAll('tbody tr')).toHaveLength(count);
      expect(compiled.querySelectorAll('.summary-item').length > 0).toBe(count > 0);
    };

    expectExpenses(7);
    months[11].click();
    await fixture.whenStable();
    expectExpenses(10);
    await chooseYear(fixture, 2027);
    expect(months[0].getAttribute('aria-pressed')).toBe('true');
    expect(Array.from(months, (month) => month.disabled))
      .toEqual([false, false, false, false, false, false, false, true, true, true, true, true]);
    months[6].click();
    await fixture.whenStable();
    expectExpenses(7);
    months[8].click();
    await fixture.whenStable();
    expect(months[6].getAttribute('aria-pressed')).toBe('true');
    expectExpenses(7);
    await chooseYear(fixture, 2026);
    expect(months[0].getAttribute('aria-pressed')).toBe('true');
    expect(Array.from(months).every((month) => !month.disabled)).toBe(true);
  });

  it.each([2026, 2029, 2030])('should select the first month with expenses when January is empty in %i', async (currentYear) => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(currentYear);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(11);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    mockYearDialog(compiled);
    compiled.querySelector<HTMLButtonElement>('.year-selector')!.click();
    await fixture.whenStable();
    if (currentYear >= 2029) {
      compiled.querySelector<HTMLButtonElement>('[aria-label="Página anterior"]')!.click();
      await fixture.whenStable();
    }
    Array.from(compiled.querySelectorAll<HTMLButtonElement>('.year-choice'))
      .find((button) => button.textContent?.trim() === '2026')!.click();
    await fixture.whenStable();
    compiled.querySelector<HTMLButtonElement>('.year-selector')!.click();
    await fixture.whenStable();
    compiled.querySelector<HTMLButtonElement>('[aria-label="Próxima página"]')!.click();
    await fixture.whenStable();
    compiled.querySelector<HTMLButtonElement>('.year-choice')!.click();
    await fixture.whenStable();

    const months = compiled.querySelectorAll<HTMLButtonElement>('.month-button');
    expect(months[0].disabled).toBe(true);
    expect(months[8].disabled).toBe(false);
    expect(months[8].getAttribute('aria-pressed')).toBe('true');
    expect(compiled.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(compiled.querySelector('tbody tr')?.textContent).toContain('15/09/2029');
    expect(compiled.querySelector('tbody tr')?.textContent).toContain('Notebook');
  });

  it('should open the selected expense details and close the dialog', async () => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(0);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const dialog = compiled.querySelector<HTMLDialogElement>('.expense-dialog')!;
    expect(compiled.querySelectorAll('.expense-dialog')).toHaveLength(1);
    mockYearDialog(compiled);
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    });
    const buttons = compiled.querySelectorAll<HTMLButtonElement>('.expense-row-action');
    const details = () => Array.from(dialog.querySelectorAll('.expense-details > div'), (element) => [
      element.querySelector('dt')?.textContent?.trim(),
      element.querySelector('dd')?.textContent?.trim().replace(/\s+/g, ' '),
    ]);

    buttons[0].click();
    await fixture.whenStable();
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('#expense-dialog-title')?.textContent?.trim()).toBe('Mercado');
    expect(dialog.querySelector('.expense-dialog-date')?.textContent?.trim()).toBe('04/01/2026');
    expect(Array.from(dialog.querySelectorAll('.expense-dialog-heading > *'), (element) =>
      element.id === 'expense-dialog-title' ? 'title' : 'metadata',
    )).toEqual(['title', 'metadata']);
    expect(Array.from(dialog.querySelectorAll('.expense-dialog-meta > *'), (element) =>
      element.classList.contains('expense-category-filter') ? 'category' :
        element.classList.contains('expense-status') ? 'status' : 'date',
    )).toEqual(['category', 'status', 'date']);
    expect(Array.from(dialog.querySelectorAll('.expense-amount-row > *'), (element) =>
      element.classList.contains('expense-amount') ? 'amount' :
        element.classList.contains('expense-payment-filter') ? 'payment' : 'unexpected',
    )).toEqual(['amount', 'payment']);
    expect(dialog.querySelector('.expense-amount')?.textContent?.trim().replace(/\s+/g, ' ')).toBe('R$ 185,90');
    const paymentFilter = dialog.querySelector<HTMLButtonElement>('.expense-payment-filter')!;
    expect(paymentFilter.getAttribute('aria-label')).toBe('Filtrar por pagamento: Cartão principal');
    expect(paymentFilter.textContent?.trim()).toBe('Cartão principal');
    expect(paymentFilter.style.getPropertyValue('--institution-background')).toBe('var(--color-selected)');
    expect(paymentFilter.style.getPropertyValue('--institution-border')).toBe('var(--color-primary)');
    expect(paymentFilter.style.getPropertyValue('--payment-background')).toBe('var(--payment-credito-bg)');
    expect(paymentFilter.querySelector('img')?.getAttribute('src')).toBe('/nubank.png');
    expect(paymentFilter.querySelector('svg[lucideCreditCard]')).not.toBeNull();
    expect(details().some(([label]) =>
      label === 'Método de pagamento' || label === 'Tipo de pagamento' || label === 'Instituição financeira',
    )).toBe(false);
    expect(dialog.querySelector('.expense-status')?.textContent?.trim()).toBe('Realizado');
    expect(dialog.querySelector<HTMLElement>('.expense-status')?.style.getPropertyValue('--color-selected'))
      .toBe('var(--color-secondary-subtle)');
    expect(dialog.querySelector<HTMLElement>('.expense-status')?.style.getPropertyValue('--color-primary'))
      .toBe('var(--color-secondary)');
    expect(dialog.querySelector('.expense-status svg[lucideCheck]')).not.toBeNull();
    expect(details().some(([label]) => label === 'Dia de fechamento' || label === 'Fechamento da fatura'))
      .toBe(false);

    const closeButton = dialog.querySelector<HTMLButtonElement>('.expense-dialog-close')!;
    expect(closeButton.getAttribute('aria-label')).toBe('Fechar');
    expect(closeButton.querySelector('svg[lucideX]')?.getAttribute('aria-hidden')).toBe('true');
    closeButton.click();
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
    expect(dialog.querySelector('.expense-details')).toBeNull();
    expect(dialog.querySelector('.expense-dialog-content')).toBeNull();

    buttons[1].click();
    await fixture.whenStable();
    const caixaFilter = dialog.querySelector<HTMLButtonElement>('.expense-payment-filter')!;
    expect(caixaFilter.style.getPropertyValue('--institution-background')).toBe('var(--color-payment-caixa-selected)');
    expect(caixaFilter.style.getPropertyValue('--institution-border')).toBe('var(--color-payment-caixa-border)');
    expect(caixaFilter.style.getPropertyValue('--institution-hover')).toBe('var(--color-payment-caixa-hover)');
    dialog.close();
    await fixture.whenStable();

    buttons[6].click();
    await fixture.whenStable();
    expect(dialog.querySelector('#expense-dialog-title')?.textContent?.trim()).toBe('Academia');
    expect(dialog.querySelector('.expense-status')?.textContent?.trim()).toBe('Planejado');
    expect(dialog.querySelector('.expense-status svg[lucideClock]')).not.toBeNull();
    expect(dialog.querySelector('.expense-dialog-date')?.textContent?.trim()).toBe('25/01/2026');
    expect(details().some(([label]) =>
      label === 'Dia de fechamento' || label === 'Fechamento da fatura' || label === 'Parcela',
    )).toBe(false);
    dialog.close();
    await fixture.whenStable();

    buttons[4].click();
    await fixture.whenStable();
    expect(dialog.querySelector('#expense-dialog-title')?.textContent?.trim()).toBe('Restaurante e cafeteria da praça central');
    expect(details()).toContainEqual(['Descrição', 'Almoço em família no restaurante da praça central da cidade']);
    dialog.close();
    await fixture.whenStable();

    compiled.querySelectorAll<HTMLButtonElement>('.month-button')[10].click();
    await fixture.whenStable();
    expect(compiled.querySelector('tbody tr td:nth-child(3)')?.textContent?.trim().replace(/\s+/g, ' '))
      .toBe(`${installmentExpenseName} 7/12`);
    compiled.querySelectorAll<HTMLButtonElement>('.expense-row-action')[0].click();
    await fixture.whenStable();
    expect(dialog.querySelector('#expense-dialog-title')?.textContent?.trim().replace(/\s+/g, ' '))
      .toBe(`${installmentExpenseName} 7/12`);
    expect(dialog.querySelector('#installments-title')?.textContent?.trim()).toBe('Parcelas da compra');
    expect(dialog.querySelector('.expense-details')).not.toBeNull();
    expect(dialog.querySelector('#expense-dialog-amount')?.textContent?.trim().replace(/\s+/g, ' '))
      .toBe('R$ 210,00');
    expect(dialog.querySelector('.installments-total strong')?.textContent?.trim().replace(/\s+/g, ' '))
      .toBe('R$ 2.520,00');
    const installmentRows = () => Array.from(dialog.querySelectorAll('.installment-table tbody tr'));
    expect(dialog.querySelector('.installment-table thead')).toBeNull();
    expect(Array.from(installmentRows(), (row) =>
      Array.from(row.querySelectorAll('td'), (cell) => cell.textContent?.trim().replace(/\s+/g, ' ')),
    ))
      .toEqual([
        ['1/12', 'R$ 210,00', 'Mai/2026', ''],
        ['2/12', 'R$ 210,00', 'Jun/2026', ''],
        ['3/12', 'R$ 210,00', 'Jul/2026', ''],
        ['4/12', 'R$ 210,00', 'Ago/2026', ''],
        ['5/12', 'R$ 210,00', 'Set/2026', ''],
        ['6/12', 'R$ 210,00', 'Out/2026', ''],
        ['7/12', 'R$ 210,00', 'Nov/2026', ''],
        ['8/12', 'R$ 210,00', 'Dez/2026', ''],
        ['9/12', 'R$ 210,00', 'Jan/2027', ''],
        ['10/12', 'R$ 210,00', 'Fev/2027', ''],
        ['11/12', 'R$ 210,00', 'Mar/2027', ''],
        ['12/12', 'R$ 210,00', 'Abr/2027', ''],
      ]);
    expect(installmentRows().every((row) => row.querySelector('.installment-status svg') !== null)).toBe(true);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
  });

  it('should close expense details and filter by its payment name', async () => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(0);
    const api = TestBed.inject(ExpenseApi);
    const listRequest = vi.spyOn(api, 'getExpenses');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const dialog = mockDialog(compiled, '.expense-dialog');

    compiled.querySelector<HTMLButtonElement>('.expense-row-action')!.click();
    await fixture.whenStable();
    const paymentTag = dialog.querySelector<HTMLElement>('.expense-payment-filter')!;
    const paymentStyles = paymentTag.getAttribute('style');
    dialog.querySelector<HTMLButtonElement>('.expense-payment-filter')!.click();
    await fixture.whenStable();

    expect(dialog.open).toBe(false);
    expect(listRequest).toHaveBeenLastCalledWith({
      year: 2026,
      month: 0,
      filter: { field: 'paymentName', value: 'Cartão principal' },
      page: 1,
      pageSize: 10,
    });
    expect(compiled.querySelector('.filter-chip')?.textContent).toContain('Pagamento: Cartão principal');
    const chip = compiled.querySelector<HTMLElement>('.filter-chip')!;
    expect(chip.classList.contains('payment-tag')).toBe(true);
    expect(chip.getAttribute('style')).toBe(paymentStyles);
    expect(chip.querySelector('img')?.getAttribute('src')).toBe('/nubank.png');
    expect(chip.querySelector('svg[lucideCreditCard]')).not.toBeNull();
    expect(compiled.querySelectorAll('.expense-row-action')).toHaveLength(3);
    expect(document.activeElement).toBe(compiled.querySelector('.filter-remove'));
  });

  it('should show the matching payment icon when the institution has no logo', async () => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(0);
    const methods = [
      ['Boleto', 'lucideBarcode', 'boleto'],
      ['Pix', 'lucideQrCode', 'pix'],
      ['Cartão de crédito', 'lucideCreditCard', 'credito'],
      ['Cartão de débito', 'lucideWallet', 'debito'],
      ['DOC', 'lucideArrowLeftRight', 'doc'],
      ['TED', 'lucideLandmark', 'ted'],
    ] as const;
    const baseExpense = mockExpenseList({
      year: 2026,
      month: 0,
      filter: null,
      page: 1,
      pageSize: 10,
    }).items[0];
    const expenses = methods.map(([paymentMethod], index) => ({
      ...baseExpense,
      id: index + 1,
      paymentMethod,
      paymentName: paymentMethod,
      institution: 'Banco sem ícone',
    }));
    vi.spyOn(TestBed.inject(ExpenseApi), 'getExpenses').mockReturnValue(of(pageResponse(expenses)));
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const dialog = mockDialog(compiled, '.expense-dialog');

    for (const [index, [, icon, palette]] of methods.entries()) {
      compiled.querySelectorAll<HTMLButtonElement>('.expense-row-action')[index].click();
      await fixture.whenStable();
      expect(dialog.querySelector(`.expense-payment-filter svg[${icon}]`)).not.toBeNull();
      const filter = dialog.querySelector<HTMLElement>('.expense-payment-filter')!;
      expect(filter.style.getPropertyValue('--payment-background')).toBe(`var(--payment-${palette}-bg)`);
      expect(filter.style.getPropertyValue('--payment-border')).toBe(`var(--payment-${palette}-border)`);
      expect(filter.style.getPropertyValue('--payment-hover')).toBe(`var(--payment-${palette}-hover)`);
      dialog.querySelector<HTMLButtonElement>('.expense-payment-filter')!.click();
      await fixture.whenStable();
      const chip = compiled.querySelector<HTMLElement>('.filter-chip')!;
      expect(chip.querySelector('img')).toBeNull();
      expect(chip.querySelector(`svg[${icon}]`)).not.toBeNull();
      expect(chip.style.getPropertyValue('--payment-background')).toBe(`var(--payment-${palette}-bg)`);
      expect(chip.style.getPropertyValue('--payment-border')).toBe(`var(--payment-${palette}-border)`);
      expect(chip.style.getPropertyValue('--payment-hover')).toBe(`var(--payment-${palette}-hover)`);
    }
  });

  it('should close the modal and filter by its category without toggling an active category or reloading totals', async () => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(0);
    const api = TestBed.inject(ExpenseApi);
    const listRequest = vi.spyOn(api, 'getExpenses');
    const totalsRequest = vi.spyOn(api, 'getTotals');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('[aria-label="Filtrar por pagamento: Pix Caixa"]')!.click();
    await fixture.whenStable();
    const openFirst = async () => {
      const dialog = compiled.querySelector<HTMLDialogElement>('.expense-dialog')!;
      dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
      dialog.close = vi.fn(() => {
        dialog.removeAttribute('open');
        dialog.dispatchEvent(new Event('close'));
      });
      compiled.querySelector<HTMLButtonElement>('.expense-row-action')!.click();
      await fixture.whenStable();
      return dialog;
    };
    const dialog = await openFirst();
    expect(dialog.querySelector('#expense-dialog-title')?.textContent?.trim()).toBe('Energia');
    dialog.querySelector<HTMLButtonElement>('.expense-category-filter')!.click();
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
    expect(listRequest).toHaveBeenLastCalledWith({
      year: 2026, month: 0, filter: { field: 'category', value: 'Moradia' }, page: 1, pageSize: 10,
    });
    expect(compiled.querySelector('.filter-chip')?.textContent).toContain('Categoria: Moradia');
    expect(compiled.querySelectorAll('.expense-row-action')).toHaveLength(2);
    expect(document.activeElement).toBe(compiled.querySelector('.filter-remove'));
    const second = await openFirst();
    second.querySelector<HTMLButtonElement>('.expense-category-filter')!.click();
    await fixture.whenStable();
    expect(second.open).toBe(false);
    expect(compiled.querySelector('.filter-chip')?.textContent).toContain('Categoria: Moradia');
    expect(listRequest).toHaveBeenCalledTimes(4);
    expect(listRequest).toHaveBeenLastCalledWith({
      year: 2026, month: 0, filter: { field: 'category', value: 'Moradia' }, page: 1, pageSize: 10,
    });
    expect(totalsRequest).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, null])('should show the requested invoice month for a planned expense without a date (%s)', async (day) => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(10);
    const sample = mockExpenseList({ year: 2026, month: 0, filter: null, page: 1, pageSize: 10 }).items[0];
    const planned: Expense = { ...sample, name: 'Seguro planejado', year: 2026, month: 9, day, realized: false };
    vi.spyOn(TestBed.inject(ExpenseApi), 'getExpenses').mockReturnValueOnce(of(pageResponse([planned])));
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const dialog = compiled.querySelector<HTMLDialogElement>('.expense-dialog')!;
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    expect(compiled.querySelector('tbody .expense-cell-value')?.textContent?.trim()).toBe('Sem data');
    compiled.querySelector<HTMLButtonElement>('.expense-row-action')!.click();
    await fixture.whenStable();
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('#expense-dialog-title')?.textContent?.trim()).toBe('Seguro planejado');
    expect(dialog.querySelector('.expense-status')?.textContent?.trim()).toBe('Planejado');
    expect(dialog.querySelector('.expense-status svg[lucideClock]')).not.toBeNull();
    expect(dialog.querySelector('.expense-dialog-date')?.textContent?.trim()).toBe('Novembro de 2026');
    expect(dialog.textContent).not.toContain('Detalhes do gasto');
  });

  it('should use the system theme and follow its changes until manually switched', async () => {
    systemIsDark = true;
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.theme-toggle');
    const header: HTMLElement | null = fixture.nativeElement.querySelector('header');
    expect(header?.contains(button)).toBe(true);
    expect(fixture.nativeElement.querySelector('.app-layout')?.firstElementChild).toBe(header?.parentElement);

    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(button.getAttribute('aria-label')).toBe('Ativar tema claro');
    expect(button.querySelector('svg[lucideSun]')).not.toBeNull();

    systemIsDark = false;
    systemThemeEvents.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(button.getAttribute('aria-label')).toBe('Ativar tema escuro');
    expect(button.querySelector('svg[lucideMoon]')).not.toBeNull();

    button.click();
    await fixture.whenStable();
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(button.getAttribute('aria-label')).toBe('Ativar tema claro');

    systemIsDark = true;
    systemThemeEvents.dispatchEvent(new Event('change'));
    systemIsDark = false;
    systemThemeEvents.dispatchEvent(new Event('change'));
    expect(document.documentElement.dataset['theme']).toBe('dark');

    button.click();
    await fixture.whenStable();
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('should select a month and an available year', async () => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(0);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    mockYearDialog(compiled);
    const months = compiled.querySelectorAll<HTMLButtonElement>('.month-button');
    expect(months).toHaveLength(12);
    expect(compiled.querySelector('aside .period-selector')?.contains(months[0])).toBe(true);
    expect(months[0].getAttribute('aria-pressed')).toBe('true');
    expect(compiled.querySelector('.year-selector')?.textContent?.trim()).toBe('2026');

    months[1].click();
    await fixture.whenStable();
    expect(months[1].getAttribute('aria-pressed')).toBe('true');
    expect(compiled.querySelectorAll('.month-button[aria-pressed="true"]')).toHaveLength(1);
    await chooseYear(fixture, 2027);
    expect(compiled.querySelector('.year-selector')?.textContent?.trim()).toBe('2027');
    expect(months[1].getAttribute('aria-label')).toBe('Fevereiro de 2027');
    expect(months[0].getAttribute('aria-pressed')).toBe('true');
  });

  it('should nest the period and content in a card and reuse cards for the list and totals', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const workspace = compiled.querySelector('app-card.workspace-card')!;
    expect(workspace.contains(compiled.querySelector('app-period-selector'))).toBe(true);
    expect(workspace.contains(compiled.querySelector('main'))).toBe(true);
    expect(workspace.querySelectorAll('app-card.content-area')).toHaveLength(1);
    expect(compiled.querySelectorAll('.totals-dialog app-card.content-area')).toHaveLength(2);
    expect(workspace.contains(compiled.querySelector('app-top-bar'))).toBe(false);
  });

  it('should select a single summary filter, remove it with X and request totals only for period changes or a new expense', async () => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(0);
    const api = TestBed.inject(ExpenseApi);
    const listRequest = vi.spyOn(api, 'getExpenses');
    const totalsRequest = vi.spyOn(api, 'getTotals');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const dialog = mockDialog(compiled, '.totals-dialog');
    const toggle = compiled.querySelector<HTMLButtonElement>('.totals-toggle')!;
    const paymentFilter = compiled.querySelector<HTMLButtonElement>('[aria-label="Filtrar por pagamento: Cartão principal"]')!;
    const rows = () => compiled.querySelectorAll('.expense-row-action');
    const summary = (id: string) => compiled.querySelector(`[aria-labelledby="${id}"]`)!;
    const initialTotals = [
      summary('totais-metodo').textContent,
      summary('totais-categoria').textContent,
    ];
    expect(listRequest).toHaveBeenCalledExactlyOnceWith({ year: 2026, month: 0, filter: null, page: 1, pageSize: 10 });
    expect(totalsRequest).toHaveBeenCalledExactlyOnceWith({ year: 2026, month: 0 });
    expect(compiled.querySelectorAll('.summary-filter[aria-pressed="true"]')).toHaveLength(0);
    expect(compiled.querySelector('main app-expense-summary')).toBeNull();
    expect(dialog.open).toBe(false);
    toggle.click();
    await fixture.whenStable();
    expect(dialog.open).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(dialog.querySelectorAll('app-expense-summary')).toHaveLength(2);

    paymentFilter.click();
    await fixture.whenStable();
    expect(rows()).toHaveLength(3);
    expect(paymentFilter.getAttribute('aria-pressed')).toBe('true');
    expect(compiled.querySelector('.filter-chip')?.textContent).toContain('Pagamento: Cartão principal');
    const paymentTag = paymentFilter;
    const filterChip = compiled.querySelector<HTMLElement>('.filter-chip')!;
    expect(filterChip.classList.contains('payment-tag')).toBe(true);
    expect(filterChip.getAttribute('style')).toBe(paymentTag.getAttribute('style'));
    expect(filterChip.querySelector('img')?.getAttribute('src')).toBe('/nubank.png');
    expect(filterChip.querySelector('svg[lucideCreditCard]')).not.toBeNull();
    expect(dialog.open).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(compiled.querySelector('.expense-toolbar .filter-chip')).not.toBeNull();
    expect(listRequest).toHaveBeenLastCalledWith({
      year: 2026, month: 0, filter: { field: 'paymentMethod', value: 'Cartão de crédito' }, page: 1, pageSize: 10,
    });
    expect(totalsRequest).toHaveBeenCalledTimes(1);
    expect(summary('totais-metodo').querySelectorAll('dt')).toHaveLength(3);
    expect(summary('totais-metodo').textContent?.replace(/\s+/g, ' ')).toContain('Realizado: R$ 314,30');
    expect(summary('totais-categoria').querySelectorAll('dt')).toHaveLength(4);
    expect([summary('totais-metodo').textContent, summary('totais-categoria').textContent]).toEqual(initialTotals);

    compiled.querySelectorAll<HTMLButtonElement>('.month-button')[1].click();
    await fixture.whenStable();
    expect(rows()).toHaveLength(3);
    expect(compiled.querySelector('tbody tr')?.textContent).toContain('04/02/2026');
    expect(compiled.querySelector('.summary-filter[aria-pressed="true"]')?.textContent).toBe('Cartão principal');
    expect(listRequest).toHaveBeenLastCalledWith({
      year: 2026, month: 1, filter: { field: 'paymentMethod', value: 'Cartão de crédito' }, page: 1, pageSize: 10,
    });
    expect(totalsRequest).toHaveBeenCalledTimes(2);
    expect(totalsRequest).toHaveBeenLastCalledWith({ year: 2026, month: 1 });
    const februaryTotals = [summary('totais-metodo').textContent, summary('totais-categoria').textContent];

    compiled.querySelector<HTMLButtonElement>('[aria-label="Filtrar por categoria: Saúde"]')!.click();
    await fixture.whenStable();
    expect(compiled.querySelectorAll('.summary-filter[aria-pressed="true"]')).toHaveLength(1);
    expect(compiled.querySelector('.summary-filter[aria-pressed="true"]')?.textContent).toBe('Saúde');
    expect(compiled.querySelector('.filter-chip')?.textContent).toContain('Categoria: Saúde');
    expect(rows()).toHaveLength(2);
    expect(compiled.querySelector('tbody')?.textContent).toContain('Academia');
    expect(listRequest).toHaveBeenLastCalledWith({
      year: 2026, month: 1, filter: { field: 'category', value: 'Saúde' }, page: 1, pageSize: 10,
    });
    expect(totalsRequest).toHaveBeenCalledTimes(2);
    expect([summary('totais-metodo').textContent, summary('totais-categoria').textContent]).toEqual(februaryTotals);
    expect(Array.from(compiled.querySelectorAll<HTMLButtonElement>('.month-button')).every((button) => !button.disabled)).toBe(true);

    const remove = compiled.querySelector<HTMLButtonElement>('[aria-label="Remover filtro de categoria: Saúde"]')!;
    expect(remove.querySelector('svg[lucideX]')).not.toBeNull();
    remove.click();
    await fixture.whenStable();
    expect(rows()).toHaveLength(7);
    expect(compiled.querySelector('.filter-chip')).toBeNull();
    expect(compiled.querySelectorAll('.summary-filter[aria-pressed="true"]')).toHaveLength(0);
    expect(summary('totais-metodo').querySelectorAll('dt')).toHaveLength(3);
    expect(summary('totais-categoria').querySelectorAll('dt')).toHaveLength(4);
    expect(listRequest).toHaveBeenCalledTimes(5);
    expect(totalsRequest).toHaveBeenCalledTimes(2);

    fixture.componentInstance.onExpenseAdded();
    await fixture.whenStable();
    expect(listRequest).toHaveBeenCalledTimes(6);
    expect(totalsRequest).toHaveBeenCalledTimes(3);
    expect(totalsRequest).toHaveBeenLastCalledWith({ year: 2026, month: 1 });

    mockYearDialog(compiled);
    await chooseYear(fixture, 2027);
    expect(listRequest).toHaveBeenCalledTimes(7);
    expect(listRequest).toHaveBeenLastCalledWith({ year: 2027, month: 0, filter: null, page: 1, pageSize: 10 });
    expect(totalsRequest).toHaveBeenCalledTimes(4);
    expect(totalsRequest).toHaveBeenLastCalledWith({ year: 2027, month: 0 });

    const pix = compiled.querySelector<HTMLButtonElement>('[aria-label="Filtrar por pagamento: Pix Caixa"]')!;
    pix.click();
    await fixture.whenStable();
    pix.click();
    await fixture.whenStable();
    expect(compiled.querySelector('.filter-chip')).toBeNull();
    expect(listRequest).toHaveBeenCalledTimes(9);
    expect(totalsRequest).toHaveBeenCalledTimes(4);
  });

  it('should fill the viewport plus one page, append on scroll and reset for filters, periods and new expenses', async () => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(0);
    mockListViewport(880);
    const api = TestBed.inject(ExpenseApi);
    const sample = mockExpenseList({ year: 2026, month: 0, filter: null, page: 1, pageSize: 10 }).items[0];
    const items = Array.from({ length: 65 }, (_, index) => ({ ...sample, id: index + 1, name: `Gasto ${index + 1}` }));
    const listRequest = vi.spyOn(api, 'getExpenses').mockImplementation(({ month, filter, page }) => of(
      month === 1 ? pageResponse([]) : filter ? pageResponse(items.slice(0, 2)) :
        pageResponse(items.slice((page - 1) * 10, page * 10), {
          page, totalItems: 65, totalPages: 7, firstItem: (page - 1) * 10 + 1, lastItem: Math.min(page * 10, 65),
        }),
    ));
    const totalsRequest = vi.spyOn(api, 'getTotals');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const container = compiled.querySelector<HTMLElement>('main')!;
    expect(container.tabIndex).toBe(0);
    expect(compiled.querySelector('.table-container')?.hasAttribute('tabindex')).toBe(false);
    const scrollTo = async (top: number) => {
      container.scrollTop = top;
      container.dispatchEvent(new Event('scroll'));
      container.dispatchEvent(new Event('scroll'));
      await fixture.whenStable();
    };
    expect(listRequest.mock.calls.map(([query]) => query.page)).toEqual([1, 2, 3, 4]);
    expect(compiled.querySelectorAll('.expense-row-action')).toHaveLength(40);
    expect(compiled.querySelector('app-pagination')).toBeNull();
    const filterButton = compiled.querySelector<HTMLButtonElement>('[aria-label="Filtros"]')!;
    expect(filterButton.querySelector('svg[lucideListFilter]')).not.toBeNull();
    filterButton.click();
    await fixture.whenStable();
    expect(listRequest).toHaveBeenCalledTimes(4);

    await scrollTo(800);
    expect(listRequest.mock.calls.map(([query]) => query.page)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(compiled.querySelectorAll('.expense-row-action')).toHaveLength(60);
    expect(compiled.querySelector('tbody tr td:nth-child(3)')?.textContent?.trim()).toBe('Gasto 1');
    expect(container.scrollTop).toBe(800);
    await scrollTo(2000);
    expect(compiled.querySelectorAll('.expense-row-action')).toHaveLength(65);
    expect(listRequest).toHaveBeenCalledTimes(7);
    await scrollTo(3000);
    expect(listRequest).toHaveBeenCalledTimes(7);
    expect(totalsRequest).toHaveBeenCalledTimes(1);

    compiled.querySelector<HTMLButtonElement>('[aria-label="Filtrar por categoria: Moradia"]')!.click();
    await fixture.whenStable();
    expect(listRequest).toHaveBeenLastCalledWith({
      year: 2026, month: 0, filter: { field: 'category', value: 'Moradia' }, page: 1, pageSize: 10,
    });
    expect(container.scrollTop).toBe(0);
    expect(compiled.querySelectorAll('.expense-row-action')).toHaveLength(2);
    compiled.querySelector<HTMLButtonElement>('.filter-remove')!.click();
    await fixture.whenStable();
    expect(compiled.querySelectorAll('.expense-row-action')).toHaveLength(40);
    expect(totalsRequest).toHaveBeenCalledTimes(1);

    compiled.querySelectorAll<HTMLButtonElement>('.month-button')[1].click();
    await fixture.whenStable();
    expect(listRequest).toHaveBeenLastCalledWith({ year: 2026, month: 1, filter: null, page: 1, pageSize: 10 });
    expect(compiled.querySelector('.empty-state')).not.toBeNull();
    expect(totalsRequest).toHaveBeenCalledTimes(2);
    fixture.componentInstance.onExpenseAdded();
    await fixture.whenStable();
    expect(listRequest).toHaveBeenCalledTimes(14);
    expect(totalsRequest).toHaveBeenCalledTimes(3);
    expect(listRequest.mock.calls.every(([query]) => query.pageSize === 10)).toBe(true);
  });

  it('should recalculate visible capacity on resize and keep a reserve page without reloading existing pages', async () => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(8);
    const viewport = mockListViewport(440);
    const api = TestBed.inject(ExpenseApi);
    const listRequest = vi.spyOn(api, 'getExpenses');
    const totalsRequest = vi.spyOn(api, 'getTotals');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.expense-row-action')).toHaveLength(20);
    expect(listRequest).toHaveBeenCalledTimes(2);
    viewport.height = 480;
    window.dispatchEvent(new Event('resize'));
    await fixture.whenStable();
    expect(compiled.querySelectorAll('.expense-row-action')).toHaveLength(30);
    expect(listRequest).toHaveBeenCalledTimes(3);
    viewport.height = 400;
    window.dispatchEvent(new Event('resize'));
    await fixture.whenStable();
    expect(compiled.querySelectorAll('.expense-row-action')).toHaveLength(30);
    expect(listRequest).toHaveBeenCalledTimes(3);
    viewport.height = 1640;
    window.dispatchEvent(new Event('resize'));
    await fixture.whenStable();
    expect(compiled.querySelectorAll('.expense-row-action')).toHaveLength(43);
    expect(listRequest.mock.calls.map(([query]) => query.page)).toEqual([1, 2, 3, 4, 5]);
    expect(listRequest.mock.calls.every(([query]) => query.pageSize === 10)).toBe(true);
    expect(totalsRequest).toHaveBeenCalledTimes(1);
  });

  it('should deduplicate pending pages, retry failed appends and cancel them when the filter changes', async () => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(0);
    mockListViewport(440);
    const api = TestBed.inject(ExpenseApi);
    const sample = mockExpenseList({ year: 2026, month: 0, filter: null, page: 1, pageSize: 10 }).items[0];
    const items = Array.from({ length: 30 }, (_, index) => ({ ...sample, id: index + 1 }));
    const first = pageResponse(items.slice(0, 10), { totalItems: 30, totalPages: 3, lastItem: 10 });
    const second = pageResponse(items.slice(10, 20), {
      page: 2, totalItems: 30, totalPages: 3, firstItem: 11, lastItem: 20,
    });
    const pending = new Subject<ExpensePage>();
    const stale = new Subject<ExpensePage>();
    const listRequest = vi.spyOn(api, 'getExpenses')
      .mockReturnValueOnce(of(first))
      .mockReturnValueOnce(pending)
      .mockReturnValueOnce(of(second))
      .mockReturnValueOnce(stale)
      .mockReturnValueOnce(of(pageResponse([items[0]])));
    const totalsRequest = vi.spyOn(api, 'getTotals');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const container = compiled.querySelector<HTMLElement>('main')!;
    expect(compiled.querySelectorAll('.expense-row-action')).toHaveLength(10);
    expect(compiled.querySelector('.list-status[role="status"]')).not.toBeNull();
    container.dispatchEvent(new Event('scroll'));
    container.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();
    expect(listRequest).toHaveBeenCalledTimes(2);
    pending.error(new Error('offline'));
    await fixture.whenStable();
    expect(compiled.querySelectorAll('.expense-row-action')).toHaveLength(10);
    expect(compiled.querySelector('.empty-state')).toBeNull();
    expect(compiled.querySelector('.list-status[role="alert"]')?.textContent).toContain('Não foi possível');
    compiled.querySelector<HTMLButtonElement>('.list-status button')!.click();
    await fixture.whenStable();
    expect(listRequest.mock.calls.map(([query]) => query.page)).toEqual([1, 2, 2]);
    expect(compiled.querySelectorAll('.expense-row-action')).toHaveLength(20);
    expect(compiled.querySelector('[role="alert"]')).toBeNull();

    container.scrollTop = 400;
    container.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();
    expect(stale.observed).toBe(true);
    compiled.querySelector<HTMLButtonElement>('[aria-label="Filtrar por categoria: Moradia"]')!.click();
    await fixture.whenStable();
    expect(stale.observed).toBe(false);
    expect(container.scrollTop).toBe(0);
    expect(listRequest).toHaveBeenLastCalledWith({
      year: 2026, month: 0, filter: { field: 'category', value: 'Moradia' }, page: 1, pageSize: 10,
    });
    stale.next(pageResponse(items.slice(20), { page: 3, totalPages: 3 }));
    stale.complete();
    await fixture.whenStable();
    expect(compiled.querySelectorAll('.expense-row-action')).toHaveLength(1);
    expect(totalsRequest).toHaveBeenCalledTimes(1);
  });

  it.each([
    { month: 8, totalItems: 43, totalPages: 5 },
    { month: 9, totalItems: 20, totalPages: 2 },
    { month: 10, totalItems: 24, totalPages: 3 },
    { month: 11, totalItems: 32, totalPages: 4 },
  ])('should provide $totalPages demo pages with matching totals for month $month', ({ month, totalItems, totalPages }) => {
    const query = { year: 2026, month, filter: null, page: 1, pageSize: 10 };
    const first = mockExpenseList(query);
    expect(first).toMatchObject({ page: 1, pageSize: 10, totalItems, totalPages, firstItem: 1, lastItem: 10 });
    const items = Array.from({ length: totalPages }, (_, index) => mockExpenseList({ ...query, page: index + 1 }).items).flat();
    expect(items).toHaveLength(totalItems);
    expect(new Set(items.map((item) => item.id)).size).toBe(totalItems);
    expect(new Set(items.map((item) => item.name)).size).toBe(totalItems);
    expect(items.filter((item) => item.installment)).toHaveLength(month >= 10 ? 2 : 1);
    expect(items.find((item) => item.name === 'Fone')?.installment)
      .toEqual(month >= 10 ? { number: month - 9, quantity: 2 } : undefined);
    const last = mockExpenseList({ ...query, page: totalPages });
    expect(last.lastItem).toBe(totalItems);
    expect(last.items).toHaveLength(totalItems - (totalPages - 1) * 10);
    const totals = mockExpenseTotals(query);
    for (const [field, rows] of [
      ['paymentMethod', totals.payment],
      ['category', totals.category],
    ] as const) {
      for (const total of rows) {
        const matching = items.filter((item) => item[field] === total.value);
        expect(total.planned).toBe(matching.reduce((sum, item) => sum + item.amountInCents, 0));
        expect(total.realized).toBe(matching.reduce((sum, item) => sum + (item.realized ? item.amountInCents : 0), 0));
      }
    }
  });

  it('should provide one sequential installment per invoice from May 2026 through April 2027', () => {
    const installments: Expense[] = [];
    for (let index = 0; index < 20; index++) {
      const year = 2026 + Math.floor(index / 12);
      const month = index % 12;
      const items = mockExpenseList({ year, month, filter: null, page: 1, pageSize: 100 }).items;
      const matching = items.filter((expense) => expense.name === installmentExpenseName);
      if (index < 4 || index > 15) {
        expect(matching).toEqual([]);
        expect(items.some((expense) => expense.name === installmentExpenseName)).toBe(false);
      } else {
        expect(matching).toHaveLength(1);
        const expense = matching[0];
        expect(expense.name).toBe(installmentExpenseName);
        expect(expense.installment).toEqual({ number: index - 3, quantity: 12 });
        expect(mockExpensePeriod(expense)).toEqual({ year, month });
        installments.push(expense);
      }
    }
    expect(new Set(installments.map((expense) => expense.id)).size).toBe(12);
  });

  it('should simulate filtering before pagination and return server counts for empty and out-of-range pages', () => {
    const query = { year: 2026, month: 0, page: 2, pageSize: 2, filter: { field: 'paymentMethod' as const, value: 'Cartão de crédito' } };
    expect(mockExpenseList(query)).toMatchObject({
      items: [{ name: 'Restaurante e cafeteria da praça central' }],
      page: 2, pageSize: 2, totalItems: 3, totalPages: 2, firstItem: 3, lastItem: 3,
    });
    expect(mockExpenseList({ ...query, page: 99 })).toEqual(mockExpenseList(query));
    expect(mockExpenseList({ ...query, page: 1, filter: { field: 'category', value: 'Saúde' } }).items.map((item) => item.name))
      .toEqual(['Farmácia', 'Academia']);
    expect(mockExpenseList({ ...query, filter: { field: 'category', value: 'Inexistente' } })).toEqual({
      items: [], page: 0, pageSize: 2, totalItems: 0, totalPages: 0, firstItem: 0, lastItem: 0,
    });
  });

  it('should include the closing day in the next invoice only for credit, including the year boundary', () => {
    const sample = mockExpenseList({ year: 2026, month: 0, filter: null, page: 1, pageSize: 10 }).items[0];
    const credit = { ...sample, year: 2026, month: 10, closingDay: 18 };
    expect(mockExpensePeriod({ ...credit, day: 17 })).toEqual({ year: 2026, month: 10 });
    expect(mockExpensePeriod({ ...credit, day: 18 })).toEqual({ year: 2026, month: 11 });
    expect(mockExpensePeriod({ ...credit, month: 11, day: 31 })).toEqual({ year: 2027, month: 0 });
    expect(mockExpensePeriod({ ...credit, paymentMethod: 'Pix', day: 25 })).toEqual({ year: 2026, month: 10 });
    expect(mockExpensePeriod({ ...credit, paymentMethod: 'Cartão de débito', day: 25 })).toEqual({ year: 2026, month: 10 });
    expect(mockExpensePeriod({ ...credit, closingDay: undefined, day: 25 })).toEqual({ year: 2026, month: 10 });
    expect(mockExpensePeriod({ ...credit, day: null, realized: false })).toEqual({ year: 2026, month: 10 });
  });

  it('should redistribute invoice expenses without changing transaction dates or calendar-month Pix expenses', () => {
    const query = { year: 2026, month: 10, filter: null, page: 1, pageSize: 100 };
    const november = mockExpenseList(query).items;
    expect(november.filter((expense) => expense.day == null)).toMatchObject([{
      name: 'Plano de internet residencial de alta velocidade',
      year: 2026, month: 10, day: null, realized: false,
    }]);
    const credit = november.filter((expense) => expense.paymentMethod === 'Cartão de crédito');
    expect(credit).toHaveLength(12);
    expect(credit.every((expense) =>
      expense.year === 2026 && expense.day != null &&
        ((expense.month === 9 && expense.day >= 18) || (expense.month === 10 && expense.day < 18)),
    )).toBe(true);
    expect(november.find((expense) => expense.name === 'Academia')).toMatchObject({
      year: 2026, month: 10, day: 25, paymentMethod: 'Pix',
    });
    const december = mockExpenseList({ ...query, month: 11 }).items;
    const moved = december.find((expense) => expense.name === installmentExpenseName);
    expect(moved).toMatchObject({ year: 2026, month: 10, day: 21, invoiceMonthOffset: 1 });
    expect(november.some((expense) => expense.id === moved?.id)).toBe(false);
    expect(mockExpenseTotals(query).payment.find((total) => total.value === 'Cartão de crédito'))
      .toMatchObject({ planned: 151290, realized: 151290 });
  });

  it('should render server responses without filtering or calculating totals and discard superseded requests', async () => {
    const api = TestBed.inject(ExpenseApi);
    const first = new Subject<ExpensePage>();
    const second = new Subject<ExpensePage>();
    const listRequest = vi.spyOn(api, 'getExpenses')
      .mockReturnValueOnce(first).mockReturnValueOnce(second);
    const totals: ExpenseTotals = {
      payment: [{
        value: 'payment-key',
        name: 'Pagamento recebido',
        institution: 'NUBANK',
        paymentMethod: 'CREDITO',
        planned: 12345,
        realized: 6789,
      }],
      category: [{ value: 'category-key', name: 'Categoria recebida', planned: 98765, realized: 4321 }],
    };
    vi.spyOn(api, 'getTotals').mockReturnValue(of(totals));
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Carregando gastos');
    compiled.querySelector<HTMLButtonElement>('[aria-label="Filtrar por pagamento: Pagamento recebido"]')!.click();
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(compiled.querySelector('.expense-toolbar .filter-chip')?.textContent).toContain('Pagamento recebido');
    expect(compiled.querySelector('app-pagination input')).toBeNull();
    const returnedExpense: Expense = {
      id: 1, year: 2000, month: 0, day: 1, name: 'Resposta pronta',
      amountInCents: 500, description: 'Sem transformação local', category: 'Outra',
      paymentMethod: 'Pix', paymentName: 'Outro', institution: 'Banco', realized: true,
    };
    second.next(pageResponse([returnedExpense]));
    second.complete();
    await fixture.whenStable();
    expect(listRequest).toHaveBeenCalledTimes(2);
    expect(listRequest).toHaveBeenLastCalledWith(expect.objectContaining({
      filter: { field: 'paymentMethod', value: 'payment-key' }, page: 1, pageSize: 10,
    }));
    expect(first.observed).toBe(false);
    expect(compiled.querySelector('tbody')?.textContent).toContain('Resposta pronta');
    expect(compiled.querySelector('.expense-toolbar .filter-chip')?.textContent).toContain('Pagamento recebido');
    expect(compiled.querySelector('[aria-label="Filtros"]')).not.toBeNull();
    expect(compiled.querySelector('tbody')?.textContent).toContain('01/01/2000');
    const payment = compiled.querySelector('[aria-labelledby="totais-metodo"]')!.textContent!.replace(/\s+/g, ' ');
    expect(payment).toContain('Pagamento recebido');
    expect(payment).toContain('Planejado: R$ 123,45');
    expect(payment).toContain('Realizado: R$ 67,89');
    expect(compiled.querySelector('[aria-labelledby="totais-categoria"]')?.textContent).toContain('Categoria recebida');
    first.next(pageResponse([{ ...returnedExpense, name: 'Resposta antiga' }]));
    await fixture.whenStable();
    expect(compiled.querySelector('tbody')?.textContent).not.toContain('Resposta antiga');
  });

  it('should receive the initial period and availability asynchronously without inspecting expenses', async () => {
    const api = TestBed.inject(ExpenseApi);
    const metadata = new Subject<ExpenseMetadata>();
    vi.spyOn(api, 'getMetadata').mockReturnValue(metadata);
    const listRequest = vi.spyOn(api, 'getExpenses').mockReturnValue(of(pageResponse([])));
    vi.spyOn(api, 'getTotals').mockReturnValue(of({ payment: [], category: [] }));
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('month-list')) {
        return new DOMRect(0, 100, 64, 200);
      }
      if (this.classList.contains('month-button') && this.classList.contains('selected')) {
        return new DOMRect(0, 190, 64, 44);
      }
      return new DOMRect();
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Carregando períodos');
    expect(listRequest).not.toHaveBeenCalled();
    metadata.next({
      initialPeriod: { year: 2035, month: 4 },
      periods: { 2035: { months: [4, 9], monthOnSelect: 9 } },
    });
    metadata.complete();
    await fixture.whenStable();
    expect(compiled.querySelector('.year-selector')?.textContent?.trim()).toBe('2035');
    expect(compiled.querySelector('.month-button[aria-pressed="true"]')?.getAttribute('aria-label')).toBe('Maio de 2035');
    expect(compiled.querySelector<HTMLElement>('.month-list')!.scrollTop).toBe(12);
    expect(Array.from(compiled.querySelectorAll<HTMLButtonElement>('.month-button'), (button) => button.disabled))
      .toEqual([true, true, true, true, false, true, true, true, true, false, true, true]);
    mockYearDialog(compiled);
    await chooseYear(fixture, 2035);
    expect(listRequest).toHaveBeenLastCalledWith({ year: 2035, month: 9, filter: null, page: 1, pageSize: 10 });
    expect(compiled.querySelector('.month-button[aria-pressed="true"]')?.getAttribute('aria-label')).toBe('Outubro de 2035');
  });

  it('should display and retry metadata, list and totals errors without treating them as empty results', async () => {
    const api = TestBed.inject(ExpenseApi);
    const metadata = vi.spyOn(api, 'getMetadata').mockReturnValueOnce(throwError(() => new Error('metadata')));
    const expenses = vi.spyOn(api, 'getExpenses').mockReturnValueOnce(throwError(() => new Error('expenses')));
    const totals = vi.spyOn(api, 'getTotals').mockReturnValueOnce(throwError(() => new Error('totals')));
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('períodos');
    expect(expenses).not.toHaveBeenCalled();
    expect(totals).not.toHaveBeenCalled();
    compiled.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    await fixture.whenStable();
    expect(metadata).toHaveBeenCalledTimes(2);
    expect(compiled.querySelector('.expense-list-area [role="alert"]')?.textContent).toContain('carregar os gastos');
    expect(compiled.querySelector('.summary-areas [role="alert"]')?.textContent).toContain('carregar os totalizadores');
    expect(compiled.querySelector('.empty-state')).toBeNull();
    compiled.querySelector<HTMLButtonElement>('.expense-list-area [role="alert"] button')!.click();
    await fixture.whenStable();
    expect(expenses).toHaveBeenCalledTimes(2);
    expect(totals).toHaveBeenCalledTimes(1);
    expect(compiled.querySelector('.expense-list-area [role="alert"]')).toBeNull();
    expect(compiled.querySelector('.expense-row-action')).not.toBeNull();
    compiled.querySelector<HTMLButtonElement>('.summary-areas [role="alert"] button')!.click();
    await fixture.whenStable();
    expect(totals).toHaveBeenCalledTimes(2);
    expect(compiled.querySelector('.summary-areas [role="alert"]')).toBeNull();
    expect(compiled.querySelector('app-expense-summary')).not.toBeNull();
  });

  it('should center the selected month on initial render even when it is already visible', async () => {
    const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('month-list')) {
        return new DOMRect(0, 100, 64, 200);
      }
      if (this.classList.contains('month-button') && this.classList.contains('selected')) {
        return new DOMRect(0, 190, 64, 44);
      }
      return new DOMRect();
    });
    try {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const list: HTMLElement = fixture.nativeElement.querySelector('.month-list');
      expect(list.scrollTop).toBe(12);
    } finally {
      bounds.mockRestore();
    }
  });

  it('should keep the selected month visible when the sidebar is resized', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const list = compiled.querySelector<HTMLElement>('.month-list')!;
    const selected = compiled.querySelector<HTMLElement>('.month-button.selected')!;
    list.style.scrollPaddingTop = '24px';
    list.style.scrollPaddingBottom = '24px';
    vi.spyOn(list, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 100, 64, 200));
    vi.spyOn(selected, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 280, 64, 44));

    window.dispatchEvent(new Event('resize'));
    expect(list.scrollTop).toBe(48);

    vi.spyOn(selected, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 90, 64, 44));
    window.dispatchEvent(new Event('resize'));
    expect(list.scrollTop).toBe(14);
  });

  it('should reveal January when selecting a future year', async () => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(11);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    mockYearDialog(compiled);
    const list = compiled.querySelector<HTMLElement>('.month-list')!;
    const january = compiled.querySelector<HTMLElement>('.month-button')!;
    list.style.scrollPaddingTop = '24px';
    list.style.scrollPaddingBottom = '24px';
    list.scrollTop = 100;
    vi.spyOn(list, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 100, 64, 200));
    vi.spyOn(january, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 90, 64, 44));

    await chooseYear(fixture, 2027);
    expect(january.classList.contains('selected')).toBe(true);
    expect(list.scrollTop).toBe(66);
  });

  it('should select and reveal the current month when selecting the current year', async () => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    vi.spyOn(Date.prototype, 'getMonth').mockReturnValue(10);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    mockYearDialog(compiled);
    const months = compiled.querySelectorAll<HTMLButtonElement>('.month-button');
    const list = compiled.querySelector<HTMLElement>('.month-list')!;
    list.style.scrollPaddingTop = '24px';
    list.style.scrollPaddingBottom = '24px';

    await chooseYear(fixture, 2027);
    expect(months[0].getAttribute('aria-pressed')).toBe('true');
    list.scrollTop = 0;
    vi.spyOn(list, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 100, 64, 200));
    vi.spyOn(months[10], 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 280, 64, 44));
    await chooseYear(fixture, 2026);
    expect(months[10].getAttribute('aria-pressed')).toBe('true');
    expect(list.scrollTop).toBe(48);
    expect(compiled.querySelector('tbody tr td .expense-cell-value')?.textContent?.trim()).toBe('21/10/2026');

    months[1].click();
    await fixture.whenStable();
    await chooseYear(fixture, 2026);
    expect(months[10].getAttribute('aria-pressed')).toBe('true');
  });

  it('should fade the top and show a shadow only when months are scrolled past the year selector', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const list: HTMLElement = fixture.nativeElement.querySelector('.month-list');
    const selector: HTMLElement = fixture.nativeElement.querySelector('.period-selector');
    expect(fixture.nativeElement.querySelector('.sidebar-divider')).toBeNull();
    Object.defineProperty(list, 'clientHeight', { configurable: true, value: 200 });
    Object.defineProperty(list, 'scrollHeight', { configurable: true, value: 400 });

    list.scrollTop = 0;
    list.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();
    expect(list.classList.contains('fade-top')).toBe(false);
    expect(selector.classList.contains('has-scroll-shadow')).toBe(false);

    list.scrollTop = 100;
    list.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();
    expect(list.classList.contains('fade-top')).toBe(true);
    expect(selector.classList.contains('has-scroll-shadow')).toBe(true);

    list.scrollTop = 200;
    list.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();
    expect(list.classList.contains('fade-top')).toBe(true);
    expect(selector.classList.contains('has-scroll-shadow')).toBe(true);

    Object.defineProperty(list, 'scrollHeight', { configurable: true, value: 200 });
    list.scrollTop = 0;
    list.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();
    expect(list.classList.contains('fade-top')).toBe(false);
    expect(selector.classList.contains('has-scroll-shadow')).toBe(false);
  });

  it('should paginate fixed groups of nine years and disable years without expenses', async () => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const dialog = mockYearDialog(compiled);
    const open = compiled.querySelector<HTMLButtonElement>('.year-selector')!;
    const previous = compiled.querySelector<HTMLButtonElement>('[aria-label="Página anterior"]')!;
    const next = compiled.querySelector<HTMLButtonElement>('[aria-label="Próxima página"]')!;
    const years = () => Array.from(compiled.querySelectorAll<HTMLButtonElement>('.year-choice'));
    open.click();
    await fixture.whenStable();
    expect(dialog.open).toBe(true);
    expect(years().map((button) => button.textContent?.trim()))
      .toEqual(['2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028']);
    expect(years().filter((button) => !button.disabled).map((button) => button.textContent?.trim()))
      .toEqual(['2026', '2027']);
    expect(previous.disabled).toBe(true);
    years()[5].click();
    expect(dialog.open).toBe(true);
    expect(open.textContent?.trim()).toBe('2026');

    next.click();
    await fixture.whenStable();
    expect(years()[0].textContent?.trim()).toBe('2029');
    expect(years()[8].textContent?.trim()).toBe('2037');
    expect(years().filter((button) => !button.disabled).map((button) => button.textContent?.trim()))
      .toEqual(['2029']);
    expect(previous.disabled).toBe(false);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(dialog.open).toBe(false);
    open.click();
    await fixture.whenStable();
    expect(years()[0].textContent?.trim()).toBe('2020');
    years()[7].click();
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
    expect(open.textContent?.trim()).toBe('2027');
  });

  it('should open the page containing the current year when no earlier expenses exist', async () => {
    vi.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2025);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    mockYearDialog(compiled);
    compiled.querySelector<HTMLButtonElement>('.year-selector')!.click();
    await fixture.whenStable();
    const years = compiled.querySelectorAll<HTMLButtonElement>('.year-choice');
    expect(years[0].textContent?.trim()).toBe('2020');
    expect(years[5].textContent?.trim()).toBe('2025');
    expect(years[5].disabled).toBe(true);
    expect(years[5].getAttribute('aria-pressed')).toBe('true');
    expect(Array.from(compiled.querySelectorAll<HTMLButtonElement>('.month-button')).every((month) => month.disabled))
      .toBe(true);
  });
});
