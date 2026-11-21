import { computed, Injectable, signal } from '@angular/core';
import { ExpenseFilter, filterKey, nameFilter } from './expense';

@Injectable({ providedIn: 'root' })
export class ExpenseFilters {
  private readonly selected = signal<readonly ExpenseFilter[]>([]);
  readonly active = this.selected.asReadonly();

  readonly name = computed(
    () => this.selected().find((filter) => filter.kind === 'name')?.id ?? '',
  );

  setName(query: string): void {
    const others = this.selected().filter((filter) => filter.kind !== 'name');
    this.selected.set(query.trim() ? [...others, nameFilter(query)] : others);
  }

  clear(): void {
    this.selected.set([]);
  }

  toggle(filter: ExpenseFilter): void {
    const key = filterKey(filter);
    this.selected.update((current) =>
      current.some((active) => filterKey(active) === key)
        ? current.filter((active) => filterKey(active) !== key)
        : [...current, filter],
    );
  }
}
