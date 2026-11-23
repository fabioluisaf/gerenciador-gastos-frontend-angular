import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { provideAppLocale } from '../../core/locale';
import { ExpensesApi } from '../../expenses/expenses-api';
import { buildExpense } from '../../expenses/testing/expense-builder';
import { PaymentMethod } from '../../payment-methods/payment-method';
import { PaymentMethodsApi } from '../../payment-methods/payment-methods-api';
import { InvoicesApi } from '../invoices-api';
import { MonthInvoiceCard } from './month-invoice-card';

function card(id: string, name: string, usageCount: number): PaymentMethod {
  return {
    id,
    name,
    paymentType: 'CREDITO',
    institution: { id: 'nu', name: 'Nubank', iconUrl: null, color: '#820AD1' },
    closingDay: 14,
    dueDay: 21,
    usageCount,
  };
}

describe('MonthInvoiceCard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 10, 20), toFake: ['Date'] });
    TestBed.configureTestingModule({
      providers: [
        provideAppLocale(),
        provideRouter([]),
        {
          provide: PaymentMethodsApi,
          useValue: {
            list: () => of([card('caixa', 'Crédito Caixa', 1), card('nubank', 'Nubank', 9)]),
          },
        },
        {
          provide: InvoicesApi,
          useValue: {
            list: (id: string) =>
              of(
                id === 'nubank'
                  ? [
                      { id: 'nov', closingDate: '2026-11-14', dueDate: '2026-11-21', total: 80 },
                      { id: 'dez', closingDate: '2026-12-14', dueDate: '2026-12-21', total: 100 },
                      { id: 'fev', closingDate: '2027-02-14', dueDate: '2027-02-21', total: 0 },
                    ]
                  : [],
              ),
          },
        },
        {
          provide: ExpensesApi,
          useValue: {
            listByInvoice: () =>
              of({ realized: [], planned: [buildExpense({ amount: 50, realized: false })] }),
          },
        },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  async function render(period: string) {
    const fixture = TestBed.createComponent(MonthInvoiceCard);
    fixture.componentRef.setInput('period', period);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('should show the invoice due in the month of the most used card', async () => {
    const { element } = await render('2026-12');

    expect(element.querySelector('.summary-title')?.textContent).toBe('Fatura de dezembro de 2026');
    expect(element.querySelector('.summary-total')?.textContent).toMatch(/R\$\s100,00/);
    expect(element.querySelector('.summary-planned')?.textContent).toMatch(
      /de R\$\s150,00 planejados/,
    );
  });

  it('should summarize the previous and the next invoices', async () => {
    const { element } = await render('2026-12');

    const briefs = [...element.querySelectorAll('app-invoice-brief')].map((brief) =>
      ['.brief-month', '.brief-total', '.brief-planned'].map((part) =>
        brief.querySelector(part)?.textContent?.replace(/\s/g, ' '),
      ),
    );
    expect(briefs).toEqual([
      ['novembro', 'R$ 80,00', 'de R$ 130,00'],
      ['fevereiro', 'R$ 0,00', 'de R$ 50,00'],
    ]);
  });

  it('should only show the next invoice when there is no previous one', async () => {
    const { element } = await render('2026-11');

    const briefs = element.querySelectorAll('app-invoice-brief');
    expect(briefs).toHaveLength(1);
    expect(briefs[0].classList).toContain('next');
  });

  it('should say when the card has no invoice due in the month', async () => {
    const { fixture, element } = await render('2027-01');

    expect(element.querySelector('.empty')?.textContent).toBe(
      'Sem fatura com vencimento em janeiro de 2027.',
    );

    element.querySelectorAll<HTMLInputElement>('.cards input')[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(element.querySelector('.empty')).not.toBeNull();
  });
});
