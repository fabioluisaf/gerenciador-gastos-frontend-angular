import { TestBed } from '@angular/core/testing';
import { provideAppLocale } from '../../core/locale';
import { Expense } from '../expense';
import { buildExpense } from '../testing/expense-builder';
import { ExpenseCard } from './expense-card';

function render(expense: Expense): HTMLElement {
  TestBed.configureTestingModule({ providers: [provideAppLocale()] });
  const fixture = TestBed.createComponent(ExpenseCard);
  fixture.componentRef.setInput('expense', expense);
  fixture.detectChanges();
  return fixture.nativeElement;
}

function normalized(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

describe('ExpenseCard', () => {
  it('should show the expense data without the date', () => {
    const element = render(
      buildExpense({ description: 'Compra do mês', installment: { number: 1, total: 3 } }),
    );

    expect(normalized(element.querySelector('.name')?.textContent)).toBe('Mercado');
    expect(normalized(element.querySelector('.amount')?.textContent)).toBe('R$ 123,45');
    expect(normalized(element.querySelector('.description')?.textContent)).toBe('Compra do mês');
    expect([...element.querySelectorAll('.tag')].map((tag) => normalized(tag.textContent))).toEqual(
      ['Casa', 'Nubank · Crédito', 'Parcela 1/3'],
    );
    expect(element.querySelector('img')?.getAttribute('src')).toBe(
      '/api/instituicoes-financeiras/nubank/icone',
    );
    expect(element.textContent).not.toContain('2026');
  });

  it('should highlight refunds and omit optional data', () => {
    const element = render(
      buildExpense({ amount: -24.62, institution: { id: 'x', name: 'Banco', iconUrl: null } }),
    );

    const amount = element.querySelector('.amount');
    expect(normalized(amount?.textContent)).toBe('-R$ 24,62');
    expect(amount?.classList).toContain('refund');
    expect(element.querySelector('.description')).toBeNull();
    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelectorAll('.tag')).toHaveLength(2);
  });
});
