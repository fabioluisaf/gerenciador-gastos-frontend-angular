import { Injectable, signal } from '@angular/core';
import { ExpenseFilter, filterKey } from './expense';

@Injectable({ providedIn: 'root' })
export class ExpenseFilters {
  private readonly selected = signal<readonly ExpenseFilter[]>([]);
  readonly active = this.selected.asReadonly();

  toggle(filter: ExpenseFilter): void {
    const key = filterKey(filter);
    this.selected.update((current) =>
      current.some((active) => filterKey(active) === key)
        ? current.filter((active) => filterKey(active) !== key)
        : [...current, filter],
    );
  }
}
