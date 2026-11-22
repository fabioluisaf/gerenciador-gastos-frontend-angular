import { TestBed } from '@angular/core/testing';
import { ExpenseFilters } from '../expense-filters';
import { ExpenseNameSearch } from './expense-name-search';

describe('ExpenseNameSearch', () => {
  afterEach(() => vi.useRealTimers());

  function render() {
    const fixture = TestBed.createComponent(ExpenseNameSearch);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector('input')!;
    return { fixture, element, input, filters: TestBed.inject(ExpenseFilters) };
  }

  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('should filter by name after the user stops typing', () => {
    vi.useFakeTimers();
    const { input, filters } = render();

    type(input, 'mer');
    type(input, 'mercado ');
    expect(filters.active()).toEqual([]);

    vi.advanceTimersByTime(300);
    expect(filters.active()).toEqual([{ kind: 'name', id: 'mercado', label: '“mercado”' }]);
  });

  it('should keep a single name filter next to the other filters and clear it', () => {
    const { fixture, element, input, filters } = render();
    filters.toggle({ kind: 'category', id: 'Casa', label: 'Casa' });

    type(input, 'pão');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    type(input, 'leite');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(filters.active().map(({ id }) => id)).toEqual(['Casa', 'leite']);

    element.querySelector<HTMLButtonElement>('.clear')!.click();
    fixture.detectChanges();
    expect(filters.active().map(({ id }) => id)).toEqual(['Casa']);
    expect(input.value).toBe('');
  });
});
