import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { provideAppLocale } from '../../core/locale';
import { Expense, NewExpense } from '../../expenses/expense';
import { ExpensesApi } from '../../expenses/expenses-api';
import { buildExpense } from '../../expenses/testing/expense-builder';
import { PaymentMethod } from '../../payment-methods/payment-method';
import { PaymentMethodsApi } from '../../payment-methods/payment-methods-api';
import { ExpenseForm } from './expense-form';

function method(id: string, paymentType: PaymentMethod['paymentType'], usageCount: number) {
  return {
    id,
    name: id,
    paymentType,
    institution: { id: 'nu', name: 'Nubank', iconUrl: null, color: '#820AD1' },
    closingDay: null,
    dueDay: null,
    usageCount,
  } satisfies PaymentMethod;
}

describe('ExpenseForm', () => {
  let created: NewExpense[];
  let response: Subject<void>;
  let fixture: ComponentFixture<ExpenseForm>;
  let element: HTMLElement;
  let saved: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(async () => {
    created = [];
    response = new Subject<void>();
    TestBed.configureTestingModule({
      providers: [
        provideAppLocale(),
        {
          provide: ExpensesApi,
          useValue: {
            listCategories: () => of(['Lazer', 'Casa']),
            create: (expense: NewExpense) => {
              created.push(expense);
              return response;
            },
          },
        },
        {
          provide: PaymentMethodsApi,
          useValue: {
            list: () => of([method('pix', 'PIX', 2), method('credito', 'CREDITO', 9)]),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(ExpenseForm);
    saved = vi.fn<() => void>();
    fixture.componentInstance.saved.subscribe(saved);
    element = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  function type(selector: string, value: string): void {
    const input = element.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submit(): void {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
  }

  it('should format the amount as money while typing digits', () => {
    type('.amount-input', '12345');

    expect(element.querySelector<HTMLInputElement>('.amount-input')!.value).toMatch(/R\$\s123,45/);
  });

  it('should preselect the most used method and offer installments only on credit', () => {
    const checked = element.querySelector<HTMLInputElement>('.method input:checked');
    expect(checked?.value).toBe('credito');
    expect(element.querySelector('.stepper')).not.toBeNull();

    element.querySelector<HTMLInputElement>('.method input[value="pix"]')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.stepper')).toBeNull();
  });

  it('should point out every missing field instead of saving', () => {
    submit();

    expect([...element.querySelectorAll('.field-error')].map((error) => error.textContent)).toEqual(
      ['Informe o valor.', 'Informe o nome do gasto.', 'Informe a categoria.'],
    );
    expect(created).toEqual([]);
  });

  it('should save an installment purchase and tell when it is done', () => {
    type('.amount-input', '90000');
    type('input[placeholder="Ex.: Mercado do mês"]', '  Geladeira ');
    element.querySelector<HTMLButtonElement>('button[aria-label="Mais parcelas"]')!.click();
    element.querySelector<HTMLButtonElement>('button[aria-label="Mais parcelas"]')!.click();
    fixture.detectChanges();
    [...element.querySelectorAll<HTMLButtonElement>('.categories .chip')]
      .find((chip) => chip.textContent?.trim() === 'Casa')!
      .click();
    fixture.detectChanges();
    expect(element.querySelector('.amount-detail')?.textContent).toMatch(/em 3x de R\$\s300,00/);

    submit();

    expect(created).toEqual([
      expect.objectContaining({
        name: 'Geladeira',
        amount: 900,
        category: 'Casa',
        paymentMethodId: 'credito',
        description: null,
        realized: true,
        installments: 3,
      }),
    ]);
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);

    response.next();
    response.complete();
    expect(saved).toHaveBeenCalledOnce();
  });

  function openDateField(label: string): HTMLElement {
    const field = [...element.querySelectorAll<HTMLElement>('app-date-field')].find(
      (candidate) => candidate.querySelector('.field-label')?.textContent === label,
    )!;
    field.querySelector<HTMLButtonElement>('.trigger')!.click();
    fixture.detectChanges();
    return field;
  }

  function shortcuts(field: HTMLElement): HTMLButtonElement[] {
    return [...field.querySelectorAll<HTMLButtonElement>('.shortcuts .chip')];
  }

  function choosePlanned(): void {
    element
      .querySelectorAll<HTMLInputElement>('app-segmented-selector input[type="radio"]')[1]
      .click();
    fixture.detectChanges();
  }

  it('should allow a planned credit expense without date once its invoice is chosen', () => {
    type('.amount-input', '5000');
    type('input[placeholder="Ex.: Mercado do mês"]', 'Viagem');
    type('input[placeholder="Ex.: Casa"]', 'Lazer');
    choosePlanned();
    shortcuts(openDateField('Data'))
      .find((chip) => chip.textContent?.trim() === 'Sem data')!
      .click();
    fixture.detectChanges();

    submit();
    expect(element.textContent).toContain('Informe a data ou o mês da fatura.');
    expect(created).toEqual([]);

    openDateField('Mês da fatura').querySelectorAll<HTMLButtonElement>('.month')[5].click();
    fixture.detectChanges();
    submit();

    expect(created[0]).toEqual(
      expect.objectContaining({ realized: false, date: null, installments: 1 }),
    );
    expect(created[0].invoicePeriod).toMatch(/^\d{4}-06$/);
  });

  it('should require a date for planned expenses outside credit', () => {
    type('.amount-input', '5000');
    type('input[placeholder="Ex.: Mercado do mês"]', 'Aluguel');
    type('input[placeholder="Ex.: Casa"]', 'Casa');
    element.querySelector<HTMLInputElement>('.method input[value="pix"]')!.click();
    choosePlanned();
    expect(shortcuts(openDateField('Data')).map((chip) => chip.textContent?.trim())).toEqual([
      'Hoje',
      'Ontem',
    ]);
  });

  it('should plan an installment purchase, which still needs a date', () => {
    type('.amount-input', '30000');
    type('input[placeholder="Ex.: Mercado do mês"]', 'Notebook');
    type('input[placeholder="Ex.: Casa"]', 'Casa');
    choosePlanned();
    element.querySelector<HTMLButtonElement>('button[aria-label="Mais parcelas"]')!.click();
    fixture.detectChanges();

    expect(shortcuts(openDateField('Data')).map((chip) => chip.textContent?.trim())).toEqual([
      'Hoje',
      'Ontem',
    ]);
    submit();

    expect(created[0]).toEqual(expect.objectContaining({ realized: false, installments: 2 }));
  });

  it('should hide the other methods while splitting into installments', () => {
    expect(element.querySelectorAll('.method').length).toBe(2);

    element.querySelector<HTMLButtonElement>('button[aria-label="Mais parcelas"]')!.click();
    fixture.detectChanges();

    expect(
      [...element.querySelectorAll<HTMLInputElement>('.method input')].map((input) => input.value),
    ).toEqual(['credito']);
    expect(element.textContent).toContain('Compras parceladas só podem ser feitas no crédito.');
  });

  it('should let the user pick the invoice month only on credit', () => {
    type('.amount-input', '1000');
    type('input[placeholder="Ex.: Mercado do mês"]', 'Cinema');
    type('input[placeholder="Ex.: Casa"]', 'Lazer');
    const invoice = openDateField('Mês da fatura');
    invoice.querySelectorAll<HTMLButtonElement>('.month')[2].click();
    fixture.detectChanges();

    submit();

    expect(created[0].invoicePeriod).toMatch(/^\d{4}-03$/);

    element.querySelector<HTMLInputElement>('.method input[value="pix"]')!.click();
    fixture.detectChanges();
    expect(
      [...element.querySelectorAll('app-date-field .field-label')].map(
        (label) => label.textContent,
      ),
    ).toEqual(['Data']);
  });

  it('should list every used category in alphabetical order', () => {
    expect(
      [...element.querySelectorAll('.categories .chip')].map((chip) => chip.textContent?.trim()),
    ).toEqual(['Casa', 'Lazer']);
  });

  it('should filter the used categories while typing, without the browser suggestion list', () => {
    const input = element.querySelector<HTMLInputElement>('input[placeholder="Ex.: Casa"]')!;
    expect(input.hasAttribute('list')).toBe(false);
    expect(element.querySelector('datalist')).toBeNull();

    input.value = 'LAZ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(
      [...element.querySelectorAll('.categories .chip')].map((chip) => chip.textContent?.trim()),
    ).toEqual(['Lazer']);

    input.value = 'Nova';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(element.querySelector('.categories')).toBeNull();
  });

  it('should move the caret to the end on the first click in the amount', () => {
    type('.amount-input', '12345');
    const amount = element.querySelector<HTMLInputElement>('.amount-input')!;
    (document.activeElement as HTMLElement | null)?.blur();

    amount.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    amount.focus();
    amount.setSelectionRange(1, 1);
    amount.click();
    expect(amount.selectionStart).toBe(amount.value.length);

    amount.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    amount.setSelectionRange(1, 1);
    amount.click();
    expect(amount.selectionStart).toBe(1);
  });

  it('should keep the form and explain when saving fails', () => {
    TestBed.inject(ExpensesApi).create = () => throwError(() => new Error('400'));
    type('.amount-input', '100');
    type('input[placeholder="Ex.: Mercado do mês"]', 'Café');
    type('input[placeholder="Ex.: Casa"]', 'Lazer');

    submit();

    expect(element.querySelector('.form-error')?.textContent).toContain(
      'Não foi possível salvar o gasto',
    );
    expect(saved).not.toHaveBeenCalled();
  });

  describe('when editing', () => {
    let updated: NewExpense[];

    async function renderEditing(installment: Expense['installment']): Promise<void> {
      updated = [];
      const api = TestBed.inject(ExpensesApi);
      api.loadForEdit = () =>
        of({
          name: 'Cinema',
          amount: 42.5,
          category: 'Lazer',
          paymentMethodId: 'pix',
          date: '2026-11-10',
          description: 'Com pipoca',
          realized: true,
          installments: installment ? installment.count : 1,
          invoicePeriod: null,
        });
      api.update = (_: Expense, changes: NewExpense) => {
        updated.push(changes);
        return of(undefined);
      };
      fixture.componentRef.setInput('expense', buildExpense({ installment }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    it('should start filled with the saved expense and keep it as a single expense', async () => {
      await renderEditing(null);

      expect(element.querySelector<HTMLInputElement>('.amount-input')!.value).toMatch(/R\$\s42,50/);
      expect(
        element.querySelector<HTMLInputElement>('input[placeholder="Ex.: Mercado do mês"]')!.value,
      ).toBe('Cinema');
      expect(element.querySelector<HTMLInputElement>('.method input:checked')?.value).toBe('pix');
      expect(element.querySelector('.stepper')).toBeNull();
      expect(element.querySelector('button[type="submit"]')?.textContent?.trim()).toBe(
        'Salvar alterações',
      );

      submit();

      expect(updated).toEqual([
        expect.objectContaining({ name: 'Cinema', amount: 42.5, installments: 1 }),
      ]);
      expect(saved).toHaveBeenCalledOnce();
    });

    it('should let an installment purchase change its installments, only on credit', async () => {
      await renderEditing({ number: 1, count: 3, purchaseId: 'compra-1', purchaseAmount: 42.5 });

      expect(element.querySelector('.stepper-value')?.textContent?.trim()).toBe('3x');
      expect(
        [...element.querySelectorAll<HTMLInputElement>('.method input')].map(
          (input) => input.value,
        ),
      ).toEqual(['credito']);
    });
  });
});
