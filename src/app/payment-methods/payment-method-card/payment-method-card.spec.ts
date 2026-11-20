import { TestBed } from '@angular/core/testing';
import { PaymentMethod } from '../payment-method';
import { PaymentMethodCard, prefersDarkText } from './payment-method-card';

function method(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    id: 'cartao',
    name: 'Cartao Nubank',
    paymentType: 'CREDITO',
    institution: { id: 'nu', name: 'Nubank', iconUrl: '/api/icone', color: '#820AD1' },
    closingDay: 14,
    dueDay: 21,
    usageCount: 0,
    ...overrides,
  };
}

describe('PaymentMethodCard', () => {
  function render(value: PaymentMethod): HTMLElement {
    const fixture = TestBed.createComponent(PaymentMethodCard);
    fixture.componentRef.setInput('method', value);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  it('should show a credit method as a card with chip, institution and billing days', () => {
    const element = render(method());

    expect(element.querySelector('article')?.getAttribute('aria-label')).toBe('Cartao Nubank');
    expect(element.querySelector('h2')?.textContent?.trim()).toBe('Cartao Nubank');
    expect(element.querySelector('.type')?.textContent).toBe('Crédito');
    expect(element.querySelector('.institution-name')?.textContent).toBe('Nubank');
    expect(element.querySelector('.billing')?.textContent).toBe('Fecha dia 14 · Vence dia 21');
    expect(element.querySelector('.chip')).not.toBeNull();
    expect(element.style.getPropertyValue('--card-color')).toBe('#820AD1');
    expect(element.classList).not.toContain('dark-text');
  });

  it('should drop the chip and the billing days for methods that are not cards', () => {
    const element = render(method({ paymentType: 'PIX', closingDay: null, dueDay: null }));

    expect(element.querySelector('.type')?.textContent).toBe('Pix');
    expect(element.querySelector('.chip')).toBeNull();
    expect(element.querySelector('.billing')).toBeNull();
  });

  it('should fall back to a neutral surface without an institution color', () => {
    const element = render(
      method({ institution: { id: 'x', name: 'Outro', iconUrl: null, color: null } }),
    );

    expect(element.classList).toContain('neutral');
    expect(element.querySelector('img')).toBeNull();
  });

  it('should pick dark text only for light institution colors', () => {
    expect(prefersDarkText('#FCFC30')).toBe(true);
    expect(prefersDarkText('#ffffff')).toBe(true);
    expect(prefersDarkText('#820AD1')).toBe(false);
    expect(prefersDarkText('#005CA9')).toBe(false);
  });
});
