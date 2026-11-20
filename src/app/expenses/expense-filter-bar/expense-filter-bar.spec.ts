import { TestBed } from '@angular/core/testing';
import { ExpenseFilter } from '../expense';
import { ExpenseFilterBar } from './expense-filter-bar';

const FILTERS: ExpenseFilter[] = [
  {
    kind: 'payment',
    id: 'pix',
    label: 'Pix Nubank',
    institution: {
      id: 'nubank',
      name: 'Nubank',
      iconUrl: '/api/instituicoes-financeiras/nubank/icone',
      color: '#820AD1',
    },
  },
  { kind: 'category', id: 'Mercado', label: 'Mercado' },
];

describe('ExpenseFilterBar', () => {
  it('should list the active filters after a fixed funnel and let each one be removed', () => {
    const fixture = TestBed.createComponent(ExpenseFilterBar);
    fixture.componentRef.setInput('filters', FILTERS);
    const removed: ExpenseFilter[] = [];
    fixture.componentInstance.removed.subscribe((filter) => removed.push(filter));
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const bar = element.querySelector('section[aria-label="Filtros ativos"]')!;
    expect(bar.firstElementChild?.matches('svg.funnel[aria-hidden="true"]')).toBe(true);
    expect([...bar.querySelectorAll('.chip-label')].map((label) => label.textContent)).toEqual([
      'Pix Nubank',
      'Mercado',
    ]);
    expect(bar.querySelectorAll('.chip img')).toHaveLength(1);

    element.querySelector<HTMLButtonElement>('[aria-label="Remover filtro Mercado"]')!.click();

    expect(removed).toEqual([FILTERS[1]]);
  });
});
