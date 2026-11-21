import { TestBed } from '@angular/core/testing';
import { provideAppLocale } from '../../core/locale';
import { FilteredTotal } from './filtered-total';

describe('FilteredTotal', () => {
  function render(inputs: { realized: number | null; planned: number | null; count?: number }) {
    TestBed.configureTestingModule({ providers: [provideAppLocale()] });
    const fixture = TestBed.createComponent(FilteredTotal);
    fixture.componentRef.setInput('realized', inputs.realized);
    fixture.componentRef.setInput('planned', inputs.planned);
    if (inputs.count !== undefined) {
      fixture.componentRef.setInput('count', inputs.count);
    }
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element, text: () => element.textContent?.replace(/\s+/g, ' ').trim() };
  }

  it('should show the realized and planned totals of the filtered expenses', () => {
    const { text } = render({ realized: 145, planned: 321.02, count: 4 });

    expect(text()).toMatch(/^Filtrados · 4 gastos\s*R\$\s145,00 de R\$\s321,02 planejados Limpar$/);
  });

  it('should say it is calculating while the totals are unknown', () => {
    const { text } = render({ realized: null, planned: null });

    expect(text()).toBe('Filtrados Calculando… Limpar');
  });

  it('should ask to clear the filters', () => {
    const { fixture, element } = render({ realized: 1, planned: 1, count: 1 });
    const cleared = vi.fn();
    fixture.componentInstance.cleared.subscribe(cleared);

    element.querySelector('button')!.click();

    expect(cleared).toHaveBeenCalled();
  });
});
