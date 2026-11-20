import { TestBed } from '@angular/core/testing';
import { provideAppLocale } from '../../core/locale';
import { MonthTotals as MonthTotalsData } from '../expense';
import { buildMonthTotals } from '../testing/month-totals-builder';
import { MonthTotals } from './month-totals';

function render(totals: MonthTotalsData): HTMLElement {
  TestBed.configureTestingModule({ providers: [provideAppLocale()] });
  const fixture = TestBed.createComponent(MonthTotals);
  fixture.componentRef.setInput('totals', totals);
  fixture.componentRef.setInput('periodLabel', 'nov de 2026');
  fixture.detectChanges();
  return fixture.nativeElement;
}

function normalized(element: Element | null): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('MonthTotals', () => {
  it('should show the overall totals and one row per payment method and category', () => {
    const element = render(buildMonthTotals());

    expect(normalized(element.querySelector('.title'))).toBe('Totais de nov de 2026');
    expect(normalized(element.querySelector('.overall-realized'))).toBe('R$ 150,00');
    expect(normalized(element.querySelector('.overall-planned'))).toBe('de R$ 200,00 planejados');
    const groups = [...element.querySelectorAll('section.group')];
    expect(groups.map((group) => normalized(group.querySelector('h3')))).toEqual([
      'Por método de pagamento',
      'Por categoria',
    ]);
    expect(
      [...groups[0].querySelectorAll('app-total-row')].map((row) =>
        normalized(row.querySelector('.label')),
      ),
    ).toEqual(['Cartão Nubank', 'Pix Caixa']);
    expect([...groups[1].querySelectorAll('app-total-row')].map((row) => normalized(row))).toEqual([
      'Casa R$ 120,00 de R$ 160,00',
      'Lazer R$ 30,00 de R$ 40,00',
    ]);
  });

  it('should fill each progress bar with the realized share using the institution color', () => {
    const rows = [...render(buildMonthTotals()).querySelectorAll<HTMLElement>('app-total-row')];

    expect(rows[0].style.getPropertyValue('--bar-color')).toBe('#820AD1');
    expect(
      parseFloat(rows[0].querySelector<HTMLElement>('.bar-fill')!.style.inlineSize),
    ).toBeCloseTo(66.67);
    expect(rows[0].querySelector('img')?.getAttribute('src')).toBe(
      '/api/instituicoes-financeiras/nubank/icone',
    );
    expect(rows[1].style.getPropertyValue('--bar-color')).toBe('');
    expect(rows[1].querySelector<HTMLElement>('.bar-fill')?.style.inlineSize).toBe('100%');
  });

  it('should size each bar relative to the largest planned amount of its group', () => {
    const element = render(buildMonthTotals());
    const sizes = [...element.querySelectorAll('section.group')].map((group) =>
      [...group.querySelectorAll<HTMLElement>('.bar')].map((bar) =>
        Math.round(parseFloat(bar.style.inlineSize)),
      ),
    );

    expect(sizes).toEqual([
      [100, 33],
      [100, 25],
    ]);
  });

  it('should keep the bar inside its limits with refunds and months without planned expenses', () => {
    const element = render(
      buildMonthTotals({
        byPayment: [],
        byCategory: [
          { id: 'estorno', label: 'Estorno', realized: -10, planned: 20 },
          { id: 'zero', label: 'Zero', realized: 0, planned: 0 },
        ],
      }),
    );

    const fills = [...element.querySelectorAll<HTMLElement>('.bar-fill')];
    expect(fills.map((fill) => fill.style.inlineSize)).toEqual(['0%', '0%']);
    expect(normalized(element.querySelector('section.group .empty'))).toBe(
      'Nenhum gasto neste mês.',
    );
  });

  it('should toggle filters from the rows and mark the active ones', () => {
    TestBed.configureTestingModule({ providers: [provideAppLocale()] });
    const fixture = TestBed.createComponent(MonthTotals);
    const totals = buildMonthTotals();
    fixture.componentRef.setInput('totals', totals);
    fixture.componentRef.setInput('periodLabel', 'nov de 2026');
    fixture.componentRef.setInput('activeFilters', [
      { kind: 'category', id: 'Lazer', label: 'Lazer' },
    ]);
    const toggled: unknown[] = [];
    fixture.componentInstance.filterToggled.subscribe((filter) => toggled.push(filter));
    fixture.detectChanges();

    const buttons = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.row-button'),
    ];
    expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'false',
      'true',
    ]);

    buttons[0].click();
    buttons[2].click();

    expect(toggled).toEqual([
      {
        kind: 'payment',
        id: 'cartao',
        label: 'Cartão Nubank',
        institution: totals.byPayment[0].institution,
      },
      { kind: 'category', id: 'Casa', label: 'Casa' },
    ]);
  });

  it('should reject rows without realized expenses, unless the filter is already active', async () => {
    TestBed.configureTestingModule({ providers: [provideAppLocale()] });
    const fixture = TestBed.createComponent(MonthTotals);
    fixture.componentRef.setInput(
      'totals',
      buildMonthTotals({
        byPayment: [],
        byCategory: [
          { id: 'Casa', label: 'Casa', realized: 10, planned: 20 },
          { id: 'Lazer', label: 'Lazer', realized: 0, planned: 30 },
          { id: 'Saúde', label: 'Saúde', realized: 0, planned: 40 },
        ],
      }),
    );
    fixture.componentRef.setInput('periodLabel', 'nov de 2026');
    fixture.componentRef.setInput('activeFilters', [
      { kind: 'category', id: 'Saúde', label: 'Saúde' },
    ]);
    const toggled: unknown[] = [];
    fixture.componentInstance.filterToggled.subscribe((filter) => toggled.push(filter));
    fixture.detectChanges();

    const buttons = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.row-button'),
    ];
    expect(buttons.map((button) => button.getAttribute('aria-disabled'))).toEqual([
      null,
      'true',
      null,
    ]);

    buttons.forEach((button) => button.click());
    await new Promise((resolve) => requestAnimationFrame(resolve));
    fixture.detectChanges();

    expect(toggled.map((filter) => (filter as { id: string }).id)).toEqual(['Casa', 'Saúde']);
    expect(buttons.map((button) => button.classList.contains('rejected'))).toEqual([
      false,
      true,
      false,
    ]);

    buttons[1].dispatchEvent(new Event('animationend'));
    fixture.detectChanges();
    expect(buttons[1].classList).not.toContain('rejected');
  });

  it('should only accept rows with pending planned expenses while listing the planned ones', () => {
    TestBed.configureTestingModule({ providers: [provideAppLocale()] });
    const fixture = TestBed.createComponent(MonthTotals);
    fixture.componentRef.setInput(
      'totals',
      buildMonthTotals({
        byPayment: [],
        byCategory: [
          { id: 'Casa', label: 'Casa', realized: 20, planned: 20 },
          { id: 'Lazer', label: 'Lazer', realized: 0, planned: 30 },
        ],
      }),
    );
    fixture.componentRef.setInput('periodLabel', 'nov de 2026');
    fixture.componentRef.setInput('kind', 'planned');
    fixture.detectChanges();

    const buttons = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.row-button'),
    ];
    expect(buttons.map((button) => button.getAttribute('aria-disabled'))).toEqual(['true', null]);
  });

  it('should give unique ids to the headings of each instance', () => {
    const first = render(buildMonthTotals());
    const second = TestBed.createComponent(MonthTotals);
    second.componentRef.setInput('totals', buildMonthTotals());
    second.componentRef.setInput('periodLabel', 'nov de 2026');
    second.detectChanges();

    const ids = [first, second.nativeElement as HTMLElement].flatMap((element) =>
      [...element.querySelectorAll('h3')].map((heading) => heading.id),
    );
    expect(new Set(ids).size).toBe(4);
  });
});
