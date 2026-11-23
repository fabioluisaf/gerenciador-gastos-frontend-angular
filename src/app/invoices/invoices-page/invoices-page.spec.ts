import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideAppLocale } from '../../core/locale';
import { Expense } from '../../expenses/expense';
import { ExpensesApi } from '../../expenses/expenses-api';
import { buildExpense } from '../../expenses/testing/expense-builder';
import { PaymentMethod } from '../../payment-methods/payment-method';
import { PaymentMethodsApi } from '../../payment-methods/payment-methods-api';
import { Invoice } from '../invoice';
import { InvoicesApi } from '../invoices-api';
import { InvoicesPage } from './invoices-page';

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

describe('InvoicesPage', () => {
  let invoicesByCard: Record<string, Invoice[]>;
  let entries: Record<string, { realized: Expense[]; planned: Expense[] }>;

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 10, 20), toFake: ['Date'] });
    invoicesByCard = {
      nubank: [
        { id: 'nov', closingDate: '2026-11-14', dueDate: '2026-11-21', total: 120 },
        { id: 'dez', closingDate: '2026-12-14', dueDate: '2026-12-21', total: 657.08 },
        { id: 'jan', closingDate: '2027-01-14', dueDate: '2027-01-21', total: 0 },
      ],
      caixa: [],
    };
    entries = {
      dez: {
        realized: [buildExpense({ id: 'r', name: 'Mercado', amount: 657.08 })],
        planned: [
          buildExpense({
            id: 'p',
            name: 'Geladeira',
            amount: 300,
            realized: false,
            installment: { number: 2, count: 10, purchaseId: 'compra', purchaseAmount: 3000 },
          }),
        ],
      },
      nov: { realized: [], planned: [] },
    };
    TestBed.configureTestingModule({
      providers: [
        provideAppLocale(),
        {
          provide: PaymentMethodsApi,
          useValue: {
            list: () =>
              of([
                card('caixa', 'Crédito Caixa', 2),
                { ...card('pix', 'Pix', 50), paymentType: 'PIX' },
                card('nubank', 'Cartao Nubank', 9),
              ]),
          },
        },
        { provide: InvoicesApi, useValue: { list: (id: string) => of(invoicesByCard[id]) } },
        {
          provide: ExpensesApi,
          useValue: {
            listByInvoice: (id: string) => of(entries[id] ?? { realized: [], planned: [] }),
          },
        },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  async function render() {
    const fixture = TestBed.createComponent(InvoicesPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('should open on the most used card and its open invoice', async () => {
    const { element } = await render();

    expect(
      [...element.querySelectorAll('.cards label.option')].map((option) =>
        option.textContent?.trim(),
      ),
    ).toEqual(['Cartao Nubank', 'Crédito Caixa']);
    expect(
      [...element.querySelectorAll('app-month-strip .month')].map((month) =>
        month.getAttribute('aria-label'),
      ),
    ).toEqual(['novembro de 2026', 'dezembro de 2026', 'janeiro de 2027']);
    expect(
      element
        .querySelector('app-month-strip .month[aria-pressed="true"]')
        ?.getAttribute('aria-label'),
    ).toBe('dezembro de 2026');
    expect(element.querySelector('.summary-title')?.textContent).toBe('Fatura de dezembro de 2026');
    expect(element.querySelector('.status-chip')?.textContent?.trim()).toBe('Aberta');
    expect(element.querySelector('.summary-total')?.textContent).toMatch(/R\$\s657,08/);
    expect(element.querySelector('.summary-planned')?.textContent).toMatch(
      /de R\$\s957,08 planejados/,
    );
  });

  it('should list the invoice entries showing the installment of that invoice', async () => {
    const { element } = await render();

    expect(
      [...element.querySelectorAll('.entries-title')].map((title) =>
        ['.entries-name', '.entries-total', '.entries-count'].map((part) =>
          title.querySelector(part)?.textContent?.replace(/\s/g, ' ').trim(),
        ),
      ),
    ).toEqual([
      ['Parcelas', 'R$ 300,00', '1'],
      ['Realizados', 'R$ 657,08', '1'],
    ]);
    expect(element.querySelector('.day-label')?.textContent).toContain('19 de nov de 2026');
    const installment = element.querySelectorAll('app-expense-card')[0];
    expect(installment.querySelector('.heading .installment')?.textContent?.trim()).toBe('2/10');
    expect(installment.querySelector('.amount .installment')).toBeNull();
    expect(installment.querySelector('.amount-value')?.textContent).toMatch(/R\$\s300,00/);
  });

  it('should filter the invoice entries by name and show the filtered total', async () => {
    const { fixture, element } = await render();

    const search = element.querySelector<HTMLInputElement>('.search-input')!;
    search.value = 'gela';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(element.querySelectorAll('app-expense-card')).toHaveLength(1);
    expect(element.querySelector('.filtered-total')?.textContent?.replace(/\s+/g, ' ')).toMatch(
      /1 gasto\s*R\$\s0,00 de R\$\s300,00 planejados/,
    );

    element.querySelector<HTMLButtonElement>('app-filtered-total .clear')!.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('app-expense-card')).toHaveLength(2);
    expect(element.querySelector('.filtered-total')).toBeNull();
  });

  it('should switch invoices and cards', async () => {
    const { fixture, element } = await render();

    element.querySelector<HTMLButtonElement>('app-month-strip .month')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.querySelector('.status-chip')?.textContent?.trim()).toBe('Fechada');
    expect(element.querySelector('.status')?.textContent).toBe('Nenhum gasto nesta fatura.');

    element.querySelectorAll<HTMLInputElement>('.cards input')[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.querySelector('.status')?.textContent).toBe(
      'Este cartão ainda não tem faturas.',
    );
  });
});
