import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAppLocale } from '../../core/locale';
import { Expense } from '../expense';
import { buildExpense } from '../testing/expense-builder';
import { ExpenseCard } from './expense-card';

function configure(): void {
  TestBed.configureTestingModule({
    providers: [provideAppLocale(), provideHttpClient(), provideHttpClientTesting()],
  });
}

function render(expense: Expense): HTMLElement {
  configure();
  const fixture = TestBed.createComponent(ExpenseCard);
  fixture.componentRef.setInput('expense', expense);
  fixture.detectChanges();
  return fixture.nativeElement;
}

async function renderFixture(expense: Expense): Promise<ComponentFixture<ExpenseCard>> {
  configure();
  const fixture = TestBed.createComponent(ExpenseCard);
  fixture.componentRef.setInput('expense', expense);
  await fixture.whenStable();
  return fixture;
}

function normalized(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

function tags(element: HTMLElement): string[] {
  return [...element.querySelectorAll('.tag')].map((tag) => normalized(tag.textContent));
}

describe('ExpenseCard', () => {
  it('should tone down the colors of planned expenses', () => {
    expect(render(buildExpense({ realized: false })).classList).toContain('planned');
    TestBed.resetTestingModule();
    expect(render(buildExpense()).classList).not.toContain('planned');
  });

  it('should show the expense data without the date', () => {
    const element = render(buildExpense({ description: 'Compra do mês' }));

    expect(normalized(element.querySelector('.name')?.textContent)).toBe('Mercado');
    expect(normalized(element.querySelector('.amount')?.textContent)).toBe('R$ 123,45');
    expect(normalized(element.querySelector('.description')?.textContent)).toBe('Compra do mês');
    expect(element.querySelector('.expand')).toBeNull();
    expect(tags(element)).toEqual(['Casa', 'Nubank · Crédito']);
    expect(element.querySelector('img')?.getAttribute('src')).toBe(
      '/api/instituicoes-financeiras/nubank/icone',
    );
    expect(element.textContent).not.toContain('2026');
  });

  it('should hide the payment method inside an invoice', () => {
    configure();
    const fixture = TestBed.createComponent(ExpenseCard);
    fixture.componentRef.setInput('expense', buildExpense());
    fixture.componentRef.setInput('invoiceView', true);
    fixture.detectChanges();

    expect(tags(fixture.nativeElement)).toEqual(['Casa']);
  });

  it('should show the whole installment purchase instead of the installment', () => {
    const element = render(
      buildExpense({
        amount: 100.01,
        installment: { number: 1, count: 3, purchaseId: 'compra', purchaseAmount: 300 },
      }),
    );

    expect(normalized(element.querySelector('.amount-value')?.textContent)).toBe('R$ 300,00');
    expect(
      [...element.querySelector('.amount')!.children].map((part) => normalized(part.textContent)),
    ).toEqual(['R$ 300,00', 'em 3x']);
    expect(element.querySelector('.heading .installment')).toBeNull();
    expect(normalized(element.querySelector('.name')?.textContent)).toBe('Mercado');
    expect(tags(element)).toEqual(['Casa', 'Nubank · Crédito']);
  });

  it('should expand an installment purchase to show which installments were paid, the current one and the future ones', async () => {
    vi.useFakeTimers({ now: new Date(2026, 11, 21), toFake: ['Date'] });
    const fixture = await renderFixture(
      buildExpense({
        amount: 100.01,
        installment: { number: 1, count: 3, purchaseId: 'compra', purchaseAmount: 300 },
      }),
    );
    vi.useRealTimers();
    const element: HTMLElement = fixture.nativeElement;
    const expand = element.querySelector<HTMLButtonElement>('.expand')!;
    expect(expand.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('.installments')).toBeNull();

    element.querySelector<HTMLElement>('.name')!.click();
    TestBed.tick();

    expect(expand.getAttribute('aria-expanded')).toBe('true');
    expect(expand.getAttribute('aria-label')).toBe('Recolher gasto');
    expect(normalized(element.querySelector('.installments')?.textContent)).toBe(
      'Carregando parcelas…',
    );
    TestBed.inject(HttpTestingController)
      .expectOne('/api/compras-parceladas/compra')
      .flush({
        dados: {
          parcelas: [
            { numeroParcela: 2, valor: 99.99, fatura: { dataVencimento: '2026-12-21' } },
            { numeroParcela: 1, valor: 100.01, fatura: { dataVencimento: '2026-11-21' } },
            { numeroParcela: 3, valor: 100, fatura: { dataVencimento: '2027-01-21' } },
          ],
        },
      });
    await fixture.whenStable();

    const details = element.querySelector('.installments')!;
    expect(expand.getAttribute('aria-controls')).toBe(details.id);
    expect(
      [...details.querySelectorAll('.installment-row')].map((row) =>
        [...row.querySelectorAll('span')].map((cell) => normalized(cell.textContent)).join(' | '),
      ),
    ).toEqual([
      '1/3 | nov 2026 | R$ 100,01 | Paga',
      '2/3 | dez 2026 | R$ 99,99 | Paga',
      '3/3 | jan 2027 | R$ 100,00 | Fatura atual',
    ]);
    expect(element.querySelector('.expense-card')?.classList).toContain('expanded');

    expand.click();
    await fixture.whenStable();

    expect(element.querySelector('.installments')).toBeNull();
    expect(expand.getAttribute('aria-expanded')).toBe('false');
  });

  it('should not expand a card whose content fits', async () => {
    const fixture = await renderFixture(buildExpense());
    const element: HTMLElement = fixture.nativeElement;

    element.click();
    await fixture.whenStable();

    expect(element.classList).not.toContain('expandable');
    expect(element.querySelector('.expense-card')?.classList).not.toContain('expanded');
  });

  it('should offer to expand when the name or the description does not fit in one line', async () => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.classList.contains('description') ? 500 : 100;
    });
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);

    const fixture = await renderFixture(buildExpense({ description: 'Texto bem comprido' }));

    expect(fixture.nativeElement.querySelector('.expand')?.getAttribute('aria-label')).toBe(
      'Expandir gasto',
    );
    vi.restoreAllMocks();
  });

  it('should paint the gradient from the institution color to the payment method color', () => {
    const card = render(buildExpense({ paymentType: 'PIX' })).querySelector<HTMLElement>(
      '.expense-card',
    )!;

    expect(card.style.getPropertyValue('--institution-color')).toBe('#820AD1');
    expect(card.style.getPropertyValue('--payment-color')).toBe('var(--payment-pix-border)');
  });

  it('should highlight refunds and omit optional data', () => {
    const element = render(
      buildExpense({
        amount: -24.62,
        institution: { id: 'x', name: 'Banco', iconUrl: null, color: null },
      }),
    );

    const amount = element.querySelector('.amount');
    expect(normalized(amount?.textContent)).toBe('-R$ 24,62');
    expect(amount?.classList).toContain('refund');
    expect(element.querySelector('.description')).toBeNull();
    expect(element.querySelector('img')).toBeNull();
    expect(
      element
        .querySelector<HTMLElement>('.expense-card')!
        .style.getPropertyValue('--institution-color'),
    ).toBe('');
    expect(tags(element)).toHaveLength(2);
  });
});
