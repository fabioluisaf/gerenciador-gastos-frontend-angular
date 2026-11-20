import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Institution } from '../../expenses/expense';
import { InstitutionsApi } from '../../payment-methods/institutions-api';
import { NewPaymentMethod } from '../../payment-methods/payment-method';
import { PaymentMethodsApi } from '../../payment-methods/payment-methods-api';
import { PaymentMethodForm } from './payment-method-form';

describe('PaymentMethodForm', () => {
  let created: NewPaymentMethod[];
  let institutions: Institution[];
  let fixture: ComponentFixture<PaymentMethodForm>;
  let element: HTMLElement;

  beforeEach(() => {
    created = [];
    institutions = [
      { id: 'caixa', name: 'Caixa', iconUrl: null, color: '#005CA9' },
      { id: 'nu', name: 'Nubank', iconUrl: null, color: '#820AD1' },
    ];
    TestBed.configureTestingModule({
      providers: [
        { provide: InstitutionsApi, useValue: { list: () => of(institutions) } },
        {
          provide: PaymentMethodsApi,
          useValue: {
            create: (method: NewPaymentMethod) => {
              created.push(method);
              return of(undefined);
            },
          },
        },
      ],
    });
  });

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(PaymentMethodForm);
    element = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function pick(label: string): void {
    [...element.querySelectorAll<HTMLLabelElement>('label.option')]
      .find((option) => option.textContent?.trim() === label)!
      .querySelector('input')!
      .click();
    fixture.detectChanges();
  }

  function type(selector: string, value: string): void {
    const input = element.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function nameInput(): HTMLInputElement {
    return element.querySelector<HTMLInputElement>('input[id$="-nome"]')!;
  }

  it('should suggest the name from the type and institution and mirror it on the preview', async () => {
    await render();

    expect(nameInput().value).toBe('Crédito Caixa');
    pick('Pix');
    pick('Nubank');

    expect(nameInput().value).toBe('Pix Nubank');
    expect(element.querySelector('.preview .name')?.textContent).toBe('Pix Nubank');
    expect(element.querySelector('.preview .type')?.textContent).toBe('Pix');
  });

  it('should keep a typed name when the choices change', async () => {
    await render();

    type('input[id$="-nome"]', 'Cartão roxinho');
    pick('Nubank');

    expect(nameInput().value).toBe('Cartão roxinho');
  });

  it('should require valid billing days only for credit', async () => {
    await render();
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('.field-error').length).toBe(2);
    expect(created).toEqual([]);

    pick('Débito');
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();

    expect(created).toEqual([
      {
        paymentType: 'DEBITO',
        institutionId: 'caixa',
        name: 'Débito Caixa',
        closingDay: null,
        dueDay: null,
      },
    ]);
  });

  it('should save a credit method with its billing days', async () => {
    await render();
    type('input[id$="-fechamento"]', '14');
    type('input[id$="-vencimento"]', '21');

    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

    expect(created[0]).toEqual(
      expect.objectContaining({ paymentType: 'CREDITO', closingDay: 14, dueDay: 21 }),
    );
  });

  it('should send the user to create an institution when there is none', async () => {
    institutions = [];
    await render();
    const requested = vi.fn();
    fixture.componentInstance.institutionRequested.subscribe(requested);

    element.querySelector<HTMLButtonElement>('.empty-institutions .chip')!.click();

    expect(requested).toHaveBeenCalledOnce();
  });

  it('should edit a method keeping its type fixed', async () => {
    const updated: NewPaymentMethod[] = [];
    TestBed.inject(PaymentMethodsApi).update = (_: unknown, changes: NewPaymentMethod) => {
      updated.push(changes);
      return of(undefined);
    };
    fixture = TestBed.createComponent(PaymentMethodForm);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('method', {
      id: 'cartao',
      name: 'Cartao Nubank',
      paymentType: 'CREDITO',
      institution: { id: 'nu', name: 'Nubank', iconUrl: null, color: '#820AD1' },
      closingDay: 14,
      dueDay: 21,
      usageCount: 9,
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(nameInput().value).toBe('Cartao Nubank');
    expect(element.querySelector<HTMLInputElement>('input[id$="-fechamento"]')!.value).toBe('14');
    expect(element.querySelector('label.option.active')?.textContent?.trim()).toBe('Nubank');
    expect(
      [...element.querySelectorAll('label.option')].map((option) => option.textContent?.trim()),
    ).toEqual(['Caixa', 'Nubank']);

    type('input[id$="-vencimento"]', '25');
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

    expect(updated).toEqual([
      {
        paymentType: 'CREDITO',
        institutionId: 'nu',
        name: 'Cartao Nubank',
        closingDay: 14,
        dueDay: 25,
      },
    ]);
  });
});
