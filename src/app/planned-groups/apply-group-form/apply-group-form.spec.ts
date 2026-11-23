import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideAppLocale } from '../../core/locale';
import { PaymentMethod } from '../../payment-methods/payment-method';
import { PaymentMethodsApi } from '../../payment-methods/payment-methods-api';
import { PlannedGroup } from '../planned-group';
import { PlannedGroupsApi } from '../planned-groups-api';
import { ApplyGroupForm } from './apply-group-form';

function method(id: string, paymentType: PaymentMethod['paymentType'], usageCount: number) {
  return {
    id,
    name: id,
    paymentType,
    institution: { id: 'nu', name: 'Nubank', iconUrl: null, color: null },
    closingDay: paymentType === 'CREDITO' ? 14 : null,
    dueDay: paymentType === 'CREDITO' ? 21 : null,
    usageCount,
  } satisfies PaymentMethod;
}

const GROUP: PlannedGroup = {
  id: 'contas',
  name: 'Contas fixas',
  total: 219.9,
  items: [
    { name: 'Luz', amount: 120, category: 'Casa', description: null },
    { name: 'Internet', amount: 99.9, category: 'Casa', description: 'Fibra' },
  ],
};

describe('ApplyGroupForm', () => {
  let apply: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 10, 20), toFake: ['Date'] });
    apply = vi.fn(() => of(undefined));
    TestBed.configureTestingModule({
      providers: [
        provideAppLocale(),
        {
          provide: PaymentMethodsApi,
          useValue: {
            list: () =>
              of([
                method('pix', 'PIX', 30),
                method('nubank', 'CREDITO', 9),
                method('caixa', 'CREDITO', 2),
              ]),
          },
        },
        { provide: PlannedGroupsApi, useValue: { apply } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  function render() {
    const fixture = TestBed.createComponent(ApplyGroupForm);
    fixture.componentRef.setInput('group', GROUP);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  function methodValues(element: HTMLElement): string[] {
    return [...element.querySelectorAll<HTMLInputElement>('.method input')].map(
      ({ value }) => value,
    );
  }

  function submit(fixture: ComponentFixture<ApplyGroupForm>) {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function chooseMonth(fixture: ComponentFixture<ApplyGroupForm>, label: string) {
    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLButtonElement>('app-date-field button')!.click();
    fixture.detectChanges();
    [...element.querySelectorAll<HTMLButtonElement>('app-date-field button')]
      .find((button) => button.getAttribute('aria-label')?.startsWith(label))!
      .click();
    fixture.detectChanges();
  }

  it('should offer only credit cards for an invoice and require its month', () => {
    const { fixture, element } = render();

    expect(methodValues(element)).toEqual(['nubank', 'caixa']);
    expect(element.querySelector<HTMLInputElement>('.method input:checked')?.value).toBe('nubank');
    submit(fixture);

    expect(apply).not.toHaveBeenCalled();
    expect(element.querySelector('app-date-field .field-error')?.textContent).toBe(
      'Escolha o mês da fatura.',
    );
  });

  it('should create the reviewed items in the chosen invoice', () => {
    const applied = vi.fn();
    const { fixture, element } = render();
    fixture.componentInstance.applied.subscribe(applied);
    chooseMonth(fixture, 'dezembro');

    const [luz] = element.querySelectorAll<HTMLInputElement>('.check');
    luz.click();
    fixture.detectChanges();
    const amount = element.querySelectorAll<HTMLInputElement>('.review-amount')[1];
    amount.value = '10500';
    amount.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(element.querySelector('.review-total')?.textContent).toMatch(/R\$\s105,00/);
    expect(element.querySelector('.primary-button')?.textContent?.trim()).toBe(
      'Criar 1 gasto planejado',
    );
    submit(fixture);

    expect(apply).toHaveBeenCalledWith('contas', {
      paymentMethodId: 'nubank',
      date: null,
      invoicePeriod: '2026-12',
      items: [{ name: 'Internet', amount: 105, category: 'Casa', description: 'Fibra' }],
    });
    expect(applied).toHaveBeenCalledWith(1);
  });

  it('should create every item on a date keeping the chosen card and offering any method', () => {
    const { fixture, element } = render();

    element.querySelectorAll<HTMLInputElement>('app-segmented-selector input')[1].click();
    fixture.detectChanges();
    expect(methodValues(element)).toEqual(['pix', 'nubank', 'caixa']);
    expect(element.querySelector('.primary-button')?.textContent?.trim()).toBe(
      'Criar 2 gastos planejados',
    );
    submit(fixture);

    expect(apply).toHaveBeenCalledWith('contas', {
      paymentMethodId: 'nubank',
      date: '2026-11-20',
      invoicePeriod: null,
      items: GROUP.items,
    });
  });

  it('should require at least one checked item', () => {
    const { fixture, element } = render();
    chooseMonth(fixture, 'dezembro');

    element.querySelectorAll<HTMLInputElement>('.check').forEach((check) => check.click());
    fixture.detectChanges();
    submit(fixture);

    expect(apply).not.toHaveBeenCalled();
    expect(element.querySelector('.review .field-error')?.textContent).toBe(
      'Marque pelo menos um gasto.',
    );
  });
});
